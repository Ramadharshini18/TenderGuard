from sqlalchemy import Column, Integer, String, Text, Numeric, Date, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import TimestampMixin


class Tender(Base, TimestampMixin):
    """
    SQLAlchemy model representing a public procurement tender notice.
    Designed with stable unique 'tender_id' for downstream bipartite graph modeling.
    Soft-delete is enforced to preserve relationship integrity with future bids and bidders.
    """
    __tablename__ = "tenders"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tender_id = Column(String(64), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), index=True, nullable=False)
    sub_category = Column(String(100), nullable=True)
    procurement_authority = Column(String(200), index=True, nullable=False)
    location = Column(String(150), nullable=False)
    estimated_value = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(10), default="USD", nullable=False)

    # Lifecycle Dates
    publication_date = Column(Date, nullable=False)
    submission_deadline = Column(Date, nullable=False)
    opening_date = Column(Date, nullable=False)

    # Status: Draft | Published | Closed | Under Evaluation | Awarded | Cancelled
    status = Column(String(50), default="Published", index=True, nullable=False)

    # Soft Delete Flag
    is_deleted = Column(Boolean, default=False, index=True, nullable=False)

    # Audit tracking
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # ORM Relationships
    creator = relationship("User", foreign_keys=[created_by], lazy="joined")
    updater = relationship("User", foreign_keys=[updated_by], lazy="joined")
    participations = relationship("TenderParticipation", back_populates="tender", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Tender(id={self.id}, tender_id='{self.tender_id}', title='{self.title[:30]}', status='{self.status}')>"
