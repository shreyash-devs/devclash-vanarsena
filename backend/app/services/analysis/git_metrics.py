"""
Per-file git signals used by the Intelligence HUD (last touch, churn, co-change, ownership).
Runs synchronously — call from asyncio.to_thread inside async pipelines.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import structlog
from git import Repo

logger = structlog.get_logger()


def _norm_path(p: str) -> str:
    return p.replace("\\", "/").strip()


def _expand_stats_file_keys(raw_key: str) -> list[str]:
    """GitPython stats keys may include rename pairs like `old/path => new/path`."""
    s = (raw_key or "").strip()
    if not s:
        return []
    if " => " in s:
        return [t for part in s.split(" => ") if (t := _norm_path(part.strip()))]

    t = _norm_path(s)
    return [t] if t else []


def _match_tracked_path(
    candidate: str, tracked: set[str], tracked_lower: dict[str, str]
) -> str | None:
    if candidate in tracked:
        return candidate
    return tracked_lower.get(candidate.lower())


def _primary_author_blame(repo: Repo, rel_path: str, max_lines: int = 500) -> str:
    try:
        counts: Counter[str] = Counter()
        n = 0
        for commit, lines in repo.blame("HEAD", rel_path):
            author = (commit.author.name or "Unknown").strip() or "Unknown"
            for _ in lines:
                counts[author] += 1
                n += 1
                if n >= max_lines:
                    break
        if not counts:
            return ""
        return counts.most_common(1)[0][0]
    except Exception as e:
        logger.debug("blame_failed", path=rel_path, error=str(e))
        return ""


def gather_git_file_intel(repo_dir: Path, rel_paths: list[str]) -> dict[str, dict[str, Any]]:
    """
    Build git-derived metrics for tracked repo-relative paths.

    Returns map: rel_path -> {
      last_modified: ISO8601 str | "",
      primary_author: str,
      change_frequency: int,  # commits touching file in last 90 days
      co_changed_with: list[str],  # top allies by same-commit co-change
      author_commit_hits: Counter[str],  # for fallback when blame skipped
    }
    """
    tracked = {_norm_path(p) for p in rel_paths if p}
    tracked_lower = {p.lower(): p for p in tracked}
    out: dict[str, dict[str, Any]] = {
        p: {
            "last_modified": "",
            "primary_author": "",
            "change_frequency": 0,
            "co_changed_with": [],
        }
        for p in tracked
    }
    if not tracked or not repo_dir.exists():
        return out

    try:
        repo = Repo(repo_dir)
    except Exception as e:
        logger.warning("git_repo_open_failed", path=str(repo_dir), error=str(e))
        return out

    now = datetime.now(timezone.utc)
    cutoff_90 = now - timedelta(days=90)

    last_modified_dt: dict[str, datetime] = {}
    change_frequency: Counter[str] = Counter()
    author_commit_hits: dict[str, Counter[str]] = defaultdict(Counter)
    co_counter: dict[str, Counter[str]] = defaultdict(Counter)

    max_commits = 4000
    n_commits = 0

    try:
        for commit in repo.iter_commits("HEAD", max_count=max_commits):
            n_commits += 1
            committed = commit.committed_datetime
            if committed.tzinfo is None:
                committed = committed.replace(tzinfo=timezone.utc)

            author = (commit.author.name or "Unknown").strip() or "Unknown"

            touched: list[str] = []
            try:
                for raw in commit.stats.files.keys():
                    for cand in _expand_stats_file_keys(raw):
                        hit = _match_tracked_path(cand, tracked, tracked_lower)
                        if hit:
                            touched.append(hit)
            except Exception:
                continue

            if not touched:
                continue

            for p in touched:
                if p not in last_modified_dt:
                    last_modified_dt[p] = committed
                author_commit_hits[p][author] += 1
                if committed >= cutoff_90:
                    change_frequency[p] += 1

            if len(touched) >= 2:
                for a in touched:
                    for b in touched:
                        if a != b:
                            co_counter[a][b] += 1

    except Exception as e:
        logger.warning("git_history_walk_failed", error=str(e))

    use_blame = len(tracked) <= 120

    for p in tracked:
        if p in last_modified_dt:
            out[p]["last_modified"] = last_modified_dt[p].isoformat()
        out[p]["change_frequency"] = int(change_frequency[p])

        hits = author_commit_hits.get(p, Counter())

        top_allies = [pair[0] for pair in co_counter.get(p, Counter()).most_common(12)]
        out[p]["co_changed_with"] = top_allies

        if use_blame:
            pa = _primary_author_blame(repo, p)
            if pa:
                out[p]["primary_author"] = pa
                continue
        if hits:
            out[p]["primary_author"] = hits.most_common(1)[0][0]
        else:
            out[p]["primary_author"] = ""

    logger.info(
        "git_intel_built",
        repo_dir=str(repo_dir),
        files=len(tracked),
        commits_scanned=n_commits,
        blame=use_blame,
    )
    return out
