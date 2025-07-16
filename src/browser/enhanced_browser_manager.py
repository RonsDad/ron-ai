"""
Enhanced Browser Manager for Nira
Integrates Browserless cloud browsers with existing browser-use architecture
"""

import os
import asyncio
import logging
from typing import Optional, Dict, Any, Union
from datetime import datetime
import uuid

from browser_use import Agent
from browser_use.browser import BrowserProfile, BrowserSession
from browser_use.llm import ChatAnthropic, ChatGoogle

from .browserless_config import BrowserlessConfig, BrowserlessManager, create_browserless_manager
from .enhanced_browser_session import EnhancedBrowserSession, EnhancedBrowserContext

logger = logging.getLogger(__name__)


class EnhancedBrowserManager:
    """
    Enhanced browser manager that supports both local and Browserless cloud browsers
    Integrates with existing Nira browser architecture
    """
    
    def __init__(self):
        self.browser_mode = "local"  # "local", "browserless", or "hybrid"
        self.browserless_manager: Optional[BrowserlessManager] = None
        self.local_sessions: Dict[str, BrowserSession] = {}
        self.cloud_sessions: Dict[str, EnhancedBrowserSession] = {}
        self.active_agents: Dict[str, Agent] = {}
        
        # Initialize Browserless if configured
        self._initialize_browserless()
    
    def _initialize_browserless(self):
        """Initialize Browserless manager if configured"""
        try:
            self.browserless_manager = create_browserless_manager()
            if self.browserless_manager:
                logger.info("Browserless manager initialized successfully")
                # Check if we should default to Browserless mode
                if os.getenv('USE_BROWSERLESS', 'false').lower() == 'true':
                    self.browser_mode = "browserless"
                    logger.info("Default browser mode set to Browserless")
            else:
                logger.info("Browserless manager not available - using local browser only")
        except Exception as e:
            logger.error(f"Failed to initialize Browserless: {e}")
            self.browserless_manager = None
    
    def set_browser_mode(self, mode: str):
        """Set the browser mode: local, browserless, or hybrid"""
        if mode not in ["local", "browserless", "hybrid"]:
            raise ValueError("Browser mode must be 'local', 'browserless', or 'hybrid'")
        
        if mode == "browserless" and not self.browserless_manager:
            raise RuntimeError("Browserless is not available - check configuration")
        
        self.browser_mode = mode
        logger.info(f"Browser mode set to: {mode}")
    
    def get_browser_mode(self) -> str:
        """Get current browser mode"""
        return self.browser_mode
    
    def is_browserless_available(self) -> bool:
        """Check if Browserless is available"""
        return self.browserless_manager is not None and self.browserless_manager.is_available()
    
    async def create_browser_session(
        self, 
        session_id: Optional[str] = None,
        browser_mode: Optional[str] = None,
        **kwargs
    ) -> Union[BrowserSession, EnhancedBrowserSession]:
        """
        Create a browser session based on the specified mode
        
        Args:
            session_id: Optional session ID, will generate if not provided
            browser_mode: Override default browser mode for this session
            **kwargs: Additional arguments for session creation
        
        Returns:
            Browser session (local or enhanced for Browserless)
        """
        session_id = session_id or str(uuid.uuid4())
        mode = browser_mode or self.browser_mode
        
        if mode == "browserless":
            return await self._create_browserless_session(session_id, **kwargs)
        elif mode == "local":
            return await self._create_local_session(session_id, **kwargs)
        elif mode == "hybrid":
            # Try Browserless first, fallback to local
            try:
                if self.is_browserless_available():
                    return await self._create_browserless_session(session_id, **kwargs)
                else:
                    logger.info("Browserless not available, falling back to local browser")
                    return await self._create_local_session(session_id, **kwargs)
            except Exception as e:
                logger.warning(f"Browserless session creation failed, falling back to local: {e}")
                return await self._create_local_session(session_id, **kwargs)
        else:
            raise ValueError(f"Invalid browser mode: {mode}")
    
    async def _create_local_session(self, session_id: str, **kwargs) -> BrowserSession:
        """Create a local browser session using existing Nira architecture"""
        try:
            # Create unique profile directory for this session to avoid conflicts
            import tempfile
            import os
            profile_dir = os.path.join(tempfile.gettempdir(), f"browseruse_session_{session_id}")
            
            # Create BrowserProfile with proper parameters and unique directory
            profile_kwargs = {
                'headless': kwargs.get('headless', True),
                'user_data_dir': profile_dir,  # Use unique directory
                'stealth': kwargs.get('stealth', False),
                'disable_security': kwargs.get('disable_security', False),
            }
            
            # Remove None values to avoid conflicts
            profile_kwargs = {k: v for k, v in profile_kwargs.items() if v is not None}
            
            profile = BrowserProfile(**profile_kwargs)
            
            # Create session with the profile
            session = BrowserSession(browser_profile=profile)
            
            # Set session ID
            session.id = session_id
            
            # Start the session
            await session.start()
            
            self.local_sessions[session_id] = session
            logger.info(f"Local browser session created: {session_id}")
            
            return session
            
        except Exception as e:
            logger.error(f"Failed to create local browser session: {e}")
            raise
    
    async def _create_browserless_session(self, session_id: str, **kwargs) -> EnhancedBrowserSession:
        """Create a Browserless cloud browser session"""
        if not self.browserless_manager:
            raise RuntimeError("Browserless manager not available")
        
        try:
            # Get Browserless browser configuration
            browser_config = self.browserless_manager.get_browser_config()
            
            # Create browser instance with Browserless CDP URL
            from browser_use.browser.browser import Browser
            browser = Browser(config=browser_config)
            
            # Create browser session (new_context returns a BrowserSession)
            browser_session = await browser.new_context()
            
            # Get the current page from the session
            current_page = browser_session.agent_current_page
            
            # Create enhanced session directly using the browser_session
            session = EnhancedBrowserSession(
                browser_context=browser_session.browser_context,  # Use the playwright BrowserContext
                agent_current_page=current_page,
                session_id=session_id,
                browser_mode="browserless"
            )
            
            # Initialize CDP session for advanced features
            await session.initialize_cdp_session()
            
            # Enable advanced features if configured
            config = self.browserless_manager.config
            if config.enable_captcha_solving:
                await session.enable_captcha_detection()
            
            if config.enable_live_url:
                live_url = await session.generate_live_url(timeout=config.timeout)
                if live_url:
                    logger.info(f"Live URL generated for session {session_id}: {live_url}")
            
            if config.enable_recording:
                await session.start_recording()
                logger.info(f"Recording started for session {session_id}")
            
            # Register with Browserless manager
            self.browserless_manager.register_session(session_id, session.get_session_info())
            self.cloud_sessions[session_id] = session
            
            logger.info(f"Browserless session created: {session_id}")
            return session
            
        except Exception as e:
            logger.error(f"Failed to create Browserless session: {e}")
            raise
    
    async def create_agent(
        self,
        task: str,
        llm_provider: str = "anthropic",
        model_name: str = "claude-3-5-sonnet-20241022",
        session_id: Optional[str] = None,
        browser_mode: Optional[str] = None,
        **kwargs
    ) -> Agent:
        """
        Create an agent with browser session
        
        Args:
            task: Task description for the agent
            llm_provider: LLM provider (anthropic, google, etc.)
            model_name: Model name to use
            session_id: Optional session ID
            browser_mode: Override browser mode for this agent
            **kwargs: Additional arguments
        
        Returns:
            Configured Agent instance
        """
        session_id = session_id or str(uuid.uuid4())
        
        try:
            # Create browser session
            browser_session = await self.create_browser_session(
                session_id=session_id,
                browser_mode=browser_mode,
                **kwargs
            )
            
            # Create LLM instance
            llm = self._create_llm(llm_provider, model_name, **kwargs)
            
            # Create agent with proper parameters
            agent = Agent(
                task=task,
                llm=llm,
                browser_session=browser_session
            )
            
            self.active_agents[session_id] = agent
            logger.info(f"Agent created for session {session_id} with task: {task[:100]}...")
            
            return agent
            
        except Exception as e:
            logger.error(f"Failed to create agent: {e}")
            raise
    
    def _create_llm(self, provider: str, model_name: str, **kwargs):
        """Create LLM instance based on provider"""
        if provider.lower() == "anthropic":
            return ChatAnthropic(
                model_name=model_name,
                api_key=os.getenv('ANTHROPIC_API_KEY'),
                **kwargs
            )
        elif provider.lower() == "google":
            return ChatGoogle(
                model_name=model_name,
                api_key=os.getenv('GOOGLE_API_KEY'),
                **kwargs
            )
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")
    
    async def get_session(self, session_id: str) -> Optional[Union[BrowserSession, EnhancedBrowserSession]]:
        """Get a browser session by ID"""
        # Check local sessions first
        if session_id in self.local_sessions:
            return self.local_sessions[session_id]
        
        # Check cloud sessions
        if session_id in self.cloud_sessions:
            return self.cloud_sessions[session_id]
        
        return None
    
    async def close_session(self, session_id: str):
        """Close a browser session"""
        try:
            # Check local sessions
            if session_id in self.local_sessions:
                session = self.local_sessions[session_id]
                await session.close()
                del self.local_sessions[session_id]
                logger.info(f"Local session closed: {session_id}")
            
            # Check cloud sessions
            elif session_id in self.cloud_sessions:
                session = self.cloud_sessions[session_id]
                await session.cleanup()
                del self.cloud_sessions[session_id]
                
                # Unregister from Browserless manager
                if self.browserless_manager:
                    self.browserless_manager.unregister_session(session_id)
                
                logger.info(f"Browserless session closed: {session_id}")
            
            # Remove from active agents
            if session_id in self.active_agents:
                del self.active_agents[session_id]
                
        except Exception as e:
            logger.error(f"Error closing session {session_id}: {e}")
            # Don't re-raise to avoid breaking cleanup
    
    async def close_all_sessions(self):
        """Close all active sessions"""
        # Close local sessions
        for session_id in list(self.local_sessions.keys()):
            await self.close_session(session_id)
        
        # Close cloud sessions
        for session_id in list(self.cloud_sessions.keys()):
            await self.close_session(session_id)
        
        logger.info("All browser sessions closed")
    
    def get_session_stats(self) -> Dict[str, Any]:
        """Get statistics about active sessions"""
        stats = {
            'browser_mode': self.browser_mode,
            'local_sessions': len(self.local_sessions),
            'cloud_sessions': len(self.cloud_sessions),
            'active_agents': len(self.active_agents),
            'total_sessions': len(self.local_sessions) + len(self.cloud_sessions),
            'browserless_available': self.is_browserless_available()
        }
        
        if self.browserless_manager:
            stats['browserless_stats'] = self.browserless_manager.get_stats()
        
        return stats
    
    def get_all_sessions(self) -> Dict[str, Dict[str, Any]]:
        """Get information about all active sessions"""
        sessions = {}
        
        # Add local sessions
        for session_id, session in self.local_sessions.items():
            sessions[session_id] = {
                'type': 'local',
                'session_id': session_id,
                'created_at': getattr(session, 'created_at', None),
                'status': 'active'
            }
        
        # Add cloud sessions
        for session_id, session in self.cloud_sessions.items():
            sessions[session_id] = {
                'type': 'browserless',
                **session.get_session_info()
            }
        
        return sessions


# Global browser manager instance
_browser_manager: Optional[EnhancedBrowserManager] = None


def get_browser_manager() -> EnhancedBrowserManager:
    """Get the global browser manager instance"""
    global _browser_manager
    if _browser_manager is None:
        _browser_manager = EnhancedBrowserManager()
    return _browser_manager


async def create_browser_agent(
    task: str,
    llm_provider: str = "anthropic",
    model_name: str = "claude-3-5-sonnet-20241022",
    browser_mode: Optional[str] = None,
    **kwargs
) -> Agent:
    """
    Convenience function to create a browser agent
    
    Args:
        task: Task description
        llm_provider: LLM provider
        model_name: Model name
        browser_mode: Browser mode override
        **kwargs: Additional arguments
    
    Returns:
        Configured Agent instance
    """
    manager = get_browser_manager()
    return await manager.create_agent(
        task=task,
        llm_provider=llm_provider,
        model_name=model_name,
        browser_mode=browser_mode,
        **kwargs
    )
