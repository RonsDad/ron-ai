"""
Tool handlers for Claude to use
Based on the browser-use integration
"""

from typing import Any, Dict
import logging
import asyncio
from datetime import datetime
import os

logger = logging.getLogger(__name__)

# Browser automation tool using browser-use
async def browser_use(task: str, session_id: str = None) -> Dict[str, Any]:
    """
    Perform a browser automation task using browser-use Agent.
    Creates a new session if session_id is not provided.
    """
    try:
        from browser_use import Agent, BrowserSession, BrowserProfile
        from browser_use.llm import ChatAnthropic
        
        # Generate session_id if not provided
        if not session_id:
            session_id = f"claude_browser_{datetime.now().timestamp()}"
        
        logger.info(f"Starting browser task: {task}")
        
        # Get browserless token
        browserless_token = os.getenv('BROWSERLESS_API_TOKEN')
        if not browserless_token:
            return {"error": "BROWSERLESS_API_TOKEN not configured"}
        
        # Create browser profile for consistency
        browser_profile = BrowserProfile(
            stealth=True,
            headless=False,  # For human-in-the-loop
            viewport={"width": 1280, "height": 900}
        )
        
        # Create browser session with profile
        browser_session = BrowserSession(
            cdp_url=f"wss://production-sfo.browserless.io?token={browserless_token}",
            browser_profile=browser_profile
        )
        
        # Create agent with the task
        llm = ChatAnthropic(model="claude-sonnet-4-20250514")
        agent = Agent(
            task=task,
            llm=llm,
            browser_session=browser_session
        )
        
        # Start session
        await browser_session.start()
        
        # Get LiveURL for visibility
        page = await browser_session.get_current_page()
        # Create CDP session using Playwright's correct method
        cdp = await page.context.new_cdp_session(page)
        response = await cdp.send('Browserless.liveURL', {"timeout": 600000})
        live_url = response["liveURL"]
        
        logger.info(f"Browser session started with LiveURL: {live_url}")
        
        # Run the agent task
        result = await agent.run()
        
        # Get final state
        final_url = page.url
        
        # Keep browser open for a bit so user can see result
        await asyncio.sleep(5)
        
        # Close session
        await browser_session.close()
        
        return {
            "success": True,
            "result": str(result),
            "session_id": session_id,
            "live_url": live_url,
            "final_url": final_url,
            "task": task
        }
        
    except Exception as e:
        logger.error(f"Browser task error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "task": task
        }


# Web search tool
async def web_search(query: str, num_results: int = 5) -> Dict[str, Any]:
    """Search the web for information"""
    # This would integrate with your web search service
    # For now, return a placeholder
    return {
        "results": [f"Result {i+1} for '{query}'" for i in range(num_results)],
        "query": query
    }


# Code execution tool
async def execute_code(code: str, language: str = "python") -> Dict[str, Any]:
    """Execute code in a sandboxed environment"""
    # This would integrate with your code execution service
    return {
        "output": f"Executed {language} code",
        "code": code,
        "language": language,
        "error": None
    }


# Tool registry
TOOLS = {
    "browser_use": {
        "function": browser_use,
        "description": "Perform browser automation tasks like navigating websites, clicking elements, filling forms, extracting data",
        "parameters": {
            "task": {
                "type": "string",
                "description": "The browser automation task to perform",
                "required": True
            },
            "session_id": {
                "type": "string", 
                "description": "Optional session ID to reuse existing session",
                "required": False
            }
        }
    },
    "web_search": {
        "function": web_search,
        "description": "Search the web for information",
        "parameters": {
            "query": {
                "type": "string",
                "description": "The search query",
                "required": True
            },
            "num_results": {
                "type": "integer",
                "description": "Number of results to return",
                "required": False,
                "default": 5
            }
        }
    },
    "execute_code": {
        "function": execute_code,
        "description": "Execute code in a sandboxed environment",
        "parameters": {
            "code": {
                "type": "string",
                "description": "The code to execute",
                "required": True
            },
            "language": {
                "type": "string",
                "description": "Programming language",
                "required": False,
                "default": "python"
            }
        }
    }
}


def get_tool_definitions_for_claude():
    """Get tool definitions in Claude's expected format"""
    definitions = []
    
    for name, meta in TOOLS.items():
        tool_def = {
            "name": name,
            "description": meta["description"],
            "input_schema": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
        
        # Add parameters
        for param_name, param_info in meta["parameters"].items():
            tool_def["input_schema"]["properties"][param_name] = {
                "type": param_info["type"],
                "description": param_info["description"]
            }
            if param_info.get("default"):
                tool_def["input_schema"]["properties"][param_name]["default"] = param_info["default"]
            
            if param_info.get("required", False):
                tool_def["input_schema"]["required"].append(param_name)
        
        definitions.append(tool_def)
    
    return definitions


async def execute_tool(tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
    """Execute a tool by name with given input"""
    if tool_name not in TOOLS:
        return {"error": f"Unknown tool: {tool_name}"}
    
    tool_func = TOOLS[tool_name]["function"]
    
    try:
        # Execute the tool function
        result = await tool_func(**tool_input)
        return result
    except Exception as e:
        logger.error(f"Error executing tool {tool_name}: {str(e)}")
        return {
            "error": f"Tool execution failed: {str(e)}",
            "tool": tool_name,
            "input": tool_input
        }
