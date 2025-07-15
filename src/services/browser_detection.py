"""
Browser Detection Service
Python implementation of browser need detection logic
Matches the TypeScript implementation in claudeBrowserService.ts
"""

import re
from typing import List


def detects_browser_need(message: str) -> bool:
    """
    Detect if a message requires browser automation
    
    Args:
        message: User message to analyze
        
    Returns:
        True if browser automation is needed, False otherwise
    """
    browser_keywords = [
        'navigate to', 'go to', 'visit', 'open website', 'browse to',
        'fill out', 'click on', 'click the', 'search for', 'find on website',
        'submit form', 'login to', 'sign in to', 'download from', 'download the',
        'screenshot of', 'scrape', 'extract from website',
        'automate', 'browser', 'website', 'web page', 'button', 'form'
    ]
    
    message_lower = message.lower()
    
    # Check for exact keyword matches
    has_keywords = any(keyword in message_lower for keyword in browser_keywords)
    
    # Check for URLs
    has_url = bool(re.search(r'https?://[^\s]+', message))
    
    # Check for web-related patterns
    has_web_pattern = bool(re.search(r'\.(com|org|net|edu|gov|io|co)\b', message_lower))
    
    return has_keywords or has_url or has_web_pattern


def get_browser_keywords() -> List[str]:
    """Get the list of browser automation keywords"""
    return [
        'navigate to', 'go to', 'visit', 'open website', 'browse to',
        'fill out', 'click on', 'click the', 'search for', 'find on website',
        'submit form', 'login to', 'sign in to', 'download from', 'download the',
        'screenshot of', 'scrape', 'extract from website',
        'automate', 'browser', 'website', 'web page', 'button', 'form'
    ]


def analyze_message(message: str) -> dict:
    """
    Analyze a message and return detailed detection information
    
    Args:
        message: User message to analyze
        
    Returns:
        Dictionary with analysis results
    """
    browser_keywords = get_browser_keywords()
    message_lower = message.lower()
    
    # Find matching keywords
    detected_keywords = [kw for kw in browser_keywords if kw in message_lower]
    
    # Find URLs
    urls = re.findall(r'https?://[^\s]+', message)
    
    # Find web patterns
    web_patterns = re.findall(r'\.(com|org|net|edu|gov|io|co)\b', message_lower)
    
    requires_browser = bool(detected_keywords or urls or web_patterns)
    
    return {
        'message': message,
        'requires_browser': requires_browser,
        'detected_keywords': detected_keywords,
        'detected_urls': urls,
        'detected_web_patterns': web_patterns,
        'confidence': len(detected_keywords) + len(urls) + len(web_patterns)
    }


# Test cases for validation
TEST_CASES = [
    ("Navigate to google.com", True),
    ("Go to https://example.com", True),
    ("Fill out the contact form", True),
    ("Click the submit button", True),
    ("Visit healthcare.gov", True),
    ("Take a screenshot of the page", True),
    ("What is 2 + 2?", False),
    ("Tell me about health insurance", False),
    ("Explain Medicare benefits", False),
    ("How does copay work?", False),
    ("Help me file an insurance claim", False),  # This is ambiguous - could be browser or not
]


def run_test_cases() -> float:
    """
    Run test cases and return accuracy
    
    Returns:
        Accuracy as a float between 0 and 1
    """
    correct = 0
    total = len(TEST_CASES)
    
    for message, expected in TEST_CASES:
        detected = detects_browser_need(message)
        if detected == expected:
            correct += 1
            print(f"✅ '{message}' -> {detected}")
        else:
            print(f"❌ '{message}' -> {detected} (expected {expected})")
    
    accuracy = correct / total
    print(f"\nAccuracy: {accuracy:.1%} ({correct}/{total})")
    return accuracy


if __name__ == "__main__":
    print("Browser Detection Test")
    print("=" * 50)
    accuracy = run_test_cases()
    
    print("\nDetailed Analysis Examples:")
    print("-" * 30)
    
    examples = [
        "Navigate to my insurance website and file a claim",
        "What is health insurance?",
        "Go to https://healthcare.gov",
        "Fill out the form on example.com"
    ]
    
    for example in examples:
        analysis = analyze_message(example)
        print(f"\nMessage: {example}")
        print(f"Requires Browser: {analysis['requires_browser']}")
        print(f"Keywords: {analysis['detected_keywords']}")
        print(f"URLs: {analysis['detected_urls']}")
        print(f"Web Patterns: {analysis['detected_web_patterns']}")
        print(f"Confidence: {analysis['confidence']}")
