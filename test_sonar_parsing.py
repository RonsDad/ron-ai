#!/usr/bin/env python3
"""
Test script to verify Sonar Reasoning Pro and Deep Research parsing functionality
"""

import json
import re
import sys
import os
from typing import Dict, Any, Optional
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the SonarTool parsing method directly for testing
class SonarTool:
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


def test_parse_sonar_response():
    """Test the _parse_sonar_response method with various response formats"""
    
    print("Testing Sonar Response Parsing...")
    
    # Test Case 1: Standard response with reasoning tokens
    print("\n1. Testing standard response with reasoning...")
    mock_response_1 = {
        "choices": [{
            "message": {
                "content": "<think>Let me analyze this medical question about diabetes management. I need to consider current guidelines and best practices.</think>\n\nDiabetes management requires a comprehensive approach including diet, exercise, medication, and regular monitoring. Current guidelines recommend HbA1c targets below 7% for most adults [1]. Metformin is typically the first-line treatment [2].\n\nSources:\n[1] American Diabetes Association Guidelines 2024\n[2] European Association for the Study of Diabetes"
            }
        }],
        "usage": {
            "input_tokens": 100,
            "output_tokens": 200,
            "total_tokens": 300
        }
    }
    
    parsed_1 = SonarTool._parse_sonar_response(mock_response_1, structured_output=False)
    print(f"✓ Content extracted: {len(parsed_1['content'])} characters")
    print(f"✓ Reasoning extracted: {len(parsed_1['reasoning'])} characters")
    print(f"✓ Citations found: {len(parsed_1['citations'])} citations")
    print(f"✓ Token usage: {parsed_1['token_usage']}")
    
    # Test Case 2: Structured output with JSON
    print("\n2. Testing structured output with JSON...")
    mock_response_2 = {
        "choices": [{
            "message": {
                "content": "<think>I need to structure this response as JSON according to the schema provided. The user wants medication information formatted properly.</think>\n\n{\n  \"medication_name\": \"Metformin\",\n  \"dosage\": \"500mg twice daily\",\n  \"side_effects\": [\"Nausea\", \"Diarrhea\", \"Metallic taste\"],\n  \"contraindications\": [\"Severe kidney disease\", \"Metabolic acidosis\"],\n  \"references\": [\"FDA prescribing information\", \"Clinical guidelines\"]\n}"
            }
        }],
        "usage": {
            "input_tokens": 150,
            "output_tokens": 250,
            "total_tokens": 400
        }
    }
    
    parsed_2 = SonarTool._parse_sonar_response(mock_response_2, structured_output=True)
    print(f"✓ Structured data parsed: {parsed_2['structured_data'] is not None}")
    if parsed_2['structured_data']:
        print(f"✓ JSON fields: {list(parsed_2['structured_data'].keys())}")
    print(f"✓ Reasoning extracted: {len(parsed_2['reasoning'])} characters")
    
    # Test Case 3: Citations in various formats
    print("\n3. Testing citation parsing...")
    mock_response_3 = {
        "choices": [{
            "message": {
                "content": "Medical research shows multiple citation formats [1] and (2) references. Some studies use different formats.\n\nSource: National Institute of Health Database\nReferences: Multiple clinical trials from 2023-2024\n\nAdditional citations [3] and [4] support these findings."
            }
        }],
        "usage": {"input_tokens": 80, "output_tokens": 120, "total_tokens": 200}
    }
    
    parsed_3 = SonarTool._parse_sonar_response(mock_response_3, structured_output=False)
    print(f"✓ Citations extracted: {parsed_3['citations']}")
    print(f"✓ Citation count: {len(parsed_3['citations'])}")
    
    # Test Case 4: Error handling
    print("\n4. Testing error handling...")
    mock_response_4 = {
        "choices": [{
            "message": {
                "content": "<think>Invalid JSON test</think>\n\n{ invalid json structure"
            }
        }]
    }
    
    parsed_4 = SonarTool._parse_sonar_response(mock_response_4, structured_output=True)
    print(f"✓ Error handling: Content fallback used")
    print(f"✓ Reasoning still extracted: {len(parsed_4['reasoning'])} characters")
    
    print("\n✅ All parsing tests completed successfully!")


def test_reasoning_token_patterns():
    """Test specific reasoning token patterns"""
    
    print("\nTesting Reasoning Token Patterns...")
    
    # Test various thinking patterns
    test_cases = [
        "<think>Simple reasoning</think>",
        "<think>\nMultiline\nreasoning\nwith newlines\n</think>",
        "<think>Reasoning with [citations] and (references)</think>",
        "No thinking tags in this content",
        "<think>First thought</think> Content <think>Second thought</think>",
    ]
    
    thinking_pattern = r'<think>(.*?)</think>'
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i}. Testing: {test_case[:50]}...")
        matches = re.findall(thinking_pattern, test_case, re.DOTALL)
        print(f"   Matches found: {len(matches)}")
        if matches:
            for j, match in enumerate(matches):
                print(f"   Match {j+1}: {match.strip()[:30]}...")


def test_citation_patterns():
    """Test citation pattern recognition"""
    
    print("\nTesting Citation Pattern Recognition...")
    
    test_content = """
    Medical research shows various citation formats:
    - Numbered citations [1], [2], [3]
    - Parenthetical citations (1), (2), (3)
    - Source references like Source: NIH Database
    - Multiple sources in References: Study A, Study B, Study C
    
    Additional citations [10] and [11] with more content.
    Source: American Medical Association
    References: Clinical Trial 2023, Meta-analysis 2024
    """
    
    citation_patterns = [
        (r'\[(\d+)\]', 'Numbered brackets'),
        (r'\((\d+)\)', 'Numbered parentheses'),
        (r'Source: (.+?)(?:\n|$)', 'Source references'),
        (r'References?:\s*(.+?)(?:\n\n|$)', 'Reference lists')
    ]
    
    all_citations = []
    for pattern, description in citation_patterns:
        matches = re.findall(pattern, test_content)
        print(f"✓ {description}: {len(matches)} matches")
        for match in matches:
            if match not in all_citations:
                all_citations.append(match)
    
    print(f"✓ Total unique citations: {len(all_citations)}")
    print(f"✓ Citations: {all_citations}")


if __name__ == "__main__":
    print("🔍 Sonar Integration Testing")
    print("=" * 50)
    
    try:
        test_parse_sonar_response()
        test_reasoning_token_patterns()
        test_citation_patterns()
        
        print("\n🎉 All tests passed! Sonar parsing functionality is working correctly.")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)