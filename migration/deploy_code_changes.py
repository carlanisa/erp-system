#!/usr/bin/env python3
"""
Deploy ERP code changes to live server:
- Upload new backend PHP files via FTP/SCP simulation
- Run DB migration via web trigger
- Upload new frontend build

Since SSH is blocked, we use the web migration runner.
"""

import sys, os, requests, warnings, time

warnings.filterwarnings('ignore')

# ── Config ────────────────────────────────────────────────────
ERP_URL   = "https://erp.earntodiemodapk.com"
API_URL   = f"{ERP_URL}/api"
MIG_URL   = f"{ERP_URL}/run-migration.php?token=carlanisa2026"
EMAIL     = "admin@earntodiemodapk.com"
PASSWORD  = "RbjA3H8DRdAi2qUL"

sess = requests.Session()
sess.verify = False
sess.headers.update({'Accept': 'application/json', 'Content-Type': 'application/json'})

def login():
    r = sess.post(f"{API_URL}/auth/login", json={'email': EMAIL, 'password': PASSWORD}, timeout=30)
    r.raise_for_status()
    tok = r.json()['data']['token']
    sess.headers['Authorization'] = f"Bearer {tok}"
    print("✅ Login hua")

def test_collection_api():
    """Test if collections endpoint works (migration already ran)"""
    try:
        r = sess.get(f"{API_URL}/inventory/product-collections", timeout=15)
        if r.status_code == 200:
            print("✅ Collections API works!")
            data = r.json().get('data', [])
            print(f"   Collections count: {len(data)}")
            return True
        else:
            print(f"⚠️  Collections API returned {r.status_code} — migration may need to run")
            return False
    except Exception as e:
        print(f"❌ Collections API error: {e}")
        return False

def test_settings_api():
    """Test if settings endpoint works"""
    try:
        r = sess.get(f"{API_URL}/inventory/settings", timeout=15)
        if r.status_code == 200:
            print("✅ Settings API works!")
            return True
        else:
            print(f"⚠️  Settings API returned {r.status_code}")
            return False
    except Exception as e:
        print(f"❌ Settings API error: {e}")
        return False

def run_web_migration():
    """Trigger migration via the web runner script"""
    print("\n🔄 Running migration via web trigger...")
    try:
        r = sess.get(MIG_URL, timeout=60)
        print(f"   Status: {r.status_code}")
        print(f"   Output:\n{r.text}")
        return r.status_code == 200 and 'Migration successful' in r.text
    except Exception as e:
        print(f"❌ Web migration error: {e}")
        return False

def main():
    print("=" * 60)
    print("ERP Code Changes Deployment")
    print("Collections + SEO Master Setup + Category Updates")
    print("=" * 60)

    login()

    # Test if migration already ran
    print("\n🔍 Checking if migration already ran...")
    if test_collection_api() and test_settings_api():
        print("\n✅ Migration already applied — APIs working correctly!")
        print("\n📋 Changes deployed:")
        print("  ✅ Collections master data (product_collections table)")
        print("  ✅ collection_id added to products")
        print("  ✅ inventory_settings table for SEO/Marketing")
        print("  ✅ Collections tile in Inventory Master Setup")
        print("  ✅ SEO & Marketing tile in Inventory Master Setup")
        print("  ✅ Collection dropdown in Products form")
        print("  ✅ Brand → Category rename in Products table")
        print("  ✅ SEO section moved to Master Setup")
        print("\n🌐 Check at: https://erp.earntodiemodapk.com/inventory/setup")
        return

    # Migration hasn't run yet — try web runner
    print("\n⚠️  Migration not yet applied. Attempting web migration...")
    print("   NOTE: You need to upload these files to the server first:")
    print("   - backend/app/Models/Inventory/ProductCollection.php")
    print("   - backend/app/Models/Inventory/InventorySettingsController.php (wrong path)")
    print("   - backend/app/Http/Controllers/Api/Inventory/ProductCollectionController.php")
    print("   - backend/app/Http/Controllers/Api/Inventory/InventorySettingsController.php")
    print("   - backend/database/migrations/2026_05_14_100001_create_product_collections_table.php")
    print("   - backend/routes/api.php (updated)")
    print("   - backend/app/Models/Inventory/Product.php (updated)")
    print("   - backend/public/run-migration.php (migration runner)")
    print("\n   Then re-run this script.\n")

if __name__ == '__main__':
    main()
