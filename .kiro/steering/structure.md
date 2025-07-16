# Project Structure

## Root Directory Organization

### Core Application
- **`browser_use/`** - Main Python library for browser automation
- **`src/`** - Frontend React/TypeScript components and services
- **`server/`** - FastAPI backend services and APIs
- **`pages/`** - Next.js pages and API routes

### Configuration & Scripts
- **`scripts/`** - Shell scripts for development and deployment
- **`.kiro/`** - Kiro IDE configuration and steering rules
- **`docker/`** - Docker configuration and base images

### Documentation & Examples
- **`docs/`** - Project documentation (MDX format)
- **`examples/`** - Usage examples and demos
- **`tests/`** - Test suites (CI and integration tests)

### Build & Dependencies
- **`pyproject.toml`** - Python project configuration
- **`package.json`** - Node.js dependencies and scripts
- **`requirements.txt`** - Python dependencies (legacy)
- **`uv.lock`** - Locked Python dependencies

## Key Directory Details

### `browser_use/` - Core Library
```
browser_use/
├── agent/           # AI agent logic and prompts
├── browser/         # Browser session management
├── controller/      # Action controllers and registry
├── dom/            # DOM processing and extraction
├── llm/            # LLM provider integrations
├── integrations/   # Third-party service integrations
└── tokens/         # Token counting and cost tracking
```

### `src/` - Frontend Application
```
src/
├── components/     # React UI components
│   ├── ui/        # Reusable UI components (Radix-based)
│   └── figma/     # Figma-imported components
├── hooks/         # Custom React hooks
├── lib/           # Utility libraries and types
├── services/      # API clients and WebSocket services
└── styles/        # Global CSS and Tailwind config
```

### `server/` - Backend Services
```
server/
├── browser_api.py        # Browser automation REST API
├── browser_server.py     # Main browser service
├── browser_websocket.py  # WebSocket handlers
├── claude_backend.py     # Claude-specific backend
├── claude_browser_api.py # Claude integration API
└── prompts/             # AI prompts and templates
```

### `examples/` - Usage Examples
```
examples/
├── browser/        # Browser configuration examples
├── custom-functions/ # Custom action implementations
├── features/       # Feature demonstrations
├── integrations/   # Third-party integrations
├── models/         # LLM provider examples
├── ui/            # UI integration examples
└── use-cases/     # Real-world automation scenarios
```

## File Naming Conventions

### Python Files
- **Snake case**: `browser_session.py`, `dom_service.py`
- **Service pattern**: `service.py` for main logic, `views.py` for data models
- **Test files**: `test_*.py` or `*_test.py`

### TypeScript/React Files
- **PascalCase components**: `BrowserEmbed.tsx`, `ChatMessage.tsx`
- **camelCase utilities**: `claudeBrowserService.ts`, `useClaudeBrowserIntegration.ts`
- **Kebab-case pages**: `test-placeholders.tsx`

### Configuration Files
- **Lowercase with extensions**: `next.config.js`, `tailwind.config.js`
- **Dotfiles**: `.env`, `.gitignore`, `.kiro/`

## Import Patterns

### Python Imports
```python
# Relative imports within browser_use
from browser_use.agent.service import Agent
from browser_use.browser import BrowserSession
from browser_use.llm import ChatOpenAI

# External dependencies
import asyncio
from fastapi import FastAPI
```

### TypeScript Imports
```typescript
// Relative imports
import { BrowserEmbed } from '../components/BrowserEmbed'
import { useChatStore } from '../hooks/use-chat-store'

// External dependencies
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
```

## Architecture Patterns

### Backend Services
- **FastAPI routers** for API organization
- **Async/await** for all I/O operations
- **Pydantic models** for data validation
- **WebSocket managers** for real-time communication

### Frontend Components
- **Functional components** with hooks
- **TypeScript interfaces** for type safety
- **Zustand stores** for state management
- **Tailwind classes** for styling

### Browser Automation
- **Session-based** browser management
- **Profile persistence** for cookies/storage
- **Anti-detection** configurations by default
- **Error handling** with graceful fallbacks