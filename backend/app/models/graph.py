from pydantic import BaseModel
from typing import List, Optional, Tuple, Literal

IntelSignal = Literal["risk", "structure", "stable"]


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
    """Hex tint for 3D blocks — driven by analysis (churn / structure / stability)."""
    intel_signal: Optional[IntelSignal] = None
    summary: Optional[str] = ""
    code: Optional[str] = ""
    in_degree: Optional[int] = 0
    out_degree: Optional[int] = 0
    is_orphan: Optional[bool] = False
    is_entry_point: Optional[bool] = False

    # Intelligence HUD — structure / churn / risk
    line_count: Optional[int] = 0
    function_count: Optional[int] = 0
    class_count: Optional[int] = 0
    export_count: Optional[int] = 0
    language: Optional[str] = ""
    last_modified: Optional[str] = ""
    primary_author: Optional[str] = ""
    change_frequency: Optional[int] = 0
    circular_dep: Optional[bool] = False
    external_deps: Optional[list[str]] = None
    co_changed_with: Optional[list[str]] = None
    symbols: Optional[list[str]] = None

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    type: Optional[str] = "imports"  # imports | calls | extends | contains

class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
