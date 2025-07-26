import asyncio

import os

import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from dotenv import load_dotenv

from lmnr import Laminar

load_dotenv()

Laminar.initialize()

from browser_use import Agent

from browser_use.llm import ChatAnthropic

llm = ChatAnthropic(model='claude-4-sonnet-20250514', temperature=0.0)

agent = Agent(

	task='''**Objective:** Enroll {{FIRST_NAME}} {{LAST_NAME}} in [Program Name] for {{MEDICATION}}

**Starting point:** {{solution_url}}

**Key information to use:**

- Patient Name: {{FIRST_NAME}} {{LAST_NAME}}

- Date of Birth: {{DATE_OF_BIRTH}}

- Address: {{FULL_ADDRESS}}

- Phone: {{PHONE_NUMBER}}

- Medication: {{MEDICATION}}

- Diagnosis: {{DIAGNOSIS}}

- Insurance Information: {{PLAN_NAME}}, Member ID: {{MEMBER_ID}}, Group: {{GROUP_NUMBER}}

**Navigation tips:**

- Look for enrollment buttons like "Sign Up," "Get Started," "Apply Now," or "Enroll"

- The medication search might require trying different variations of {{MEDICATION}}

- Some sites organize by condition/diagnosis rather than medication name

- If there's a pharmacy selection step, use: {{PHARMACY_INFO}}

**Important elements to capture:**

- Any confirmation number or member ID generated

- Discount codes or coupons

- Instructions for pharmacy use

- Expiration dates

- Screenshots of confirmation pages

**Common obstacles and solutions:**

- If CAPTCHA appears: Try audio option or refresh page

- If medication not found: Try generic name, brand name, or browse by condition

- If enrollment seems stuck: Check for required fields marked with asterisks

- If errors occur: Note exact error message for troubleshooting

**Success indicators:**

- Confirmation page with reference number

- Email confirmation sent to patient

- Downloadable/printable discount card

- Clear instructions for pharmacy use''',

	llm=llm,

)

async def main():

	await agent.run(max_steps=10)

asyncio.run(main())