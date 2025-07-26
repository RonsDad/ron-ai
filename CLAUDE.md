# Claude Sonnet 4 Integration Documentation

## Overview

This document provides the **MOST DIRECT** way to integrate Claude Sonnet 4 with native tool calling. The model is smart enough to use tools autonomously - **DO NOT** over-engineer how it uses them.

## Core Principle

**Claude Sonnet 4 has native tool calling. Let it do its job. Don't micromanage it.**

## Simple Streaming Integration

Based on official Anthropic documentation, here's the correct way to implement streaming with tools:

### 1. Basic Setup

```python
import asyncio
from anthropic import AsyncAnthropic

client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
```

### 2. Simple Message Creation (Non-Streaming)

```python
message = await client.messages.create(
    max_tokens=4096,
    messages=[{"role": "user", "content": "Hello, Claude"}],
    model="claude-sonnet-4-20250514"
)
print(message.content)
```

### 3. Simple Streaming (Text Only)

```python
async with client.messages.stream(
    max_tokens=4096,
    messages=[{"role": "user", "content": "Hello there!"}],
    model="claude-sonnet-4-20250514"
) as stream:
    async for text in stream.text_stream:
        print(text, end="", flush=True)
    print()
```

### 4. Streaming with Native Tools

```python
async with client.messages.stream(
    max_tokens=4096,
    messages=[{"role": "user", "content": "What's the weather like?"}],
    model="claude-sonnet-4-20250514",
    tools=[
        {"type": "web_search_20250305", "name": "web_search"},
        {"type": "bash_20250124", "name": "bash"},
        {"type": "code_execution_20250522", "name": "code_execution"},
        {"type": "text_editor_20250429", "name": "text_editor"}
    ]
) as stream:
    async for event in stream:
        if event.type == "text":
            print(event.text, end="", flush=True)
        elif event.type == "content_block_stop":
            if hasattr(event.content_block, 'type') and event.content_block.type == "tool_use":
                print(f"\nTool used: {event.content_block.name}")
    print()
```

## Correct Tool Definitions (2025)

**CRITICAL**: Use the correct tool versions from the documentation:

```python
NATIVE_TOOLS = {
    "web_search": {"type": "web_search_20250305", "name": "web_search"},
    "bash": {"type": "bash_20250124", "name": "bash"}, 
    "code_execution": {"type": "code_execution_20250522", "name": "code_execution"},
    "text_editor": {"type": "text_editor_20250429", "name": "text_editor"},
    "computer": {
        "type": "computer_20241022", 
        "name": "computer",
        "display_width_px": 1920,
        "display_height_px": 1080
    }
}
```

## FastAPI Streaming Implementation

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import json

@app.post("/chat")
async def chat_stream(request: ChatRequest):
    async def stream_generator():
        async with client.messages.stream(
            max_tokens=request.max_tokens,
            messages=request.messages,
            model="claude-sonnet-4-20250514",
            tools=request.tools
        ) as stream:
            async for event in stream:
                if event.type == "text":
                    yield f"data: {json.dumps({'type': 'text', 'text': event.text})}\n\n"
                elif event.type == "content_block_stop":
                    yield f"data: {json.dumps({'type': 'block_stop', 'block': event.content_block})}\n\n"
    
    return StreamingResponse(stream_generator(), media_type="text/event-stream")
```

## What NOT to Do

❌ **Don't create complex tool management systems**
❌ **Don't try to control when Claude uses tools** 
❌ **Don't create custom tool execution wrappers**
❌ **Don't over-engineer the streaming response handling**
❌ **Don't use outdated tool versions like `web_search_20241210`**

## What TO Do  

✅ **Use `client.messages.stream()` as async context manager**
✅ **Let Claude decide when to use tools autonomously**
✅ **Use correct tool type identifiers from 2025 documentation**
✅ **Stream text deltas directly with `stream.text_stream`**
✅ **Handle tool use events in the stream naturally**

## Complete Working Example

```python
import asyncio
import os
from anthropic import AsyncAnthropic

async def main():
    client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    # Let Claude use tools autonomously
    async with client.messages.stream(
        max_tokens=4096,
        messages=[{
            "role": "user", 
            "content": "Search for the latest news about AI and write a summary"
        }],
        model="claude-sonnet-4-20250514",
        tools=[
            {"type": "web_search_20250305", "name": "web_search"},
            {"type": "text_editor_20250429", "name": "text_editor"}
        ]
    ) as stream:
        async for text in stream.text_stream:
            print(text, end="", flush=True)
        print()
        
        # Get the complete message after streaming
        final_message = await stream.get_final_message()
        print(f"\nFinal message ID: {final_message.id}")

if __name__ == "__main__":
    asyncio.run(main())
```

## Key Points

1. **Claude Sonnet 4 is intelligent** - It knows when and how to use tools
2. **Keep it simple** - The official SDK handles complexity for you
3. **Use correct tool versions** - Check documentation for latest versions
4. **Stream properly** - Use `client.messages.stream()` context manager
5. **Don't overthink** - Claude will handle tool orchestration

## Troubleshooting

### Tool Version Errors
If you get errors like "Input tag 'web_search_20241210' not expected", you're using outdated tool versions. Update to 2025 versions.

### Streaming Not Working
Make sure you're using `async with client.messages.stream()` and not trying to manually manage the async generator.

### Tool Not Being Used
Claude decides when tools are needed. Don't force it - just provide the tools and let Claude use them when appropriate.

---

**Remember: Claude Sonnet 4 is smart. Trust it. Don't over-engineer it.**