from sqlalchemy import Column, Integer, String, Text, Numeric, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import TimestampMixin


class TenderParticipation(Base, TimestampMixin):
    """
    SQLAlchemy model representing a company's participation in a specific tender.
    Captures quoted price, qualification status, and won/lost result.
    Enforces uniqueness: a company can only participate once in any specific tender.
    """
    __tablename__ = "tender_participations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tender_id = Column(Integer, ForeignKey("tenders.id", ondelete="RESTRICT"), index=True, nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="RESTRICT"), index=True, nullable=False)
    
    # Financial Bidding Information
    quoted_price = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    submission_date = Column(Date, nullable=False)

    # Status & Result
    # qualification_status: Qualified | Not Qualified | Pending Review
    qualification_status = Column(String(50), default="Pending Review", nullable=False)
    
    # participation_result: Won | Lost | Disqualified | Pending
    participation_result = Column(String(50), default="Pending", nullable=False)
    
    notes = Column(Text, nullable=True)

    # Table Constraints: same company cannot participate twice in the same tender
    __table_args__ = (
        UniqueConstraint("tender_id", "company_id", name="uq_tender_company_participation"),
    )

    # ORM Relationships
    tender = relationship("Tender", back_populates="participations")
    company = relationship("Company", back_populates="participations")

    def __repr__(self) -> str:
        return f"<TenderParticipation(id={self.id}, tender_id={self.tender_id}, company_id={self.company_id}, price={self.quoted_price}, result='{self.participation_result}')>"
