import logging
import os
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import settings

logger = logging.getLogger("tenderguard.database")

# Declarative Base for SQLAlchemy models
Base = declarative_base()

# Determine active database engine with fallback capability
active_engine = None
active_session_maker = None
is_using_fallback = False

def init_engine():
    global active_engine, active_session_maker, is_using_fallback
    
    postgres_url = settings.sync_database_url
    try:
        # Test if PostgreSQL is reachable
        test_engine = create_engine(
            postgres_url,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 3} if "sqlite" not in postgres_url else {}
        )
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        active_engine = test_engine
        active_session_maker = sessionmaker(autocommit=False, autoflush=False, bind=active_engine)
        is_using_fallback = False
        logger.info(f"Connected successfully to PostgreSQL: {settings.POSTGRES_DB}@{settings.POSTGRES_HOST}")
    except Exception as e:
        logger.warning(
            f"PostgreSQL at {settings.POSTGRES_HOST}:{settings.POSTGRES_PORT} is unreachable ({e}). "
            "Activating local SQLite database for development persistence..."
        )
        sqlite_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "tenderguard_dev.db")
        sqlite_url = f"sqlite:///{sqlite_path}"
        active_engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
        active_session_maker = sessionmaker(autocommit=False, autoflush=False, bind=active_engine)
        is_using_fallback = True
        logger.info(f"Local development SQLite database initialized at {sqlite_path}")

init_engine()

# Export engine and SessionLocal for models and migrations
engine = active_engine
SessionLocal = active_session_maker


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency for yielding database sessions.
    Automatically closes session on request completion.
    """
    if SessionLocal is None:
        raise RuntimeError("Database session factory is not configured.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connectivity() -> dict:
    """
    Health-check utility function to inspect database connectivity status.
    """
    if engine is None:
        return {
            "status": "unconfigured",
            "connected": False,
            "message": "Database engine not initialized."
        }
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        db_type = "SQLite (Dev Fallback)" if is_using_fallback else "PostgreSQL"
        return {
            "status": "connected",
            "connected": True,
            "database_type": db_type,
            "message": f"{db_type} database connected and operational."
        }
    except Exception as e:
        logger.debug(f"Database ping failed: {str(e)}")
        return {
            "status": "disconnected",
            "connected": False,
            "message": f"Database unreachable: {str(e)[:120]}"
        }
