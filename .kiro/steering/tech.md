# Technology Stack

## Core Technologies

### Backend
- **Python 3.11+**: Primary backend language
- **FastAPI**: REST API framework for browser and Claude backends
- **Playwright**: Browser automation engine with Patchright for stealth
- **WebSockets**: Real-time communication between frontend and backend
- **Uvicorn**: ASGI server for FastAPI applications

### Frontend
- **Next.js 15**: React framework for the web interface
- **React 18**: UI library with TypeScript
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Headless UI components
- **Zustand**: State management
- **Monaco Editor**: Code editor integration

### Browser Automation
- **browser-use**: Core library for AI-driven browser control
- **Patchright**: Stealth browser automation (Playwright fork)
- **Chromium**: Primary browser engine
- **Browserless**: Cloud browser service integration

### AI/LLM Integration
- **OpenAI**: GPT models support
- **Anthropic**: Claude models support
- **Google AI**: Gemini models support
- **Groq**: Fast inference support
- **Ollama**: Local model support

## Build System & Package Management

### Python
- **uv**: Fast Python package manager and virtual environment tool
- **pyproject.toml**: Project configuration and dependencies
- **pytest**: Testing framework with async support
- **ruff**: Code formatting and linting

### Node.js
- **npm**: Package manager for frontend dependencies
- **TypeScript**: Type checking and compilation
- **PostCSS**: CSS processing with Tailwind

## Common Commands

### Development Setup
```bash
# Install Python dependencies
uv sync --all-extras

# Install Node.js dependencies  
npm install

# Install Playwright browsers
playwright install chromium --with-deps
```

### Running Services
```bash
# Start all services (recommended)
npm run dev
# or
./scripts/start-all.sh

# Individual services
npm run backend          # Browser-use backend (port 8000)
npm run claude-backend   # Claude backend (port 8001)  
npm run frontend         # Next.js frontend (port 3000)
```

### Development Commands
```bash
# Frontend development
npm run build            # Build Next.js app
npm run build-start      # Build and start production

# Python development
pytest                   # Run tests
ruff check              # Lint code
ruff format             # Format code

# Utilities
npm run kill-ports      # Kill processes on development ports
```

### Docker
```bash
# Build Docker image
docker build . -t browseruse --no-cache

# Run container
docker run -v "$PWD/data":/data browseruse
```

## Environment Configuration

### Required Environment Variables
```bash
# LLM API Keys (choose your provider)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
GROQ_API_KEY=

# Optional cloud services
BROWSERLESS_API_KEY=
```

### Development Settings
- Python virtual environment in `.venv/`
- Browser profiles stored in `./browser_profile/`
- Downloads saved to `./downloads/`
- Logs written to `logs/` directory