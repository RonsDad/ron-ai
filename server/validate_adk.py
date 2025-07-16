#!/usr/bin/env python3
"""
Validation script for ADK Deep Research dependencies
"""

import sys
import os

def check_adk_dependencies():
    """Check if all required ADK dependencies are available"""
    print("Validating ADK Deep Research dependencies...")
    
    # Add the deep research agent to the path
    sys.path.append(os.path.join(os.path.dirname(__file__), 'deep_research_agent'))
    
    try:
        # Test basic ADK imports
        print("✓ Checking google.adk.agents...")
        from google.adk.agents.session import Session
        from google.adk.agents.invocation_context import InvocationContext
        print("✓ google.adk.agents imported successfully")
        
        print("✓ Checking google.genai...")
        from google.genai import types as genai_types
        print("✓ google.genai imported successfully")
        
        print("✓ Checking google.auth...")
        import google.auth
        print("✓ google.auth imported successfully")
        
        print("✓ Checking deep research agent components...")
        from deep_research_agent.agent import (
            root_agent, 
            research_pipeline, 
            plan_generator,
            interactive_planner_agent
        )
        from deep_research_agent.config import config
        print("✓ Deep research agent components imported successfully")
        
        print("✓ Testing session creation...")
        session = Session()
        ctx = InvocationContext(session=session)
        print("✓ Session and context created successfully")
        
        print("✓ Checking configuration...")
        print(f"  - Worker model: {config.worker_model}")
        print(f"  - Critic model: {config.critic_model}")
        print(f"  - Max iterations: {config.max_search_iterations}")
        
        print("\n🎉 All ADK dependencies are available and working!")
        return True
        
    except ImportError as e:
        print(f"❌ ADK dependency missing: {e}")
        print("\nTo install ADK dependencies, you may need to:")
        print("1. Install Google ADK: pip install google-adk")
        print("2. Install Google GenAI: pip install google-generativeai")
        print("3. Set up authentication with Google Cloud")
        return False
    except Exception as e:
        print(f"❌ Error validating ADK: {e}")
        return False

if __name__ == "__main__":
    success = check_adk_dependencies()
    sys.exit(0 if success else 1)