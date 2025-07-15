"""
Claude Browser Integration
Connects Claude's browser-use tool calls with the enhanced UI system
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import uuid
import json

from browser_use import Agent
from browser_use.browser.context import BrowserSession
from browser_use.llm import ChatAnthropic

from .enhanced_browser_manager import get_browser_manager

logger = logging.getLogger(__name__)


class ClaudeBrowserIntegration:
    """
    Integrates Claude's browser-use tool calls with the enhanced UI system
    Ensures all browser actions appear in the BrowserViewPanel with human control
    """
    
    def __init__(self):
        self.browser_manager = get_browser_manager()
        self.conversation_sessions: Dict[str, str] = {}  # conversation_id -> session_id
        self.active_agents: Dict[str, Agent] = {}  # session_id -> agent
        self.session_metadata: Dict[str, Dict[str, Any]] = {}  # session_id -> metadata
        
        # WebSocket manager for UI updates
        self.ws_manager = None
        self._initialize_websocket()
    
    def _initialize_websocket(self):
        """Initialize WebSocket manager for UI updates"""
        try:
            # Import here to avoid circular imports
            import sys
            import os
            sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
            from server.browser_websocket import ws_manager
            self.ws_manager = ws_manager
            logger.info("WebSocket manager initialized for Claude integration")
        except ImportError:
            logger.warning("WebSocket manager not available - UI updates disabled")
    
    async def create_browser_agent_for_conversation(
        self,
        conversation_id: str,
        task: str,
        user_id: Optional[str] = None,
        llm_config: Optional[Dict[str, Any]] = None,
        browser_config: Optional[Dict[str, Any]] = None
    ) -> tuple[Agent, str]:
        """
        Create a browser agent for a Claude conversation that appears in the UI
        
        Args:
            conversation_id: Unique conversation identifier
            task: Task description for the agent
            user_id: Optional user identifier
            llm_config: LLM configuration override
            browser_config: Browser configuration override
            
        Returns:
            Tuple of (Agent, session_id)
        """
        
        # Check if conversation already has a browser session
        if conversation_id in self.conversation_sessions:
            session_id = self.conversation_sessions[conversation_id]
            existing_session = await self.browser_manager.get_session(session_id)
            
            if existing_session:
                # Reuse existing session
                agent = self.active_agents.get(session_id)
                if agent:
                    # Update task for existing agent
                    agent.task = task
                    logger.info(f"Reusing browser session {session_id} for conversation {conversation_id}")
                    return agent, session_id
        
        # Create new browser session that will appear in UI
        browser_mode = browser_config.get('mode', 'hybrid') if browser_config else 'hybrid'
        
        browser_session = await self.browser_manager.create_browser_session(
            browser_mode=browser_mode,
            enable_live_url=browser_config.get('enable_live_url', True) if browser_config else True,
            enable_recording=browser_config.get('enable_recording', True) if browser_config else True,
            enable_captcha_solving=browser_config.get('enable_captcha_solving', True) if browser_config else True
        )
        
        session_id = getattr(browser_session, 'session_id', getattr(browser_session, 'id', str(uuid.uuid4())))
        
        # Configure Claude LLM
        llm = self._create_claude_llm(llm_config or {})
        
        # Create browser-use agent with enhanced session
        agent = Agent(
            task=task,
            llm=llm,
            browser_session=browser_session,
            use_vision=True,
            max_actions_per_step=10,
            save_conversation_path=f"logs/conversations/{conversation_id}"
        )
        
        # Store mappings
        self.conversation_sessions[conversation_id] = session_id
        self.active_agents[session_id] = agent
        self.session_metadata[session_id] = {
            'conversation_id': conversation_id,
            'user_id': user_id,
            'task': task,
            'created_at': datetime.now().isoformat(),
            'browser_mode': browser_mode
        }
        
        # Notify UI about new session
        await self._notify_ui_new_session(session_id, conversation_id, task)
        
        logger.info(f"Created browser agent for conversation {conversation_id} with session {session_id}")
        return agent, session_id
    
    def _create_claude_llm(self, config: Dict[str, Any]):
        """Create Claude LLM instance with configuration"""
        return ChatAnthropic(
            model=config.get('model', 'claude-3-5-sonnet-20241022'),
            api_key=config.get('api_key'),  # Will use env var if not provided
            temperature=config.get('temperature', 0.1),
            max_tokens=config.get('max_tokens', 8192)
        )
    
    async def execute_browser_task(
        self,
        conversation_id: str,
        task: str,
        user_id: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Execute a browser task for a conversation with UI integration
        
        Args:
            conversation_id: Conversation identifier
            task: Task to execute
            user_id: Optional user identifier
            **kwargs: Additional configuration
            
        Returns:
            Task execution result
        """
        
        try:
            # Create or get browser agent
            agent, session_id = await self.create_browser_agent_for_conversation(
                conversation_id=conversation_id,
                task=task,
                user_id=user_id,
                llm_config=kwargs.get('llm_config'),
                browser_config=kwargs.get('browser_config')
            )
            
            # Notify UI that agent is starting
            await self._notify_ui_agent_status(session_id, 'starting', task)
            
            # Execute the task (this will use all browser-use tools)
            result = await agent.run()
            
            # Notify UI of completion
            await self._notify_ui_agent_status(session_id, 'completed', task, result)
            
            return {
                'success': True,
                'session_id': session_id,
                'result': result,
                'task': task,
                'conversation_id': conversation_id
            }
            
        except Exception as e:
            logger.error(f"Error executing browser task: {e}")
            
            # Notify UI of error
            if 'session_id' in locals():
                await self._notify_ui_agent_status(session_id, 'error', task, str(e))
            
            return {
                'success': False,
                'error': str(e),
                'task': task,
                'conversation_id': conversation_id
            }
    
    async def handle_human_control_request(
        self,
        session_id: str,
        action_type: str,  # 'guidance' or 'takeover'
        message: str,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Handle human control requests from the UI
        
        Args:
            session_id: Browser session ID
            action_type: Type of control request
            message: User message/guidance
            user_id: Optional user identifier
            
        Returns:
            Control request result
        """
        
        try:
            agent = self.active_agents.get(session_id)
            if not agent:
                return {'success': False, 'error': 'Agent not found'}
            
            if action_type == 'guidance':
                # Provide guidance to the agent without taking control
                guidance_prompt = f"""
                Human guidance received: {message}
                
                Please consider this guidance and adjust your approach accordingly.
                Continue with the task, taking the human feedback into account.
                """
                
                # Add guidance to agent's context
                agent.extend_system_message(guidance_prompt)
                
                # Notify UI
                await self._notify_ui_human_interaction(session_id, 'guidance_provided', message)
                
                return {
                    'success': True,
                    'action': 'guidance_provided',
                    'message': 'Guidance sent to agent'
                }
                
            elif action_type == 'takeover':
                # Pause the agent and enable human control
                # The UI will handle the actual browser control
                
                # Store the current state
                session_metadata = self.session_metadata.get(session_id, {})
                session_metadata['human_control'] = {
                    'active': True,
                    'message': message,
                    'timestamp': datetime.now().isoformat(),
                    'user_id': user_id
                }
                
                # Notify UI about control takeover
                await self._notify_ui_human_interaction(session_id, 'control_taken', message)
                
                return {
                    'success': True,
                    'action': 'control_taken',
                    'message': 'Human control activated'
                }
            
            else:
                return {'success': False, 'error': f'Unknown action type: {action_type}'}
                
        except Exception as e:
            logger.error(f"Error handling human control request: {e}")
            return {'success': False, 'error': str(e)}
    
    async def resume_agent_control(
        self,
        session_id: str,
        human_actions_summary: str,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Resume agent control after human intervention
        
        Args:
            session_id: Browser session ID
            human_actions_summary: Summary of what the human did
            user_id: Optional user identifier
            
        Returns:
            Resume result
        """
        
        try:
            agent = self.active_agents.get(session_id)
            if not agent:
                return {'success': False, 'error': 'Agent not found'}
            
            # Update agent with human actions context
            context_update = f"""
            Human intervention completed. Summary of human actions: {human_actions_summary}
            
            Please continue with the original task, taking into account what the human has done.
            Analyze the current page state and proceed accordingly.
            """
            
            agent.extend_system_message(context_update)
            
            # Update session metadata
            session_metadata = self.session_metadata.get(session_id, {})
            if 'human_control' in session_metadata:
                session_metadata['human_control']['active'] = False
                session_metadata['human_control']['completed_at'] = datetime.now().isoformat()
                session_metadata['human_control']['summary'] = human_actions_summary
            
            # Notify UI
            await self._notify_ui_human_interaction(session_id, 'control_returned', human_actions_summary)
            
            # Resume agent execution
            # Note: This would typically be called when the agent's run() method continues
            
            return {
                'success': True,
                'action': 'control_returned',
                'message': 'Agent control resumed'
            }
            
        except Exception as e:
            logger.error(f"Error resuming agent control: {e}")
            return {'success': False, 'error': str(e)}
    
    async def get_conversation_sessions(self, conversation_id: str) -> List[Dict[str, Any]]:
        """Get all browser sessions for a conversation"""
        sessions = []
        
        if conversation_id in self.conversation_sessions:
            session_id = self.conversation_sessions[conversation_id]
            session = await self.browser_manager.get_session(session_id)
            
            if session:
                session_info = {
                    'session_id': session_id,
                    'conversation_id': conversation_id,
                    'metadata': self.session_metadata.get(session_id, {}),
                    'status': 'active'
                }
                
                # Add enhanced session info if available
                if hasattr(session, 'get_session_info'):
                    session_info.update(session.get_session_info())
                
                sessions.append(session_info)
        
        return sessions
    
    async def cleanup_conversation(self, conversation_id: str):
        """Clean up browser sessions for a conversation"""
        if conversation_id in self.conversation_sessions:
            session_id = self.conversation_sessions[conversation_id]
            
            # Close browser session
            await self.browser_manager.close_session(session_id)
            
            # Clean up mappings
            del self.conversation_sessions[conversation_id]
            if session_id in self.active_agents:
                del self.active_agents[session_id]
            if session_id in self.session_metadata:
                del self.session_metadata[session_id]
            
            # Notify UI
            await self._notify_ui_session_closed(session_id, conversation_id)
            
            logger.info(f"Cleaned up browser session for conversation {conversation_id}")
    
    async def _notify_ui_new_session(self, session_id: str, conversation_id: str, task: str):
        """Notify UI about new browser session"""
        if self.ws_manager:
            await self.ws_manager._broadcast_to_browser_subscribers({
                'type': 'new_session',
                'session_id': session_id,
                'conversation_id': conversation_id,
                'task': task,
                'timestamp': datetime.now().isoformat()
            })
    
    async def _notify_ui_agent_status(self, session_id: str, status: str, task: str, result: Any = None):
        """Notify UI about agent status changes"""
        if self.ws_manager:
            await self.ws_manager._broadcast_to_session(session_id, {
                'type': 'agent_status',
                'session_id': session_id,
                'status': status,
                'task': task,
                'result': str(result) if result else None,
                'timestamp': datetime.now().isoformat()
            })
    
    async def _notify_ui_human_interaction(self, session_id: str, interaction_type: str, message: str):
        """Notify UI about human interactions"""
        if self.ws_manager:
            await self.ws_manager._broadcast_to_session(session_id, {
                'type': 'human_interaction',
                'session_id': session_id,
                'interaction_type': interaction_type,
                'message': message,
                'timestamp': datetime.now().isoformat()
            })
    
    async def _notify_ui_session_closed(self, session_id: str, conversation_id: str):
        """Notify UI about session closure"""
        if self.ws_manager:
            await self.ws_manager._broadcast_to_browser_subscribers({
                'type': 'session_closed',
                'session_id': session_id,
                'conversation_id': conversation_id,
                'timestamp': datetime.now().isoformat()
            })


# Global integration instance
_claude_browser_integration: Optional[ClaudeBrowserIntegration] = None


def get_claude_browser_integration() -> ClaudeBrowserIntegration:
    """Get the global Claude browser integration instance"""
    global _claude_browser_integration
    if _claude_browser_integration is None:
        _claude_browser_integration = ClaudeBrowserIntegration()
    return _claude_browser_integration


# Convenience functions for easy integration
async def create_claude_browser_agent(
    conversation_id: str,
    task: str,
    user_id: Optional[str] = None,
    **kwargs
) -> tuple[Agent, str]:
    """Convenience function to create a Claude browser agent"""
    integration = get_claude_browser_integration()
    return await integration.create_browser_agent_for_conversation(
        conversation_id=conversation_id,
        task=task,
        user_id=user_id,
        **kwargs
    )


async def execute_claude_browser_task(
    conversation_id: str,
    task: str,
    user_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Convenience function to execute a browser task for Claude"""
    integration = get_claude_browser_integration()
    return await integration.execute_browser_task(
        conversation_id=conversation_id,
        task=task,
        user_id=user_id,
        **kwargs
    )
