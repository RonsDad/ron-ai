"""
Main server application with complete browserless integration
Combines REST API and WebSocket endpoints for browser management
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import logging
import os
import sys

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# Import our modules
from browser_api import router as browser_api_router
from browser_websocket import ws_router, ws_manager
from claude_browser_api import router as claude_browser_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Nira Browser Integration API",
    description="Enhanced browser automation with Browserless cloud integration",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(browser_api_router)
app.include_router(claude_browser_router)
app.include_router(ws_router)

# Health check endpoint
@app.get("/health")
async def health_check():
    """General health check"""
    return {
        "status": "healthy",
        "service": "nira-browser-integration",
        "websocket_connections": len(ws_manager.connections),
        "browser_subscribers": len(ws_manager.browser_subscribers)
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Nira Browser Integration API",
        "version": "1.0.0",
        "endpoints": {
            "browser_api": "/api/browser/*",
            "websocket": "/ws/browser",
            "health": "/health",
            "docs": "/docs"
        }
    }

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting Nira Browser Integration API...")
    logger.info("Browser API endpoints available at /api/browser/*")
    logger.info("WebSocket endpoint available at /ws/browser")
    logger.info("API documentation available at /docs")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down Nira Browser Integration API...")
    
    # Stop WebSocket background tasks
    await ws_manager._stop_background_tasks()
    
    # Close all browser sessions
    from src.browser.enhanced_browser_manager import get_browser_manager
    manager = get_browser_manager()
    await manager.close_all_sessions()
    
    logger.info("Shutdown complete")

if __name__ == "__main__":
    import uvicorn
    
    # Configuration
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("RELOAD", "true").lower() == "true"
    
    logger.info(f"Starting server on {host}:{port}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )
