#!/bin/bash

echo "🚀 Starting Unified Browser Agent"
echo "================================"

# Check for required environment variables
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "❌ Error: ANTHROPIC_API_KEY environment variable not set"
    echo "Please set it with: export ANTHROPIC_API_KEY='your-api-key'"
    exit 1
fi

# Install browser-use if not already installed
if ! python -c "import browser_use" 2>/dev/null; then
    echo "📦 Installing browser-use..."
    pip install browser-use
fi

# Install playwright browsers if needed
if ! python -c "import playwright" 2>/dev/null; then
    echo "🌐 Installing Playwright browsers..."
    pip install playwright
    playwright install chromium --with-deps
fi

# Start the unified backend
echo "✅ Starting backend on port 8000..."
python unified_backend.py 