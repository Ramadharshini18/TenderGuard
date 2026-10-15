from sqlalchemy import Column, Integer, String, Boolean
from app.database import Base
from app.models.base import TimestampMixin


class User(Base, TimestampMixin):
    """
    SQLAlchemy model representing system users and administrators.
    Enforces uniqueness on email and uses bcrypt hashing for password storage.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="admin", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}', is_active={self.is_active})>"
