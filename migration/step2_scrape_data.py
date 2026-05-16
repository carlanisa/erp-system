"""
STEP 2 — POS Data Scraper (Revebe POS — Carlanisa)
Suppliers + Products (single + variable) ko stock + detail-page fields ke saath scrape karta hai.
"""

import asyncio
import os
import json
import re
import sys
from datetime import datetime
from playwright.async_api import async_playwright
from config import POS_URL, POS_LOGIN, POS_EMAIL, POS_PASSWORD, DATA_DIR

os.makedirs(DATA_DIR, exist_ok=True)

# ─── Real URLs from Revebe POS Navigation ───────────────────
URLS = {
    "customers":         f"{POS_URL}/all/customer",
    "customer_invoices": f"{POS_URL}/sale/all",
    "customer_payments": f"{POS_URL}/sales/payments",
    "customer_returns":  f"{POS_URL}/sale/return/all",
    "suppliers":         f"{POS_URL}/all/supplier",
    "purchase_invoices": f"{POS_URL}/purchase/all",
    "purchase_returns":  f"{POS_URL}/purchase/return/all",
    "supplier_payments": f"{POS_URL}/all/supplier/payment",
    "products":                   f"{POS_URL}/all/product",
    "variable_products":          f"{POS_URL}/all/variable/product",
    "inactive_products":          f"{POS_URL}/inactive/product",
    "inactive_variable_products": f"{POS_URL}/inactive/variable/product",
}


# ─── Login ───────────────────────────────────────────────────
async def login(page):
    print("🔐 Login...")
    await page.goto(POS_LOGIN, wait_until="domcontentloaded")
    await asyncio.sleep(2)
    inputs = await page.query_selector_all('input')
    for inp in inputs:
        t = await inp.get_attribute("type")
        if t in ["text", "email", None, ""]:
            await inp.fill(POS_EMAIL); break
    for inp in inputs:
        t = await inp.get_attribute("type")
        if t == "password":
            await inp.fill(POS_PASSWORD); break
    for btn in await page.query_selector_all('button, input[type="submit"]'):
        bt = await btn.get_attribute("type")
        tx = (await btn.inner_text()).lower()
        if bt == "submit" or "log" in tx or "sign" in tx:
            await btn.click(); break
    await asyncio.sleep(4)
    ok = "login" not in page.url.lower()
    print(f"   {'✅' if ok else '❌'} {page.url}")
    return ok


# ─── DataTables: set max per page ────────────────────────────
async def set_max_per_page(page):
    try:
        sels = await page.query_selector_all(
            'select[name*="DataTables"], select[name*="length"], .dataTables_length select'
        )
        for s in sels:
            opts = await s.eval_on_selector_all('option', 'opts => opts.map(o => o.value)')
            nums = [int(v) for v in opts if v.lstrip("-").isdigit()]
            if nums:
                mx = max(nums)
                await s.select_option(value=str(mx))
                await asyncio.sleep(2)
                print(f"   per-page: {mx}")
                return True
    except Exception as e:
        print(f"   per-page err: {e}")
    return False


async def click_next(page):
    selectors = [
        'a.paginate_button.next:not(.disabled)',
        '.next:not(.disabled) a',
        'a[aria-label="Next"]:not([class*="disabled"])',
        'button.next:not(:disabled)',
    ]
    for sel in selectors:
        try:
            btn = await page.query_selector(sel)
            if btn:
                cls = await btn.get_attribute("class") or ""
                if "disabled" not in cls:
                    await btn.click()
                    # Wait for table to repaint after AJAX
                    await page.wait_for_load_state("networkidle", timeout=15000)
                    await asyncio.sleep(2)
                    return True
        except:
            continue
    return False


def save_json(data, name):
    fp = f"{DATA_DIR}/{name}.json"
    with open(fp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"   💾 {fp} ({len(data)} records)")


# ─── PRODUCTS: scrape main row + embedded stock-table ────────
# Main table headers (Revebe order): SR, PRODUCT NAME, CODE, BRAND, CATEGORY, Unit, Weight (Kg), STATUS, PRICE, TAX RATE, ACTIONS
PRODUCT_FIELDS = ["SR", "PRODUCT NAME", "CODE", "BRAND", "CATEGORY", "Unit", "Weight (Kg)", "STATUS", "PRICE", "TAX RATE"]

EXTRACT_PRODUCT_ROWS_JS = r"""
() => {
    const t = document.querySelector('table#basic-datatable');
    if (!t) return [];
    const rows = Array.from(t.querySelectorAll('tbody > tr'));
    return rows.map(tr => {
        const tds = Array.from(tr.children).filter(c => c.tagName === 'TD');
        const cells = tds.slice(0, 10).map(td => td.innerText.trim());

        let totalStock = 0;
        let stockRows = [];
        let sizeVariants = [];   // [{ size: 'XS', code: '24873768', sku: 'XS/24873768', stock_by_location: {SHOPIFY: 0}, total: 0 }]
        let locationHeaders = [];

        const nested = tr.querySelectorAll('table');
        for (const nt of nested) {
            const isStockTable = nt.classList && nt.classList.contains('stock-table');

            // 1. Grand Total Qty from header/footer ths
            const ths = Array.from(nt.querySelectorAll('th')).map(th => th.innerText.trim());
            for (let i = 0; i < ths.length; i++) {
                if (/Grand Total Qty|All Locations Total/i.test(ths[i])) {
                    let numStr = (ths[i].match(/(\d+(?:\.\d+)?)\s*$/) || [])[1];
                    if (!numStr) numStr = (ths[i+1] || '').replace(/[^0-9.-]/g, '');
                    const n = parseFloat(numStr);
                    if (!isNaN(n)) totalStock = Math.max(totalStock, n);
                }
            }

            // 2. Per-row data — depends on table type
            if (isStockTable) {
                // headers row: ["Variation Code", "<LOCATION_NAME>", ...]
                const headerRow = nt.querySelector('thead tr');
                const headerCells = headerRow ? Array.from(headerRow.querySelectorAll('th')).map(th => th.innerText.trim()) : [];
                const firstCol = (headerCells[0] || '').toLowerCase();
                const locCols = headerCells.slice(1).filter(h => h && !/grand total|all locations total/i.test(h));
                if (locCols.length) locationHeaders = locCols;

                const bodyRows = Array.from(nt.querySelectorAll('tbody tr'));
                for (const r of bodyRows) {
                    const cs = Array.from(r.querySelectorAll('td')).map(td => td.innerText.trim());
                    if (cs.length < 2) continue;
                    const label = cs[0];   // e.g. "XS/24873768"  OR  "SHOPIFY" (single product, just location)
                    if (firstCol.includes('variation')) {
                        // size variant row
                        const m = label.match(/^\s*([A-Za-z0-9]+)\s*\/\s*(.+?)\s*$/);
                        const size = m ? m[1] : label;
                        const baseCode = m ? m[2] : '';
                        const stockBy = {};
                        let rowTotal = 0;
                        for (let j = 1; j < cs.length && j-1 < locCols.length; j++) {
                            const q = parseFloat((cs[j] || '').replace(/[^0-9.-]/g, ''));
                            if (!isNaN(q)) { stockBy[locCols[j-1]] = q; rowTotal += q; }
                        }
                        sizeVariants.push({ size, base_code: baseCode, sku: label.trim(), stock_by_location: stockBy, total: rowTotal });
                    } else {
                        // location-based row (single product) — first col is location name
                        const q = parseFloat((cs[1] || '').replace(/[^0-9.-]/g, ''));
                        if (!isNaN(q)) stockRows.push({ location: label, qty: q });
                    }
                }
            }
        }

        if (totalStock === 0) {
            if (sizeVariants.length) totalStock = sizeVariants.reduce((a, v) => a + v.total, 0);
            else if (stockRows.length) totalStock = stockRows.reduce((a, r) => a + r.qty, 0);
        }

        const pidEl = tr.querySelector('[data-product-id]');
        const pid = pidEl ? pidEl.getAttribute('data-product-id') : null;

        return { cells, totalStock, stockRows, sizeVariants, locationHeaders, pid };
    });
}
"""


async def scrape_products(page, name, url):
    print(f"\n📦 {name} ({url})")
    await page.goto(url, wait_until="domcontentloaded")
    await asyncio.sleep(3)
    if "login" in page.url.lower():
        print("   ⚠️  session expire — re-login...")
        await login(page)
        await page.goto(url, wait_until="domcontentloaded")
        await asyncio.sleep(3)

    await set_max_per_page(page)

    all_records = []
    page_num = 1
    seen_pids = set()  # de-dup across pages
    while True:
        try:
            await page.wait_for_selector('table#basic-datatable tbody tr', timeout=20000)
        except:
            print("   ⚠️  no rows on this page — breaking")
            break

        raw = await page.evaluate(EXTRACT_PRODUCT_ROWS_JS)
        page_added = 0
        for entry in raw:
            cells = entry["cells"]
            if not cells or len(cells) < len(PRODUCT_FIELDS):
                cells = cells + [""] * (len(PRODUCT_FIELDS) - len(cells))
            # Filter malformed rows (SR must be a number)
            sr = (cells[0] or "").strip()
            if not sr.isdigit():
                continue
            pid = entry.get("pid")
            dedup_key = pid or f"sr-{sr}-page-{page_num}"
            if dedup_key in seen_pids:
                continue
            seen_pids.add(dedup_key)

            d = {PRODUCT_FIELDS[i]: cells[i] for i in range(len(PRODUCT_FIELDS))}
            d["product_id"]    = pid
            d["total_stock"]   = entry["totalStock"]
            d["stock_by_location"] = entry["stockRows"]
            d["size_variants"] = entry.get("sizeVariants", [])
            d["locations"]     = entry.get("locationHeaders", [])
            all_records.append(d)
            page_added += 1

        print(f"   page {page_num}: +{page_added} (total {len(all_records)})")

        if not await click_next(page):
            print(f"   ✅ done — {len(all_records)} records")
            break
        page_num += 1
        if page_num > 500:
            break

    save_json(all_records, name)
    return all_records


# ─── SUPPLIERS: listing + per-supplier detail page ───────────
EXTRACT_SUPPLIER_LIST_JS = r"""
() => {
    const t = document.querySelector('table#basic-datatable');
    if (!t) return [];
    return Array.from(t.querySelectorAll('tbody > tr')).map(tr => {
        const tds = Array.from(tr.children).filter(c => c.tagName === 'TD');
        const cells = tds.map(td => td.innerText.trim());
        // Try to extract supplier id from edit link or data-id
        let sid = null;
        const editLink = tr.querySelector('a[href*="/edit/supplier/"]');
        if (editLink) {
            const m = editLink.getAttribute('href').match(/\/edit\/supplier\/(\d+)/);
            if (m) sid = m[1];
        }
        if (!sid) {
            const dEl = tr.querySelector('[data-id]');
            if (dEl) sid = dEl.getAttribute('data-id');
        }
        return { cells, sid };
    });
}
"""

# Edit form field names confirmed from probe: name, phone, email, company_name, supplier_type_id,
# account_title, account_number, bank_name
EXTRACT_SUPPLIER_DETAIL_JS = r"""
() => {
    const f = {};
    for (const k of ['name','phone','email','company_name','account_title','account_number','bank_name']) {
        const el = document.querySelector(`[name="${k}"]`);
        if (el) f[k] = (el.value || '').trim();
    }
    // Selected supplier_type label (not just the id)
    const sel = document.querySelector('select[name="supplier_type_id"]');
    if (sel) {
        const opt = sel.options[sel.selectedIndex];
        f.supplier_type = opt ? opt.text.trim() : '';
        f.supplier_type_id = sel.value;
    }
    // Address: may be in textarea[name=address] or address1/address2
    for (const k of ['address','address1','address2','city','country','tax_number']) {
        const el = document.querySelector(`[name="${k}"]`);
        if (el) f[k] = (el.value || el.textContent || '').trim();
    }
    return f;
}
"""

# Listing column order (8 cols including hidden checkbox):
#   index 0: checkbox/blank
#   index 1: SR#
#   index 2: SUPPLIER (display name, often same as listing-1 cell — actually empty in this Revebe)
#   index 3: COMPANY NAME (real supplier name e.g. "TAILOR - IMRAN")
#   index 4: TYPE         (form's company_name — e.g. "IMRAN")
#   index 5: ACTIONS      (supplier_type label — TAILOR / WHOLESALER / ACCESSORIES / DIGITAL PRINTING)


async def scrape_suppliers(page, name, url):
    print(f"\n🏭 {name} ({url})")
    await page.goto(url, wait_until="domcontentloaded")
    await asyncio.sleep(3)
    if "login" in page.url.lower():
        await login(page)
        await page.goto(url, wait_until="domcontentloaded")
        await asyncio.sleep(3)

    await set_max_per_page(page)

    suppliers = []
    page_num = 1
    while True:
        try:
            await page.wait_for_selector('table#basic-datatable tbody tr', timeout=15000)
        except:
            break
        raw = await page.evaluate(EXTRACT_SUPPLIER_LIST_JS)
        added = 0
        for entry in raw:
            cells = entry["cells"]
            if len(cells) < 6:
                continue
            sr = (cells[1] or "").strip()
            if not sr.isdigit():
                continue
            suppliers.append({
                "sr":               sr,
                "supplier_id":      entry["sid"],
                "name_listing":     cells[3].split("\n")[0].strip(),  # COMPANY NAME col
                "company_listing":  cells[4].split("\n")[0].strip(),  # TYPE col
                "supplier_type":    cells[5].split("\n")[0].strip(),  # ACTIONS col (TAILOR/WHOLESALER/…)
            })
            added += 1
        print(f"   page {page_num}: +{added} (total {len(suppliers)})")
        if not await click_next(page):
            break
        page_num += 1
        if page_num > 100:
            break

    # Now fetch each supplier's edit page for phone/email/bank
    print(f"   fetching detail for {len(suppliers)} suppliers...")
    for i, s in enumerate(suppliers, 1):
        sid = s.get("supplier_id")
        if not sid:
            continue
        edit_url = f"{POS_URL}/edit/supplier/{sid}"
        try:
            await page.goto(edit_url, wait_until="domcontentloaded")
            await asyncio.sleep(1.2)
            if "login" in page.url.lower():
                await login(page)
                await page.goto(edit_url, wait_until="domcontentloaded")
                await asyncio.sleep(1.2)
            details = await page.evaluate(EXTRACT_SUPPLIER_DETAIL_JS)
            s.update({f"detail_{k}": v for k, v in details.items()})
        except Exception as e:
            s["detail_error"] = str(e)[:120]
        if i % 5 == 0 or i == len(suppliers):
            print(f"     [{i}/{len(suppliers)}]")

    save_json(suppliers, name)
    return suppliers


# ─── Main ────────────────────────────────────────────────────
async def main():
    only = set((os.environ.get("ONLY") or "suppliers,products,variable_products").split(","))
    only = {x.strip() for x in only if x.strip()}

    print("=" * 60)
    print("  POS → ERP Migration | Step 2: Data Scraping (FIXED)")
    print(f"  Scope: {sorted(only)}")
    print("=" * 60)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, slow_mo=100)
        ctx = await browser.new_context(
            viewport={"width": 1600, "height": 1000},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        )
        page = await ctx.new_page()

        if not await login(page):
            print("❌ Login fail"); await browser.close(); sys.exit(1)

        summary = {"scraped_at": datetime.now().isoformat(), "modules": {}}

        if "suppliers" in only:
            data = await scrape_suppliers(page, "suppliers", URLS["suppliers"])
            summary["modules"]["suppliers"] = len(data)

        if "products" in only:
            data = await scrape_products(page, "products", URLS["products"])
            summary["modules"]["products"] = len(data)

        if "variable_products" in only:
            data = await scrape_products(page, "variable_products", URLS["variable_products"])
            summary["modules"]["variable_products"] = len(data)

        if "inactive_products" in only:
            data = await scrape_products(page, "inactive_products", URLS["inactive_products"])
            summary["modules"]["inactive_products"] = len(data)

        if "inactive_variable_products" in only:
            data = await scrape_products(page, "inactive_variable_products", URLS["inactive_variable_products"])
            summary["modules"]["inactive_variable_products"] = len(data)

        save_json(summary, "scraping_summary")
        print("\n✅ Scraping done")
        for m, c in summary["modules"].items():
            print(f"   {m}: {c}")

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
