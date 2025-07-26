"""
Browser Tool Handler for Claude
Integrates with the existing browser-use service to provide browser capabilities to Claude
"""

import json
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

class BrowserToolHandler:
    """
    Handle browser tool requests from Claude by integrating with browser-use service
    """
    
    def __init__(self):
        self.tool_definition = {
            "name": "browser",
            "description": "Open a browser, navigate to URLs, and allow user interaction through a live browser window",
            "input_schema": {
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "enum": ["open", "navigate", "close"],
                        "description": "The browser action to perform"
                    },
                    "url": {
                        "type": "string",
                        "description": "The URL to navigate to (required for open and navigate actions)"
                    }
                },
                "required": ["action"]
            }
        }
    
    async def handle_browser_tool(self, tool_input: Dict[str, Any], browser_use_service) -> Dict[str, Any]:
        """
        Handle browser tool requests from Claude using the existing browser-use service
        
        Args:
            tool_input: The input from Claude's tool use
            browser_use_service: The browser-use service instance
        
        Returns:
            Dict with success status and relevant information
        """
        action = tool_input.get("action", "").lower()
        url = tool_input.get("url", "")
        
        try:
            if action == "open":
                if not url:
                    return {
                        "success": False,
                        "error": "URL is required for open action"
                    }
                
                # Use the existing browser-use service to create a session with URL
                from browser_use_service import create_browser_session_with_url
                result = await create_browser_session_with_url(url, timeout_ms=600000)
                
                return {
                    "success": True,
                    "message": f"Browser opened and navigated to {url}",
                    "session_id": result["session_id"],
                    "live_url": result["live_url"],
                    "instructions": (
                        "The browser is now open at the specified URL. "
                        "Users can see and interact with it through the browser window in the interface. "
                        "The browser session will remain active for up to 10 minutes."
                    )
                }
                
            elif action == "navigate":
                # For navigate, we'll create a new session with the URL
                # This is simpler than tracking session state
                if not url:
                    return {
                        "success": False,
                        "error": "URL is required for navigate action"
                    }
                
                from browser_use_service import create_browser_session_with_url
                result = await create_browser_session_with_url(url, timeout_ms=600000)
                
                return {
                    "success": True,
                    "message": f"Browser navigated to {url}",
                    "session_id": result["session_id"],
                    "live_url": result["live_url"]
                }
                
            elif action == "close":
                # Close all sessions
                try:
                    result = await browser_use_service.close_all_sessions()
                    return {
                        "success": True,
                        "message": "Browser sessions closed",
                        "closed_count": result.get("total_closed", 0)
                    }
                except:
                    return {
                        "success": True,
                        "message": "No active browser sessions to close"
                    }
                    
            else:
                return {
                    "success": False,
                    "error": f"Unknown browser action: {action}. Valid actions are: open, navigate, close"
                }
                
        except Exception as e:
            logger.error(f"Error handling browser tool: {str(e)}")
            return {
                "success": False,
                "error": f"Browser operation failed: {str(e)}"
            }
    
    def get_tool_definition(self) -> Dict[str, Any]:
        """Get the tool definition for Claude"""
        return self.tool_definition


# Global handler instance
browser_tool_handler = BrowserToolHandler()
