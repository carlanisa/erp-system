"""
Cleanup: ERP may inactive APP-XXXX products delete karo.
Real products (non APP- SKUs) bilkul safe hain.
"""
import requests, time, warnings, json
warnings.filterwarnings('ignore')
from config import ERP_BASE_URL, ERP_EMAIL, ERP_PASSWORD

s = requests.Session(); s.verify = False
s.headers.update({'Accept': 'application/json', 'Content-Type': 'application/json'})
r = s.post(f'{ERP_BASE_URL}/auth/login', json={'email': ERP_EMAIL, 'password': ERP_PASSWORD})
tok = r.json()['data']['token']
s.headers['Authorization'] = f'Bearer {tok}'
print("✅ Login hua\n")

deleted = failed = skipped = 0
page = 1

print("🗑️  APP-XXXX inactive products delete kar raha hoon...")
while True:
    r = s.get(f'{ERP_BASE_URL}/inventory/products',
              params={'per_page': 20, 'page': page, 'active': 'false'})
    if r.status_code != 200:
        print(f"  ⚠️  fetch err: {r.status_code}")
        break
    body  = r.json()
    items = body.get('data', [])
    meta  = body.get('meta', {})

    if not items:
        break

    acted_this_page = 0
    for prod in items:
        sku     = (prod.get('sku') or '').strip()
        pid     = prod['id']
        active  = prod.get('is_active', False)

        # Only delete inactive APP-XXXX products
        if not sku.startswith('APP-') or active:
            skipped += 1
            continue

        rd = s.delete(f'{ERP_BASE_URL}/inventory/products/{pid}', timeout=15)
        if rd.status_code in (200, 204):
            deleted += 1
            acted_this_page += 1
        else:
            failed += 1
            print(f"  ❌ id={pid} sku={sku}: {rd.status_code} {rd.text[:80]}")

        if deleted % 100 == 0 and deleted > 0:
            print(f"  [{deleted} deleted so far | failed={failed}]", flush=True)

    # If we deleted items from this page, re-fetch the same page (items shifted)
    # If no APP- items found on this page, advance
    if acted_this_page == 0:
        last_page = meta.get('last_page', 1)
        if page >= last_page:
            break
        page += 1
        if page > 600:
            break

print(f"\n{'='*50}")
print(f"✅ Deleted: {deleted}")
print(f"⏭️  Skipped (real products): {skipped}")
print(f"❌ Failed: {failed}")
print(f"\nCheck: {ERP_BASE_URL.replace('/api','')}/inventory/products")
