import time
import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import settings

logger = logging.getLogger("zentronyx.database")

# SQLite fallback support for local unit tests if DATABASE_URL starts with sqlite
IS_SQLITE = settings.DATABASE_URL.startswith("sqlite")

# Async Engine for FastAPI async requests
if IS_SQLITE:
    async_db_url = settings.DATABASE_URL.replace("sqlite://", "sqlite+aiosqlite://") if "aiosqlite" not in settings.DATABASE_URL else settings.DATABASE_URL
    async_engine = create_async_engine(
        async_db_url,
        echo=False,
        connect_args={"check_same_thread": False}
    )
else:
    async_engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Sync Engine for Alembic migrations and sync scripts
sync_db_url = settings.SYNC_DATABASE_URL
if IS_SQLITE:
    sync_engine = create_engine(settings.DATABASE_URL.replace("sqlite+aiosqlite://", "sqlite://"), connect_args={"check_same_thread": False})
else:
    sync_engine = create_engine(sync_db_url, pool_pre_ping=True)

SyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)


class Base(DeclarativeBase):
    """Base model class for all SQLAlchemy models."""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for providing async database session to API endpoints."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_database_connection() -> dict:
    """
    Executes a SELECT 1 query on the database to check connectivity and measure latency.
    Returns structured status dictionary.
    """
    start_time = time.time()
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT 1"))
            val = result.scalar()
            latency_ms = round((time.time() - start_time) * 1000, 2)
            if val == 1:
                return {"status": "healthy", "latency_ms": latency_ms, "details": "PostgreSQL connected"}
            else:
                return {"status": "unhealthy", "error": "Unexpected query response", "latency_ms": latency_ms}
    except Exception as e:
        latency_ms = round((time.time() - start_time) * 1000, 2)
        logger.error(f"Database health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "latency_ms": latency_ms,
            "details": "Could not establish database session. Check DATABASE_URL and database status."
        }
