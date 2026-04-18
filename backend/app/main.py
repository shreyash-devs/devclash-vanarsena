import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
import httpx
import structlog

from app.config import Settings

logger = structlog.get_logger()
settings = Settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialise DB connections on startup
    logger.info("server_starting", role=settings.MACHINE_ROLE)
    
    from app.db.session import init_db
    try:
        await init_db()
        logger.info("postgres_initialized_successfully")
    except Exception as e:
        logger.error("postgres_initialization_failed", error=str(e))
    
    # Ping all Ollama hosts and log which are reachable
    reachable_hosts = []
    async with httpx.AsyncClient(timeout=3.0) as client:
        for host in settings.ollama_host_list:
            try:
                # Basic ping endpoint for Ollama
                resp = await client.get(f"{host}/api/tags")
                if resp.status_code == 200:
                    reachable_hosts.append(host)
                    logger.info("ollama_host_reachable", host=host)
                else:
                    logger.warning("ollama_host_unhealthy", host=host, status=resp.status_code)
            except Exception as e:
                # Handles the case where user doesn't have Ollama on their system
                logger.warning("ollama_host_unreachable", host=host, error=str(e))
                
    app.state.ollama_hosts = reachable_hosts
    # Placeholder for Neo4j database ready state
    app.state.neo4j_ready = False 
    
    yield
    
    # Gracefully close connections on shutdown
    logger.info("server_shutting_down")

app = FastAPI(lifespan=lifespan)

# CORS enabled for http://localhost:3000 and Vite (5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api/v1")

from app.routers import graph, repos
api_router.include_router(graph.router)
api_router.include_router(repos.router)

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "ollama_hosts": app.state.ollama_hosts,
        "neo4j": app.state.neo4j_ready
    }

# Ensure all future routers are mounted with /api/v1 prefix
app.include_router(api_router)
