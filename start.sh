#!/bin/bash

# Ron AI Startup Script
echo "Starting Ron AI Healthcare Copilot..."

# Function to cleanup on exit
cleanup() {
    echo "Shutting down services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required but not installed."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is required but not installed."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Error: .env file not found!"
    echo "Please run ./setup.sh first to set up the environment."
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check if API key is set
if [ -z "$ANTHROPIC_API_KEY" ] || [ "$ANTHROPIC_API_KEY" = "your_anthropic_api_key_here" ]; then
    echo "Error: ANTHROPIC_API_KEY not set in .env file!"
    echo "Please edit the .env file and add your Anthropic API key."
    exit 1
fi

# Start backend API
echo "Starting backend API on port 8000..."
cd backend

# Activate virtual environment from project root
cd /Users/timhunter/ron-ai
source venv/bin/activate
export PYTHONPATH="${PYTHONPATH}:$(pwd):$(pwd)/backend"
cd backend

python3 api.py &
BACKEND_PID=$!

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 5

# Check if backend is running
if ! curl -s http://localhost:8000/health > /dev/null; then
    echo "Warning: Backend health check failed, but continuing..."
fi

# Start frontend
echo "Starting frontend on port 3000..."
cd ../src/ron-ai
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 5

echo ""
echo "========================================="
echo "Ron AI Healthcare Copilot is running!"
echo "========================================="
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo "========================================="

# Keep script running
wait 