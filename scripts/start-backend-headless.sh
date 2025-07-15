#!/bin/bash

# Start Backend with Virtual Display Support
echo "🚀 Starting Nira Backend with Virtual Display..."

# Check if Xvfb is installed
if ! command -v Xvfb &> /dev/null; then
    echo "⚠️  Xvfb not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "On macOS, Xvfb is not needed. Browsers will run in headless mode."
    elif command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y xvfb
    elif command -v yum &> /dev/null; then
        sudo yum install -y xorg-x11-server-Xvfb
    else
        echo "Please install Xvfb manually for your system"
        exit 1
    fi
fi

# Kill any existing Xvfb processes
pkill -f "Xvfb :99" 2>/dev/null || true

# Start Xvfb on display :99 (unless on macOS)
if [[ "$OSTYPE" != "darwin"* ]] && command -v Xvfb &> /dev/null; then
    echo "Starting Xvfb virtual display..."
    Xvfb :99 -screen 0 1280x720x24 -ac +extension GLX +render -noreset &
    export DISPLAY=:99
    echo "Virtual display started on DISPLAY=:99"
    sleep 2
fi

# Ensure Chrome/Chromium runs in true headless mode
export CHROME_HEADLESS=1
export MOZ_HEADLESS=1

# Start the browser backend
echo "Starting browser backend..."
cd "$(dirname "$0")/.." || exit
python server/browser_server.py 