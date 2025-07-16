"""
Enhanced Browser Manager for Claude Browser Integration
Integrates Browserless cloud browsers with existing browser-use architecture
Supports conversation-aware sessions, MCP tools, and voice agent integration
"""

import os
import asyncio
import logging
from typing import Optional, Dict, Any, Union, List, Callable
from datetime import datetime
import uuid
from dataclasses import dataclass, field
from enum import Enum

from browser_use import Agent
from browser_use.browser import BrowserProfile, BrowserSession
from browser_use.llm import ChatAnthropic, ChatGoogle

from .browserless_config import BrowserlessConfig, BrowserlessManager, create_browserless_manager
from .enhanced_browser_session import EnhancedBrowserSession, EnhancedBrowserContext

logger = logging.getLogger(__name__)


class MCPToolStatus(Enum):
    """Status of MCP tool integration"""
    DISABLED = "disabled"
    INITIALIZING = "initializing"
    ACTIVE = "active"
    ERROR = "error"
    AUTHENTICATING = "authenticating"


class VoiceAgentStatus(Enum):
    """Status of voice agent integration"""
    DISABLED = "disabled"
    INITIALIZING = "initializing"
    ACTIVE = "active"
    ERROR = "error"
    LISTENING = "listening"
    PROCESSING = "processing"


@dataclass
class MCPToolConfig:
    """Configuration for MCP tool integration"""
    tool_name: str
    enabled: bool = True
    credentials: Dict[str, Any] = field(default_factory=dict)
    settings: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VoiceConfig:
    """Configuration for voice agent integration"""
    provider: str = "telnyx"  # 'telnyx' or 'vapi'
    language: str = "en-US"
    enable_phone_calls: bool = False
    phone_number: Optional[str] = None
    voice_commands_enabled: bool = True
    audio_feedback_enabled: bool = True


@dataclass
class IntegrationConfig:
    """Configuration for all integrations"""
    mcp_tools: List[MCPToolConfig] = field(default_factory=list)
    voice_config: Optional[VoiceConfig] = None
    enable_live_view: bool = True
    enable_human_control: bool = True


@dataclass
class SessionMetadata:
    """Metadata for conversation-aware sessions"""
    session_id: str
    conversation_id: str
    created_at: datetime
    last_activity: datetime
    context: Dict[str, Any] = field(default_factory=dict)
    tool_states: Dict[str, Any] = field(default_factory=dict)


class EnhancedBrowserManager:
    """
    Enhanced browser manager that supports both local and Browserless cloud browsers
    Integrates with existing browser architecture and adds conversation-aware sessions,
    MCP tool registration, and voice agent integration
    """
    
    def __init__(self):
        self.browser_mode = "local"  # "local", "browserless", or "hybrid"
        self.browserless_manager: Optional[BrowserlessManager] = None
        self.local_sessions: Dict[str, BrowserSession] = {}
        self.cloud_sessions: Dict[str, EnhancedBrowserSession] = {}
        self.active_agents: Dict[str, Agent] = {}
        
        # Integration support
        self.conversation_sessions: Dict[str, List[str]] = {}  # conversation_id -> [session_ids]
        self.session_metadata: Dict[str, SessionMetadata] = {}  # session_id -> metadata
        self.mcp_integrations: Dict[str, Any] = {}  # tool_name -> integration instance
        self.voice_agent: Optional[Any] = None  # Voice agent instance
        self.registered_mcp_tools: Dict[str, MCPToolConfig] = {}  # tool_name -> config
        
        # Advanced integration features
        self.session_lifecycle_hooks: Dict[str, List[Callable]] = {}  # event -> [callbacks]
        self.mcp_tool_registry: Dict[str, Dict[str, Any]] = {}  # tool_name -> tool_info
        self.voice_session_registry: Dict[str, Dict[str, Any]] = {}  # session_id -> voice_info
        self.integration_event_handlers: Dict[str, Callable] = {}  # event_type -> handler
        
        # Initialize Browserless if configured
        self._initialize_browserless()
        
        # Setup default lifecycle hooks
        self._setup_default_hooks()
    
    def _setup_default_hooks(self) -> None:
        """Setup default lifecycle hooks for session management"""
        # Session lifecycle events
        self.session_lifecycle_hooks = {
            'session_created': [],
            'session_started': [],
            'session_closed': [],
            'mcp_tool_enabled': [],
            'mcp_tool_disabled': [],
            'voice_enabled': [],
            'voice_disabled': [],
            'human_control_requested': [],
            'human_control_granted': [],
            'human_control_returned': []
        }
        
        # Default event handlers
        self.integration_event_handlers = {
            'mcp_authentication_required': self._handle_mcp_auth_required,
            'voice_command_received': self._handle_voice_command,
            'session_error': self._handle_session_error,
            'integration_failure': self._handle_integration_failure
        }
        
        logger.info("Default lifecycle hooks and event handlers initialized")
    
    def register_lifecycle_hook(self, event: str, callback: Callable) -> None:
        """
        Register a callback for a session lifecycle event
        
        Args:
            event: Event name (e.g., 'session_created', 'mcp_tool_enabled')
            callback: Callback function to execute
        """
        if event not in self.session_lifecycle_hooks:
            self.session_lifecycle_hooks[event] = []
        
        self.session_lifecycle_hooks[event].append(callback)
        logger.debug(f"Lifecycle hook registered for event: {event}")
    
    async def _trigger_lifecycle_event(self, event: str, session_id: str, **kwargs) -> None:
        """
        Trigger all callbacks for a lifecycle event
        
        Args:
            event: Event name
            session_id: Session ID
            **kwargs: Additional event data
        """
        if event in self.session_lifecycle_hooks:
            for callback in self.session_lifecycle_hooks[event]:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(session_id, **kwargs)
                    else:
                        callback(session_id, **kwargs)
                except Exception as e:
                    logger.error(f"Error in lifecycle hook for {event}: {e}")
    
    # Advanced MCP tool management
    async def register_advanced_mcp_tool(
        self,
        tool_name: str,
        tool_class: type,
        default_config: Dict[str, Any],
        authentication_handler: Optional[Callable] = None
    ) -> None:
        """
        Register an advanced MCP tool with custom implementation
        
        Args:
            tool_name: Name of the MCP tool
            tool_class: Class implementing the MCP tool
            default_config: Default configuration for the tool
            authentication_handler: Optional custom authentication handler
        """
        self.mcp_tool_registry[tool_name] = {
            'tool_class': tool_class,
            'default_config': default_config,
            'authentication_handler': authentication_handler,
            'registered_at': datetime.now(),
            'active_sessions': set()
        }
        
        logger.info(f"Advanced MCP tool registered: {tool_name}")
    
    async def authenticate_mcp_tool(
        self,
        session_id: str,
        tool_name: str,
        credentials: Dict[str, Any]
    ) -> bool:
        """
        Authenticate an MCP tool for a session
        
        Args:
            session_id: Session ID
            tool_name: Name of the MCP tool
            credentials: Authentication credentials
        
        Returns:
            True if authentication successful
        """
        try:
            if tool_name not in self.mcp_tool_registry:
                logger.error(f"MCP tool not registered: {tool_name}")
                return False
            
            tool_info = self.mcp_tool_registry[tool_name]
            auth_handler = tool_info.get('authentication_handler')
            
            if auth_handler:
                # Use custom authentication handler
                success = await auth_handler(session_id, credentials)
            else:
                # Default authentication (placeholder)
                success = True  # Would implement actual auth logic
            
            if success:
                # Update tool state
                self.update_tool_state(session_id, tool_name, {
                    'status': MCPToolStatus.ACTIVE.value,
                    'authenticated_at': datetime.now().isoformat()
                })
                
                # Add to active sessions
                tool_info['active_sessions'].add(session_id)
                
                # Trigger lifecycle event
                await self._trigger_lifecycle_event('mcp_tool_enabled', session_id, tool_name=tool_name)
                
                logger.info(f"MCP tool {tool_name} authenticated for session {session_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to authenticate MCP tool {tool_name}: {e}")
            self.update_tool_state(session_id, tool_name, {
                'status': MCPToolStatus.ERROR.value,
                'error': str(e)
            })
            return False
    
    async def execute_mcp_action(
        self,
        session_id: str,
        tool_name: str,
        action: str,
        parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute an action using an MCP tool
        
        Args:
            session_id: Session ID
            tool_name: Name of the MCP tool
            action: Action to execute
            parameters: Action parameters
        
        Returns:
            Action result
        """
        try:
            if tool_name not in self.mcp_tool_registry:
                return {'success': False, 'error': f'MCP tool not registered: {tool_name}'}
            
            tool_info = self.mcp_tool_registry[tool_name]
            
            if session_id not in tool_info['active_sessions']:
                return {'success': False, 'error': f'MCP tool not active for session: {session_id}'}
            
            # Get tool instance (placeholder - would create actual instance)
            tool_key = f"{session_id}:{tool_name}"
            if tool_key not in self.mcp_integrations:
                return {'success': False, 'error': f'MCP tool integration not found: {tool_key}'}
            
            # Execute action (placeholder - would call actual tool method)
            result = {
                'success': True,
                'action': action,
                'parameters': parameters,
                'result': f'Executed {action} with {tool_name}',
                'timestamp': datetime.now().isoformat()
            }
            
            # Update session activity
            if session_id in self.session_metadata:
                self.session_metadata[session_id].last_activity = datetime.now()
            
            logger.info(f"MCP action executed: {tool_name}.{action} for session {session_id}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to execute MCP action {tool_name}.{action}: {e}")
            return {'success': False, 'error': str(e)}
    
    # Advanced voice agent integration
    async def register_voice_session(
        self,
        session_id: str,
        voice_config: VoiceConfig,
        command_handlers: Optional[Dict[str, Callable]] = None
    ) -> bool:
        """
        Register a voice session with custom command handlers
        
        Args:
            session_id: Session ID
            voice_config: Voice configuration
            command_handlers: Optional custom command handlers
        
        Returns:
            True if registration successful
        """
        try:
            self.voice_session_registry[session_id] = {
                'config': voice_config,
                'command_handlers': command_handlers or {},
                'status': VoiceAgentStatus.INITIALIZING.value,
                'registered_at': datetime.now(),
                'last_activity': datetime.now()
            }
            
            # Initialize voice capabilities
            success = await self.enable_voice_for_session(session_id, voice_config)
            
            if success:
                self.voice_session_registry[session_id]['status'] = VoiceAgentStatus.ACTIVE.value
                await self._trigger_lifecycle_event('voice_enabled', session_id, config=voice_config)
                logger.info(f"Voice session registered: {session_id}")
            else:
                self.voice_session_registry[session_id]['status'] = VoiceAgentStatus.ERROR.value
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to register voice session {session_id}: {e}")
            if session_id in self.voice_session_registry:
                self.voice_session_registry[session_id]['status'] = VoiceAgentStatus.ERROR.value
            return False
    
    async def process_voice_command(
        self,
        session_id: str,
        command_text: str,
        confidence: float = 1.0
    ) -> Dict[str, Any]:
        """
        Process a voice command for a session
        
        Args:
            session_id: Session ID
            command_text: Recognized command text
            confidence: Recognition confidence score
        
        Returns:
            Command processing result
        """
        try:
            if session_id not in self.voice_session_registry:
                return {'success': False, 'error': 'Voice session not registered'}
            
            voice_info = self.voice_session_registry[session_id]
            voice_info['status'] = VoiceAgentStatus.PROCESSING.value
            voice_info['last_activity'] = datetime.now()
            
            # Check for custom command handlers
            command_handlers = voice_info.get('command_handlers', {})
            
            # Parse command intent (simplified)
            command_intent = self._parse_voice_command(command_text)
            
            # Execute command
            if command_intent in command_handlers:
                # Use custom handler
                result = await command_handlers[command_intent](session_id, command_text)
            else:
                # Use default handler
                result = await self._handle_default_voice_command(session_id, command_intent, command_text)
            
            voice_info['status'] = VoiceAgentStatus.ACTIVE.value
            
            # Trigger event
            await self._trigger_lifecycle_event('voice_command_received', session_id, 
                                              command=command_text, result=result)
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to process voice command for session {session_id}: {e}")
            if session_id in self.voice_session_registry:
                self.voice_session_registry[session_id]['status'] = VoiceAgentStatus.ERROR.value
            return {'success': False, 'error': str(e)}
    
    def _parse_voice_command(self, command_text: str) -> str:
        """
        Parse voice command to determine intent
        
        Args:
            command_text: Command text
        
        Returns:
            Command intent
        """
        # Simplified intent parsing - would use NLP in real implementation
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
    
    async def _handle_default_voice_command(
        self,
        session_id: str,
        intent: str,
        command_text: str
    ) -> Dict[str, Any]:
        """
        Handle default voice commands
        
        Args:
            session_id: Session ID
            intent: Command intent
            command_text: Original command text
        
        Returns:
            Command result
        """
        # Placeholder for default voice command handling
        return {
            'success': True,
            'intent': intent,
            'command': command_text,
            'action': f'Processed {intent} command',
            'timestamp': datetime.now().isoformat()
        }
    
    # Event handlers
    async def _handle_mcp_auth_required(self, session_id: str, tool_name: str, **kwargs) -> None:
        """Handle MCP authentication required event"""
        logger.info(f"MCP authentication required for {tool_name} in session {session_id}")
        self.update_tool_state(session_id, tool_name, {
            'status': MCPToolStatus.AUTHENTICATING.value,
            'auth_required_at': datetime.now().isoformat()
        })
    
    async def _handle_voice_command(self, session_id: str, command: str, **kwargs) -> None:
        """Handle voice command received event"""
        logger.info(f"Voice command received for session {session_id}: {command}")
    
    async def _handle_session_error(self, session_id: str, error: str, **kwargs) -> None:
        """Handle session error event"""
        logger.error(f"Session error for {session_id}: {error}")
        # Could implement error recovery logic here
    
    async def _handle_integration_failure(self, session_id: str, integration: str, error: str, **kwargs) -> None:
        """Handle integration failure event"""
        logger.error(f"Integration failure for {session_id} ({integration}): {error}")
        # Could implement fallback logic here
    
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
    
    # Conversation-aware session management
    async def create_integrated_session(
        self,
        conversation_id: str,
        browser_config: Optional[Dict[str, Any]] = None,
        integration_config: Optional[IntegrationConfig] = None,
        session_id: Optional[str] = None
    ) -> Union[BrowserSession, EnhancedBrowserSession]:
        """
        Create a conversation-aware browser session with full integration support
        
        Args:
            conversation_id: ID of the conversation this session belongs to
            browser_config: Browser configuration options
            integration_config: Integration configuration for MCP tools and voice
            session_id: Optional session ID, will generate if not provided
        
        Returns:
            Integrated browser session
        """
        session_id = session_id or str(uuid.uuid4())
        browser_config = browser_config or {}
        integration_config = integration_config or IntegrationConfig()
        
        # Create the browser session
        session = await self.create_browser_session(
            session_id=session_id,
            **browser_config
        )
        
        # Create session metadata
        metadata = SessionMetadata(
            session_id=session_id,
            conversation_id=conversation_id,
            created_at=datetime.now(),
            last_activity=datetime.now(),
            context={'integration_config': integration_config.__dict__},
            tool_states={}
        )
        
        # Register session metadata
        self.session_metadata[session_id] = metadata
        
        # Associate with conversation
        if conversation_id not in self.conversation_sessions:
            self.conversation_sessions[conversation_id] = []
        self.conversation_sessions[conversation_id].append(session_id)
        
        # Enable MCP tools if configured
        if integration_config.mcp_tools:
            for mcp_config in integration_config.mcp_tools:
                await self.enable_mcp_tool_for_session(session_id, mcp_config)
        
        # Enable voice agent if configured
        if integration_config.voice_config:
            await self.enable_voice_for_session(session_id, integration_config.voice_config)
        
        # Setup human control hooks if enabled
        if integration_config.enable_human_control:
            await self.setup_human_control_hooks(session_id)
        
        logger.info(f"Integrated session created: {session_id} for conversation: {conversation_id}")
        return session
    
    # MCP tool registration and management
    def register_mcp_tool(self, tool_config: MCPToolConfig) -> None:
        """
        Register an MCP tool for use in browser sessions
        
        Args:
            tool_config: Configuration for the MCP tool
        """
        self.registered_mcp_tools[tool_config.tool_name] = tool_config
        logger.info(f"MCP tool registered: {tool_config.tool_name}")
    
    async def enable_mcp_tool_for_session(self, session_id: str, tool_config: MCPToolConfig) -> bool:
        """
        Enable an MCP tool for a specific browser session
        
        Args:
            session_id: ID of the browser session
            tool_config: Configuration for the MCP tool
        
        Returns:
            True if tool was enabled successfully
        """
        try:
            # Register the tool if not already registered
            if tool_config.tool_name not in self.registered_mcp_tools:
                self.register_mcp_tool(tool_config)
            
            # Create tool integration instance (placeholder for now)
            # This would be replaced with actual MCP tool implementations
            tool_integration = {
                'config': tool_config,
                'session_id': session_id,
                'enabled': True,
                'initialized_at': datetime.now()
            }
            
            # Store integration
            tool_key = f"{session_id}:{tool_config.tool_name}"
            self.mcp_integrations[tool_key] = tool_integration
            
            # Update session metadata
            if session_id in self.session_metadata:
                self.session_metadata[session_id].tool_states[tool_config.tool_name] = {
                    'enabled': True,
                    'initialized_at': datetime.now().isoformat()
                }
                self.session_metadata[session_id].last_activity = datetime.now()
            
            logger.info(f"MCP tool {tool_config.tool_name} enabled for session {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to enable MCP tool {tool_config.tool_name} for session {session_id}: {e}")
            return False
    
    def get_session_mcp_tools(self, session_id: str) -> List[str]:
        """
        Get list of enabled MCP tools for a session
        
        Args:
            session_id: ID of the browser session
        
        Returns:
            List of enabled MCP tool names
        """
        enabled_tools = []
        for tool_key, integration in self.mcp_integrations.items():
            if tool_key.startswith(f"{session_id}:") and integration.get('enabled', False):
                tool_name = tool_key.split(':', 1)[1]
                enabled_tools.append(tool_name)
        return enabled_tools
    
    # Voice agent integration hooks
    async def enable_voice_for_session(self, session_id: str, voice_config: VoiceConfig) -> bool:
        """
        Enable voice agent capabilities for a browser session
        
        Args:
            session_id: ID of the browser session
            voice_config: Voice configuration
        
        Returns:
            True if voice was enabled successfully
        """
        try:
            # Initialize voice agent if not already done
            if not self.voice_agent:
                await self._initialize_voice_agent(voice_config)
            
            # Associate voice capabilities with session
            if session_id in self.session_metadata:
                self.session_metadata[session_id].tool_states['voice_agent'] = {
                    'enabled': True,
                    'provider': voice_config.provider,
                    'language': voice_config.language,
                    'initialized_at': datetime.now().isoformat()
                }
                self.session_metadata[session_id].last_activity = datetime.now()
            
            logger.info(f"Voice agent enabled for session {session_id} with provider {voice_config.provider}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to enable voice for session {session_id}: {e}")
            return False
    
    async def _initialize_voice_agent(self, voice_config: VoiceConfig) -> None:
        """
        Initialize the voice agent with the given configuration
        
        Args:
            voice_config: Voice configuration
        """
        # Placeholder for voice agent initialization
        # This would be replaced with actual voice agent implementation
        self.voice_agent = {
            'provider': voice_config.provider,
            'language': voice_config.language,
            'initialized_at': datetime.now(),
            'active_sessions': set()
        }
        logger.info(f"Voice agent initialized with provider {voice_config.provider}")
    
    async def setup_human_control_hooks(self, session_id: str) -> None:
        """
        Setup human control hooks for a browser session
        
        Args:
            session_id: ID of the browser session
        """
        try:
            # Update session metadata to indicate human control is available
            if session_id in self.session_metadata:
                self.session_metadata[session_id].tool_states['human_control'] = {
                    'enabled': True,
                    'setup_at': datetime.now().isoformat()
                }
                self.session_metadata[session_id].last_activity = datetime.now()
            
            logger.info(f"Human control hooks setup for session {session_id}")
            
        except Exception as e:
            logger.error(f"Failed to setup human control hooks for session {session_id}: {e}")
    
    # Session metadata tracking
    def get_conversation_sessions(self, conversation_id: str) -> List[str]:
        """
        Get all session IDs associated with a conversation
        
        Args:
            conversation_id: ID of the conversation
        
        Returns:
            List of session IDs
        """
        return self.conversation_sessions.get(conversation_id, [])
    
    def get_session_metadata(self, session_id: str) -> Optional[SessionMetadata]:
        """
        Get metadata for a specific session
        
        Args:
            session_id: ID of the browser session
        
        Returns:
            Session metadata or None if not found
        """
        return self.session_metadata.get(session_id)
    
    def update_session_context(self, session_id: str, context_update: Dict[str, Any]) -> None:
        """
        Update the context for a session
        
        Args:
            session_id: ID of the browser session
            context_update: Context data to update
        """
        if session_id in self.session_metadata:
            self.session_metadata[session_id].context.update(context_update)
            self.session_metadata[session_id].last_activity = datetime.now()
            logger.debug(f"Context updated for session {session_id}")
    
    def update_tool_state(self, session_id: str, tool_name: str, state_update: Dict[str, Any]) -> None:
        """
        Update the state of a tool for a session
        
        Args:
            session_id: ID of the browser session
            tool_name: Name of the tool
            state_update: State data to update
        """
        if session_id in self.session_metadata:
            if tool_name not in self.session_metadata[session_id].tool_states:
                self.session_metadata[session_id].tool_states[tool_name] = {}
            self.session_metadata[session_id].tool_states[tool_name].update(state_update)
            self.session_metadata[session_id].last_activity = datetime.now()
            logger.debug(f"Tool state updated for {tool_name} in session {session_id}")
    
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
            from browser_use.browser.context import BrowserContextConfig
            import sys
            import os
            sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'server'))
            from browser_session import UseBrowserlessContext
            
            browser = Browser(config=browser_config)
            
            # Create browser context with proper configuration
            context = UseBrowserlessContext(
                browser,
                BrowserContextConfig(
                    wait_for_network_idle_page_load_time=10.0,
                    highlight_elements=True
                )
            )
            
            # Get the browser session
            browser_session = await context.get_session()
            
            # Get the current page from the session
            current_page = browser_session.current_page
            
            # Create enhanced session directly using the browser_session
            session = EnhancedBrowserSession(
                browser_context=browser_session.context,  # Use the playwright BrowserContext
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
