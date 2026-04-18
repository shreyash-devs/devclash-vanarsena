from anthropic import AsyncAnthropic
import structlog
from app.config import Settings

logger = structlog.get_logger()

class ClaudeClient:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY) if "your_" not in settings.ANTHROPIC_API_KEY and settings.ANTHROPIC_API_KEY else None

    async def generate_onboarding(self, prompt: str) -> str:
        if not self.client:
            logger.warning("claude_unconfigured", message="Returning mock onboarding markdown")
            return "# Mocked Onboarding Guide\nThis repo is generated for testing without valid API keys."
            
        response = await self.client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=2048,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}]
        )
        # Handle Anthropic's text block array format structure
        text_content = ""
        for block in response.content:
            if block.type == "text":
                text_content += block.text
                
        return text_content
