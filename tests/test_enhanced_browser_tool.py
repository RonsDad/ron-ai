"""
Unit tests for Enhanced Browser Tool Integration
Tests the enhanced browser tool class and conversation-aware session management
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
import json

# Import the classes we're testing
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'server'))

from enhanced_browser_tool import (
    EnhancedBrowserTool,
    ConversationContext,
    BrowserNeedDetector,
    get_enhanced_browser_tools
)


class TestConversationContext:
    """Test conversation context management"""
    
    def test_conversation_context_initialization(self):
        """Test conversation context is properly initialized"""
        conversation_id = "test-conv-123"
        context = ConversationContext(conversation_id)
        
        assert context.conversation_id == conversation_id
        assert isinstance(context.created_at, datetime)
        assert isinstance(context.last_activity, datetime)
        assert context.browser_sessions == []
        assert context.context_history == []
        assert context.user_preferences == {}
    
    def test_add_browser_session(self):
        """Test adding browser sessions to conversation context"""
        context = ConversationContext("test-conv")
        session_id = "session-123"
        
        # Add session
        context.add_browser_session(session_id)
        
        assert session_id in context.browser_sessions
        assert len(context.browser_sessions) == 1
        
        # Adding same session again should not duplicate
        context.add_browser_session(session_id)
        assert len(context.browser_sessions) == 1
        
        # Add different session
        context.add_browser_session("session-456")
        assert len(context.browser_sessions) == 2
    
    def test_add_context_entry(self):
        """Test adding context entries"""
        context = ConversationContext("test-conv")
        
        entry = {
            'type': 'browser_action',
            'action': 'navigate',
            'url': 'https://example.com'
        }
        
        context.add_context_entry(entry)
        
        assert len(context.context_history) == 1
        assert 'timestamp' in context.context_history[0]
        assert context.context_history[0]['type'] == 'browser_action'
    
    def test_get_recent_context(self):
        """Test getting recent context entries"""
        context = ConversationContext("test-conv")
        
        # Add multiple entries
        for i in range(10):
            context.add_context_entry({'type': 'test', 'index': i})
        
        # Get recent entries (default limit 5)
        recent = context.get_recent_context()
        assert len(recent) == 5
        assert recent[-1]['index'] == 9  # Most recent
        
        # Get with custom limit
        recent_3 = context.get_recent_context(3)
        assert len(recent_3) == 3
        assert recent_3[-1]['index'] == 9
    
    def test_to_dict(self):
        """Test serialization to dictionary"""
        context = ConversationContext("test-conv")
        context.add_browser_session("session-123")
        context.add_context_entry({'type': 'test'})
        
        result = context.to_dict()
        
        assert result['conversation_id'] == "test-conv"
        assert 'created_at' in result
        assert 'last_activity' in result
        assert result['browser_sessions'] == ["session-123"]
        assert len(result['context_history']) == 1


class TestBrowserNeedDetector:
    """Test browser need detection logic"""
    
    def test_analyze_prompt_high_confidence(self):
        """Test analysis of prompts that clearly need browser automation"""
        prompts = [
            "Navigate to google.com and search for Python tutorials",
            "Fill out the form on https://example.com/contact",
            "Click the submit button on the website",
            "Download the file from the webpage",
            "Login to my Gmail account"
        ]
        
        for prompt in prompts:
            analysis = BrowserNeedDetector.analyze_prompt(prompt)
            
            assert analysis['needs_browser'] is True
            assert analysis['confidence'] > 0.3
            assert isinstance(analysis['reasoning'], str)
            assert len(analysis['reasoning']) > 0
    
    def test_analyze_prompt_low_confidence(self):
        """Test analysis of prompts that don't need browser automation"""
        prompts = [
            "What is the capital of France?",
            "Explain quantum physics",
            "Write a poem about cats",
            "Calculate 2 + 2",
            "Tell me a joke"
        ]
        
        for prompt in prompts:
            analysis = BrowserNeedDetector.analyze_prompt(prompt)
            
            assert analysis['needs_browser'] is False
            assert analysis['confidence'] <= 0.3
    
    def test_analyze_prompt_website_patterns(self):
        """Test detection of website patterns"""
        prompts_with_websites = [
            "Check the news on cnn.com",
            "Visit https://github.com/user/repo",
            "Go to www.amazon.com",
            "Open my Gmail inbox"
        ]
        
        for prompt in prompts_with_websites:
            analysis = BrowserNeedDetector.analyze_prompt(prompt)
            
            assert analysis['website_matches'] > 0
            assert analysis['needs_browser'] is True
    
    def test_analyze_prompt_action_verbs(self):
        """Test detection of action verbs"""
        prompts_with_actions = [
            "Click the login button",
            "Type my username in the field", 
            "Select the dropdown option",
            "Submit the form data"
        ]
        
        for prompt in prompts_with_actions:
            analysis = BrowserNeedDetector.analyze_prompt(prompt)
            
            assert analysis['action_matches'] > 0
            assert analysis['needs_browser'] is True


class TestEnhancedBrowserTool:
    """Test enhanced browser tool functionality"""
    
    @pytest.fixture
    def browser_tool(self):
        """Create enhanced browser tool instance for testing"""
        return EnhancedBrowserTool()
    
    def test_initialization(self, browser_tool):
        """Test tool initialization"""
        assert isinstance(browser_tool.conversation_contexts, dict)
        assert browser_tool.browser_backend_url == "http://localhost:8000"
        assert isinstance(browser_tool.detector, BrowserNeedDetector)
    
    def test_get_or_create_conversation_context(self, browser_tool):
        """Test conversation context creation and retrieval"""
        conversation_id = "test-conv-123"
        
        # First call should create new context
        context1 = browser_tool.get_or_create_conversation_context(conversation_id)
        assert isinstance(context1, ConversationContext)
        assert context1.conversation_id == conversation_id
        
        # Second call should return same context
        context2 = browser_tool.get_or_create_conversation_context(conversation_id)
        assert context1 is context2
    
    @pytest.mark.asyncio
    async def test_analyze_browser_need(self, browser_tool):
        """Test browser need analysis with conversation context"""
        conversation_id = "test-conv"
        prompt = "Navigate to google.com and search for Python"
        
        analysis = await browser_tool.analyze_browser_need(prompt, conversation_id)
        
        assert 'needs_browser' in analysis
        assert 'confidence' in analysis
        assert 'conversation_context' in analysis
        assert isinstance(analysis['conversation_context'], dict)
        
        # Check that context was updated
        context = browser_tool.conversation_contexts[conversation_id]
        assert len(context.context_history) == 1
        assert context.context_history[0]['type'] == 'browser_need_analysis'
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_start_browser_session_success(self, mock_client, browser_tool):
        """Test successful browser session start"""
        # Mock HTTP response
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'session_id': 'session-123',
            'browser_url': 'http://localhost:9222',
            'status': 'started'
        }
        mock_response.raise_for_status.return_value = None
        
        mock_http_client = AsyncMock()
        mock_http_client.post.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_http_client
        
        # Test session start
        result = await browser_tool.start_browser_session(
            instructions="Navigate to google.com",
            conversation_id="test-conv"
        )
        
        assert 'session_id' in result
        assert result['session_id'] == 'session-123'
        
        # Check conversation context was updated
        context = browser_tool.conversation_contexts["test-conv"]
        assert 'session-123' in context.browser_sessions
        assert len(context.context_history) == 1
    
    @pytest.mark.asyncio
    async def test_start_browser_session_missing_instructions(self, browser_tool):
        """Test browser session start with missing instructions"""
        result = await browser_tool.start_browser_session(
            instructions="",
            conversation_id="test-conv"
        )
        
        assert 'error' in result
        assert 'Instructions parameter is required' in result['error']
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_start_browser_session_connection_error(self, mock_client, browser_tool):
        """Test browser session start with connection error"""
        import httpx
        
        mock_http_client = AsyncMock()
        mock_http_client.post.side_effect = httpx.ConnectError("Connection failed")
        mock_client.return_value.__aenter__.return_value = mock_http_client
        
        result = await browser_tool.start_browser_session(
            instructions="Navigate to google.com",
            conversation_id="test-conv"
        )
        
        assert 'error' in result
        assert 'Browser-use backend is not running' in result['error']
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_get_session_status(self, mock_client, browser_tool):
        """Test getting session status"""
        # Mock HTTP response
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'session_id': 'session-123',
            'status': 'running',
            'current_url': 'https://google.com'
        }
        mock_response.raise_for_status.return_value = None
        
        mock_http_client = AsyncMock()
        mock_http_client.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_http_client
        
        # Create conversation context first
        browser_tool.get_or_create_conversation_context("test-conv")
        
        result = await browser_tool.get_session_status(
            session_id="session-123",
            conversation_id="test-conv"
        )
        
        assert 'session_id' in result
        assert 'conversation_context' in result
        assert result['conversation_context']['conversation_id'] == "test-conv"
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_request_human_intervention(self, mock_client, browser_tool):
        """Test requesting human intervention"""
        # Create conversation context first
        browser_tool.get_or_create_conversation_context("test-conv")
        
        # Mock HTTP response
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'success': True,
            'intervention_id': 'intervention-123'
        }
        mock_response.raise_for_status.return_value = None
        
        mock_http_client = AsyncMock()
        mock_http_client.post.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_http_client
        
        result = await browser_tool.request_human_intervention(
            session_id="session-123",
            reason="Agent is stuck on CAPTCHA",
            current_state={"url": "https://example.com", "action": "login"},
            conversation_id="test-conv"
        )
        
        assert 'success' in result
        assert result['success'] is True
        
        # Check conversation context was updated
        context = browser_tool.conversation_contexts["test-conv"]
        assert len(context.context_history) == 1
        assert context.context_history[0]['type'] == 'human_intervention_requested'
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient')
    async def test_stop_browser_session(self, mock_client, browser_tool):
        """Test stopping browser session"""
        # Setup conversation context with session
        context = browser_tool.get_or_create_conversation_context("test-conv")
        context.add_browser_session("session-123")
        
        # Mock HTTP response
        mock_response = MagicMock()
        mock_response.json.return_value = {'success': True}
        mock_response.raise_for_status.return_value = None
        
        mock_http_client = AsyncMock()
        mock_http_client.post.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_http_client
        
        result = await browser_tool.stop_browser_session(
            session_id="session-123",
            conversation_id="test-conv"
        )
        
        assert 'success' in result
        
        # Check session was removed from context
        assert "session-123" not in context.browser_sessions
        assert len(context.context_history) == 1
        assert context.context_history[0]['type'] == 'browser_session_stopped'
    
    def test_get_conversation_summary(self, browser_tool):
        """Test getting conversation summary"""
        conversation_id = "test-conv"
        context = browser_tool.get_or_create_conversation_context(conversation_id)
        context.add_browser_session("session-123")
        context.add_context_entry({'type': 'test', 'data': 'value'})
        
        summary = browser_tool.get_conversation_summary(conversation_id)
        
        assert summary['conversation_id'] == conversation_id
        assert summary['active_sessions'] == 1
        assert summary['total_context_entries'] == 1
        assert 'last_activity' in summary
        assert 'recent_context' in summary
    
    def test_get_conversation_summary_not_found(self, browser_tool):
        """Test getting summary for non-existent conversation"""
        summary = browser_tool.get_conversation_summary("non-existent")
        
        assert 'error' in summary
        assert 'Conversation not found' in summary['error']


class TestEnhancedBrowserToolDefinitions:
    """Test enhanced browser tool definitions for Claude"""
    
    def test_get_enhanced_browser_tools(self):
        """Test getting enhanced browser tool definitions"""
        tools = get_enhanced_browser_tools()
        
        assert isinstance(tools, list)
        assert len(tools) == 4  # Expected number of enhanced tools
        
        # Tools should be BetaToolParam objects
        tool_names = [tool.name for tool in tools]
        expected_names = [
            "start_browser_automation",
            "analyze_browser_need", 
            "request_human_help",
            "get_enhanced_session_status"
        ]
        
        for name in expected_names:
            assert name in tool_names
    
    def test_tool_schemas(self):
        """Test that tool schemas are properly defined"""
        tools = get_enhanced_browser_tools()
        
        for tool in tools:
            assert hasattr(tool, 'name')
            assert hasattr(tool, 'description')
            assert hasattr(tool, 'input_schema')
            
            # Check schema structure
            schema = tool.input_schema
            assert 'type' in schema
            assert schema['type'] == 'object'
            assert 'properties' in schema
            assert 'required' in schema
    
    def test_start_browser_automation_schema(self):
        """Test start_browser_automation tool schema"""
        tools = get_enhanced_browser_tools()
        start_tool = next(tool for tool in tools if tool.name == "start_browser_automation")
        
        schema = start_tool.input_schema
        properties = schema['properties']
        
        assert 'instructions' in properties
        assert 'conversation_id' in properties
        assert 'enable_live_view' in properties
        assert 'enable_human_control' in properties
        assert 'browser_config' in properties
        
        # Check required fields
        assert 'instructions' in schema['required']
        assert 'conversation_id' in schema['required']
    
    def test_analyze_browser_need_schema(self):
        """Test analyze_browser_need tool schema"""
        tools = get_enhanced_browser_tools()
        analyze_tool = next(tool for tool in tools if tool.name == "analyze_browser_need")
        
        schema = analyze_tool.input_schema
        properties = schema['properties']
        
        assert 'prompt' in properties
        assert 'conversation_id' in properties
        
        # Check required fields
        assert 'prompt' in schema['required']
        assert 'conversation_id' in schema['required']
    
    def test_request_human_help_schema(self):
        """Test request_human_help tool schema"""
        tools = get_enhanced_browser_tools()
        help_tool = next(tool for tool in tools if tool.name == "request_human_help")
        
        schema = help_tool.input_schema
        properties = schema['properties']
        
        assert 'session_id' in properties
        assert 'reason' in properties
        assert 'current_situation' in properties
        assert 'suggested_actions' in properties
        assert 'conversation_id' in properties
        
        # Check required fields
        required = schema['required']
        assert 'session_id' in required
        assert 'reason' in required
        assert 'current_situation' in required


# Integration tests for conversation context handling
class TestConversationContextIntegration:
    """Test conversation context integration across multiple operations"""
    
    @pytest.fixture
    def browser_tool(self):
        return EnhancedBrowserTool()
    
    @pytest.mark.asyncio
    async def test_full_conversation_flow(self, browser_tool):
        """Test a complete conversation flow with context management"""
        conversation_id = "integration-test-conv"
        
        # Step 1: Analyze browser need
        analysis = await browser_tool.analyze_browser_need(
            "Navigate to google.com and search for Python tutorials",
            conversation_id
        )
        
        assert analysis['needs_browser'] is True
        
        # Step 2: Check conversation context was created and updated
        context = browser_tool.conversation_contexts[conversation_id]
        assert len(context.context_history) == 1
        assert context.context_history[0]['type'] == 'browser_need_analysis'
        
        # Step 3: Get conversation summary
        summary = browser_tool.get_conversation_summary(conversation_id)
        assert summary['conversation_id'] == conversation_id
        assert summary['total_context_entries'] == 1
        
        # Step 4: Simulate adding a browser session
        context.add_browser_session("session-456")
        context.add_context_entry({
            'type': 'browser_session_started',
            'session_id': 'session-456'
        })
        
        # Step 5: Check updated summary
        updated_summary = browser_tool.get_conversation_summary(conversation_id)
        assert updated_summary['active_sessions'] == 1
        assert updated_summary['total_context_entries'] == 2
    
    @pytest.mark.asyncio
    async def test_multiple_conversations(self, browser_tool):
        """Test handling multiple concurrent conversations"""
        conv_ids = ["conv-1", "conv-2", "conv-3"]
        
        # Create contexts for multiple conversations
        for conv_id in conv_ids:
            await browser_tool.analyze_browser_need(
                f"Test prompt for {conv_id}",
                conv_id
            )
        
        # Verify all conversations exist
        assert len(browser_tool.conversation_contexts) == 3
        
        for conv_id in conv_ids:
            assert conv_id in browser_tool.conversation_contexts
            context = browser_tool.conversation_contexts[conv_id]
            assert len(context.context_history) == 1
    
    def test_context_persistence_across_operations(self, browser_tool):
        """Test that context persists across different operations"""
        conversation_id = "persistence-test"
        
        # Create initial context
        context = browser_tool.get_or_create_conversation_context(conversation_id)
        context.add_browser_session("session-1")
        context.add_context_entry({'type': 'initial', 'data': 'test'})
        
        # Perform another operation that should use same context
        context2 = browser_tool.get_or_create_conversation_context(conversation_id)
        
        # Should be same object
        assert context is context2
        assert len(context2.browser_sessions) == 1
        assert len(context2.context_history) == 1


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])