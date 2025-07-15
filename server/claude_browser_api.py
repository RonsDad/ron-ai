"""
Claude Browser API endpoints
Handles integration between Claude conversations and browser automation
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import logging
import sys
import os

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from src.browser.claude_browser_integration import get_claude_browser_integration
from src.browser.claude_agent_wrapper import create_claude_agent_wrapper

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/browser/claude", tags=["claude-browser"])

# Pydantic models
class BrowserTaskRequest(BaseModel):
    conversation_id: str
    task: str
    user_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    llm_config: Optional[Dict[str, Any]] = None
    browser_config: Optional[Dict[str, Any]] = None

class HumanControlRequest(BaseModel):
    session_id: str
    action_type: str  # 'guidance' or 'takeover'
    message: str
    user_id: Optional[str] = None

class ResumeControlRequest(BaseModel):
    session_id: str
    human_actions_summary: str
    user_id: Optional[str] = None

class CleanupRequest(BaseModel):
    conversation_id: str
    user_id: Optional[str] = None

class BrowserTaskResponse(BaseModel):
    success: bool
    session_id: Optional[str] = None
    task: Optional[str] = None
    conversation_id: str
    sessions: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None
    message: Optional[str] = None

class ControlResponse(BaseModel):
    success: bool
    action: str
    message: str
    error: Optional[str] = None

# Global integration instance
integration = get_claude_browser_integration()


@router.post("/browser-task", response_model=BrowserTaskResponse)
async def create_browser_task(request: BrowserTaskRequest):
    """
    Create a browser task for a Claude conversation
    This endpoint is called when Claude needs to perform browser automation
    """
    try:
        logger.info(f"Creating browser task for conversation {request.conversation_id}: {request.task[:100]}...")
        
        # Execute browser task through integration
        result = await integration.execute_browser_task(
            conversation_id=request.conversation_id,
            task=request.task,
            user_id=request.user_id,
            llm_config=request.llm_config,
            browser_config=request.browser_config
        )
        
        if result['success']:
            # Get session information
            sessions = await integration.get_conversation_sessions(request.conversation_id)
            
            return BrowserTaskResponse(
                success=True,
                session_id=result['session_id'],
                task=request.task,
                conversation_id=request.conversation_id,
                sessions=sessions,
                message="Browser task created successfully"
            )
        else:
            return BrowserTaskResponse(
                success=False,
                conversation_id=request.conversation_id,
                error=result['error'],
                message=f"Failed to create browser task: {result['error']}"
            )
            
    except Exception as e:
        logger.error(f"Error creating browser task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/human-control", response_model=ControlResponse)
async def handle_human_control(request: HumanControlRequest):
    """
    Handle human control requests from the UI
    Called when user wants to provide guidance or take control
    """
    try:
        logger.info(f"Human control request for session {request.session_id}: {request.action_type}")
        
        result = await integration.handle_human_control_request(
            session_id=request.session_id,
            action_type=request.action_type,
            message=request.message,
            user_id=request.user_id
        )
        
        if result['success']:
            return ControlResponse(
                success=True,
                action=result['action'],
                message=result['message']
            )
        else:
            return ControlResponse(
                success=False,
                action='error',
                message=result['error'],
                error=result['error']
            )
            
    except Exception as e:
        logger.error(f"Error handling human control: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/resume-control", response_model=ControlResponse)
async def resume_agent_control(request: ResumeControlRequest):
    """
    Resume agent control after human intervention
    Called when user returns control to the AI agent
    """
    try:
        logger.info(f"Resuming agent control for session {request.session_id}")
        
        result = await integration.resume_agent_control(
            session_id=request.session_id,
            human_actions_summary=request.human_actions_summary,
            user_id=request.user_id
        )
        
        if result['success']:
            return ControlResponse(
                success=True,
                action=result['action'],
                message=result['message']
            )
        else:
            return ControlResponse(
                success=False,
                action='error',
                message=result['error'],
                error=result['error']
            )
            
    except Exception as e:
        logger.error(f"Error resuming agent control: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{conversation_id}")
async def get_conversation_sessions(conversation_id: str):
    """Get all browser sessions for a conversation"""
    try:
        sessions = await integration.get_conversation_sessions(conversation_id)
        return {
            "conversation_id": conversation_id,
            "sessions": sessions,
            "total": len(sessions)
        }
    except Exception as e:
        logger.error(f"Error getting conversation sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cleanup")
async def cleanup_conversation(request: CleanupRequest):
    """Clean up browser sessions for a conversation"""
    try:
        await integration.cleanup_conversation(request.conversation_id)
        return {
            "success": True,
            "message": f"Cleaned up conversation {request.conversation_id}"
        }
    except Exception as e:
        logger.error(f"Error cleaning up conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/detect-browser-need")
async def detect_browser_need(message: str):
    """
    Detect if a message requires browser automation
    Utility endpoint for testing detection logic
    """
    try:
        browser_keywords = [
            'navigate to', 'go to', 'visit', 'open website', 'browse to',
            'fill out', 'click on', 'search for', 'find on website',
            'submit form', 'login to', 'sign in to', 'download from',
            'screenshot of', 'scrape', 'extract from website',
            'automate', 'browser', 'website', 'web page', 'url'
        ]
        
        message_lower = message.lower()
        detected_keywords = [kw for kw in browser_keywords if kw in message_lower]
        
        # Check for URLs
        import re
        urls = re.findall(r'https?://[^\s]+', message)
        
        # Check for web patterns
        web_patterns = re.findall(r'\.(com|org|net|edu|gov|io|co)\b', message_lower)
        
        requires_browser = bool(detected_keywords or urls or web_patterns)
        
        return {
            "message": message,
            "requires_browser": requires_browser,
            "detected_keywords": detected_keywords,
            "detected_urls": urls,
            "detected_web_patterns": web_patterns,
            "confidence": len(detected_keywords) + len(urls) + len(web_patterns)
        }
        
    except Exception as e:
        logger.error(f"Error detecting browser need: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/integration-status")
async def get_integration_status():
    """Get status of Claude browser integration"""
    try:
        # Get basic stats
        from src.browser.enhanced_browser_manager import get_browser_manager
        browser_manager = get_browser_manager()
        
        stats = browser_manager.get_session_stats()
        
        return {
            "integration_active": True,
            "browser_manager_available": True,
            "websocket_available": integration.ws_manager is not None,
            "active_conversations": len(integration.conversation_sessions),
            "active_agents": len(integration.active_agents),
            "browser_stats": stats,
            "conversation_sessions": list(integration.conversation_sessions.keys())
        }
        
    except Exception as e:
        logger.error(f"Error getting integration status: {e}")
        raise HTTPException(status_code=500, detail=str(e))
