"""
Enhanced Browser Tool for Claude Integration
Provides intelligent browser automation with conversation-aware session management
"""

import asyncio
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List, Union
import httpx
import json

from anthropic.types.beta import BetaToolParam

logger = logging.getLogger(__name__)


class ConversationContext:
    """Manages conversation context for browser sessions"""
    
    def __init__(self, conversation_id: str):
        self.conversation_id = conversation_id
        self.created_at = datetime.now()
        self.last_activity = datetime.now()
        self.browser_sessions: List[str] = []
        self.context_history: List[Dict[str, Any]] = []
        self.user_preferences: Dict[str, Any] = {}
    
    def add_browser_session(self, session_id: str) -> None:
        """Add a browser session to this conversation"""
        if session_id not in self.browser_sessions:
            self.browser_sessions.append(session_id)
            self.last_activity = datetime.now()
    
    def add_context_entry(self, entry: Dict[str, Any]) -> None:
        """Add a context entry to the conversation history"""
        entry['timestamp'] = datetime.now().isoformat()
        self.context_history.append(entry)
        self.last_activity = datetime.now()
    
    def get_recent_context(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Get recent context entries"""
        return self.context_history[-limit:] if self.context_history else []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            'conversation_id': self.conversation_id,
            'created_at': self.created_at.isoformat(),
            'last_activity': self.last_activity.isoformat(),
            'browser_sessions': self.browser_sessions,
            'context_history': self.context_history,
            'user_preferences': self.user_preferences
        }


class BrowserNeedDetector:
    """Detects when browser automation is needed based on user input"""
    
    # Keywords that indicate browser automation might be needed
    BROWSER_KEYWORDS = [
        'website', 'web page', 'browse', 'navigate', 'click', 'fill form',
        'submit', 'login', 'search on', 'visit', 'go to', 'open', 'download',
        'upload', 'screenshot', 'scrape', 'extract', 'automate', 'book',
        'purchase', 'buy', 'order', 'apply', 'register', 'sign up', 'button',
        'field', 'form', 'dropdown', 'menu', 'link', 'page', 'tab', 'window',
        'username', 'password', 'email', 'address', 'phone'
    ]
    
    # Action verbs that suggest browser interaction
    ACTION_VERBS = [
        'click', 'type', 'enter', 'select', 'choose', 'submit', 'upload',
        'download', 'scroll', 'navigate', 'search', 'find', 'locate'
    ]
    
    # Website patterns
    WEBSITE_PATTERNS = [
        '.com', '.org', '.net', '.edu', '.gov', 'http://', 'https://',
        'www.', 'gmail', 'google', 'amazon', 'facebook', 'twitter'
    ]
    
    @classmethod
    def analyze_prompt(cls, prompt: str) -> Dict[str, Any]:
        """
        Analyze a prompt to determine if browser automation is needed
        
        Returns:
            Dict with analysis results including confidence score and reasoning
        """
        prompt_lower = prompt.lower()
        
        # Count keyword matches
        keyword_matches = sum(1 for keyword in cls.BROWSER_KEYWORDS if keyword in prompt_lower)
        action_matches = sum(1 for action in cls.ACTION_VERBS if action in prompt_lower)
        website_matches = sum(1 for pattern in cls.WEBSITE_PATTERNS if pattern in prompt_lower)
        
        # Calculate confidence score (0-1)
        total_matches = keyword_matches + action_matches + website_matches
        confidence = min(total_matches / 5.0, 1.0)  # Normalize to 0-1
        
        # Determine if browser is likely needed
        needs_browser = confidence > 0.2 or website_matches > 0 or action_matches >= 2
        
        return {
            'needs_browser': needs_browser,
            'confidence': confidence,
            'keyword_matches': keyword_matches,
            'action_matches': action_matches,
            'website_matches': website_matches,
            'reasoning': cls._generate_reasoning(needs_browser, confidence, total_matches)
        }
    
    @classmethod
    def _generate_reasoning(cls, needs_browser: bool, confidence: float, matches: int) -> str:
        """Generate human-readable reasoning for the decision"""
        if needs_browser:
            if confidence > 0.7:
                return f"High confidence browser automation needed (score: {confidence:.2f}) - detected {matches} relevant indicators"
            elif confidence > 0.5:
                return f"Moderate confidence browser automation needed (score: {confidence:.2f}) - detected {matches} relevant indicators"
            else:
                return f"Low confidence browser automation might be needed (score: {confidence:.2f}) - detected {matches} relevant indicators"
        else:
            return f"Browser automation not needed (score: {confidence:.2f}) - insufficient indicators"


class EnhancedBrowserTool:
    """Enhanced browser tool with intelligent detection and conversation awareness"""
    
    def __init__(self):
        self.conversation_contexts: Dict[str, ConversationContext] = {}
        self.browser_backend_url = "http://localhost:8000"
        self.detector = BrowserNeedDetector()
    
    def get_or_create_conversation_context(self, conversation_id: str) -> ConversationContext:
        """Get or create conversation context"""
        if conversation_id not in self.conversation_contexts:
            self.conversation_contexts[conversation_id] = ConversationContext(conversation_id)
        return self.conversation_contexts[conversation_id]
    
    async def analyze_browser_need(self, prompt: str, conversation_id: str) -> Dict[str, Any]:
        """
        Analyze if browser automation is needed for the given prompt
        
        Args:
            prompt: User's prompt/instruction
            conversation_id: Conversation identifier
            
        Returns:
            Analysis results with recommendation
        """
        context = self.get_or_create_conversation_context(conversation_id)
        analysis = self.detector.analyze_prompt(prompt)
        
        # Add conversation context to analysis
        analysis['conversation_context'] = {
            'has_active_sessions': len(context.browser_sessions) > 0,
            'recent_browser_activity': len([
                entry for entry in context.get_recent_context()
                if entry.get('type') == 'browser_action'
            ]) > 0
        }
        
        # Log the analysis
        context.add_context_entry({
            'type': 'browser_need_analysis',
            'prompt': prompt[:200] + '...' if len(prompt) > 200 else prompt,
            'analysis': analysis
        })
        
        return analysis
    
    async def start_browser_session(
        self,
        instructions: str,
        conversation_id: str,
        browser_config: Optional[Dict[str, Any]] = None,
        enable_live_view: bool = True,
        enable_human_control: bool = True
    ) -> Dict[str, Any]:
        """
        Start a new browser automation session with enhanced integration
        
        Args:
            instructions: Instructions for the browser agent
            conversation_id: Conversation identifier for context management
            browser_config: Optional browser configuration
            enable_live_view: Enable live browser viewing in UI
            enable_human_control: Enable human-in-the-loop control
            
        Returns:
            Session information including session_id and browser_url
        """
        if not instructions:
            return {'error': 'Instructions parameter is required but was empty'}
        
        try:
            # Import browser manager here to avoid circular imports
            import sys
            import os
            sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))
            from browser.enhanced_browser_manager import get_browser_manager, IntegrationConfig
            
            browser_manager = get_browser_manager()
            context = self.get_or_create_conversation_context(conversation_id)
            
            # Create integration config
            integration_config = IntegrationConfig(
                enable_live_view=enable_live_view,
                enable_human_control=enable_human_control
            )
            
            # Create integrated browser session using enhanced manager
            session = await browser_manager.create_integrated_session(
                conversation_id=conversation_id,
                browser_config=browser_config or {},
                integration_config=integration_config
            )
            
            # Create agent with the session
            agent = await browser_manager.create_agent(
                task=instructions,
                session_id=session.session_id,
                browser_mode=browser_config.get('browser_mode') if browser_config else None
            )
            
            # Update conversation context
            context.add_browser_session(session.session_id)
            context.add_context_entry({
                'type': 'browser_session_started',
                'session_id': session.session_id,
                'instructions': instructions[:200] + '...' if len(instructions) > 200 else instructions
            })
            
            # Get session info
            session_info = session.get_session_info()
            
            # Prepare result
            result = {
                'success': True,
                'session_id': session.session_id,
                'conversation_id': conversation_id,
                'browser_mode': session.browser_mode,
                'live_url': session_info.get('live_url'),
                'features': session_info.get('features', {}),
                'created_at': session_info.get('created_at'),
                'agent_task': instructions
            }
            
            # Add browser URL for embedded viewing
            if session_info.get('live_url'):
                result['browser_url'] = session_info['live_url']
            elif session.browser_mode == 'local':
                # For local mode, we'll need to implement a different viewing mechanism
                result['browser_url'] = f'http://localhost:8000/session/{session.session_id}/view'
            
            logger.info(f"Enhanced browser session started: {session.session_id} with mode: {session.browser_mode}")
            return result
                
        except Exception as e:
            logger.error(f"Failed to start enhanced browser session: {e}")
            return {'error': str(e)}
    
    async def get_session_status(
        self,
        session_id: str,
        conversation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get enhanced status of a browser session
        
        Args:
            session_id: Browser session identifier
            conversation_id: Optional conversation identifier for context
            
        Returns:
            Enhanced session status with context information
        """
        try:
            # Import browser manager here to avoid circular imports
            import sys
            import os
            sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))
            from browser.enhanced_browser_manager import get_browser_manager
            
            browser_manager = get_browser_manager()
            
            # Get session from enhanced browser manager
            session = await browser_manager.get_session(session_id)
            if not session:
                return {'error': f'Session {session_id} not found'}
            
            # Get enhanced session info
            if hasattr(session, 'get_session_info'):
                result = session.get_session_info()
            else:
                # Fallback for basic browser sessions
                result = {
                    'session_id': session_id,
                    'status': 'active',
                    'browser_mode': getattr(session, 'browser_mode', 'local'),
                    'created_at': getattr(session, 'created_at', datetime.now()).isoformat() if hasattr(getattr(session, 'created_at', None), 'isoformat') else str(getattr(session, 'created_at', datetime.now()))
                }
            
            # Add conversation context if available
            if conversation_id and conversation_id in self.conversation_contexts:
                context = self.conversation_contexts[conversation_id]
                result['conversation_context'] = {
                    'conversation_id': conversation_id,
                    'session_count': len(context.browser_sessions),
                    'recent_activity': context.last_activity.isoformat()
                }
            
            return result
                
        except Exception as e:
            logger.error(f"Failed to get session status: {e}")
            return {'error': str(e)}
    
    async def request_human_intervention(
        self,
        session_id: str,
        reason: str,
        current_state: Dict[str, Any],
        conversation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Request human intervention for a browser session
        
        Args:
            session_id: Browser session identifier
            reason: Reason for requesting human help
            current_state: Current browser/agent state
            conversation_id: Optional conversation identifier
            
        Returns:
            Human intervention request result
        """
        try:
            payload = {
                "session_id": session_id,
                "reason": reason,
                "current_state": current_state,
                "timestamp": datetime.now().isoformat()
            }
            
            if conversation_id:
                payload["conversation_id"] = conversation_id
                
                # Add conversation context
                if conversation_id in self.conversation_contexts:
                    context = self.conversation_contexts[conversation_id]
                    payload["conversation_context"] = {
                        "recent_context": context.get_recent_context(),
                        "session_history": context.browser_sessions
                    }
            
            async with httpx.AsyncClient() as http_client:
                response = await http_client.post(
                    f'{self.browser_backend_url}/api/session/{session_id}/request-help',
                    json=payload,
                    timeout=30.0
                )
                response.raise_for_status()
                result = response.json()
                
                # Update conversation context
                if conversation_id and conversation_id in self.conversation_contexts:
                    context = self.conversation_contexts[conversation_id]
                    context.add_context_entry({
                        'type': 'human_intervention_requested',
                        'session_id': session_id,
                        'reason': reason
                    })
                
                return result
                
        except httpx.ConnectError:
            logger.error("Cannot connect to browser-use backend")
            return {'error': 'Browser-use backend is not running'}
        except Exception as e:
            logger.error(f"Failed to request human intervention: {e}")
            return {'error': str(e)}
    
    async def stop_browser_session(
        self,
        session_id: str,
        conversation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Stop a browser session with context cleanup
        
        Args:
            session_id: Browser session identifier
            conversation_id: Optional conversation identifier
            
        Returns:
            Stop operation result
        """
        try:
            async with httpx.AsyncClient() as http_client:
                response = await http_client.post(
                    f'{self.browser_backend_url}/api/stop-agent?session_id={session_id}',
                    timeout=30.0
                )
                response.raise_for_status()
                result = response.json()
                
                # Update conversation context
                if conversation_id and conversation_id in self.conversation_contexts:
                    context = self.conversation_contexts[conversation_id]
                    if session_id in context.browser_sessions:
                        context.browser_sessions.remove(session_id)
                    context.add_context_entry({
                        'type': 'browser_session_stopped',
                        'session_id': session_id
                    })
                
                return result
                
        except httpx.ConnectError:
            logger.error("Cannot connect to browser-use backend")
            return {'error': 'Browser-use backend is not running'}
        except Exception as e:
            logger.error(f"Failed to stop browser session: {e}")
            return {'error': str(e)}
    
    def get_conversation_summary(self, conversation_id: str) -> Dict[str, Any]:
        """Get summary of conversation context and browser activity"""
        if conversation_id not in self.conversation_contexts:
            return {'error': 'Conversation not found'}
        
        context = self.conversation_contexts[conversation_id]
        return {
            'conversation_id': conversation_id,
            'active_sessions': len(context.browser_sessions),
            'total_context_entries': len(context.context_history),
            'last_activity': context.last_activity.isoformat(),
            'recent_context': context.get_recent_context(3)
        }


# Enhanced tool definitions for Claude
def get_enhanced_browser_tools() -> List[BetaToolParam]:
    """Get enhanced browser tool definitions for Claude"""
    return [
        BetaToolParam(
            name="start_browser_automation",
            description="[ENHANCED] Start intelligent browser automation with live UI integration. Automatically detects when browser automation is needed and provides conversation-aware session management with real-time viewing capabilities.",
            input_schema={
                "type": "object",
                "properties": {
                    "instructions": {
                        "type": "string",
                        "description": "Detailed instructions for what the browser should do"
                    },
                    "conversation_id": {
                        "type": "string",
                        "description": "Unique identifier for this conversation to maintain context across tool calls"
                    },
                    "enable_live_view": {
                        "type": "boolean",
                        "description": "Enable live browser viewing in the UI (default: true)",
                        "default": True
                    },
                    "enable_human_control": {
                        "type": "boolean",
                        "description": "Enable human-in-the-loop control capabilities (default: true)",
                        "default": True
                    },
                    "browser_config": {
                        "type": "object",
                        "description": "Optional browser configuration settings",
                        "properties": {
                            "headless": {"type": "boolean", "default": False},
                            "browser_mode": {"type": "string", "enum": ["local", "browserless", "hybrid"]},
                            "enable_recording": {"type": "boolean", "default": False}
                        }
                    }
                },
                "required": ["instructions", "conversation_id"]
            }
        ),
        BetaToolParam(
            name="analyze_browser_need",
            description="[ENHANCED] Analyze whether browser automation is needed for a given task. Uses intelligent detection to determine if a prompt requires browser interaction.",
            input_schema={
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "The user prompt or task to analyze"
                    },
                    "conversation_id": {
                        "type": "string",
                        "description": "Conversation identifier for context"
                    }
                },
                "required": ["prompt", "conversation_id"]
            }
        ),
        BetaToolParam(
            name="request_human_help",
            description="[ENHANCED] Request human intervention when the browser agent encounters difficulties. Provides detailed context and enables human-in-the-loop assistance.",
            input_schema={
                "type": "object",
                "properties": {
                    "session_id": {
                        "type": "string",
                        "description": "Browser session identifier"
                    },
                    "reason": {
                        "type": "string",
                        "description": "Detailed reason why human help is needed"
                    },
                    "current_situation": {
                        "type": "string",
                        "description": "Description of the current browser state and what the agent was trying to do"
                    },
                    "suggested_actions": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Suggested actions the human could take to help"
                    },
                    "conversation_id": {
                        "type": "string",
                        "description": "Conversation identifier for context"
                    }
                },
                "required": ["session_id", "reason", "current_situation"]
            }
        ),
        BetaToolParam(
            name="get_enhanced_session_status",
            description="[ENHANCED] Get detailed status of a browser session including conversation context and recent activity.",
            input_schema={
                "type": "object",
                "properties": {
                    "session_id": {
                        "type": "string",
                        "description": "Browser session identifier"
                    },
                    "conversation_id": {
                        "type": "string",
                        "description": "Optional conversation identifier for enhanced context"
                    }
                },
                "required": ["session_id"]
            }
        )
    ]