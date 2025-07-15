# Medication Savings Feature Implementation

## Overview

The Medication Savings Agent has been successfully implemented in the Nira codebase. This feature helps users find the most affordable options for their medications by leveraging web search, program analysis, and browser automation.

## Key Components

### 1. **MacroMenu Integration** (`src/components/MacroMenu.tsx`)

The medication savings functionality has been added as a new macro in the Financial category:
- **Name**: Medication Savings Agent
- **Description**: Comprehensive medication affordability optimization with multi-agent orchestration
- **Input**: Medication name (e.g., Ozempic, Eliquis)

### 2. **Web Search Integration**

The system uses FireCrawl's web search API to gather current information:
- **Endpoint**: `/api/web-search` (implemented in `server/browser_server.py`)
- **Class**: `WebSearchAgent` 
- **Functionality**: Searches for current medication prices, manufacturer coupons, patient assistance programs, and generic alternatives

### 3. **Workflow Structure**

The implementation follows a 5-step systematic approach:

#### Step 1: Web Search for Current Information
- Uses FireCrawl API to search for:
  - Current prices from GoodRx and SingleCare
  - Manufacturer coupons and patient assistance programs
  - Generic alternatives and pricing
  - Latest discount programs and eligibility requirements

#### Step 2: Program Analysis
- Analyzes search results to determine:
  - Medication profile (generic name, manufacturer, retail price)
  - Available savings programs
  - Eligibility requirements

#### Step 3: Eligibility Assessment
- Gathers user information:
  - Insurance status (Commercial, Medicare, Medicaid, or uninsured)
  - Income level (for patient assistance programs)
  - Location (state-specific programs)

#### Step 4: Targeted Browser Automation
- Makes focused browser-use calls to:
  - GoodRx.com for price comparisons
  - SingleCare.com for discount verification
  - Manufacturer websites for copay cards
  - Patient assistance program sites

#### Step 5: Results & Recommendations
- Provides structured comparison table with:
  - Program name
  - Cost per month
  - Eligibility status
  - Enrollment time
  - Pros and cons

## Technical Implementation Details

### FireCrawl Integration
```python
class WebSearchAgent:
    def __init__(self, llm):
        self.llm = llm
        self.firecrawl_api_key = os.getenv('FIRECRAWL_API_KEY')
        
    async def search_and_analyze(self, query: str, max_results: int = 5) -> Dict:
        # Performs web search using FireCrawl API
        # Returns analyzed results with markdown content
```

### Environment Requirements
- `FIRECRAWL_API_KEY`: Required for web search functionality
- `GOOGLE_API_KEY`: Required for the LLM (Gemini 2.5 Flash)

### Key Features
1. **Real-time Information**: Uses web search to get current pricing and program availability
2. **Intelligent Reasoning**: Claude analyzes programs based on user eligibility before making browser calls
3. **Focused Automation**: Only visits sites relevant to the user's specific situation
4. **Structured Output**: Provides clear comparison tables for easy decision-making

## Testing

A test script (`test_web_search.py`) has been created to verify the FireCrawl integration:
```bash
python test_web_search.py
```

This tests:
- FireCrawl API connectivity
- Search functionality for medication-related queries
- Response parsing and content extraction

## Usage

1. User clicks on the macro menu
2. Selects "Medication Savings Agent"
3. Enters medication name (e.g., "Ozempic")
4. Claude:
   - Performs web searches for current information
   - Asks for eligibility information
   - Uses browser automation for specific sites
   - Provides personalized recommendations

## Benefits

1. **Up-to-date Information**: Web search ensures current pricing and program availability
2. **Personalized Results**: Only shows programs the user qualifies for
3. **Time Savings**: Automates the research process across multiple sites
4. **Comprehensive Coverage**: Checks manufacturer programs, discount cards, and assistance programs
5. **Clear Recommendations**: Structured output makes decision-making easier

## Future Enhancements

1. **Caching**: Store search results temporarily to reduce API calls
2. **Batch Processing**: Handle multiple medications at once
3. **Insurance Integration**: Direct verification with insurance providers
4. **Alert System**: Notify users when prices drop or new programs become available
5. **Mobile Optimization**: Enhanced mobile interface for on-the-go access 