#!/usr/bin/env python3
"""
Fix product SKUs by activating archived products that have correct CODEs,
then deleting the APP-XXXX duplicates.
Works entirely via existing API — no file upload needed.
"""
import json, time, warnings
import requests

warnings.filterwarnings('ignore')

ERP_BASE = "https://erp.earntodiemodapk.com/api"
EMAIL    = "admin@earntodiemodapk.com"
PASSWORD = "RbjA3H8DRdAi2qUL"

sess = requests.Session()
sess.verify = False
sess.headers.update({'Accept': 'application/json', 'Content-Type': 'application/json'})

# ── Login ─────────────────────────────────────────────────────
r = sess.post(f"{ERP_BASE}/auth/login", json={'email': EMAIL, 'password': PASSWORD}, timeout=20)
tok = r.json()['data']['token']
sess.headers['Authorization'] = f"Bearer {tok}"
print("✅ Login hua\n")

# ── Load scraped data → name→code map ─────────────────────────
def first_line(val):
    return str(val or '').split('\n')[0].strip()

with open('scraped_data/products.json') as f:
    single = json.load(f)
with open('scraped_data/variable_products.json') as f:
    variable = json.load(f)

def is_real(row):
    return (str(row.get('SR', '')).strip().isdigit()
            and first_line(row.get('PRODUCT NAME', '')) not in ['0', '', '19'])

all_scraped = [r for r in single if is_real(r)] + [r for r in variable if is_real(r)]

from collections import Counter
code_counts = Counter(first_line(r.get('CODE','')) for r in all_scraped)
used_codes  = {}
name_to_code = {}
name_to_meta = {}
for row in all_scraped:
    name     = first_line(row.get('PRODUCT NAME', ''))
    code     = first_line(row.get('CODE', ''))
    brand    = first_line(row.get('BRAND', ''))
    category = first_line(row.get('CATEGORY', ''))
    if code_counts[code] > 1:
        used_codes[code] = used_codes.get(code, 0) + 1
        if used_codes[code] > 1:
            code = f"{code}-{used_codes[code]}"
    name_to_code[name] = code
    name_to_meta[name] = {'brand': brand, 'category': category}

print(f"✅ {len(name_to_code)} products in scraped data\n")

# ── Get ALL active products from live server ──────────────────
print("📋 Live products fetch kar raha hoon...")
active_products = []
page = 1
while True:
    r = sess.get(f"{ERP_BASE}/inventory/products",
                 params={'per_page': 100, 'page': page}, timeout=30)
    data = r.json().get('data', [])
    if not data:
        break
    active_products.extend(data)
    page += 1
    if len(data) < 20:
        break

app_prods = [p for p in active_products if (p.get('sku') or '').startswith('APP-')]
print(f"✅ {len(active_products)} active products ({len(app_prods)} with APP- SKU)\n")

# ── Fix each APP-XXXX product ─────────────────────────────────
print("🔧 Fixing products...\n")

fixed    = 0
already  = 0
failed   = 0
no_match = []

for idx, prod in enumerate(app_prods):
    live_name = (prod.get('name') or '').strip()
    pid       = prod['id']

    correct_code = name_to_code.get(live_name)
    if not correct_code:
        no_match.append(live_name)
        failed += 1
        continue

    meta = name_to_meta.get(live_name, {})

    # Step 1: Search for archived product with correct SKU
    r_search = sess.get(f"{ERP_BASE}/inventory/products",
                        params={'search': correct_code, 'per_page': 20}, timeout=15)
    search_results = r_search.json().get('data', [])

    # Find archived version with correct SKU
    archived_match = None
    for res in search_results:
        if res.get('sku') == correct_code and res.get('id') != pid:
            archived_match = res
            break

    if archived_match:
        arch_id = archived_match['id']

        # Activate the archived product
        r_activate = sess.put(f"{ERP_BASE}/inventory/products/{arch_id}", json={
            'name':      live_name,
            'is_active': True,
            'status':    'active',
            'brand':     meta.get('brand') or None,
            'category':  meta.get('category') or None,
            'cost_price': archived_match.get('cost_price', 0),
            'sale_price': archived_match.get('sale_price') or prod.get('sale_price', 0),
        }, timeout=20)

        if r_activate.status_code in [200, 201]:
            # Delete the APP-XXXX duplicate
            r_del = sess.delete(f"{ERP_BASE}/inventory/products/{pid}", timeout=15)
            fixed += 1
            if fixed % 50 == 0:
                print(f"  [{fixed}/{len(app_prods)}] ✅ {fixed} fixed so far")
        else:
            # Activation failed — try to directly update the active product's SKU
            r_update = sess.put(f"{ERP_BASE}/inventory/products/{pid}", json={
                'name':      live_name,
                'sku':       correct_code,
                'brand':     meta.get('brand') or None,
                'category':  meta.get('category') or None,
                'cost_price': prod.get('cost_price', 0),
                'sale_price': prod.get('sale_price', 0),
                'is_active': True,
                'status':    'active',
            }, timeout=20)
            if r_update.status_code in [200, 201]:
                fixed += 1
            else:
                failed += 1
                print(f"  ❌ ID={pid} Name={live_name[:40]}: {r_update.text[:80]}")
    else:
        # No archived version — try direct SKU update
        r_update = sess.put(f"{ERP_BASE}/inventory/products/{pid}", json={
            'name':      live_name,
            'sku':       correct_code,
            'brand':     meta.get('brand') or None,
            'category':  meta.get('category') or None,
            'cost_price': prod.get('cost_price', 0),
            'sale_price': prod.get('sale_price', 0),
            'is_active': True,
            'status':    'active',
        }, timeout=20)
        if r_update.status_code in [200, 201]:
            fixed += 1
            if fixed % 50 == 0:
                print(f"  [{fixed}/{len(app_prods)}] ✅ {fixed} fixed so far")
        else:
            failed += 1
            print(f"  ❌ ID={pid} SKU={correct_code}: {r_update.text[:80]}")

    time.sleep(0.05)

print(f"\n{'='*55}")
print(f"✅ Fixed: {fixed}")
print(f"⏭️  Already OK: {already}")
print(f"❌ Failed: {failed}")
if no_match:
    print(f"\n⚠️  No scraped data match for {len(no_match)} products:")
    for n in no_match[:5]:
        print(f"   - {n}")
print(f"\n🎉 Done! Check: https://erp.earntodiemodapk.com/inventory/products")
