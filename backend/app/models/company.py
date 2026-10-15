from sqlalchemy import Column, Integer, String, Text, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import TimestampMixin


class Company(Base, TimestampMixin):
    """
    SQLAlchemy model representing a participating company / contractor.
    Stored separately from tenders so a single corporate entity can participate across multiple tenders.
    Provides unique company_id for downstream bipartite graph modeling.
    """
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    company_id = Column(String(64), unique=True, index=True, nullable=False)
    company_name = Column(String(255), index=True, nullable=False)
    registration_number = Column(String(100), unique=True, nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), default="India", nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)

    # Relationships
    participations = relationship(
        "TenderParticipation",
        back_populates="company",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Company(id={self.id}, company_id='{self.company_id}', name='{self.company_name[:30]}')>"
