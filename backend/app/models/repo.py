from pydantic import BaseModel
from typing import Optional, List, Tuple

class RepoMetadata(BaseModel):
    name: str
    primary_language: str
    star_count: int
    description: str
    total_file_count: int
    commit_count: int

class FileInfo(BaseModel):
    path: str
    extension: str
    size_kb: float
    content: str
    
class CommitInfo(BaseModel):
    hash: str
    message: str
    author: str
    date: str
    files_changed: List[str]

class ParsedFile(BaseModel):
    imports: List[Tuple[str, str]]  # (imported_module, import_type: 'local'|'external')
    exports: List[str]
    functions: List[Tuple[str, int, List[str]]]  # (name, line_number, calls)
    classes: List[Tuple[str, List[str]]]  # (name, methods)
    is_entry_point: bool
