# Socket.IO Connection Debugging Guide

## Issue Summary

The Nira application uses standard WebSockets (not Socket.IO) for real-time communication. However, you might see repeated 403 errors for Socket.IO connection attempts in the logs:

```
INFO:     ('127.0.0.1', 64690) - "WebSocket /socket.io/?EIO=4&transport=websocket" 403
INFO:     connection rejected (403 Forbidden)
```

## Why This Happens

These Socket.IO connection attempts typically come from:

1. **Browser Extensions**
   - Ad blockers (uBlock Origin, AdBlock Plus)
   - Privacy extensions (Privacy Badger, Ghostery)
   - Developer tools extensions
   - Analytics blockers

2. **Third-Party Scripts**
   - Google Analytics
   - Facebook Pixel
   - Other tracking/analytics scripts on pages you browse
   - Chat widgets (Intercom, Drift, etc.)

3. **Embedded Content**
   - iFrames with Socket.IO implementations
   - Third-party widgets

## Solutions Implemented

### 1. Log Filtering
The backend now filters out Socket.IO 403 errors from the logs to reduce noise:

```python
class SocketIOFilter(logging.Filter):
    def filter(self, record):
        if 'socket.io' in record.getMessage() and '403' in record.getMessage():
            return False
        return True
```

### 2. Explicit Rejection Routes
Added routes to handle Socket.IO requests gracefully:

```python
@app.get("/socket.io/")
async def reject_socket_io():
    return {"error": "Socket.IO not supported. This application uses standard WebSockets at /ws/{session_id}"}
```

## Debugging Steps

If you want to identify the source of Socket.IO connections:

### 1. Use the Debug Script
```bash
# Run the Socket.IO debug server
node scripts/debug-socketio.js

# In another terminal, modify server.js to proxy Socket.IO to debug server
# Add this to the proxy configuration:
# '/socket.io': {
#   target: 'http://localhost:8888',
#   changeOrigin: true
# }
```

### 2. Check Browser Extensions
1. Open Chrome DevTools
2. Go to Network tab
3. Filter by "WS" (WebSocket)
4. Look for socket.io requests
5. Check the "Initiator" column to see what's making the requests

### 3. Disable Extensions
Try running with extensions disabled:
```bash
# Launch Chrome without extensions
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --disable-extensions
```

## Confirming Your App Works Correctly

The actual WebSocket connections for Nira use the `/ws/{session_id}` endpoint. You can verify these are working by:

1. Checking for successful WebSocket connections in the logs:
   ```
   WebSocket connection established for session {session_id}
   ```

2. Looking for viewport updates and other WebSocket messages:
   ```
   Sent viewport update - URL: {current_url}
   ```

3. Using the WebSocket test script:
   ```bash
   node test_websocket.js
   ```

## Performance Impact

The Socket.IO 403 errors have no impact on application functionality. They are simply rejected connection attempts from external sources. The log filtering prevents them from cluttering your console output.

## Additional Notes

- Nira uses FastAPI's native WebSocket support, not Socket.IO
- The browser automation (browser-use) communicates via standard WebSockets
- All legitimate WebSocket traffic goes through `/ws/{session_id}` endpoints
- The 403 responses are the correct behavior - we're rejecting invalid connection attempts 