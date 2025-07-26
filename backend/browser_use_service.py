"""
Browser-Use Integration Service for LiveURL Generation
Implements browser-use library integration with Browserless for generating LiveURLs
as specified in the provided code example.
"""

import os
import asyncio
import logging
from typing import Dict, Any, Optional
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Browser-use library imports
try:
    from browser_use import BrowserSession
    BROWSER_USE_AVAILABLE = True
    logger.info("browser-use library loaded successfully")
except ImportError as e:
    logger.error(f"Failed to import browser-use library: {e}")
    BROWSER_USE_AVAILABLE = False


class BrowserUseService:
    """Service for managing browser-use sessions with Browserless LiveURL integration"""
    
    def __init__(self):
        self.active_sessions: Dict[str, BrowserSession] = {}
        self.session_metadata: Dict[str, Dict[str, Any]] = {}
        
    async def create_live_url_session(self, timeout_ms: int = 600000) -> Dict[str, Any]:
        """
        Create a browser-use session with Browserless and generate LiveURL for iframe embedding.
        Based on the provided code example.
        """
        if not BROWSER_USE_AVAILABLE:
            raise ValueError("browser-use library is not available")
            
        # Get Browserless API token from environment
        browserless_token = os.getenv('BROWSERLESS_API_TOKEN')
        if not browserless_token:
            raise ValueError("BROWSERLESS_API_TOKEN environment variable is required")
        
        # Generate session ID
        session_id = f"browser_use_session_{datetime.now().timestamp()}"
        
        try:
            logger.info(f"Creating browser-use session {session_id} with Browserless")
            
            # Create browser profile for consistent agent behavior  
            from browser_use import BrowserProfile
            browser_profile = BrowserProfile(
                stealth=True,
                headless=False,  # For human-in-the-loop workflows
                viewport={"width": 1280, "height": 900}
            )
            
            # Connect to Browserless using browser-use library with correct stealth endpoint
            browser_session = BrowserSession(
                cdp_url=f"wss://production-sfo.browserless.io/chrome/stealth?token={browserless_token}",
                browser_profile=browser_profile
            )
            
            # Start the session
            await browser_session.start()
            
            # Get current page
            page = await browser_session.get_current_page()
            
            # Create CDP session for LiveURL generation using Playwright's CDP
            try:
                cdp = await page.context.new_cdp_session(page)
            except Exception as e:
                logger.error(f"Failed to create CDP session: {str(e)}")
                raise ValueError(f"Failed to establish CDP connection to browserless: {str(e)}")
            
            # Generate LiveURL for agent use (non-interactive initially)
            logger.info(f"Generating non-interactive LiveURL for session {session_id}")
            try:
                response = await cdp.send('Browserless.liveURL', {
                    "timeout": timeout_ms
                })
            except Exception as e:
                logger.error(f"Failed to generate LiveURL: {str(e)}")
                # Try alternative approach - direct connection without LiveURL for now
                raise ValueError(f"Failed to generate LiveURL: {str(e)}")
            
            live_url = response["liveURL"]
            live_url_id = response.get("liveURLId")
            logger.info(f"LiveURL generated: {live_url}")
            
            # Store session and metadata
            self.active_sessions[session_id] = browser_session
            self.session_metadata[session_id] = {
                'session_id': session_id,
                'live_url': live_url,
                'live_url_id': live_url_id,
                'timeout_ms': timeout_ms,
                'created_at': datetime.now().isoformat(),
                'status': 'active',
                'interactive': False,  # Track interactivity state
                'cdp_session': cdp
            }
            
            return {
                'success': True,
                'session_id': session_id,
                'live_url': live_url,
                'timeout_ms': timeout_ms,
                'iframe_embed': {
                    'src': live_url,
                    'width': '100%',
                    'height': '600px',
                    'style': 'border: none; border-radius: 8px;',
                    'title': "Ron's Browser Window",
                    'frameborder': '0',
                    'allowfullscreen': True
                },
                'instructions': {
                    'usage': 'Embed the live_url in an iframe in your frontend',
                    'example_html': f'<iframe src="{live_url}" width="100%" height="600px" style="border: none; border-radius: 8px;" title="Ron\'s Browser Window"></iframe>',
                    'note': 'Users can interact directly with the browser through this URL'
                },
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to create browser-use LiveURL session: {str(e)}")
            # Cleanup on failure
            if session_id in self.active_sessions:
                try:
                    await self.active_sessions[session_id].close()
                    del self.active_sessions[session_id]
                    if session_id in self.session_metadata:
                        del self.session_metadata[session_id]
                except:
                    pass
            raise
    
    async def navigate_and_get_live_url(self, session_id: str, url: str) -> Dict[str, Any]:
        """Navigate to a URL in an existing session and return the LiveURL for iframe embedding"""
        if session_id not in self.active_sessions:
            raise ValueError(f"Session {session_id} not found")
            
        try:
            browser_session = self.active_sessions[session_id]
            metadata = self.session_metadata[session_id]
            
            # Get current page
            page = await browser_session.get_current_page()
            
            # Navigate to the URL
            logger.info(f"Navigating to {url} in session {session_id}")
            await page.goto(url, wait_until='networkidle')
            
            # Update metadata
            metadata['current_url'] = url
            metadata['last_navigation'] = datetime.now().isoformat()
            
            return {
                'success': True,
                'session_id': session_id,
                'live_url': metadata['live_url'],
                'current_url': url,
                'iframe_embed': {
                    'src': metadata['live_url'],
                    'width': '100%',
                    'height': '600px',
                    'style': 'border: none; border-radius: 8px;',
                    'title': "Ron's Browser Window",
                    'frameborder': '0',
                    'allowfullscreen': True
                },
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to navigate in session {session_id}: {str(e)}")
            raise
    
    async def get_session_info(self, session_id: str) -> Dict[str, Any]:
        """Get information about a specific browser-use session"""
        if session_id not in self.session_metadata:
            raise ValueError(f"Session {session_id} not found")
            
        metadata = self.session_metadata[session_id]
        
        # Check if session is still active
        is_active = session_id in self.active_sessions
        if is_active:
            try:
                browser_session = self.active_sessions[session_id]
                page = await browser_session.get_current_page()
                current_url = page.url if page else None
            except:
                current_url = metadata.get('current_url')
                is_active = False
        else:
            current_url = metadata.get('current_url')
        
        return {
            'session_id': session_id,
            'live_url': metadata['live_url'],
            'current_url': current_url,
            'status': 'active' if is_active else 'inactive',
            'created_at': metadata['created_at'],
            'timeout_ms': metadata['timeout_ms'],
            'last_navigation': metadata.get('last_navigation'),
            'iframe_embed': {
                'src': metadata['live_url'],
                'width': '100%',
                'height': '600px',
                'style': 'border: none; border-radius: 8px;',
                'title': "Ron's Browser Window",
                'frameborder': '0',
                'allowfullscreen': True
            }
        }
    
    async def list_active_sessions(self) -> Dict[str, Any]:
        """List all active browser-use sessions"""
        sessions_info = {}
        
        for session_id in list(self.session_metadata.keys()):
            try:
                sessions_info[session_id] = await self.get_session_info(session_id)
            except Exception as e:
                logger.error(f"Error getting info for session {session_id}: {str(e)}")
                # Remove invalid session
                if session_id in self.active_sessions:
                    del self.active_sessions[session_id]
                if session_id in self.session_metadata:
                    del self.session_metadata[session_id]
        
        return {
            'total_sessions': len(sessions_info),
            'sessions': sessions_info,
            'timestamp': datetime.now().isoformat()
        }
    
    async def close_session(self, session_id: str) -> Dict[str, Any]:
        """Close a browser-use session and cleanup resources"""
        if session_id not in self.active_sessions:
            # Check if session exists in metadata but not active sessions
            if session_id in self.session_metadata:
                del self.session_metadata[session_id]
                return {
                    'success': True,
                    'session_id': session_id,
                    'status': 'session_was_already_inactive',
                    'timestamp': datetime.now().isoformat()
                }
            else:
                raise ValueError(f"Session {session_id} not found")
        
        try:
            logger.info(f"Closing browser-use session {session_id}")
            
            # Close browser session
            browser_session = self.active_sessions[session_id]
            await browser_session.close()
            
            # Remove from active sessions and metadata
            del self.active_sessions[session_id]
            if session_id in self.session_metadata:
                del self.session_metadata[session_id]
            
            return {
                'success': True,
                'session_id': session_id,
                'status': 'session_closed',
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error closing session {session_id}: {str(e)}")
            # Still remove from tracking even if close failed
            if session_id in self.active_sessions:
                del self.active_sessions[session_id]
            if session_id in self.session_metadata:
                del self.session_metadata[session_id]
            raise
    
    async def close_all_sessions(self) -> Dict[str, Any]:
        """Close all active browser-use sessions"""
        closed_sessions = []
        errors = []
        
        session_ids = list(self.active_sessions.keys())
        
        for session_id in session_ids:
            try:
                await self.close_session(session_id)
                closed_sessions.append(session_id)
            except Exception as e:
                errors.append({
                    'session_id': session_id,
                    'error': str(e)
                })
        
        return {
            'success': True,
            'closed_sessions': closed_sessions,
            'errors': errors,
            'total_closed': len(closed_sessions),
            'timestamp': datetime.now().isoformat()
        }
    
    async def enable_user_control(self, session_id: str) -> Dict[str, Any]:
        """Enable user interaction with the LiveURL (take control from agent)"""
        if session_id not in self.session_metadata:
            raise ValueError(f"Session {session_id} not found")
        
        try:
            metadata = self.session_metadata[session_id]
            cdp = metadata['cdp_session']
            
            # Close current non-interactive LiveURL
            if metadata.get('live_url_id'):
                await cdp.send('Browserless.closeLiveURL', {
                    'liveURLId': metadata['live_url_id']
                })
            
            # Create new interactive LiveURL
            response = await cdp.send('Browserless.liveURL', {
                "timeout": metadata['timeout_ms'],
                "interactive": True  # User can now control browser
            })
            
            # Update metadata
            metadata['live_url'] = response["liveURL"]
            metadata['live_url_id'] = response.get("liveURLId")
            metadata['interactive'] = True
            
            logger.info(f"Enabled user control for session {session_id}")
            
            return {
                'success': True,
                'session_id': session_id,
                'live_url': response["liveURL"],
                'interactive': True,
                'message': 'User control enabled'
            }
            
        except Exception as e:
            logger.error(f"Error enabling user control for session {session_id}: {str(e)}")
            raise RuntimeError(f"Failed to enable user control: {str(e)}")
    
    async def relinquish_user_control(self, session_id: str) -> Dict[str, Any]:
        """Disable user interaction, return control to agent"""
        if session_id not in self.session_metadata:
            raise ValueError(f"Session {session_id} not found")
        
        try:
            metadata = self.session_metadata[session_id]
            cdp = metadata['cdp_session']
            
            # Close current interactive LiveURL
            if metadata.get('live_url_id'):
                await cdp.send('Browserless.closeLiveURL', {
                    'liveURLId': metadata['live_url_id']
                })
            
            # Create new non-interactive LiveURL
            response = await cdp.send('Browserless.liveURL', {
                "timeout": metadata['timeout_ms'],
                "interactive": False  # Agent controls browser again
            })
            
            # Update metadata
            metadata['live_url'] = response["liveURL"]
            metadata['live_url_id'] = response.get("liveURLId")
            metadata['interactive'] = False
            
            logger.info(f"Relinquished user control for session {session_id}")
            
            return {
                'success': True,
                'session_id': session_id,
                'live_url': response["liveURL"],
                'interactive': False,
                'message': 'Agent control restored'
            }
            
        except Exception as e:
            logger.error(f"Error relinquishing user control for session {session_id}: {str(e)}")
            raise RuntimeError(f"Failed to relinquish user control: {str(e)}")

    async def execute_browser_task(self, session_id: str, task: str) -> Dict[str, Any]:
        """Execute a browser automation task using the browser-use Agent in the existing session"""
        if session_id not in self.active_sessions:
            raise ValueError(f"Session {session_id} not found")
        
        try:
            from browser_use import Agent
            from browser_use.llm import ChatAnthropic
            
            browser_session = self.active_sessions[session_id]
            metadata = self.session_metadata[session_id]
            
            # Verify browser session is still active
            try:
                page = await browser_session.get_current_page()
                if not page:
                    raise ValueError("Browser session page is not available")
            except Exception as e:
                logger.error(f"Browser session {session_id} is no longer active: {str(e)}")
                raise ValueError(f"Browser session is not available: {str(e)}")
            
            # Create LLM instance with proper API key check
            anthropic_api_key = os.getenv('ANTHROPIC_API_KEY')
            if not anthropic_api_key:
                raise ValueError("ANTHROPIC_API_KEY environment variable is required")
                
            llm = ChatAnthropic(
                model="claude-sonnet-4-20250514",
                api_key=anthropic_api_key
            )
            
            # Create agent with the existing browser session
            agent = Agent(
                task=task,
                llm=llm,
                browser_session=browser_session
            )
            
            logger.info(f"Starting browser-use Agent for task: {task}")
            
            # Execute the task using the agent with timeout
            try:
                result = await asyncio.wait_for(agent.run(), timeout=300.0)  # 5 minute timeout
            except asyncio.TimeoutError:
                raise RuntimeError(f"Task execution timed out after 5 minutes")
            
            logger.info(f"Browser-use Agent completed task: {task}")
            
            # Update metadata
            metadata['last_task'] = task
            metadata['last_task_result'] = str(result)
            metadata['last_task_timestamp'] = datetime.now().isoformat()
            
            return {
                'success': True,
                'session_id': session_id,
                'task': task,
                'status': 'task_completed',
                'result': str(result),
                'live_url': metadata['live_url'],
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error executing browser task in session {session_id}: {str(e)}")
            # Update metadata with error info
            if session_id in self.session_metadata:
                self.session_metadata[session_id]['last_error'] = str(e)
                self.session_metadata[session_id]['last_error_timestamp'] = datetime.now().isoformat()
            raise RuntimeError(f"Failed to execute browser task: {str(e)}")


# Global service instance
browser_use_service = BrowserUseService()


# Additional utility functions
async def get_live_url_for_iframe(timeout_ms: int = 600000) -> str:
    """
    Convenience function to quickly get a LiveURL for iframe embedding.
    Implements the exact pattern from the provided code example.
    """
    result = await browser_use_service.create_live_url_session(timeout_ms)
    return result['live_url']


async def create_browser_session_with_url(url: str, timeout_ms: int = 600000) -> Dict[str, Any]:
    """
    Create a browser session, navigate to URL, and return LiveURL for iframe embedding.
    Complete workflow for frontend integration.
    """
    # Create session
    session_result = await browser_use_service.create_live_url_session(timeout_ms)
    session_id = session_result['session_id']
    
    try:
        # Navigate to URL
        nav_result = await browser_use_service.navigate_and_get_live_url(session_id, url)
        
        return {
            'success': True,
            'session_id': session_id,
            'live_url': nav_result['live_url'],
            'url': url,
            'iframe_embed': nav_result['iframe_embed'],
            'instructions': session_result['instructions'],
            'timeout_ms': timeout_ms,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        # Cleanup on failure
        try:
            await browser_use_service.close_session(session_id)
        except:
            pass
        raise