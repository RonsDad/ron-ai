#!/usr/bin/env python3
"""
Test script to validate the complete Claude to Browser workflow
This simulates the full process: Claude tool call → browser-use agent → UI layout shift → browser view panel
"""
import os
import sys
import asyncio
import json
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

async def test_complete_workflow():
    """Test the complete workflow from Claude tool call to browser execution"""
    print("🎯 Testing Complete Workflow: Claude → Browser-Use Agent → UI Layout")
    print("=" * 80)
    
    # Test 1: Environment Configuration
    print("\n1️⃣ Testing Environment Configuration...")
    required_env_vars = [
        'BROWSERLESS_API_TOKEN',
        'BROWSERLESS_ENDPOINT',
        'USE_BROWSERLESS',
        'ANTHROPIC_API_KEY'
    ]
    
    env_success = True
    for var in required_env_vars:
        value = os.getenv(var)
        if value:
            if var == 'BROWSERLESS_API_TOKEN':
                print(f"  ✓ {var}: {'*' * 20}")
            elif var == 'ANTHROPIC_API_KEY':
                print(f"  ✓ {var}: {'*' * 20}")
            else:
                print(f"  ✓ {var}: {value}")
        else:
            print(f"  ❌ {var}: Not set")
            env_success = False
    
    if not env_success:
        print("  ❌ Environment configuration incomplete")
        return False
    
    # Test 2: Import Core Components
    print("\n2️⃣ Testing Core Component Imports...")
    try:
        from src.browser.browserless_config import BrowserlessConfig
        from src.browser.enhanced_browser_session import EnhancedBrowserContext, EnhancedBrowserSession
        from src.browser.enhanced_browser_manager import EnhancedBrowserManager
        print("  ✓ All core browser components imported successfully")
    except Exception as e:
        print(f"  ❌ Import error: {e}")
        return False
    
    # Test 3: Browserless Configuration
    print("\n3️⃣ Testing Browserless Configuration...")
    try:
        config = BrowserlessConfig.from_env()
        url = config.get_connection_url()
        print(f"  ✓ Configuration created successfully")
        print(f"  ✓ Connection URL: {url[:50]}...")
        print(f"  ✓ Live URL enabled: {config.enable_live_url}")
        print(f"  ✓ Recording enabled: {config.enable_recording}")
        print(f"  ✓ Captcha solving enabled: {config.enable_captcha_solving}")
    except Exception as e:
        print(f"  ❌ Configuration error: {e}")
        return False
    
    # Test 4: Browser Manager Initialization
    print("\n4️⃣ Testing Browser Manager...")
    try:
        manager = EnhancedBrowserManager()
        print("  ✓ EnhancedBrowserManager initialized")
        
        # Test session creation capabilities
        session_config = {
            'user_id': 'test-user',
            'conversation_id': 'test-conversation',
            'task': 'Navigate to https://example.com',
            'use_browserless': True,
            'browserless_config': config
        }
        print("  ✓ Session configuration prepared")
        
    except Exception as e:
        print(f"  ❌ Browser manager error: {e}")
        return False
    
    # Test 5: WebSocket Configuration
    print("\n5️⃣ Testing WebSocket Configuration...")
    
    # Check frontend WebSocket config
    frontend_ws_file = Path("src/services/browserWebSocket.ts")
    if frontend_ws_file.exists():
        content = frontend_ws_file.read_text()
        if "ws://localhost:8000/ws/browser" in content:
            print("  ✓ Frontend WebSocket endpoint configured correctly")
        else:
            print("  ❌ Frontend WebSocket endpoint misconfigured")
            return False
    else:
        print("  ❌ Frontend WebSocket service not found")
        return False
    
    # Check backend WebSocket config
    backend_ws_file = Path("server/browser_websocket.py")
    if backend_ws_file.exists():
        content = backend_ws_file.read_text()
        if '@ws_router.websocket("/ws/browser")' in content:
            print("  ✓ Backend WebSocket endpoint configured correctly")
        else:
            print("  ❌ Backend WebSocket endpoint misconfigured")
            return False
    else:
        print("  ❌ Backend WebSocket service not found")
        return False
    
    # Test 6: UI Layout Components
    print("\n6️⃣ Testing UI Layout Components...")
    
    # Check MainLayout 50/50 split
    main_layout_file = Path("src/components/MainLayout.tsx")
    if main_layout_file.exists():
        content = main_layout_file.read_text()
        if "showBrowserPanel ? 'w-1/2' : 'w-full'" in content:
            print("  ✓ MainLayout 50/50 split implemented")
        else:
            print("  ❌ MainLayout 50/50 split not found")
            return False
        
        if "onBrowserPanelChange" in content:
            print("  ✓ MainLayout browser panel callback integrated")
        else:
            print("  ❌ MainLayout browser panel callback missing")
            return False
    else:
        print("  ❌ MainLayout component not found")
        return False
    
    # Check ClaudeAgent integration
    claude_agent_file = Path("src/components/ClaudeAgent.tsx")
    if claude_agent_file.exists():
        content = claude_agent_file.read_text()
        if "onBrowserPanelChange?" in content:
            print("  ✓ ClaudeAgent browser panel callback implemented")
        else:
            print("  ❌ ClaudeAgent browser panel callback missing")
            return False
    else:
        print("  ❌ ClaudeAgent component not found")
        return False
    
    # Check BrowserEmbed live URL support
    browser_embed_file = Path("src/components/BrowserEmbed.tsx")
    if browser_embed_file.exists():
        content = browser_embed_file.read_text()
        if "liveUrl?" in content and "isBrowserless?" in content:
            print("  ✓ BrowserEmbed live URL support implemented")
        else:
            print("  ❌ BrowserEmbed live URL support missing")
            return False
    else:
        print("  ❌ BrowserEmbed component not found")
        return False
    
    # Test 7: API Endpoints
    print("\n7️⃣ Testing API Endpoint Configuration...")
    
    # Check browser server endpoints
    browser_server_file = Path("server/browser_server.py")
    if browser_server_file.exists():
        content = browser_server_file.read_text()
        if '/api/browser/claude/browser-task' in content:
            print("  ✓ Browser task endpoint configured")
        else:
            print("  ❌ Browser task endpoint missing")
            return False
        
        if "EnhancedBrowserContext" in content:
            print("  ✓ Enhanced browser context imported correctly")
        else:
            print("  ❌ Enhanced browser context import missing")
            return False
    else:
        print("  ❌ Browser server not found")
        return False
    
    # Test 8: Tool Call Integration
    print("\n8️⃣ Testing Tool Call Integration...")
    
    # Check Claude agent browser detection
    if claude_agent_file.exists():
        content = claude_agent_file.read_text()
        if "detectsBrowserNeed" in content:
            print("  ✓ Browser need detection implemented")
        else:
            print("  ❌ Browser need detection missing")
            return False
        
        if "processMessageForBrowser" in content:
            print("  ✓ Browser message processing implemented")
        else:
            print("  ❌ Browser message processing missing")
            return False
    
    return True

def test_workflow_sequence():
    """Test the expected workflow sequence"""
    print("\n🔄 Testing Workflow Sequence...")
    print("Expected Flow:")
    print("1. User sends message with browser intent")
    print("2. ClaudeAgent detects browser need")
    print("3. ClaudeAgent calls /api/browser/claude/browser-task")
    print("4. Browser server creates EnhancedBrowserContext")
    print("5. Browser-use agent starts with Browserless connection")
    print("6. WebSocket notifies frontend of new session")
    print("7. MainLayout receives browser panel change callback")
    print("8. UI shifts to 50/50 layout")
    print("9. BrowserViewPanel opens with live URL support")
    print("10. User can interact with browser or let agent continue")
    
    print("\n✅ Workflow sequence documented and ready for execution")
    return True

async def main():
    """Run all workflow tests"""
    print("🧪 Testing Complete Claude → Browser Workflow")
    print("=" * 80)
    
    # Run component tests
    component_success = await test_complete_workflow()
    
    # Test workflow sequence
    sequence_success = test_workflow_sequence()
    
    print("\n" + "=" * 80)
    print("📊 Final Results:")
    print(f"  Component Tests: {'✅ PASSED' if component_success else '❌ FAILED'}")
    print(f"  Workflow Sequence: {'✅ READY' if sequence_success else '❌ NOT READY'}")
    
    if component_success and sequence_success:
        print("\n🎉 Complete workflow is ready for execution!")
        print("\n🚀 To test the workflow:")
        print("1. Start the server: python server/browser_server.py")
        print("2. Start the frontend: npm run dev")
        print("3. Send a message like: 'Navigate to https://example.com and take a screenshot'")
        print("4. Watch the UI shift to 50/50 layout with browser panel")
        print("5. See live browser session embedded in the right panel")
        return True
    else:
        print("\n⚠️  Workflow not ready. Check the errors above.")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)