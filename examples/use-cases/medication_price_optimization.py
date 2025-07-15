"""
Example: Medication Price Optimization with Browser Automation

This example demonstrates how to find the lowest prices for prescription medications
using browser automation to check multiple sources and enrollment in discount programs.
"""

import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from browser_use import Agent
from browser_use.browser import BrowserProfile, BrowserSession
from browser_use.llm import ChatAnthropic
from dotenv import load_dotenv

load_dotenv()

# Medication price optimization system prompt
MEDICATION_PRICE_SYSTEM_PROMPT = """
You are a specialized healthcare affordability agent designed to help patients access medications at the lowest possible cost.

WEBSITE NAVIGATION GUIDELINES:

## PRIORITY WEBSITES TO USE:
1. **Discount Card Programs** (Start Here):
   - GoodRx.com - Most comprehensive pricing
   - SingleCare.com - Often beats GoodRx prices
   - RxSaver.com - Good for chain pharmacies
   - WellRx.com - Accepted at 65,000+ pharmacies

2. **Direct Pharmacy Programs**:
   - CostPlusDrugs.com - Transparent pricing
   - Amazon Pharmacy - Prime discounts
   - HealthWarehouse.com - Mail-order pharmacy

3. **Manufacturer Programs**:
   - Search: "[medication name] manufacturer savings card"
   - Visit manufacturer's official website

4. **Pharmacy Chains**:
   - CVS, Walgreens, Walmart, Costco discount programs

## WEBSITES TO AVOID:
- Unverified online pharmacies
- International pharmacy sites
- Pop-up ads or spam sites
- General search engines for pricing

SYSTEMATIC WORKFLOW:
1. Start with GoodRx.com for baseline
2. Compare with SingleCare and RxSaver
3. Check CostPlusDrugs for generics
4. Search manufacturer programs
5. Verify local pharmacy programs

Remember: Navigate directly to trusted sites, avoid general searches.
"""

async def find_medication_prices(medication_name: str, dose: str, quantity: int = 30):
    """
    Find the best prices for a specific medication using browser automation.
    
    Args:
        medication_name: Name of the medication (e.g., "Eliquis")
        dose: Dosage strength (e.g., "5mg")
        quantity: Number of pills (default 30)
    """
    
    # Configure browser with stealth mode
    browser_profile = BrowserProfile(
        stealth=True,
        headless=False,  # Show browser for demonstration
        user_data_dir='/tmp/medication_price_browser',
        allowed_domains=[
            '*.goodrx.com',
            '*.singlecare.com',
            '*.rxsaver.com',
            '*.costplusdrugs.com',
            '*.amazon.com',
            '*.cvs.com',
            '*.walgreens.com',
            '*.walmart.com'
        ]
    )
    
    # Initialize LLM
    llm = ChatAnthropic(
        model="claude-4-sonnet-20250514"
    )
    
    # Create browser session
    browser_session = BrowserSession(browser_profile=browser_profile)
    
    # Construct the search query with system prompt included
    search_query = f"""{MEDICATION_PRICE_SYSTEM_PROMPT}
    
    Find the lowest price for {medication_name} {dose}, quantity {quantity}.
    
    Please follow this systematic approach:
    
    1. **GoodRx Check** (Priority 1):
       - Navigate to goodrx.com
       - Search for "{medication_name} {dose}"
       - Set quantity to {quantity}
       - Note the lowest price and pharmacy
    
    2. **SingleCare Check** (Priority 2):
       - Navigate to singlecare.com
       - Search for the same medication
       - Compare prices with GoodRx
    
    3. **Cost Plus Drugs Check** (Priority 3):
       - Navigate to costplusdrugs.com
       - Search for generic version if available
       - Check if they carry this medication
    
    4. **Manufacturer Program** (If brand name):
       - Search for "{medication_name} manufacturer savings card"
       - Check eligibility requirements
       - Note any enrollment process
    
    5. **Local Pharmacy Programs**:
       - Check if major chains have their own discount programs
       - Note any membership requirements
    
    **Final Report Should Include**:
    - Lowest price found and where
    - Original retail price for comparison
    - Total savings (amount and percentage)
    - Steps to obtain this price
    - Any eligibility requirements
    - Alternative options if primary fails
    """
    
    # Initialize agent with the task
    agent = Agent(
        task=search_query,
        llm=llm,
        browser_session=browser_session
    )
    
    try:
        # Execute the price search
        print(f"\n🔍 Searching for best prices for {medication_name} {dose}...")
        print("=" * 60)
        
        result = await agent.run()
        
        print("\n📊 PRICE OPTIMIZATION RESULTS")
        print("=" * 60)
        print(result)
        
    except Exception as e:
        print(f"\n❌ Error during price search: {e}")
    finally:
        await browser_session.close()

async def enroll_in_discount_program(program_name: str, medication_info: dict):
    """
    Enroll in a specific discount program with patient information.
    
    Args:
        program_name: Name of the discount program (e.g., "GoodRx Gold")
        medication_info: Dictionary with patient and medication details
    """
    
    browser_profile = BrowserProfile(
        stealth=True,
        headless=False
    )
    
    llm = ChatAnthropic(
        model="claude-4-sonnet-20250514"
    )
    
    browser_session = BrowserSession(browser_profile=browser_profile)
    
    enrollment_query = f"""
    Help me enroll in {program_name} for my medication.
    
    Patient Information:
    - Name: {medication_info.get('patient_name', 'John Doe')}
    - ZIP Code: {medication_info.get('zip_code', '10001')}
    - Phone: {medication_info.get('phone', '555-0123')}
    - Email: {medication_info.get('email', 'patient@example.com')}
    
    Please:
    1. Navigate to the {program_name} enrollment page
    2. Fill out the enrollment form with the provided information
    3. Note any membership fees or requirements
    4. Capture confirmation numbers
    5. Save or screenshot the discount card/coupon
    
    If you encounter any issues, document them and suggest alternatives.
    """
    
    agent = Agent(
        task=enrollment_query,
        llm=llm,
        browser_session=browser_session
    )
    
    try:
        result = await agent.run()
        print(f"\n✅ Enrollment Results for {program_name}:")
        print(result)
    except Exception as e:
        print(f"\n❌ Enrollment error: {e}")
    finally:
        await browser_session.close()

async def compare_multiple_medications():
    """
    Compare prices for multiple medications simultaneously using parallel agents.
    """
    
    medications = [
        {"name": "Eliquis", "dose": "5mg", "quantity": 60},
        {"name": "Jardiance", "dose": "10mg", "quantity": 30},
        {"name": "Ozempic", "dose": "1mg", "quantity": 4}  # 4 pens
    ]
    
    # Run price searches in parallel
    tasks = []
    for med in medications:
        task = find_medication_prices(
            medication_name=med["name"],
            dose=med["dose"],
            quantity=med["quantity"]
        )
        tasks.append(task)
    
    print("\n🚀 Searching for best prices for multiple medications in parallel...")
    await asyncio.gather(*tasks)

# Example usage
async def main():
    """
    Demonstrate medication price optimization capabilities.
    """
    
    print("💊 MEDICATION PRICE OPTIMIZATION SYSTEM")
    print("=" * 60)
    print("This system helps find the lowest prices for prescription medications")
    print("using automated browser agents to check multiple sources.\n")
    
    # Example 1: Single medication price search
    print("\n📋 EXAMPLE 1: Finding best price for Eliquis 5mg")
    print("-" * 60)
    await find_medication_prices("Eliquis", "5mg", quantity=60)
    
    # Example 2: Enroll in a discount program
    print("\n\n📋 EXAMPLE 2: Enrolling in discount program")
    print("-" * 60)
    patient_info = {
        "patient_name": "Test Patient",
        "zip_code": "10001",
        "phone": "555-0123",
        "email": "test@example.com"
    }
    # await enroll_in_discount_program("GoodRx", patient_info)
    
    # Example 3: Compare multiple medications
    # print("\n\n📋 EXAMPLE 3: Comparing prices for multiple medications")
    # print("-" * 60)
    # await compare_multiple_medications()
    
    print("\n\n✅ Medication price optimization demonstration complete!")

if __name__ == "__main__":
    asyncio.run(main()) 