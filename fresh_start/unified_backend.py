"""
Unified Backend for Browser Automation with Claude
A simplified, single-service approach
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import json
import uuid
import base64
from typing import Dict, Optional, Any
import anthropic
from browser_use import Agent, BrowserSession
from browser_use.browser import BrowserProfile
from browser_use.llm import ChatAnthropic
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Unified Browser Agent")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
active_sessions: Dict[str, Dict] = {}
websocket_connections: Dict[str, WebSocket] = {}

class AgentRequest(BaseModel):
    task: str
    use_browser: bool = True
    
class ControlToggleRequest(BaseModel):
    session_id: str
    human_control: bool
    additional_context: Optional[str] = None

class UnifiedAgent:
    """Simplified agent that combines Claude with browser automation"""
    
    def __init__(self, session_id: str, task: str):
        self.session_id = session_id
        self.task = task
        self.browser_session = None
        self.agent = None
        self.is_human_control = False
        self.anthropic_client = anthropic.Anthropic()
        
    async def initialize(self):
        """Initialize browser session and agent"""
        # Create browser session - visible by default
        profile = BrowserProfile(
            headless=False,
            viewport={'width': 1280, 'height': 800}
        )
        self.browser_session = BrowserSession(browser_profile=profile)
        
        # Initialize browser
        await self.browser_session.start()
        
        # Create agent with Claude
        self.agent = Agent(
            task=self.task,
            llm=ChatAnthropic(
                model="claude-3-5-sonnet-20241022",
                temperature=0.7,
                api_key=self.anthropic_client.api_key
            ),
            browser_session=self.browser_session,
            use_vision=True,
            max_actions_per_step=10
        )
        
        logger.info(f"[{self.session_id}] Agent initialized with task: {self.task}")
        
    async def run(self):
        """Run the agent with screenshot streaming"""
        try:
            # Callback for streaming updates
            async def on_step_callback(agent):
                await self.send_screenshot_update()
            
            # Run agent
            if self.agent:
                result = await self.agent.run(on_step_start=on_step_callback)
                return result
            else:
                raise Exception("Agent not initialized")
            
        except Exception as e:
            logger.error(f"[{self.session_id}] Agent error: {e}")
            raise
            
    async def send_screenshot_update(self):
        """Send screenshot to connected websocket"""
        try:
            if self.session_id not in websocket_connections:
                return
                
            if not self.browser_session:
                return
                
            page = await self.browser_session.get_current_page()
            if not page:
                return
                
            # Take screenshot
            screenshot_bytes = await page.screenshot()
            screenshot_b64 = base64.b64encode(screenshot_bytes).decode()
            
            # Get page info
            url = page.url
            title = await page.title()
            
            # Send update
            message = {
                "type": "browser_update",
                "session_id": self.session_id,
                "screenshot": screenshot_b64,
                "url": url,
                "title": title,
                "is_human_control": self.is_human_control,
                "timestamp": datetime.now().isoformat()
            }
            
            ws = websocket_connections.get(self.session_id)
            if ws:
                await ws.send_text(json.dumps(message))
                
        except Exception as e:
            logger.error(f"[{self.session_id}] Screenshot update error: {e}")
            
    async def toggle_control(self, human_control: bool, context: Optional[str] = None):
        """Toggle between human and AI control"""
        self.is_human_control = human_control
        
        if not human_control and context and self.agent:
            # Resume AI control with additional context
            self.task = f"{self.task}. Additional context: {context}"
            # Re-create agent with new task
            self.agent.task = self.task
            asyncio.create_task(self.run())
            
        await self.send_screenshot_update()
        
    async def cleanup(self):
        """Cleanup resources"""
        if self.browser_session:
            await self.browser_session.close()

@app.post("/api/start-agent")
async def start_agent(request: AgentRequest):
    """Start a new browser agent session"""
    session_id = str(uuid.uuid4())
    
    try:
        # Create agent
        agent = UnifiedAgent(session_id, request.task)
        await agent.initialize()
        
        # Store session
        active_sessions[session_id] = {
            "agent": agent,
            "task": request.task,
            "started_at": datetime.now().isoformat()
        }
        
        # Start agent task
        asyncio.create_task(agent.run())
        
        return {
            "session_id": session_id,
            "status": "started",
            "message": "Agent started successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to start agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/control-toggle")
async def toggle_control(request: ControlToggleRequest):
    """Toggle human/AI control"""
    if request.session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = active_sessions[request.session_id]
    agent = session["agent"]
    
    await agent.toggle_control(
        request.human_control, 
        request.additional_context
    )
    
    return {"status": "success", "human_control": request.human_control}

@app.post("/api/stop-agent/{session_id}")
async def stop_agent(session_id: str):
    """Stop an agent session"""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = active_sessions[session_id]
    agent = session["agent"]
    
    await agent.cleanup()
    del active_sessions[session_id]
    
    if session_id in websocket_connections:
        await websocket_connections[session_id].close()
        del websocket_connections[session_id]
        
    return {"status": "stopped"}

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket for real-time updates"""
    await websocket.accept()
    websocket_connections[session_id] = websocket
    
    try:
        # Send initial state if session exists
        if session_id in active_sessions:
            agent = active_sessions[session_id]["agent"]
            await agent.send_screenshot_update()
            
        # Keep connection alive
        while True:
            data = await websocket.receive_text()
            # Handle any incoming messages if needed
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    finally:
        if session_id in websocket_connections:
            del websocket_connections[session_id]

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "active_sessions": len(active_sessions)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 