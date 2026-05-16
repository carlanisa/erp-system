"""
Probe: Revebe ke product + supplier pages ka DOM inspect karta hai
taa-keh hum stock + supplier-detail extraction sahi karein.

Outputs:
  scraped_data/probe/product_listing.html
  scraped_data/probe/product_listing.png
  scraped_data/probe/product_listing_summary.json
  scraped_data/probe/supplier_listing.html
  scraped_data/probe/supplier_listing.png
  scraped_data/probe/supplier_detail.html  (first supplier edit page if reachable)
  scraped_data/probe/variable_listing.html
  scraped_data/probe/variable_listing.png
"""
import asyncio, os, json
from playwright.async_api import async_playwright
from config import POS_URL, POS_LOGIN, POS_EMAIL, POS_PASSWORD, DATA_DIR

OUT = f"{DATA_DIR}/probe"
os.makedirs(OUT, exist_ok=True)


async def login(page):
    print("login...")
    await page.goto(POS_LOGIN, wait_until="domcontentloaded")
    await asyncio.sleep(2)
    inputs = await page.query_selector_all('input')
    for inp in inputs:
        t = await inp.get_attribute("type")
        if t in ["text", "email", None, ""]:
            await inp.fill(POS_EMAIL)
            break
    for inp in inputs:
        t = await inp.get_attribute("type")
        if t == "password":
            await inp.fill(POS_PASSWORD)
            break
    for btn in await page.query_selector_all('button, input[type="submit"]'):
        bt = await btn.get_attribute("type")
        tx = (await btn.inner_text()).lower()
        if bt == "submit" or "log" in tx or "sign" in tx:
            await btn.click()
            break
    await asyncio.sleep(4)
    print(f"  url after login: {page.url}")
    return "login" not in page.url.lower()


async def probe_page(page, name, url, wait_for_table=True):
    print(f"\n[{name}] {url}")
    await page.goto(url, wait_until="domcontentloaded")
    await asyncio.sleep(3)

    if wait_for_table:
        try:
            await page.wait_for_selector("table tbody tr", timeout=15000)
            await page.wait_for_load_state("networkidle", timeout=15000)
        except Exception as e:
            print(f"  table wait failed: {e}")

    # Try to maximize per-page
    try:
        sels = await page.query_selector_all('select[name*="DataTables"], select[name*="length"], .dataTables_length select')
        for s in sels:
            opts = await s.eval_on_selector_all('option', 'opts => opts.map(o => o.value)')
            mx = max([int(v) for v in opts if v.lstrip("-").isdigit()] or [0])
            if mx > 0:
                await s.select_option(value=str(mx))
                await asyncio.sleep(2)
                print(f"  per-page set: {mx}")
                break
    except Exception as e:
        print(f"  per-page set err: {e}")

    # Screenshot + full HTML
    await page.screenshot(path=f"{OUT}/{name}.png", full_page=True)
    html = await page.content()
    with open(f"{OUT}/{name}.html", "w", encoding="utf-8") as f:
        f.write(html)

    # Inspect tables
    table_info = await page.eval_on_selector_all('table', '''tables => tables.map((table, idx) => {
        const headers = Array.from(table.querySelectorAll('thead th, th')).map(th => th.innerText.trim()).slice(0, 50);
        const firstRow = Array.from(table.querySelectorAll('tbody tr')).slice(0, 1).map(tr =>
            Array.from(tr.querySelectorAll('td')).map(td => ({
                text: td.innerText.trim().slice(0, 100),
                has_link: !!td.querySelector('a'),
                link: td.querySelector('a') ? td.querySelector('a').href : null,
                html_snippet: td.innerHTML.trim().slice(0, 200),
            }))
        );
        return {
            idx,
            id: table.id,
            class: table.className,
            row_count: table.querySelectorAll('tbody tr').length,
            header_count: headers.length,
            headers,
            first_row: firstRow[0] || []
        };
    })''')

    summary = {"url": url, "final_url": page.url, "tables": table_info}
    with open(f"{OUT}/{name}_summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    print(f"  tables found: {len(table_info)}")
    for t in table_info[:3]:
        print(f"   table[{t['idx']}] id={t['id']} rows={t['row_count']} headers={t['headers'][:8]}")
    return summary


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, slow_mo=100)
        ctx = await browser.new_context(viewport={"width": 1600, "height": 1000})
        page = await ctx.new_page()
        if not await login(page):
            print("LOGIN FAILED"); await browser.close(); return

        await probe_page(page, "product_listing",  f"{POS_URL}/all/product")
        await probe_page(page, "variable_listing", f"{POS_URL}/all/variable/product")
        sup_summary = await probe_page(page, "supplier_listing", f"{POS_URL}/all/supplier")

        # Try first supplier detail/edit link if discoverable
        sup_link = None
        for t in sup_summary.get("tables", []):
            for cell in t.get("first_row", []):
                if cell.get("link") and "supplier" in cell["link"]:
                    sup_link = cell["link"]; break
            if sup_link: break
        if sup_link:
            await probe_page(page, "supplier_detail", sup_link, wait_for_table=False)
        else:
            print("\nNo supplier detail link found in row")

        await browser.close()
        print(f"\nDone. Output in {OUT}/")


if __name__ == "__main__":
    asyncio.run(main())
