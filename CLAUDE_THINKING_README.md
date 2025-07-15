# Claude Sonnet 4 with Extended Thinking Implementation

This implementation adds support for Claude Sonnet 4's extended thinking capabilities, including reasoning tokens exposure and interleaved thinking with tool calls.

## Key Features

### 1. Extended Thinking
- **Reasoning Transparency**: Claude's thought process is exposed through thinking blocks
- **Budget Control**: Configure thinking token budget (default: 10,000 tokens)
- **Thinking Blocks**: Structured thinking content with signatures for verification

### 2. Interleaved Thinking with Tool Use
- **Beta Header**: Uses `anthropic-beta: interleaved-thinking-2025-05-14`
- **Context Preservation**: Thinking blocks are maintained across conversation turns
- **Tool Reasoning**: Claude can think between tool calls, not just at the beginning

### 3. API Changes

#### Request Parameters
```json
{
  "message": "Your message here",
  "conversation_history": [],
  "enable_thinking": true,  // Enable/disable thinking (default: true)
  "thinking_budget": 10000  // Token budget for thinking (default: 10000)
}
```

#### Response Structure
```json
{
  "response": "Claude's final response text",
  "thinking": [
    {
      "type": "thinking",
      "thinking": "Claude's reasoning process...",
      "signature": "cryptographic signature"
    }
  ],
  "tool_calls": [...],
  "tool_results": [...],
  "stop_reason": "end_turn" | "tool_use" | "max_tokens" | "refusal"
}
```

## Implementation Details

### 1. Beta Client Usage
```python
# Using beta client for extended features
response = client.beta.messages.create(
    model="claude-sonnet-4-20250514",
    thinking={"type": "enabled", "budget_tokens": 10000},
    extra_headers={"anthropic-beta": "interleaved-thinking-2025-05-14"}
)
```

### 2. Content Block Processing
The implementation properly handles different content block types:
- `thinking`: Reasoning process blocks
- `tool_use`: Tool invocation blocks
- `text`: Final response blocks
- `redacted_thinking`: Encrypted thinking blocks (if present)

### 3. Multi-Turn Conversations
Thinking blocks are preserved and passed back in subsequent requests to maintain context:
```python
messages.append({
    "role": "assistant",
    "content": [thinking_blocks, tool_use_blocks]
})
```

## Testing

Run the test script to verify the implementation:
```bash
# Make sure the Claude backend is running first
python test_claude_thinking.py
```

The test script includes:
1. Health check verification
2. Simple math problem with step-by-step thinking
3. Tool use with interleaved thinking

## Benefits

1. **Debugging**: Understand Claude's decision-making process
2. **Transparency**: See how Claude arrives at conclusions
3. **Better Tool Use**: More thoughtful tool selection and usage
4. **Educational**: Learn from Claude's reasoning patterns

## Frontend Integration

The frontend can display thinking blocks in various ways:
- Collapsible sections for reasoning
- Different styling/colors for thinking vs response
- Toggle to show/hide thinking for end users
- Debug mode with full thinking exposure

## Notes

- Claude Sonnet 4 model: `claude-sonnet-4-20250514`
- Requires `anthropic` package in requirements.txt
- Uses FastAPI for the backend server
- Thinking tokens count against the total token budget
- The `refusal` stop reason is new in Claude 4 models
