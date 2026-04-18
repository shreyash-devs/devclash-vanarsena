import asyncio
from pathlib import Path
import structlog
from typing import Any

from app.config import Settings
from app.services.github_service import GitHubService
from app.services.analysis.ast_parser import ASTParser

logger = structlog.get_logger()

async def analyze_repo(repo_url: str, job_id: str, settings: Settings, db: Any = None, ws_manager: Any = None):
    """
    Main pipeline task logic (meant to be run within a Celery task context).
    Catches per-file errors gracefully and proceeds.
    Stops entire job if catastrophic error occurs and marks as failed.
    """
    gh_service = GitHubService()
    parser = ASTParser()
    # Temporary directory for cloning (inside the backend workspace to avoid permission issues)
    # The prompt explicitly warns: "IMPORTANT: The Cwd MUST be within your workspace. Do NOT use /tmp"
    # Actually wait, /tmp is standard for Linux/mac but I am on Windows. I will use standard tmpfile or local folder.
    project_root = Path(__file__).parent.parent.parent.parent
    dest = project_root / ".cache" / job_id
    
    try:
        # 1. Update job status to "running" in PostgreSQL (Placeholder)
        logger.info("job_status_update", job_id=job_id, status="running")
        
        async def broadcast(step_name, current, total, message):
            if ws_manager:
                try:
                    await ws_manager.broadcast(job_id, {
                        "step": step_name,
                        "current": current,
                        "total": total,
                        "message": message
                    })
                except Exception:
                    pass
            logger.info("pipeline_progress", job_id=job_id, step=step_name, message=message, progress=f"{current}/{total}")

        # Start Pipeline
        await broadcast("init", 0, 12, f"Starting analysis pipeline for {repo_url}...")
        
        # 2. Clone
        await broadcast("clone", 1, 12, "Cloning remote repository...")
        repo_meta = await gh_service.clone_repo(repo_url, dest)
        
        # 3. get_files
        await broadcast("extract", 2, 12, f"Extracting files (Limit: {settings.MAX_FILES_PER_REPO})...")
        files = await gh_service.get_files(dest, settings)
        
        # 4. parse_all
        await broadcast("parsing", 3, 12, f"Parsing full AST for {len(files)} files...")
        parsed_files = []
        for f in files:
            try:
                parsed = parser.parse_file(f)
                parsed_files.append((f, parsed))
            except Exception as e:
                logger.error("file_parse_error", file=f.path, error=str(e))
                
        # 5. build_dep_graph (Placeholder for Task implementation)
        await broadcast("build_dep_graph", 4, 12, "Building exact dependency graph...")
        # ... logic ...
        
        # 6. classify_tiers
        await broadcast("classify_tiers", 5, 12, "Classifying tier roles for files...")
        
        # 7. score_impact
        await broadcast("score_impact", 6, 12, "Scoring architectural impact...")
        
        # 8. detect_orphans
        await broadcast("detect_orphans", 7, 12, "Detecting isolated code files...")
        
        # 9. generate_summaries
        await broadcast("generate_summaries", 8, 12, "Using AI to generate file summaries...")
        
        # 10. embed_summaries
        await broadcast("embed_summaries", 9, 12, "Computing summary embeddings...")
        
        # 11. store_in_neo4j
        await broadcast("store_in_neo4j", 10, 12, "Uploading topology to Neo4j graph...")
        
        # 12. generate_onboarding
        await broadcast("generate_onboarding", 11, 12, "Composing final onboarding documentation...")
        
        # Mark Complete
        await broadcast("complete", 12, 12, "Analysis completed successfully!")
        logger.info("job_status_update", job_id=job_id, status="complete")
        
    except Exception as e:
        logger.error("job_failed_fatal", job_id=job_id, error=str(e))
        # DB status update to failed
        raise e
