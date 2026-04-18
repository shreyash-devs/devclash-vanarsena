import asyncio
from pathlib import Path
import git
import httpx
import os
import stat
import shutil
from urllib.parse import urlparse
from structlog import get_logger

from app.models.repo import RepoMetadata, FileInfo, CommitInfo
from app.config import Settings

logger = get_logger()

class GitHubService:
    async def clone_repo(self, url: str, dest: Path) -> RepoMetadata:
        """
        Clone the repo using gitpython.
        Extract metadata including github stars if available.
        """
        logger.info("cloning_repo", url=url, dest=str(dest))
        
        def remove_readonly(func, path, excinfo):
            os.chmod(path, stat.S_IWRITE)
            func(path)
            
        if dest.exists():
            await asyncio.to_thread(shutil.rmtree, dest, onerror=remove_readonly)
            
        dest.mkdir(parents=True, exist_ok=True)
        
        try:
            repo = await asyncio.to_thread(git.Repo.clone_from, url, dest)
        except Exception as e:
            logger.error("clone_failed", error=str(e))
            raise ValueError(f"Failed to clone repository: {url}")
            
        def get_file_count():
            return len([f for f in dest.rglob("*") if f.is_file() and ".git" not in str(f)])
            
        total_file_count = await asyncio.to_thread(get_file_count)
        commit_count = await asyncio.to_thread(lambda: len(list(repo.iter_commits('HEAD'))))
        
        repo_name = Path(urlparse(url).path).stem
        primary_language = "Unknown"
        star_count = 0
        description = "Analysis target"
        
        if "github.com" in url:
            parts = urlparse(url).path.strip("/").split("/")
            if len(parts) >= 2:
                owner, repo_str = parts[0], parts[1].replace(".git", "")
                repo_name = repo_str
                
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.get(f"https://api.github.com/repos/{owner}/{repo_name}")
                    if resp.status_code == 200:
                        data = resp.json()
                        primary_language = data.get("language") or "Unknown"
                        star_count = data.get("stargazers_count", 0)
                        description = data.get("description", "") or ""
                        
        return RepoMetadata(
            name=repo_name,
            primary_language=primary_language,
            star_count=star_count,
            description=description,
            total_file_count=total_file_count,
            commit_count=commit_count
        )

    async def get_files(self, repo_path: Path, settings: Settings) -> list[FileInfo]:
        """
        Walks the repository directory tree adhering to strict constraints:
        - Must be in SUPPORTED_EXTENSIONS
        - Must skip node_modules/venv/.git/__pycache__
        - Must skip files larger than MAX_FILE_SIZE_KB
        - Capped at MAX_FILES_PER_REPO logic
        """
        ignore_dirs = {".git", "node_modules", "venv", ".venv", "__pycache__", "dist", "build"}
        
        def walk_files():
            files_found = []
            for filepath in repo_path.rglob("*"):
                if filepath.is_file():
                    parts = filepath.parts
                    if any(ig in parts for ig in ignore_dirs):
                        continue
                        
                    ext = filepath.suffix.lower()
                    if ext not in settings.SUPPORTED_EXTENSIONS:
                        continue
                        
                    size_kb = filepath.stat().st_size / 1024
                    if size_kb > settings.MAX_FILE_SIZE_KB:
                        continue
                        
                    try:
                        content = filepath.read_text(encoding="utf-8")
                        files_found.append({
                            "path": str(filepath.relative_to(repo_path)).replace("\\", "/"),
                            "abs_path": filepath,
                            "ext": ext,
                            "size_kb": size_kb,
                            "content": content
                        })
                    except Exception:
                        continue
            return files_found
            
        all_files = await asyncio.to_thread(walk_files)
        
        entry_points = {"main", "index", "app", "server", "wsgi", "asgi"}
        
        # Sort: entry_points first, then largest to smallest
        def sort_key(f):
            stem = f["abs_path"].stem.lower()
            is_entry = stem in entry_points
            return (not is_entry, -f["size_kb"])
            
        all_files.sort(key=sort_key)
        capped = all_files[:settings.MAX_FILES_PER_REPO]
        
        return [FileInfo(
            path=f["path"],
            extension=f["ext"],
            size_kb=f["size_kb"],
            content=f["content"]
        ) for f in capped]

    async def get_commit_history(self, repo_path: Path, limit=100) -> list[CommitInfo]:
        def extract_commits():
            try:
                repo = git.Repo(repo_path)
                commits = []
                for commit in repo.iter_commits('HEAD', max_count=limit):
                    files_changed = list(commit.stats.files.keys())
                    commits.append(CommitInfo(
                        hash=commit.hexsha,
                        message=commit.message.strip(),
                        author=commit.author.name,
                        date=commit.authored_datetime.isoformat(),
                        files_changed=files_changed
                    ))
                return commits
            except Exception as e:
                logger.error("commit_history_fail", error=str(e))
                return []
                
        return await asyncio.to_thread(extract_commits)
