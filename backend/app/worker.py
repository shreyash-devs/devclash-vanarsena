import asyncio
import os
import structlog
from celery import Celery

from app.config import Settings

logger = structlog.get_logger()
settings = Settings()
_worker_loop: asyncio.AbstractEventLoop | None = None


def get_worker_loop() -> asyncio.AbstractEventLoop:
    """
    Reuse one event loop for all Celery tasks in this process.
    This avoids asyncpg/SQLAlchemy connection issues caused by creating
    a brand-new loop for every task execution.
    """
    global _worker_loop
    if _worker_loop is None or _worker_loop.is_closed():
        _worker_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(_worker_loop)
    return _worker_loop

# Initialize Celery pointing to Redis
celery_app = Celery(
    "codemap_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    worker_concurrency=2, # Keep it lightweight for local development
)

@celery_app.task(bind=True, name="analyze_repository")
def analyze_repository(self, repo_url: str):
    """
    Background task to clone a GitHub repo, parse its AST,
    and update Neo4j with the findings via the orchestrator.
    """
    logger.info("start_analysis", task_id=self.request.id, repo_url=repo_url)
    
    from app.services.analysis.orchestrator import analyze_repo
    
    try:
        loop = get_worker_loop()
        # Run the async pipeline in the long-lived worker loop.
        loop.run_until_complete(
            analyze_repo(
                repo_url=repo_url, 
                job_id=self.request.id, 
                settings=settings, 
                db=None, 
                ws_manager=None
            )
        )
        logger.info("end_analysis", task_id=self.request.id, repo_url=repo_url)
        return {"status": "success", "repo_url": repo_url, "message": "Successfully analyzed repository."}
    except Exception as e:
        logger.error("analysis_failed", task_id=self.request.id, repo_url=repo_url, error=str(e))
        return {"status": "failed", "repo_url": repo_url, "error": str(e)}
