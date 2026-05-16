#!/usr/bin/env python3
"""
Fix last APP- SKU: ID=8977 → D4-2
Strategy:
  1. Scan ALL products (all pages) to find exact SKU="D4-2" holder
  2. Rename the conflict via API
  3. Update ID=8977 to SKU=D4-2
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

# ── Step 1: Fetch ALL products (including archived) ──────────
print("📋 Fetching ALL products to find SKU='D4-2' holder...")
all_prods = []
page = 1
while True:
    r = sess.get(f"{ERP_BASE}/inventory/products",
                 params={'per_page': 100, 'page': page}, timeout=30)
    data = r.json().get('data', [])
    if not data:
        break
    all_prods.extend(data)
    if page % 20 == 0:
        print(f"  ...page {page}, total so far: {len(all_prods)}")
    page += 1
    if len(data) < 20:
        break

print(f"  Total products fetched: {len(all_prods)}\n")

# Find exact SKU="D4-2" holders
conflicts = [p for p in all_prods if p.get('sku') == TARGET_SKU and p['id'] != TARGET_ID]
print(f"Products with exact SKU='{TARGET_SKU}' (excluding target):")
if not conflicts:
    print("  (none found in active products listing)")
else:
    for p in conflicts:
        print(f"  ID={p['id']}  SKU={p.get('sku')}  Status={p.get('status')}  Name={p.get('name','')[:50]}")
print()

# ── Step 2: Rename conflicts ──────────────────────────────────
for conflict in conflicts:
    cid      = conflict['id']
    old_name = conflict.get('name', '')
    new_sku  = f"D4-2-OLD-{cid}"
    print(f"⚠️  Renaming conflict ID={cid} from 'D4-2' to '{new_sku}'...")
    r_fix = sess.put(f"{ERP_BASE}/inventory/products/{cid}", json={
        'name':       old_name,
        'sku':        new_sku,
        'cost_price': conflict.get('cost_price', 0),
        'sale_price': conflict.get('sale_price', 0),
        'is_active':  conflict.get('is_active', False),
        'status':     conflict.get('status', 'archived'),
    }, timeout=20)
    if r_fix.status_code in [200, 201]:
        print(f"   ✅ Renamed OK")
    else:
        print(f"   ❌ Failed: {r_fix.status_code} {r_fix.text[:150]}")
    time.sleep(0.3)

if conflicts:
    print()
    time.sleep(1)

# ── Step 3: Try direct update of ID=8977 ─────────────────────
print(f"🔧 Updating ID={TARGET_ID} → SKU='{TARGET_SKU}'...")

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
    print(f"✅ SUCCESS! ID={TARGET_ID} SKU is now '{updated.get('sku')}'")
else:
    print(f"❌ Still failed: {r_upd.status_code}")
    print(f"   Response: {r_upd.text[:400]}")
    print()
    print("🔍 The validation is blocking this on the server side (archived records).")
    print("   Need to use fix-d42.php (direct DB fix) on the live server.")
    print("   Upload: /Users/waqas/ACCOUNTING SYSTEM/backend/public/fix-d42.php")
    print("   Then visit: https://erp.earntodiemodapk.com/fix-d42.php?token=carlanisa2026")

# ── Step 4: Final count ───────────────────────────────────────
app_left = [p for p in all_prods if (p.get('sku') or '').startswith('APP-')]
# re-fetch to get fresh state
print("\n📊 Re-checking active products...")
fresh = []
page = 1
while True:
    r = sess.get(f"{ERP_BASE}/inventory/products",
                 params={'per_page': 100, 'page': page}, timeout=30)
    data = r.json().get('data', [])
    if not data: break
    fresh.extend(data)
    page += 1
    if len(data) < 20: break

app_fresh = [p for p in fresh if (p.get('sku') or '').startswith('APP-')]
print(f"  Total active: {len(fresh)}")
print(f"  APP- SKUs remaining: {len(app_fresh)}")
for p in app_fresh:
    print(f"    ID={p['id']}  SKU={p.get('sku')}  Name={p.get('name','')[:50]}")

print("\n🎉 Done!")
