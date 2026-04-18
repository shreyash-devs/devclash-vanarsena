from pydantic import BaseModel
from typing import List, Optional

class GraphNode(BaseModel):
    id: str
    label: str
    tier: str # 'entry', 'logic', 'util', 'config'
    impact_score: float
    size: float
    x: float
    y: float
    z: float
    color: str
    summary: str
    in_degree: int
    out_degree: int
    is_orphan: bool
    is_entry_point: bool

class GraphEdge(BaseModel):
    source: str
    target: str
    type: str # 'imports', 'calls', 'extends'

class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
