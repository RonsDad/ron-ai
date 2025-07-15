#!/usr/bin/env python3
"""
Simple script to run the unified backend
"""

import os
import sys
import subprocess

def main():
    print("🚀 Starting Unified Browser Agent")
    print("================================")
    
    # Check for required environment variables
    if not os.getenv("ANTHROPIC_API_KEY"):
        print("❌ Error: ANTHROPIC_API_KEY environment variable not set")
        print("Please set it with: export ANTHROPIC_API_KEY='your-api-key'")
        sys.exit(1)
    
    # Install required packages if not already installed
    try:
        import browser_use
        print("✅ browser-use is installed")
    except ImportError:
        print("📦 Installing browser-use...")
        subprocess.run([sys.executable, "-m", "pip", "install", "browser-use"], check=True)
    
    try:
        import anthropic
        print("✅ anthropic is installed")
    except ImportError:
        print("📦 Installing anthropic...")
        subprocess.run([sys.executable, "-m", "pip", "install", "anthropic"], check=True)
    
    try:
        import fastapi
        import uvicorn
        print("✅ fastapi and uvicorn are installed")
    except ImportError:
        print("📦 Installing fastapi and uvicorn...")
        subprocess.run([sys.executable, "-m", "pip", "install", "fastapi", "uvicorn"], check=True)
    
    # Check if playwright browsers are installed
    try:
        import playwright
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            try:
                browser = p.chromium.launch(headless=True)
                browser.close()
                print("✅ Playwright browsers are installed")
            except Exception:
                print("🌐 Installing Playwright browsers...")
                subprocess.run([sys.executable, "-m", "playwright", "install", "chromium", "--with-deps"], check=True)
    except ImportError:
        print("📦 Installing playwright...")
        subprocess.run([sys.executable, "-m", "pip", "install", "playwright"], check=True)
        subprocess.run([sys.executable, "-m", "playwright", "install", "chromium", "--with-deps"], check=True)
    
    # Start the unified backend
    print("\n✅ Starting backend on port 8000...")
    print("   Access the API at: http://localhost:8000")
    print("   API docs at: http://localhost:8000/docs")
    print("\n   Press Ctrl+C to stop")
    
    # Import and run the backend
    try:
        from unified_backend import app
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=8000)
    except ImportError:
        print("❌ Error: Could not import unified_backend.py")
        print("Make sure you're running this from the fresh_start directory")

if __name__ == "__main__":
    main() 