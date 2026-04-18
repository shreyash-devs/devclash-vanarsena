from groq import AsyncGroq
import structlog
from app.config import Settings

logger = structlog.get_logger()

class GroqClient:
    def __init__(self, settings: Settings):
        self.settings = settings
        # We handle cases where the key might be just a skeleton placeholder
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY) if "your_" not in settings.GROQ_API_KEY and settings.GROQ_API_KEY else None

    async def parse_nl_query(self, prompt: str) -> str:
        if not self.client:
            logger.warning("groq_unconfigured", message="Returning mock JSON for parse_nl_query")
            return '{"keywords": ["auth"], "file_patterns": ["*.py"], "intent": "analyze", "explanation": "Mocked flow"}'
            
        response = await self.client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.0
        )
        return response.choices[0].message.content
