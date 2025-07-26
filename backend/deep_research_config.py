# Deep Research Configuration - Fixed to handle credentials properly

import os
from dataclasses import dataclass
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(dotenv_path="/Users/timhunter/ron-ai/.env")

try:
    # Try to get credentials from environment first
    if os.getenv("GOOGLE_CLOUD_PROJECT"):
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
    else:
        # Fallback to google.auth.default() if available
        import google.auth
        try:
            _, project_id = google.auth.default()
        except Exception as e:
            print(f"Warning: Could not get default credentials: {e}")
            project_id = "nira-463614"  # Fallback from .env
            
    os.environ.setdefault("GOOGLE_CLOUD_PROJECT", project_id)
    os.environ.setdefault("GOOGLE_CLOUD_LOCATION", "global")
    os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "True")
    
except Exception as e:
    print(f"Warning: Error setting up Google Cloud config: {e}")
    # Set fallback values
    os.environ.setdefault("GOOGLE_CLOUD_PROJECT", "nira-463614")
    os.environ.setdefault("GOOGLE_CLOUD_LOCATION", "global")
    os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "True")


@dataclass
class ResearchConfiguration:
    """Configuration for research-related models and parameters.

    Attributes:
        critic_model (str): Model for evaluation tasks.
        worker_model (str): Model for working/generation tasks.
        max_search_iterations (int): Maximum search iterations allowed.
    """

    critic_model: str = "gemini-2.5-pro"
    worker_model: str = "gemini-2.5-flash"
    max_search_iterations: int = 5


config = ResearchConfiguration()