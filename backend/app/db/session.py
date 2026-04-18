import structlog
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import Settings
from app.models.db import Base

logger = structlog.get_logger()
settings = Settings()

# Create the async engine for PostgreSQL
engine = create_async_engine(
    settings.POSTGRES_URL, 
    echo=False, 
    future=True
)

# Create session maker attached to the engine
async_session = async_sessionmaker(
    bind=engine, 
    class_=AsyncSession, 
    expire_on_commit=False,
    autoflush=False
)

async def init_db():
    """Create all physical tables in PostgreSQL dynamically based on SQLAlchemy models."""
    async with engine.begin() as conn:
        logger.info("creating_postgres_tables")
        # run_sync executes the synchronous SQLAlchemy 'create_all' within the async context manager
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    """Dependency injection wrapper to provide database session contexts per route."""
    async with async_session() as session:
        yield session
