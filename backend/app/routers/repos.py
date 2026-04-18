from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.models.db import AnalysisJob, Repository
from typing import Optional
from pydantic import BaseModel
import structlog
from app.worker import analyze_repository
from urllib.parse import urlparse

logger = structlog.get_logger()
router = APIRouter()

class AnalyzeRequest(BaseModel):
    repo_url: str

class AnalyzeResponse(BaseModel):
    job_id: str
    status: str
    repo_id: Optional[str] = None
    files_processed: Optional[int] = 0
    total_files: Optional[int] = 0


def build_repo_id(repo_url: str) -> str:
    parsed = urlparse(repo_url)
    parts = [p for p in parsed.path.strip("/").split("/") if p]
    if len(parts) >= 2:
        owner = parts[0].lower()
        repo = parts[1].replace(".git", "").lower()
        return f"{owner}-{repo}"
    if parts:
        return parts[-1].replace(".git", "").lower()
    return "unknown-repo"

@router.post("/repos/analyze", response_model=AnalyzeResponse)
async def start_analysis(req: AnalyzeRequest, db: AsyncSession = Depends(get_db)):
    logger.info("triggering_celery_analysis", repo_url=req.repo_url)
    
    import uuid
    import traceback
    
    try:
        job_id = str(uuid.uuid4())
        repo_id = build_repo_id(req.repo_url)
        existing_repo_result = await db.execute(select(Repository).filter(Repository.url == req.repo_url))
        existing_repo = existing_repo_result.scalars().first()
        if existing_repo:
            repo_id = existing_repo.id
        
        # Track the initial task in PostgreSQL first so frontend progress bars work and worker doesn't miss it
        new_job = AnalysisJob(
            id=job_id,
            repo_id=None,  # Will be populated by Celery once Github metadata is fetched
            status="pending"
        )
        db.add(new_job)
        await db.commit()
        
        # Trigger Celery Task asynchronously
        analyze_repository.apply_async(args=[req.repo_url], task_id=job_id)
        
        return AnalyzeResponse(job_id=job_id, status="queued", repo_id=repo_id)
    except Exception as e:
        print("EXCEPTION CAUGHT IN START_ANALYSIS:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Error: {str(e)}")

@router.get("/repos/analyze/{job_id}", response_model=AnalyzeResponse)
async def get_analysis_status(job_id: str, db: AsyncSession = Depends(get_db)):
    # Query our persistent PostgreSQL record instead of the generic Celery state
    result = await db.execute(select(AnalysisJob).filter(AnalysisJob.id == job_id))
    job = result.scalars().first()
    
    if not job:
        # Fallback to Celery if Postgres hasn't synced yet (rare)
        from app.worker import celery_app
        res = celery_app.AsyncResult(job_id)
        return AnalyzeResponse(job_id=job_id, status=res.state.lower())
    
    # If DB status got stuck in a transient phase, trust terminal Celery states when available.
    if job.status in {"pending", "queued", "cloning", "clone", "init"}:
        from app.worker import celery_app
        res = celery_app.AsyncResult(job_id)
        celery_state = res.state.lower()
        if celery_state in {"success", "failure", "failed"}:
            resolved_status = "completed"
            if celery_state in {"failure", "failed"}:
                resolved_status = "failed"
            elif isinstance(res.result, dict) and str(res.result.get("status", "")).lower() == "failed":
                resolved_status = "failed"
            return AnalyzeResponse(
                job_id=job_id,
                status=resolved_status,
                repo_id=job.repo_id,
                files_processed=job.files_processed,
                total_files=job.total_files,
            )

    return AnalyzeResponse(
        job_id=job_id, 
        status=job.status,
        repo_id=job.repo_id,
        files_processed=job.files_processed,
        total_files=job.total_files
    )
