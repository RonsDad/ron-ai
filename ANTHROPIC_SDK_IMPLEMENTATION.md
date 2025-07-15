np# Anthropic SDK Implementation Documentation

## Overview
This document describes the implementation of the Anthropic SDK features in the Nira project, including exposed reasoning tokens, multiple tool calls, streaming functionality, and maximum output configuration.

## Implemented Features

### 1. Exposed Reasoning Tokens
- **Location**: `server/claude_backend.py`
- **Implementation**: 
  - Tracks thinking tokens separately from output tokens
  - Calculates thinking tokens based on thinking block content (approximately 4 characters per token)
  - Returns detailed token usage in API responses including:
    - `input_tokens`: Tokens used for input/prompt
    - `output_tokens`: Tokens used for response text
    - `thinking_tokens`: Tokens used for reasoning/thinking blocks
    - `cache_read_tokens`: Tokens read from cache
    - `cache_creation_tokens`: Tokens used to create cache
    - `total_tokens`: Sum of all token types

### 2. Multiple Tool Calls Support
- **Location**: `server/claude_backend.py:281-309`
- **Implementation**:
  - Set `disable_parallel_tool_use=False` to enable concurrent tool execution
  - Detects when multiple tools are requested and executes them in parallel
  - Maintains proper tool result ordering with tool_use_id mapping
  - Supports interleaved thinking between tool calls with beta header

### 3. Streaming Functionality
- **Endpoints**:
  - Non-streaming: `POST /api/claude/chat`
  - Streaming: `POST /api/claude/chat/stream`
- **Features**:
  - Real-time token usage updates during streaming
  - Separate events for thinking deltas, text deltas, and tool input deltas
  - Server-Sent Events (SSE) format for browser compatibility
  - Event types:
    - `content_block_start`: New content block begins
    - `thinking_delta`: Reasoning text chunk
    - `text_delta`: Response text chunk
    - `tool_input_delta`: Tool input being constructed
    - `usage_update`: Real-time token usage
    - `done`: Stream complete with final usage

### 4. Maximum Output Configuration
- **Parameter**: `max_output_tokens`
- **Default**: 30,000 tokens
- **Usage**: Can be set per request to control response length
- **Applies to**: Both initial response and tool result responses

## API Usage Examples

### Basic Chat with Token Tracking
```python
response = await client.post(
    "http://localhost:8001/api/claude/chat",
    json={
        "message": "Your question here",
        "enable_thinking": True,
        "thinking_budget": 10000,
        "max_output_tokens": 30000
    }
)

# Response includes:
{
    "response": "Claude's response",
    "thinking": [...],  # Thinking blocks
    "token_usage": {
        "input_tokens": 150,
        "output_tokens": 200,
        "thinking_tokens": 500,
        "cache_read_tokens": 0,
        "cache_creation_tokens": 0,
        "total_tokens": 850
    }
}
```

### Streaming with Real-time Updates
```python
async with client.stream(
    "POST",
    "http://localhost:8001/api/claude/chat/stream",
    json={
        "message": "Your question",
        "enable_thinking": True,
        "thinking_budget": 10000
    }
) as response:
    async for line in response.aiter_lines():
        if line.startswith("data: "):
            event = json.loads(line[6:])
            # Handle different event types
```

## Browser-Use Library Updates

The `ChatAnthropic` class in `browser-use/browser_use/llm/anthropic/chat.py` has been enhanced with:
- Extended thinking support via `enable_thinking` and `thinking_budget` parameters
- Interleaved thinking support via `use_interleaved_thinking` flag
- Beta client support for advanced features
- Enhanced token usage tracking including thinking tokens

## Configuration

### Environment Variables
- `ANTHROPIC_API_KEY`: Your Anthropic API key (required)

### Model Configuration
- Model: `claude-sonnet-4-20250514`
- Browser-Use LLM: `gemini-2.5-pro` (as specified in CLAUDE.md)

## Testing

### Quick Test
Run the automated test suite with the provided script:
```bash
cd /workspaces/Nira
./run_anthropic_tests.sh
```

This script will:
- Check if the Claude backend is running
- Start it automatically if needed
- Run all tests
- Optionally stop the backend when done

### Manual Testing
If you prefer to run tests manually:

1. Start the Claude backend:
```bash
python server/claude_backend.py
```

2. In another terminal, run the tests:
```bash
python test_anthropic_features.py
```

The test suite covers:
1. Environment setup verification
2. Basic chat with token tracking
3. Streaming with real-time updates
4. Multiple concurrent tool calls
5. Maximum output configuration with different limits

## Beta Headers

The implementation uses the following beta headers when appropriate:
- `interleaved-thinking-2025-05-14`: Enables thinking between tool calls

## Notes

- Thinking tokens are estimated using ~3.5 chars per token (more accurate than the previous 4 chars)
- Token usage is accumulated across multiple requests when using tools
- The streaming endpoint provides real-time token usage updates
- Multiple tool calls are executed concurrently for better performance
- Enhanced error handling for API errors and network issues
- Automatic validation of environment variables on startup

## Recent Improvements

1. **Fixed Syntax Error**: Removed erroneous "WW" characters that were preventing the code from running
2. **Enhanced Error Handling**: 
   - Better handling of Anthropic API errors with appropriate HTTP status codes
   - Improved error messages for browser-use backend connection issues
   - Added timeout handling for external API calls
3. **Improved Token Calculation**: Updated from 4 chars/token to 3.5 chars/token for better accuracy
4. **Added Test Suite**: Comprehensive test file (`test_anthropic_features.py`) to verify all features
5. **Added Test Runner**: Convenient script (`run_anthropic_tests.sh`) to automate testing
6. **Environment Validation**: Added startup check for required API keys

## Troubleshooting

If you encounter issues:

1. **API Key Errors**: Ensure `ANTHROPIC_API_KEY` is set in your `.env` file
2. **Connection Errors**: Make sure the Claude backend is running on port 8001
3. **Browser-Use Backend Errors**: The browser-use backend must be running on port 8000 for tool calls to work
4. **Import Errors**: Install required packages with `pip install -r requirements.txt`
