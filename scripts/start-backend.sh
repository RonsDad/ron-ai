#!/bin/bash

# Navigate to project root
cd "$(dirname "$0")/.."

# Activate virtual environment if it exists
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Set PYTHONPATH to include the project root
export PYTHONPATH="/workspaces/Nira:$PYTHONPATH"

# Ensure logs directory exists
mkdir -p logs

# Ensure browsers run in headless mode
export CHROME_HEADLESS=1
export MOZ_HEADLESS=1

# For Linux systems, use virtual display if available
if [[ "$OSTYPE" == "linux-gnu"* ]] && command -v Xvfb &> /dev/null; then
    # Check if Xvfb is already running on display :99
    if ! pgrep -f "Xvfb :99" > /dev/null; then
        echo "Starting virtual display for headless operation..."
        Xvfb :99 -screen 0 1280x720x24 -ac +extension GLX +render -noreset &
        sleep 1
    fi
    export DISPLAY=:99
fi

# Start the browser-use backend server
cd server
python browser_server.py
