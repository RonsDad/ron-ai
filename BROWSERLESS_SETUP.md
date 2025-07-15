# Browserless Integration Setup Guide

This guide walks you through setting up the Browserless cloud browser integration with your Nira project.

## Prerequisites

1. **Python 3.11+** - Your existing Nira environment
2. **Browserless Account** - Sign up at [browserless.io](https://browserless.io)
3. **API Token** - Get your token from the Browserless dashboard

## Step 1: Get Your Browserless API Token

1. Go to [browserless.io](https://browserless.io) and create an account
2. Navigate to your dashboard
3. Copy your API token
4. Note your region (e.g., `sfo` for San Francisco)

## Step 2: Update Environment Configuration

Add the following variables to your `.env` file:

```bash
# Browserless Configuration
BROWSERLESS_API_TOKEN=your-token-here
BROWSERLESS_ENDPOINT=wss://production-sfo.browserless.io
USE_BROWSERLESS=true
BROWSERLESS_USE_RESIDENTIAL_PROXY=false
BROWSERLESS_TIMEOUT=600000

# Optional Advanced Features
BROWSERLESS_ENABLE_LIVE_URL=true
BROWSERLESS_ENABLE_CAPTCHA_SOLVING=true
BROWSERLESS_ENABLE_RECORDING=true
```

### Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `BROWSERLESS_API_TOKEN` | Your Browserless API token | Required |
| `BROWSERLESS_ENDPOINT` | WebSocket endpoint URL | `wss://production-sfo.browserless.io` |
| `USE_BROWSERLESS` | Enable Browserless integration | `false` |
| `BROWSERLESS_USE_RESIDENTIAL_PROXY` | Use residential proxy | `false` |
| `BROWSERLESS_TIMEOUT` | Session timeout in milliseconds | `600000` (10 minutes) |
| `BROWSERLESS_ENABLE_LIVE_URL` | Enable live URL generation | `false` |
| `BROWSERLESS_ENABLE_CAPTCHA_SOLVING` | Enable automatic captcha solving | `false` |
| `BROWSERLESS_ENABLE_RECORDING` | Enable session recording | `false` |

## Step 3: Install Dependencies

The integration uses your existing browser-use dependencies. No additional packages are required.

## Step 4: Test the Integration

Run the test script to verify everything is working:

```bash
python test_browserless_integration.py
```

This will test:
- Local browser functionality
- Browserless configuration
- Session creation and management
- Hybrid mode operation
- Agent creation

## Step 5: Start the Enhanced Server

Your existing server will automatically include the new browser API endpoints:

```bash
python server/browser_server.py
```

## API Endpoints

The integration adds the following new endpoints:

### Browser Management
- `GET /api/browser/health` - Health check
- `GET /api/browser/stats` - Get browser statistics
- `GET /api/browser/mode` - Get current browser mode
- `POST /api/browser/mode` - Set browser mode

### Session Management
- `POST /api/browser/session` - Create browser session
- `GET /api/browser/session/{session_id}` - Get session info
- `DELETE /api/browser/session/{session_id}` - Close session
- `GET /api/browser/sessions` - List all sessions
- `DELETE /api/browser/sessions` - Close all sessions

### Agent Management
- `POST /api/browser/agent` - Create browser agent

### Browserless Features
- `POST /api/browser/session/{session_id}/live-url` - Generate live URL
- `POST /api/browser/session/{session_id}/recording/start` - Start recording
- `POST /api/browser/session/{session_id}/recording/stop` - Stop recording
- `POST /api/browser/session/{session_id}/captcha/solve` - Solve captcha

### Configuration
- `POST /api/browser/browserless/config` - Update Browserless config
- `GET /api/browser/browserless/test` - Test connection

## Usage Examples

### Basic Browser Session

```python
import asyncio
from src.browser.enhanced_browser_manager import get_browser_manager

async def create_session():
    manager = get_browser_manager()
    
    # Create a Browserless session
    session = await manager.create_browser_session(
        browser_mode="browserless",
        enable_recording=True,
        enable_live_url=True
    )
    
    print(f"Session created: {session.session_id}")
    if session.live_url:
        print(f"Live URL: {session.live_url}")
    
    return session

# Run the example
session = asyncio.run(create_session())
```

### Browser Agent with Task

```python
import asyncio
from src.browser.enhanced_browser_manager import create_browser_agent

async def run_agent():
    agent = await create_browser_agent(
        task="Navigate to https://example.com and describe what you see",
        llm_provider="anthropic",
        browser_mode="browserless",
        enable_recording=True
    )
    
    # Run the agent
    result = await agent.run()
    print(f"Agent completed: {result}")

# Run the example
asyncio.run(run_agent())
```

### Using the REST API

```bash
# Create a browser session
curl -X POST "http://localhost:8000/api/browser/session" \
  -H "Content-Type: application/json" \
  -d '{
    "browser_mode": "browserless",
    "enable_recording": true,
    "enable_live_url": true
  }'

# Generate live URL
curl -X POST "http://localhost:8000/api/browser/session/{session_id}/live-url?timeout=600000"

# Start recording
curl -X POST "http://localhost:8000/api/browser/session/{session_id}/recording/start"

# Get session stats
curl -X GET "http://localhost:8000/api/browser/stats"
```

## Browser Modes

The integration supports three browser modes:

### 1. Local Mode (`"local"`)
- Uses local Playwright browser instances
- Same as your existing setup
- No cloud dependencies

### 2. Browserless Mode (`"browserless"`)
- Uses Browserless cloud browsers
- Advanced features available (live URL, recording, captcha solving)
- Requires API token

### 3. Hybrid Mode (`"hybrid"`)
- Tries Browserless first, falls back to local
- Best of both worlds
- Automatic failover

## Advanced Features

### Live URL Generation
Generate shareable URLs for human interaction:

```python
live_url = await session.generate_live_url(timeout=600000)  # 10 minutes
print(f"Share this URL: {live_url}")
```

### Session Recording
Record browser sessions for playback:

```python
await session.start_recording()
# ... perform actions ...
recording_data = await session.stop_recording()
```

### Automatic Captcha Solving
Enable automatic captcha detection and solving:

```python
await session.enable_captcha_detection()
result = await session.solve_captcha()
print(f"Captcha solved: {result['solved']}")
```

## Troubleshooting

### Common Issues

1. **"Browserless API token is required"**
   - Make sure `BROWSERLESS_API_TOKEN` is set in your `.env` file
   - Verify the token is correct from your Browserless dashboard

2. **"Browserless connection test failed"**
   - Check your internet connection
   - Verify the endpoint URL is correct
   - Ensure your Browserless account is active

3. **"Maximum concurrent sessions reached"**
   - Check your Browserless plan limits
   - Close unused sessions
   - Consider upgrading your plan

4. **Import errors**
   - Make sure you're running from the Nira root directory
   - Check that all files are in the correct locations

### Debug Mode

Enable debug logging to see detailed information:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Test Connection

Test your Browserless connection:

```bash
curl -X GET "http://localhost:8000/api/browser/browserless/test"
```

## Cost Considerations

- **Local Mode**: No additional costs
- **Browserless Mode**: Charged per session/minute
- **Hybrid Mode**: Only charged when Browserless is used

Monitor your usage through the Browserless dashboard and API stats.

## Security Notes

1. **API Token**: Keep your Browserless API token secure
2. **Live URLs**: Generated URLs are publicly accessible
3. **Recordings**: May contain sensitive information
4. **Residential Proxy**: Additional privacy considerations

## Next Steps

1. Test the basic integration
2. Experiment with different browser modes
3. Try the advanced features (live URL, recording)
4. Integrate with your existing workflows
5. Monitor usage and costs

For more advanced usage, see the [Browser Integration Analysis](BROWSER_INTEGRATION_ANALYSIS.md) document.
