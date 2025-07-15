#!/usr/bin/env python3
"""
Setup script for complete browserless integration
Installs dependencies, configures environment, and validates setup
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔧 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e}")
        if e.stdout:
            print(f"STDOUT: {e.stdout}")
        if e.stderr:
            print(f"STDERR: {e.stderr}")
        return False

def check_python_version():
    """Check Python version"""
    print("🔍 Checking Python version...")
    version = sys.version_info
    if version.major >= 3 and version.minor >= 11:
        print(f"✅ Python {version.major}.{version.minor}.{version.micro} is compatible")
        return True
    else:
        print(f"❌ Python {version.major}.{version.minor}.{version.micro} is not compatible. Need Python 3.11+")
        return False

def install_python_dependencies():
    """Install required Python packages"""
    dependencies = [
        "browser-use",
        "playwright",
        "fastapi",
        "uvicorn[standard]",
        "websockets",
        "httpx",
        "python-dotenv",
        "pydantic"
    ]
    
    for dep in dependencies:
        if not run_command(f"pip install {dep}", f"Installing {dep}"):
            return False
    
    return True

def install_playwright_browsers():
    """Install Playwright browsers"""
    return run_command("playwright install chromium --with-deps", "Installing Playwright browsers")

def setup_environment_file():
    """Create or update .env file"""
    print("🔧 Setting up environment configuration...")
    
    env_path = Path(".env")
    env_template = """# Browserless Configuration
BROWSERLESS_API_TOKEN=your-actual-api-token-here
BROWSERLESS_ENDPOINT=wss://production-sfo.browserless.io
USE_BROWSERLESS=false
BROWSERLESS_USE_RESIDENTIAL_PROXY=false
BROWSERLESS_TIMEOUT=600000

# Optional Advanced Features
BROWSERLESS_ENABLE_LIVE_URL=true
BROWSERLESS_ENABLE_CAPTCHA_SOLVING=true
BROWSERLESS_ENABLE_RECORDING=true

# Server Configuration
HOST=0.0.0.0
PORT=8000
RELOAD=true

# LLM API Keys (if needed)
ANTHROPIC_API_KEY=your-anthropic-api-key-here
GOOGLE_API_KEY=your-google-api-key-here
"""
    
    if env_path.exists():
        print("⚠️  .env file already exists. Creating .env.example instead.")
        with open(".env.example", "w") as f:
            f.write(env_template)
        print("✅ Created .env.example with template configuration")
    else:
        with open(".env", "w") as f:
            f.write(env_template)
        print("✅ Created .env file with template configuration")
        print("📝 Please update the .env file with your actual API tokens")
    
    return True

def create_directories():
    """Create necessary directories"""
    directories = [
        "logs",
        "recordings",
        "screenshots",
        "temp"
    ]
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"✅ Created directory: {directory}")
    
    return True

def validate_installation():
    """Validate the installation"""
    print("🔍 Validating installation...")
    
    # Check if browser-use can be imported
    try:
        import browser_use
        print("✅ browser-use package imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import browser-use: {e}")
        return False
    
    # Check if our modules can be imported
    try:
        sys.path.append("src")
        from browser.enhanced_browser_manager import get_browser_manager
        print("✅ Enhanced browser manager imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import enhanced browser manager: {e}")
        return False
    
    # Check if FastAPI can be imported
    try:
        import fastapi
        print("✅ FastAPI imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import FastAPI: {e}")
        return False
    
    return True

def run_basic_test():
    """Run a basic functionality test"""
    print("🧪 Running basic functionality test...")
    
    try:
        # Run the simple test
        result = subprocess.run([sys.executable, "test_simple_browser.py"], 
                              capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            print("✅ Basic functionality test passed")
            return True
        else:
            print(f"❌ Basic functionality test failed:")
            print(result.stdout)
            print(result.stderr)
            return False
            
    except subprocess.TimeoutExpired:
        print("❌ Basic functionality test timed out")
        return False
    except Exception as e:
        print(f"❌ Error running basic functionality test: {e}")
        return False

def print_next_steps():
    """Print next steps for the user"""
    print("\n" + "="*80)
    print("🎉 SETUP COMPLETE!")
    print("="*80)
    print("\nNext steps:")
    print("\n1. Configure your API tokens:")
    print("   - Edit .env file")
    print("   - Add your Browserless API token")
    print("   - Add your LLM API keys (Anthropic, Google, etc.)")
    
    print("\n2. Test the integration:")
    print("   python test_simple_browser.py")
    print("   python test_complete_browserless_integration.py")
    
    print("\n3. Start the server:")
    print("   python server/main.py")
    print("   # Or use uvicorn directly:")
    print("   uvicorn server.main:app --host 0.0.0.0 --port 8000 --reload")
    
    print("\n4. Access the API:")
    print("   - API docs: http://localhost:8000/docs")
    print("   - Health check: http://localhost:8000/health")
    print("   - Browser API: http://localhost:8000/api/browser/")
    print("   - WebSocket: ws://localhost:8000/ws/browser")
    
    print("\n5. Integration with your UI:")
    print("   - Import the React components from src/components/")
    print("   - Use the WebSocket service from src/services/browserWebSocket.ts")
    print("   - Update your main app to include the BrowserViewPanel")
    
    print("\n📚 Documentation:")
    print("   - BROWSERLESS_SETUP.md - Detailed setup guide")
    print("   - BROWSER_INTEGRATION_ANALYSIS.md - Architecture overview")
    print("   - BROWSER_USE_CLAUDE_IMPLEMENTATION_GUIDE.md - Implementation guide")

def main():
    print("🚀 Setting up Nira Browserless Integration")
    print("="*80)
    
    steps = [
        ("Check Python version", check_python_version),
        ("Install Python dependencies", install_python_dependencies),
        ("Install Playwright browsers", install_playwright_browsers),
        ("Setup environment file", setup_environment_file),
        ("Create directories", create_directories),
        ("Validate installation", validate_installation),
        ("Run basic test", run_basic_test),
    ]
    
    failed_steps = []
    
    for step_name, step_func in steps:
        print(f"\n{'='*50}")
        print(f"Step: {step_name}")
        print('='*50)
        
        if not step_func():
            failed_steps.append(step_name)
            print(f"⚠️  Step '{step_name}' failed but continuing...")
    
    print(f"\n{'='*80}")
    print("SETUP SUMMARY")
    print('='*80)
    
    if failed_steps:
        print(f"⚠️  {len(failed_steps)} steps had issues:")
        for step in failed_steps:
            print(f"   - {step}")
        print("\nPlease review the errors above and fix any issues.")
    else:
        print("✅ All setup steps completed successfully!")
    
    print_next_steps()
    
    return len(failed_steps) == 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
