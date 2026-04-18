from pydantic import BaseModel
from typing import List, Optional, Tuple, Literal

class GraphNode(BaseModel):
    id: str
    position: Tuple[float, float, float]
    label: str
    type: Literal['file', 'dir']
    role: Literal['Entry', 'Core', 'Util']
    """Relative path from repo root for files; directory path for folder nodes (no trailing slash)."""
    path: Optional[str] = None

    # Additional analysis fields from backend
    impact_score: Optional[float] = 0.0
    size: Optional[float] = 2.0
    color: Optional[str] = "#FFFFFF"
    summary: Optional[str] = ""
    code: Optional[str] = ""
    in_degree: Optional[int] = 0
    out_degree: Optional[int] = 0
    is_orphan: Optional[bool] = False
    is_entry_point: Optional[bool] = False

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    type: Optional[str] = "imports"  # imports | calls | extends | contains

class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
