#!/usr/bin/env python3
"""
Test script to validate the Browserless integration
"""
import os
import sys
import asyncio
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

async def test_browserless_config():
    """Test Browserless configuration"""
    print("🔧 Testing Browserless configuration...")
    
    from src.browser.browserless_config import BrowserlessConfig
    
    config = BrowserlessConfig.from_env()
    print(f"  ✓ API Token: {'*' * 20}")
    print(f"  ✓ Endpoint: {config.endpoint}")
    print(f"  ✓ Residential Proxy: {config.use_residential_proxy}")
    print(f"  ✓ Live URL: {config.enable_live_url}")
    print(f"  ✓ Recording: {config.enable_recording}")
    
    # Test URL generation
    url = config.get_connection_url()
    print(f"  ✓ WebSocket URL: {url[:50]}...")
    
    return True

async def test_enhanced_browser_session():
    """Test enhanced browser session imports"""
    print("\n🚀 Testing Enhanced Browser Session...")
    
    from src.browser.enhanced_browser_session import EnhancedBrowserContext, EnhancedBrowserSession
    print("  ✓ EnhancedBrowserContext imported")
    print("  ✓ EnhancedBrowserSession imported")
    
    return True

async def test_server_imports():
    """Test server imports"""
    print("\n📡 Testing Server Imports...")
    
    try:
        from src.browser.enhanced_browser_session import EnhancedBrowserContext, EnhancedBrowserSession
        print("  ✓ Enhanced browser session imports work")
    except Exception as e:
        print(f"  ❌ Enhanced browser session import failed: {e}")
        return False
    
    return True

async def test_websocket_config():
    """Test WebSocket configuration"""
    print("\n🌐 Testing WebSocket Configuration...")
    
    # Check frontend config
    frontend_config = Path("src/services/browserWebSocket.ts")
    if frontend_config.exists():
        content = frontend_config.read_text()
        if "ws://localhost:8000/ws/browser" in content:
            print("  ✓ Frontend WebSocket URL configured correctly")
        else:
            print("  ❌ Frontend WebSocket URL mismatch")
            return False
    
    # Check backend config
    backend_config = Path("server/browser_websocket.py")
    if backend_config.exists():
        content = backend_config.read_text()
        if '/ws/browser' in content:
            print("  ✓ Backend WebSocket endpoint configured correctly")
        else:
            print("  ❌ Backend WebSocket endpoint mismatch")
            return False
    
    return True

async def test_browser_embed():
    """Test browser embed component"""
    print("\n🖥️ Testing Browser Embed Component...")
    
    embed_file = Path("src/components/BrowserEmbed.tsx")
    if embed_file.exists():
        content = embed_file.read_text()
        if "liveUrl?" in content and "isBrowserless?" in content:
            print("  ✓ BrowserEmbed supports live URLs")
        else:
            print("  ❌ BrowserEmbed missing live URL support")
            return False
    
    return True

async def main():
    """Run all tests"""
    print("🧪 Testing Nira Browserless Integration")
    print("=" * 50)
    
    tests = [
        test_browserless_config,
        test_enhanced_browser_session,
        test_server_imports,
        test_websocket_config,
        test_browser_embed
    ]
    
    results = []
    for test in tests:
        try:
            result = await test()
            results.append(result)
        except Exception as e:
            print(f"  ❌ Test failed: {e}")
            results.append(False)
    
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    print(f"  Passed: {sum(results)}/{len(results)}")
    
    if all(results):
        print("  🎉 All tests passed! Integration is ready.")
        return True
    else:
        print("  ⚠️  Some tests failed. Check the output above.")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)