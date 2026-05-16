"""
STEP 1 — POS System Explorer
Yeh script Revebe POS mein login karke poori navigation aur pages explore karega.
Screenshots lega aur HTML save karega taake hum structure samjhein.
"""

import asyncio
import os
import json
from playwright.async_api import async_playwright
from config import POS_URL, POS_LOGIN, POS_EMAIL, POS_PASSWORD, DATA_DIR

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(f"{DATA_DIR}/screenshots", exist_ok=True)
os.makedirs(f"{DATA_DIR}/html", exist_ok=True)


async def login(page):
    print("🔐 Login kar raha hoon...")
    await page.goto(POS_LOGIN, wait_until="domcontentloaded")
    await asyncio.sleep(3)

    # Page source dekhte hain debug ke liye
    content = await page.content()
    print(f"   Page size: {len(content)} bytes")

    # Saare inputs dhundho
    inputs = await page.query_selector_all('input')
    print(f"   Total inputs: {len(inputs)}")
    for i, inp in enumerate(inputs):
        inp_type = await inp.get_attribute("type")
        inp_name = await inp.get_attribute("name")
        inp_id   = await inp.get_attribute("id")
        inp_ph   = await inp.get_attribute("placeholder")
        print(f"   Input[{i}]: type={inp_type} name={inp_name} id={inp_id} placeholder={inp_ph}")

    # Email/text field fill karo (pehla non-hidden input)
    text_inputs = [inp for inp in inputs]
    filled = 0
    for inp in text_inputs:
        t = await inp.get_attribute("type")
        if t in ["text", "email", None, ""]:
            await inp.fill(POS_EMAIL)
            filled += 1
            if filled == 1:
                break

    # Password field
    for inp in text_inputs:
        t = await inp.get_attribute("type")
        if t == "password":
            await inp.fill(POS_PASSWORD)
            break

    # Submit
    buttons = await page.query_selector_all('button, input[type="submit"]')
    for btn in buttons:
        btn_text = await btn.inner_text()
        btn_type = await btn.get_attribute("type")
        if btn_type == "submit" or "log" in btn_text.lower() or "sign" in btn_text.lower():
            await btn.click()
            break

    await asyncio.sleep(4)
    await page.wait_for_load_state("domcontentloaded")

    print(f"✅ Login attempt — URL: {page.url}")
    return "login" not in page.url.lower()


async def explore_navigation(page):
    """Sidebar ya nav menu se saare links nikalo"""
    print("\n📋 Navigation explore kar raha hoon...")

    await page.screenshot(path=f"{DATA_DIR}/screenshots/01_dashboard.png", full_page=True)

    # Saare nav links dhundho
    links = await page.eval_on_selector_all(
        'nav a, aside a, .sidebar a, [class*="menu"] a, [class*="nav"] a',
        'elements => elements.map(el => ({ text: el.innerText.trim(), href: el.href }))'
    )

    # Unique links
    seen = set()
    unique_links = []
    for link in links:
        if link['href'] not in seen and link['text']:
            seen.add(link['href'])
            unique_links.append(link)

    print(f"   {len(unique_links)} nav links mile:")
    for link in unique_links:
        print(f"   → {link['text']:30s}  {link['href']}")

    with open(f"{DATA_DIR}/navigation.json", "w") as f:
        json.dump(unique_links, f, indent=2)

    return unique_links


async def explore_page(page, name, url):
    """Ek page ko explore karo — screenshot, HTML, aur table data"""
    print(f"\n🔍 {name} explore kar raha hoon: {url}")

    await page.goto(url)
    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(2)

    # Screenshot
    await page.screenshot(
        path=f"{DATA_DIR}/screenshots/{name.replace(' ', '_')}.png",
        full_page=True
    )

    # Page title aur headings
    title = await page.title()
    headings = await page.eval_on_selector_all(
        'h1, h2, h3',
        'elements => elements.map(el => el.innerText.trim())'
    )

    # Tables dhundho
    tables = await page.eval_on_selector_all('table', '''tables => tables.map(table => {
        const headers = Array.from(table.querySelectorAll('th')).map(th => th.innerText.trim());
        const rows = Array.from(table.querySelectorAll('tbody tr')).map(row =>
            Array.from(row.querySelectorAll('td')).map(td => td.innerText.trim())
        );
        return { headers, row_count: rows.length, sample_rows: rows.slice(0, 3) };
    })''')

    # Pagination check
    pagination = await page.query_selector('[class*="pagination"], [class*="pager"]')
    has_pagination = pagination is not None

    result = {
        "name": name,
        "url": url,
        "title": title,
        "headings": headings,
        "tables": tables,
        "has_pagination": has_pagination
    }

    with open(f"{DATA_DIR}/html/{name.replace(' ', '_')}_info.json", "w") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"   Title: {title}")
    print(f"   Headings: {headings[:3]}")
    print(f"   Tables: {len(tables)}, Pagination: {has_pagination}")

    return result


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1400, "height": 900})
        page = await context.new_page()

        # Login
        success = await login(page)
        if not success:
            print("❌ Login fail hua! Credentials check karein.")
            await browser.close()
            return

        # Dashboard screenshot
        await page.screenshot(path=f"{DATA_DIR}/screenshots/00_after_login.png", full_page=True)
        dashboard_url = page.url
        print(f"   Dashboard URL: {dashboard_url}")

        # Navigation explore
        nav_links = await explore_navigation(page)

        # Common pages try karo agar nav nahi mila
        common_pages = [
            ("products",   f"{POS_URL}/products"),
            ("customers",  f"{POS_URL}/customers"),
            ("orders",     f"{POS_URL}/orders"),
            ("sales",      f"{POS_URL}/sales"),
            ("invoices",   f"{POS_URL}/invoices"),
            ("inventory",  f"{POS_URL}/inventory"),
            ("purchases",  f"{POS_URL}/purchases"),
            ("payments",   f"{POS_URL}/payments"),
            ("reports",    f"{POS_URL}/reports"),
            ("suppliers",  f"{POS_URL}/suppliers"),
        ]

        pages_info = []

        # Nav links se explore karo
        for link in nav_links[:15]:  # Pehle 15 links
            if POS_URL in link['href'] and 'login' not in link['href']:
                info = await explore_page(page, link['text'], link['href'])
                pages_info.append(info)

        # Agar nav links nahi mile toh common pages try karo
        if len(pages_info) < 3:
            print("\n⚠️  Nav links se pages nahi mile — common URLs try kar raha hoon...")
            for name, url in common_pages:
                try:
                    info = await explore_page(page, name, url)
                    if info['title'] and 'login' not in info['title'].lower():
                        pages_info.append(info)
                except Exception as e:
                    print(f"   ⚠️  {name}: {e}")

        # Summary save karo
        with open(f"{DATA_DIR}/exploration_summary.json", "w") as f:
            json.dump({
                "dashboard_url": dashboard_url,
                "nav_links": nav_links,
                "pages_explored": pages_info
            }, f, indent=2, ensure_ascii=False)

        print(f"\n✅ Exploration mukammal! Data yahan save hua: {DATA_DIR}/")
        print(f"   Screenshots: {DATA_DIR}/screenshots/")
        print(f"   Summary: {DATA_DIR}/exploration_summary.json")
        print("\n➡️  Ab step2_scrape_data.py chalayein")

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
