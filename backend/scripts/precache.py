import httpx
import asyncio
import time

DEMO_REPOS = [
    "https://github.com/expressjs/express",
    "https://github.com/tiangolo/fastapi",
]

async def precache():
    print("Starting Precache Task...")
    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. POST /api/v1/repos/analyze
        jobs = {}
        for repo in DEMO_REPOS:
            print(f"Submitting {repo} for analysis...")
            try:
                resp = await client.post("http://localhost:8000/api/v1/repos/analyze", json={"repo_url": repo})
                if resp.status_code == 200:
                    job_id = resp.json()["job_id"]
                    jobs[repo] = job_id
                    print(f" -> Queued as Job: {job_id}")
                else:
                    print(f" -> Failed to queue {repo}: {resp.status_code} {resp.text}")
            except Exception as e:
                print(f" -> Connection error for {repo}: {e}")

        # 2. Poll job status until complete
        pending = list(jobs.keys())
        while pending:
            time.sleep(2)
            for repo in pending[:]:
                job_id = jobs[repo]
                try:
                    poll = await client.get(f"http://localhost:8000/api/v1/repos/analyze/{job_id}")
                    if poll.status_code == 200:
                        status = poll.json()["status"]
                        print(f"[{repo}] Status: {status}")
                        if status in ["completed", "failed"]:
                            pending.remove(repo)
                            # 3. Print summary
                            print(f"\n=> Finished {repo} with final status: {status}\n")
                except Exception as e:
                    print(f"[{repo}] Polling error: {e}")

if __name__ == "__main__":
    asyncio.run(precache())
