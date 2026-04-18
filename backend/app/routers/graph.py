from fastapi import APIRouter, HTTPException
from typing import Optional
import structlog
from app.models.graph import GraphResponse, GraphNode, GraphEdge
from app.services.db_neo4j import neo4j_service

logger = structlog.get_logger()
router = APIRouter()

@router.get("/graph/check/{repo_id}")
async def check_graph_exists(repo_id: str):
    """Quick check: does Neo4j already have data for this repo?"""
    try:
        nodes, _ = await neo4j_service.get_graph_for_repo(repo_id)
        return {"exists": len(nodes) > 0, "node_count": len(nodes)}
    except Exception as e:
        logger.warning("graph_check_failed", repo_id=repo_id, error=str(e))
        return {"exists": False, "node_count": 0}

@router.get("/graph/{repo_id}")
async def get_graph(repo_id: str) -> GraphResponse:
    """
    Return the full graph for Three.js rendering using Neo4j.
    """
    logger.info("fetch_graph", repo_id=repo_id)
    
    try:
        nodes_data, edges_data = await neo4j_service.get_graph_for_repo(repo_id)
        
        # If no data found, return empty lists so the UI doesn't render confusing mock files
        if not nodes_data:
            logger.warning("no_data_in_neo4j", repo_id=repo_id)
            return GraphResponse(
                nodes=[],
                edges=[]
            )

        # Parse real data
        nodes = [GraphNode(**node) for node in nodes_data]
        edges = [GraphEdge(**edge) for edge in edges_data]

        return GraphResponse(nodes=nodes, edges=edges)

    except Exception as e:
        logger.error("error_fetching_graph", repo_id=repo_id, error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error while fetching graph data.")
