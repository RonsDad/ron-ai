"""
Simple test script to demonstrate the unified backend
"""

import asyncio
import httpx
import json

async def test_browser_agent():
    """Test the unified browser agent"""
    print("🚀 Testing Unified Browser Agent")
    print("================================")
    
    # Start an agent
    print("\n1. Starting browser agent...")
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/api/start-agent",
            json={
                "task": "Navigate to google.com and search for 'Python tutorials'"
            }
        )
        
        if response.status_code != 200:
            print(f"❌ Failed to start agent: {response.status_code}")
            print(response.text)
            return
            
        data = response.json()
        session_id = data["session_id"]
        print(f"✅ Agent started with session ID: {session_id}")
        
        # Wait a bit for the browser to open
        print("\n2. Waiting for browser to initialize...")
        await asyncio.sleep(3)
        
        # Test control toggle
        print("\n3. Testing human control toggle...")
        response = await client.post(
            "http://localhost:8000/api/control-toggle",
            json={
                "session_id": session_id,
                "human_control": True
            }
        )
        
        if response.status_code == 200:
            print("✅ Switched to human control")
            print("   You can now control the browser manually!")
            print("   Press Enter to switch back to AI control...")
            input()
            
            # Switch back to AI control
            response = await client.post(
                "http://localhost:8000/api/control-toggle",
                json={
                    "session_id": session_id,
                    "human_control": False,
                    "additional_context": "Continue searching for Python tutorials and take a screenshot"
                }
            )
            
            if response.status_code == 200:
                print("✅ Switched back to AI control")
        
        # Wait for AI to complete
        print("\n4. Waiting for AI to complete task...")
        await asyncio.sleep(10)
        
        # Stop the agent
        print("\n5. Stopping agent...")
        response = await client.post(
            f"http://localhost:8000/api/stop-agent/{session_id}"
        )
        
        if response.status_code == 200:
            print("✅ Agent stopped successfully")
        
        print("\n✨ Test completed!")

if __name__ == "__main__":
    # Check if the backend is running
    print("Checking if backend is running...")
    try:
        response = httpx.get("http://localhost:8000/health")
        if response.status_code == 200:
            print("✅ Backend is running")
            asyncio.run(test_browser_agent())
        else:
            print("❌ Backend returned unexpected status:", response.status_code)
    except httpx.ConnectError:
        print("❌ Backend is not running!")
        print("Please start it with: cd fresh_start && ./start.sh") 