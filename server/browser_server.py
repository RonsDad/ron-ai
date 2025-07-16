from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import httpx
from io import BytesIO
from fastapi.responses import StreamingResponse
from PyPDF2 import PdfReader
from browser_use import Agent
from browser_use.browser import BrowserProfile, BrowserSession
from browser_use.llm import ChatAnthropic, ChatGoogle
import asyncio
import json
import uuid
import logging
import sys
from datetime import datetime
from typing import Dict, Optional
import os

# Add virtual display support (Linux only)
import platform
try:
    from pyvirtualdisplay.display import Display
    # Only enable virtual display on Linux systems
    VIRTUAL_DISPLAY_AVAILABLE = platform.system() == 'Linux'
    if not VIRTUAL_DISPLAY_AVAILABLE and platform.system() == 'Darwin':
        logging.info("Running on macOS - virtual display not needed, using headless mode")
except ImportError:
    VIRTUAL_DISPLAY_AVAILABLE = False
    logging.info("pyvirtualdisplay not available - using alternative embedding approach")

# Custom logging filter to suppress Socket.IO 403 errors
class SocketIOFilter(logging.Filter):
    def filter(self, record):
        # Filter out Socket.IO 403 errors and connection rejected messages
        msg = record.getMessage()
        if ('socket.io' in msg and '403' in msg) or ('connection rejected' in msg and '403' in msg):
            return False
        if 'connection closed' in msg and record.levelname == 'INFO':
            return False
        return True

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(os.path.join(os.path.dirname(__file__), '..', 'logs', 'agent.log'), mode='a')
    ]
)

# Add filter to suppress Socket.IO noise
for handler in logging.getLogger().handlers:
    handler.addFilter(SocketIOFilter())

# Add filter to all uvicorn loggers
for logger_name in ['uvicorn', 'uvicorn.access', 'uvicorn.error', 'uvicorn.asgi', 'uvicorn.server']:
    logger = logging.getLogger(logger_name)
    logger.addFilter(SocketIOFilter())
    # Also add to any existing handlers
    for handler in logger.handlers:
        handler.addFilter(SocketIOFilter())

# Create logger
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(title='Nira Backend API')

# Configure logging for the app
logger.info("Starting Nira Backend API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:3000',  # Frontend
        'http://localhost:8001',  # Claude backend
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Import and include enhanced browser API
try:
    from browser_api import router as browser_router
    app.include_router(browser_router)
    logger.info("Enhanced browser API integrated successfully")
except ImportError as e:
    logger.warning(f"Enhanced browser API not available: {e}")
    logger.info("Falling back to basic browser functionality")

# Active sessions storage for browser automation
active_sessions: Dict[str, Dict] = {}

# Web search capabilities using FireCrawl
class WebSearchAgent:
    def __init__(self, llm):
        self.llm = llm
        self.firecrawl_api_key = os.getenv('FIRECRAWL_API_KEY')
        
    async def search_and_analyze(self, query: str, max_results: int = 5) -> Dict:
        """Perform web search and analyze results using FireCrawl"""
        try:
            import httpx
            
            if not self.firecrawl_api_key:
                return {"error": "FireCrawl API key not configured"}
            
            # Use FireCrawl search endpoint
            search_url = "https://api.firecrawl.dev/v0/search"
            headers = {
                "Authorization": f"Bearer {self.firecrawl_api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "query": query,
                "limit": max_results,
                "scrapeOptions": {
                    "formats": ["markdown"],
                    "onlyMainContent": True
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(search_url, headers=headers, json=payload)
                response.raise_for_status()
                
                search_results = response.json()
                
                # Process and analyze results
                analyzed_results = {
                    "query": query,
                    "results": search_results.get("data", []),
                    "summary": f"Found {len(search_results.get('data', []))} results for: {query}"
                }
                
                return analyzed_results
                
        except Exception as e:
            logger.error(f"Web search failed: {e}")
            return {"error": f"Web search failed: {str(e)}"}
    
    async def scrape_url(self, url: str) -> Dict:
        """Scrape content from a specific URL using FireCrawl"""
        try:
            import httpx
            
            if not self.firecrawl_api_key:
                return {"error": "FireCrawl API key not configured"}
            
            scrape_url = "https://api.firecrawl.dev/v0/scrape"
            headers = {
                "Authorization": f"Bearer {self.firecrawl_api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "url": url,
                "formats": ["markdown"],
                "onlyMainContent": True
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(scrape_url, headers=headers, json=payload)
                response.raise_for_status()
                
                result = response.json()
                
                return {
                    "url": url,
                    "content": result.get("data", {}).get("markdown", ""),
                    "title": result.get("data", {}).get("title", ""),
                    "success": True
                }
                
        except Exception as e:
            logger.error(f"URL scraping failed: {e}")
            return {"error": f"URL scraping failed: {str(e)}"}

# Add web search endpoint
@app.post("/api/web-search")
async def web_search(query: str, max_results: int = 5):
    """Perform web search using FireCrawl"""
    try:
        # Use Gemini 2.5 Flash for consistency with browser agents
        llm = ChatGoogle(
            model="gemini-2.5-flash",
            api_key=os.getenv("GOOGLE_API_KEY")
        )
        
        search_agent = WebSearchAgent(llm)
        results = await search_agent.search_and_analyze(query, max_results)
        
        return results
    except Exception as e:
        logger.error(f"Web search endpoint failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info(f"WebSocket connection established for session {session_id}")
    
    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
            logger.info(f"WebSocket connection closed for session {session_id}")
    
    async def send_message(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_text(json.dumps(message))
            logger.debug(f"Message sent to session {session_id}: {message.get('type', 'unknown')}")

manager = ConnectionManager()

@app.get("/")
def read_root():
    return {"message": "Hello from Nira backend"}

# Handle Socket.IO connection attempts with explicit rejection
@app.get("/socket.io/")
async def reject_socket_io():
    """Explicitly reject Socket.IO connections - this app uses standard WebSockets"""
    return {"error": "Socket.IO not supported. This application uses standard WebSockets at /ws/{session_id}"}

@app.post("/socket.io/")
async def reject_socket_io_post():
    """Explicitly reject Socket.IO POST connections"""
    return {"error": "Socket.IO not supported. This application uses standard WebSockets at /ws/{session_id}"}
 
BASE_EUTILS_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

@app.get("/eutils/esearch")
async def esearch(


    
    db: str = "pubmed",
    term: str = Query(..., description="Search term"),
    retmax: int = 20,
    retstart: int = 0,
    usehistory: str = "n"
) -> dict:
    params = {
        "db": db,
        "term": term,
        "retmax": retmax,
        "retstart": retstart,
        "usehistory": usehistory,
        "api_key": os.getenv("PUBMED_API_KEY"),
        "retmode": "json",
    }
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE_EUTILS_URL}/esearch.fcgi", params=params)
    r.raise_for_status()
    return r.json().get("esearchresult", {})

@app.get("/eutils/esummary")
async def esummary(
    db: str = "pubmed",
    id: str = Query(..., description="Comma-separated list of UIDs")
) -> dict:
    params = {
        "db": db,
        "id": id,
        "api_key": os.getenv("PUBMED_API_KEY"),
        "retmode": "json",
    }
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE_EUTILS_URL}/esummary.fcgi", params=params)
    r.raise_for_status()
    return r.json().get("result", {})

@app.get("/eutils/efetch")
async def efetch(
    db: str = "pubmed",
    id: str = Query(..., description="Comma-separated list of UIDs"),
    rettype: str = "abstract",
    retmode: str = "text"
) -> str:
    params = {
        "db": db,
        "id": id,
        "rettype": rettype,
        "retmode": retmode,
        "api_key": os.getenv("PUBMED_API_KEY"),
    }
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE_EUTILS_URL}/efetch.fcgi", params=params)
    r.raise_for_status()
    # Return plain text (e.g. abstracts)
    return r.text

@app.get("/eutils/efetch_pdf")
async def efetch_pdf(
    id: str = Query(..., description="PMC ID, e.g. PMC123456")
) -> StreamingResponse:
    """
    Fetch full-text PDF for a PubMed Central article via EFetch.
    """
    params = {
        "db": "pmc",
        "id": id,
        "rettype": "pdf",
        "retmode": "pdf",
        "api_key": os.getenv("PUBMED_API_KEY"),
    }
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE_EUTILS_URL}/efetch.fcgi", params=params)
    r.raise_for_status()
    # Stream PDF bytes
    return StreamingResponse(BytesIO(r.content), media_type="application/pdf")

@app.get("/eutils/efetch_pdf_text")
async def efetch_pdf_text(
    id: str = Query(..., description="PMC ID, e.g. PMC123456")
) -> dict:
    """
    Fetch full-text PDF for a PubMed Central article and extract text.
    """
    params = {
        "db": "pmc",
        "id": id,
        "rettype": "pdf",
        "retmode": "pdf",
        "api_key": os.getenv("PUBMED_API_KEY"),
    }
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE_EUTILS_URL}/efetch.fcgi", params=params)
    r.raise_for_status()
    # Parse PDF and extract text via PyPDF2
    fp = BytesIO(r.content)
    reader = PdfReader(fp)
    text = "".join(page.extract_text() or "" for page in reader.pages)
    return {"id": id, "text": text}

# Browser Automation WebSocket and Session Management

class RobustBrowserAgent:
    """Robust browser agent with error handling and recovery"""
    
    def __init__(self, agent: Agent, session_id: str):
        self.agent = agent
        self.session_id = session_id
        self.checkpoints = {}
        self.error_count = 0
        self.max_retries = 3
        self.retry_delay = 2  # seconds
        # Add instance variables for screenshot storage
        self.last_screenshot = None
        self.last_url = None
        self.last_title = None
        
    async def create_checkpoint(self, name: str):
        """Create a checkpoint of current browser state"""
        try:
            if not self.agent.browser_session:
                logger.warning(f"[{self.session_id}] No browser session for checkpoint '{name}'")
                return
            page = await self.agent.browser_session.get_current_page()
            if page is None:
                logger.warning(f"[{self.session_id}] No active page for checkpoint '{name}'")
                return
            
            checkpoint = {
                'name': name,
                'url': page.url,
                'timestamp': datetime.now().isoformat(),
                'cookies': await page.context.cookies(),
                'local_storage': await page.evaluate('() => JSON.stringify(localStorage)'),
                'session_storage': await page.evaluate('() => JSON.stringify(sessionStorage)')
            }
            
            self.checkpoints[name] = checkpoint
            logger.info(f"[{self.session_id}] Checkpoint '{name}' created")
            
        except Exception as e:
            logger.error(f"[{self.session_id}] Failed to create checkpoint: {e}")
    
    async def restore_checkpoint(self, name: str):
        """Restore browser state from checkpoint"""
        if name not in self.checkpoints:
            logger.error(f"[{self.session_id}] Checkpoint '{name}' not found")
            return False
            
        try:
            checkpoint = self.checkpoints[name]
            if not self.agent.browser_session:
                logger.warning(f"[{self.session_id}] No browser session for checkpoint restore '{name}'")
                return False
            page = await self.agent.browser_session.get_current_page()
            if page is None:
                logger.warning(f"[{self.session_id}] No active page for checkpoint restore '{name}'")
                return False
            
            # Restore state
            await page.goto(checkpoint['url'])
            await page.context.add_cookies(checkpoint['cookies'])
            
            # Restore storage
            await page.evaluate(f'localStorage.clear(); Object.assign(localStorage, {checkpoint["local_storage"]})')
            await page.evaluate(f'sessionStorage.clear(); Object.assign(sessionStorage, {checkpoint["session_storage"]})')
            
            logger.info(f"[{self.session_id}] Restored checkpoint '{name}'")
            return True
            
        except Exception as e:
            logger.error(f"[{self.session_id}] Failed to restore checkpoint: {e}")
            return False
    
    async def execute_with_recovery(self, instructions: str):
        """Execute task with automatic error recovery"""
        
        for attempt in range(self.max_retries):
            try:
                # Create checkpoint before execution
                await self.create_checkpoint(f"attempt_{attempt}")
                
                # Execute the task
                result = await self.run_with_monitoring(instructions)
                
                # Reset error count on success
                self.error_count = 0
                
                # Update session with completion status
                if self.session_id in active_sessions:
                    active_sessions[self.session_id]["status"] = "completed"
                    active_sessions[self.session_id]["result"] = result
                    active_sessions[self.session_id]["completed_at"] = datetime.now().isoformat()
                
                return result
                
            except Exception as e:
                self.error_count += 1
                logger.error(f"[{self.session_id}] Attempt {attempt + 1} failed: {e}")
                
                if attempt == self.max_retries - 1:
                    # Final attempt failed
                    await manager.send_message(self.session_id, {
                        "type": "error",
                        "message": f"Task failed after {self.max_retries} attempts: {str(e)}",
                        "timestamp": datetime.now().isoformat()
                    })
                    raise e
                    
                # Wait before retry
                await asyncio.sleep(self.retry_delay * (attempt + 1))
                
                # Try to restore from checkpoint
                if f"attempt_{attempt}" in self.checkpoints:
                    await self.restore_checkpoint(f"attempt_{attempt}")
                    
                # Reset browser session if needed
                if "browser" in str(e).lower() and self.agent.browser_session:
                    await self.agent.browser_session.start()
    
    async def run_with_monitoring(self, instructions: str):
        """Run agent with comprehensive monitoring"""
        logger.info(f"[{self.session_id}] Running agent with instructions: {instructions}")
        
                 # Enhanced screenshot streaming callback with performance optimization
        async def on_step_callback(agent):
            try:
                # Get performance optimizer from session
                session = active_sessions.get(self.session_id)
                if not session:
                    return
                    
                performance_optimizer = session.get("performance_optimizer")
                if not performance_optimizer:
                    return
                
                # Get current page first
                page = await agent.browser_session.get_current_page()
                current_url = page.url if page else ""
                current_title = await page.title() if page else ""
                
                # Get step information from agent
                step_number = agent.state.n_steps if hasattr(agent, 'state') else 0
                
                # Extract step details from agent's last model output
                evaluation = ""
                memory = ""
                next_goal = ""
                actions = []
                thinking = ""  # Add thinking/reasoning capture
                
                if hasattr(agent, 'state') and agent.state.last_model_output:
                    model_output = agent.state.last_model_output
                    
                    # For older agent versions that use current_state
                    if hasattr(model_output, 'current_state') and model_output.current_state:
                        evaluation = model_output.current_state.evaluation_previous_goal or ""
                        memory = model_output.current_state.memory or ""
                        next_goal = model_output.current_state.next_goal or ""
                    # For newer agent versions that use direct attributes
                    elif hasattr(model_output, 'evaluation_previous_goal'):
                        evaluation = model_output.evaluation_previous_goal or ""
                        memory = model_output.memory or ""
                        next_goal = model_output.next_goal or ""
                    
                    # Extract thinking/reasoning if available
                    if hasattr(model_output, 'thinking') and model_output.thinking:
                        thinking = model_output.thinking
                    elif hasattr(model_output, 'reasoning') and model_output.reasoning:
                        thinking = model_output.reasoning
                    
                    # Extract actions
                    if hasattr(model_output, 'action') and model_output.action:
                        for action in model_output.action:
                            if hasattr(action, 'model_dump'):
                                action_dict = action.model_dump(exclude_unset=True)
                                if action_dict:
                                    actions.append(action_dict)
                
                # Get additional context from agent state
                context_info = {}
                if hasattr(agent, 'state'):
                    # Get history context
                    if hasattr(agent.state, 'history') and agent.state.history:
                        context_info['total_steps'] = len(agent.state.history.history)
                    
                    # Get current task progress
                    if hasattr(agent.state, 'task'):
                        context_info['task'] = agent.state.task
                    
                    # Get any errors from previous step
                    if hasattr(agent.state, 'last_result') and agent.state.last_result:
                        errors = [r.error for r in agent.state.last_result if r.error]
                        if errors:
                            context_info['previous_errors'] = errors
                
                # Store latest thinking in session for Claude access
                if self.session_id in active_sessions:
                    active_sessions[self.session_id]["latest_thinking"] = {
                        "thinking": thinking,
                        "evaluation": evaluation,
                        "memory": memory,
                        "next_goal": next_goal,
                        "step_number": step_number,
                        "context": context_info,
                        "timestamp": datetime.now().isoformat()
                    }
                
                # Send step start notification with enhanced reasoning
                await manager.send_message(self.session_id, {
                    "type": "step_start",
                    "session_id": self.session_id,
                    "step_number": step_number,
                    "evaluation": evaluation,
                    "memory": memory,
                    "next_goal": next_goal,
                    "thinking": thinking,  # Add thinking/reasoning
                    "actions": actions,
                    "context": context_info,  # Add context
                    "url": current_url,
                    "title": current_title,
                    "timestamp": datetime.now().isoformat()
                })
                
                # Rate limit screenshots
                if not performance_optimizer.should_take_screenshot():
                    return
                
                # Check cache first
                cached_info = performance_optimizer.get_cached_page_info(current_url)
                if cached_info:
                    logger.debug(f"[{self.session_id}] Using cached page info for {current_url}")
                    screenshot = cached_info.get("screenshot")
                else:
                    # Take screenshot using Playwright page API
                    screenshot_bytes = await page.screenshot()
                    
                    # Optimize screenshot
                    optimized_bytes = performance_optimizer.optimize_screenshot(screenshot_bytes)
                    
                    # Skip if screenshot hasn't changed
                    if optimized_bytes is None:
                        return
                    
                    # Convert to base64 for WebSocket transmission
                    import base64
                    screenshot = base64.b64encode(optimized_bytes).decode()
                    
                    # Cache the result
                    performance_optimizer.cache_page_info(current_url, {
                        "screenshot": screenshot,
                        "title": current_title,
                        "url": current_url
                    })
                
                # Get tab information
                tabs_info = []
                try:
                    tabs_info_raw = await agent.browser_session.get_tabs_info()
                    tabs_info = [{"page_id": tab.page_id, "url": tab.url, "title": tab.title} for tab in tabs_info_raw]
                except:
                    pass
                
                # Send via WebSocket
                await manager.send_message(self.session_id, {
                    "type": "viewport_update",
                    "session_id": self.session_id,
                    "screenshot": screenshot,
                    "url": current_url,
                    "title": current_title,
                    "tabs": tabs_info,
                    "timestamp": datetime.now().isoformat()
                })
                
                # Store the last screenshot for later retrieval
                self.last_screenshot = screenshot
                self.last_url = current_url
                self.last_title = current_title
                
                # Update session info
                if self.session_id in active_sessions:
                    active_sessions[self.session_id]["last_screenshot"] = screenshot
                    active_sessions[self.session_id]["current_url"] = current_url
                
                logger.info(f"[{self.session_id}] Sent viewport update - URL: {current_url}")
                
                # Auto-create checkpoints at key points
                if "login" in current_url.lower() or "sign" in current_url.lower():
                    await self.create_checkpoint("login_page")
                elif "checkout" in current_url.lower() or "payment" in current_url.lower():
                    await self.create_checkpoint("checkout_page")
                    
            except Exception as e:
                logger.error(f"[{self.session_id}] Error in screenshot callback: {e}")
        
        # Define step end callback to capture results
        async def on_step_end_callback(agent):
            try:
                step_number = agent.state.n_steps if hasattr(agent, 'state') else 0
                
                # Extract results from agent's last result
                results = []
                if hasattr(agent, 'state') and agent.state.last_result:
                    for result in agent.state.last_result:
                        result_dict = {
                            "success": not bool(result.error),
                            "error": result.error,
                            "extractedContent": result.extracted_content
                        }
                        results.append(result_dict)
                
                # Get timing information
                duration = None
                if hasattr(agent, 'state') and hasattr(agent.state, 'history') and agent.state.history.history:
                    last_history_item = agent.state.history.history[-1]
                    if hasattr(last_history_item, 'metadata') and last_history_item.metadata:
                        duration = last_history_item.metadata.duration_seconds * 1000  # Convert to ms
                
                # Determine step status
                status = "completed"
                if results and any(r.get("error") for r in results):
                    status = "failed"
                
                # Send step end notification
                await manager.send_message(self.session_id, {
                    "type": "step_end",
                    "session_id": self.session_id,
                    "step_number": step_number,
                    "results": results,
                    "status": status,
                    "duration": duration,
                    "timestamp": datetime.now().isoformat()
                })
                
            except Exception as e:
                logger.error(f"[{self.session_id}] Error in step end callback: {e}")
        
        # Run agent with enhanced monitoring
        result = await self.agent.run(
            on_step_start=on_step_callback, 
            on_step_end=on_step_end_callback,
            max_steps=100
        )
        logger.info(f"[{self.session_id}] Agent run completed.")
        
        return result

async def continuous_screenshot_stream(session_id: str):
    """Continuously stream screenshots for real-time view"""
    logger.info(f"[{session_id}] Starting continuous screenshot stream")
    
    while session_id in active_sessions:
        try:
            session = active_sessions.get(session_id)
            if not session:
                break
                
            browser_session = session.get("browser_session")
            performance_optimizer = session.get("performance_optimizer")
            
            if not browser_session or not performance_optimizer:
                await asyncio.sleep(0.5)
                continue
                
            # Check if we should take a screenshot
            if not performance_optimizer.should_take_screenshot():
                await asyncio.sleep(0.05)  # Small sleep to prevent CPU spinning
                continue
                
            # Get current page
            page = await browser_session.get_current_page()
            if not page:
                await asyncio.sleep(0.5)
                continue
                
            try:
                # Take screenshot
                screenshot_bytes = await page.screenshot()
                
                # Optimize screenshot
                optimized_bytes = performance_optimizer.optimize_screenshot(screenshot_bytes)
                
                # Skip if screenshot hasn't changed
                if optimized_bytes is None:
                    continue
                    
                # Convert to base64
                import base64
                screenshot = base64.b64encode(optimized_bytes).decode()
                
                # Get page info
                current_url = page.url
                current_title = await page.title()
                
                # Get tab information
                tabs_info = []
                try:
                    tabs_info_raw = await browser_session.get_tabs_info()
                    tabs_info = [{"page_id": tab.page_id, "url": tab.url, "title": tab.title} for tab in tabs_info_raw]
                except:
                    pass
                
                # Send via WebSocket
                await manager.send_message(session_id, {
                    "type": "viewport_update",
                    "session_id": session_id,
                    "screenshot": screenshot,
                    "url": current_url,
                    "title": current_title,
                    "tabs": tabs_info,
                    "timestamp": datetime.now().isoformat(),
                    "streaming": True  # Indicate this is from continuous stream
                })
                
                # Update session info
                if session_id in active_sessions:
                    active_sessions[session_id]["last_screenshot"] = screenshot
                    active_sessions[session_id]["current_url"] = current_url
                    
            except Exception as e:
                logger.debug(f"[{session_id}] Screenshot stream error: {e}")
                
        except Exception as e:
            logger.error(f"[{session_id}] Continuous stream error: {e}")
            
        await asyncio.sleep(0.01)  # Small sleep between iterations
        
    logger.info(f"[{session_id}] Stopped continuous screenshot stream")

async def run_agent_task(agent: Agent, instructions: str, session_id: str):
    """Run agent task with robust error handling"""
    try:
        # Start continuous screenshot streaming in parallel
        screenshot_task = asyncio.create_task(continuous_screenshot_stream(session_id))
        
        robust_agent = RobustBrowserAgent(agent, session_id)
        await robust_agent.execute_with_recovery(instructions)
        
        # Stop screenshot streaming
        screenshot_task.cancel()
        
    except Exception as e:
        logger.error(f"[{session_id}] Exception during agent run: {e}", exc_info=True)
        
        # Update session status
        if session_id in active_sessions:
            active_sessions[session_id]["status"] = "error"
            
        # Notify frontend of error
        await manager.send_message(session_id, {
            "type": "error",
            "message": f"Agent execution failed: {str(e)}",
            "timestamp": datetime.now().isoformat()
        })

class StartAgentRequest(BaseModel):
    instructions: str
    headless: bool = True  # Default to headless in server environments

class ControlToggleRequest(BaseModel):
    session_id: str
    human_control: bool
    additional_prompt: Optional[str] = None

class PerformanceOptimizer:
    """Performance optimization for browser agents"""
    
    def __init__(self):
        self.context_cache = {}
        self.screenshot_cache = {}
        self.last_screenshot_time = 0
        self.screenshot_interval = 0.2  # 200ms for smoother streaming (5 FPS)
        self.last_screenshot_hash = None
        self.screenshot_quality = 70  # Lower quality for faster streaming
        
    def should_take_screenshot(self) -> bool:
        """Rate limit screenshot taking"""
        import time
        current_time = time.time()
        
        if current_time - self.last_screenshot_time >= self.screenshot_interval:
            self.last_screenshot_time = current_time
            return True
        return False
    
    def optimize_agent_config(self, agent_config: dict) -> dict:
        """Optimize agent configuration for performance"""
        optimized_config = agent_config.copy()
        
        # Optimize for token usage
        optimized_config.update({
            'max_actions_per_step': 8,  # Reduce from 10 to save tokens
            'max_history_items': 30,    # Reduce from 50 to save context
            'images_per_step': 1,       # Keep at 1 for efficiency
            'retry_delay': 3,           # Reduce from 5 to speed up retries
            'max_failures': 2,          # Reduce from 3 to fail faster
        })
        
        return optimized_config
    
    def cache_page_info(self, url: str, page_info: dict):
        """Cache page information for reuse"""
        import time
        self.context_cache[url] = {
            'data': page_info,
            'timestamp': time.time()
        }
        
        # Clean old cache entries (older than 5 minutes)
        current_time = time.time()
        expired_urls = [
            url for url, cached in self.context_cache.items()
            if current_time - cached['timestamp'] > 300
        ]
        
        for expired_url in expired_urls:
            del self.context_cache[expired_url]
    
    def get_cached_page_info(self, url: str) -> dict:
        """Get cached page information"""
        if url in self.context_cache:
            cached_info = self.context_cache[url]
            import time
            if time.time() - cached_info['timestamp'] < 300:  # 5 minute cache
                return cached_info['data']
        return {}
    
    def optimize_screenshot(self, screenshot_bytes: bytes) -> Optional[bytes]:
        """Optimize screenshot for transmission"""
        try:
            from PIL import Image
            import io
            import hashlib
            
            # Check if screenshot has changed using hash
            current_hash = hashlib.md5(screenshot_bytes).hexdigest()
            if current_hash == self.last_screenshot_hash:
                # Return None to indicate no change
                return None
            self.last_screenshot_hash = current_hash
            
            # Convert to PIL Image
            img = Image.open(io.BytesIO(screenshot_bytes))
            
            # Resize for streaming (smaller for real-time feel)
            max_width = 960  # Smaller for faster streaming
            max_height = 540
            if img.width > max_width or img.height > max_height:
                img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
            
            # Convert to RGB if needed
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Save with lower quality for faster streaming
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=self.screenshot_quality, optimize=False)  # No optimize for speed
            return output.getvalue()
            
        except Exception as e:
            logger.warning(f"Screenshot optimization failed: {e}")
            return screenshot_bytes

class SecurityManager:
    """Security manager for validating actions and URLs"""
    
    def __init__(self):
        self.dangerous_patterns = [
            'eval(',
            'javascript:',
            'data:text/html',
            'file://',
            'chrome://',
            'chrome-extension://',
            'about:',
            'blob:',
            'filesystem:',
            'ftp://',
            'jar:',
            'moz-extension://',
            'resource://',
            'view-source:',
            'wyciwyg:',
            'ms-appx:',
            'ms-appx-web:',
            'res:',
            'vbscript:',
            'livescript:',
            'mocha:',
            'tcl:',
            'x-javascript:',
            'x-scriptlet:',
            'x-vbscript:',
            '<script',
            '</script',
            'onload=',
            'onerror=',
            'onclick=',
            'onmouseover=',
            'onfocus=',
            'onblur=',
            'onchange=',
            'onsubmit=',
            'onkeydown=',
            'onkeyup=',
            'onkeypress=',
        ]
        
        self.trusted_domains = [
            'google.com',
            'github.com',
            'stackoverflow.com',
            'wikipedia.org',
            'mozilla.org',
            'w3.org',
            'microsoft.com',
            'apple.com',
            'amazon.com',
            'facebook.com',
            'twitter.com',
            'linkedin.com',
            'youtube.com',
            'reddit.com',
            'medium.com',
            'dev.to',
            'hackernews.com',
            'npmjs.com',
            'pypi.org',
            'dockerhub.com',
            'kubernetes.io',
            'openai.com',
            'anthropic.com',
            'huggingface.co',
        ]
    
    def validate_url(self, url: str) -> bool:
        """Validate if URL is safe to visit"""
        if not url or not isinstance(url, str):
            return False
            
        url_lower = url.lower()
        
        # Check for dangerous patterns
        for pattern in self.dangerous_patterns:
            if pattern in url_lower:
                logger.warning(f"Blocked dangerous URL pattern: {pattern} in {url}")
                return False
        
        # Check if domain is trusted
        from urllib.parse import urlparse
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            
            # Remove port if present
            if ':' in domain:
                domain = domain.split(':')[0]
            
            # Check if domain or any parent domain is trusted
            for trusted in self.trusted_domains:
                if domain == trusted or domain.endswith(f'.{trusted}'):
                    return True
            
            logger.warning(f"Blocked untrusted domain: {domain}")
            return False
            
        except Exception as e:
            logger.error(f"Error parsing URL {url}: {e}")
            return False
    
    def validate_action(self, action: dict) -> bool:
        """Validate if action is safe to execute"""
        if not action or not isinstance(action, dict):
            return False
        
        action_str = str(action).lower()
        
        # Check for dangerous patterns in action
        for pattern in self.dangerous_patterns:
            if pattern in action_str:
                logger.warning(f"Blocked dangerous action pattern: {pattern}")
                return False
        
        # Additional action-specific validations
        if 'type' in action:
            action_type = action['type']
            
            # Block potentially dangerous action types
            dangerous_actions = [
                'execute_script',
                'evaluate',
                'add_script_tag',
                'add_style_tag',
                'set_content',
                'set_extra_http_headers',
                'route',
                'expose_function',
                'expose_binding',
            ]
            
            if action_type in dangerous_actions:
                logger.warning(f"Blocked dangerous action type: {action_type}")
                return False
        
        return True
    
    def sanitize_input(self, input_data: str) -> str:
        """Sanitize user input to prevent injection attacks"""
        if not input_data or not isinstance(input_data, str):
            return ""
        
        # Remove potentially dangerous characters/patterns
        dangerous_chars = ['<', '>', '"', "'", '&', '\x00', '\x08', '\x0b', '\x0c', '\x0e', '\x1f']
        sanitized = input_data
        
        for char in dangerous_chars:
            sanitized = sanitized.replace(char, '')
        
        # Limit length to prevent DoS
        if len(sanitized) > 10000:
            sanitized = sanitized[:10000]
            logger.warning("Input truncated due to length limit")
        
        return sanitized

class SubAgentManager:
    """Manages specialized sub-agents for different tasks"""
    
    def __init__(self, main_llm):
        self.main_llm = main_llm
        self.sub_agents = {}
        
    async def create_sub_agent(self, task: str, specialization: str, browser_session) -> str:
        """Create specialized sub-agent for specific tasks"""
        
        specialized_prompts = {
            'form_filling': """
            You are a form-filling specialist. Focus on:
            - Identifying form fields accurately
            - Filling forms with appropriate data
            - Handling validation errors
            - Ensuring data integrity
            - Understanding form context and requirements
            """,
            'navigation': """
            You are a navigation specialist. Focus on:
            - Efficient page navigation
            - Menu and link identification
            - Breadcrumb following
            - Site structure understanding
            - URL pattern recognition
            """,
            'data_extraction': """
            You are a data extraction specialist. Focus on:
            - Identifying relevant data on pages
            - Extracting structured information
            - Handling dynamic content
            - Data validation and cleaning
            - Pattern recognition in content
            """,
            'search_and_research': """
            You are a search and research specialist. Focus on:
            - Formulating effective search queries
            - Evaluating search results quality
            - Cross-referencing information
            - Identifying authoritative sources
            - Synthesizing information from multiple sources
            """
        }
        
        # Create sub-agent with specialized configuration
        sub_agent = Agent(
            task=task,
            llm=self.main_llm,
            browser_session=browser_session,
            use_vision=True,
            use_thinking=True,
            max_actions_per_step=5,
            max_failures=2,
            extend_system_message=specialized_prompts.get(specialization, "")
        )
        
        agent_id = f"{specialization}_{len(self.sub_agents)}"
        self.sub_agents[agent_id] = sub_agent
        
        return agent_id
        
    async def execute_sub_task(self, agent_id: str, task: str):
        """Execute task using specialized sub-agent"""
        if agent_id not in self.sub_agents:
            raise ValueError(f"Sub-agent {agent_id} not found")
            
        sub_agent = self.sub_agents[agent_id]
        result = await sub_agent.run()
        
        return result
    
    def get_sub_agent(self, agent_id: str):
        """Get sub-agent by ID"""
        return self.sub_agents.get(agent_id)

@app.post("/api/start-agent")
async def start_agent(request: StartAgentRequest):
    """Start a new browser agent session using enhanced browser manager with browserless"""
    session_id = str(uuid.uuid4())
    virtual_display = None
    
    try:
        logger.info(f"[{session_id}] Starting browser agent with instructions: {request.instructions}")
        
        # Use browserless integration following the exact documentation
        from browser_use import Agent, Browser
        from browser_use.browser import BrowserConfig, BrowserContext, BrowserContextConfig
        from browser_use.browser.session import BrowserSession
        
        # Create browserless connection URL with token and proxy
        browserless_url = f"wss://production-sfo.browserless.io?token={os.getenv('BROWSERLESS_API_TOKEN')}&proxy=residential"
        
        # Create browser with browserless CDP URL
        browser = Browser(config=BrowserConfig(cdp_url=browserless_url))
        
        # Create browser context with configuration
        context = BrowserContext(
            browser,
            BrowserContextConfig(
                wait_for_network_idle_page_load_time=10.0,
                highlight_elements=True
            )
        )
        
        # Get the browser session
        browser_session = await context.get_session()
        
        # Create LLM
        llm = ChatGoogle(
            model="gemini-2.5-flash",
            temperature=0.0,
            api_key=os.getenv("GOOGLE_API_KEY")
        )
        
        # Create agent using browser and context
        agent = Agent(
            task=request.instructions,
            llm=llm,
            browser=browser,
            browser_context=context,
        )
        
        # Generate live URL for browserless
        browser_url = None
        try:
            # Get current page and create CDP session
            current_page = browser_session.agent_current_page
            if current_page:
                cdp_session = await current_page.createCDPSession()
                response = await cdp_session.send('Browserless.liveURL', {
                    "timeout": 600000  # 10 minutes
                })
                browser_url = response.get("liveURL")
                logger.info(f"[{session_id}] Live URL generated: {browser_url}")
        except Exception as e:
            logger.warning(f"[{session_id}] Failed to generate live URL: {e}")
            browser_url = None
        
        # Store session for monitoring and control
        active_sessions[session_id] = {
            "agent": agent,
            "browser_session": browser_session,
            "status": "running",
            "task": request.instructions,
            "browser_url": browser_url,
            "human_control": False,
            "last_screenshot": None,
            "current_url": "",
            "paused": False,
            "performance_optimizer": PerformanceOptimizer(),
            "security_manager": SecurityManager(),
            "virtual_display": virtual_display,
        }
        
        # Run agent asynchronously
        asyncio.create_task(run_agent_task(agent, request.instructions, session_id))
        
        logger.info(f"[{session_id}] Agent session started with browser URL: {browser_url}")
        return {
            "session_id": session_id,
            "status": "started",
            "task": request.instructions,
            "browser_url": browser_url,
            "live_url": browser_url
        }
        
    except Exception as e:
        logger.error(f"[{session_id}] Failed to start agent: {e}", exc_info=True)
        return {
            "session_id": session_id,
            "status": "error",
            "task": request.instructions,
            "error": str(e),
            "browser_url": None
        }

@app.post("/api/control-toggle")
async def control_toggle(request: ControlToggleRequest):
    session_id = request.session_id
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = active_sessions[session_id]
    agent = session["agent"]
    
    try:
        if request.human_control:
            # Give control to human
            logger.info(f"[{session_id}] Pausing agent for human control")
            agent.pause()
            session["human_control"] = True
            session["paused"] = True
            logger.info(f"[{session_id}] Control transferred to human - agent paused")
            
            # Notify frontend
            await manager.send_message(session_id, {
                "type": "control_change",
                "human_control": True,
                "message": "Control transferred to human - you can now interact with the browser directly"
            })
        else:
            # Resume AI control
            logger.info(f"[{session_id}] Resuming AI control")
            session["human_control"] = False
            session["paused"] = False
            
            # Add additional prompt if provided
            if request.additional_prompt:
                logger.info(f"[{session_id}] Adding additional context: {request.additional_prompt}")
            
            agent.resume()
            logger.info(f"[{session_id}] Control returned to AI - agent resumed")
            
            # Notify frontend
            await manager.send_message(session_id, {
                "type": "control_change", 
                "human_control": False,
                "message": "Control returned to AI - agent is now active"
            })
            
            # Note: No need to create new task, agent.resume() continues existing execution
        
        return {
            "session_id": session_id,
            "human_control": request.human_control,
            "status": "success"
        }
    except Exception as e:
        logger.error(f"[{session_id}] Failed to toggle control: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/create-sub-agent")
async def create_sub_agent(session_id: str, task: str, specialization: str):
    """Create a specialized sub-agent for specific tasks"""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    try:
        session = active_sessions[session_id]
        sub_agent_manager = session["sub_agent_manager"]
        browser_session = session["browser_session"]
        
        agent_id = await sub_agent_manager.create_sub_agent(task, specialization, browser_session)
        
        return {
            "agent_id": agent_id,
            "task": task,
            "specialization": specialization,
            "status": "created"
        }
    except Exception as e:
        logger.error(f"Failed to create sub-agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/execute-sub-task")
async def execute_sub_task(session_id: str, agent_id: str, task: str):
    """Execute task using specialized sub-agent"""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    try:
        session = active_sessions[session_id]
        sub_agent_manager = session["sub_agent_manager"]
        
        result = await sub_agent_manager.execute_sub_task(agent_id, task)
        
        return {
            "agent_id": agent_id,
            "task": task,
            "result": result,
            "status": "completed"
        }
    except Exception as e:
        logger.error(f"Failed to execute sub-task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/stop-agent")
async def stop_agent(session_id: str = Query(...)):
    if session_id in active_sessions:
        try:
            session = active_sessions[session_id]
            
            # Close browser session
            await session["browser_session"].close()
            
            # Stop virtual display if it exists
            if 'virtual_display' in session and session['virtual_display']:
                try:
                    session['virtual_display'].stop()
                    logger.info(f"[{session_id}] Virtual display stopped")
                except Exception as e:
                    logger.error(f"[{session_id}] Error stopping virtual display: {e}")
            
            # Remove from active sessions
            del active_sessions[session_id]
            logger.info(f"Agent session stopped: {session_id}")
            return {"message": f"Session {session_id} stopped"}
        except Exception as e:
            logger.error(f"Failed to stop agent session {session_id}: {e}")
            raise
    else:
        raise HTTPException(status_code=404, detail="Session not found")

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)
    try:
        # Send initial session state
        if session_id in active_sessions:
            session = active_sessions[session_id]
            await manager.send_message(session_id, {
                "type": "session_state",
                "human_control": session.get("human_control", False),
                "status": session.get("status", "unknown"),
                "current_url": session.get("current_url", ""),
                "paused": session.get("paused", False)
            })
        
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                message_type = message.get("type")
                
                if message_type == "control_toggle":
                    # Handle control toggle via WebSocket
                    human_control = message.get("human_control", False)
                    additional_prompt = message.get("additional_prompt")
                    
                    # Use the existing control toggle logic
                    request = ControlToggleRequest(
                        session_id=session_id,
                        human_control=human_control,
                        additional_prompt=additional_prompt
                    )
                    await control_toggle(request)
                    
                elif message_type == "get_screenshot":
                    # Send current screenshot
                    if session_id in active_sessions:
                        session = active_sessions[session_id]
                        if session.get("last_screenshot"):
                            await manager.send_message(session_id, {
                                "type": "screenshot_update",
                                "screenshot": session["last_screenshot"],
                                "url": session.get("current_url", ""),
                                "timestamp": datetime.now().isoformat()
                            })
                
                logger.debug(f"Processed message from client for session {session_id}: {message_type}")
                
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON received from client for session {session_id}: {data}")
            except Exception as e:
                logger.error(f"Error processing message for session {session_id}: {e}")
                
    except WebSocketDisconnect:
        manager.disconnect(session_id)
        logger.info(f"WebSocket disconnected for session {session_id}")

@app.get('/health')
async def health_check():
    return {"status": "ok"}

@app.get('/sessions')
async def get_active_sessions():
    return {s_id: {"status": s['status'], "task": s['task']} for s_id, s in active_sessions.items()}

@app.get('/api/session/{session_id}/info')
async def get_session_info(session_id: str):
    """Get detailed information about a specific session"""
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = active_sessions[session_id]
    browser_session = session.get("browser_session")
    
    # Get current page info
    current_page_url = None
    current_page_title = None
    
    try:
        if browser_session:
            page = await browser_session.get_current_page()
            if page:
                current_page_url = page.url
                current_page_title = await page.title()
    except Exception as e:
        logger.error(f"Error getting page info: {e}")
    
    return {
        "session_id": session_id,
        "status": session.get("status"),
        "task": session.get("task"),
        "browser_url": session.get("browser_url"),
        "current_page_url": current_page_url,
        "current_page_title": current_page_title,
        "human_control": session.get("human_control", False),
        "last_screenshot": session.get("last_screenshot"),
        "result": session.get("result"),
        "completed_at": session.get("completed_at"),
        "paused": session.get("paused", False),
        "latest_thinking": session.get("latest_thinking")  # Include browser agent's thinking
    }

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)
