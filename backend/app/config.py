from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Server
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    MACHINE_ROLE: str = "gateway"  # gateway | worker

    # Databases
    POSTGRES_URL: str
    NEO4J_URL: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str
    REDIS_URL: str = "redis://localhost:6379"

    # Ollama — comma-separated list of host URLs
    OLLAMA_HOSTS: str = "http://localhost:11434"
    OLLAMA_SUMMARY_MODEL: str = "llama3.2"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"

    # External AI
    GROQ_API_KEY: str
    ANTHROPIC_API_KEY: str

    # GitHub
    GITHUB_TOKEN: str = ""   # optional but recommended to avoid rate limits

    # Analysis limits
    MAX_FILES_PER_REPO: int = 300
    MAX_FILE_SIZE_KB: int = 500
    SUPPORTED_EXTENSIONS: list[str] = [
        ".py", ".ts", ".tsx", ".js", ".jsx",
        ".go", ".java", ".rs", ".rb", ".php",
        ".html", ".css", ".scss", ".json", ".md",
        ".yml", ".yaml", ".xml", ".sh", ".sql"
    ]

    @property
    def ollama_host_list(self) -> list[str]:
        return [h.strip() for h in self.OLLAMA_HOSTS.split(",") if h.strip()]

    model_config = SettingsConfigDict(env_file=".env")
