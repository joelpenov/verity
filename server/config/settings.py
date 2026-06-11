import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

class Settings:
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    CHROMA_DB_PATH: str = os.getenv("CHROMA_DB_PATH", str(Path(__file__).resolve().parents[1] / "chroma_db"))
    VECTOR_SEARCH_K: int = int(os.getenv("VECTOR_SEARCH_K", "5"))
    CACHE_DIR: str = os.getenv("CACHE_DIR", str(Path(__file__).resolve().parents[1] / ".cache"))

settings = Settings()
