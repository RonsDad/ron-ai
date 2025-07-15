"""
Enhanced Browser Session for Nira
Supports both local and Browserless cloud browser instances
"""

from typing import Optional, Dict, Any
from browser_use.browser.context import BrowserSession, BrowserContext, BrowserContextConfig
from playwright.async_api import Page, BrowserContext as PlaywrightContext
import logging
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)


class EnhancedBrowserSession(BrowserSession):
    """Extended version of BrowserSession with enhanced capabilities"""
    
    def __init__(
        self,
        context: PlaywrightContext,
        cached_state: Optional[dict] = None,
        current_page: Optional[Page] = None,
        session_id: Optional[str] = None,
        browser_mode: str = "local"
    ):
        super().__init__(context=context, cached_state=cached_state)
        self.current_page = current_page
        self.session_id = session_id or str(uuid.uuid4())
        self.browser_mode = browser_mode  # "local" or "browserless"
        self.created_at = datetime.now()
        
        # Enhanced capabilities
        self.cdp_session = None
        self.recording_active = False
        self.live_url = None
        self.captcha_detection_enabled = False
        
        # Session metadata
        self.metadata = {
            'session_id': self.session_id,
            'browser_mode': self.browser_mode,
            'created_at': self.created_at.isoformat(),
            'features': {
                'cdp_enabled': False,
                'recording_enabled': False,
                'live_url_enabled': False,
                'captcha_detection_enabled': False
            }
        }
    
    async def initialize_cdp_session(self) -> bool:
        """Initialize CDP session for advanced features (Browserless only)"""
        if self.browser_mode != "browserless" or not self.current_page:
            logger.warning("CDP session only available in Browserless mode")
            return False
        
        try:
            self.cdp_session = await self.current_page.createCDPSession()
            self.metadata['features']['cdp_enabled'] = True
            logger.info(f"CDP session initialized for session {self.session_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize CDP session: {e}")
            return False
    
    async def enable_captcha_detection(self) -> bool:
        """Enable automatic captcha detection (Browserless only)"""
        if not self.cdp_session:
            await self.initialize_cdp_session()
        
        if self.cdp_session:
            try:
                # Set up captcha detection listener
                self.cdp_session.on('Browserless.captchaFound', self._handle_captcha_detected)
                self.captcha_detection_enabled = True
                self.metadata['features']['captcha_detection_enabled'] = True
                logger.info(f"Captcha detection enabled for session {self.session_id}")
                return True
            except Exception as e:
                logger.error(f"Failed to enable captcha detection: {e}")
        
        return False
    
    async def generate_live_url(self, timeout: int = 600000) -> Optional[str]:
        """Generate a live URL for human interaction (Browserless only)"""
        if not self.cdp_session:
            await self.initialize_cdp_session()
        
        if self.cdp_session:
            try:
                response = await self.cdp_session.send('Browserless.liveURL', {
                    "timeout": timeout
                })
                self.live_url = response["liveURL"]
                self.metadata['features']['live_url_enabled'] = True
                logger.info(f"Live URL generated for session {self.session_id}: {self.live_url}")
                return self.live_url
            except Exception as e:
                logger.error(f"Failed to generate live URL: {e}")
        
        return None
    
    async def start_recording(self) -> bool:
        """Start session recording (Browserless only)"""
        if not self.cdp_session:
            await self.initialize_cdp_session()
        
        if self.cdp_session:
            try:
                await self.cdp_session.send("Browserless.startRecording")
                self.recording_active = True
                self.metadata['features']['recording_enabled'] = True
                logger.info(f"Recording started for session {self.session_id}")
                return True
            except Exception as e:
                logger.error(f"Failed to start recording: {e}")
        
        return False
    
    async def stop_recording(self) -> Optional[bytes]:
        """Stop session recording and return video data (Browserless only)"""
        if not self.cdp_session or not self.recording_active:
            logger.warning("No active recording to stop")
            return None
        
        try:
            response = await self.cdp_session.send("Browserless.stopRecording")
            self.recording_active = False
            logger.info(f"Recording stopped for session {self.session_id}")
            return response.get('value')
        except Exception as e:
            logger.error(f"Failed to stop recording: {e}")
            return None
    
    async def solve_captcha(self, appear_timeout: int = 20000) -> Dict[str, Any]:
        """Attempt to solve captcha automatically (Browserless only)"""
        if not self.cdp_session:
            logger.warning("CDP session required for captcha solving")
            return {"solved": False, "error": "CDP session not available"}
        
        try:
            response = await self.cdp_session.send('Browserless.solveCaptcha', {
                "appearTimeout": appear_timeout
            })
            
            result = {
                "solved": response.get("solved", False),
                "error": response.get("error")
            }
            
            if result["solved"]:
                logger.info(f"Captcha solved automatically for session {self.session_id}")
            else:
                logger.warning(f"Captcha solving failed for session {self.session_id}: {result['error']}")
            
            return result
        except Exception as e:
            logger.error(f"Error during captcha solving: {e}")
            return {"solved": False, "error": str(e)}
    
    def _handle_captcha_detected(self, event):
        """Handle captcha detection event"""
        logger.info(f"Captcha detected in session {self.session_id}")
        # This could trigger automatic solving or notify the user
        # For now, we'll just log it
    
    def get_session_info(self) -> Dict[str, Any]:
        """Get comprehensive session information"""
        return {
            **self.metadata,
            'current_url': self.current_page.url if self.current_page else None,
            'live_url': self.live_url,
            'recording_active': self.recording_active,
            'cdp_session_active': self.cdp_session is not None
        }
    
    async def cleanup(self):
        """Clean up session resources"""
        if self.recording_active:
            await self.stop_recording()
        
        if self.cdp_session:
            try:
                await self.cdp_session.detach()
            except Exception as e:
                logger.warning(f"Error detaching CDP session: {e}")
        
        logger.info(f"Session {self.session_id} cleaned up")


class EnhancedBrowserContext(BrowserContext):
    """Enhanced browser context that supports both local and Browserless modes"""
    
    def __init__(self, browser, config: BrowserContextConfig = None, browser_mode: str = "local"):
        super().__init__(browser=browser, config=config)
        self.browser_mode = browser_mode
        self.session_class = EnhancedBrowserSession
    
    async def _initialize_session(self) -> EnhancedBrowserSession:
        """Initialize an enhanced browser session"""
        playwright_browser = await self.browser.get_playwright_browser()
        context = await self._create_context(playwright_browser)
        self._add_new_page_listener(context)

        # Get existing page or create new one
        current_page = context.pages[0] if context.pages else await context.new_page()

        self.session = EnhancedBrowserSession(
            context=context,
            cached_state=None,
            current_page=current_page,
            browser_mode=self.browser_mode
        )

        # Initialize session state
        self.session.cached_state = await self._update_state()

        logger.info(f"Enhanced browser session initialized in {self.browser_mode} mode")
        return self.session
