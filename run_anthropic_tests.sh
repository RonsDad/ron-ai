#!/bin/bash

echo "=========================================="
echo "Anthropic SDK Implementation Test Runner"
echo "=========================================="
echo ""

# Check if the Claude backend is running
echo "Checking if Claude backend is running..."
if curl -s http://localhost:8001/health > /dev/null; then
    echo "✅ Claude backend is running"
else
    echo "❌ Claude backend is not running"
    echo ""
    echo "Starting Claude backend..."
    python server/claude_backend.py &
    BACKEND_PID=$!
    echo "Waiting for backend to start..."
    sleep 5
    
    # Check again
    if curl -s http://localhost:8001/health > /dev/null; then
        echo "✅ Claude backend started successfully"
    else
        echo "❌ Failed to start Claude backend"
        echo "Please start it manually with: python server/claude_backend.py"
        exit 1
    fi
fi

echo ""
echo "Running Anthropic SDK tests..."
echo ""

# Run the test suite
python test_anthropic_features.py

# If we started the backend, offer to stop it
if [ ! -z "$BACKEND_PID" ]; then
    echo ""
    echo "Press Enter to stop the Claude backend, or Ctrl+C to keep it running..."
    read
    kill $BACKEND_PID
    echo "Claude backend stopped."
fi
