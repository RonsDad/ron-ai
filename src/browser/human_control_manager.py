"""
Human Control State Management for Claude Browser Integration
Manages control transitions between AI agent and human user
Supports pause/resume functionality with state preservation
"""

import asyncio
import logging
from typing import Optional, Dict, Any, List, Callable
from datetime import datetime
import uuid
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class ControlState(Enum):
    """State of control in a browser session"""
    AGENT_ACTIVE = "agent_active"
    AGENT_PAUSED = "agent_paused"
    HUMAN_REQUESTED = "human_requested"
    HUMAN_ACTIVE = "human_active"
    TRANSITION_TO_AGENT = "transition_to_agent"
    TRANSITION_TO_HUMAN = "transition_to_human"
    ERROR = "error"


class ControlTransitionType(Enum):
    """Type of control transition"""
    AGENT_TO_HUMAN = "agent_to_human"
    HUMAN_TO_AGENT = "human_to_agent"
    AGENT_PAUSE = "agent_pause"
    AGENT_RESUME = "agent_resume"
    EMERGENCY_STOP = "emergency_stop"


@dataclass
class HumanAction:
    """Record of a human action during control"""
    action_id: str
    action_type: str  # 'click', 'type', 'navigate', 'scroll', etc.
    target: Optional[str] = None
    parameters: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)
    success: bool = True
    error_message: Optional[str] = None


@dataclass
class ControlEvent:
    """Record of a control transition event"""
    event_id: str
    session_id: str
    transition_type: ControlTransitionType
    from_state: ControlState
    to_state: ControlState
    reason: str
    user_id: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentState:
    """Snapshot of agent state for preservation"""
    session_id: str
    current_task: Optional[str] = None
    current_url: Optional[str] = None
    current_step: Optional[str] = None
    context: Dict[str, Any] = field(default_factory=dict)
    browser_state: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class HumanControlSession:
    """Active human control session"""
    control_id: str
    session_id: str
    conversation_id: Optional[str]
    start_time: datetime
    end_time: Optional[datetime] = None
    reason: str = ""
    agent_state_snapshot: Optional[AgentState] = None
    human_actions: List[HumanAction] = field(default_factory=list)
    status: ControlState = ControlState.HUMAN_REQUESTED
    user_id: Optional[str] = None
    guidance_messages: List[str] = field(default_factory=list)
    
    def add_human_action(self, action: HumanAction) -> None:
        """Add a human action to the session"""
        self.human_actions.append(action)
    
    def add_guidance_message(self, message: str) -> None:
        """Add a guidance message for the human user"""
        self.guidance_messages.append(message)
    
    def get_duration(self) -> Optional[float]:
        """Get the duration of the control session in seconds"""
        if self.end_time:
            return (self.end_time - self.start_time).total_seconds()
        return (datetime.now() - self.start_time).total_seconds()
    
    def generate_summary(self) -> str:
        """Generate a summary of the human control session"""
        duration = self.get_duration()
        action_count = len(self.human_actions)
        
        summary = f"Human control session lasted {duration:.1f} seconds with {action_count} actions."
        
        if self.human_actions:
            action_types = [action.action_type for action in self.human_actions]
            unique_actions = list(set(action_types))
            summary += f" Actions performed: {', '.join(unique_actions)}."
        
        return summary
    
    def create_agent_context_update(self) -> Dict[str, Any]:
        """Create context update for agent based on human actions"""
        context_update = {
            'human_control_session': {
                'control_id': self.control_id,
                'duration': self.get_duration(),
                'actions_performed': len(self.human_actions),
                'summary': self.generate_summary()
            },
            'browser_state_changes': [],
            'user_guidance': self.guidance_messages
        }
        
        # Add specific action details
        for action in self.human_actions:
            if action.success:
                context_update['browser_state_changes'].append({
                    'action': action.action_type,
                    'target': action.target,
                    'timestamp': action.timestamp.isoformat()
                })
        
        return context_update


class ControlTransferResult:
    """Result of a control transfer operation"""
    
    def __init__(self, success: bool, message: str, control_session: Optional[HumanControlSession] = None):
        self.success = success
        self.message = message
        self.control_session = control_session
        self.timestamp = datetime.now()


class HumanControlManager:
    """
    Manages human-in-the-loop control transitions for browser sessions
    Handles agent pause/resume functionality with state preservation
    """
    
    def __init__(self):
        self.active_controls: Dict[str, HumanControlSession] = {}  # session_id -> control_session
        self.control_history: Dict[str, List[ControlEvent]] = {}  # session_id -> [events]
        self.session_states: Dict[str, ControlState] = {}  # session_id -> current_state
        self.agent_states: Dict[str, AgentState] = {}  # session_id -> preserved_state
        
        # Event handlers
        self.control_event_handlers: Dict[str, List[Callable]] = {}
        self.state_change_handlers: Dict[str, List[Callable]] = {}
        
        # Configuration
        self.default_timeout = 300  # 5 minutes default timeout for human control
        self.auto_resume_enabled = True
        
        logger.info("HumanControlManager initialized")
    
    def register_control_event_handler(self, event: str, handler: Callable) -> None:
        """
        Register an event handler for control events
        
        Args:
            event: Event name
            handler: Event handler function
        """
        if event not in self.control_event_handlers:
            self.control_event_handlers[event] = []
        
        self.control_event_handlers[event].append(handler)
        logger.debug(f"Control event handler registered for: {event}")
    
    def register_state_change_handler(self, state: ControlState, handler: Callable) -> None:
        """
        Register a handler for state changes
        
        Args:
            state: Control state to handle
            handler: State change handler function
        """
        state_key = state.value
        if state_key not in self.state_change_handlers:
            self.state_change_handlers[state_key] = []
        
        self.state_change_handlers[state_key].append(handler)
        logger.debug(f"State change handler registered for: {state_key}")
    
    async def _trigger_control_event(self, event: str, **kwargs) -> None:
        """Trigger control event handlers"""
        if event in self.control_event_handlers:
            for handler in self.control_event_handlers[event]:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(**kwargs)
                    else:
                        handler(**kwargs)
                except Exception as e:
                    logger.error(f"Error in control event handler for {event}: {e}")
    
    async def _trigger_state_change(self, session_id: str, new_state: ControlState, **kwargs) -> None:
        """Trigger state change handlers"""
        state_key = new_state.value
        if state_key in self.state_change_handlers:
            for handler in self.state_change_handlers[state_key]:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(session_id=session_id, state=new_state, **kwargs)
                    else:
                        handler(session_id=session_id, state=new_state, **kwargs)
                except Exception as e:
                    logger.error(f"Error in state change handler for {state_key}: {e}")
    
    def _update_session_state(self, session_id: str, new_state: ControlState) -> None:
        """Update the control state for a session"""
        old_state = self.session_states.get(session_id, ControlState.AGENT_ACTIVE)
        self.session_states[session_id] = new_state
        
        logger.info(f"Session {session_id} state changed: {old_state.value} -> {new_state.value}")
    
    def _record_control_event(self, session_id: str, transition_type: ControlTransitionType, 
                            from_state: ControlState, to_state: ControlState, 
                            reason: str, user_id: Optional[str] = None, 
                            metadata: Dict[str, Any] = None) -> ControlEvent:
        """Record a control transition event"""
        event = ControlEvent(
            event_id=str(uuid.uuid4()),
            session_id=session_id,
            transition_type=transition_type,
            from_state=from_state,
            to_state=to_state,
            reason=reason,
            user_id=user_id,
            metadata=metadata or {}
        )
        
        if session_id not in self.control_history:
            self.control_history[session_id] = []
        
        self.control_history[session_id].append(event)
        return event
    
    async def request_human_control(
        self,
        session_id: str,
        reason: str,
        agent_state: Dict[str, Any],
        conversation_id: Optional[str] = None,
        user_id: Optional[str] = None,
        timeout: Optional[int] = None
    ) -> HumanControlSession:
        """
        Request human control for a browser session
        
        Args:
            session_id: Browser session ID
            reason: Reason for requesting human control
            agent_state: Current agent state to preserve
            conversation_id: Optional conversation ID
            user_id: Optional user ID
            timeout: Optional timeout in seconds
        
        Returns:
            Human control session
        """
        try:
            # Check if control is already active
            if session_id in self.active_controls:
                logger.warning(f"Human control already active for session {session_id}")
                return self.active_controls[session_id]
            
            # Create agent state snapshot
            agent_state_snapshot = AgentState(
                session_id=session_id,
                current_task=agent_state.get('current_task'),
                current_url=agent_state.get('current_url'),
                current_step=agent_state.get('current_step'),
                context=agent_state.get('context', {}),
                browser_state=agent_state.get('browser_state', {})
            )
            
            # Store agent state
            self.agent_states[session_id] = agent_state_snapshot
            
            # Create human control session
            control_session = HumanControlSession(
                control_id=str(uuid.uuid4()),
                session_id=session_id,
                conversation_id=conversation_id,
                start_time=datetime.now(),
                reason=reason,
                agent_state_snapshot=agent_state_snapshot,
                user_id=user_id
            )
            
            # Update states
            old_state = self.session_states.get(session_id, ControlState.AGENT_ACTIVE)
            self._update_session_state(session_id, ControlState.HUMAN_REQUESTED)
            
            # Record event
            event = self._record_control_event(
                session_id=session_id,
                transition_type=ControlTransitionType.AGENT_TO_HUMAN,
                from_state=old_state,
                to_state=ControlState.HUMAN_REQUESTED,
                reason=reason,
                user_id=user_id,
                metadata={'timeout': timeout or self.default_timeout}
            )
            
            # Store active control
            self.active_controls[session_id] = control_session
            
            # Trigger events
            await self._trigger_control_event('human_control_requested', 
                                            session_id=session_id, 
                                            control_session=control_session,
                                            control_event=event)
            
            await self._trigger_state_change(session_id, ControlState.HUMAN_REQUESTED, 
                                           control_session=control_session)
            
            logger.info(f"Human control requested for session {session_id}: {reason}")
            return control_session
            
        except Exception as e:
            logger.error(f"Failed to request human control for session {session_id}: {e}")
            self._update_session_state(session_id, ControlState.ERROR)
            raise
    
    async def transfer_control_to_human(
        self,
        session_id: str,
        message: str = "",
        user_id: Optional[str] = None
    ) -> ControlTransferResult:
        """
        Transfer control to human user
        
        Args:
            session_id: Browser session ID
            message: Message for the human user
            user_id: Optional user ID
        
        Returns:
            Control transfer result
        """
        try:
            if session_id not in self.active_controls:
                return ControlTransferResult(
                    success=False,
                    message="No active control request found for session"
                )
            
            control_session = self.active_controls[session_id]
            
            # Update control session
            control_session.status = ControlState.HUMAN_ACTIVE
            if message:
                control_session.add_guidance_message(message)
            
            # Update session state
            old_state = self.session_states.get(session_id, ControlState.HUMAN_REQUESTED)
            self._update_session_state(session_id, ControlState.HUMAN_ACTIVE)
            
            # Record event
            event = self._record_control_event(
                session_id=session_id,
                transition_type=ControlTransitionType.AGENT_TO_HUMAN,
                from_state=old_state,
                to_state=ControlState.HUMAN_ACTIVE,
                reason="Control transferred to human",
                user_id=user_id,
                metadata={'message': message}
            )
            
            # Trigger events
            await self._trigger_control_event('control_transferred_to_human',
                                            session_id=session_id,
                                            control_session=control_session,
                                            control_event=event)
            
            await self._trigger_state_change(session_id, ControlState.HUMAN_ACTIVE,
                                           control_session=control_session)
            
            logger.info(f"Control transferred to human for session {session_id}")
            return ControlTransferResult(
                success=True,
                message="Control successfully transferred to human",
                control_session=control_session
            )
            
        except Exception as e:
            logger.error(f"Failed to transfer control to human for session {session_id}: {e}")
            return ControlTransferResult(
                success=False,
                message=f"Failed to transfer control: {str(e)}"
            )
    
    async def return_control_to_agent(
        self,
        session_id: str,
        human_actions_summary: str = "",
        context_update: Dict[str, Any] = None,
        user_id: Optional[str] = None
    ) -> ControlTransferResult:
        """
        Return control to the AI agent
        
        Args:
            session_id: Browser session ID
            human_actions_summary: Summary of human actions
            context_update: Context update for the agent
            user_id: Optional user ID
        
        Returns:
            Control transfer result
        """
        try:
            if session_id not in self.active_controls:
                return ControlTransferResult(
                    success=False,
                    message="No active human control session found"
                )
            
            control_session = self.active_controls[session_id]
            
            # End the control session
            control_session.end_time = datetime.now()
            control_session.status = ControlState.TRANSITION_TO_AGENT
            
            # Create context update for agent
            agent_context_update = control_session.create_agent_context_update()
            if context_update:
                agent_context_update.update(context_update)
            
            # Update session state
            old_state = self.session_states.get(session_id, ControlState.HUMAN_ACTIVE)
            self._update_session_state(session_id, ControlState.AGENT_ACTIVE)
            
            # Record event
            event = self._record_control_event(
                session_id=session_id,
                transition_type=ControlTransitionType.HUMAN_TO_AGENT,
                from_state=old_state,
                to_state=ControlState.AGENT_ACTIVE,
                reason="Control returned to agent",
                user_id=user_id,
                metadata={
                    'human_actions_summary': human_actions_summary,
                    'context_update': agent_context_update
                }
            )
            
            # Remove from active controls
            del self.active_controls[session_id]
            
            # Trigger events
            await self._trigger_control_event('control_returned_to_agent',
                                            session_id=session_id,
                                            control_session=control_session,
                                            context_update=agent_context_update,
                                            control_event=event)
            
            await self._trigger_state_change(session_id, ControlState.AGENT_ACTIVE,
                                           control_session=control_session,
                                           context_update=agent_context_update)
            
            logger.info(f"Control returned to agent for session {session_id}")
            return ControlTransferResult(
                success=True,
                message="Control successfully returned to agent",
                control_session=control_session
            )
            
        except Exception as e:
            logger.error(f"Failed to return control to agent for session {session_id}: {e}")
            return ControlTransferResult(
                success=False,
                message=f"Failed to return control: {str(e)}"
            )
    
    async def pause_agent(self, session_id: str, reason: str = "Manual pause") -> bool:
        """
        Pause the AI agent without transferring control to human
        
        Args:
            session_id: Browser session ID
            reason: Reason for pausing
        
        Returns:
            True if agent was paused successfully
        """
        try:
            old_state = self.session_states.get(session_id, ControlState.AGENT_ACTIVE)
            
            if old_state == ControlState.AGENT_PAUSED:
                logger.warning(f"Agent already paused for session {session_id}")
                return True
            
            # Update session state
            self._update_session_state(session_id, ControlState.AGENT_PAUSED)
            
            # Record event
            event = self._record_control_event(
                session_id=session_id,
                transition_type=ControlTransitionType.AGENT_PAUSE,
                from_state=old_state,
                to_state=ControlState.AGENT_PAUSED,
                reason=reason
            )
            
            # Trigger events
            await self._trigger_control_event('agent_paused',
                                            session_id=session_id,
                                            reason=reason,
                                            control_event=event)
            
            await self._trigger_state_change(session_id, ControlState.AGENT_PAUSED,
                                           reason=reason)
            
            logger.info(f"Agent paused for session {session_id}: {reason}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to pause agent for session {session_id}: {e}")
            return False
    
    async def resume_agent(self, session_id: str, reason: str = "Manual resume") -> bool:
        """
        Resume the AI agent from paused state
        
        Args:
            session_id: Browser session ID
            reason: Reason for resuming
        
        Returns:
            True if agent was resumed successfully
        """
        try:
            old_state = self.session_states.get(session_id, ControlState.AGENT_ACTIVE)
            
            if old_state != ControlState.AGENT_PAUSED:
                logger.warning(f"Agent not in paused state for session {session_id}, current state: {old_state.value}")
                return False
            
            # Update session state
            self._update_session_state(session_id, ControlState.AGENT_ACTIVE)
            
            # Record event
            event = self._record_control_event(
                session_id=session_id,
                transition_type=ControlTransitionType.AGENT_RESUME,
                from_state=old_state,
                to_state=ControlState.AGENT_ACTIVE,
                reason=reason
            )
            
            # Trigger events
            await self._trigger_control_event('agent_resumed',
                                            session_id=session_id,
                                            reason=reason,
                                            control_event=event)
            
            await self._trigger_state_change(session_id, ControlState.AGENT_ACTIVE,
                                           reason=reason)
            
            logger.info(f"Agent resumed for session {session_id}: {reason}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to resume agent for session {session_id}: {e}")
            return False
    
    def record_human_action(
        self,
        session_id: str,
        action_type: str,
        target: Optional[str] = None,
        parameters: Dict[str, Any] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ) -> Optional[HumanAction]:
        """
        Record a human action during control session
        
        Args:
            session_id: Browser session ID
            action_type: Type of action performed
            target: Target of the action
            parameters: Action parameters
            success: Whether the action was successful
            error_message: Error message if action failed
        
        Returns:
            Human action record or None if no active control session
        """
        if session_id not in self.active_controls:
            logger.warning(f"No active control session for recording action in session {session_id}")
            return None
        
        action = HumanAction(
            action_id=str(uuid.uuid4()),
            action_type=action_type,
            target=target,
            parameters=parameters or {},
            success=success,
            error_message=error_message
        )
        
        control_session = self.active_controls[session_id]
        control_session.add_human_action(action)
        
        logger.debug(f"Human action recorded for session {session_id}: {action_type}")
        return action
    
    def get_session_control_state(self, session_id: str) -> ControlState:
        """
        Get the current control state for a session
        
        Args:
            session_id: Browser session ID
        
        Returns:
            Current control state
        """
        return self.session_states.get(session_id, ControlState.AGENT_ACTIVE)
    
    def get_active_control_session(self, session_id: str) -> Optional[HumanControlSession]:
        """
        Get the active human control session for a browser session
        
        Args:
            session_id: Browser session ID
        
        Returns:
            Active control session or None
        """
        return self.active_controls.get(session_id)
    
    def get_control_history(self, session_id: str) -> List[ControlEvent]:
        """
        Get the control history for a session
        
        Args:
            session_id: Browser session ID
        
        Returns:
            List of control events
        """
        return self.control_history.get(session_id, [])
    
    def get_preserved_agent_state(self, session_id: str) -> Optional[AgentState]:
        """
        Get the preserved agent state for a session
        
        Args:
            session_id: Browser session ID
        
        Returns:
            Preserved agent state or None
        """
        return self.agent_states.get(session_id)
    
    def get_control_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about control sessions
        
        Returns:
            Control statistics
        """
        total_sessions = len(self.control_history)
        active_controls = len(self.active_controls)
        
        # Count states
        state_counts = {}
        for state in self.session_states.values():
            state_counts[state.value] = state_counts.get(state.value, 0) + 1
        
        # Calculate average control duration
        all_events = []
        for events in self.control_history.values():
            all_events.extend(events)
        
        control_durations = []
        for session_id, control_session in self.active_controls.items():
            if control_session.end_time:
                duration = (control_session.end_time - control_session.start_time).total_seconds()
                control_durations.append(duration)
        
        avg_duration = sum(control_durations) / len(control_durations) if control_durations else 0
        
        return {
            'total_sessions_with_control': total_sessions,
            'active_control_sessions': active_controls,
            'state_distribution': state_counts,
            'total_control_events': len(all_events),
            'average_control_duration_seconds': avg_duration
        }
    
    async def cleanup_session(self, session_id: str) -> None:
        """
        Clean up control state for a session
        
        Args:
            session_id: Browser session ID
        """
        try:
            # End any active control session
            if session_id in self.active_controls:
                control_session = self.active_controls[session_id]
                if not control_session.end_time:
                    control_session.end_time = datetime.now()
                    control_session.status = ControlState.AGENT_ACTIVE
                
                del self.active_controls[session_id]
            
            # Clean up session state
            if session_id in self.session_states:
                del self.session_states[session_id]
            
            # Clean up preserved agent state
            if session_id in self.agent_states:
                del self.agent_states[session_id]
            
            logger.info(f"Control state cleaned up for session {session_id}")
            
        except Exception as e:
            logger.error(f"Error cleaning up control state for session {session_id}: {e}")


# Global human control manager instance
_human_control_manager: Optional[HumanControlManager] = None


def get_human_control_manager() -> HumanControlManager:
    """Get the global human control manager instance"""
    global _human_control_manager
    if _human_control_manager is None:
        _human_control_manager = HumanControlManager()
    return _human_control_manager