import asyncio
from sqlalchemy import select
from app.db.session import async_session
from app.models.db import AnalysisJob

async def check():
    async with async_session() as session:
        result = await session.execute(select(AnalysisJob))
        jobs = result.scalars().all()
        for j in jobs:
            print(f"[{j.id}] status={j.status} repo={j.repo_id} files={j.files_processed}/{j.total_files} started={j.started_at} err={j.error_message}")

if __name__ == "__main__":
    asyncio.run(check())
