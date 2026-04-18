import enum
from typing import Any, Dict

from app.config import Settings
from app.services.ai.ollama_client import OllamaPool
from app.services.ai.groq_client import GroqClient
from app.services.ai.claude_client import ClaudeClient
from app.services.ai import prompts

class AITask(enum.Enum):
    SUMMARISE_FILE = "summarise_file"
    CLASSIFY_TIER = "classify_tier"
    EMBED_TEXT = "embed_text"
    PARSE_NL_QUERY = "parse_nl_query"
    GEN_ONBOARDING = "gen_onboarding"
    IMPACT_SUMMARY = "impact_summary"

class AIRouter:
    def __init__(self, settings: Settings, ollama_pool: OllamaPool):
        self.settings = settings
        self.ollama_pool = ollama_pool
        self.groq_client = GroqClient(settings)
        self.claude_client = ClaudeClient(settings)

    async def execute(self, task: AITask, context: Dict[str, Any]) -> Any:
        if task == AITask.SUMMARISE_FILE:
            prompt = prompts.SUMMARY_PROMPT.format(
                filename=context.get("filename", ""),
                language=context.get("language", ""),
                content=context.get("content", "")
            )
            return await self.ollama_pool.generate(
                model=self.settings.OLLAMA_SUMMARY_MODEL,
                prompt=prompt,
                temperature=0.3
            )
            
        elif task == AITask.CLASSIFY_TIER:
            prompt = prompts.CLASSIFY_PROMPT.format(
                filename=context.get("filename", ""),
                imports=context.get("imports", "")
            )
            return await self.ollama_pool.generate(
                model=self.settings.OLLAMA_SUMMARY_MODEL,
                prompt=prompt,
                temperature=0.0
            )

        elif task == AITask.EMBED_TEXT:
            return await self.ollama_pool.embed(
                model=self.settings.OLLAMA_EMBED_MODEL,
                text=context.get("text", "")
            )

        elif task == AITask.PARSE_NL_QUERY:
            prompt = prompts.NL_QUERY_PROMPT.format(
                query=context.get("query", ""),
                sample_files=context.get("sample_files", "")
            )
            return await self.groq_client.parse_nl_query(prompt)

        elif task == AITask.GEN_ONBOARDING:
            prompt = prompts.ONBOARDING_PROMPT.format(
                repo_name=context.get("repo_name", ""),
                primary_language=context.get("primary_language", ""),
                file_count=context.get("file_count", 0),
                file_list=context.get("file_list", "")
            )
            return await self.claude_client.generate_onboarding(prompt)

        elif task == AITask.IMPACT_SUMMARY:
            prompt = prompts.IMPACT_SUMMARY_PROMPT.format(
                filename=context.get("filename", ""),
                in_degree=context.get("in_degree", 0),
                out_degree=context.get("out_degree", 0),
                dependents_sample=context.get("dependents_sample", "")
            )
            return await self.ollama_pool.generate(
                model=self.settings.OLLAMA_SUMMARY_MODEL,
                prompt=prompt,
                temperature=0.4
            )
            
        raise ValueError(f"Unknown AI Task: {task}")
