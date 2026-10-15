from datetime import datetime
from sqlalchemy import Column, Integer, DateTime
from app.database import Base


class TimestampMixin:
    """Standard timestamp mixin for auditability across all entities."""
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
