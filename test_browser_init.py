"""
Test script to verify browser initialization fixes
"""
import os
import asyncio
import sys
sys.path.append('server')
sys.path.append('src')

from dotenv import load_dotenv
from browser_use import Agent
from browser_use.browser import BrowserProfile, BrowserSession
from browser_session import ExtendedBrowserSession

load_dotenv()

async def test_browser_init():
    """Test the browser initialization process"""
    print("Testing browser initialization...")
    
    try:
        # Create BrowserQL connection URL with correct endpoint
        browserless_url = f"wss://production-sfo.browserless.io/chromium/bql?token={os.getenv('BROWSERLESS_API_TOKEN')}"
        print(f"Using browserless URL: {browserless_url[:50]}...")
        
        # Create browser profile for browserless
        browser_profile = BrowserProfile(
            cdp_url=browserless_url,
            headless=True,
        )
        print(f"Browser profile created successfully: {type(browser_profile)}")
        
        # Create browser session directly
        browser_session = BrowserSession(browser_profile=browser_profile)
        print(f"Browser session created successfully: {type(browser_session)}")
        
        # Start the session
        await browser_session.start()
        print("Browser session started")
        print(f"Browser session created: {type(browser_session)}")
        
        # Test current page access
        current_page = await browser_session.get_current_page()
        print(f"Current page: {current_page}")
        
        if current_page:
            print(f"Page URL: {current_page.url}")
            
            # Test CDP session creation
            try:
                cdp_session = await current_page.new_cdp_session()
                print("CDP session created successfully")
                
                # Test Live URL generation
                response = await cdp_session.send('Browserless.liveURL', {
                    "timeout": 600000  # 10 minutes
                })
                live_url = response.get("liveURL")
                print(f"Live URL generated: {live_url}")
                
                await cdp_session.detach()
                
            except Exception as e:
                print(f"CDP/Live URL error: {e}")
        
        # Clean up
        await browser_session.close()
        print("Browser session closed successfully")
        
        return True
        
    except Exception as e:
        print(f"Browser initialization failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_browser_init())
    if success:
        print("\n✅ Browser initialization test PASSED")
    else:
        print("\n❌ Browser initialization test FAILED")