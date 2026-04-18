from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
import uuid
import structlog

from app.config import Settings
from app.services.analysis.orchestrator import analyze_repo

logger = structlog.get_logger()
router = APIRouter()

class AnalyzeRequest(BaseModel):
    repo_url: str

class AnalyzeResponse(BaseModel):
    job_id: str
    status: str

# In-memory mock dictionary for job states
JOBS = {}

@router.post("/repos/analyze", response_model=AnalyzeResponse)
async def start_analysis(req: AnalyzeRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    JOBS[job_id] = "queued"
    
    async def wrapper():
        try:
            JOBS[job_id] = "running"
            await analyze_repo(
                repo_url=req.repo_url, 
                job_id=job_id, 
                settings=Settings(), 
                db=None, 
                ws_manager=None
            )
            JOBS[job_id] = "completed"
        except Exception as e:
            logger.error("job_wrapper_failed", error=str(e))
            JOBS[job_id] = "failed"
            
    background_tasks.add_task(wrapper)
    return AnalyzeResponse(job_id=job_id, status="queued")

@router.get("/repos/analyze/{job_id}", response_model=AnalyzeResponse)
async def get_analysis_status(job_id: str):
    if job_id not in JOBS:
        raise HTTPException(status_code=404, detail="Job not found")
    return AnalyzeResponse(job_id=job_id, status=JOBS[job_id])
