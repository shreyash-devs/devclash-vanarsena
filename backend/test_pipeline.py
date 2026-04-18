import asyncio
from pathlib import Path
from app.config import Settings
from app.services.github_service import GitHubService
from app.services.analysis.ast_parser import ASTParser

async def test_all():
    settings = Settings()
    gh = GitHubService()
    parser = ASTParser()
    
    url = "https://github.com/tiangolo/fastapi"
    # We will test cloning a very small repo instead to save time
    url = "https://github.com/octocat/Hello-World"
    dest = Path("d:/Devclash hackathon/backend/.cache/test_job")
    
    print(f"Cloning {url}...")
    meta = await gh.clone_repo(url, dest)
    print("Metadata:", meta)
    
    files = await gh.get_files(dest, settings)
    print(f"Extracted {len(files)} files")
    
    for f in files:
        parsed = parser.parse_file(f)
        print(f"Parsed {f.path}: {len(parsed.functions)} functions, {len(parsed.classes)} classes")

if __name__ == "__main__":
    asyncio.run(test_all())
