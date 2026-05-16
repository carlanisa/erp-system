#!/usr/bin/env python3
"""
Fix the 1 remaining APP- SKU product:
  ID=8977  Name=ARUNA KEBARUNG LINEN | SMOKEY PURPLE CHECK D4-2  Target SKU=D4-2

Steps:
1. Find what product currently holds SKU "D4-2"
2. If another active product holds it → rename that to "D4-2-OLD"
3. If an archived product holds it → just rename it too (via PUT)
4. Then update ID=8977 to SKU "D4-2"
"""
import json, time, warnings
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

# ── Login ─────────────────────────────────────────────────────
r = sess.post(f"{ERP_BASE}/auth/login", json={'email': EMAIL, 'password': PASSWORD}, timeout=20)
tok = r.json()['data']['token']
sess.headers['Authorization'] = f"Bearer {tok}"
print("✅ Login OK\n")

# ── Step 1: Get details of target product (ID=8977) ───────────
r = sess.get(f"{ERP_BASE}/inventory/products/{TARGET_ID}", timeout=15)
if r.status_code == 200:
    prod = r.json().get('data', {})
    print(f"Target product ID={TARGET_ID}:")
    print(f"  Name: {prod.get('name')}")
    print(f"  SKU:  {prod.get('sku')}")
    print(f"  Status: {prod.get('status')}")
    print()
else:
    print(f"❌ Could not fetch ID={TARGET_ID}: {r.status_code} {r.text[:100]}")

# ── Step 2: Search for products with SKU = "D4-2" ────────────
print(f"🔍 Searching for products with SKU='{TARGET_SKU}'...")
r = sess.get(f"{ERP_BASE}/inventory/products", params={'search': TARGET_SKU, 'per_page': 20}, timeout=15)
results = r.json().get('data', [])
print(f"  Found {len(results)} results for search '{TARGET_SKU}'")
for p in results:
    print(f"  ID={p['id']}  SKU={p.get('sku')}  Name={p.get('name','')[:50]}  Status={p.get('status')}")
print()

# Find the conflict — product with exact SKU match that isn't our target
conflict = None
for p in results:
    if p.get('sku') == TARGET_SKU and p['id'] != TARGET_ID:
        conflict = p
        break

# ── Step 3: Rename the conflict ───────────────────────────────
if conflict:
    cid = conflict['id']
    old_name = conflict.get('name', '')
    print(f"⚠️  Conflict found: ID={cid}  Name={old_name[:50]}")
    new_conflict_sku = f"D4-2-OLD"
    print(f"   Renaming conflict SKU to '{new_conflict_sku}'...")

    r_fix = sess.put(f"{ERP_BASE}/inventory/products/{cid}", json={
        'name':       old_name,
        'sku':        new_conflict_sku,
        'cost_price': conflict.get('cost_price', 0),
        'sale_price': conflict.get('sale_price', 0),
        'is_active':  conflict.get('is_active', False),
        'status':     conflict.get('status', 'archived'),
    }, timeout=20)

    if r_fix.status_code in [200, 201]:
        print(f"   ✅ Conflict renamed to '{new_conflict_sku}'")
    else:
        print(f"   ❌ Failed to rename conflict: {r_fix.status_code} {r_fix.text[:150]}")
        print("   Aborting.")
        exit(1)

    time.sleep(0.5)
else:
    print(f"ℹ️  No conflict found for SKU='{TARGET_SKU}' (other than target itself)")

# ── Step 4: Update ID=8977 to correct SKU ────────────────────
print(f"\n🔧 Updating ID={TARGET_ID} to SKU='{TARGET_SKU}'...")

# Get fresh product data
r = sess.get(f"{ERP_BASE}/inventory/products/{TARGET_ID}", timeout=15)
prod = r.json().get('data', {}) if r.status_code == 200 else {}

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
    print(f"✅ SUCCESS! ID={TARGET_ID} now has SKU='{updated.get('sku')}'")
else:
    print(f"❌ Failed: {r_upd.status_code}")
    print(f"   {r_upd.text[:300]}")

# ── Step 5: Verify ────────────────────────────────────────────
print("\n📊 Final verification — counting APP- SKUs...")
all_prods = []
page = 1
while True:
    r = sess.get(f"{ERP_BASE}/inventory/products", params={'per_page': 100, 'page': page}, timeout=30)
    data = r.json().get('data', [])
    if not data:
        break
    all_prods.extend(data)
    page += 1
    if len(data) < 20:
        break

app_remaining = [p for p in all_prods if (p.get('sku') or '').startswith('APP-')]
print(f"  Total active products: {len(all_prods)}")
print(f"  Remaining APP- SKUs:   {len(app_remaining)}")
for p in app_remaining:
    print(f"    ID={p['id']}  SKU={p.get('sku')}  Name={p.get('name','')[:50]}")

print(f"\n🎉 Done!")
