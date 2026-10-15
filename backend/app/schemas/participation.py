from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator


class QualificationStatusEnum(str):
    QUALIFIED = "Qualified"
    NOT_QUALIFIED = "Not Qualified"
    PENDING_REVIEW = "Pending Review"


class ParticipationResultEnum(str):
    WON = "Won"
    LOST = "Lost"
    DISQUALIFIED = "Disqualified"
    PENDING = "Pending"


class ParticipationCreate(BaseModel):
    company_identifier: Optional[str] = Field(None, description="Company ID (e.g. COMP-001) or numeric ID string")
    company_id: Optional[int] = Field(None, description="Numeric Company ID")
    quoted_price: Decimal = Field(..., gt=0, description="Financial price quoted by the company (> 0)")
    currency: Optional[str] = Field(default="USD", max_length=10)
    submission_date: date
    qualification_status: str = Field(default="Pending Review", description="Qualified | Not Qualified | Pending Review")
    participation_result: str = Field(default="Pending", description="Won | Lost | Disqualified | Pending")
    notes: Optional[str] = Field(None, max_length=1000)

    @field_validator("qualification_status")
    @classmethod
    def validate_qualification(cls, v: str) -> str:
        allowed = ["Qualified", "Not Qualified", "Pending Review"]
        for item in allowed:
            if v.strip().lower() == item.lower():
                return item
        return "Pending Review"

    @field_validator("participation_result")
    @classmethod
    def validate_result(cls, v: str) -> str:
        allowed = ["Won", "Lost", "Disqualified", "Pending"]
        for item in allowed:
            if v.strip().lower() == item.lower():
                return item
        return "Pending"


class ParticipationUpdate(BaseModel):
    quoted_price: Optional[Decimal] = Field(None, gt=0)
    currency: Optional[str] = None
    submission_date: Optional[date] = None
    qualification_status: Optional[str] = None
    participation_result: Optional[str] = None
    notes: Optional[str] = None


class ParticipationResponse(BaseModel):
    id: int
    tender_id: int
    tender_id_code: str
    company_id: int
    company_id_code: str
    company_name: str
    registration_number: Optional[str] = None
    contact_email: Optional[str] = None
    quoted_price: float
    currency: str
    submission_date: date
    qualification_status: str
    participation_result: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TenderParticipantsSummaryResponse(BaseModel):
    tender_numeric_id: int
    tender_id_code: str
    tender_title: str
    tender_estimated_value: float
    tender_currency: str
    total_participants: int
    qualified_count: int
    not_qualified_count: int
    pending_review_count: int
    winner_company_name: Optional[str] = None
    winner_company_id: Optional[str] = None
    winner_quoted_price: Optional[float] = None
    participants: List[ParticipationResponse]
