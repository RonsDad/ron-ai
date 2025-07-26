"""
FastAPI Backend for Claude Sonnet 4 Healthcare Agent
Exposes all Claude 4 capabilities through REST API endpoints
"""

import logging
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import asyncio
import json
import os
from datetime import datetime
import tempfile
import shutil
from browser_use import Agent, BrowserSession, BrowserProfile
from browser_use.llm import ChatAnthropic

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('api.log')
    ]
)
logger = logging.getLogger(__name__)

from claude_completions import ClaudeCompletions

# Import tools
try:
    from tools import get_tool_definitions_for_claude, execute_tool
    TOOLS_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Tools not available: {e}")
    TOOLS_AVAILABLE = False

# Optional imports - disable for now to focus on completions
try:
    from healthcare_agent_integration import HealthcareAgentIntegration
    from claude_browser_integration import ClaudeBrowserIntegration
    ADVANCED_FEATURES = True
except ImportError:
    ADVANCED_FEATURES = False

# Browser-Use Integration (always available)
try:
    from browser_use_service import browser_use_service, BrowserUseService
    BROWSER_USE_AVAILABLE = True
    logger.info("Browser-Use service imported successfully")
except ImportError as e:
    BROWSER_USE_AVAILABLE = False
    logger.warning(f"Browser-Use service not available: {e}")

# Deep Research Agent Integration (optional)
try:
    from deep_research_agent import root_agent as deep_research_root_agent
    from google.adk.runners import InMemoryRunner
    from google.adk.agents import RunConfig
    from google.adk.live_request_queue import LiveRequestQueue
    from google.genai import types as genai_types
    DEEP_RESEARCH_AVAILABLE = True
except ImportError as e:
    print(f"Deep Research Agent not available: {e}")
    DEEP_RESEARCH_AVAILABLE = False

# Initialize FastAPI app
app = FastAPI(
    title="Claude Sonnet 4 Healthcare API",
    description="API for Claude Sonnet 4 with all native tools and healthcare integration",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev server
        "http://localhost:3001",  # Alternative dev port
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "https://localhost:3000", # HTTPS variants
        "https://localhost:3001"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Initialize agents
logger.info("Initializing Claude completions agent...")
claude_agent = ClaudeCompletions()

if ADVANCED_FEATURES:
    logger.info("Initializing healthcare agent...")
    healthcare_agent = HealthcareAgentIntegration()
    logger.info("Initializing browser integration...")
    browser_integration = ClaudeBrowserIntegration()
    logger.info("All agents initialized successfully")
else:
    logger.info("Advanced features disabled - completions only mode")
    healthcare_agent = None
    browser_integration = None


# Pydantic models for request/response
class ChatMessage(BaseModel):
    role: str = Field(..., description="Message role (user/assistant)")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    system_prompt: Optional[str] = None
    temperature: float = Field(0.0, ge=0.0, le=1.0)
    max_tokens: int = Field(4096, gt=0)
    enable_caching: bool = True
    cache_ttl: str = Field("5m", pattern="^(5m|1h)$")
    enable_thinking: bool = True
    thinking_budget: int = Field(20000, gt=0)
    enable_citations: bool = True
    stream: bool = False
    tools: List[str] = Field(
        default_factory=lambda: ["bash", "code_execution", "computer", "text_editor", "web_search", "browser_use"],
        description="List of tools to enable"
    )


class HealthcareTaskRequest(BaseModel):
    task_description: str
    use_browser: bool = True
    enable_extended_thinking: bool = True
    enable_web_search: bool = True
    file_ids: Optional[List[str]] = None


class CodeExecutionRequest(BaseModel):
    code_task: str
    verify_output: bool = True
    enable_thinking: bool = True
    thinking_budget: int = Field(20000, gt=0)


class WebSearchRequest(BaseModel):
    query: str
    num_results: int = Field(5, gt=0, le=20)
    analyze: bool = True


class FileAnalysisRequest(BaseModel):
    task: str
    file_ids: List[str]
    enable_thinking: bool = True


class BrowserTaskRequest(BaseModel):
    task: str
    context: Optional[Dict[str, Any]] = None


class DeepResearchRequest(BaseModel):
    appName: str
    userId: str
    sessionId: str
    newMessage: Dict[str, Any]
    streaming: bool = True




# Browser-Use specific request models
class BrowserUseCreateSessionRequest(BaseModel):
    timeout_ms: int = Field(600000, gt=0)  # 10 minutes default


class BrowserUseNavigateRequest(BaseModel):
    session_id: str
    url: str


class BrowserUseTaskRequest(BaseModel):
    task: str


class BrowserUseCreateWithURLRequest(BaseModel):
    url: str
    timeout_ms: int = Field(600000, gt=0)  # 10 minutes default


# File storage (in production, use proper storage like S3)
UPLOAD_DIR = "/tmp/claude_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
uploaded_files: Dict[str, str] = {}

# Deep Research Sessions Storage
deep_research_sessions: Dict[str, Dict] = {}

# App constants for deep research
APP_NAME = "deep_research_app"

# In-memory session store for browser-use integration (replace with Redis/DB for production)
browser_sessions: Dict[str, Dict] = {}

class ConnectionManager:
	def __init__(self):
		self.active_connections: dict[str, set[WebSocket]] = {}

	async def connect(self, session_id: str, websocket: WebSocket):
		await websocket.accept()
		self.active_connections.setdefault(session_id, set()).add(websocket)

	def disconnect(self, session_id: str, websocket: WebSocket):
		conns = self.active_connections.get(session_id)
		if conns:
			conns.discard(websocket)
			if not conns:
				del self.active_connections[session_id]

	async def broadcast(self, session_id: str, message: str):
		for ws in self.active_connections.get(session_id, set()):
			try:
				await ws.send_text(message)
			except Exception as e:
				logging.error(f"WebSocket send error: {e}")

ws_manager = ConnectionManager()

# Browser agent creation and management functions
async def create_browser_agent(task: str, session_id: str):
	browserless_token = os.getenv('BROWSERLESS_API_TOKEN')
	if not browserless_token:
		logging.error("BROWSERLESS_API_TOKEN environment variable is required")
		raise ValueError("BROWSERLESS_API_TOKEN environment variable is required")

	profile = BrowserProfile(
		stealth=True,
		headless=False,
		viewport={"width": 1280, "height": 900},
	)

	browser_session = BrowserSession(
		cdp_url=f"wss://production-sfo.browserless.io/chrome/stealth?token={browserless_token}",
		browser_profile=profile,
	)
	llm = ChatAnthropic(model="claude-sonnet-4-20250514")
	agent = Agent(
		task=task,
		llm=llm,
		browser_session=browser_session
	)
	try:
		await browser_session.start()
		page = await browser_session.get_current_page()
		cdp = await page.context.new_cdp_session(page)
		await cdp.send("Browserless.startRecording")
		response = await cdp.send('Browserless.liveURL', {"timeout": 600000})
		live_url = response["liveURL"]

		def on_live_complete():
			asyncio.create_task(ws_manager.broadcast(session_id, json.dumps({"event": "live_complete"})))
		cdp.on('Browserless.liveComplete', on_live_complete)

		browser_sessions[session_id] = {
			"agent": agent,
			"browser_session": browser_session,
			"cdp": cdp,
			"live_url": live_url,
			"recording": True,
			"human_in_control": False,
			"agent_running": False,
		}
		await ws_manager.broadcast(session_id, json.dumps({"event": "session_started", "live_url": live_url}))
		return live_url
	except Exception as e:
		logging.error(f"Error creating browser agent for session {session_id}: {e}")
		await browser_session.close()
		raise

async def stop_recording_and_close(session_id: str):
	session = browser_sessions.get(session_id)
	if not session:
		logging.warning(f"Session {session_id} not found for stop_recording_and_close")
		return None
	cdp = session["cdp"]
	browser_session = session["browser_session"]
	video_path = f"recording_{session_id}.webm"
	try:
		response = await cdp.send("Browserless.stopRecording")
		value = response.value
		data = value if isinstance(value, bytes) else value.encode("latin1")
		with open(video_path, "wb") as f:
			f.write(data)
		await ws_manager.broadcast(session_id, json.dumps({"event": "session_stopped", "video_path": video_path}))
		return video_path
	except Exception as e:
		logging.error(f"Error stopping recording or saving video for session {session_id}: {e}")
		return None
	finally:
		await browser_session.close()
		del browser_sessions[session_id]

async def run_agent_safe(session, session_id):
	try:
		await session["agent"].run()
		await ws_manager.broadcast(session_id, json.dumps({"event": "agent_run_complete"}))
	except Exception as e:
		logging.error(f"Error running agent for session {session_id}: {e}")
		await ws_manager.broadcast(session_id, json.dumps({"event": "agent_error", "error": str(e)}))
	finally:
		session["agent_running"] = False

async def run_browser_use_agent(task: str):
	"""Run the browser-use agent with the given task"""
	try:
		from browser_use import Agent, BrowserSession
		from browser_use.llm import ChatAnthropic
		from browser_use import BrowserProfile

		extend_system_message = (
			"You're Ron AI's browser-use agent. Your job is to help patients access services and empower their healthcare journey. "
			"Behave like a human while navigating the web: use natural mouse movements, realistic typing, and avoid robotic patterns. "
			"Use strategies to find the data you need, solve CAPTCHAs when encountered, and always be ready for Human in the Loop: "
			"if a human takes over, pause and resume when control is returned. Your tasks may include: "
			"finding medication co-pay cards, GoodRx or equivalent, navigating denials, scheduling appointments, finding providers, "
			"and other web-based workflows. If you encounter a CAPTCHA or a complex form, wait for human input if needed."
		)

		model = ChatAnthropic(model='claude-sonnet-4-20250514')

		# Explicitly enable stealth mode
		profile = BrowserProfile(
			stealth=True,  # <-- Stealth mode enabled
			headless=False,  # Headful for Human in the Loop
			viewport={"width": 1280, "height": 900},
		)
		
		browserless_token = os.getenv('BROWSERLESS_API_TOKEN')
		if not browserless_token:
			raise ValueError("BROWSERLESS_API_TOKEN environment variable is required")
			
		browser_session = BrowserSession(
			cdp_url=f"wss://production-sfo.browserless.io/chrome/stealth?token={browserless_token}",
			browser_profile=profile,
		)

		agent = Agent(
			task=task,
			llm=model,
			browser_session=browser_session,
			extend_system_message=extend_system_message,
		)

		logger.info(f"Starting browser-use agent with task: {task}")
		result = await agent.run()
		logger.info("Browser-use agent completed successfully")
		return result

	except Exception as e:
		logger.error(f"Error running browser-use agent: {str(e)}")
		raise


@app.get("/")
async def root():
    """API root endpoint with capabilities overview."""
    return {
        "service": "Claude Sonnet 4 Healthcare API",
        "model": "claude-sonnet-4-20250514",
        "browser_model": "claude-sonnet-4-20250514",
        "capabilities": {
            "native_tools": [
                "bash_execution",
                "code_execution",
                "computer_use",
                "text_editor",
                "web_search"
            ],
            "features": [
                "prompt_caching",
                "extended_thinking",
                "streaming_messages",
                "citations",
                "multilingual_support",
                "vision",
                "pdf_support",
                "files_api",
                "search_results",
                "browser_automation"
            ],
            "hallucination_mitigation": True,
            "browser_automation": "Claude Opus 4",
            "deep_research": DEEP_RESEARCH_AVAILABLE,
            "browser_use_integration": BROWSER_USE_AVAILABLE
        },
        "endpoints": {
            "chat": "/chat",
            "healthcare_task": "/healthcare/task",
            "healthcare_browser": "/healthcare/browser",
            "code_execution": "/code/execute",
            "web_search": "/search",
            "file_upload": "/files/upload",
            "file_analysis": "/files/analyze",
            "deep_research": "/api/run_sse" if DEEP_RESEARCH_AVAILABLE else None,
            "deep_research_session": "/api/apps/{app}/users/{user}/sessions" if DEEP_RESEARCH_AVAILABLE else None,
            "browser_use_create_session": "/browser-use/session/create" if BROWSER_USE_AVAILABLE else None,
            "browser_use_create_with_url": "/browser-use/session/create-with-url" if BROWSER_USE_AVAILABLE else None,
            "browser_use_navigate": "/browser-use/session/{session_id}/navigate" if BROWSER_USE_AVAILABLE else None,
            "browser_use_task": "/browser-use/session/{session_id}/task" if BROWSER_USE_AVAILABLE else None,
            "browser_use_info": "/browser-use/session/{session_id}/info" if BROWSER_USE_AVAILABLE else None,
            "browser_use_sessions": "/browser-use/sessions" if BROWSER_USE_AVAILABLE else None,
            "browser_use_close": "/browser-use/session/{session_id}/close" if BROWSER_USE_AVAILABLE else None,
            "browser_use_close_all": "/browser-use/sessions/close-all" if BROWSER_USE_AVAILABLE else None,
            "start_session": "/start-session",
            "take_control": "/take-control",
            "relinquish_control": "/relinquish-control",
            "stop_session": "/stop-session",
            "websocket": "/ws/{session_id}"
        }
    }


@app.post("/chat")
async def chat(request: ChatRequest):
    """
    Main chat endpoint with full Claude 4 capabilities.
    Supports all native tools and features with interleaved thinking.
    """
    logger.info(f"Received chat request with {len(request.messages)} messages")
    logger.info(f"Request config: stream={request.stream}, thinking={request.enable_thinking}, tools={request.tools}")
    logger.info(f"TOOLS_AVAILABLE: {TOOLS_AVAILABLE}")
    
    try:
        # Convert messages to format expected by Claude
        messages = [
            {"role": msg.role, "content": msg.content}
            for msg in request.messages
        ]
        
        # Determine system prompt (don't add to messages array - pass as system parameter)
        system_prompt = request.system_prompt if request.system_prompt else None
        # Note: claude_agent.stream_complete() will use its default healthcare system prompt if system_prompt is None
        
        # Build tools list
        native_tools = []
        enabled_tools = []
        
        # Separate native and custom tools
        for tool in request.tools:
            if tool in ["bash", "text_editor", "web_search"]:
                native_tools.append(tool)
            elif tool in ["browser", "browser_use"] and TOOLS_AVAILABLE:
                # Get browser tool definition
                tool_defs = get_tool_definitions_for_claude()
                browser_tool = next((t for t in tool_defs if t["name"] == "browser_use"), None)
                if browser_tool:
                    enabled_tools.append(browser_tool)
                    logger.info(f"Added browser tool: {browser_tool['name']}")
                else:
                    logger.warning("Browser tool definition not found")
        
        logger.info(f"Final tools - native: {native_tools}, custom: {[t.get('name') for t in enabled_tools]}")
        logger.info(f"TOOLS_AVAILABLE: {TOOLS_AVAILABLE}")
        logger.info(f"Enabled tools details: {enabled_tools}")
        
        # Handle streaming with tool execution
        if request.stream:
            logger.info("STREAMING COMPLETIONS MODE WITH TOOL EXECUTION")
            async def stream_generator():
                try:
                    # Pass native tools as strings, custom tools separately
                    async for event in claude_agent.stream_complete(
                        messages=messages,
                        max_tokens=request.max_tokens,
                        temperature=request.temperature,
                        enable_thinking=request.enable_thinking,
                        thinking_budget=request.thinking_budget,
                        tools=native_tools,  # Only native tools as strings
                        custom_tools=enabled_tools,  # Custom tools as dicts
                        system_prompt=system_prompt
                    ):
                        yield f"data: {json.dumps(event)}\n\n"
                        
                except Exception as e:
                    logger.error(f"STREAMING ERROR: {str(e)}")
                    yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
            
            return StreamingResponse(
                stream_generator(),
                media_type="text/event-stream"
            )
        
        # Non-streaming response
        if enabled_tools:
            # Use complete_with_tools when we have custom tools
            from claude_tool_handler import handle_tool_use_in_conversation
            
            all_tools = []
            # Add native tools
            for tool in native_tools:
                if tool == "bash":
                    all_tools.append({"type": "bash_20250124", "name": "bash"})
                elif tool == "text_editor":
                    all_tools.append({"type": "text_editor_20250728", "name": "str_replace_based_edit_tool"})
                elif tool == "web_search":
                    all_tools.append({"type": "web_search_20250305", "name": "web_search"})
            
            # Add custom tools
            all_tools.extend(enabled_tools)
            
            result = await handle_tool_use_in_conversation(messages, all_tools)
            return result
        else:
            # Regular completion without custom tools
            result = await claude_agent.complete(
                messages=messages,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
                enable_thinking=request.enable_thinking,
                thinking_budget=request.thinking_budget
            )
            return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/healthcare/task")
async def healthcare_task(request: HealthcareTaskRequest):
    """
    Execute a healthcare-specific task with browser automation and analysis.
    """
    try:
        # Convert file IDs to file paths
        file_paths = None
        if request.file_ids:
            file_paths = [
                uploaded_files.get(file_id)
                for file_id in request.file_ids
                if file_id in uploaded_files
            ]
            file_paths = [fp for fp in file_paths if fp]
        
        result = await healthcare_agent.execute_healthcare_task(
            task_description=request.task_description,
            use_browser=request.use_browser,
            enable_extended_thinking=request.enable_extended_thinking,
            enable_web_search=request.enable_web_search,
            files_to_process=file_paths
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/healthcare/browser")
async def healthcare_browser_task(request: BrowserTaskRequest):
    """
    Execute healthcare browser automation with streaming support.
    Claude Sonnet 4 as main agent, Claude Opus 4 for browser control.
    """
    async def event_stream():
        try:
            async for event in browser_integration.analyze_healthcare_task(
                task=request.task,
                context=request.context
            ):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
        finally:
            await browser_integration.cleanup()
    
    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/code/execute")
async def execute_code(request: CodeExecutionRequest):
    """
    Execute code with Claude's code execution tool.
    """
    try:
        result = await claude_agent.execute_code_with_verification(
            code_task=request.code_task,
            verify_output=request.verify_output,
            enable_thinking=request.enable_thinking,
            thinking_budget=request.thinking_budget
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search")
async def web_search(request: WebSearchRequest):
    """
    Perform web search and analysis.
    """
    try:
        result = await claude_agent.search_and_analyze(
            query=request.query,
            num_results=request.num_results,
            analyze=request.analyze
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/files/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload a file for processing.
    Returns a file_id that can be used in other endpoints.
    """
    try:
        # Generate unique file ID
        file_id = f"file_{datetime.now().timestamp()}_{file.filename}"
        
        # Save file
        file_path = os.path.join(UPLOAD_DIR, file_id)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        uploaded_files[file_id] = file_path
        
        return {
            "success": True,
            "file_id": file_id,
            "filename": file.filename,
            "size": os.path.getsize(file_path)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/files/analyze")
async def analyze_files(request: FileAnalysisRequest):
    """
    Analyze uploaded files with Claude.
    """
    try:
        # Get file paths
        file_paths = [
            uploaded_files.get(file_id)
            for file_id in request.file_ids
            if file_id in uploaded_files
        ]
        
        if not file_paths:
            raise HTTPException(status_code=404, detail="No valid files found")
        
        response = await claude_agent.process_files(
            file_paths=file_paths,
            task=request.task,
            enable_thinking=request.enable_thinking
        )
        
        return {
            "success": True,
            "response": response.model_dump(),
            "files_processed": len(file_paths)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Deep Research Agent Endpoints (if available)
@app.post("/api/apps/{app_name}/users/{user_id}/sessions")
async def create_deep_research_session(app_name: str, user_id: str):
    """Create a new deep research session."""
    if not DEEP_RESEARCH_AVAILABLE:
        # Return a mock session for compatibility
        session_id = f"session_{datetime.now().timestamp()}_{user_id}"
        return {
            "id": session_id,
            "appName": app_name,
            "userId": user_id,
            "created": datetime.now().isoformat()
        }
    
    # Original deep research implementation
    try:
        session_id = f"session_{datetime.now().timestamp()}_{user_id}"
        
        # Store session info
        deep_research_sessions[session_id] = {
            "id": session_id,
            "appName": app_name,
            "userId": user_id,
            "created": datetime.now().isoformat(),
            "runner": None,
            "session": None
        }
        
        return {
            "id": session_id,
            "appName": app_name,
            "userId": user_id,
            "created": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/docs")
async def deep_research_docs():
    """Deep research API documentation endpoint."""
    return {
        "title": "Deep Research API",
        "description": "ADK Gemini Fullstack Deep Research Agent",
        "version": "1.0.0",
        "available": DEEP_RESEARCH_AVAILABLE,
        "endpoints": {
            "run_sse": "/api/run_sse",
            "sessions": "/api/apps/{app}/users/{user}/sessions"
        }
    }


@app.post("/api/run_sse")
async def deep_research_sse(request: DeepResearchRequest):
    """
    Deep Research Agent SSE endpoint.
    Streams research progress and results in real-time.
    """
    if not DEEP_RESEARCH_AVAILABLE:
        # Fallback to regular Claude chat with enhanced research prompt
        try:
            # Extract message text from deep research format
            message_text = ""
            if "parts" in request.newMessage and request.newMessage["parts"]:
                for part in request.newMessage["parts"]:
                    if "text" in part:
                        message_text += part["text"]
            
            # Create enhanced research prompt
            research_prompt = f"""Conduct deep research on the following topic. Use web search extensively to gather comprehensive information from multiple sources. Provide a detailed analysis with citations.

Topic: {message_text}

Please:
1. Search for relevant information from multiple authoritative sources
2. Synthesize findings into a comprehensive report
3. Include citations for all claims
4. Highlight key insights and recommendations
5. Consider multiple perspectives on the topic"""
            
            # Stream the response in SSE format
            async def event_stream():
                async for event in claude_agent.execute_with_tools(
                    messages=[{"role": "user", "content": research_prompt}],
                    temperature=0.0,
                    max_tokens=4096,
                    enable_caching=True,
                    cache_ttl="5m",
                    enable_thinking=True,
                    thinking_budget=30000,
                    enable_citations=True,
                    stream=True
                ):
                    # Convert to deep research SSE format
                    sse_event = {
                        "content": {
                            "parts": [{"text": getattr(event, 'delta', {}).get('text', '')}],
                            "role": "model"
                        },
                        "author": "research_agent",
                        "actions": {"stateDelta": {}, "artifactDelta": {}},
                        "id": f"event_{datetime.now().timestamp()}",
                        "timestamp": datetime.now().timestamp()
                    }
                    yield f"data: {json.dumps(sse_event)}\n\n"
            
            return StreamingResponse(
                event_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*"
                }
            )
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    # Original deep research implementation with ADK agents
    try:
        # Get or create session
        session_info = deep_research_sessions.get(request.sessionId)
        if not session_info:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Create runner and session if not exists
        if not session_info.get("runner") or not session_info.get("session"):
            runner = InMemoryRunner(
                app_name=APP_NAME,
                agent=deep_research_root_agent,
            )
            
            session = await runner.session_service.create_session(
                app_name=APP_NAME,
                user_id=request.userId,
            )
            
            session_info["runner"] = runner
            session_info["session"] = session
        
        runner = session_info["runner"]
        session = session_info["session"]
        
        # Extract message text from request
        message_text = ""
        if "parts" in request.newMessage and request.newMessage["parts"]:
            for part in request.newMessage["parts"]:
                if "text" in part:
                    message_text += part["text"]
        
        # Create message for agent
        message = genai_types.Content(
            role="user",
            parts=[genai_types.Part(text=message_text)]
        )
        
        # Add message to session
        session.history.append(message)
        
        # Stream response
        async def event_stream():
            try:
                # Run the agent and stream events
                async for event in runner.run_async(session=session):
                    # Convert event to format expected by frontend
                    event_data = {
                        "content": None,
                        "usageMetadata": {
                            "candidatesTokenCount": 0,
                            "promptTokenCount": 0, 
                            "totalTokenCount": 0
                        },
                        "author": getattr(event, 'author', 'unknown'),
                        "actions": {
                            "stateDelta": {},
                            "artifactDelta": {},
                            "requestedAuthConfigs": {}
                        },
                        "longRunningToolIds": [],
                        "id": getattr(event, 'id', f"event_{datetime.now().timestamp()}"),
                        "timestamp": datetime.now().timestamp()
                    }
                    
                    # Add content if available
                    if hasattr(event, 'content') and event.content:
                        event_data["content"] = {
                            "parts": [{"text": str(event.content)}],
                            "role": "model"
                        }
                    
                    # Add state delta information from event actions
                    if hasattr(event, 'actions') and event.actions:
                        if hasattr(event.actions, 'state_delta') and event.actions.state_delta:
                            event_data["actions"]["stateDelta"] = event.actions.state_delta
                        if hasattr(event.actions, 'artifact_delta') and event.actions.artifact_delta:
                            event_data["actions"]["artifactDelta"] = event.actions.artifact_delta
                    
                    # Add session state information
                    if hasattr(session, 'state') and session.state:
                        # Add research plan if available
                        if "research_plan" in session.state:
                            event_data["actions"]["stateDelta"]["research_plan"] = session.state["research_plan"]
                        
                        # Add final report if available  
                        if "final_report_with_citations" in session.state:
                            event_data["actions"]["stateDelta"]["final_report_with_citations"] = session.state["final_report_with_citations"]
                        
                        # Add sources and url mapping
                        if "sources" in session.state:
                            event_data["actions"]["stateDelta"]["sources"] = session.state["sources"]
                        if "url_to_short_id" in session.state:
                            event_data["actions"]["stateDelta"]["url_to_short_id"] = session.state["url_to_short_id"]
                    
                    yield f"data: {json.dumps(event_data)}\n\n"
                    
            except Exception as e:
                error_event = {
                    "content": {
                        "parts": [{"text": f"Error: {str(e)}"}],
                        "role": "model"
                    },
                    "author": "error_handler",
                    "actions": {"stateDelta": {}, "artifactDelta": {}, "requestedAuthConfigs": {}},
                    "id": f"error_{datetime.now().timestamp()}",
                    "timestamp": datetime.now().timestamp()
                }
                yield f"data: {json.dumps(error_event)}\n\n"
        
        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Cache-Control"
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "model": "claude-sonnet-4-20250514",
        "browser_model": "claude-sonnet-4-20250514",
        "api_key_configured": bool(os.getenv("ANTHROPIC_API_KEY")),
        "browserless_token_configured": bool(os.getenv("BROWSERLESS_API_TOKEN")),
        "browser_use_available": BROWSER_USE_AVAILABLE,
        "deep_research_available": DEEP_RESEARCH_AVAILABLE
    }


@app.get("/browser-use/test-connection")
async def test_browserless_connection():
    """Test the browserless connection without creating a full session."""
    if not BROWSER_USE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Browser-use integration is not available")
    
    browserless_token = os.getenv('BROWSERLESS_API_TOKEN')
    if not browserless_token:
        raise HTTPException(status_code=422, detail="BROWSERLESS_API_TOKEN environment variable is required")
    
    anthropic_api_key = os.getenv('ANTHROPIC_API_KEY')
    if not anthropic_api_key:
        raise HTTPException(status_code=422, detail="ANTHROPIC_API_KEY environment variable is required")
    
    try:
        # Test basic browserless connection
        import requests
        test_url = f"https://production-sfo.browserless.io/json/version?token={browserless_token}"
        response = requests.get(test_url, timeout=10)
        
        if response.status_code == 200:
            return {
                "status": "success",
                "message": "Browserless connection successful",
                "browserless_version": response.json(),
                "websocket_url": f"wss://production-sfo.browserless.io/chrome/stealth?token={browserless_token}",
                "timestamp": datetime.now().isoformat()
            }
        else:
            return {
                "status": "error", 
                "message": f"Browserless connection failed with status {response.status_code}",
                "timestamp": datetime.now().isoformat()
            }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to test browserless connection: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }




# ================================
# BROWSER-USE INTEGRATION ENDPOINTS
# ================================

@app.post("/browser-use/session/create")
async def create_browser_use_session(request: BrowserUseCreateSessionRequest):
    """
    Create a new browser-use session with Browserless and generate LiveURL for iframe embedding.
    This implements the browser-use library integration as specified in the provided example.
    """
    if not BROWSER_USE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Browser-use integration is not available")
    
    logger.info("Creating new browser-use session with LiveURL")
    
    try:
        result = await browser_use_service.create_live_url_session(request.timeout_ms)
        logger.info(f"Created browser-use session: {result['session_id']}")
        
        return {
            "success": True,
            "result": result,
            "note": "Use the live_url in an iframe to embed browser interaction in your frontend"
        }
        
    except Exception as e:
        logger.error(f"Failed to create browser-use session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/browser-use/session/create-with-url")
async def create_browser_use_session_with_url(request: BrowserUseCreateWithURLRequest):
    """
    Create browser-use session, navigate to URL, and return LiveURL for iframe embedding.
    Complete workflow for frontend integration.
    """
    if not BROWSER_USE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Browser-use integration is not available")
    
    logger.info(f"Creating browser-use session and navigating to {request.url}")
    
    try:
        from browser_use_service import create_browser_session_with_url
        result = await create_browser_session_with_url(request.url, request.timeout_ms)
        
        logger.info(f"Created browser-use session {result['session_id']} and navigated to {request.url}")
        
        return {
            "success": True,
            "result": result,
            "note": "Embed the live_url in an iframe for direct user interaction"
        }
        
    except ValueError as e:
        # Invalid parameters or missing environment variables
        logger.error(f"Invalid request for session creation: {str(e)}")
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create browser-use session with URL: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/browser-use/session/{session_id}/navigate")
async def navigate_browser_use_session(session_id: str, request: BrowserUseNavigateRequest):
    """
    Navigate to a URL in an existing browser-use session.
    Returns the same LiveURL for continued iframe embedding.
    """
    if not BROWSER_USE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Browser-use integration is not available")
    
    logger.info(f"Navigating browser-use session {session_id} to {request.url}")
    
    try:
        result = await browser_use_service.navigate_and_get_live_url(session_id, request.url)
        
        return {
            "success": True,
            "result": result,
            "note": "The same live_url continues to work in your iframe"
        }
        
    except Exception as e:
        logger.error(f"Failed to navigate browser-use session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/browser-use/session/{session_id}/task")
async def execute_browser_use_task(session_id: str, request: BrowserUseTaskRequest):
    """
    Execute a browser automation task using browser-use Agent in the session.
    """
    if not BROWSER_USE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Browser-use integration is not available")
    
    logger.info(f"Executing browser task in session {session_id}: {request.task}")
    
    try:
        result = await browser_use_service.execute_browser_task(session_id, request.task)
        
        return {
            "success": True,
            "result": result
        }
        
    except ValueError as e:
        # Session not found or invalid parameters
        logger.error(f"Invalid request for browser task: {str(e)}")
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        # Task execution failed
        logger.error(f"Failed to execute browser task: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        # Unexpected error
        logger.error(f"Unexpected error executing browser task: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@app.get("/browser-use/session/{session_id}/info")
async def get_browser_use_session_info(session_id: str):
    """
    Get information about a specific browser-use session.
    """
    if not BROWSER_USE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Browser-use integration is not available")
    
    try:
        result = await browser_use_service.get_session_info(session_id)
        
        return {
            "success": True,
            "session_info": result
        }
        
    except Exception as e:
        logger.error(f"Failed to get browser-use session info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/browser-use/sessions")
async def list_browser_use_sessions():
    """
    List all active browser-use sessions.
    """
    if not BROWSER_USE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Browser-use integration is not available")
    
    try:
        result = await browser_use_service.list_active_sessions()
        
        return {
            "success": True,
            "sessions": result
        }
        
    except Exception as e:
        logger.error(f"Failed to list browser-use sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/browser-use/session/{session_id}/close")
async def close_browser_use_session(session_id: str):
    """
    Close and cleanup a specific browser-use session.
    """
    if not BROWSER_USE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Browser-use integration is not available")
    
    logger.info(f"Closing browser-use session {session_id}")
    
    try:
        result = await browser_use_service.close_session(session_id)
        
        return {
            "success": True,
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Failed to close browser-use session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/browser-use/sessions/close-all")
async def close_all_browser_use_sessions():
    """
    Close all active browser-use sessions.
    """
    if not BROWSER_USE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Browser-use integration is not available")
    
    logger.info("Closing all browser-use sessions")
    
    try:
        result = await browser_use_service.close_all_sessions()
        
        return {
            "success": True,
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Failed to close all browser-use sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/browser-use/session/{session_id}/take-control")
async def take_user_control(session_id: str):
    """
    Enable user interaction with the browser session (take control from agent).
    """
    if not BROWSER_USE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Browser-use integration is not available")
    
    logger.info(f"Taking user control of session {session_id}")
    
    try:
        result = await browser_use_service.enable_user_control(session_id)
        
        return {
            "success": True,
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Failed to take user control: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/browser-use/session/{session_id}/relinquish-control")
async def relinquish_user_control(session_id: str):
    """
    Disable user interaction, return control to the agent.
    """
    if not BROWSER_USE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Browser-use integration is not available")
    
    logger.info(f"Relinquishing user control of session {session_id}")
    
    try:
        result = await browser_use_service.relinquish_user_control(session_id)
        
        return {
            "success": True,
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Failed to relinquish user control: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ================================
# BROWSER-USE MAIN.PY ENDPOINTS
# ================================

@app.post("/start-session")
async def start_session(task: str, session_id: str):
	try:
		live_url = await create_browser_agent(task, session_id)
		return {"live_url": live_url}
	except Exception as e:
		logging.error(f"Error in /start-session: {e}")
		return {"error": str(e)}

@app.post("/take-control")
async def take_control(session_id: str):
	session = browser_sessions.get(session_id)
	if session:
		session["human_in_control"] = True
		await ws_manager.broadcast(session_id, json.dumps({"event": "human_in_control"}))
		return {"status": "ok"}
	return {"status": "not_found"}

@app.post("/relinquish-control")
async def relinquish_control(session_id: str):
	session = browser_sessions.get(session_id)
	if session:
		session["human_in_control"] = False
		await ws_manager.broadcast(session_id, json.dumps({"event": "agent_in_control"}))
		if not session.get("agent_running"):
			session["agent_running"] = True
			asyncio.create_task(run_agent_safe(session, session_id))
		return {"status": "ok"}
	return {"status": "not_found"}

@app.post("/stop-session")
async def stop_session(session_id: str):
	video_path = await stop_recording_and_close(session_id)
	if video_path:
		return {"video_path": video_path}
	return {"status": "not_found"}

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
	await ws_manager.connect(session_id, websocket)
	try:
		while True:
			data = await websocket.receive_text()
			await ws_manager.broadcast(session_id, json.dumps({"event": "echo", "data": data}))
	except WebSocketDisconnect:
		ws_manager.disconnect(session_id, websocket)
		logging.info(f"WebSocket disconnected for session {session_id}")


# Cleanup uploaded files periodically
async def cleanup_old_files():
    """Remove uploaded files older than 1 hour."""
    while True:
        await asyncio.sleep(3600)  # Run every hour
        current_time = datetime.now().timestamp()
        for file_id, file_path in list(uploaded_files.items()):
            if os.path.exists(file_path):
                file_age = current_time - os.path.getmtime(file_path)
                if file_age > 3600:  # 1 hour
                    os.remove(file_path)
                    del uploaded_files[file_id]


@app.on_event("startup")
async def startup_event():
    """Start background tasks on startup."""
    asyncio.create_task(cleanup_old_files())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
