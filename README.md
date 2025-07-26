# Ron AI Healthcare Copilot

An AI-powered healthcare advocacy assistant integrating Claude Sonnet 4 with advanced tool capabilities.

## Features

- **Claude Sonnet 4 Integration**: Full access to Claude's native tools including:
  - Web search for real-time information
  - Code execution for data analysis
  - Text editing capabilities
  - Computer use for browser automation
  - Bash command execution
  
- **Healthcare-Specific Capabilities**:
  - Provider search and recommendations
  - Medication management
  - Appointment scheduling
  - Deep research mode for comprehensive health information
  
- **Advanced Features**:
  - Extended thinking for complex reasoning
  - Citation support for factual accuracy
  - Hallucination mitigation
  - Prompt caching for improved performance
  - Real-time streaming responses

## Prerequisites

- Python 3.8 or higher
- Node.js 18 or higher
- npm
- An Anthropic API key

## Setup

1. **Clone the repository** (if not already done)

2. **Run the setup script**:
   ```bash
   ./setup.sh
   ```
   This will:
   - Create a Python virtual environment
   - Install all backend dependencies
   - Install all frontend dependencies
   - Create a `.env` file template

3. **Configure your API keys**:
   Edit the `.env` file and add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=your_actual_api_key_here
   ```
   
   Optionally, add a Browserless API token for browser automation:
   ```
   BROWSERLESS_API_TOKEN=your_browserless_token_here
   ```

4. **Start the application**:
   ```bash
   ./start.sh
   ```

## Usage

Once running, the application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### Chat Interface

1. Type your healthcare-related question in the input box
2. Press Enter or click the send button
3. Claude will process your request using appropriate tools
4. Enable "Deep Research" mode for comprehensive web research

### Quick Actions

Type "/" in the message box to access quick action templates for common healthcare tasks.

## Troubleshooting

### Backend Issues

1. **"ANTHROPIC_API_KEY not set" error**:
   - Make sure you've edited the `.env` file with your actual API key
   - The key should not be the placeholder value

2. **Backend fails to start**:
   - Check if port 8000 is already in use: `lsof -i :8000`
   - Kill any existing process: `kill -9 <PID>`
   - Ensure all Python dependencies are installed: `pip install -r requirements.txt`

3. **Import errors**:
   - Make sure you're using the virtual environment
   - Reinstall dependencies: `pip install -r requirements.txt`

### Frontend Issues

1. **Frontend fails to start**:
   - Check if port 3000 is already in use: `lsof -i :3000`
   - Clear npm cache: `npm cache clean --force`
   - Reinstall dependencies: `rm -rf node_modules && npm install`

2. **API connection errors**:
   - Ensure the backend is running on port 8000
   - Check the browser console for detailed error messages
   - Verify the proxy configuration in `next.config.ts`

### Claude Integration Issues

1. **No response from Claude**:
   - Verify your API key is valid
   - Check the backend logs for error messages
   - Ensure you have sufficient API credits

2. **Tool execution failures**:
   - Some tools require specific permissions or configurations
   - Check the backend logs for detailed error messages
   - Ensure all required environment variables are set

## Architecture

```
ron-ai/
├── backend/
│   ├── api.py                    # FastAPI backend server
│   ├── claude_sonnet_4_agent.py  # Claude integration
│   ├── healthcare_agent_integration.py
│   └── claude_browser_integration.py
├── src/ron-ai/
│   ├── app/                      # Next.js app directory
│   ├── components/               # React components
│   ├── hooks/                    # Custom React hooks
│   └── lib/                      # Utilities and types
├── .env                          # Environment variables
├── requirements.txt              # Python dependencies
├── setup.sh                      # Setup script
└── start.sh                      # Startup script
```

## API Endpoints

- `POST /chat` - Main chat endpoint with Claude
- `POST /healthcare/task` - Healthcare-specific tasks
- `POST /healthcare/browser` - Browser automation tasks
- `POST /code/execute` - Code execution
- `POST /search` - Web search
- `POST /files/upload` - File upload
- `POST /files/analyze` - File analysis
- `POST /api/run_sse` - Deep research (SSE)
- `GET /health` - Health check

## Development

### Backend Development

```bash
cd backend
source venv/bin/activate
python api.py
```

### Frontend Development

```bash
cd src/ron-ai
npm run dev
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

[Your license here] 