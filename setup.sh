#!/bin/bash

# Ron AI Setup Script
echo "Setting up Ron AI Healthcare Copilot..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required but not installed."
    echo "Please install Python 3.8 or higher."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is required but not installed."
    echo "Please install Node.js 18 or higher."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is required but not installed."
    echo "Please install npm."
    exit 1
fi

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install requirements
pip install -r ../requirements.txt

# Additional dependencies that might be needed
pip install aiofiles python-multipart

echo "Backend dependencies installed!"

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd ../src/ron-ai

# Install npm packages
npm install

echo "Frontend dependencies installed!"

# Create .env file if it doesn't exist
cd ../..
if [ ! -f ".env" ]; then
    echo ""
    echo "Creating .env file..."
    cat > .env << EOL
# Anthropic API Key (required)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Browserless API Token (optional, for browser automation)
BROWSERLESS_API_TOKEN=your_browserless_token_here

# Environment
NODE_ENV=development
EOL
    echo ".env file created. Please update it with your API keys."
fi

echo ""
echo "========================================="
echo "Setup complete!"
echo "========================================="
echo ""
echo "IMPORTANT: Before running the application:"
echo "1. Edit the .env file and add your ANTHROPIC_API_KEY"
echo "2. Optionally add BROWSERLESS_API_TOKEN for browser automation"
echo ""
echo "To start the application, run:"
echo "  ./start.sh"
echo ""
echo "=========================================" 