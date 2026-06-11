from playwright.sync_api import Page, expect, sync_playwright
import time

def test_homepage(page: Page):
    # Go to the Homepage
    page.goto("http://localhost:8081/")
    time.sleep(2)

    # Check for main heading
    expect(page.get_by_role("heading", name="Your Campus Marketplace")).to_be_visible()

    # Check for some categories - using first()
    expect(page.get_by_text("Food & Snacks").first).to_be_visible()

    page.screenshot(path="verification/homepage_check.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_homepage(page)
        finally:
            browser.close()
