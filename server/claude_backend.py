from fastapi import FastAPI, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import anthropic
from anthropic import NOT_GIVEN
from anthropic.types.beta import (
    BetaToolParam,
    BetaThinkingConfigEnabledParam,
    BetaThinkingConfigDisabledParam
)
import os
from dotenv import load_dotenv
import httpx
import json
import logging
import re
from typing import List, Dict, Any, Optional, Union
import asyncio

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title='Claude Backend with Browser-Use Tools')

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:3000',  # Frontend
        'http://localhost:8000',  # Browser-use backend
        'file://*',  # Allow file:// origins for testing
        '*'  # Allow all origins for testing
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Initialize Claude client with validation
api_key = os.getenv('ANTHROPIC_API_KEY')
if not api_key:
    logger.error("ANTHROPIC_API_KEY not found in environment variables")
    raise ValueError("ANTHROPIC_API_KEY must be set in environment variables")

client = anthropic.Anthropic(api_key=api_key)

# Initialize Perplexity API client
perplexity_api_key = os.getenv('PERPLEXITY_API_KEY')
if perplexity_api_key:
    logger.info("Perplexity API key found - Sonar models available")
else:
    logger.warning("PERPLEXITY_API_KEY not found - Sonar models will not be available")

class BrowserUseTool:
    """Tool for Claude to use browser-use agents"""
    
    @staticmethod
    async def start_browser_agent(instructions: str) -> Dict[str, Any]:
        """Start a new browser-use agent session with browserless integration"""
        if not instructions:
            return {'error': 'Instructions parameter is required but was empty'}
        try:
            async with httpx.AsyncClient() as http_client:
                # Send the instructions to the browser server with browserless integration
                response = await http_client.post(
                    'http://localhost:8000/api/start-agent',
                    json={
                        "instructions": instructions,
                        "headless": False  # Use browserless for embedded browser
                    },
                    timeout=120.0  # Longer timeout for browserless setup
                )
                response.raise_for_status()
                result = response.json()
                
                # Log the browser URL for debugging
                if 'browser_url' in result:
                    logger.info(f"Browser agent started with URL: {result['browser_url']}")
                
                return result
        except httpx.ConnectError:
            logger.error("Cannot connect to browser-use backend at localhost:8000")
            return {'error': 'Browser-use backend is not running. Please start it first.'}
        except httpx.TimeoutException:
            logger.error("Browser-use backend request timed out")
            return {'error': 'Browser-use backend request timed out'}
        except Exception as e:
            logger.error(f"Failed to start browser agent: {e}")
            return {'error': str(e)}
    
    @staticmethod
    async def get_browser_agent_status(session_id: str) -> Dict[str, Any]:
        """Get the status and results of a browser agent session"""
        try:
            async with httpx.AsyncClient() as http_client:
                response = await http_client.get(
                    f'http://localhost:8000/api/session/{session_id}/info',
                    timeout=30.0
                )
                response.raise_for_status()
                return response.json()
        except httpx.ConnectError:
            logger.error("Cannot connect to browser-use backend at localhost:8000")
            return {'error': 'Browser-use backend is not running. Please start it first.'}
        except httpx.TimeoutException:
            logger.error("Browser-use backend request timed out")
            return {'error': 'Browser-use backend request timed out'}
        except Exception as e:
            logger.error(f"Failed to get browser agent status: {e}")
            return {'error': str(e)}
    
    @staticmethod
    async def stop_browser_agent(session_id: str) -> Dict[str, Any]:
        """Stop a browser-use agent session"""
        try:
            async with httpx.AsyncClient() as http_client:
                response = await http_client.post(
                    f'http://localhost:8000/api/stop-agent?session_id={session_id}',
                    timeout=30.0
                )
                response.raise_for_status()
                return response.json()
        except httpx.ConnectError:
            logger.error("Cannot connect to browser-use backend at localhost:8000")
            return {'error': 'Browser-use backend is not running. Please start it first.'}
        except httpx.TimeoutException:
            logger.error("Browser-use backend request timed out")
            return {'error': 'Browser-use backend request timed out'}
        except Exception as e:
            logger.error(f"Failed to stop browser agent: {e}")
            return {'error': str(e)}

class PubMedTool:
    """Tool for searching PubMed using E-utilities API"""
    
    @staticmethod
    async def search_pubmed(query: str, retmax: int = 20) -> Dict[str, Any]:
        """Search PubMed for articles matching the query"""
        try:
            async with httpx.AsyncClient() as http_client:
                # PubMed E-utilities search
                search_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
                search_params = {
                    "db": "pubmed",
                    "term": query,
                    "retmax": min(retmax, 100),
                    "retmode": "json",
                    "sort": "relevance"
                }
                
                response = await http_client.get(search_url, params=search_params, timeout=30.0)
                response.raise_for_status()
                search_data = response.json()
                
                pmids = search_data.get("esearchresult", {}).get("idlist", [])
                
                if not pmids:
                    return {"success": True, "articles": [], "count": 0, "query": query}
                
                # Get article details
                fetch_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
                fetch_params = {
                    "db": "pubmed",
                    "id": ",".join(pmids[:10]),  # Limit to 10 for details
                    "retmode": "xml"
                }
                
                fetch_response = await http_client.get(fetch_url, params=fetch_params, timeout=30.0)
                fetch_response.raise_for_status()
                
                return {
                    "success": True,
                    "articles": pmids,
                    "count": len(pmids),
                    "query": query,
                    "details_xml": fetch_response.text[:2000] if fetch_response.text else ""
                }
                
        except Exception as e:
            logger.error(f"PubMed search failed: {e}")
            return {"error": f"PubMed search failed: {str(e)}", "query": query}

class FDATool:
    """Tool for searching FDA drug database"""
    
    @staticmethod
    async def search_fda_drugs(drug_name: str, limit: int = 10) -> Dict[str, Any]:
        """Search FDA drug database for drug information"""
        try:
            async with httpx.AsyncClient() as http_client:
                # FDA openFDA API
                search_url = "https://api.fda.gov/drug/label.json"
                search_params = {
                    "search": f"openfda.brand_name:\"{drug_name}\" OR openfda.generic_name:\"{drug_name}\"",
                    "limit": min(limit, 100)
                }
                
                response = await http_client.get(search_url, params=search_params, timeout=30.0)
                response.raise_for_status()
                fda_data = response.json()
                
                results = fda_data.get("results", [])
                
                processed_results = []
                for result in results:
                    processed_results.append({
                        "brand_names": result.get("openfda", {}).get("brand_name", []),
                        "generic_name": result.get("openfda", {}).get("generic_name", []),
                        "manufacturer": result.get("openfda", {}).get("manufacturer_name", []),
                        "ndc": result.get("openfda", {}).get("product_ndc", []),
                        "dosage_form": result.get("openfda", {}).get("dosage_form", []),
                        "route": result.get("openfda", {}).get("route", [])
                    })
                
                return {
                    "success": True,
                    "drug_name": drug_name,
                    "count": len(processed_results),
                    "results": processed_results
                }
                
        except Exception as e:
            logger.error(f"FDA drug search failed: {e}")
            return {"error": f"FDA drug search failed: {str(e)}", "drug_name": drug_name}

class SonarTool:
    """Tool for Claude to use Perplexity Sonar models for research and reasoning"""
    
    @staticmethod
    async def call_sonar_reasoning_pro(
        query: str, 
        structured_output: bool = False, 
        json_schema: Optional[Dict[str, Any]] = None,
        search_domain_filter: Optional[List[str]] = None,
        search_recency_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """Call Sonar Reasoning Pro model with optional structured output"""
        if not perplexity_api_key:
            return {'error': 'Perplexity API key not configured'}
        
        if not query:
            return {'error': 'Query parameter is required but was empty'}
        
        try:
            async with httpx.AsyncClient() as http_client:
                headers = {
                    'Authorization': f'Bearer {perplexity_api_key}',
                    'Content-Type': 'application/json'
                }
                
                payload = {
                    'model': 'sonar-reasoning-pro',
                    'messages': [
                        {'role': 'system', 'content': 'Be precise and provide detailed reasoning with citations.'},
                        {'role': 'user', 'content': query}
                    ]
                }
                
                # Add structured output if requested
                if structured_output and json_schema:
                    payload['response_format'] = {
                        'type': 'json_schema',
                        'json_schema': {'schema': json_schema}
                    }
                
                # Add search filters if provided
                if search_domain_filter:
                    payload['search_domain_filter'] = search_domain_filter
                if search_recency_filter:
                    payload['search_recency_filter'] = search_recency_filter
                
                response = await http_client.post(
                    'https://api.perplexity.ai/chat/completions',
                    headers=headers,
                    json=payload,
                    timeout=60.0
                )
                response.raise_for_status()
                result = response.json()
                
                # Parse the response and extract structured data if needed
                parsed_result = SonarTool._parse_sonar_response(result, structured_output)
                
                return {
                    'success': True,
                    'model': 'sonar-reasoning-pro',
                    'structured_output': structured_output,
                    **parsed_result
                }
                
        except httpx.ConnectError:
            logger.error("Cannot connect to Perplexity API")
            return {'error': 'Cannot connect to Perplexity API'}
        except httpx.TimeoutException:
            logger.error("Perplexity API request timed out")
            return {'error': 'Perplexity API request timed out'}
        except Exception as e:
            logger.error(f"Failed to call Sonar Reasoning Pro: {e}")
            return {'error': str(e)}
    
    @staticmethod
    async def call_sonar_deep_research(
        query: str,
        structured_output: bool = False,
        json_schema: Optional[Dict[str, Any]] = None,
        search_domain_filter: Optional[List[str]] = None,
        search_recency_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """Call Sonar Deep Research model for comprehensive research"""
        if not perplexity_api_key:
            return {'error': 'Perplexity API key not configured'}
        
        if not query:
            return {'error': 'Query parameter is required but was empty'}
        
        try:
            async with httpx.AsyncClient() as http_client:
                headers = {
                    'Authorization': f'Bearer {perplexity_api_key}',
                    'Content-Type': 'application/json'
                }
                
                payload = {
                    'model': 'sonar-deep-research',
                    'messages': [
                        {'role': 'system', 'content': 'You are a research assistant. Conduct thorough research and provide comprehensive reports with citations.'},
                        {'role': 'user', 'content': query}
                    ],
                    'web_search_options': {
                        'search_context_size': 'high'
                    }
                }
                
                # Add structured output if requested
                if structured_output and json_schema:
                    payload['response_format'] = {
                        'type': 'json_schema',
                        'json_schema': {'schema': json_schema}
                    }
                
                # Add search filters if provided
                if search_domain_filter:
                    payload['search_domain_filter'] = search_domain_filter
                if search_recency_filter:
                    payload['search_recency_filter'] = search_recency_filter
                
                response = await http_client.post(
                    'https://api.perplexity.ai/chat/completions',
                    headers=headers,
                    json=payload,
                    timeout=120.0  # Deep research takes longer
                )
                response.raise_for_status()
                result = response.json()
                
                # Parse the response and extract structured data if needed
                parsed_result = SonarTool._parse_sonar_response(result, structured_output)
                
                return {
                    'success': True,
                    'model': 'sonar-deep-research',
                    'structured_output': structured_output,
                    **parsed_result
                }
                
        except httpx.ConnectError:
            logger.error("Cannot connect to Perplexity API")
            return {'error': 'Cannot connect to Perplexity API'}
        except httpx.TimeoutException:
            logger.error("Perplexity API request timed out")
            return {'error': 'Perplexity API request timed out'}
        except Exception as e:
            logger.error(f"Failed to call Sonar Deep Research: {e}")
            return {'error': str(e)}
    
    @staticmethod
    def _parse_sonar_response(response: Dict[str, Any], structured_output: bool) -> Dict[str, Any]:
        """Parse Sonar API response and extract content, citations, and structured data"""
        parsed = {
            'content': '',
            'citations': [],
            'reasoning': '',
            'structured_data': None,
            'token_usage': {}
        }
        
        try:
            # Extract main content
            if 'choices' in response and response['choices']:
                choice = response['choices'][0]
                content = choice.get('message', {}).get('content', '')
                
                if structured_output:
                    # For reasoning models, extract structured JSON from content
                    # The content includes <think> sections followed by JSON
                    thinking_pattern = r'<think>(.*?)</think>'
                    json_pattern = r'(\{.*\})'
                    
                    thinking_match = re.search(thinking_pattern, content, re.DOTALL)
                    if thinking_match:
                        parsed['reasoning'] = thinking_match.group(1).strip()
                        # Remove thinking section to get the JSON
                        content = re.sub(thinking_pattern, '', content, flags=re.DOTALL).strip()
                    
                    # Try to parse remaining content as JSON
                    try:
                        # First try to find a JSON object in the content
                        json_match = re.search(json_pattern, content, re.DOTALL)
                        if json_match:
                            # Unescape the JSON string before parsing
                            json_str = json_match.group(1).replace('\\"', '"').replace('\\n', '\n')
                            parsed['structured_data'] = json.loads(json_str)
                            parsed['content'] = json.dumps(parsed['structured_data'], indent=2)
                        else:
                            # Fallback: try to parse entire content as JSON
                            # Clean up escaped quotes
                            cleaned_content = content.replace('\\"', '"').replace('\\n', '\n')
                            parsed['structured_data'] = json.loads(cleaned_content)
                            parsed['content'] = json.dumps(parsed['structured_data'], indent=2)
                    except json.JSONDecodeError as e:
                        # If JSON parsing fails, use raw content
                        parsed['content'] = content
                        logger.warning(f"Failed to parse structured output as JSON: {e}")
                else:
                    parsed['content'] = content
            
            # Extract token usage
            if 'usage' in response:
                usage = response['usage']
                parsed['token_usage'] = {
                    'input_tokens': usage.get('input_tokens', 0),
                    'output_tokens': usage.get('output_tokens', 0),
                    'total_tokens': usage.get('total_tokens', 0)
                }
            
            # Extract citations (Perplexity includes these in various formats)
            # This is a simplified extraction - real implementation may need more sophistication
            citations = []
            content_text = parsed['content']
            
            # Look for common citation patterns
            citation_patterns = [
                r'\[(\d+)\]',  # [1], [2], etc.
                r'\((\d+)\)',  # (1), (2), etc.
                r'Source: (.+?)(?:\n|$)',  # Source: ...
                r'References?:\s*(.+?)(?:\n\n|$)'  # References: ...
            ]
            
            for pattern in citation_patterns:
                matches = re.findall(pattern, content_text)
                for match in matches:
                    if match not in citations:
                        citations.append(match)
            
            parsed['citations'] = citations
            
        except Exception as e:
            logger.error(f"Error parsing Sonar response: {e}")
            parsed['content'] = str(response)  # Fallback to raw response
        
        return parsed

# Define tools for Claude using proper Anthropic SDK types in hierarchical order

# TIER 1: Native WebSearch - Primary research tool
# Use dict format with explicit type so Anthropic recognizes native search
NATIVE_SEARCH_TOOLS = [
    {
        "type": "web_search_20250305",
        "name": "web_search",
        "max_uses": 15
    }
]

# TIER 2: Specialized Research Tools - Use after native search for deeper analysis
RESEARCH_TOOLS = [
    {
        "type": "custom",
        "name": "searchPubMed",
        "description": " Search PubMed for articles matching a query. Returns a list of PubMed IDs (PMIDs) that can be used with other tools.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query using PubMed syntax (e.g., 'cancer AND treatment', 'Smith J[Author]', 'Nature[Journal]')"
                },
                "retmax": {
                    "type": "number",
                    "description": "Maximum number of PMIDs to return (default: 20, max: 10000)"
                },
                "retstart": {
                    "type": "number",
                    "description": "Sequential index of first PMID to retrieve (default: 0)"
                },
                "sort": {
                    "type": "string",
                    "description": "Sort order: 'relevance', 'pub_date', 'Author', 'JournalName' (default: relevance)"
                },
                "datetype": {
                    "type": "string",
                    "description": "Date field to limit by: 'pdat' (publication date), 'edat' (Entrez date)"
                },
                "mindate": {
                    "type": "string",
                    "description": "Minimum date in format YYYY/MM/DD"
                },
                "maxdate": {
                    "type": "string",
                    "description": "Maximum date in format YYYY/MM/DD"
                }
            },
            "required": [
                "query"
            ]
        }
    },
    {
        "type": "custom",
        "name": "searchDrugLabel",
        "description": "Search for a drug by name and get its detailed label information. Returns all available fields from the FDA drug label database. ",
        "input_schema": {
            "type": "object",
            "properties": {
                "drugName": {
                    "type": "string",
                    "description": "Name of the drug to look up (brand name or generic name)"
                },
                "fields": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    },
                    "description": "Optional specific fields to retrieve from the drug label. If not provided, returns all fields."
                }
            },
            "required": [
                "drugName"
            ]
        }
    },
    BetaToolParam(
        name="sonar_reasoning_pro",
        description="[TIER 2] Use after native web search when you need complex reasoning with citations. Provides detailed chain of thought reasoning with web search. Use when native search results need deeper analysis or reasoning.",
        input_schema={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The question or research query to process with reasoning"
                },
                "structured_output": {
                    "type": "boolean",
                    "description": "Whether to return structured JSON output (default: False)",
                    "default": False
                },
                "json_schema": {
                    "type": "object",
                    "description": "JSON schema for structured output (required if structured_output is True)",
                    "default": None
                },
                "search_domain_filter": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of domains to include/exclude (prefix with - to exclude)",
                    "default": None
                },
                "search_recency_filter": {
                    "type": "string", 
                    "enum": ["month", "week", "day", "hour"],
                    "description": "Filter for how recent sources should be",
                    "default": None
                }
            },
            "required": ["query"]
        }
    ),
    BetaToolParam(
        name="sonar_reasoning_pro_structured",
        description="[TIER 2] Use after native web search when you need structured JSON output with reasoning. Same as sonar_reasoning_pro but returns data in specified JSON schema format.",
        input_schema={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The question or research query to process"
                },
                "json_schema": {
                    "type": "object",
                    "description": "JSON schema defining the expected output structure",
                    "properties": {
                        "type": {"type": "string", "enum": ["object"]},
                        "properties": {"type": "object"},
                        "required": {"type": "array", "items": {"type": "string"}}
                    },
                    "required": ["type", "properties"]
                },
                "search_domain_filter": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of domains to include/exclude (prefix with - to exclude)",
                    "default": None
                },
                "search_recency_filter": {
                    "type": "string",
                    "enum": ["month", "week", "day", "hour"],
                    "description": "Filter for how recent sources should be",
                    "default": None
                }
            },
            "required": ["query", "json_schema"]
        }
    ),
    BetaToolParam(
        name="sonar_deep_research",
        description="[TIER 3] Use only after native search and reasoning tools when you need comprehensive, multi-step research. This model autonomously searches multiple sources for detailed reports. Only use for complex research requiring extensive investigation.",
        input_schema={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The research topic or question for comprehensive investigation"
                },
                "structured_output": {
                    "type": "boolean",
                    "description": "Whether to return structured JSON output (default: False)",
                    "default": False
                },
                "json_schema": {
                    "type": "object",
                    "description": "JSON schema for structured output (required if structured_output is True)",
                    "default": None
                },
                "search_domain_filter": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of domains to include/exclude (prefix with - to exclude)",
                    "default": None
                },
                "search_recency_filter": {
                    "type": "string",
                    "enum": ["month", "week", "day", "hour"],
                    "description": "Filter for how recent sources should be",
                    "default": None
                }
            },
            "required": ["query"]
        }
    ),
    BetaToolParam(
        name="sonar_deep_research_structured",
        description="[TIER 3] Use only after native search and reasoning tools when you need comprehensive research with structured JSON output. Same as sonar_deep_research but returns data in specified schema format.",
        input_schema={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The research topic for comprehensive investigation"
                },
                "json_schema": {
                    "type": "object",
                    "description": "JSON schema defining the expected output structure",
                    "properties": {
                        "type": {"type": "string", "enum": ["object"]},
                        "properties": {"type": "object"},
                        "required": {"type": "array", "items": {"type": "string"}}
                    },
                    "required": ["type", "properties"]
                },
                "search_domain_filter": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of domains to include/exclude (prefix with - to exclude)",
                    "default": None
                },
                "search_recency_filter": {
                    "type": "string",
                    "enum": ["month", "week", "day", "hour"],
                    "description": "Filter for how recent sources should be",
                    "default": None
                }
            },
            "required": ["query", "json_schema"]
        }
    ),
    {
        "type": "custom",
        "name": "search_nppes",
        "description": "Search NPPES NPI Registry for providers",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "specialty": {"type": "string"},
                "zip_code": {"type": "string"},
                "npi": {"type": "string"},
                "limit": {"type": "integer", "default": 10}
            }
        }
    },
    {
        "type": "custom",
        "name": "geocode_address",
        "description": "Geocode an address using Google Maps",
        "input_schema": {"type": "object", "properties": {"address": {"type": "string"}}, "required": ["address"]}
    },
    {
        "type": "custom",
        "name": "get_directions",
        "description": "Get directions using Google Maps",
        "input_schema": {"type": "object", "properties": {"origin": {"type": "string"}, "destination": {"type": "string"}, "mode": {"type": "string", "default": "driving"}}, "required": ["origin", "destination"]}
    }
]

# TIER 3: Educational Content Tools - Use for creating educational materials and curricula
EDUCATIONAL_TOOLS: List[BetaToolParam] = [
    BetaToolParam(
        name="generate_educational_content",
        description="[TIER 3] Generate comprehensive educational content including lessons, tutorials, and learning materials. Use after research phase to create structured educational content.",
        input_schema={
            "type": "object",
            "properties": {
                "content_type": {
                    "type": "string",
                    "enum": ["lesson", "tutorial", "workshop", "lecture", "study_guide", "interactive_demo"],
                    "description": "Type of educational content to generate"
                },
                "subject": {
                    "type": "string",
                    "description": "Subject area for the educational content"
                },
                "learning_level": {
                    "type": "string",
                    "enum": ["beginner", "intermediate", "advanced", "expert"],
                    "description": "Target audience learning level"
                },
                "duration": {
                    "type": "string",
                    "description": "Expected completion time (e.g., '30 minutes', '2 hours')"
                },
                "learning_objectives": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Specific learning outcomes to achieve"
                },
                "prerequisites": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Required prior knowledge or skills"
                },
                "additional_context": {
                    "type": "string",
                    "description": "Additional requirements or constraints"
                }
            },
            "required": ["content_type", "subject", "learning_level", "duration", "learning_objectives"]
        }
    ),
    BetaToolParam(
        name="create_assessment",
        description="[TIER 3] Create comprehensive assessments including quizzes, tests, and rubrics. Use to evaluate learning progress and outcomes.",
        input_schema={
            "type": "object",
            "properties": {
                "assessment_type": {
                    "type": "string",
                    "enum": ["quiz", "test", "project_rubric", "peer_assessment", "self_assessment", "practical_exam"],
                    "description": "Type of assessment to create"
                },
                "subject": {
                    "type": "string",
                    "description": "Subject area for assessment"
                },
                "learning_objectives": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Learning objectives to assess"
                },
                "question_types": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "enum": ["multiple_choice", "true_false", "short_answer", "essay", "practical", "case_study"]
                    },
                    "description": "Types of questions to include"
                },
                "difficulty_level": {
                    "type": "string",
                    "enum": ["beginner", "intermediate", "advanced"],
                    "description": "Assessment difficulty level"
                },
                "duration": {
                    "type": "string",
                    "description": "Expected completion time"
                },
                "number_of_questions": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 100,
                    "description": "Number of questions to generate"
                }
            },
            "required": ["assessment_type", "subject", "learning_objectives", "difficulty_level"]
        }
    ),
    BetaToolParam(
        name="design_curriculum",
        description="[TIER 3] Design comprehensive curricula and course structures. Use for creating structured learning programs with multiple modules.",
        input_schema={
            "type": "object",
            "properties": {
                "course_title": {
                    "type": "string",
                    "description": "Title of the course or curriculum"
                },
                "duration": {
                    "type": "string",
                    "description": "Total course duration (e.g., '8 weeks', '3 months')"
                },
                "learning_level": {
                    "type": "string",
                    "enum": ["beginner", "intermediate", "advanced", "mixed"],
                    "description": "Target audience level"
                },
                "modules": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "duration": {"type": "string"},
                            "objectives": {"type": "array", "items": {"type": "string"}},
                            "topics": {"type": "array", "items": {"type": "string"}}
                        },
                        "required": ["title", "objectives"]
                    },
                    "description": "Module specifications for the curriculum"
                },
                "assessment_strategy": {
                    "type": "string",
                    "description": "Overall assessment approach for the curriculum"
                },
                "additional_context": {
                    "type": "string",
                    "description": "Additional requirements or constraints"
                }
            },
            "required": ["course_title", "duration", "learning_level", "modules", "assessment_strategy"]
        }
    ),
    BetaToolParam(
        name="create_interactive_content",
        description="[TIER 3] Generate interactive educational content like simulations, demonstrations, and hands-on activities.",
        input_schema={
            "type": "object",
            "properties": {
                "content_type": {
                    "type": "string",
                    "enum": ["simulation", "interactive_demo", "hands_on_activity", "coding_exercise", "case_study", "role_play"],
                    "description": "Type of interactive content to create"
                },
                "subject": {
                    "type": "string",
                    "description": "Subject area for the interactive content"
                },
                "learning_objectives": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Specific learning objectives to address"
                },
                "difficulty_level": {
                    "type": "string",
                    "enum": ["beginner", "intermediate", "advanced"],
                    "description": "Content difficulty level"
                },
                "duration": {
                    "type": "string",
                    "description": "Expected completion time"
                },
                "technology_requirements": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Required tools or technologies"
                },
                "group_size": {
                    "type": "string",
                    "enum": ["individual", "pair", "small_group", "large_group"],
                    "description": "Recommended group size for the activity"
                }
            },
            "required": ["content_type", "subject", "learning_objectives", "difficulty_level"]
        }
    )
]

# TIER 4: Action Tools - Use ONLY when you need to take specific actions (forms, purchases, etc.)
ACTION_TOOLS: List[BetaToolParam] = [
    BetaToolParam(
        name="start_browser_agent",
        description="[TIER 4 - ACTION ONLY] Use ONLY after research is complete and you need to take action. Start browser automation for filling forms, making purchases, clicking buttons, or submitting applications. NOT for research - use search tools first.",
        input_schema={
            "type": "object",
            "properties": {
                "instructions": {
                    "type": "string",
                    "description": "Detailed step-by-step instructions for the browser agent. Example: 'Navigate to google.com and search for Python tutorials'"
                }
            },
            "required": ["instructions"]
        }
    ),
    BetaToolParam(
        name="get_browser_agent_status", 
        description="[TIER 4 - ACTION SUPPORT] Check the status and results of an active browser automation session. Use to monitor ongoing actions.",
        input_schema={
            "type": "object",
            "properties": {
                "session_id": {
                    "type": "string",
                    "description": "The session ID of the browser agent to check"
                }
            },
            "required": ["session_id"]
        }
    ),
    BetaToolParam(
        name="stop_browser_agent",
        description="[TIER 4 - ACTION SUPPORT] Stop a running browser automation session when actions are complete.",
        input_schema={
            "type": "object", 
            "properties": {
                "session_id": {
                    "type": "string",
                    "description": "The session ID of the browser agent to stop"
                }
            },
            "required": ["session_id"]
        }
    )
]

async def execute_tool(tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
    """Execute native search, research, and action tools in hierarchical order"""
    try:
        # Native web_search is handled server-side by Anthropic; no local execution needed
        # Research tools (E-Utils and FDA)
        if tool_name == "searchPubMed":
            if "query" not in tool_input:
                return {"error": "Missing 'query' parameter"}
            return await PubMedTool.search_pubmed(
                query=tool_input["query"],
                retmax=tool_input.get("retmax", 20)
            )
        
        elif tool_name == "searchDrugLabel":
            if "drugName" not in tool_input:
                return {"error": "Missing 'drugName' parameter"}
            return await FDATool.search_fda_drugs(
                drug_name=tool_input["drugName"],
                limit=10
            )
        
        # Action tools (browser automation)
        elif tool_name in ["start_browser_agent", "get_browser_agent_status", "stop_browser_agent"]:
            browser_tool = BrowserUseTool()
            
            if tool_name == "start_browser_agent":
                if "instructions" not in tool_input or not tool_input.get("instructions"):
                    logger.error(f"Missing or empty 'instructions' in tool_input: {tool_input}")
                    return {"error": "Missing 'instructions' parameter. Please provide detailed instructions for what the browser should do."}
                return await browser_tool.start_browser_agent(tool_input["instructions"])
            elif tool_name == "get_browser_agent_status":
                if "session_id" not in tool_input:
                    return {"error": "Missing 'session_id' parameter"}
                return await browser_tool.get_browser_agent_status(tool_input["session_id"])
            elif tool_name == "stop_browser_agent":
                if "session_id" not in tool_input:
                    return {"error": "Missing 'session_id' parameter"}
                return await browser_tool.stop_browser_agent(tool_input["session_id"])
        
        # Sonar tools
        elif tool_name in ["sonar_reasoning_pro", "sonar_reasoning_pro_structured", "sonar_deep_research", "sonar_deep_research_structured"]:
            if "query" not in tool_input or not tool_input.get("query"):
                return {"error": "Missing 'query' parameter"}
            
            query = tool_input["query"]
            search_domain_filter = tool_input.get("search_domain_filter")
            search_recency_filter = tool_input.get("search_recency_filter")
            
            if tool_name == "sonar_reasoning_pro":
                structured_output = tool_input.get("structured_output", False)
                json_schema = tool_input.get("json_schema")
                return await SonarTool.call_sonar_reasoning_pro(
                    query=query,
                    structured_output=structured_output,
                    json_schema=json_schema,
                    search_domain_filter=search_domain_filter,
                    search_recency_filter=search_recency_filter
                )
            elif tool_name == "sonar_reasoning_pro_structured":
                if "json_schema" not in tool_input:
                    return {"error": "Missing 'json_schema' parameter for structured output"}
                return await SonarTool.call_sonar_reasoning_pro(
                    query=query,
                    structured_output=True,
                    json_schema=tool_input["json_schema"],
                    search_domain_filter=search_domain_filter,
                    search_recency_filter=search_recency_filter
                )
            elif tool_name == "sonar_deep_research":
                structured_output = tool_input.get("structured_output", False)
                json_schema = tool_input.get("json_schema")
                return await SonarTool.call_sonar_deep_research(
                    query=query,
                    structured_output=structured_output,
                    json_schema=json_schema,
                    search_domain_filter=search_domain_filter,
                    search_recency_filter=search_recency_filter
                )
            elif tool_name == "sonar_deep_research_structured":
                if "json_schema" not in tool_input:
                    return {"error": "Missing 'json_schema' parameter for structured output"}
                return await SonarTool.call_sonar_deep_research(
                    query=query,
                    structured_output=True,
                    json_schema=tool_input["json_schema"],
                    search_domain_filter=search_domain_filter,
                    search_recency_filter=search_recency_filter
                )
        
        # Educational content tools
        elif tool_name in ["generate_educational_content", "create_assessment", "design_curriculum", "create_interactive_content"]:
            return await execute_educational_tool(tool_name, tool_input)
        
        else:
            return {"error": f"Unknown tool: {tool_name}"}
            
    except Exception as e:
        logger.error(f"Error executing tool {tool_name}: {e}", exc_info=True)
        return {"error": f"Tool execution failed: {str(e)}"}

    # Pyright safety: fallback (should never be reached)
    return {"error": "Unhandled tool execution path"}

async def execute_educational_tool(tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
    """Execute educational content generation tools"""
    try:
        from .prompts.educationalContent import create_educational_content_message, create_curriculum_message
        
        if tool_name == "generate_educational_content":
            # Validate required parameters
            required_params = ["content_type", "subject", "learning_level", "duration", "learning_objectives"]
            for param in required_params:
                if param not in tool_input:
                    return {"error": f"Missing required parameter: {param}"}
            
            # Create educational content message
            message_config = create_educational_content_message(
                content_type=tool_input["content_type"],
                subject=tool_input["subject"],
                learning_level=tool_input["learning_level"],
                duration=tool_input["duration"],
                learning_objectives=tool_input["learning_objectives"],
                prerequisites=tool_input.get("prerequisites"),
                additional_context=tool_input.get("additional_context")
            )
            
            # Execute with Claude using streaming for large content
            message_config['stream'] = True
            stream = client.beta.messages.create(**message_config)
            
            # Collect the full response from stream
            full_content = ""
            for event in stream:
                if event.type == 'content_block_delta' and hasattr(event, 'delta') and event.delta.type == 'text_delta':
                    full_content += event.delta.text
            return {
                "tool_name": tool_name,
                "content_type": tool_input["content_type"],
                "subject": tool_input["subject"],
                "learning_level": tool_input["learning_level"],
                "educational_content": full_content,
                "token_usage": {
                    "input_tokens": 0,  # Streaming doesn't provide usage info
                    "output_tokens": 0,
                    "thinking_tokens": 0
                }
            }
        
        elif tool_name == "create_assessment":
            # Validate required parameters
            required_params = ["assessment_type", "subject", "learning_objectives", "difficulty_level"]
            for param in required_params:
                if param not in tool_input:
                    return {"error": f"Missing required parameter: {param}"}
            
            # Create assessment using educational content generation
            assessment_objectives = tool_input["learning_objectives"]
            question_types = tool_input.get("question_types", ["multiple_choice", "short_answer"])
            
            message_config = create_educational_content_message(
                content_type="assessment",
                subject=tool_input["subject"],
                learning_level=tool_input["difficulty_level"],
                duration=tool_input.get("duration", "45 minutes"),
                learning_objectives=assessment_objectives,
                additional_context=f"Create a {tool_input['assessment_type']} with {tool_input.get('number_of_questions', 10)} questions. Question types: {', '.join(question_types)}"
            )
            
            message_config['stream'] = True
            stream = client.beta.messages.create(**message_config)
            
            # Collect the full response from stream
            full_content = ""
            for event in stream:
                if event.type == 'content_block_delta' and hasattr(event, 'delta') and event.delta.type == 'text_delta':
                    full_content += event.delta.text
            
            return {
                "tool_name": tool_name,
                "assessment_type": tool_input["assessment_type"],
                "subject": tool_input["subject"],
                "difficulty_level": tool_input["difficulty_level"],
                "assessment_content": full_content,
                "token_usage": {
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "thinking_tokens": 0
                }
            }
        
        elif tool_name == "design_curriculum":
            # Validate required parameters
            required_params = ["course_title", "duration", "learning_level", "modules", "assessment_strategy"]
            for param in required_params:
                if param not in tool_input:
                    return {"error": f"Missing required parameter: {param}"}
            
            # Create curriculum message
            message_config = create_curriculum_message(
                course_title=tool_input["course_title"],
                duration=tool_input["duration"],
                learning_level=tool_input["learning_level"],
                modules=tool_input["modules"],
                assessment_strategy=tool_input["assessment_strategy"],
                additional_context=tool_input.get("additional_context")
            )
            
            message_config['stream'] = True
            stream = client.beta.messages.create(**message_config)
            
            # Collect the full response from stream
            full_content = ""
            for event in stream:
                if event.type == 'content_block_delta' and hasattr(event, 'delta') and event.delta.type == 'text_delta':
                    full_content += event.delta.text
            
            return {
                "tool_name": tool_name,
                "course_title": tool_input["course_title"],
                "duration": tool_input["duration"],
                "learning_level": tool_input["learning_level"],
                "curriculum_content": full_content,
                "token_usage": {
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "thinking_tokens": 0
                }
            }
        
        elif tool_name == "create_interactive_content":
            # Validate required parameters
            required_params = ["content_type", "subject", "learning_objectives", "difficulty_level"]
            for param in required_params:
                if param not in tool_input:
                    return {"error": f"Missing required parameter: {param}"}
            
            # Create interactive content
            interactive_context = f"Create an interactive {tool_input['content_type']} activity."
            if tool_input.get("technology_requirements"):
                interactive_context += f" Technology requirements: {', '.join(tool_input['technology_requirements'])}"
            if tool_input.get("group_size"):
                interactive_context += f" Group size: {tool_input['group_size']}"
            
            message_config = create_educational_content_message(
                content_type="interactive_demo",
                subject=tool_input["subject"],
                learning_level=tool_input["difficulty_level"],
                duration=tool_input.get("duration", "60 minutes"),
                learning_objectives=tool_input["learning_objectives"],
                additional_context=interactive_context
            )
            
            message_config['stream'] = True
            stream = client.beta.messages.create(**message_config)
            
            # Collect the full response from stream
            full_content = ""
            for event in stream:
                if event.type == 'content_block_delta' and hasattr(event, 'delta') and event.delta.type == 'text_delta':
                    full_content += event.delta.text
            
            return {
                "tool_name": tool_name,
                "content_type": tool_input["content_type"],
                "subject": tool_input["subject"],
                "difficulty_level": tool_input["difficulty_level"],
                "interactive_content": full_content,
                "token_usage": {
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "thinking_tokens": 0
                }
            }
        
        else:
            return {"error": f"Unknown educational tool: {tool_name}"}
    
    except Exception as e:
        logger.error(f"Error executing educational tool {tool_name}: {e}", exc_info=True)
        return {"error": f"Educational tool execution failed: {str(e)}"}

# pyright: ignore[reportGeneralTypeIssues]
@app.post("/api/claude/chat")
async def claude_chat(
    message: str = Body(..., embed=True),
    conversation_history: List[Dict[str, Any]] = Body(default_factory=list, embed=True),
    enable_thinking: bool = Body(default=True, embed=True),
    thinking_budget: int = Body(default=10000, embed=True),
    max_output_tokens: int = Body(default=30000, embed=True),
    enable_browser_use: bool = Body(default=False, embed=True),
    enable_sonar_tools: bool = Body(default=False, embed=True),
    deep_research_mode: bool = Body(default=False, embed=True),
    enable_educational_tools: bool = Body(default=False, embed=True)
):
    """Main Claude chat endpoint with extended thinking and interleaved tool use"""
    
    logger.info(f"Received request with parameters: enable_browser_use={enable_browser_use}, enable_sonar_tools={enable_sonar_tools}, deep_research_mode={deep_research_mode}, message='{message[:100]}...'")
    
    try:
        # Build message history
        messages = []
        thinking_blocks = []
        
        for msg in conversation_history:
            # Deep-copy and strip any stale signature fields in thinking blocks
            msg_copy = msg.copy()
            
            # Handle assistant messages that might contain thinking blocks
            if msg_copy.get("role") == "assistant":
                content = msg_copy.get("content")
                
                # Handle object format from frontend {text: ..., thinking: ..., tool_calls: [], tool_results: []}
                if isinstance(content, dict) and not content.get("type"):
                    content_blocks = []
                    
                    # Add thinking blocks first if they exist
                    if content.get("thinking") and isinstance(content["thinking"], list):
                        for thinking_block in content["thinking"]:
                            if isinstance(thinking_block, dict) and thinking_block.get("type") == "thinking":
                                thinking_obj = {
                                    "type": "thinking",
                                    "thinking": thinking_block.get("thinking", "")
                                }
                                # Include signature if it exists
                                if "signature" in thinking_block:
                                    thinking_obj["signature"] = thinking_block["signature"]
                                content_blocks.append(thinking_obj)
                                thinking_blocks.append(thinking_obj)
                    
                    # Add text content if it exists
                    if content.get("text"):
                        content_blocks.append({
                            "type": "text",
                            "text": content["text"]
                        })
                    
                    # Handle tool calls and tool results if they exist
                    if content.get("tool_calls"):
                        for tool_call in content["tool_calls"]:
                            content_blocks.append(tool_call)
                    
                    if content.get("tool_results"):
                        for tool_result in content["tool_results"]:
                            content_blocks.append(tool_result)
                    
                    msg_copy["content"] = content_blocks
                
                # Handle list format (existing logic)
                elif isinstance(content, list):
                    content_blocks = []
                    for block in content:
                        if isinstance(block, dict):
                            # Preserve thinking blocks with their signature
                            if block.get("type") == "thinking":
                                # Make sure we have all required fields for thinking blocks
                                thinking_block = {
                                    "type": "thinking",
                                    "thinking": block.get("thinking", "")
                                }
                                # CRITICAL: Include signature if it exists
                                if "signature" in block:
                                    thinking_block["signature"] = block["signature"]
                                content_blocks.append(thinking_block)
                                thinking_blocks.append(thinking_block)
                            elif block.get("type") == "text":
                                content_blocks.append(block)
                            else:
                                # Other block types (tool_use, etc.)
                                content_blocks.append(block)
                        else:
                            # String content
                            content_blocks.append({"type": "text", "text": str(block)})
                    
                    msg_copy["content"] = content_blocks
                
                # Handle string format - convert to list with text block
                elif isinstance(content, str):
                    msg_copy["content"] = [{"type": "text", "text": content}]
            
            messages.append(msg_copy)
        
        # Add the new user message
        messages.append({
            "role": "user", 
            "content": message
        })
        
        # Add system context for enabled tools
        tool_context_messages = []
        
        # Add hierarchical tool usage guidance
        tool_context_messages.append("""HIERARCHICAL TOOL USAGE PROTOCOL:

You have access to tools organized in a strict hierarchy. ALWAYS follow this order:

TIER 1 - Native Web Search (ALWAYS USE FIRST):
- web_search: Your native web search capability - start here for all research

TIER 2 - Specialized Research (USE AFTER WEB SEARCH):
- sonar_reasoning_pro: For complex reasoning with citations 
- sonar_deep_research: For comprehensive multi-step research reports

TIER 3 - Action Tools (USE ONLY FOR ACTIONS, NOT RESEARCH):
- Browser agents: ONLY for filling forms, making purchases, clicking buttons
- NOT for research - research comes first using search tools

CRITICAL RULES:
1. ALWAYS start with native web_search for any information gathering
2. Use Sonar tools only if native search needs deeper analysis  
3. Use browser agents ONLY after research is complete and you need to take action
4. Browser agents are NOT researchers - they are action executors""")
        
        if enable_browser_use:
            tool_context_messages.append("""TIER 4 ACTION TOOLS - Browser Automation:

Browser tools are for ACTIONS ONLY after research is complete:
- start_browser_agent: Execute actions like filling forms, making purchases, clicking buttons
- get_browser_agent_status: Check progress of ongoing actions
- stop_browser_agent: Stop automation when actions complete

IMPORTANT: 
- Use browser agents ONLY after research phase is complete
- Check status periodically with get_browser_agent_status
- Browser agents have their own reasoning that you'll see in status updates
- Coordinate your responses with their thinking and progress""")
        
        if enable_sonar_tools:
            tool_context_messages.append("""TIER 2-3 RESEARCH TOOLS - Sonar (Use AFTER native web search):

Use these only when native web_search results need deeper analysis:

TIER 2 - Reasoning Tools:
- sonar_reasoning_pro: Complex reasoning with citations (use after web_search)
- sonar_reasoning_pro_structured: Same with JSON output

TIER 3 - Deep Research Tools:
- sonar_deep_research: Comprehensive multi-step research (only for complex topics)
- sonar_deep_research_structured: Same with JSON output

REMEMBER: Start with native web_search first, then use these if needed.""")
        
        if tool_context_messages:
            # Prepend system message with tool guidance
            combined_context = "\n\n".join(tool_context_messages)
            messages.insert(0, {
                "role": "user", 
                "content": combined_context
            })
        
        # Prepare thinking configuration
        thinking_config: Union[BetaThinkingConfigEnabledParam, None] = None
        extra_headers = {}
        betas = []
        
        if enable_thinking:
            # Use higher thinking budget for deep research mode
            actual_thinking_budget = thinking_budget if not deep_research_mode else thinking_budget * 2
            thinking_config = BetaThinkingConfigEnabledParam(
                type="enabled",
                budget_tokens=actual_thinking_budget
            )
            # Enable interleaved thinking for tool use
            betas.append("interleaved-thinking-2025-05-14")
            # Add fine-grained tool streaming if needed
            betas.append("fine-grained-tool-streaming-2025-05-14")
            # Add native web search beta
            betas.append("web-search-2025-03-05")
        
            # Prepare tools list in hierarchical order
            available_tools = []
            # Always include native search (Tier 1)
            available_tools.extend(NATIVE_SEARCH_TOOLS)
            # Add research tools (Tier 2-3)
            if enable_sonar_tools:
                available_tools.extend(RESEARCH_TOOLS)
            # Add educational tools (Tier 3)
            if enable_educational_tools:
                available_tools.extend(EDUCATIONAL_TOOLS)
            # Add action tools (Tier 4) 
            if enable_browser_use:
                available_tools.extend(ACTION_TOOLS)
            
            # Make initial request to Claude using beta client with streaming
            stream = client.beta.messages.create(
                model="claude-4-sonnet-20250514",
                max_tokens=max_output_tokens,
                tools=available_tools,
                messages=messages,
                thinking=thinking_config if thinking_config else NOT_GIVEN,
                betas=betas,
                stream=True
            )
        else:
            # Prepare tools list in hierarchical order (non-thinking mode)
            available_tools = []
            # Always include native search (Tier 1)
            available_tools.extend(NATIVE_SEARCH_TOOLS)
            # Add research tools (Tier 2-3)
            if enable_sonar_tools:
                available_tools.extend(RESEARCH_TOOLS)
            # Add educational tools (Tier 3)
            if enable_educational_tools:
                available_tools.extend(EDUCATIONAL_TOOLS)
            # Add action tools (Tier 4)
            if enable_browser_use:
                available_tools.extend(ACTION_TOOLS)
            
            # Non-thinking mode still needs beta client for proper tool support
            stream = client.beta.messages.create(
                model="claude-4-sonnet-20250514",
                max_tokens=max_output_tokens,
                tools=available_tools,
                messages=messages,
                betas=["fine-grained-tool-streaming-2025-05-14", "web-search-2025-03-05"],
                stream=True
            )
        
        # Collect the full response from stream with token tracking
        response_content = []
        response_stop_reason = None
        token_usage = {
            "input_tokens": 0,
            "output_tokens": 0,
            "thinking_tokens": 0,
            "cache_read_tokens": 0,
            "cache_creation_tokens": 0
        }
        
        for event in stream:
            if hasattr(event, 'type'):
                if event.type == 'content_block_start':
                    if hasattr(event, 'content_block'):
                        # Log tool use blocks to debug empty inputs
                        if event.content_block.type == 'tool_use':
                            logger.info(f"Tool block start: name={event.content_block.name}, has input={hasattr(event.content_block, 'input')}, input value={getattr(event.content_block, 'input', 'NO ATTR')}")
                        response_content.append(event.content_block)
                elif event.type == 'content_block_delta':
                    if hasattr(event, 'delta'):
                        # Update the last content block with delta
                        if response_content and hasattr(event.delta, 'type'):
                            if event.delta.type == 'thinking_delta' and hasattr(event.delta, 'thinking'):
                                if response_content[-1].type == 'thinking':
                                    response_content[-1].thinking += event.delta.thinking
                            elif event.delta.type == 'signature_delta' and hasattr(event.delta, 'signature'):
                                # Handle signature deltas for thinking blocks
                                if response_content[-1].type == 'thinking':
                                    if not hasattr(response_content[-1], 'signature'):
                                        response_content[-1].signature = ''
                                    response_content[-1].signature += event.delta.signature
                            elif event.delta.type == 'text_delta' and hasattr(event.delta, 'text'):
                                if response_content[-1].type == 'text':
                                    response_content[-1].text += event.delta.text
                            elif event.delta.type == 'input_json_delta' and hasattr(event.delta, 'partial_json'):
                                # Handle tool input streaming
                                if response_content[-1].type == 'tool_use':
                                    # Accumulate partial JSON for tool inputs
                                    if not hasattr(response_content[-1], '_partial_input'):
                                        response_content[-1]._partial_input = ''
                                    response_content[-1]._partial_input += event.delta.partial_json
                                    logger.debug(f"Tool input delta received: {event.delta.partial_json}")
                elif event.type == 'message_delta':
                    if hasattr(event, 'delta') and hasattr(event.delta, 'stop_reason'):
                        response_stop_reason = event.delta.stop_reason
                        # Handle new refusal stop reason
                        if response_stop_reason == 'refusal':
                            logger.warning("Claude refused to process the request for safety reasons")
                elif event.type == 'content_block_stop':
                    # Parse accumulated JSON for tool_use blocks
                    if response_content and response_content[-1].type == 'tool_use':
                        logger.info(f"Tool use block stop: {response_content[-1].name}")
                        if hasattr(response_content[-1], '_partial_input'):
                            try:
                                response_content[-1].input = json.loads(response_content[-1]._partial_input)
                                logger.info(f"Parsed tool input: {response_content[-1].input}")
                            except json.JSONDecodeError:
                                logger.error(f"Failed to parse tool input JSON: {response_content[-1]._partial_input}")
                                response_content[-1].input = {}
                        else:
                            logger.warning(f"Tool use block has no _partial_input attribute, using existing input: {getattr(response_content[-1], 'input', 'NO INPUT')}")
                            # If input is empty, try to extract from the tool name
                            if hasattr(response_content[-1], 'input') and not response_content[-1].input:
                                logger.error(f"Tool {response_content[-1].name} has empty input - this is a streaming API issue")
                elif event.type == 'usage':
                    # Capture token usage information
                    if hasattr(event, 'usage'):
                        token_usage["input_tokens"] = getattr(event.usage, 'input_tokens', 0)
                        token_usage["output_tokens"] = getattr(event.usage, 'output_tokens', 0)
                        token_usage["cache_read_tokens"] = getattr(event.usage, 'cache_read_input_tokens', 0)
                        token_usage["cache_creation_tokens"] = getattr(event.usage, 'cache_creation_input_tokens', 0)
        
        # Create a response-like object
        class StreamedResponse:
            def __init__(self, content, stop_reason, usage):
                self.content = content
                self.stop_reason = stop_reason
                self.usage = usage
        
        response = StreamedResponse(response_content, response_stop_reason, token_usage)
        
        # Extract content blocks and calculate thinking tokens
        response_thinking_blocks = []
        response_tool_use_blocks = []
        response_text_blocks = []
        response_web_search_blocks = []
        thinking_text_total = ""
        
        for block in response.content:
            if block.type == "thinking":
                thinking_text = getattr(block, 'thinking', '')
                thinking_text_total += thinking_text
                thinking_block = {
                    "type": "thinking",
                    "thinking": thinking_text
                }
                # CRITICAL: Include signature if it exists
                if hasattr(block, 'signature'):
                    thinking_block["signature"] = getattr(block, 'signature', '')
                response_thinking_blocks.append(thinking_block)
            elif block.type == "tool_use":
                logger.info(f"Tool use block: name={block.name}, input={block.input}")
                response_tool_use_blocks.append(block)
            elif block.type == "text":
                response_text_blocks.append({
                    "type": "text",
                    "text": block.text
                })
            elif hasattr(block, 'type') and ('web_search' in str(block.type) or block.type == 'web_search_tool_result'):
                # Handle native web search result blocks
                logger.info(f"Web search block detected: type={block.type}")
                web_search_block = {
                    "type": "web_search_result",
                    "block_type": str(block.type),
                    "results": getattr(block, 'content', None) or getattr(block, 'results', []),
                    "query": getattr(block, 'query', ''),
                    "tool_use_id": getattr(block, 'tool_use_id', '')
                }
                response_web_search_blocks.append(web_search_block)
            else:
                # Log unknown block types for debugging
                logger.info(f"Unknown content block type: {getattr(block, 'type', 'no_type')} - {type(block)}")
                # Treat as text block fallback
                if hasattr(block, 'text'):
                    response_text_blocks.append({
                        "type": "text", 
                        "text": block.text
                    })
        
        # Estimate thinking tokens (using standard approximation)
        # Claude typically uses ~4 chars per token for English text
        token_usage["thinking_tokens"] = int(len(thinking_text_total) / 4)
        
        # Handle tool use (supports multiple concurrent tool calls)
        browser_sessions = []  # Track browser sessions for frontend
        if response.stop_reason == "tool_use":
            logger.info(f"Tool use detected. Tools: {[t.name for t in response_tool_use_blocks]}")
            logger.info(f"Number of tool blocks: {len(response_tool_use_blocks)}")
            logger.info(f"Number of thinking blocks: {len(response_thinking_blocks)}")
            tool_results = []
            
            # Execute multiple tools concurrently
            if len(response_tool_use_blocks) > 1:
                # Run tools in parallel
                tool_tasks = []
                for tool_use in response_tool_use_blocks:
                    task = execute_tool(tool_use.name, tool_use.input)
                    tool_tasks.append((tool_use, task))
                
                # Wait for all tools to complete
                for tool_use, task in tool_tasks:
                    tool_result = await task
                    
                    # Track browser sessions
                    if tool_use.name == "start_browser_agent" and isinstance(tool_result, dict):
                        if 'session_id' in tool_result and 'browser_url' in tool_result:
                            browser_sessions.append({
                                'session_id': tool_result['session_id'],
                                'browser_url': tool_result['browser_url'],
                                'task': tool_result.get('task', '')
                            })
                    
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_use.id,
                        "content": json.dumps(tool_result)
                    })
            else:
                # Single tool execution
                for tool_use in response_tool_use_blocks:
                    logger.info(f"Executing tool: {tool_use.name} with input: {tool_use.input}")
                    logger.info(f"Tool input type: {type(tool_use.input)}, value: {tool_use.input}")
                    tool_result = await execute_tool(tool_use.name, tool_use.input)
                    
                    # Track browser sessions and add status checking
                    if tool_use.name == "start_browser_agent" and isinstance(tool_result, dict):
                        if 'session_id' in tool_result and 'browser_url' in tool_result:
                            browser_sessions.append({
                                'session_id': tool_result['session_id'],
                                'browser_url': tool_result['browser_url'],
                                'task': tool_result.get('task', '')
                            })
                            
                            # Automatically check status after starting browser agent
                            session_id = tool_result['session_id']
                            browser_tool_instance = BrowserUseTool()
                            status_result = await browser_tool_instance.get_browser_agent_status(session_id)
                            
                            # Add status info to tool result
                            tool_result['initial_status'] = status_result
                            
                            # Extract and format browser agent thinking if available
                            if isinstance(status_result, dict) and 'latest_thinking' in status_result:
                                thinking_data = status_result['latest_thinking']
                                if thinking_data and isinstance(thinking_data, dict):
                                    browser_thinking = []
                                    if thinking_data.get('thinking'):
                                        browser_thinking.append(f"🤖 Browser Agent Reasoning:\n{thinking_data['thinking']}")
                                    if thinking_data.get('next_goal'):
                                        browser_thinking.append(f"🎯 Current Goal:\n{thinking_data['next_goal']}")
                                    if thinking_data.get('evaluation'):
                                        browser_thinking.append(f"📊 Previous Step Evaluation:\n{thinking_data['evaluation']}")
                                    if thinking_data.get('memory'):
                                        browser_thinking.append(f"🧠 Memory:\n{thinking_data['memory']}")
                                    
                                    if browser_thinking:
                                        tool_result['browser_thinking'] = "\n\n".join(browser_thinking)
                                        tool_result['thinking_step'] = thinking_data.get('step_number', 0)
                    
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_use.id,
                        "content": json.dumps(tool_result)
                    })
            
            # Continue conversation with tool results
            # When thinking is enabled, must include thinking blocks
            assistant_content = []
            # Add thinking blocks first (required when thinking is enabled)
            if enable_thinking and response_thinking_blocks:
                assistant_content.extend(response_thinking_blocks)
            # Then add tool use blocks
            for tool_use in response_tool_use_blocks:
                assistant_content.append({
                    "type": "tool_use",
                    "id": tool_use.id,
                    "name": tool_use.name,
                    "input": tool_use.input
                })
            
            logger.info(f"Assistant content being sent: {[c['type'] for c in assistant_content]}")
            logger.info(f"Full assistant content: {json.dumps(assistant_content, indent=2)}")
            messages.append({
                "role": "assistant",
                "content": assistant_content
            })
            
            messages.append({
                "role": "user",
                "content": tool_results
            })
            
            # Prepare tools list for final response in hierarchical order
            final_tools = []
            # Always include native search (Tier 1)
            final_tools.extend(NATIVE_SEARCH_TOOLS)
            # Add research tools (Tier 2-3)
            if enable_sonar_tools:
                final_tools.extend(RESEARCH_TOOLS)
            # Add educational tools (Tier 3)
            if enable_educational_tools:
                final_tools.extend(EDUCATIONAL_TOOLS)
            # Add action tools (Tier 4)
            if enable_browser_use:
                final_tools.extend(ACTION_TOOLS)
            
            # Get final response from Claude
            # Keep thinking enabled for tool result responses to maintain consistency
            final_stream = client.beta.messages.create(
                model="claude-4-sonnet-20250514", 
                max_tokens=max_output_tokens,
                tools=final_tools,
                messages=messages,
                thinking=thinking_config if thinking_config else NOT_GIVEN,
                betas=betas,
                stream=True
            )
            
            # Collect final response from stream
            final_content = []
            final_stop_reason = None
            final_token_usage = {
                "input_tokens": 0,
                "output_tokens": 0,
                "thinking_tokens": 0,
                "cache_read_tokens": 0,
                "cache_creation_tokens": 0
            }
            
            for event in final_stream:
                if hasattr(event, 'type'):
                    if event.type == 'content_block_start':
                        if hasattr(event, 'content_block'):
                            final_content.append(event.content_block)
                    elif event.type == 'content_block_delta':
                        if hasattr(event, 'delta') and final_content:
                            if event.delta.type == 'thinking_delta' and hasattr(event.delta, 'thinking'):
                                if final_content[-1].type == 'thinking':
                                    final_content[-1].thinking += event.delta.thinking
                            elif event.delta.type == 'signature_delta' and hasattr(event.delta, 'signature'):
                                # Handle signature deltas for thinking blocks
                                if final_content[-1].type == 'thinking':
                                    if not hasattr(final_content[-1], 'signature'):
                                        final_content[-1].signature = ''
                                    final_content[-1].signature += event.delta.signature
                            elif event.delta.type == 'text_delta' and hasattr(event.delta, 'text'):
                                if final_content[-1].type == 'text':
                                    final_content[-1].text += event.delta.text
                    elif event.type == 'message_delta':
                        if hasattr(event, 'delta') and hasattr(event.delta, 'stop_reason'):
                            final_stop_reason = event.delta.stop_reason
                    elif event.type == 'usage':
                        if hasattr(event, 'usage'):
                            final_token_usage["input_tokens"] = getattr(event.usage, 'input_tokens', 0)
                            final_token_usage["output_tokens"] = getattr(event.usage, 'output_tokens', 0)
                            final_token_usage["cache_read_tokens"] = getattr(event.usage, 'cache_read_input_tokens', 0)
                            final_token_usage["cache_creation_tokens"] = getattr(event.usage, 'cache_creation_input_tokens', 0)
            
            # Extract final content
            final_thinking_blocks = []
            final_text = ""
            final_thinking_text = ""
            
            for block in final_content:
                if block.type == "thinking":
                    thinking_text = getattr(block, 'thinking', '')
                    final_thinking_text += thinking_text
                    thinking_block = {
                        "type": "thinking",
                        "thinking": thinking_text
                    }
                    # CRITICAL: Include signature if it exists
                    if hasattr(block, 'signature'):
                        thinking_block["signature"] = getattr(block, 'signature', '')
                    final_thinking_blocks.append(thinking_block)
                elif block.type == "text":
                    final_text += block.text
            
            # Update thinking tokens for final response
            final_token_usage["thinking_tokens"] = int(len(final_thinking_text) / 4)
            
            # Combine token usage from both requests
            total_usage = {
                "input_tokens": token_usage["input_tokens"] + final_token_usage["input_tokens"],
                "output_tokens": token_usage["output_tokens"] + final_token_usage["output_tokens"],
                "thinking_tokens": token_usage["thinking_tokens"] + final_token_usage["thinking_tokens"],
                "cache_read_tokens": token_usage["cache_read_tokens"] + final_token_usage["cache_read_tokens"],
                "cache_creation_tokens": token_usage["cache_creation_tokens"] + final_token_usage["cache_creation_tokens"],
                "total_tokens": token_usage["input_tokens"] + final_token_usage["input_tokens"] + 
                               token_usage["output_tokens"] + final_token_usage["output_tokens"]
            }
            
            return {
                "response": final_text,
                "thinking": response_thinking_blocks + final_thinking_blocks,
                "tool_calls": [{"name": tc.name, "input": tc.input} for tc in response_tool_use_blocks],
                "tool_results": tool_results,
                "web_search_results": response_web_search_blocks,
                "browser_sessions": browser_sessions,  # Include browser session info
                "stop_reason": final_stop_reason,
                "token_usage": total_usage
            }
        
        else:
            # No tool use, return direct response with thinking
            response_text = ""
            for block in response_text_blocks:
                response_text += block["text"]
            
            # Calculate total tokens
            token_usage["total_tokens"] = token_usage["input_tokens"] + token_usage["output_tokens"]
            
            return {
                "response": response_text,
                "thinking": response_thinking_blocks,
                "tool_calls": [],
                "tool_results": [],
                "web_search_results": response_web_search_blocks,
                "browser_sessions": [],  # Empty when no tools used
                "stop_reason": response.stop_reason,
                "token_usage": token_usage
            }
            
    except anthropic.APIError as e:
        logger.error(f"Anthropic API error: {e}")
        # Extract status code from error message or use default
        error_message = str(e)
        status_code = 500
        
        # Try to extract status code from error message if present
        if "401" in error_message:
            status_code = 401
        elif "403" in error_message:
            status_code = 403
        elif "404" in error_message:
            status_code = 404
        elif "429" in error_message:
            status_code = 429
        
        raise HTTPException(status_code=status_code, 
                          detail=f"Anthropic API error: {error_message}")
    except Exception as e:
        logger.error(f"Error in Claude chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/claude/chat/stream")
async def claude_chat_stream(
    message: str = Body(..., embed=True),
    conversation_history: List[Dict[str, Any]] = Body(default=[], embed=True),
    enable_thinking: bool = Body(default=True, embed=True),
    thinking_budget: int = Body(default=10000, embed=True),
    max_output_tokens: int = Body(default=30000, embed=True),
    enable_browser_use: bool = Body(default=False, embed=True),
    enable_educational_tools: bool = Body(default=False, embed=True),
    enable_sonar_tools: bool = Body(default=False, embed=True),
    deep_research_mode: bool = Body(default=False, embed=True)
):
    """Streaming Claude chat endpoint with real-time token usage"""
    
    async def generate():
        try:
            # Build message history
            messages = []
            for msg in conversation_history:
                msg_copy = msg.copy()
                
                # Handle assistant messages that might contain thinking blocks
                if msg_copy.get("role") == "assistant":
                    content = msg_copy.get("content")
                    
                    # Handle object format from frontend {text: ..., thinking: ..., tool_calls: [], tool_results: []}
                    if isinstance(content, dict) and not content.get("type"):
                        content_blocks = []
                        
                        # Add thinking blocks first if they exist
                        if content.get("thinking") and isinstance(content["thinking"], list):
                            for thinking_block in content["thinking"]:
                                if isinstance(thinking_block, dict) and thinking_block.get("type") == "thinking":
                                    thinking_obj = {
                                        "type": "thinking",
                                        "thinking": thinking_block.get("thinking", "")
                                    }
                                    # Include signature if it exists
                                    if "signature" in thinking_block:
                                        thinking_obj["signature"] = thinking_block["signature"]
                                    content_blocks.append(thinking_obj)
                        
                        # Add text content if it exists
                        if content.get("text"):
                            content_blocks.append({
                                "type": "text",
                                "text": content["text"]
                            })
                        
                        # Handle tool calls and tool results if they exist
                        if content.get("tool_calls"):
                            for tool_call in content["tool_calls"]:
                                content_blocks.append(tool_call)
                        
                        if content.get("tool_results"):
                            for tool_result in content["tool_results"]:
                                content_blocks.append(tool_result)
                        
                        msg_copy["content"] = content_blocks
                    
                    # Handle list format (existing logic)
                    elif isinstance(content, list):
                        content_blocks = []
                        for block in content:
                            if isinstance(block, dict):
                                # Preserve thinking blocks with their signature
                                if block.get("type") == "thinking":
                                    thinking_block = {
                                        "type": "thinking",
                                        "thinking": block.get("thinking", "")
                                    }
                                    # CRITICAL: Include signature if it exists
                                    if "signature" in block:
                                        thinking_block["signature"] = block["signature"]
                                    content_blocks.append(thinking_block)
                                else:
                                    # Other block types (text, tool_use, etc.)
                                    content_blocks.append(block)
                            else:
                                # String content
                                content_blocks.append({"type": "text", "text": str(block)})
                        
                        msg_copy["content"] = content_blocks
                    
                    # Handle string format - convert to list with text block
                    elif isinstance(content, str):
                        msg_copy["content"] = [{"type": "text", "text": content}]
                
                messages.append(msg_copy)
            
            messages.append({
                "role": "user", 
                "content": message
            })
            
            # Prepare thinking configuration
            thinking_config: Union[BetaThinkingConfigEnabledParam, None] = None
            extra_headers = {}
            betas = []
            
            if enable_thinking:
                # Use higher thinking budget for deep research mode
                actual_thinking_budget = thinking_budget if not deep_research_mode else thinking_budget * 2
                thinking_config = BetaThinkingConfigEnabledParam(
                    type="enabled",
                    budget_tokens=actual_thinking_budget
                )
                betas.append("interleaved-thinking-2025-05-14")
                betas.append("fine-grained-tool-streaming-2025-05-14")
                betas.append("web-search-2025-03-05")
            
            # Prepare tools list in hierarchical order
            stream_tools = []
            # Always include native search (Tier 1)
            stream_tools.extend(NATIVE_SEARCH_TOOLS)
            # Add research tools (Tier 2-3)
            if enable_sonar_tools:
                stream_tools.extend(RESEARCH_TOOLS)
            # Add action tools (Tier 4)
            if enable_browser_use:
                stream_tools.extend(ACTION_TOOLS)
            
            # Stream response
            stream = client.beta.messages.create(
                model="claude-4-sonnet-20250514",
                max_tokens=max_output_tokens,
                tools=stream_tools,
                messages=messages,
                thinking=thinking_config if thinking_config else NOT_GIVEN,
                betas=betas,
                stream=True
            )
            
            current_block = None
            accumulated_usage = {
                "input_tokens": 0,
                "output_tokens": 0,
                "thinking_tokens": 0,
                "cache_read_tokens": 0,
                "cache_creation_tokens": 0,
                "total_tokens": 0
            }
            
            for event in stream:
                if hasattr(event, 'type'):
                    if event.type == 'content_block_start':
                        if hasattr(event, 'content_block'):
                            current_block = {
                                "type": event.content_block.type,
                                "content": ""
                            }
                            if event.content_block.type == "tool_use":
                                current_block["id"] = event.content_block.id
                                current_block["name"] = event.content_block.name
                            yield f"data: {json.dumps({'event': 'content_block_start', 'block': current_block})}\n\n"
                    
                    elif event.type == 'content_block_delta':
                        if hasattr(event, 'delta') and current_block:
                            if event.delta.type == 'thinking_delta' and hasattr(event.delta, 'thinking'):
                                current_block["content"] += event.delta.thinking
                                yield f"data: {json.dumps({'event': 'thinking_delta', 'delta': event.delta.thinking})}\n\n"
                            elif event.delta.type == 'signature_delta' and hasattr(event.delta, 'signature'):
                                # Handle signature deltas for thinking blocks
                                if current_block["type"] == "thinking":
                                    if not hasattr(current_block, 'signature'):
                                        current_block["signature"] = ''
                                    current_block["signature"] += event.delta.signature
                                yield f"data: {json.dumps({'event': 'signature_delta', 'delta': event.delta.signature})}\n\n"
                            elif event.delta.type == 'text_delta' and hasattr(event.delta, 'text'):
                                current_block["content"] += event.delta.text
                                yield f"data: {json.dumps({'event': 'text_delta', 'delta': event.delta.text})}\n\n"
                            elif event.delta.type == 'input_json_delta' and hasattr(event.delta, 'partial_json'):
                                yield f"data: {json.dumps({'event': 'tool_input_delta', 'delta': event.delta.partial_json})}\n\n"
                            # Skip forwarding signature deltas – they are not needed client-side and cause validation errors
                    
                    elif event.type == 'content_block_stop':
                        if current_block and current_block["type"] == "thinking":
                            # Calculate thinking tokens when block completes
                            accumulated_usage["thinking_tokens"] += int(len(current_block["content"]) / 4)
                        yield f"data: {json.dumps({'event': 'content_block_stop'})}\n\n"
                        current_block = None
                    
                    elif event.type == 'message_delta':
                        if hasattr(event, 'delta') and hasattr(event.delta, 'stop_reason'):
                            yield f"data: {json.dumps({'event': 'message_stop', 'stop_reason': event.delta.stop_reason})}\n\n"
                    
                    elif event.type == 'usage':
                        if hasattr(event, 'usage'):
                            accumulated_usage["input_tokens"] = getattr(event.usage, 'input_tokens', 0)
                            accumulated_usage["output_tokens"] = getattr(event.usage, 'output_tokens', 0)
                            accumulated_usage["cache_read_tokens"] = getattr(event.usage, 'cache_read_input_tokens', 0)
                            accumulated_usage["cache_creation_tokens"] = getattr(event.usage, 'cache_creation_input_tokens', 0)
                            accumulated_usage["total_tokens"] = accumulated_usage["input_tokens"] + accumulated_usage["output_tokens"]
                            yield f"data: {json.dumps({'event': 'usage_update', 'usage': accumulated_usage})}\n\n"
            
            # Final usage update
            yield f"data: {json.dumps({'event': 'done', 'final_usage': accumulated_usage})}\n\n"
            
        except anthropic.APIError as e:
            logger.error(f"Anthropic API error in streaming: {e}")
            yield f"data: {json.dumps({'event': 'error', 'error': f'Anthropic API error: {str(e)}'})}\n\n"
        except Exception as e:
            logger.error(f"Error in streaming Claude chat: {e}")
            yield f"data: {json.dumps({'event': 'error', 'error': str(e)})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "claude_backend", "model": "claude-sonnet-4-20250514"}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8001)
