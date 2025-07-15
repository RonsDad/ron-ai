# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Nira is a browser automation platform that integrates Claude's thinking capabilities with browser control, allowing AI-assisted web browsing and task automation.

## Quick Start Commands
```bash
# Start all services (recommended)
npm run start  # or npm run dev

# Individual services
npm run frontend        # Next.js on port 3000
npm run backend        # Browser-use backend on port 8000
npm run claude-backend # Claude backend on port 8001

# Utilities
npm run kill-ports     # Clean up ports 3000, 8000, 8001
npm run start:safe     # Enhanced error handling startup
```

## Architecture Overview

### Frontend (Next.js + TypeScript)
- **Port**: 3000
- **Key Components**: 
  - `src/components/ClaudeAgent.tsx` - Handles thinking blocks and tool responses
  - `src/components/BrowserViewPanel.tsx` - Browser automation UI
  - `src/App.tsx` - Main application component
- **Styling**: Tailwind CSS + Radix UI components

### Backend Services

#### Claude Backend (`server/claude_backend.py`)
- **Port**: 8001
- **Features**:
  - Beta API with streaming and interleaved thinking
  - Token usage tracking (including thinking tokens)
  - Multiple concurrent tool calls support
  - SSE streaming endpoint at `/api/claude/chat/stream`

#### Browser-Use Backend (`server/browser_server.py`)
- **Port**: 8000
- **Purpose**: Browser automation using the browser-use library (submodule)
- **Integration**: Works with Claude to execute browser actions

### Key Dependencies
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Radix UI
- **Backend**: FastAPI, Anthropic SDK, browser-use, stagehand
- **Required**: Python 3.11+, Node.js

## Model Configuration (IMMUTABLE)
**These settings must NEVER be changed unless explicitly instructed:**
- **Head Agent Model**: Sonnet 4
- **Browser-Use LLM**: gemini-2.5-flash

## Development Philosophy
- Write clean, maintainable code that precisely meets requirements
- Avoid unnecessary complexity - simplicity and clarity are paramount
- Start with the simplest working solution
- Prioritize readability over cleverness

## Testing Protocol
- **NO TEST SUITES** - Test directly in the application UI
- Never create separate test files or test scripts
- All testing must be done through the actual user interface
- Health check endpoints available at `/health` on both backends

## Anthropic SDK Implementation Status

### Implemented Features
1. **Exposed Reasoning Tokens** - Tracks thinking tokens separately with detailed usage reporting
2. **Multiple Tool Calls** - Concurrent execution with `disable_parallel_tool_use=False`
3. **Streaming** - SSE endpoint with real-time token updates
4. **Maximum Output** - Default 30,000 tokens, configurable per request

### Key Integration Points
- `server/claude_backend.py:142-360` - Main chat endpoint
- `browser-use/browser_use/llm/anthropic/chat.py` - Enhanced ChatAnthropic wrapper
- Beta header: `interleaved-thinking-2025-05-14` for tool use

## Claude 4 SDK Implementation Guide

### Model Names
- **Opus 4**: `claude-opus-4-20250514`
- **Sonnet 4**: `claude-sonnet-4-20250514`

### Streaming Implementation
```python
from anthropic import Anthropic

client = Anthropic()

# Basic streaming
stream = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello"}],
    stream=True
)

# Process stream events
for event in stream:
    if event.type == "content_block_delta":
        print(event.delta.text, end="", flush=True)
```

### Extended Thinking (Reasoning Tokens)
```python
# Enable extended thinking with budget
response = client.messages.create(
    model="claude-opus-4-20250514",
    max_tokens=20000,
    thinking={
        "type": "enabled",
        "budget_tokens": 16000  # Minimum 1024
    },
    messages=[{"role": "user", "content": "Complex reasoning task"}]
)
```

### Multiple Tool Calls
```python
# Define multiple tools
tools = [
    {
        "name": "get_weather",
        "description": "Get weather for location",
        "input_schema": {
            "type": "object",
            "properties": {
                "location": {"type": "string"}
            },
            "required": ["location"]
        }
    },
    {
        "name": "search_web",
        "description": "Search the web",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"}
            },
            "required": ["query"]
        }
    }
]

# Tools execute in parallel by default
response = client.messages.create(
    model="claude-opus-4-20250514",
    tools=tools,
    messages=[{"role": "user", "content": "What's the weather in NYC and search for latest news?"}]
)
```

### Beta Features
```python
# Interleaved thinking (thinking between tool calls)
client = Anthropic(
    default_headers={
        "anthropic-beta": "interleaved-thinking-2025-05-14"
    }
)

# Fine-grained tool streaming
client = Anthropic(
    default_headers={
        "anthropic-beta": "fine-grained-tool-streaming-2025-05-14"
    }
)
```

### Streaming Event Types
- `message_start`: Initial message with usage metadata
- `content_block_start`: Beginning of content block
- `content_block_delta`: Incremental content updates
- `content_block_stop`: End of content block
- `thinking_delta`: Reasoning process updates
- `message_delta`: Top-level message changes
- `message_stop`: Final message with complete usage

### Token Usage Tracking
```python
# Access usage information
message = stream.get_final_message()
print(f"Input tokens: {message.usage.input_tokens}")
print(f"Output tokens: {message.usage.output_tokens}")
print(f"Thinking tokens: {message.usage.thinking_tokens}")  # If extended thinking enabled
```

### Error Handling
- New `refusal` stop reason for safety-related content declines
- Handle unknown event types gracefully in streaming
- Implement retry logic for transient failures

## Environment Setup
```bash
# Required environment variable
export ANTHROPIC_API_KEY=your_api_key

# Python setup
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
npm install
```

## Common Issues and Solutions

### Port Conflicts
The startup scripts automatically kill existing processes on required ports. If issues persist:
1. Run `npm run kill-ports`
2. Wait 5 seconds
3. Try `npm run start` again

### net::ERR_CONNECTION_REFUSED
This error means a backend service isn't running. Ensure all services are started with `npm run start`.

## Verification Requirements
- Always verify implementations against latest Anthropic SDK documentation using web tools
- Check for recent API changes or updates before implementing features
- Ensure all features work together harmoniously

## Important Implementation Notes
- Token usage includes thinking tokens calculated at ~4 chars per token
- Multiple tool calls execute concurrently for better performance
- Streaming provides real-time token usage updates via SSE
- The browser-use library is included as a git submodule

## Core Development Principles and Expectations
- **Strict Tool Use Guidelines**:
  - You are NOT permitted at anytime assume, guess or either contemplate blindly implementing features
  - You have MCP tools and your expectation is that you use them
  - If provided with specific guidance from the provider, YOU WILL EXECUTE IT EXACTLY AS THEY STATE and not doctor or macgyver your own solution
  - This is very inappropriate
  - Your code should always be:
    - Elegant
    - Meet requirements
    - Simplistic and straight forward
  - Always ask yourself if you're overcomplicating the solution
  - Overcomplicating is not impressive, and in fact will make the human VERY angry