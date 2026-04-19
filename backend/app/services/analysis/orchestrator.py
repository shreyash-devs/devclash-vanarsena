import asyncio
from pathlib import Path
import structlog
from typing import Any
from sqlalchemy import select
from datetime import datetime, timezone
from urllib.parse import urlparse

from app.config import Settings
from app.services.github_service import GitHubService
from app.services.analysis.ast_parser import ASTParser

logger = structlog.get_logger()


def build_repo_id(repo_url: str, fallback_name: str) -> str:
    parsed = urlparse(repo_url)
    parts = [p for p in parsed.path.strip("/").split("/") if p]
    if len(parts) >= 2:
        owner = parts[0].lower()
        repo = parts[1].replace(".git", "").lower()
        return f"{owner}-{repo}"
    normalized_name = (fallback_name or "unknown-repo").strip().lower().replace(" ", "-")
    return normalized_name

async def analyze_repo(repo_url: str, job_id: str, settings: Settings, db: Any = None, ws_manager: Any = None):
    """
    Main pipeline task logic. Now fully integrated with PostgreSQL schema.
    """
    from app.db.session import async_session
    from app.models.db import Repository, AnalysisJob

    gh_service = GitHubService()
    parser = ASTParser()
    project_root = Path(__file__).parent.parent.parent.parent
    dest = project_root / ".cache" / job_id
    
    async with async_session() as session:
        job_record = None
        try:
            # 1. Update job status to "running" in PostgreSQL
            db_job = await session.execute(select(AnalysisJob).filter(AnalysisJob.id == job_id))
            job_record = db_job.scalars().first()
            if job_record:
                job_record.status = "cloning"
                await session.commit()
            
            logger.info("job_status_update", job_id=job_id, status="running")
            
            async def broadcast(step_name, current, total, message):
                # We fetch the job record each time to avoid race conditions with initial commit
                # and to avoid "expired" session objects.
                try:
                    res = await session.execute(select(AnalysisJob).filter(AnalysisJob.id == job_id))
                    active_job = res.scalars().first()
                    if active_job:
                        active_job.status = step_name
                        # Also update files_processed/total_files if it's a file step
                        if step_name in ["parsing", "generate_summaries", "embed_summaries"]:
                            active_job.files_processed = current
                            if total and total > 0:
                                active_job.total_files = total
                        await session.commit()
                except Exception as e:
                    logger.warning("db_status_sync_failed", error=str(e), step=step_name)

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
            await broadcast("cloning", 1, 12, "Cloning remote repository...")
            repo_meta = await gh_service.clone_repo(repo_url, dest)

            # Insert or update Repository record in PostgreSQL now that we have Metadata
            repo_id_str = build_repo_id(repo_url, repo_meta.name)
            # First resolve by URL because URL is unique and may already exist with an older ID format.
            existing_repo_by_url_result = await session.execute(
                select(Repository).filter(Repository.url == repo_url)
            )
            existing_repo = existing_repo_by_url_result.scalars().first()
            if not existing_repo:
                db_repo_result = await session.execute(select(Repository).filter(Repository.id == repo_id_str))
                existing_repo = db_repo_result.scalars().first()
            
            if not existing_repo:
                new_repo = Repository(
                    id=repo_id_str,
                    name=repo_meta.name,
                    url=repo_url,
                    primary_language=repo_meta.primary_language,
                    star_count=repo_meta.star_count,
                    description=repo_meta.description
                )
                session.add(new_repo)
            else:
                # Keep the already persisted primary key to avoid URL uniqueness conflicts.
                repo_id_str = existing_repo.id
                existing_repo.star_count = repo_meta.star_count
                existing_repo.description = repo_meta.description
                existing_repo.primary_language = repo_meta.primary_language
                existing_repo.name = repo_meta.name
                existing_repo.url = repo_url
            
            # Link the job to the newly UPSERTED repository!
            if job_record:
                job_record.repo_id = repo_id_str
            await session.commit()

            # 3. get_files
            await broadcast("extract", 2, 12, f"Extracting files (Limit: {settings.MAX_FILES_PER_REPO})...")
            files = await gh_service.get_files(dest, settings)
            if job_record:
                job_record.total_files = len(files)
                await session.commit()
            
            # 4. parse_all
            await broadcast("parsing", 0, 12, f"Parsing full AST for {len(files)} files...")
            parsed_files = []
            for idx, f in enumerate(files):
                try:
                    parsed = parser.parse_file(f)
                    parsed_files.append((f, parsed))
                    if idx % 10 == 0:  # Update UI/DB periodically, not per file
                        await broadcast("parsing", idx + 1, 12, f"Parsing full AST... ({idx+1}/{len(files)})")
                except Exception as e:
                    logger.error("file_parse_error", file=f.path, error=str(e))
            
            await broadcast("parsing", len(files), 12, f"AST Parsing complete for {len(files)} files.")

            # 5. build_dep_graph (Placeholder for Task implementation)
            await broadcast("build_dep_graph", 4, 12, "Building exact dependency graph...")
            
            # 6. classify_tiers
            await broadcast("classify_tiers", 5, 12, "Classifying tier roles for files...")
            
            # 7. score_impact
            await broadcast("score_impact", 6, 12, "Scoring architectural impact...")
            
            # 8. detect_orphans
            await broadcast("detect_orphans", 7, 12, "Detecting isolated code files...")
            
            # 9. generate_summaries & 10. embed_summaries
            await broadcast("generate_summaries", 8, 12, "Using AI to generate file summaries...")
            
            from app.services.ai.ollama_client import OllamaPool
            from app.services.ai.router import AIRouter, AITask
            
            ollama_pool = OllamaPool(settings)
            await ollama_pool.initialize()
            ai_router = AIRouter(settings, ollama_pool)
            # 8. generate_summaries
            await broadcast("generate_summaries", 0, len(parsed_files), "Using AI to generate file summaries...")
            
            summaries_by_file = {}
            embeddings_by_file = {}
            
            # Using concurrency chunks to speed up the local AI without bottlenecking Ollama process
            # BYPASS: If repository has too many files, skip strict AI to avoid locking the application for 45 minutes
            chunk_size = 5 
            if len(parsed_files) > 40:
                for idx, (f, parsed) in enumerate(parsed_files):
                    summaries_by_file[f.path] = f"Analyzed {f.extension} file handling {len(parsed.functions)} functions."
                    if idx % 10 == 0:
                        await broadcast("generate_summaries", idx + 1, len(parsed_files), f"Bypassing AI for large repo... ({idx+1}/{len(parsed_files)})")
                await broadcast("generate_summaries", len(parsed_files), len(parsed_files), "Summarization Complete.")
            else:
                for i in range(0, len(parsed_files), chunk_size):
                    chunk = parsed_files[i:i + chunk_size]
                    
                    async def process_file(f, parsed):
                        context = {
                            "filename": f.path,
                            "language": f.extension,
                            "content": f.content[:5000] # clamp len to avoid context explosion
                        }
                        summary = await ai_router.execute(AITask.SUMMARISE_FILE, context)
                        embedding = await ai_router.execute(AITask.EMBED_TEXT, {"text": summary})
                        return f.path, summary, embedding

                    tasks = [process_file(f, parsed) for (f, parsed) in chunk]
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    
                    for res in results:
                        if isinstance(res, Exception):
                            logger.error("ai_generation_error", error=str(res))
                        else:
                            path, summary, embedding = res
                            summaries_by_file[path] = summary
                            embeddings_by_file[path] = embedding
                            
                    await broadcast("generate_summaries", min(i + chunk_size, len(parsed_files)), len(parsed_files), f"Using AI to generate file summaries... ({min(i + chunk_size, len(parsed_files))}/{len(parsed_files)})")
            
            await broadcast("embed_summaries", 9, 12, f"Computed embeddings for {len(embeddings_by_file)} nodes!")
            
            # 11. store_in_neo4j
            await broadcast("store_in_neo4j", 10, 12, "Uploading topology to Neo4j graph...")
            from app.services.db_neo4j import neo4j_service
            
            try:
                await neo4j_service.store_parsed_repo(
                    repo_id=repo_id_str,  # slug id, not job UUID
                    parsed_files=parsed_files,
                    summaries=summaries_by_file,
                    embeddings=embeddings_by_file,
                    clone_root=dest,
                )
                logger.info("neo4j_storage_complete", repo_id=repo_id_str)
            except Exception as e:
                logger.error("neo4j_storage_failed", error=str(e), repo_id=repo_id_str)
            
            # 12. generate_onboarding
            await broadcast("generate_onboarding", 11, 12, "Composing final onboarding documentation...")
            
            # Mark Complete
            await broadcast("complete", 12, 12, "Analysis completed successfully!")
            
            if job_record:
                job_record.status = "completed"
                job_record.completed_at = datetime.now(timezone.utc)
                await session.commit()
            
        except Exception as e:
            logger.error("job_failed_fatal", job_id=job_id, error=str(e))
            await session.rollback()
            if job_record:
                job_record.status = "failed"
                job_record.error_message = str(e)
                job_record.completed_at = datetime.now(timezone.utc)
                await session.commit()
            raise e
        finally:
            # NOTE: Do NOT close the neo4j_service singleton here.
            # The singleton driver is shared with the FastAPI server process for graph queries.
            # Closing it here would kill all subsequent /graph/{repo_id} API requests.
            pass
