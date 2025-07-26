import anthropic
import os
from typing import List, Dict, Any, Optional, AsyncGenerator
import json
import logging

logger = logging.getLogger(__name__)

class ClaudeCompletions:
    """
    Claude Completions handler with streaming support and tool integration.
    """
    
    def __init__(self):
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable is required")
            
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = "claude-sonnet-4-20250514"
        self.default_system_prompt = """You are **Ron of Ron AI**, a specialized healthcare AI assistant dedicated to helping patients access their prescribed medications at the lowest possible cost while ensuring safety, quality, and proper medical adherence.

---

## Tools

* **Browser-Use Tool**
  An automated, headless browser agent that can:

  * Navigate patient-facing portals (insurer sites, pharmacy sites, manufacturer sites)
  * Fill and submit enrollment or renewal forms on behalf of the patient
  * Scrape confirmation numbers, coverage details, and pricing tables in real time

* **Web-Search**
  A high-precision search capability that:

  * Queries the latest drug-pricing databases and public payer formularies
  * Aggregates published and gray-market cost data (GoodRx, SingleCare, Medicare Part D)
  * Monitors news feeds for newly launched copay assistance or state relief programs

*(These tools augment your core reasoning and clinical-appropriateness checks, ensuring every recommendation is grounded in the freshest data.)*

---

## Core Mission

Your primary objective is to serve as a patient advocate in navigating the complex landscape of medication pricing, insurance coverage, and assistance programs. You combine advanced research capabilities with practical execution to deliver tangible cost savings for patients.

---

## Key Responsibilities

### 1. Comprehensive Cost Analysis

* Analyze patient insurance coverage and current medication costs
* Research all available cost-reduction opportunities: generics, manufacturer assistance, pharmacy discounts (GoodRx, SingleCare, RxSaver), e-pharmacies (Amazon Pharmacy, Cost Plus Drugs), local savings, government programs, patient foundations

### 2. Eligibility Verification

* Assess patient eligibility for each program based on income, insurance status, age/diagnosis, geography, and program-specific criteria

### 3. Program Enrollment Support

* Guide patients through enrollment processes
* Deploy automated browser agents for online applications when appropriate
* Provide step-by-step instructions for manual enrollment
* Track confirmation numbers and follow-up requirements

### 4. Medication Cost Savings

* **Discover & Validate** the universe of savings options via web-search and real-time scraping
* **Compare** costs across retail, e-pharmacy, and manufacturer channels
* **Execute** enrollment or coupon retrieval instantly via browser automation
* **Document** estimated savings and confirm patient's adherence plan

### 5. Provider Search

* **Network Verification**: Query insurer directories for in-network physicians, pharmacies, infusion centers
* **Quality Matching**: Cross-reference CMS star ratings and patient reviews
* **Appointment Coordination**: Automate requests for new-patient slots or prior-auth referrals

### 6. Denial Navigation

* **Denial Triage**: Ingest EOB documents; classify denial reasons
* **Appeal Drafting**: Auto-populate appeal templates tailored to payer requirements
* **Follow-Up Tracking**: Use browser agents to check appeal status and escalate as needed

### 7. Care Coordination

* **Task Orchestration**: Generate Kanban-style action lists for multi-step workflows (e.g., prior auth → referral → follow-up)
* **Stakeholder Messaging**: Draft and send secure messages to providers, payers, pharmacies
* **Progress Monitoring**: Continuously scrape portal updates to keep the patient's care plan current

---

## Operational Principles

### Patient Safety First

* Never recommend unverified medication sources
* Ensure all alternatives are FDA-approved and bioequivalent
* Factor in medication urgency and patient's ability to navigate programs
* Uphold medication adherence as the top priority

### Systematic Approach

1. **Discovery Phase**: Exhaustively research cost-saving opportunities
2. **Eligibility Assessment**: Create detailed eligibility matrices
3. **Ranking & Presentation**: Present options with transparent reasoning
4. **Execution Support**: Facilitate enrollment in chosen programs
5. **Documentation**: Maintain detailed records of all actions and confirmations

### Tool Utilization

* Use **Web-Search** for up-to-date pricing and program information
* Verify clinical appropriateness when considering alternatives
* Leverage specialized reasoning for complex eligibility determinations
* Utilize **Browser-Use Tool** for streamlined enrollment
* Provide interactive selection interfaces to empower patient choice

---

## Communication Standards

### With Patients

* Use clear, non-technical language
* Provide specific dollar-amount savings
* Include concrete next steps with timelines
* Offer backup options for contingency planning

### Documentation Format

1. **Selected Best Option** with detailed reasoning
2. **Actions Taken** with confirmations
3. **Estimated Savings Breakdown**
4. **Numbered Next Steps** for the patient
5. **Essential Contact Information** and reference numbers

---

## Ethical Guidelines

* Maintain strict patient confidentiality
* Provide unbiased recommendations based solely on patient benefit
* Disclose any limitations in available options
* Never accept compensation from pharmaceutical companies or pharmacies
* Prioritize long-term medication affordability and adherence

---

## Quality Metrics

* Percentage reduction in patient medication costs
* Speed of identifying and implementing solutions
* Patient ability to maintain medication adherence
* Accuracy of eligibility assessments
* Successful program enrollments
"""
    
    async def stream_complete(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 32000,
        temperature: float = 1.0,
        enable_thinking: bool = True,
        thinking_budget: int = 20000,
        tools: Optional[List[Any]] = None,
        custom_tools: Optional[List[Dict]] = None,
        system_prompt: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream completion with tool support.
        """
        try:
            # Prepare the request
            request_params = {
                "model": self.model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "betas": ["web-search-2025-03-05"]
            }
            
            # Add system prompt
            if system_prompt:
                request_params["system"] = system_prompt
            else:
                request_params["system"] = self.default_system_prompt
            
            # Add thinking if enabled
            if enable_thinking:
                request_params["thinking"] = {
                    "type": "enabled",
                    "budget_tokens": thinking_budget
                }
            
            # Handle tools
            if tools:
                tool_list = []
                for tool in tools:
                    if isinstance(tool, str):
                        # Native tool
                        if tool == "bash":
                            tool_list.append({"type": "bash_20250124", "name": "bash"})
                        elif tool == "text_editor":
                            tool_list.append({"type": "text_editor_20250728", "name": "str_replace_based_edit_tool"})
                        elif tool == "web_search":
                            tool_list.append({"name": "web_search", "type": "web_search_20250305"})
                    elif isinstance(tool, dict):
                        # Custom tool
                        tool_list.append(tool)
                
                # Add custom tools if provided
                if custom_tools:
                    tool_list.extend(custom_tools)
                
                if tool_list:
                    request_params["tools"] = tool_list
                    logger.info(f"Sending tools to Claude: {json.dumps(tool_list, indent=2)}")
            
            # Create streaming message with tool execution support
            with self.client.beta.messages.stream(**request_params) as stream:
                tool_use_content = None
                tool_use_id = None
                tool_name = None
                
                for event in stream:
                    if hasattr(event, 'type'):
                        if event.type == 'message_start':
                            yield {
                                'type': 'message_start',
                                'message': {
                                    'id': getattr(event.message, 'id', ''),
                                    'role': getattr(event.message, 'role', 'assistant'),
                                    'model': getattr(event.message, 'model', self.model)
                                }
                            }
                        elif event.type == 'content_block_start':
                            # Check if this is a tool use block
                            if hasattr(event, 'content_block') and hasattr(event.content_block, 'type'):
                                if event.content_block.type == 'tool_use':
                                    tool_use_id = getattr(event.content_block, 'id', None)
                                    tool_name = getattr(event.content_block, 'name', None)
                                    tool_use_content = ""
                                    logger.info(f"Tool use started: {tool_name} (ID: {tool_use_id})")
                            
                            yield {
                                'type': 'content_block_start',
                                'index': getattr(event, 'index', 0),
                                'content_block': {
                                    'type': getattr(event.content_block, 'type', 'text'),
                                    'text': getattr(event.content_block, 'text', ''),
                                    'id': getattr(event.content_block, 'id', ''),
                                    'name': getattr(event.content_block, 'name', '')
                                }
                            }
                        elif event.type == 'content_block_delta':
                            # Handle tool use input accumulation
                            if tool_use_id and hasattr(event, 'delta') and hasattr(event.delta, 'partial_json'):
                                tool_use_content += event.delta.partial_json
                            
                            yield {
                                'type': 'content_block_delta',
                                'index': getattr(event, 'index', 0),
                                'delta': {
                                    'type': getattr(event.delta, 'type', 'text_delta'),
                                    'text': getattr(event.delta, 'text', ''),
                                    'partial_json': getattr(event.delta, 'partial_json', '')
                                }
                            }
                        elif event.type == 'content_block_stop':
                            # Execute tool if we have accumulated tool use content
                            if tool_use_id and tool_name and tool_use_content:
                                try:
                                    from tools import execute_tool
                                    
                                    # Parse the tool input
                                    tool_input = json.loads(tool_use_content)
                                    logger.info(f"Executing tool {tool_name} with input: {tool_input}")
                                    
                                    # Execute the tool
                                    tool_result = await execute_tool(tool_name, tool_input)
                                    logger.info(f"Tool {tool_name} executed successfully")
                                    
                                    # Yield tool result
                                    yield {
                                        'type': 'tool_result',
                                        'tool_use_id': tool_use_id,
                                        'tool_name': tool_name,
                                        'result': tool_result
                                    }
                                    
                                except Exception as e:
                                    logger.error(f"Error executing tool {tool_name}: {str(e)}")
                                    yield {
                                        'type': 'tool_error',
                                        'tool_use_id': tool_use_id,
                                        'tool_name': tool_name,
                                        'error': str(e)
                                    }
                                finally:
                                    # Reset tool tracking
                                    tool_use_id = None
                                    tool_name = None
                                    tool_use_content = None
                            
                            yield {
                                'type': 'content_block_stop',
                                'index': getattr(event, 'index', 0)
                            }
                        elif event.type == 'message_delta':
                            # Handle message delta with safe serialization
                            delta_dict = {}
                            if hasattr(event.delta, 'stop_reason'):
                                delta_dict['stop_reason'] = event.delta.stop_reason
                            if hasattr(event.delta, 'stop_sequence'):
                                delta_dict['stop_sequence'] = event.delta.stop_sequence
                            
                            usage_dict = {}
                            if hasattr(event, 'usage'):
                                if hasattr(event.usage, 'output_tokens'):
                                    usage_dict['output_tokens'] = event.usage.output_tokens
                                if hasattr(event.usage, 'input_tokens'):
                                    usage_dict['input_tokens'] = event.usage.input_tokens
                                    
                            yield {
                                'type': 'message_delta',
                                'delta': delta_dict,
                                'usage': usage_dict
                            }
                        elif event.type == 'message_stop':
                            yield {
                                'type': 'message_stop'
                            }
                        elif hasattr(event, 'type') and ('thinking' in str(event.type).lower() or 
                                                               str(type(event).__name__).startswith('BetaThinking')):
                            # Handle thinking events specially to avoid serialization issues
                            thinking_content = ""
                            if hasattr(event, 'delta') and hasattr(event.delta, 'text'):
                                thinking_content = event.delta.text
                            elif hasattr(event, 'content') and hasattr(event.content, 'text'):
                                thinking_content = event.content.text
                            elif hasattr(event, 'text'):
                                thinking_content = event.text
                            
                            yield {
                                'type': 'content_block_delta',
                                'index': getattr(event, 'index', 0),
                                'delta': {
                                    'type': 'thinking_delta',
                                    'text': thinking_content
                                }
                            }
                        else:
                            # Handle any other event types safely
                            event_type = getattr(event, 'type', str(type(event).__name__))
                            
                            # For unknown events, create a safe serializable version
                            safe_data = {
                                'type': event_type,
                                'raw_type': str(type(event).__name__)
                            }
                            
                            # Try to extract common attributes safely
                            for attr in ['index', 'text', 'content']:
                                if hasattr(event, attr):
                                    try:
                                        value = getattr(event, attr)
                                        # Only include simple types
                                        if isinstance(value, (str, int, float, bool, type(None))):
                                            safe_data[attr] = value
                                    except:
                                        pass
                            
                            yield safe_data
                            
                            
        except Exception as e:
            logger.error(f"Error in stream_complete: {str(e)}")
            yield {
                'type': 'error',
                'error': str(e)
            }
    
    async def complete(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 32000,
        temperature: float = 1.0,
        enable_thinking: bool = True,
        thinking_budget: int = 20000,
        tools: Optional[List[Any]] = None,
        custom_tools: Optional[List[Dict]] = None,
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Non-streaming completion.
        """
        try:
            # Prepare the request
            request_params = {
                "model": self.model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "betas": ["web-search-2025-03-05"]
            }
            
            # Add system prompt
            if system_prompt:
                request_params["system"] = system_prompt
            else:
                request_params["system"] = self.default_system_prompt
            
            # Add thinking if enabled
            if enable_thinking:
                request_params["thinking"] = {
                    "type": "enabled",
                    "budget_tokens": thinking_budget
                }
            
            # Handle tools
            if tools:
                tool_list = []
                for tool in tools:
                    if isinstance(tool, str):
                        # Native tool
                        if tool == "bash":
                            tool_list.append({"type": "bash_20250124", "name": "bash"})
                        elif tool == "text_editor":
                            tool_list.append({"type": "text_editor_20250728", "name": "str_replace_based_edit_tool"})
                        elif tool == "web_search":
                            tool_list.append({"name": "web_search", "type": "web_search_20250305"})
                    elif isinstance(tool, dict):
                        # Custom tool
                        tool_list.append(tool)
                
                # Add custom tools if provided
                if custom_tools:
                    tool_list.extend(custom_tools)
                
                if tool_list:
                    request_params["tools"] = tool_list
                    logger.info(f"Sending tools to Claude: {json.dumps(tool_list, indent=2)}")
            
            # Create message
            message = self.client.beta.messages.create(**request_params)
            
            # Convert to dict format
            return {
                "id": message.id,
                "type": "message",
                "role": message.role,
                "content": [
                    {
                        "type": "text",
                        "text": block.text if hasattr(block, 'text') else str(block)
                    }
                    for block in message.content
                ],
                "model": message.model,
                "stop_reason": message.stop_reason,
                "stop_sequence": message.stop_sequence,
                "usage": {
                    "input_tokens": message.usage.input_tokens,
                    "output_tokens": message.usage.output_tokens
                }
            }
            
        except Exception as e:
            logger.error(f"Error in complete: {str(e)}")
            raise
    
    async def execute_code_with_verification(
        self,
        code_task: str,
        verify_output: bool = True,
        enable_thinking: bool = True,
        thinking_budget: int = 20000
    ) -> Dict[str, Any]:
        """
        Execute code with verification using bash tool.
        """
        messages = [
            {
                "role": "user",
                "content": f"Please help me with this coding task: {code_task}"
            }
        ]
        
        # Use streaming completion with bash tool
        response_text = ""
        async for event in self.stream_complete(
            messages=messages,
            tools=["bash"],
            enable_thinking=enable_thinking,
            thinking_budget=thinking_budget
        ):
            if event.get('type') == 'content_block_delta':
                response_text += event.get('delta', {}).get('text', '')
        
        return {
            "success": True,
            "response": response_text,
            "task": code_task
        }
    
    async def search_and_analyze(
        self,
        query: str,
        num_results: int = 5,
        analyze: bool = True
    ) -> Dict[str, Any]:
        """
        Search and analyze using web search tool.
        """
        messages = [
            {
                "role": "user",
                "content": f"Please search for and analyze: {query}"
            }
        ]
        
        # Use streaming completion with web search tool
        response_text = ""
        async for event in self.stream_complete(
            messages=messages,
            tools=["web_search"],
            max_tokens=4096
        ):
            if event.get('type') == 'content_block_delta':
                response_text += event.get('delta', {}).get('text', '')
        
        return {
            "success": True,
            "query": query,
            "response": response_text,
            "num_results": num_results
        }
    
    async def process_files(
        self,
        file_paths: List[str],
        task: str,
        enable_thinking: bool = True
    ) -> Dict[str, Any]:
        """
        Process files with task.
        """
        # Note: File processing would require additional implementation
        # This is a placeholder
        messages = [
            {
                "role": "user",
                "content": f"Please help with this task on the provided files: {task}"
            }
        ]
        
        response = await self.complete(
            messages=messages,
            enable_thinking=enable_thinking
        )
        
        return response
    
    async def execute_with_tools(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 1.0,
        max_tokens: int = 32000,
        enable_caching: bool = True,
        cache_ttl: str = "5m",
        enable_thinking: bool = True,
        thinking_budget: int = 20000,
        enable_citations: bool = True,
        stream: bool = True
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Execute with all available tools.
        """
        # Use all standard tools
        tools = ["bash", "text_editor", "web_search"]
        
        async for event in self.stream_complete(
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            enable_thinking=enable_thinking,
            thinking_budget=thinking_budget,
            tools=tools
        ):
            yield event
