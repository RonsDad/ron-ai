#!/bin/bash

# Enhanced startup script with better error handling
set -e  # Exit on any error

echo "🚀 Nira Startup Script"
echo "======================"
echo ""

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    node scripts/kill-ports.js
    exit 0
}

# Set up signal handlers for clean shutdown
trap cleanup SIGINT SIGTERM

# Step 1: Kill existing processes
echo "🧹 Step 1: Cleaning up existing processes on ports 3000, 8000, 8001..."
node scripts/kill-ports.js

if [ $? -ne 0 ]; then
    echo "❌ Failed to clean up ports. Continuing anyway..."
fi

# Step 2: Wait for cleanup to complete
echo "⏳ Waiting for cleanup to complete..."
sleep 3

# Step 3: Check if virtual environment exists for Python backends
if [ ! -d "venv" ]; then
    echo "⚠️  Warning: Python virtual environment 'venv' not found."
    echo "   The Python backends may not start correctly."
    echo "   Consider running: python -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
fi

# Step 4: Start all services
echo ""
echo "🚀 Step 2: Starting all services..."
echo "   📱 Frontend (Next.js) → http://localhost:3000"
echo "   🤖 Browser-use backend (FastAPI) → http://localhost:8000"  
echo "   🧠 Claude backend (FastAPI) → http://localhost:8001"
echo ""
echo "Press Ctrl+C to stop all services"
echo "=================================="

# Start services with concurrently
npx concurrently \
    --kill-others-on-fail \
    --restart-tries 3 \
    --prefix-colors "cyan,magenta,yellow" \
    --names "Frontend,Browser-API,Claude-API" \
    --timestamp-format "HH:mm:ss" \
    "npm run frontend" \
    "npm run backend" \
    "npm run claude-backend"
