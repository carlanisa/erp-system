"""
STEP 3 — ERP Importer (Revebe POS → Aapka ERP)

Scope: Suppliers + Products (single + variable) + Stock.
Upsert by SKU (products) / name (suppliers): existing rows update, naye rows insert.

Usage:
  python step3_import_erp.py                 # default: suppliers + products
  python step3_import_erp.py suppliers       # sirf suppliers
  python step3_import_erp.py products        # sirf products+variable_products
"""

import json
import os
import sys
import time
import re
import warnings
import requests
from urllib3.exceptions import InsecureRequestWarning
warnings.filterwarnings("ignore", category=InsecureRequestWarning)
from datetime import datetime
from config import ERP_BASE_URL, ERP_EMAIL, ERP_PASSWORD, DATA_DIR

REQUEST_TIMEOUT = 30


# ─────────────────────────────────────────────
# ERP API Client
# ─────────────────────────────────────────────

class ERPClient:
    def __init__(self):
        self.base_url = ERP_BASE_URL.rstrip("/")
        self.session  = requests.Session()
        self.session.verify = False
        self.session.headers.update({"Accept": "application/json", "Content-Type": "application/json"})
        self.errors   = []
        self.imported = {}

    def login(self):
        print("🔐 ERP login...")
        r = self.session.post(f"{self.base_url}/auth/login",
                              json={"email": ERP_EMAIL, "password": ERP_PASSWORD},
                              timeout=REQUEST_TIMEOUT)
        if r.status_code != 200:
            print(f"❌ {r.status_code}: {r.text[:300]}")
            return False
        body = r.json()
        token = body.get("token") or (body.get("data", {}) or {}).get("token") or body.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        print("✅ ok")
        return True

    def _do(self, method, endpoint, **kw):
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        for attempt in range(3):
            try:
                return self.session.request(method, url, timeout=REQUEST_TIMEOUT, **kw)
            except Exception as e:
                if attempt == 2: raise
                time.sleep(2 ** attempt)

    def get(self, endpoint, **kw):   return self._do("GET",    endpoint, **kw)
    def post(self, endpoint, data):  return self._do("POST",   endpoint, json=data)
    def put(self, endpoint, data):   return self._do("PUT",    endpoint, json=data)
    def delete(self, endpoint):      return self._do("DELETE", endpoint)

    def load_json(self, filename):
        fp = f"{DATA_DIR}/{filename}.json"
        if not os.path.exists(fp):
            print(f"   ⚠️  {fp} nahi mili")
            return []
        return json.load(open(fp, encoding="utf-8"))

    def log_error(self, module, ref, error):
        self.errors.append({"module": module, "ref": str(ref)[:80], "error": str(error)[:300]})

    def record(self, module, total, success, updated=0):
        self.imported[module] = {"total": total, "success": success, "updated": updated}


# ─────────────────────────────────────────────
# Parsers
# ─────────────────────────────────────────────

def first_line(v):
    return str(v or "").split("\n")[0].strip()


def clean_amount(v):
    if v is None: return 0.0
    s = re.sub(r"[^\d.\-]", "", str(v))
    try: return float(s) if s else 0.0
    except: return 0.0


def clean_int(v):
    if v is None: return 0
    try: return int(float(str(v).replace(",", "").strip()))
    except: return 0


def parse_price(price_str):
    """ "Sell: 69\\nBuy: 30" → (sell, buy) """
    sell = buy = 0.0
    if not price_str: return sell, buy
    for line in str(price_str).split("\n"):
        line = line.strip()
        m = re.search(r"Sell:\s*([\d.,]+)", line, re.I)
        if m: sell = clean_amount(m.group(1))
        m = re.search(r"Buy:\s*([\d.,]+)", line, re.I)
        if m: buy = clean_amount(m.group(1))
    if not sell and not buy:
        # plain number
        sell = clean_amount(price_str)
    return sell, buy


def parse_category(cat_str):
    """ "SAMPIN\\nUnit: Pcs\\nWeight: 0.400 Kg" → "SAMPIN" """
    return first_line(cat_str)


def safe_brand(brand_str):
    b = first_line(brand_str)
    return b if b else None


# ─────────────────────────────────────────────
# Mappers
# ─────────────────────────────────────────────

def map_product(row):
    sell, buy = parse_price(row.get("PRICE", ""))
    sku = first_line(row.get("CODE", ""))
    name = first_line(row.get("PRODUCT NAME", ""))
    stock = row.get("total_stock", 0)
    if isinstance(stock, (int, float)):
        stock_val = float(stock)
    else:
        stock_val = clean_amount(stock)

    base = {
        "name":          name,
        "sku":           sku,
        "barcode":       sku,
        "brand":         safe_brand(row.get("BRAND", "")),
        "category":      parse_category(row.get("CATEGORY", "")),
        "uom":           first_line(row.get("Unit", "Pcs")) or "Pcs",
        "weight_kg":     clean_amount(row.get("Weight (Kg)", 0)),
        "sale_price":    sell,
        "cost_price":    buy,
        "stock":         stock_val,
        "is_active":     True,
        "status":        "active",
    }

    # Size variants (only present on variable_products)
    sv = row.get("size_variants") or []
    if sv:
        # Extract color from name if " | " present (e.g. "ARDINA KURUNG | MAROON GOLD")
        color = ""
        if "|" in name:
            color = name.split("|")[-1].strip()
        variants = []
        for i, v in enumerate(sv):
            full_label = (v.get("sku") or v.get("size") or "").strip()
            raw_size = (v.get("size") or "").strip()
            # If size is too long, prefer the part before "/" or "-" as short label
            short_size = raw_size
            if len(short_size) > 30:
                short_size = (raw_size.split("/")[0] if "/" in raw_size else raw_size.split("-", 1)[-1])[:30]
            short_size = short_size[:30]
            variants.append({
                "sku":           full_label[:60] or f"{sku}-{i+1}",
                "size":          short_size,
                "variant_label": full_label[:120],
                "color":         color[:60],
                "stock":         float(v.get("total", 0) or 0),
                "cost_price":    buy,
                "sale_price":    sell,
                "sort_order":    i + 1,
                "is_active":     True,
            })
        base["variants"] = variants
    return base


def map_supplier(row):
    name      = first_line(row.get("detail_name") or row.get("name_listing") or "")
    contact   = first_line(row.get("detail_company_name") or row.get("company_listing") or "")
    sup_type  = first_line(row.get("detail_supplier_type") or row.get("supplier_type") or "")
    return {
        "name":           name or "Unknown Supplier",
        "contact_person": contact if contact and contact != name else "",
        "email":          first_line(row.get("detail_email", "")),
        "phone":          first_line(row.get("detail_phone", "")),
        "mobile":         "",
        "address":        first_line(row.get("detail_address", "")),
        "city":           first_line(row.get("detail_city", "")),
        "country":        first_line(row.get("detail_country", "")),
        "tax_number":     first_line(row.get("detail_tax_number", "")),
        "bank_name":      first_line(row.get("detail_bank_name", "")),
        "bank_account_number": first_line(row.get("detail_account_number", "")),
        "notes":          f"Type: {sup_type}" if sup_type else "",
        "is_active":      True,
    }


# ─────────────────────────────────────────────
# Lookup existing rows (for upsert)
# ─────────────────────────────────────────────

def find_product_by_sku(client, sku):
    """Search live products by SKU and return ID of exact match (active or inactive)."""
    r = client.get("inventory/products", params={"search": sku, "active": "false", "per_page": 50})
    if r.status_code != 200:
        return None
    body = r.json()
    items = body.get("data", [])
    if isinstance(items, dict): items = items.get("data", [])
    # Prefer exact SKU match, then active
    exact = [it for it in items if (it.get("sku") or "").strip() == sku]
    if not exact:
        return None
    exact.sort(key=lambda it: (0 if it.get("is_active") else 1, it.get("id", 0)))
    return exact[0]["id"]


def fetch_all_suppliers(client):
    """Return dict[normalized_name → id] of existing suppliers."""
    print("📋 fetching existing suppliers...")
    mp = {}
    r = client.get("suppliers/flat")
    if r.status_code == 200:
        body = r.json()
        items = body.get("data", []) if isinstance(body.get("data"), list) else []
        for s in items:
            key = (s.get("name") or "").strip().lower()
            if key:
                mp[key] = s["id"]
    else:
        # fallback to paginated list
        page = 1
        while True:
            r = client.get("suppliers/list", params={"per_page": 200, "page": page})
            if r.status_code != 200: break
            body = r.json()
            items = body.get("data", []) if isinstance(body.get("data"), list) else (body.get("data", {}) or {}).get("data", [])
            if not items: break
            for s in items:
                key = (s.get("name") or "").strip().lower()
                if key:
                    mp[key] = s["id"]
            if len(items) < 200: break
            page += 1
            if page > 20: break
    print(f"   ✅ {len(mp)} existing suppliers")
    return mp


# ─────────────────────────────────────────────
# Import functions
# ─────────────────────────────────────────────

def import_products(client):
    print("\n📦 Products import...")
    singles            = client.load_json("products")
    variants           = client.load_json("variable_products")
    inactive_singles   = client.load_json("inactive_products")
    inactive_variants  = client.load_json("inactive_variable_products")
    rows = (
        [(r, True)  for r in singles]
      + [(r, True)  for r in variants]
      + [(r, False) for r in inactive_singles]
      + [(r, False) for r in inactive_variants]
    )
    if not rows:
        return

    inserted = updated = failed = skipped = 0
    used_skus = set()

    for i, (row, is_active) in enumerate(rows, 1):
        mapped = map_product(row)
        if not is_active:
            mapped["is_active"] = False
            mapped["status"]    = "archived"
            for v in mapped.get("variants", []) or []:
                v["is_active"] = False
        if not mapped["name"]:
            skipped += 1
            continue
        sku = mapped["sku"]
        if not sku:
            pid = row.get("product_id")
            sku = f"REV-{pid}" if pid else f"REV-AUTO-{i}"
            mapped["sku"] = sku
            mapped["barcode"] = sku

        # Disambiguate duplicate SKUs across single+variant sets
        orig_sku = sku
        n = 1
        while sku in used_skus:
            n += 1
            sku = f"{orig_sku}-{n}"
        used_skus.add(sku)
        mapped["sku"] = sku
        mapped["barcode"] = sku

        existing_id = find_product_by_sku(client, sku)
        if existing_id:
            r = client.put(f"inventory/products/{existing_id}", mapped)
            if r.status_code in (200, 201):
                updated += 1
            else:
                failed += 1
                client.log_error("products(update)", sku, f"{r.status_code}: {r.text[:200]}")
        else:
            r = client.post("inventory/products", mapped)
            if r.status_code in (200, 201):
                inserted += 1
            else:
                failed += 1
                client.log_error("products(insert)", sku, f"{r.status_code}: {r.text[:200]}")

        if i % 25 == 0 or i == len(rows):
            print(f"   [{i}/{len(rows)}] ins={inserted} upd={updated} fail={failed} skip={skipped}", flush=True)

    client.record("products", len(rows), inserted + updated, updated)
    print(f"   ✅ products: inserted={inserted}, updated={updated}, failed={failed}, skipped={skipped}")


def import_suppliers(client):
    print("\n🏭 Suppliers import...")
    rows = client.load_json("suppliers")
    if not rows: return

    existing = fetch_all_suppliers(client)

    inserted = updated = failed = skipped = 0
    for i, row in enumerate(rows, 1):
        mapped = map_supplier(row)
        if mapped["name"] == "Unknown Supplier":
            skipped += 1
            continue
        key = mapped["name"].strip().lower()
        existing_id = existing.get(key)
        if existing_id:
            r = client.put(f"suppliers/list/{existing_id}", mapped)
            if r.status_code in (200, 201):
                updated += 1
            else:
                failed += 1
                client.log_error("suppliers(update)", mapped["name"], f"{r.status_code}: {r.text[:200]}")
        else:
            r = client.post("suppliers/list", mapped)
            if r.status_code in (200, 201):
                inserted += 1
                body = r.json()
                new = body.get("data") or body
                new_id = new.get("id") if isinstance(new, dict) else None
                if new_id:
                    existing[key] = new_id
            else:
                failed += 1
                client.log_error("suppliers(insert)", mapped["name"], f"{r.status_code}: {r.text[:200]}")
        print(f"   [{i}/{len(rows)}] {mapped['name'][:40]} → {'upd' if existing_id else 'ins'}")

    client.record("suppliers", len(rows), inserted + updated, updated)
    print(f"   ✅ suppliers: inserted={inserted}, updated={updated}, failed={failed}, skipped={skipped}")


# ─────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────

def main():
    scope = set([s.lower() for s in sys.argv[1:]]) or {"suppliers", "products"}
    print("=" * 60)
    print("  POS → ERP Migration | Step 3: Import (scope:", scope, ")")
    print("=" * 60)

    client = ERPClient()
    if not client.login():
        sys.exit(1)

    if "suppliers" in scope:
        import_suppliers(client)
    if "products" in scope:
        import_products(client)

    print("\n" + "=" * 60)
    print("  Summary")
    print("=" * 60)
    for m, s in client.imported.items():
        pct = int(s["success"] / s["total"] * 100) if s["total"] else 0
        icon = "✅" if pct >= 80 else ("⚠️ " if pct > 0 else "❌")
        print(f"  {icon}  {m:20s}: {s['success']}/{s['total']} ({pct}%)  updated={s.get('updated', 0)}")

    if client.errors:
        ef = f"{DATA_DIR}/import_errors.json"
        with open(ef, "w") as f:
            json.dump(client.errors, f, indent=2)
        print(f"\n  ⚠️  {len(client.errors)} errors logged → {ef}")
    else:
        print("\n  🎉 koi error nahi!")


if __name__ == "__main__":
    main()
