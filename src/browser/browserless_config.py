"""
Browserless Configuration Manager for Nira
Handles configuration and connection setup for Browserless cloud browsers
"""

import os
from typing import Optional, Dict, Any
from dataclasses import dataclass
from browser_use.browser.browser import BrowserConfig
import logging

logger = logging.getLogger(__name__)


@dataclass
class BrowserlessConfig:
    """Configuration for Browserless integration"""
    api_token: str
    endpoint: str = "wss://production-sfo.browserless.io/chromium"
    use_residential_proxy: bool = False
    timeout: int = 600000  # 10 minutes default
    region: str = "sfo"  # San Francisco default
    
    # Advanced features
    enable_live_url: bool = False
    enable_captcha_solving: bool = False
    enable_recording: bool = False
    
    # Connection settings
    max_concurrent_sessions: int = 5
    session_timeout: int = 3600000  # 1 hour
    
    def __post_init__(self):
        """Validate configuration after initialization"""
        if not self.api_token:
            raise ValueError("Browserless API token is required")
        
        if not self.endpoint.startswith("wss://"):
            raise ValueError("Browserless endpoint must be a WebSocket URL (wss://)")
    
    @classmethod
    def from_env(cls) -> 'BrowserlessConfig':
        """Create configuration from environment variables"""
        api_token = os.getenv('BROWSERLESS_API_TOKEN')
        if not api_token:
            raise ValueError("BROWSERLESS_API_TOKEN environment variable is required")
        
        return cls(
            api_token=api_token,
            endpoint=os.getenv('BROWSERLESS_ENDPOINT', 'wss://production-sfo.browserless.io/chromium'),
            use_residential_proxy=os.getenv('BROWSERLESS_USE_RESIDENTIAL_PROXY', 'false').lower() == 'true',
            timeout=int(os.getenv('BROWSERLESS_TIMEOUT', '600000')),
            enable_live_url=os.getenv('BROWSERLESS_ENABLE_LIVE_URL', 'false').lower() == 'true',
            enable_captcha_solving=os.getenv('BROWSERLESS_ENABLE_CAPTCHA_SOLVING', 'false').lower() == 'true',
            enable_recording=os.getenv('BROWSERLESS_ENABLE_RECORDING', 'false').lower() == 'true',
        )
    
    def get_connection_url(self) -> str:
        """Generate the full connection URL with parameters"""
        url = f"{self.endpoint}?token={self.api_token}"
        
        if self.use_residential_proxy:
            url += "&proxy=residential"
        
        # Add timeout parameter
        url += f"&timeout={self.timeout}"
        
        return url
    
    def to_browser_config(self) -> BrowserConfig:
        """Convert to browser-use BrowserConfig"""
        return BrowserConfig(
            cdp_url=self.get_connection_url(),
            headless=True,  # Browserless is always headless from client perspective
        )
    
    def get_feature_flags(self) -> Dict[str, bool]:
        """Get enabled feature flags"""
        return {
            'live_url': self.enable_live_url,
            'captcha_solving': self.enable_captcha_solving,
            'recording': self.enable_recording,
            'residential_proxy': self.use_residential_proxy
        }


class BrowserlessManager:
    """Manager for Browserless browser instances and sessions"""
    
    def __init__(self, config: BrowserlessConfig):
        self.config = config
        self.active_sessions = {}
        self.session_count = 0
        
    def is_available(self) -> bool:
        """Check if Browserless is properly configured and available"""
        try:
            # Basic configuration check
            if not self.config.api_token:
                return False
            
            # Check if we're under session limits
            if len(self.active_sessions) >= self.config.max_concurrent_sessions:
                logger.warning(f"Maximum concurrent sessions ({self.config.max_concurrent_sessions}) reached")
                return False
            
            return True
        except Exception as e:
            logger.error(f"Error checking Browserless availability: {e}")
            return False
    
    def get_browser_config(self) -> BrowserConfig:
        """Get browser configuration for Browserless"""
        if not self.is_available():
            raise RuntimeError("Browserless is not available")
        
        return self.config.to_browser_config()
    
    def register_session(self, session_id: str, session_info: Dict[str, Any]):
        """Register a new browser session"""
        self.active_sessions[session_id] = {
            'session_info': session_info,
            'created_at': session_info.get('created_at'),
            'features': session_info.get('features', {})
        }
        self.session_count += 1
        logger.info(f"Registered Browserless session {session_id} (total: {len(self.active_sessions)})")
    
    def unregister_session(self, session_id: str):
        """Unregister a browser session"""
        if session_id in self.active_sessions:
            del self.active_sessions[session_id]
            logger.info(f"Unregistered Browserless session {session_id} (remaining: {len(self.active_sessions)})")
    
    def get_session_info(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific session"""
        return self.active_sessions.get(session_id)
    
    def get_all_sessions(self) -> Dict[str, Dict[str, Any]]:
        """Get information about all active sessions"""
        return self.active_sessions.copy()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get usage statistics"""
        return {
            'total_sessions_created': self.session_count,
            'active_sessions': len(self.active_sessions),
            'max_concurrent_sessions': self.config.max_concurrent_sessions,
            'features_enabled': self.config.get_feature_flags(),
            'endpoint': self.config.endpoint,
            'use_residential_proxy': self.config.use_residential_proxy
        }


def create_browserless_manager() -> Optional[BrowserlessManager]:
    """Create a Browserless manager from environment configuration"""
    try:
        # Check if Browserless is enabled
        if not os.getenv('USE_BROWSERLESS', 'false').lower() == 'true':
            logger.info("Browserless integration is disabled")
            return None
        
        # Create configuration from environment
        config = BrowserlessConfig.from_env()
        manager = BrowserlessManager(config)
        
        logger.info(f"Browserless manager created with endpoint: {config.endpoint}")
        logger.info(f"Features enabled: {config.get_feature_flags()}")
        
        return manager
        
    except ValueError as e:
        logger.warning(f"Browserless configuration error: {e}")
        return None
    except Exception as e:
        logger.error(f"Failed to create Browserless manager: {e}")
        return None


def test_browserless_connection(config: BrowserlessConfig) -> bool:
    """Test connection to Browserless (basic validation)"""
    try:
        # Basic URL validation
        connection_url = config.get_connection_url()
        if not connection_url.startswith("wss://"):
            return False
        
        # Check if token is present
        if "token=" not in connection_url:
            return False
        
        logger.info(f"Browserless connection URL validated: {config.endpoint}")
        return True
        
    except Exception as e:
        logger.error(f"Browserless connection test failed: {e}")
        return False
