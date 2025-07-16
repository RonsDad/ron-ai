"""
Browser API endpoints for Nira
Provides REST API for enhanced browser management with Browserless integration
"""

from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import logging
import asyncio
import uuid
from datetime import datetime

# Import our enhanced browser manager
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from src.browser.enhanced_browser_manager import get_browser_manager, create_browser_agent
from src.browser.browserless_config import BrowserlessConfig

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/browser", tags=["browser"])

# Pydantic models for API
class BrowserSessionRequest(BaseModel):
    session_id: Optional[str] = None
    browser_mode: Optional[str] = None  # "local", "browserless", "hybrid"
    headless: bool = True
    user_data_dir: Optional[str] = None
    enable_recording: bool = False
    enable_live_url: bool = False
    enable_captcha_solving: bool = False

class AgentRequest(BaseModel):
    task: str
    llm_provider: str = "anthropic"
    model_name: str = "claude-3-5-sonnet-20241022"
    session_id: Optional[str] = None
    browser_mode: Optional[str] = None
    headless: bool = True
    max_steps: int = 50
    enable_recording: bool = False
    enable_live_url: bool = False

class BrowserModeRequest(BaseModel):
    mode: str  # "local", "browserless", "hybrid"

class BrowserlessConfigRequest(BaseModel):
    api_token: str
    endpoint: str = "wss://production-sfo.browserless.io/chromium"
    use_residential_proxy: bool = False
    enable_live_url: bool = False
    enable_captcha_solving: bool = False
    enable_recording: bool = False

class SessionResponse(BaseModel):
    session_id: str
    browser_mode: str
    status: str
    created_at: Optional[str] = None
    live_url: Optional[str] = None
    recording_active: bool = False
    features: Dict[str, bool] = {}

class AgentResponse(BaseModel):
    agent_id: str
    session_id: str
    task: str
    status: str
    browser_mode: str
    created_at: str
    live_url: Optional[str] = None

class StatsResponse(BaseModel):
    browser_mode: str
    local_sessions: int
    cloud_sessions: int
    active_agents: int
    total_sessions: int
    browserless_available: bool
    browserless_stats: Optional[Dict[str, Any]] = None


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    manager = get_browser_manager()
    return {
        "status": "healthy",
        "browser_mode": manager.get_browser_mode(),
        "browserless_available": manager.is_browserless_available(),
        "timestamp": datetime.now().isoformat()
    }


@router.get("/stats", response_model=StatsResponse)
async def get_browser_stats():
    """Get browser manager statistics"""
    try:
        manager = get_browser_manager()
        stats = manager.get_session_stats()
        return StatsResponse(**stats)
    except Exception as e:
        logger.error(f"Error getting browser stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mode")
async def get_browser_mode():
    """Get current browser mode"""
    manager = get_browser_manager()
    return {
        "browser_mode": manager.get_browser_mode(),
        "browserless_available": manager.is_browserless_available()
    }


@router.post("/mode")
async def set_browser_mode(request: BrowserModeRequest):
    """Set browser mode"""
    try:
        manager = get_browser_manager()
        manager.set_browser_mode(request.mode)
        return {
            "success": True,
            "browser_mode": request.mode,
            "message": f"Browser mode set to {request.mode}"
        }
    except Exception as e:
        logger.error(f"Error setting browser mode: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/session", response_model=SessionResponse)
async def create_browser_session(request: BrowserSessionRequest):
    """Create a new browser session"""
    try:
        manager = get_browser_manager()
        
        session = await manager.create_browser_session(
            session_id=request.session_id,
            browser_mode=request.browser_mode,
            headless=request.headless,
            user_data_dir=request.user_data_dir
        )
        
        # Get session info
        session_id = getattr(session, 'session_id', request.session_id or str(uuid.uuid4()))
        
        response_data = {
            "session_id": session_id,
            "browser_mode": request.browser_mode or manager.get_browser_mode(),
            "status": "active",
            "created_at": datetime.now().isoformat(),
            "recording_active": False,
            "features": {}
        }
        
        # Add enhanced features for Browserless sessions
        if hasattr(session, 'get_session_info'):
            session_info = session.get_session_info()
            response_data.update({
                "live_url": session_info.get('live_url'),
                "recording_active": session_info.get('recording_active', False),
                "features": session_info.get('features', {})
            })
        
        return SessionResponse(**response_data)
        
    except Exception as e:
        logger.error(f"Error creating browser session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/session/{session_id}")
async def get_browser_session(session_id: str):
    """Get browser session information"""
    try:
        manager = get_browser_manager()
        session = await manager.get_session(session_id)
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get session info
        if hasattr(session, 'get_session_info'):
            return session.get_session_info()
        else:
            return {
                "session_id": session_id,
                "type": "local",
                "status": "active"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting browser session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/session/{session_id}")
async def close_browser_session(session_id: str):
    """Close a browser session"""
    try:
        manager = get_browser_manager()
        await manager.close_session(session_id)
        return {
            "success": True,
            "message": f"Session {session_id} closed successfully"
        }
    except Exception as e:
        logger.error(f"Error closing browser session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions")
async def list_browser_sessions():
    """List all active browser sessions"""
    try:
        manager = get_browser_manager()
        sessions = manager.get_all_sessions()
        return {
            "sessions": sessions,
            "total": len(sessions)
        }
    except Exception as e:
        logger.error(f"Error listing browser sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/sessions")
async def close_all_sessions():
    """Close all active browser sessions"""
    try:
        manager = get_browser_manager()
        await manager.close_all_sessions()
        return {
            "success": True,
            "message": "All sessions closed successfully"
        }
    except Exception as e:
        logger.error(f"Error closing all sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/agent", response_model=AgentResponse)
async def create_browser_agent_endpoint(request: AgentRequest):
    """Create a browser agent with task"""
    try:
        agent = await create_browser_agent(
            task=request.task,
            llm_provider=request.llm_provider,
            model_name=request.model_name,
            browser_mode=request.browser_mode,
            headless=request.headless
        )
        
        # Get session ID from agent
        session_id = getattr(agent.browser_session, 'session_id', str(uuid.uuid4()))
        
        response_data = {
            "agent_id": str(uuid.uuid4()),  # Generate agent ID
            "session_id": session_id,
            "task": request.task,
            "status": "created",
            "browser_mode": request.browser_mode or get_browser_manager().get_browser_mode(),
            "created_at": datetime.now().isoformat()
        }
        
        # Add live URL if available
        if hasattr(agent.browser_session, 'live_url'):
            response_data["live_url"] = agent.browser_session.live_url
        
        return AgentResponse(**response_data)
        
    except Exception as e:
        logger.error(f"Error creating browser agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/session/{session_id}/live-url")
async def generate_live_url(session_id: str, timeout: int = Query(600000)):
    """Generate a live URL for a Browserless session"""
    try:
        manager = get_browser_manager()
        session = await manager.get_session(session_id)
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if not hasattr(session, 'generate_live_url'):
            raise HTTPException(status_code=400, detail="Live URL not supported for this session type")
        
        live_url = await session.generate_live_url(timeout=timeout)
        
        if not live_url:
            raise HTTPException(status_code=500, detail="Failed to generate live URL")
        
        return {
            "success": True,
            "live_url": live_url,
            "timeout": timeout,
            "expires_at": datetime.now().timestamp() + (timeout / 1000)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating live URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/session/{session_id}/recording/start")
async def start_recording(session_id: str):
    """Start recording for a Browserless session"""
    try:
        manager = get_browser_manager()
        session = await manager.get_session(session_id)
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if not hasattr(session, 'start_recording'):
            raise HTTPException(status_code=400, detail="Recording not supported for this session type")
        
        success = await session.start_recording()
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to start recording")
        
        return {
            "success": True,
            "message": "Recording started",
            "session_id": session_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting recording: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/session/{session_id}/recording/stop")
async def stop_recording(session_id: str):
    """Stop recording for a Browserless session"""
    try:
        manager = get_browser_manager()
        session = await manager.get_session(session_id)
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if not hasattr(session, 'stop_recording'):
            raise HTTPException(status_code=400, detail="Recording not supported for this session type")
        
        recording_data = await session.stop_recording()
        
        if recording_data:
            # Save recording to file
            recording_filename = f"recording_{session_id}_{int(datetime.now().timestamp())}.webm"
            recording_path = os.path.join("recordings", recording_filename)
            
            # Create recordings directory if it doesn't exist
            os.makedirs("recordings", exist_ok=True)
            
            with open(recording_path, "wb") as f:
                f.write(recording_data)
            
            return {
                "success": True,
                "message": "Recording stopped and saved",
                "session_id": session_id,
                "recording_path": recording_path,
                "recording_size": len(recording_data)
            }
        else:
            return {
                "success": False,
                "message": "No recording data available",
                "session_id": session_id
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error stopping recording: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/session/{session_id}/captcha/solve")
async def solve_captcha(session_id: str, timeout: int = Query(20000)):
    """Attempt to solve captcha for a Browserless session"""
    try:
        manager = get_browser_manager()
        session = await manager.get_session(session_id)
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if not hasattr(session, 'solve_captcha'):
            raise HTTPException(status_code=400, detail="Captcha solving not supported for this session type")
        
        result = await session.solve_captcha(appear_timeout=timeout)
        
        return {
            "success": result.get("solved", False),
            "error": result.get("error"),
            "session_id": session_id,
            "timeout": timeout
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error solving captcha: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/browserless/config")
async def configure_browserless(request: BrowserlessConfigRequest):
    """Configure Browserless settings (runtime configuration)"""
    try:
        # Update environment variables
        os.environ['BROWSERLESS_API_TOKEN'] = request.api_token
        os.environ['BROWSERLESS_ENDPOINT'] = request.endpoint
        os.environ['BROWSERLESS_USE_RESIDENTIAL_PROXY'] = str(request.use_residential_proxy).lower()
        os.environ['BROWSERLESS_ENABLE_LIVE_URL'] = str(request.enable_live_url).lower()
        os.environ['BROWSERLESS_ENABLE_CAPTCHA_SOLVING'] = str(request.enable_captcha_solving).lower()
        os.environ['BROWSERLESS_ENABLE_RECORDING'] = str(request.enable_recording).lower()
        os.environ['USE_BROWSERLESS'] = 'true'
        
        # Reinitialize browser manager
        manager = get_browser_manager()
        manager._initialize_browserless()
        
        return {
            "success": True,
            "message": "Browserless configuration updated",
            "browserless_available": manager.is_browserless_available()
        }
        
    except Exception as e:
        logger.error(f"Error configuring Browserless: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/browserless/test")
async def test_browserless_connection():
    """Test Browserless connection"""
    try:
        manager = get_browser_manager()
        
        if not manager.browserless_manager:
            return {
                "success": False,
                "message": "Browserless not configured"
            }
        
        # Test by checking availability
        available = manager.is_browserless_available()
        
        return {
            "success": available,
            "message": "Browserless connection test successful" if available else "Browserless connection test failed",
            "stats": manager.browserless_manager.get_stats() if available else None
        }
        
    except Exception as e:
        logger.error(f"Error testing Browserless connection: {e}")
        raise HTTPException(status_code=500, detail=str(e))
