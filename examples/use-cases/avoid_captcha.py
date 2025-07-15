"""
Example: Avoiding CAPTCHAs with Stealth Mode and Alternative Search Engines

This example demonstrates how to:
1. Use stealth mode to reduce CAPTCHA encounters
2. Use alternative search engines that have fewer CAPTCHAs
3. Handle CAPTCHAs when they do appear
"""

import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from browser_use import Agent
from browser_use.browser import BrowserProfile, BrowserSession
from browser_use.llm import ChatGoogle

# Use environment variables for API keys
from dotenv import load_dotenv
load_dotenv()


async def main():
    # Configure browser with stealth mode
    browser_profile = BrowserProfile(
        # ENABLE STEALTH MODE - This is key to avoiding CAPTCHAs
        stealth=True,
        headless=False,  # Use headful mode for better anti-detection
        # Use a persistent profile to maintain cookies/session
        user_data_dir='~/.browseruse/profiles/stealth_search',
        # Realistic user agent
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        # Additional anti-detection arguments
        args=[
            '--disable-blink-features=AutomationControlled',
            '--exclude-switches=enable-automation',
            '--disable-dev-shm-usage',
        ]
    )
    
    browser_session = BrowserSession(browser_profile=browser_profile)
    await browser_session.start()
    
    # Configure LLM
    llm = ChatGoogle(
        model="gemini-2.5-pro",
        api_key=os.getenv("GOOGLE_API_KEY")
    )
    
    # Example 1: Use DuckDuckGo instead of Google
    print("\n=== Example 1: Using DuckDuckGo (No CAPTCHAs) ===")
    agent = Agent(
        task="Go to duckduckgo.com and search for 'OpenAI GPT-4' - take a screenshot of the results",
        llm=llm,
        browser_session=browser_session,
        use_vision=True,
    )
    await agent.run()
    
    # Example 2: Use Bing as alternative
    print("\n=== Example 2: Using Bing (Fewer CAPTCHAs) ===")
    agent = Agent(
        task="Go to bing.com and search for 'machine learning tutorials' - take a screenshot",
        llm=llm,
        browser_session=browser_session,
        use_vision=True,
    )
    await agent.run()
    
    # Example 3: If you must use Google, add delays and human-like behavior
    print("\n=== Example 3: Google with Human-like Behavior ===")
    agent = Agent(
        task="""
        1. Go to google.com
        2. Wait 2 seconds (simulate human reading time)
        3. Click on the search box
        4. Type 'Python programming' slowly (simulate human typing)
        5. Wait 1 second
        6. Press Enter
        7. Take a screenshot of results
        
        If you encounter a CAPTCHA, stop and notify that human intervention is needed.
        """,
        llm=llm,
        browser_session=browser_session,
        use_vision=True,
        # Extended system message for CAPTCHA handling
        extend_system_message="""
        When navigating websites:
        - Move mouse naturally, not in straight lines
        - Add small delays between actions (1-3 seconds)
        - Type at human speed, not instantly
        - If you see a CAPTCHA, stop and report it rather than trying to solve it
        """
    )
    await agent.run()
    
    # Example 4: Using a specialized search engine
    print("\n=== Example 4: Using Searx (Privacy-focused, No CAPTCHAs) ===")
    agent = Agent(
        task="Go to searx.me and search for 'browser automation' - take a screenshot",
        llm=llm,
        browser_session=browser_session,
        use_vision=True,
    )
    await agent.run()
    
    print("\n=== Tips for Avoiding CAPTCHAs ===")
    print("1. Always use stealth=True in BrowserProfile")
    print("2. Use persistent user_data_dir to maintain cookies")
    print("3. Prefer DuckDuckGo, Bing, or Searx over Google")
    print("4. Add human-like delays between actions")
    print("5. Use headless=False for better anti-detection")
    print("6. Rotate between different search engines")
    print("7. If CAPTCHAs appear, consider using the 'Take Control' feature in the UI")
    
    input("\nPress Enter to close the browser...")
    await browser_session.close()


if __name__ == "__main__":
    asyncio.run(main()) 