#!/usr/bin/env python3
"""
Fix product SKUs on live server — set to real CODE values from Revebe POS
"""
import json, re, time, warnings
import requests

warnings.filterwarnings('ignore')

ERP_BASE = "https://erp.earntodiemodapk.com/api"
EMAIL    = "admin@earntodiemodapk.com"
PASSWORD = "RbjA3H8DRdAi2qUL"

sess = requests.Session()
sess.verify = False
sess.headers.update({'Accept': 'application/json', 'Content-Type': 'application/json'})

# ── Login ──────────────────────────────────────────────────────
r = sess.post(f"{ERP_BASE}/auth/login", json={'email': EMAIL, 'password': PASSWORD}, timeout=20)
tok = r.json()['data']['token']
sess.headers['Authorization'] = f"Bearer {tok}"
print("✅ Login hua")

# ── Load scraped data ─────────────────────────────────────────
def first_line(val):
    return str(val or '').split('\n')[0].strip()

with open('scraped_data/products.json') as f:
    single = json.load(f)
with open('scraped_data/variable_products.json') as f:
    variable = json.load(f)

def is_real(row):
    return (
        str(row.get('SR', '')).strip().isdigit()
        and first_line(row.get('PRODUCT NAME', '')) not in ['0', '', '19']
    )

all_scraped = [r for r in single if is_real(r)] + [r for r in variable if is_real(r)]
print(f"✅ Scraped data: {len(all_scraped)} real products")

# Build name → (code, brand, category) map
# Handle duplicate CODEs by appending suffix
from collections import Counter
code_counts = Counter(first_line(r.get('CODE','')) for r in all_scraped)

used_codes = {}
name_to_fields = {}
for row in all_scraped:
    name = first_line(row.get('PRODUCT NAME', ''))
    code = first_line(row.get('CODE', ''))
    brand    = first_line(row.get('BRAND', ''))
    category = first_line(row.get('CATEGORY', ''))

    # Make code unique if duplicate
    if code_counts[code] > 1:
        used_codes[code] = used_codes.get(code, 0) + 1
        if used_codes[code] > 1:
            code = f"{code}-{used_codes[code]}"

    name_to_fields[name] = {
        'sku':      code,
        'brand':    brand,
        'category': category,
    }

print(f"✅ Name→fields map built: {len(name_to_fields)} entries")

# ── Get ALL live products ─────────────────────────────────────
print("\n📋 Live products fetch kar raha hoon...")
live_products = []
page = 1
while True:
    r = sess.get(f"{ERP_BASE}/inventory/products",
        params={'per_page': 100, 'page': page}, timeout=30)
    if r.status_code != 200:
        print(f"  ❌ Page {page} fetch failed: {r.status_code}")
        break
    data = r.json().get('data', [])
    if not data:
        break
    live_products.extend(data)
    print(f"  Page {page}: {len(data)} products fetched (total so far: {len(live_products)})")
    page += 1
    if len(data) < 20:   # API returns max 20/page
        break

print(f"\n✅ Total live products: {len(live_products)}")

# ── Match & Update ────────────────────────────────────────────
print("\n🔧 SKU update shuru kar raha hoon...\n")

updated = 0
skipped = 0
failed  = 0
not_found = []

for prod in live_products:
    live_name = (prod.get('name') or '').strip()
    pid       = prod['id']
    curr_sku  = prod.get('sku', '')

    fields = name_to_fields.get(live_name)
    if not fields:
        not_found.append(live_name)
        skipped += 1
        continue

    new_sku  = fields['sku']
    brand    = fields['brand']
    category = fields['category']

    # Skip if already correct
    if curr_sku == new_sku and prod.get('brand') == brand:
        skipped += 1
        continue

    # Update product
    payload = {
        'sku':      new_sku,
        'brand':    brand,
        'category': category,
        'name':     live_name,
        'cost_price': prod.get('cost_price', 0),
        'sale_price': prod.get('sale_price', 0),
    }
    try:
        resp = sess.put(f"{ERP_BASE}/inventory/products/{pid}", json=payload, timeout=20)
        if resp.status_code in [200, 201]:
            updated += 1
            if updated % 50 == 0:
                print(f"  [{updated}/{len(live_products)}] ✅ Updated so far")
        else:
            failed += 1
            print(f"  ❌ ID={pid} Name={live_name[:40]} → {resp.status_code}: {resp.text[:80]}")
    except Exception as e:
        failed += 1
        print(f"  ❌ ID={pid} exception: {e}")

    # Throttle
    time.sleep(0.05)

print(f"\n{'='*50}")
print(f"✅ Updated: {updated}")
print(f"⏭️  Skipped (already correct or not found): {skipped}")
print(f"❌ Failed:  {failed}")
if not_found:
    print(f"\n⚠️  {len(not_found)} products not matched by name:")
    for n in not_found[:10]:
        print(f"   - {n}")
    if len(not_found) > 10:
        print(f"   ... and {len(not_found)-10} more")
print(f"\n🎉 Done! Check: https://erp.earntodiemodapk.com/inventory/products")
