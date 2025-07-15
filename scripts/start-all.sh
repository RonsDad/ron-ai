#!/bin/bash

# Startup script for Nira - kills ports and starts all services
echo "🚀 Starting Nira - Full Stack Application"
echo "=========================================="

# Kill any existing processes on our ports
echo "🧹 Step 1: Cleaning up existing processes..."
node scripts/kill-ports.js

# Wait a moment for processes to fully terminate
sleep 2

# Start all services using concurrently
echo "🚀 Step 2: Starting all services..."
echo "   - Frontend (Next.js) on port 3000"
echo "   - Browser-use backend (FastAPI) on port 8000" 
echo "   - Claude backend (FastAPI) on port 8001"
echo ""

# Use concurrently to start all services
npx concurrently \
  --kill-others-on-fail \
  --prefix-colors "cyan,magenta,yellow" \
  --names "Frontend,Browser-Backend,Claude-Backend" \
  "npm run frontend" \
  "npm run backend" \
  "npm run claude-backend"
