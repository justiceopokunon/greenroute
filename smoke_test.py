import asyncio
from playwright.async_api import async_playwright

async def run_test():
    async with async_playwright() as p:
        try:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            # Start gathering results
            
            # 1. code.html
            await page.goto("http://localhost:5500/code.html", timeout=10000)
            
            # Theme toggle
            theme_btn = page.locator("#theme-toggle")
            initial_label = await theme_btn.inner_text()
            await theme_btn.click()
            new_label = await theme_btn.inner_text()
            print(f"Theme toggle: {'PASS' if initial_label != new_label else 'FAIL'}")

            # Passenger
            passenger_count = page.locator("#passenger-count")
            await page.locator("#plus").click()
            v1 = await passenger_count.inner_text()
            await page.locator("#minus").click()
            v2 = await passenger_count.inner_text()
            print(f"Passenger counters: {'PASS' if v1 == '2' and v2 == '1' else 'FAIL'}")

            # Search
            await page.fill("#origin", "UnmatchedValue")
            await page.click("#search-routes")
            print(f"Unmatched search: {'PASS' if await page.locator('.no-routes').is_visible() else 'FAIL'}")
            
            await page.click("#reset-search")
            print(f"No-routes reset: {'PASS' if not await page.locator('.no-routes').is_visible() else 'FAIL'}")

            # Chip
            chip = page.locator(".chip").nth(1)
            chip_text = await chip.inner_text()
            await chip.click()
            origin_val = await page.input_value("#origin")
            is_active = "active" in (await chip.get_attribute("class") or "")
            print(f"Chip click: {'PASS' if origin_val == chip_text and is_active else 'FAIL'}")

            # Route
            await page.click("#reset-search")
            first_route = page.locator(".route-card").first
            if await first_route.count() > 0:
                route_name = await first_route.locator("h3").inner_text()
                await first_route.click()
                tracker_name = await page.locator("#selected-route-name").inner_text()
                print(f"Route selection: {'PASS' if route_name == tracker_name else 'FAIL'}")
            else:
                print("Route selection: FAIL (No routes)")

            # Toast
            await page.click("#book-route")
            print(f"Reserve seat toast: {'PASS' if await page.locator('.toast').is_visible() else 'FAIL'}")

            # 2. signin.html
            await page.goto("http://localhost:5500/signin.html", timeout=10000)
            await page.locator(".password-toggle").click()
            print(f"Signin password toggle: {'PASS' if await page.locator('input[name=\"password\"]').get_attribute('type') == 'text' else 'FAIL'}")
            
            await page.click("button[type='submit']")
            print(f"Signin validation note: {'PASS' if len(await page.locator('[data-form-note]').inner_text()) > 0 else 'FAIL'}")

            # 3. signup.html
            await page.goto("http://localhost:5500/signup.html", timeout=10000)
            await page.locator(".password-toggle").first.click()
            print(f"Signup password toggle: {'PASS' if await page.locator('input[name=\"password\"]').get_attribute('type') == 'text' else 'FAIL'}")
            
            await page.click("button[type='submit']")
            print(f"Signup validation note: {'PASS' if len(await page.locator('[data-form-note]').inner_text()) > 0 else 'FAIL'}")

            await browser.close()
        except Exception as e:
            print(f"Error: {e}")

if __name__ == '__main__':
    asyncio.run(run_test())
