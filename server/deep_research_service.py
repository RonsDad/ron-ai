"""
Deep Research Service - ADK-based deep research agent wrapper
Integrates with Ron AI interface when Deep Research toggle is enabled
Requires Google ADK dependencies for full functionality
"""

import asyncio
import logging
import os
import sys

# Add the deep research agent to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'deep_research_agent'))

from deep_research_agent.agent import (
    root_agent, 
    research_pipeline, 
    plan_generator,
    interactive_planner_agent
)
from deep_research_agent.config import config
from google.adk.agents.session import Session
from google.adk.agents.invocation_context import InvocationContext

# No additional imports needed - all ADK functionality is imported above


class DeepResearchAgent:
    """
    ADK-based deep research agent wrapper for integration with Ron AI
    Provides full ADK functionality including iterative research and citation management
    """
    
    def __init__(self, max_iterations: int = 5):
        self.max_iterations = max_iterations
        self.logger = logging.getLogger(__name__)
        
    async def run_adk_research(self, topic: str) -> str:
        """Run the full ADK-based research agent with complete functionality"""
        try:
            # Create a new session for the research
            session = Session()
            
            # Create invocation context
            ctx = InvocationContext(session=session)
            
            # Step 1: Generate a research plan using plan_generator
            self.logger.info(f"Generating research plan for: {topic}")
            session.state["user_input"] = topic
            
            # Run plan generator to create the research plan
            plan_events = []
            async for event in plan_generator._run_async_impl(ctx):
                plan_events.append(event)
                if event.content and hasattr(event.content, 'text'):
                    self.logger.info(f"Plan generation: {event.content.text[:200]}...")
            
            # Check if we have a research plan
            if "research_plan" not in session.state:
                self.logger.error("No research plan generated")
                return await self.run_fallback_research(topic)
            
            research_plan = session.state["research_plan"]
            self.logger.info(f"Research plan generated: {research_plan[:200]}...")
            
            # Step 2: Execute the research pipeline with the approved plan
            self.logger.info("Executing research pipeline...")
            
            # Set the research plan in session state for the pipeline
            session.state["research_plan"] = research_plan
            
            # Run the research pipeline which includes:
            # - Section planning
            # - Research execution with iterative refinement
            # - Report composition with citations
            pipeline_events = []
            async for event in research_pipeline._run_async_impl(ctx):
                pipeline_events.append(event)
                if event.content and hasattr(event.content, 'text'):
                    self.logger.info(f"Pipeline progress: {event.content.text[:200]}...")
            
            # Step 3: Extract the final report with citations
            if "final_report_with_citations" in session.state:
                final_report = session.state["final_report_with_citations"]
                self.logger.info(f"Final report with citations generated: {len(final_report)} characters")
                return final_report
            elif "final_cited_report" in session.state:
                final_report = session.state["final_cited_report"]
                self.logger.info(f"Final cited report generated: {len(final_report)} characters")
                return final_report
            elif "section_research_findings" in session.state:
                findings = session.state["section_research_findings"]
                self.logger.info(f"Research findings available: {len(str(findings))} characters")
                return f"# Research Report: {topic}\n\n{findings}"
            else:
                # Collect any text content from events
                report_content = []
                for event in pipeline_events:
                    if event.content and hasattr(event.content, 'text'):
                        report_content.append(event.content.text)
                    elif event.content and hasattr(event.content, 'parts'):
                        for part in event.content.parts:
                            if hasattr(part, 'text'):
                                report_content.append(part.text)
                
                if report_content:
                    final_report = "\n\n".join(report_content)
                    self.logger.info(f"Report assembled from events: {len(final_report)} characters")
                    return final_report
                else:
                    self.logger.warning("No report content found in session state or events")
                    return f"# Research Report: {topic}\n\nResearch completed but no detailed report was generated. Session state keys: {list(session.state.keys())}"
                
        except Exception as e:
            self.logger.error(f"ADK research failed: {e}", exc_info=True)
            raise e
    
    async def run_research(self, topic: str) -> str:
        """Main research workflow - this is called by the Ron AI backend"""
        self.logger.info(f"Running ADK-based deep research for topic: {topic}")
        return await self.run_adk_research(topic)


# Global instance for the backend to use
deep_research_agent = DeepResearchAgent()


async def execute_deep_research(topic: str) -> str:
    """
    Main function called by claude_backend.py when Deep Research toggle is on
    """
    return await deep_research_agent.run_research(topic)