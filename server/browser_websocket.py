"""
Enhanced WebSocket server for real-time multi-channel communication
Handles browser session updates, control transitions, MCP events, voice events, and live data streaming
"""

import asyncio
import json
import logging
from typing import Dict, Set, Any, Optional, List, Union
from datetime import datetime
import uuid
from enum import Enum

from fastapi import WebSocket, WebSocketDisconnect
from fastapi.routing import APIRouter
import sys
import os

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from src.browser.enhanced_browser_manager import get_browser_manager

logger = logging.getLogger(__name__)

# WebSocket router
ws_router = APIRouter()

class EventType(Enum):
    """Event types for multi-channel communication"""
    BROWSER = "browser"
    MCP = "mcp"
    VOICE = "voice"
    CONTROL = "control"
    SESSION = "session"
    SYSTEM = "system"

class ChannelType(Enum):
    """Channel types for subscription management"""
    BROWSER_SESSIONS = "browser_sessions"
    SESSION = "session"
    MCP_TOOLS = "mcp_tools"
    MCP_TOOL = "mcp_tool"
    VOICE_SESSIONS = "voice_sessions"
    VOICE_SESSION = "voice_session"
    CONTROL_EVENTS = "control_events"
    SYSTEM_EVENTS = "system_events"

class BrowserWebSocketManager:
    """Manages WebSocket connections for browser sessions"""
    
    def __init__(self):
        self.connections: Dict[str, WebSocket] = {}  # connection_id -> websocket
        self.session_subscribers: Dict[str, Set[str]] = {}  # session_id -> set of connection_ids
        self.browser_subscribers: Set[str] = set()  # connection_ids subscribed to all browser updates
        self.browser_manager = get_browser_manager()
        
        # Start background tasks
        self._screenshot_task = None
        self._session_monitor_task = None
    
    async def connect(self, websocket: WebSocket) -> str:
        """Accept a new WebSocket connection"""
        await websocket.accept()
        connection_id = str(uuid.uuid4())
        self.connections[connection_id] = websocket
        
        logger.info(f"WebSocket connected: {connection_id}")
        
        # Send initial connection confirmation
        await self.send_to_connection(connection_id, {
            "type": "connection",
            "status": "connected",
            "connection_id": connection_id,
            "timestamp": datetime.now().isoformat()
        })
        
        # Start background tasks if this is the first connection
        if len(self.connections) == 1:
            await self._start_background_tasks()
        
        return connection_id
    
    async def disconnect(self, connection_id: str):
        """Handle WebSocket disconnection"""
        if connection_id in self.connections:
            del self.connections[connection_id]
            
            # Remove from all subscriptions
            self.browser_subscribers.discard(connection_id)
            for session_id in list(self.session_subscribers.keys()):
                self.session_subscribers[session_id].discard(connection_id)
                if not self.session_subscribers[session_id]:
                    del self.session_subscribers[session_id]
            
            logger.info(f"WebSocket disconnected: {connection_id}")
            
            # Stop background tasks if no connections remain
            if not self.connections:
                await self._stop_background_tasks()
    
    async def handle_message(self, connection_id: str, message: dict):
        """Handle incoming WebSocket message"""
        try:
            message_type = message.get("type")
            
            if message_type == "subscribe":
                await self._handle_subscribe(connection_id, message)
            elif message_type == "unsubscribe":
                await self._handle_unsubscribe(connection_id, message)
            elif message_type == "control_transition":
                await self._handle_control_transition(connection_id, message)
            elif message_type == "user_feedback":
                await self._handle_user_feedback(connection_id, message)
            elif message_type == "request_screenshot":
                await self._handle_screenshot_request(connection_id, message)
            else:
                logger.warning(f"Unknown message type: {message_type}")
                
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {e}")
            await self.send_to_connection(connection_id, {
                "type": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
    
    async def _handle_subscribe(self, connection_id: str, message: dict):
        """Handle subscription requests"""
        channel = message.get("channel")
        
        if channel == "browser_sessions":
            self.browser_subscribers.add(connection_id)
            # Send current sessions immediately
            await self._send_session_update(connection_id)
            
        elif channel == "session":
            session_id = message.get("session_id")
            if session_id:
                if session_id not in self.session_subscribers:
                    self.session_subscribers[session_id] = set()
                self.session_subscribers[session_id].add(connection_id)
                
                # Send current session state immediately
                await self._send_session_state(connection_id, session_id)
    
    async def _handle_unsubscribe(self, connection_id: str, message: dict):
        """Handle unsubscription requests"""
        channel = message.get("channel")
        
        if channel == "browser_sessions":
            self.browser_subscribers.discard(connection_id)
            
        elif channel == "session":
            session_id = message.get("session_id")
            if session_id and session_id in self.session_subscribers:
                self.session_subscribers[session_id].discard(connection_id)
                if not self.session_subscribers[session_id]:
                    del self.session_subscribers[session_id]
    
    async def _handle_control_transition(self, connection_id: str, message: dict):
        """Handle control transition requests"""
        session_id = message.get("session_id")
        take_control = message.get("take_control", False)
        user_message = message.get("message", "")
        action_type = message.get("action_type", "handoff")
        
        if not session_id:
            await self.send_to_connection(connection_id, {
                "type": "error",
                "error": "session_id is required",
                "timestamp": datetime.now().isoformat()
            })
            return
        
        try:
            # Get the session
            session = await self.browser_manager.get_session(session_id)
            if not session:
                await self.send_to_connection(connection_id, {
                    "type": "error",
                    "error": f"Session {session_id} not found",
                    "timestamp": datetime.now().isoformat()
                })
                return
            
            # Update session control state
            # This would integrate with your existing control logic
            # For now, we'll simulate the state change
            
            # Broadcast control change to all session subscribers
            await self._broadcast_to_session(session_id, {
                "type": "control_change",
                "session_id": session_id,
                "user_control": take_control,
                "message": user_message,
                "action_type": action_type,
                "timestamp": datetime.now().isoformat()
            })
            
            # Send confirmation to requester
            await self.send_to_connection(connection_id, {
                "type": "control_transition_complete",
                "session_id": session_id,
                "success": True,
                "user_control": take_control,
                "timestamp": datetime.now().isoformat()
            })
            
            logger.info(f"Control transition: session {session_id}, take_control={take_control}")
            
        except Exception as e:
            logger.error(f"Error in control transition: {e}")
            await self.send_to_connection(connection_id, {
                "type": "error",
                "error": f"Control transition failed: {str(e)}",
                "timestamp": datetime.now().isoformat()
            })
    
    async def _handle_user_feedback(self, connection_id: str, message: dict):
        """Handle user feedback messages"""
        session_id = message.get("session_id")
        user_message = message.get("message", "")
        action_type = message.get("action_type", "guidance")
        
        if not session_id:
            return
        
        # Broadcast feedback to session subscribers
        await self._broadcast_to_session(session_id, {
            "type": "user_feedback",
            "session_id": session_id,
            "message": user_message,
            "action_type": action_type,
            "timestamp": datetime.now().isoformat()
        })
        
        logger.info(f"User feedback for session {session_id}: {action_type} - {user_message[:100]}...")
    
    async def _handle_screenshot_request(self, connection_id: str, message: dict):
        """Handle screenshot requests"""
        session_id = message.get("session_id")
        
        if not session_id:
            return
        
        try:
            # Get fresh screenshot
            session = await self.browser_manager.get_session(session_id)
            if session and hasattr(session, 'current_page'):
                screenshot = await session.current_page.screenshot()
                
                # Convert to base64
                import base64
                screenshot_b64 = base64.b64encode(screenshot).decode()
                
                await self.send_to_connection(connection_id, {
                    "type": "screenshot_update",
                    "session_id": session_id,
                    "screenshot": screenshot_b64,
                    "timestamp": datetime.now().isoformat()
                })
                
        except Exception as e:
            logger.error(f"Error capturing screenshot: {e}")
    
    async def send_to_connection(self, connection_id: str, message: dict):
        """Send message to a specific connection"""
        if connection_id in self.connections:
            try:
                await self.connections[connection_id].send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending to connection {connection_id}: {e}")
                # Remove broken connection
                await self.disconnect(connection_id)
    
    async def _broadcast_to_session(self, session_id: str, message: dict):
        """Broadcast message to all subscribers of a session"""
        if session_id in self.session_subscribers:
            for connection_id in list(self.session_subscribers[session_id]):
                await self.send_to_connection(connection_id, message)
    
    async def _broadcast_to_browser_subscribers(self, message: dict):
        """Broadcast message to all browser subscribers"""
        for connection_id in list(self.browser_subscribers):
            await self.send_to_connection(connection_id, message)
    
    async def _send_session_update(self, connection_id: str):
        """Send current session list to a connection"""
        try:
            sessions = self.browser_manager.get_all_sessions()
            session_list = []
            
            for session_id, session_info in sessions.items():
                # Get additional session data if available
                session = await self.browser_manager.get_session(session_id)
                
                session_data = {
                    "session_id": session_id,
                    "browser_mode": session_info.get("type", "local"),
                    "status": "active",
                    **session_info
                }
                
                # Add current page info if available
                if session and hasattr(session, 'current_page'):
                    try:
                        session_data.update({
                            "current_url": session.current_page.url,
                            "current_title": await session.current_page.title()
                        })
                    except:
                        pass
                
                session_list.append(session_data)
            
            await self.send_to_connection(connection_id, {
                "type": "session_update",
                "data": session_list,
                "timestamp": datetime.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Error sending session update: {e}")
    
    async def _send_session_state(self, connection_id: str, session_id: str):
        """Send current state of a specific session"""
        try:
            session = await self.browser_manager.get_session(session_id)
            if session:
                session_data = {
                    "session_id": session_id,
                    "status": "active"
                }
                
                # Add enhanced session info if available
                if hasattr(session, 'get_session_info'):
                    session_data.update(session.get_session_info())
                
                # Add current page info
                if hasattr(session, 'current_page'):
                    try:
                        session_data.update({
                            "current_url": session.current_page.url,
                            "current_title": await session.current_page.title()
                        })
                    except:
                        pass
                
                await self.send_to_connection(connection_id, {
                    "type": "session_state",
                    "session_id": session_id,
                    "data": session_data,
                    "timestamp": datetime.now().isoformat()
                })
                
        except Exception as e:
            logger.error(f"Error sending session state: {e}")
    
    async def _start_background_tasks(self):
        """Start background monitoring tasks"""
        if not self._session_monitor_task:
            self._session_monitor_task = asyncio.create_task(self._session_monitor_loop())
        
        if not self._screenshot_task:
            self._screenshot_task = asyncio.create_task(self._screenshot_loop())
    
    async def _stop_background_tasks(self):
        """Stop background monitoring tasks"""
        if self._session_monitor_task:
            self._session_monitor_task.cancel()
            self._session_monitor_task = None
        
        if self._screenshot_task:
            self._screenshot_task.cancel()
            self._screenshot_task = None
    
    async def _session_monitor_loop(self):
        """Background task to monitor session changes"""
        try:
            while True:
                if self.browser_subscribers:
                    # Broadcast session updates to all browser subscribers
                    for connection_id in list(self.browser_subscribers):
                        await self._send_session_update(connection_id)
                
                await asyncio.sleep(5)  # Check every 5 seconds
                
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error in session monitor loop: {e}")
    
    async def _screenshot_loop(self):
        """Background task to capture and broadcast screenshots"""
        try:
            while True:
                # Capture screenshots for subscribed sessions
                for session_id, subscribers in list(self.session_subscribers.items()):
                    if subscribers:  # Only if someone is subscribed
                        try:
                            session = await self.browser_manager.get_session(session_id)
                            if session and hasattr(session, 'current_page'):
                                screenshot = await session.current_page.screenshot()
                                
                                # Convert to base64
                                import base64
                                screenshot_b64 = base64.b64encode(screenshot).decode()
                                
                                # Broadcast to session subscribers
                                await self._broadcast_to_session(session_id, {
                                    "type": "screenshot_update",
                                    "session_id": session_id,
                                    "screenshot": screenshot_b64,
                                    "timestamp": datetime.now().isoformat()
                                })
                                
                        except Exception as e:
                            logger.debug(f"Error capturing screenshot for session {session_id}: {e}")
                
                await asyncio.sleep(2)  # Capture every 2 seconds
                
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error in screenshot loop: {e}")


# Global WebSocket manager
ws_manager = BrowserWebSocketManager()


@ws_router.websocket("/ws/browser")
async def browser_websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for browser communication"""
    connection_id = await ws_manager.connect(websocket)
    
    try:
        while True:
            # Receive message
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle message
            await ws_manager.handle_message(connection_id, message)
            
    except WebSocketDisconnect:
        await ws_manager.disconnect(connection_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await ws_manager.disconnect(connection_id)
