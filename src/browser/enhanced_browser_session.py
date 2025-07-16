"""
Enhanced Browser Session for Claude Browser Integration
Supports both local and Browserless cloud browser instances with full integration capabilities
Includes MCP tool integration, voice command processing, live URL generation, and tab monitoring
"""

from typing import Optional, Dict, Any, List, Callable, Set
from browser_use.browser.context import BrowserSession, BrowserContext, BrowserContextConfig
from playwright.async_api import Page, BrowserContext as PlaywrightContext
import logging
import uuid
import asyncio
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class TabState(Enum):
    """State of a browser tab"""
    ACTIVE = "active"
    BACKGROUND = "background"
    LOADING = "loading"
    ERROR = "error"
    CLOSED = "closed"


@dataclass
class TabInfo:
    """Information about a browser tab"""
    tab_id: str
    url: str
    title: str
    state: TabState
    page: Optional[Page] = None
    screenshot: Optional[bytes] = None
    last_update: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VoiceCommandEvent:
    """Voice command event data"""
    session_id: str
    command_text: str
    confidence: float
    intent: str
    parameters: Dict[str, Any]
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class MCPToolEvent:
    """MCP tool event data"""
    session_id: str
    tool_name: str
    action: str
    parameters: Dict[str, Any]
    result: Any
    timestamp: datetime = field(default_factory=datetime.now)


class IntegratedBrowserSession(BrowserSession):
    """
    Integrated browser session with full MCP tool integration, voice command processing,
    live URL generation, and multi-tab state management functionality
    """
    
    def __init__(
        self,
        browser_context: Optional[PlaywrightContext] = None,
        agent_current_page: Optional[Page] = None,
        session_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
        browser_mode: str = "local",
        **kwargs
    ):
        # Initialize the parent BrowserSession with proper parameters
        super().__init__(
            browser_context=browser_context,
            agent_current_page=agent_current_page,
            **kwargs
        )
        
        # Core session properties
        self.session_id = session_id or str(uuid.uuid4())
        self.conversation_id = conversation_id
        self.browser_mode = browser_mode  # "local" or "browserless"
        self.created_at = datetime.now()
        
        # Enhanced capabilities
        self.cdp_session = None
        self.recording_active = False
        self.live_url = None
        self.captcha_detection_enabled = False
        
        # MCP tool integration
        self.mcp_tools: Dict[str, Any] = {}  # tool_name -> tool_instance
        self.mcp_tool_states: Dict[str, Dict[str, Any]] = {}  # tool_name -> state
        self.mcp_event_handlers: Dict[str, List[Callable]] = {}  # event -> [handlers]
        
        # Voice command processing
        self.voice_enabled = False
        self.voice_command_handlers: Dict[str, Callable] = {}  # intent -> handler
        self.voice_event_queue: List[VoiceCommandEvent] = []
        self.voice_processing_active = False
        
        # Tab monitoring and management
        self.tab_monitor_active = False
        self.tabs: Dict[str, TabInfo] = {}  # tab_id -> TabInfo
        self.active_tab_id: Optional[str] = None
        self.tab_event_handlers: Dict[str, List[Callable]] = {}  # event -> [handlers]
        self.tab_update_interval = 1.0  # seconds
        self._tab_monitor_task: Optional[asyncio.Task] = None
        
        # Live URL management
        self.live_url_config: Dict[str, Any] = {}
        self.live_url_active = False
        
        # Session metadata
        self.metadata = {
            'session_id': self.session_id,
            'conversation_id': self.conversation_id,
            'browser_mode': self.browser_mode,
            'created_at': self.created_at.isoformat(),
            'features': {
                'cdp_enabled': False,
                'recording_enabled': False,
                'live_url_enabled': False,
                'captcha_detection_enabled': False,
                'mcp_tools_enabled': False,
                'voice_enabled': False,
                'tab_monitoring_enabled': False
            },
            'integration_status': {
                'mcp_tools': {},
                'voice_agent': {'enabled': False},
                'tab_monitor': {'active': False}
            }
        }
    
    async def initialize_cdp_session(self) -> bool:
        """Initialize CDP session for advanced features (Browserless only)"""
        if self.browser_mode != "browserless" or not self.agent_current_page:
            logger.warning("CDP session only available in Browserless mode")
            return False
        
        try:
            self.cdp_session = await self.agent_current_page.createCDPSession()
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
    
    # MCP Tool Integration Methods
    async def enable_mcp_tool(self, tool_name: str, tool_instance: Any, config: Dict[str, Any] = None) -> bool:
        """
        Enable an MCP tool for this session
        
        Args:
            tool_name: Name of the MCP tool
            tool_instance: Instance of the MCP tool
            config: Optional configuration for the tool
        
        Returns:
            True if tool was enabled successfully
        """
        try:
            self.mcp_tools[tool_name] = tool_instance
            self.mcp_tool_states[tool_name] = {
                'enabled': True,
                'config': config or {},
                'enabled_at': datetime.now().isoformat(),
                'last_activity': datetime.now().isoformat(),
                'status': 'active'
            }
            
            # Update metadata
            self.metadata['features']['mcp_tools_enabled'] = True
            self.metadata['integration_status']['mcp_tools'][tool_name] = {
                'enabled': True,
                'status': 'active'
            }
            
            # Setup tool-specific event handlers if available
            if hasattr(tool_instance, 'get_event_handlers'):
                handlers = tool_instance.get_event_handlers()
                for event, handler in handlers.items():
                    self.register_mcp_event_handler(event, handler)
            
            logger.info(f"MCP tool {tool_name} enabled for session {self.session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to enable MCP tool {tool_name}: {e}")
            return False
    
    async def disable_mcp_tool(self, tool_name: str) -> bool:
        """
        Disable an MCP tool for this session
        
        Args:
            tool_name: Name of the MCP tool
        
        Returns:
            True if tool was disabled successfully
        """
        try:
            if tool_name in self.mcp_tools:
                # Cleanup tool instance if it has cleanup method
                tool_instance = self.mcp_tools[tool_name]
                if hasattr(tool_instance, 'cleanup'):
                    await tool_instance.cleanup()
                
                # Remove tool
                del self.mcp_tools[tool_name]
                
                # Update state
                if tool_name in self.mcp_tool_states:
                    self.mcp_tool_states[tool_name]['enabled'] = False
                    self.mcp_tool_states[tool_name]['disabled_at'] = datetime.now().isoformat()
                    self.mcp_tool_states[tool_name]['status'] = 'disabled'
                
                # Update metadata
                self.metadata['integration_status']['mcp_tools'][tool_name] = {
                    'enabled': False,
                    'status': 'disabled'
                }
                
                logger.info(f"MCP tool {tool_name} disabled for session {self.session_id}")
                return True
            else:
                logger.warning(f"MCP tool {tool_name} not found in session {self.session_id}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to disable MCP tool {tool_name}: {e}")
            return False
    
    async def execute_mcp_action(self, tool_name: str, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute an action using an MCP tool
        
        Args:
            tool_name: Name of the MCP tool
            action: Action to execute
            parameters: Action parameters
        
        Returns:
            Action result
        """
        try:
            if tool_name not in self.mcp_tools:
                return {'success': False, 'error': f'MCP tool {tool_name} not enabled'}
            
            tool_instance = self.mcp_tools[tool_name]
            
            # Check if tool has the requested action
            if not hasattr(tool_instance, action):
                return {'success': False, 'error': f'Action {action} not available in tool {tool_name}'}
            
            # Execute the action
            action_method = getattr(tool_instance, action)
            result = await action_method(**parameters) if asyncio.iscoroutinefunction(action_method) else action_method(**parameters)
            
            # Update tool state
            self.mcp_tool_states[tool_name]['last_activity'] = datetime.now().isoformat()
            
            # Create event
            event = MCPToolEvent(
                session_id=self.session_id,
                tool_name=tool_name,
                action=action,
                parameters=parameters,
                result=result
            )
            
            # Trigger event handlers
            await self._trigger_mcp_event('action_executed', event)
            
            logger.info(f"MCP action executed: {tool_name}.{action} for session {self.session_id}")
            return {'success': True, 'result': result}
            
        except Exception as e:
            logger.error(f"Failed to execute MCP action {tool_name}.{action}: {e}")
            return {'success': False, 'error': str(e)}
    
    def register_mcp_event_handler(self, event: str, handler: Callable) -> None:
        """
        Register an event handler for MCP events
        
        Args:
            event: Event name
            handler: Event handler function
        """
        if event not in self.mcp_event_handlers:
            self.mcp_event_handlers[event] = []
        
        self.mcp_event_handlers[event].append(handler)
        logger.debug(f"MCP event handler registered for {event} in session {self.session_id}")
    
    async def _trigger_mcp_event(self, event: str, event_data: MCPToolEvent) -> None:
        """
        Trigger MCP event handlers
        
        Args:
            event: Event name
            event_data: Event data
        """
        if event in self.mcp_event_handlers:
            for handler in self.mcp_event_handlers[event]:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(event_data)
                    else:
                        handler(event_data)
                except Exception as e:
                    logger.error(f"Error in MCP event handler for {event}: {e}")
    
    # Voice Command Processing Methods
    async def enable_voice_processing(self, command_handlers: Dict[str, Callable] = None) -> bool:
        """
        Enable voice command processing for this session
        
        Args:
            command_handlers: Optional custom command handlers
        
        Returns:
            True if voice processing was enabled successfully
        """
        try:
            self.voice_enabled = True
            self.voice_command_handlers = command_handlers or {}
            
            # Setup default command handlers
            self._setup_default_voice_handlers()
            
            # Update metadata
            self.metadata['features']['voice_enabled'] = True
            self.metadata['integration_status']['voice_agent']['enabled'] = True
            
            logger.info(f"Voice processing enabled for session {self.session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to enable voice processing: {e}")
            return False
    
    def _setup_default_voice_handlers(self) -> None:
        """Setup default voice command handlers"""
        default_handlers = {
            'navigate': self._handle_navigate_command,
            'click': self._handle_click_command,
            'type': self._handle_type_command,
            'scroll': self._handle_scroll_command,
            'human_control': self._handle_human_control_command
        }
        
        # Add default handlers if not already provided
        for intent, handler in default_handlers.items():
            if intent not in self.voice_command_handlers:
                self.voice_command_handlers[intent] = handler
    
    async def process_voice_command(self, command_text: str, confidence: float = 1.0) -> Dict[str, Any]:
        """
        Process a voice command
        
        Args:
            command_text: Voice command text
            confidence: Recognition confidence
        
        Returns:
            Command processing result
        """
        if not self.voice_enabled:
            return {'success': False, 'error': 'Voice processing not enabled'}
        
        try:
            # Parse command intent
            intent = self._parse_voice_intent(command_text)
            parameters = self._extract_voice_parameters(command_text, intent)
            
            # Create voice command event
            event = VoiceCommandEvent(
                session_id=self.session_id,
                command_text=command_text,
                confidence=confidence,
                intent=intent,
                parameters=parameters
            )
            
            # Add to event queue
            self.voice_event_queue.append(event)
            
            # Process command
            if intent in self.voice_command_handlers:
                handler = self.voice_command_handlers[intent]
                result = await handler(event) if asyncio.iscoroutinefunction(handler) else handler(event)
            else:
                result = {'success': False, 'error': f'No handler for intent: {intent}'}
            
            logger.info(f"Voice command processed: {intent} for session {self.session_id}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to process voice command: {e}")
            return {'success': False, 'error': str(e)}
    
    def _parse_voice_intent(self, command_text: str) -> str:
        """Parse voice command to determine intent"""
        command_lower = command_text.lower()
        
        if any(word in command_lower for word in ['navigate', 'go to', 'visit']):
            return 'navigate'
        elif any(word in command_lower for word in ['click', 'press', 'tap']):
            return 'click'
        elif any(word in command_lower for word in ['type', 'enter', 'input']):
            return 'type'
        elif any(word in command_lower for word in ['scroll', 'move']):
            return 'scroll'
        elif any(word in command_lower for word in ['take control', 'human control']):
            return 'human_control'
        else:
            return 'unknown'
    
    def _extract_voice_parameters(self, command_text: str, intent: str) -> Dict[str, Any]:
        """Extract parameters from voice command based on intent"""
        # Simplified parameter extraction - would use NLP in real implementation
        parameters = {}
        
        if intent == 'navigate':
            # Extract URL or search term
            words = command_text.lower().split()
            if 'to' in words:
                idx = words.index('to')
                if idx + 1 < len(words):
                    parameters['target'] = ' '.join(words[idx + 1:])
        elif intent == 'type':
            # Extract text to type
            words = command_text.lower().split()
            if any(word in words for word in ['type', 'enter', 'input']):
                for word in ['type', 'enter', 'input']:
                    if word in words:
                        idx = words.index(word)
                        if idx + 1 < len(words):
                            parameters['text'] = ' '.join(words[idx + 1:])
                        break
        
        return parameters
    
    # Default voice command handlers
    async def _handle_navigate_command(self, event: VoiceCommandEvent) -> Dict[str, Any]:
        """Handle navigate voice command"""
        target = event.parameters.get('target', '')
        if target and self.agent_current_page:
            try:
                await self.agent_current_page.goto(target)
                return {'success': True, 'action': 'navigate', 'target': target}
            except Exception as e:
                return {'success': False, 'error': str(e)}
        return {'success': False, 'error': 'No target specified'}
    
    async def _handle_click_command(self, event: VoiceCommandEvent) -> Dict[str, Any]:
        """Handle click voice command"""
        # Placeholder - would implement element selection logic
        return {'success': True, 'action': 'click', 'note': 'Click command received'}
    
    async def _handle_type_command(self, event: VoiceCommandEvent) -> Dict[str, Any]:
        """Handle type voice command"""
        text = event.parameters.get('text', '')
        if text and self.agent_current_page:
            try:
                await self.agent_current_page.keyboard.type(text)
                return {'success': True, 'action': 'type', 'text': text}
            except Exception as e:
                return {'success': False, 'error': str(e)}
        return {'success': False, 'error': 'No text specified'}
    
    async def _handle_scroll_command(self, event: VoiceCommandEvent) -> Dict[str, Any]:
        """Handle scroll voice command"""
        # Placeholder - would implement scroll logic
        return {'success': True, 'action': 'scroll', 'note': 'Scroll command received'}
    
    async def _handle_human_control_command(self, event: VoiceCommandEvent) -> Dict[str, Any]:
        """Handle human control voice command"""
        # Placeholder - would trigger human control transition
        return {'success': True, 'action': 'human_control', 'note': 'Human control requested via voice'}
    
    # Tab Monitoring and Multi-Tab State Management Methods
    async def enable_tab_monitoring(self, update_interval: float = 1.0) -> bool:
        """
        Enable tab monitoring for multi-tab state management
        
        Args:
            update_interval: Interval in seconds between tab state updates
        
        Returns:
            True if tab monitoring was enabled successfully
        """
        try:
            if self.tab_monitor_active:
                logger.warning(f"Tab monitoring already active for session {self.session_id}")
                return True
            
            self.tab_update_interval = update_interval
            self.tab_monitor_active = True
            
            # Initialize current tab info
            await self._initialize_tab_info()
            
            # Start monitoring task
            self._tab_monitor_task = asyncio.create_task(self._tab_monitor_loop())
            
            # Update metadata
            self.metadata['features']['tab_monitoring_enabled'] = True
            self.metadata['integration_status']['tab_monitor']['active'] = True
            
            logger.info(f"Tab monitoring enabled for session {self.session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to enable tab monitoring: {e}")
            return False
    
    async def disable_tab_monitoring(self) -> bool:
        """
        Disable tab monitoring
        
        Returns:
            True if tab monitoring was disabled successfully
        """
        try:
            if not self.tab_monitor_active:
                return True
            
            self.tab_monitor_active = False
            
            # Cancel monitoring task
            if self._tab_monitor_task and not self._tab_monitor_task.done():
                self._tab_monitor_task.cancel()
                try:
                    await self._tab_monitor_task
                except asyncio.CancelledError:
                    pass
            
            # Update metadata
            self.metadata['features']['tab_monitoring_enabled'] = False
            self.metadata['integration_status']['tab_monitor']['active'] = False
            
            logger.info(f"Tab monitoring disabled for session {self.session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to disable tab monitoring: {e}")
            return False
    
    async def _initialize_tab_info(self) -> None:
        """Initialize tab information from current browser context"""
        if not self.browser_context:
            return
        
        try:
            # Get all pages (tabs) from the browser context
            pages = self.browser_context.pages
            
            for page in pages:
                tab_id = str(id(page))  # Use page object id as tab_id
                
                # Create tab info
                tab_info = TabInfo(
                    tab_id=tab_id,
                    url=page.url,
                    title=await page.title() if page else "Loading...",
                    state=TabState.ACTIVE if page == self.agent_current_page else TabState.BACKGROUND,
                    page=page
                )
                
                self.tabs[tab_id] = tab_info
                
                # Set active tab
                if page == self.agent_current_page:
                    self.active_tab_id = tab_id
            
            logger.debug(f"Initialized {len(self.tabs)} tabs for session {self.session_id}")
            
        except Exception as e:
            logger.error(f"Failed to initialize tab info: {e}")
    
    async def _tab_monitor_loop(self) -> None:
        """Main tab monitoring loop"""
        while self.tab_monitor_active:
            try:
                await self._update_tab_states()
                await asyncio.sleep(self.tab_update_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in tab monitor loop: {e}")
                await asyncio.sleep(self.tab_update_interval)
    
    async def _update_tab_states(self) -> None:
        """Update the state of all tabs"""
        if not self.browser_context:
            return
        
        try:
            current_pages = self.browser_context.pages
            current_page_ids = {str(id(page)): page for page in current_pages}
            
            # Update existing tabs
            for tab_id, tab_info in list(self.tabs.items()):
                if tab_id in current_page_ids:
                    page = current_page_ids[tab_id]
                    
                    # Update tab info
                    old_url = tab_info.url
                    old_title = tab_info.title
                    
                    tab_info.url = page.url
                    tab_info.title = await page.title() if page else "Loading..."
                    tab_info.state = TabState.ACTIVE if page == self.agent_current_page else TabState.BACKGROUND
                    tab_info.last_update = datetime.now()
                    
                    # Check for changes and trigger events
                    if old_url != tab_info.url:
                        await self._trigger_tab_event('url_changed', tab_info, {'old_url': old_url})
                    
                    if old_title != tab_info.title:
                        await self._trigger_tab_event('title_changed', tab_info, {'old_title': old_title})
                    
                    # Update active tab
                    if page == self.agent_current_page and self.active_tab_id != tab_id:
                        old_active_tab = self.active_tab_id
                        self.active_tab_id = tab_id
                        await self._trigger_tab_event('tab_activated', tab_info, {'old_active_tab': old_active_tab})
                else:
                    # Tab was closed
                    tab_info.state = TabState.CLOSED
                    await self._trigger_tab_event('tab_closed', tab_info)
                    del self.tabs[tab_id]
            
            # Add new tabs
            for page_id, page in current_page_ids.items():
                if page_id not in self.tabs:
                    tab_info = TabInfo(
                        tab_id=page_id,
                        url=page.url,
                        title=await page.title() if page else "Loading...",
                        state=TabState.ACTIVE if page == self.agent_current_page else TabState.BACKGROUND,
                        page=page
                    )
                    
                    self.tabs[page_id] = tab_info
                    await self._trigger_tab_event('tab_created', tab_info)
            
        except Exception as e:
            logger.error(f"Failed to update tab states: {e}")
    
    async def switch_to_tab(self, tab_id: str) -> bool:
        """
        Switch to a specific tab
        
        Args:
            tab_id: ID of the tab to switch to
        
        Returns:
            True if tab switch was successful
        """
        try:
            if tab_id not in self.tabs:
                logger.error(f"Tab {tab_id} not found in session {self.session_id}")
                return False
            
            tab_info = self.tabs[tab_id]
            if not tab_info.page:
                logger.error(f"Tab {tab_id} has no associated page")
                return False
            
            # Switch to the tab
            old_active_tab = self.active_tab_id
            self.agent_current_page = tab_info.page
            self.active_tab_id = tab_id
            
            # Update tab states
            for tid, tinfo in self.tabs.items():
                if tid == tab_id:
                    tinfo.state = TabState.ACTIVE
                else:
                    tinfo.state = TabState.BACKGROUND
            
            # Trigger event
            await self._trigger_tab_event('tab_switched', tab_info, {'old_active_tab': old_active_tab})
            
            logger.info(f"Switched to tab {tab_id} in session {self.session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to switch to tab {tab_id}: {e}")
            return False
    
    async def close_tab(self, tab_id: str) -> bool:
        """
        Close a specific tab
        
        Args:
            tab_id: ID of the tab to close
        
        Returns:
            True if tab was closed successfully
        """
        try:
            if tab_id not in self.tabs:
                logger.error(f"Tab {tab_id} not found in session {self.session_id}")
                return False
            
            tab_info = self.tabs[tab_id]
            if not tab_info.page:
                logger.error(f"Tab {tab_id} has no associated page")
                return False
            
            # Close the page
            await tab_info.page.close()
            
            # Update tab state
            tab_info.state = TabState.CLOSED
            
            # If this was the active tab, switch to another tab
            if self.active_tab_id == tab_id:
                remaining_tabs = [tid for tid, tinfo in self.tabs.items() 
                                if tid != tab_id and tinfo.state != TabState.CLOSED]
                if remaining_tabs:
                    await self.switch_to_tab(remaining_tabs[0])
                else:
                    self.active_tab_id = None
                    self.agent_current_page = None
            
            # Remove from tabs dict
            del self.tabs[tab_id]
            
            # Trigger event
            await self._trigger_tab_event('tab_closed', tab_info)
            
            logger.info(f"Closed tab {tab_id} in session {self.session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to close tab {tab_id}: {e}")
            return False
    
    async def create_new_tab(self, url: Optional[str] = None) -> Optional[str]:
        """
        Create a new tab
        
        Args:
            url: Optional URL to navigate to
        
        Returns:
            Tab ID of the new tab, or None if creation failed
        """
        try:
            if not self.browser_context:
                logger.error("No browser context available for creating new tab")
                return None
            
            # Create new page
            new_page = await self.browser_context.new_page()
            tab_id = str(id(new_page))
            
            # Navigate to URL if provided
            if url:
                await new_page.goto(url)
            
            # Create tab info
            tab_info = TabInfo(
                tab_id=tab_id,
                url=new_page.url,
                title=await new_page.title() if new_page else "New Tab",
                state=TabState.BACKGROUND,
                page=new_page
            )
            
            self.tabs[tab_id] = tab_info
            
            # Trigger event
            await self._trigger_tab_event('tab_created', tab_info)
            
            logger.info(f"Created new tab {tab_id} in session {self.session_id}")
            return tab_id
            
        except Exception as e:
            logger.error(f"Failed to create new tab: {e}")
            return None
    
    def get_tab_info(self, tab_id: str) -> Optional[TabInfo]:
        """
        Get information about a specific tab
        
        Args:
            tab_id: ID of the tab
        
        Returns:
            Tab information or None if not found
        """
        return self.tabs.get(tab_id)
    
    def get_all_tabs(self) -> List[TabInfo]:
        """
        Get information about all tabs
        
        Returns:
            List of tab information
        """
        return list(self.tabs.values())
    
    def get_active_tab(self) -> Optional[TabInfo]:
        """
        Get information about the active tab
        
        Returns:
            Active tab information or None if no active tab
        """
        if self.active_tab_id:
            return self.tabs.get(self.active_tab_id)
        return None
    
    def register_tab_event_handler(self, event: str, handler: Callable) -> None:
        """
        Register an event handler for tab events
        
        Args:
            event: Event name (e.g., 'tab_created', 'tab_closed', 'tab_switched')
            handler: Event handler function
        """
        if event not in self.tab_event_handlers:
            self.tab_event_handlers[event] = []
        
        self.tab_event_handlers[event].append(handler)
        logger.debug(f"Tab event handler registered for {event} in session {self.session_id}")
    
    async def _trigger_tab_event(self, event: str, tab_info: TabInfo, extra_data: Dict[str, Any] = None) -> None:
        """
        Trigger tab event handlers
        
        Args:
            event: Event name
            tab_info: Tab information
            extra_data: Additional event data
        """
        if event in self.tab_event_handlers:
            event_data = {
                'session_id': self.session_id,
                'tab_info': tab_info,
                'timestamp': datetime.now(),
                **(extra_data or {})
            }
            
            for handler in self.tab_event_handlers[event]:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(event_data)
                    else:
                        handler(event_data)
                except Exception as e:
                    logger.error(f"Error in tab event handler for {event}: {e}")
    
    # Live URL Generation and Management Methods
    async def enable_live_url_generation(self, config: Dict[str, Any] = None) -> bool:
        """
        Enable live URL generation for embedded browser viewing
        
        Args:
            config: Optional configuration for live URL generation
        
        Returns:
            True if live URL generation was enabled successfully
        """
        try:
            self.live_url_config = config or {}
            
            # Generate live URL if in Browserless mode
            if self.browser_mode == "browserless":
                timeout = self.live_url_config.get('timeout', 600000)
                live_url = await self.generate_live_url(timeout)
                
                if live_url:
                    self.live_url_active = True
                    self.metadata['features']['live_url_enabled'] = True
                    logger.info(f"Live URL generation enabled for session {self.session_id}: {live_url}")
                    return True
                else:
                    logger.error(f"Failed to generate live URL for session {self.session_id}")
                    return False
            else:
                # For local mode, we would implement a different live viewing mechanism
                self.live_url_active = True
                self.metadata['features']['live_url_enabled'] = True
                logger.info(f"Live URL generation enabled for local session {self.session_id}")
                return True
                
        except Exception as e:
            logger.error(f"Failed to enable live URL generation: {e}")
            return False
    
    async def disable_live_url_generation(self) -> bool:
        """
        Disable live URL generation
        
        Returns:
            True if live URL generation was disabled successfully
        """
        try:
            self.live_url_active = False
            self.live_url = None
            self.metadata['features']['live_url_enabled'] = False
            
            logger.info(f"Live URL generation disabled for session {self.session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to disable live URL generation: {e}")
            return False
    
    def get_live_url(self) -> Optional[str]:
        """
        Get the current live URL for embedded browser viewing
        
        Returns:
            Live URL or None if not available
        """
        return self.live_url if self.live_url_active else None
    
    def get_session_info(self) -> Dict[str, Any]:
        """Get comprehensive session information"""
        return {
            **self.metadata,
            'current_url': self.agent_current_page.url if self.agent_current_page else None,
            'live_url': self.live_url,
            'recording_active': self.recording_active,
            'cdp_session_active': self.cdp_session is not None,
            'mcp_tools': {
                tool_name: {
                    'enabled': state.get('enabled', False),
                    'status': state.get('status', 'unknown'),
                    'last_activity': state.get('last_activity')
                }
                for tool_name, state in self.mcp_tool_states.items()
            },
            'voice_processing': {
                'enabled': self.voice_enabled,
                'command_queue_size': len(self.voice_event_queue),
                'processing_active': self.voice_processing_active
            },
            'tab_monitoring': {
                'active': self.tab_monitor_active,
                'total_tabs': len(self.tabs),
                'active_tab_id': self.active_tab_id,
                'tabs': [
                    {
                        'tab_id': tab_info.tab_id,
                        'url': tab_info.url,
                        'title': tab_info.title,
                        'state': tab_info.state.value,
                        'last_update': tab_info.last_update.isoformat()
                    }
                    for tab_info in self.tabs.values()
                ]
            },
            'live_url_management': {
                'active': self.live_url_active,
                'url': self.live_url,
                'config': self.live_url_config
            }
        }
    
    async def cleanup(self):
        """Clean up session resources"""
        try:
            # Disable tab monitoring
            if self.tab_monitor_active:
                await self.disable_tab_monitoring()
            
            # Cleanup MCP tools
            for tool_name in list(self.mcp_tools.keys()):
                await self.disable_mcp_tool(tool_name)
            
            # Disable voice processing
            if self.voice_enabled:
                self.voice_enabled = False
                self.voice_event_queue.clear()
            
            # Disable live URL generation
            if self.live_url_active:
                await self.disable_live_url_generation()
            
            # Stop recording if active
            if self.recording_active:
                await self.stop_recording()
            
            # Detach CDP session
            if self.cdp_session:
                try:
                    await self.cdp_session.detach()
                except Exception as e:
                    logger.warning(f"Error detaching CDP session: {e}")
            
            logger.info(f"Integrated session {self.session_id} cleaned up successfully")
            
        except Exception as e:
            logger.error(f"Error during session cleanup: {e}")


# Keep the original EnhancedBrowserSession for backward compatibility
class EnhancedBrowserSession(IntegratedBrowserSession):
    """Backward compatibility alias for IntegratedBrowserSession"""
    pass


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
