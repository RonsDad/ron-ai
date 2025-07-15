"""
Claude Agent Wrapper
Integrates with existing ClaudeAgent.tsx component to add browser capabilities
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List, Callable
import json
from datetime import datetime

from .claude_browser_integration import get_claude_browser_integration

logger = logging.getLogger(__name__)


class ClaudeAgentWrapper:
    """
    Wrapper for Claude agent that adds browser-use integration
    Designed to work with your existing ClaudeAgent.tsx component
    """
    
    def __init__(self, conversation_id: str, user_id: Optional[str] = None):
        self.conversation_id = conversation_id
        self.user_id = user_id
        self.browser_integration = get_claude_browser_integration()
        self.message_handlers: List[Callable] = []
        self.browser_session_handlers: List[Callable] = []
    
    def add_message_handler(self, handler: Callable):
        """Add handler for message updates"""
        self.message_handlers.append(handler)
    
    def add_browser_session_handler(self, handler: Callable):
        """Add handler for browser session updates"""
        self.browser_session_handlers.append(handler)
    
    async def process_message(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process a message from the user, detecting if browser automation is needed
        
        Args:
            message: User message
            context: Optional context from the conversation
            
        Returns:
            Response with browser session info if browser task was created
        """
        
        # Check if message requires browser automation
        if self._requires_browser_automation(message):
            return await self._handle_browser_request(message, context)
        else:
            # Handle as regular Claude conversation
            return await self._handle_regular_message(message, context)
    
    def _requires_browser_automation(self, message: str) -> bool:
        """
        Detect if a message requires browser automation
        
        This is a simple heuristic - you can make this more sophisticated
        """
        browser_keywords = [
            'navigate to', 'go to', 'visit', 'open website', 'browse to',
            'fill out', 'click on', 'click the', 'search for', 'find on website',
            'submit form', 'login to', 'sign in to', 'download from', 'download the',
            'screenshot of', 'scrape', 'extract from website',
            'automate', 'browser', 'website', 'web page', 'button', 'form'
        ]
        
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in browser_keywords)
    
    async def _handle_browser_request(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Handle a message that requires browser automation"""
        
        try:
            # Notify handlers that browser task is starting
            await self._notify_message_handlers({
                'type': 'browser_task_starting',
                'message': message,
                'conversation_id': self.conversation_id
            })
            
            # Execute browser task
            result = await self.browser_integration.execute_browser_task(
                conversation_id=self.conversation_id,
                task=message,
                user_id=self.user_id,
                llm_config=context.get('llm_config') if context else None,
                browser_config=context.get('browser_config') if context else None
            )
            
            if result['success']:
                # Get session info for UI
                sessions = await self.browser_integration.get_conversation_sessions(
                    self.conversation_id
                )
                
                # Notify handlers about new browser session
                await self._notify_browser_session_handlers({
                    'type': 'browser_session_created',
                    'sessions': sessions,
                    'conversation_id': self.conversation_id
                })
                
                response = {
                    'type': 'browser_task_response',
                    'success': True,
                    'message': f"I've started working on that browser task. You can see the browser activity in the Browser View panel.",
                    'browser_session_id': result['session_id'],
                    'task': message,
                    'sessions': sessions
                }
            else:
                response = {
                    'type': 'browser_task_response',
                    'success': False,
                    'message': f"I encountered an error with the browser task: {result['error']}",
                    'error': result['error']
                }
            
            # Notify handlers
            await self._notify_message_handlers(response)
            
            return response
            
        except Exception as e:
            logger.error(f"Error handling browser request: {e}")
            
            error_response = {
                'type': 'browser_task_response',
                'success': False,
                'message': f"I encountered an error: {str(e)}",
                'error': str(e)
            }
            
            await self._notify_message_handlers(error_response)
            return error_response
    
    async def _handle_regular_message(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Handle a regular (non-browser) message"""
        
        # This would integrate with your existing Claude API logic
        # For now, return a placeholder response
        response = {
            'type': 'regular_response',
            'message': message,
            'response': "This would be handled by your existing Claude integration.",
            'conversation_id': self.conversation_id
        }
        
        await self._notify_message_handlers(response)
        return response
    
    async def handle_human_control_request(
        self,
        session_id: str,
        action_type: str,
        message: str
    ) -> Dict[str, Any]:
        """Handle human control requests from the UI"""
        
        result = await self.browser_integration.handle_human_control_request(
            session_id=session_id,
            action_type=action_type,
            message=message,
            user_id=self.user_id
        )
        
        # Notify handlers
        await self._notify_message_handlers({
            'type': 'human_control_response',
            'session_id': session_id,
            'action_type': action_type,
            'result': result
        })
        
        return result
    
    async def resume_agent_control(
        self,
        session_id: str,
        human_actions_summary: str
    ) -> Dict[str, Any]:
        """Resume agent control after human intervention"""
        
        result = await self.browser_integration.resume_agent_control(
            session_id=session_id,
            human_actions_summary=human_actions_summary,
            user_id=self.user_id
        )
        
        # Notify handlers
        await self._notify_message_handlers({
            'type': 'agent_control_resumed',
            'session_id': session_id,
            'result': result
        })
        
        return result
    
    async def get_browser_sessions(self) -> List[Dict[str, Any]]:
        """Get all browser sessions for this conversation"""
        return await self.browser_integration.get_conversation_sessions(
            self.conversation_id
        )
    
    async def cleanup(self):
        """Clean up resources when conversation ends"""
        await self.browser_integration.cleanup_conversation(self.conversation_id)
    
    async def _notify_message_handlers(self, data: Dict[str, Any]):
        """Notify all message handlers"""
        for handler in self.message_handlers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(data)
                else:
                    handler(data)
            except Exception as e:
                logger.error(f"Error in message handler: {e}")
    
    async def _notify_browser_session_handlers(self, data: Dict[str, Any]):
        """Notify all browser session handlers"""
        for handler in self.browser_session_handlers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(data)
                else:
                    handler(data)
            except Exception as e:
                logger.error(f"Error in browser session handler: {e}")


# Factory function for easy integration
def create_claude_agent_wrapper(
    conversation_id: str,
    user_id: Optional[str] = None
) -> ClaudeAgentWrapper:
    """Create a Claude agent wrapper for a conversation"""
    return ClaudeAgentWrapper(conversation_id=conversation_id, user_id=user_id)
