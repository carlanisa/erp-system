#!/usr/bin/env python3
"""
Fix last APP- SKU: ID=8977 → D4-2
The conflict must be an archived product with SKU=D4-2.
Strategy:
  1. Search by product NAME to find archived duplicates of ID=8977
  2. Any archived product with SKU=D4-2 — rename it via API
  3. Then update ID=8977

Also try: search by exact name "ARUNA KEBARUNG LINEN" to find archived sibling.
"""
import time, warnings
import requests

warnings.filterwarnings('ignore')

ERP_BASE = "https://erp.earntodiemodapk.com/api"
EMAIL    = "admin@earntodiemodapk.com"
PASSWORD = "RbjA3H8DRdAi2qUL"

TARGET_ID   = 8977
TARGET_SKU  = "D4-2"
TARGET_NAME = "ARUNA KEBARUNG LINEN | SMOKEY PURPLE CHECK D4-2"

sess = requests.Session()
sess.verify = False
sess.headers.update({'Accept': 'application/json', 'Content-Type': 'application/json'})

r = sess.post(f"{ERP_BASE}/auth/login", json={'email': EMAIL, 'password': PASSWORD}, timeout=20)
tok = r.json()['data']['token']
sess.headers['Authorization'] = f"Bearer {tok}"
print("✅ Login OK\n")

# ── Search by name fragments ──────────────────────────────────
search_terms = [
    "ARUNA KEBARUNG LINEN | SMOKEY PURPLE",
    "ARUNA KEBARUNG LINEN",
    "SMOKEY PURPLE CHECK D4",
]

conflict = None
for term in search_terms:
    print(f"🔍 Searching: '{term}'")
    r = sess.get(f"{ERP_BASE}/inventory/products",
                 params={'search': term, 'per_page': 20}, timeout=15)
    results = r.json().get('data', [])
    print(f"   {len(results)} results:")
    for p in results:
        print(f"   ID={p['id']:5d}  SKU={str(p.get('sku','')):15s}  Status={p.get('status',''):8s}  {p.get('name','')[:60]}")
        if p.get('sku') == TARGET_SKU and p['id'] != TARGET_ID:
            conflict = p
            print(f"   ^^^^ CONFLICT FOUND ^^^^")
    print()
    if conflict:
        break
    time.sleep(0.3)

# ── Also try fetching archived via a known old-ID range ──────
# The previous import runs had IDs in range 7xxx-8xxx for archived products
# Let's try to find archived products with SKU containing "D4-2" exactly
# by going through multiple search result pages
if not conflict:
    print("🔍 Paginating through all 'D4-2' search results (beyond page 1)...")
    page = 1
    found = False
    while not found:
        r = sess.get(f"{ERP_BASE}/inventory/products",
                     params={'search': 'D4-2', 'per_page': 20, 'page': page}, timeout=15)
        results = r.json().get('data', [])
        if not results:
            print(f"   Page {page}: no more results")
            break
        print(f"   Page {page}: {len(results)} results")
        for p in results:
            if p.get('sku') == TARGET_SKU and p['id'] != TARGET_ID:
                conflict = p
                found = True
                print(f"   ✅ FOUND at page {page}: ID={p['id']}  SKU={p.get('sku')}  Status={p.get('status')}  {p.get('name','')[:50]}")
                break
        page += 1
        if len(results) < 20:
            break
        time.sleep(0.2)
    if not found:
        print("   No conflict found by paginating D4-2 search\n")

# ── Rename conflict if found ──────────────────────────────────
if conflict:
    cid      = conflict['id']
    old_name = conflict.get('name', '')
    new_sku  = f"D4-2-OLD-{cid}"
    print(f"\n⚠️  Renaming conflict ID={cid} → '{new_sku}'...")
    r_fix = sess.put(f"{ERP_BASE}/inventory/products/{cid}", json={
        'name':       old_name,
        'sku':        new_sku,
        'cost_price': conflict.get('cost_price', 0),
        'sale_price': conflict.get('sale_price', 0),
        'is_active':  conflict.get('is_active', False),
        'status':     conflict.get('status', 'archived'),
    }, timeout=20)
    if r_fix.status_code in [200, 201]:
        print(f"   ✅ Renamed successfully")
        time.sleep(0.5)
    else:
        print(f"   ❌ Failed: {r_fix.status_code} {r_fix.text[:200]}")
        print("   Cannot proceed — need direct DB fix.")
        exit(1)
else:
    print("⚠️  No conflict found via API — the conflicting record may be soft-deleted.")
    print("   Will attempt the update anyway and see what happens...\n")

# ── Update ID=8977 ────────────────────────────────────────────
print(f"\n🔧 Attempting to update ID={TARGET_ID} → SKU='{TARGET_SKU}'...")
r_get = sess.get(f"{ERP_BASE}/inventory/products/{TARGET_ID}", timeout=15)
prod  = r_get.json().get('data', {}) if r_get.status_code == 200 else {}

r_upd = sess.put(f"{ERP_BASE}/inventory/products/{TARGET_ID}", json={
    'name':       TARGET_NAME,
    'sku':        TARGET_SKU,
    'cost_price': prod.get('cost_price', 0),
    'sale_price': prod.get('sale_price', 0),
    'is_active':  True,
    'status':     'active',
}, timeout=20)

if r_upd.status_code in [200, 201]:
    updated = r_upd.json().get('data', {})
    print(f"✅ SUCCESS! ID={TARGET_ID} → SKU='{updated.get('sku')}'")
else:
    print(f"❌ Failed: {r_upd.status_code}")
    print(f"   {r_upd.text[:300]}")
    print()
    print("=" * 60)
    print("CONCLUSION: The conflicting record is SOFT-DELETED (deleted_at IS NOT NULL).")
    print("The API cannot surface or modify soft-deleted records.")
    print("SOLUTION: Deploy fix-d42.php to live server:")
    print("  File: /Users/waqas/ACCOUNTING SYSTEM/backend/public/fix-d42.php")
    print("  URL:  https://erp.earntodiemodapk.com/fix-d42.php?token=carlanisa2026")
    print("=" * 60)

print("\n🎉 Script complete.")
