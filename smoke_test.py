import asyncio
from playwright.async_api import async_playwright

async def run_test():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        results = {}

        # 1. code.html - theme toggle
        await page.goto("http://localhost:5500/code.html")
        theme_btn = page.locator("#theme-toggle")
        initial_label = await theme_btn.inner_text()
        await theme_btn.click()
        new_label = await theme_btn.inner_text()
        theme_pass = initial_label != new_label
        results["Theme toggle"] = "PASS" if theme_pass else f"FAIL (Label stayed {initial_label})"

        # 2. code.html - plus/minus passenger
        passenger_count = page.locator("#passenger-count")
        await page.locator("#plus").click()
        val_after_plus = await passenger_count.inner_text()
        await page.locator("#minus").click()
        val_after_minus = await passenger_count.inner_text()
        results["Passenger counters"] = "PASS" if val_after_plus == "2" and val_after_minus == "1" else f"FAIL (Expected 2 then 1, got {val_after_plus} then {val_after_minus})"

        # 3. code.html - unmatched search shows no-routes
        await page.fill("#origin", "UnmatchedValue")
        await page.click("#search-routes")
        no_routes_visible = await page.locator(".no-routes").is_visible()
        results["Unmatched search"] = "PASS" if no_routes_visible else "FAIL (No-routes card not visible)"

        # 4. code.html - no-routes reset button
        if no_routes_visible:
            await page.click("#reset-search")
            # After reset, routes should be back (assuming app.js populates them)
            # Or at least no-routes should be gone
            no_routes_hidden = not await page.locator(".no-routes").is_visible()
            results["No-routes reset"] = "PASS" if no_routes_hidden else "FAIL (No-routes card still visible after reset)"
        else:
            results["No-routes reset"] = "SKIP (No-routes card didn't appear)"

        # 5. code.html - chip click
        chip = page.locator(".chip").nth(1) # Accra Central
        chip_text = await chip.inner_text()
        await chip.click()
        origin_val = await page.input_value("#origin")
        is_active = "active" in (await chip.get_attribute("class"))
        results["Chip click"] = "PASS" if origin_val == chip_text and is_active else f"FAIL (Origin: {origin_val}, Chip active: {is_active})"

        # 6. code.html - route select updates tracker
        # Need to ensure routes are visible. Reset search.
        await page.click("#reset-search")
        first_route = page.locator(".route-card").first
        if await first_route.count() > 0:
            route_name = await first_route.locator("h3").inner_text()
            await first_route.click()
            tracker_name = await page.locator("#selected-route-name").inner_text()
            results["Route selection"] = "PASS" if route_name == tracker_name else f"FAIL (Expected {route_name}, got {tracker_name})"
        else:
            results["Route selection"] = "FAIL (No routes found to click)"

        # 7. code.html - Reserve seat updates seats with toast
        await page.click("#book-route")
        # Check for toast - assuming toast is common element or notification
        toast = page.locator(".toast")
        toast_visible = await toast.is_visible()
        results["Reserve seat toast"] = "PASS" if toast_visible else "FAIL (Toast not visible)"

        # 8. signin.html - Password toggle
        await page.goto("http://localhost:5500/signin.html")
        pw_input = page.locator("input[name='password']")
        toggle_btn = page.locator(".password-toggle")
        
        await toggle_btn.click()
        type_after_click = await pw_input.get_attribute("type")
        results["Signin password toggle"] = "PASS" if type_after_click == "text" else "FAIL"

        # 9. signin.html - validation note
        await page.goto("http://localhost:5500/signin.html")
        await page.click("button[type='submit']")
        # Form submission with required fields empty usually shows note if JS handles it
        note = page.locator("[data-form-note]")
        note_text = await note.inner_text()
        results["Signin validation note"] = "PASS" if len(note_text) > 0 else "FAIL"

        # 10. signup.html - Password toggle
        await page.goto("http://localhost:5500/signup.html")
        pw_input_signup = page.locator("input[name='password']")
        toggles = page.locator(".password-toggle")
        await toggles.first.click()
        type_after_click_signup = await pw_input_signup.get_attribute("type")
        results["Signup password toggle"] = "PASS" if type_after_click_signup == "text" else "FAIL"

        # 11. signup.html - validation note
        await page.click("button[type='submit']")
        note_signup = page.locator("[data-form-note]")
        note_text_signup = await note_signup.inner_text()
        results["Signup validation note"] = "PASS" if len(note_text_signup) > 0 else "FAIL"

        for test, res in results.items():
            print(f"{test}: {res}")

        await browser.close()

asyncio.run(run_test())
