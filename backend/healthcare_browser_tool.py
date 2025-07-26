"""
Healthcare Browser Automation Tool
Uses browser-use + Browserless for healthcare portal automation
Returns either task results or LiveURL for human handoff
"""

import asyncio
import os
from typing import Dict, Any, Optional
from datetime import datetime
from browser_use import Agent, BrowserSession, BrowserProfile
from browser_use.llm import ChatAnthropic


class BrowserlessHealthcareTool:
	"""Healthcare browser automation using Browserless.io with human-in-the-loop capabilities"""
	
	def __init__(self):
		self.browserless_token = os.getenv('BROWSERLESS_API_TOKEN')
		if not self.browserless_token:
			raise ValueError("BROWSERLESS_API_TOKEN environment variable not set")
		self.browser_session: Optional[BrowserSession] = None
		self.cdp_session = None
		self.recording_active = False
		self.tracing_enabled = False
		self.tracing_callbacks = []

	async def create_browser_session(self, use_stealth: bool = True, use_proxy: bool = True) -> BrowserSession:
		"""Create browser session with proper Browserless endpoint"""
		# Build standardized Browserless URL
		params = [f"token={self.browserless_token}"]
		if use_proxy:
			params.extend(["proxy=residential", "proxyCountry=US", "proxySticky=true"])
		
		cdp_url = f"wss://production-sfo.browserless.io?{'&'.join(params)}"
		
		# Create browser profile
		browser_profile = BrowserProfile(
			stealth=use_stealth,
			headless=False,  # For human-in-the-loop workflows
			viewport={"width": 1280, "height": 900}
		)
		
		self.browser_session = BrowserSession(
			cdp_url=cdp_url,
			browser_profile=browser_profile
		)
		return self.browser_session

	async def setup_cdp_session(self, page) -> None:
		"""Create CDP session with proper error handling"""
		try:
			# Correct Playwright CDP session creation
			self.cdp_session = await page.context.new_cdp_session(page)
		except Exception as e:
			raise RuntimeError(f"Failed to create CDP session: {e}")

	async def start_recording(self) -> None:
		"""Start video recording via CDP"""
		if not self.cdp_session:
			raise RuntimeError("CDP session not initialized")
		try:
			await self.cdp_session.send("Browserless.startRecording")
			self.recording_active = True
		except Exception as e:
			raise RuntimeError(f"Failed to start recording: {e}")

	async def stop_recording(self, save_path: str = "recording.webm") -> str:
		"""Stop recording and save video file"""
		if not self.cdp_session or not self.recording_active:
			raise RuntimeError("Recording not active")
		try:
			response = await self.cdp_session.send("Browserless.stopRecording")
			with open(save_path, "wb") as f:
				f.write(response["value"])
			self.recording_active = False
			return save_path
		except Exception as e:
			raise RuntimeError(f"Failed to stop recording: {e}")

	async def generate_live_url(self, timeout_ms: int = 600000) -> str:
		"""Generate LiveURL for human handoff"""
		if not self.cdp_session:
			raise RuntimeError("CDP session not initialized")
		try:
			response = await self.cdp_session.send('Browserless.liveURL', {"timeout": timeout_ms})
			return response["liveURL"]
		except Exception as e:
			raise RuntimeError(f"Failed to generate LiveURL: {e}")

	async def wait_for_live_complete(self) -> None:
		"""Wait for human to complete LiveURL session"""
		if not self.cdp_session:
			raise RuntimeError("CDP session not initialized")
		
		future = asyncio.Future()
		
		def handle_live_complete(event):
			future.set_result(True)
		
		self.cdp_session.on('Browserless.liveComplete', handle_live_complete)
		await future

	async def setup_captcha_handling(self) -> None:
		"""Set up captcha detection and solving"""
		if not self.cdp_session:
			raise RuntimeError("CDP session not initialized")
		
		def handle_captcha_found(event):
			print('Captcha detected! Attempting to solve...')
			asyncio.create_task(self.solve_captcha())
		
		self.cdp_session.on('Browserless.captchaFound', handle_captcha_found)

	async def solve_captcha(self, appear_timeout: int = 20000) -> Dict[str, Any]:
		"""Solve detected captcha"""
		if not self.cdp_session:
			raise RuntimeError("CDP session not initialized")
		try:
			response = await self.cdp_session.send('Browserless.solveCaptcha', {
				"appearTimeout": appear_timeout
			})
			return {
				"solved": response.get("solved", False),
				"error": response.get("error")
			}
		except Exception as e:
			return {"solved": False, "error": str(e)}

	async def create_new_tab(self, url: Optional[str] = None) -> None:
		"""Create new tab for multi-tab support"""
		if not self.browser_session:
			raise RuntimeError("Browser session not initialized")
		try:
			if url:
				await self.browser_session.new_tab(url)
			else:
				# Use browser context directly
				new_page = await self.browser_session.browser_context.new_page()
				if url:
					await new_page.goto(url)
		except Exception as e:
			raise RuntimeError(f"Failed to create new tab: {e}")

	def enable_tracing(self, callback_func=None):
		"""Enable browserless-specific tracing"""
		self.tracing_enabled = True
		if callback_func:
			self.tracing_callbacks.append(callback_func)
	
	async def emit_tracing_event(self, event_type: str, data: Dict[str, Any]):
		"""Emit tracing event to registered callbacks"""
		if self.tracing_enabled:
			event = {
				"event_type": event_type,
				"data": data,
				"timestamp": datetime.now().isoformat(),
				"source": "browserless"
			}
			
			for callback in self.tracing_callbacks:
				try:
					if asyncio.iscoroutinefunction(callback):
						await callback(event)
					else:
						callback(event)
				except Exception as e:
					print(f"Tracing callback error: {e}")
	
	async def cleanup(self) -> None:
		"""Clean up resources"""
		try:
			if self.recording_active and self.cdp_session:
				await self.stop_recording()
			if self.cdp_session:
				await self.cdp_session.detach()
			if self.browser_session:
				await self.browser_session.close()
		except Exception as e:
			print(f"Cleanup error: {e}")


# Legacy function for backward compatibility
async def execute_healthcare_browser_task(
	task_description: str, 
	require_human_handoff: bool = False,
	enable_recording: bool = False
) -> Dict[str, Any]:
	"""Execute healthcare browser automation task with enhanced features"""
	tool = BrowserlessHealthcareTool()
	
	try:
		# Create browser session
		browser_session = await tool.create_browser_session()
		await browser_session.start()
		
		# Get current page and set up CDP
		page = await browser_session.get_current_page()
		await tool.setup_cdp_session(page)
		
		# Set up captcha handling
		await tool.setup_captcha_handling()
		
		# Start recording if requested
		if enable_recording:
			await tool.start_recording()
		
		result_data = {"success": True}
		
		if require_human_handoff:
			# Generate LiveURL and wait for human completion
			live_url = await tool.generate_live_url()
			result_data["live_url"] = live_url
			print(f"Human handoff required. LiveURL: {live_url}")
			await tool.wait_for_live_complete()
			result_data["human_session_completed"] = True
		else:
			# Run agent automation
			agent = Agent(
				task=task_description,
				llm=ChatAnthropic(model="claude-sonnet-4-20250514"),
				browser_session=browser_session
			)
			
			agent_result = await agent.run()
			result_data["result"] = agent_result
		
		# Stop recording if active
		if enable_recording:
			recording_path = await tool.stop_recording()
			result_data["recording_path"] = recording_path
		
		return result_data
		
	except Exception as e:
		return {"success": False, "error": str(e)}
	finally:
		await tool.cleanup()