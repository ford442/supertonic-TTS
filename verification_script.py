from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_mixer_ui(page: Page):
    # 1. Arrange: Go to the app
    page.goto("http://localhost:4173")

    # Wait for the "Show Mixer" button to be visible
    show_mixer_btn = page.get_by_role("button", name="Show Mixer & Editor")
    expect(show_mixer_btn).to_be_visible()

    # 2. Act: Click to show mixer
    show_mixer_btn.click()

    # Wait for mixer panel to appear
    mixer_panel = page.locator("#mixerPanel")
    expect(mixer_panel).to_be_visible()

    # Verify elements in mixer
    expect(page.get_by_text("Timbre Heatmap (Style TTL)")).to_be_visible()
    expect(page.locator("#mixerCanvas")).to_be_visible()

    # Verify basic operation buttons
    expect(page.get_by_role("button", name="Mirror X")).to_be_visible()
    expect(page.get_by_role("button", name="Sharpen")).to_be_visible()
    
    # Verify all new singing mode preset buttons
    expect(page.get_by_role("button", name="📖 Verse")).to_be_visible()
    expect(page.get_by_role("button", name="🎤 Chorus")).to_be_visible()
    expect(page.get_by_role("button", name="🌉 Bridge")).to_be_visible()
    expect(page.get_by_role("button", name="🎬 Intro")).to_be_visible()
    expect(page.get_by_role("button", name="🎬 Outro")).to_be_visible()
    expect(page.get_by_role("button", name="🎵 General")).to_be_visible()

    # 3. Act: Test various singing mode presets
    # We can't easily verify the canvas content changes in headless mode without image comparison,
    # but we can verify no errors occurred and the buttons are clickable.
    page.get_by_role("button", name="Mirror X").click()
    time.sleep(0.5)
    
    # Test each singing preset
    page.get_by_role("button", name="📖 Verse").click()
    time.sleep(0.5)
    
    page.get_by_role("button", name="🎤 Chorus").click()
    time.sleep(0.5)
    
    page.get_by_role("button", name="🌉 Bridge").click()
    time.sleep(0.5)
    
    page.get_by_role("button", name="🎬 Intro").click()
    time.sleep(0.5)
    
    page.get_by_role("button", name="🎬 Outro").click()
    time.sleep(0.5)
    
    page.get_by_role("button", name="🎵 General").click()
    time.sleep(0.5)

    # 4. Screenshot
    # Wait a moment for any rendering
    time.sleep(1)
    page.screenshot(path="/home/jules/verification/mixer_ui.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_mixer_ui(page)
            print("✅ All singing mode presets verified successfully!")
        except Exception as e:
            print(f"❌ Error: {e}")
        finally:
            browser.close()
