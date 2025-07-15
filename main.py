import asyncio
from browser_use import Agent
from browser_use.browser import BrowserProfile, BrowserSession

async def setup_browser():
    """Initialize browser with comprehensive anti-detection configurations"""
    
    # Create browser profile with all anti-detection settings
    browser_profile = BrowserProfile(
        # Core anti-detection settings
        stealth=True,  # Uses Patchright to avoid bot-blocking
        disable_security=False,  # Keep security features enabled
        deterministic_rendering=False,  # Don't make rendering deterministic (easier to detect)
        
        # Browser identity settings
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        locale="en-US",
        timezone_id="America/New_York",
        
        # Display settings
        headless=False,  # Run in headful mode for better stealth
        viewport={'width': 1920, 'height': 1080},
        window_size={'width': 1920, 'height': 1080},
        device_scale_factor=1.0,
        is_mobile=False,
        
        # Persistent profile for cookies/storage
        user_data_dir="./browser_profile",
        keep_alive=True,
        
        # Downloads configuration
        downloads_path="./downloads",
        
        # Permissions
        permissions=['clipboard-read', 'clipboard-write', 'notifications', 'geolocation'],
        
        # Network settings
        ignore_https_errors=False,
        
        # Timing configurations
        default_navigation_timeout=30000,
        default_timeout=30000,
        minimum_wait_page_load_time=0.25,
        wait_for_network_idle_page_load_time=0.5,
        maximum_wait_page_load_time=5.0,
        
        # Extra launch arguments for additional stealth
        args=[
            '--disable-blink-features=AutomationControlled',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-popup-blocking',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--password-store=basic',
            '--use-mock-keychain',
            '--enable-features=NetworkService,NetworkServiceInProcess',
            '--disable-features=IsolateOrigins,site-per-process',
            '--allow-running-insecure-content',
        ],
        
        # Optional proxy configuration (uncomment to use)
        # proxy={
        #     'server': 'http://proxy-server:8080',
        #     'username': 'user',
        #     'password': 'pass'
        # },
    )
    
    # Create browser session with the profile
    browser_session = BrowserSession(browser_profile=browser_profile)
    await browser_session.start()
    return browser_session

async def main():
    """Example usage of browser with anti-detection"""
    browser = await setup_browser()
    
    try:
        # Navigate to a test page
        await browser.navigate("https://www.google.com")
        
        # Take a screenshot
        screenshot = await browser.take_screenshot()
        print("Screenshot captured")
        
        # Get current page info
        state = await browser.get_state_summary(cache_clickable_elements_hashes=True)
        print(f"Current URL: {state.url}")
        print(f"Page title: {state.title}")
        
    finally:
        # Clean up
        await browser.stop()

if __name__ == "__main__":
    asyncio.run(main()) 