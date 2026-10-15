from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field, field_validator, model_validator


class TenderStatusEnum(str, Enum):
    DRAFT = "Draft"
    PUBLISHED = "Published"
    CLOSED = "Closed"
    UNDER_EVALUATION = "Under Evaluation"
    AWARDED = "Awarded"
    CANCELLED = "Cancelled"


class TenderCategoryEnum(str, Enum):
    INFRASTRUCTURE = "Infrastructure"
    TRANSPORTATION = "Transportation"
    HEALTHCARE = "Healthcare & Medical Supplies"
    EDUCATION = "Education"
    IT = "Information Technology"
    UTILITIES = "Public Utilities"
    ENERGY = "Energy & Power"
    CIVIL_WORKS = "Civil Works"
    ENVIRONMENTAL = "Environmental Services"
    OTHER = "Other"


class TenderBase(BaseModel):
    tender_id: str = Field(..., min_length=3, max_length=64, description="Unique public tender identifier")
    title: str = Field(..., min_length=5, max_length=255, description="Official title of the tender")
    description: Optional[str] = Field(None, max_length=3000, description="Dossier scope and specifications")
    category: str = Field(..., description="Primary procurement sector")
    sub_category: Optional[str] = Field(None, max_length=100)
    procurement_authority: str = Field(..., min_length=3, max_length=200, description="Issuing agency or department")
    location: str = Field(..., min_length=2, max_length=150, description="Jurisdiction or geographic location")
    estimated_value: Decimal = Field(..., gt=0, description="Estimated budget value (> 0)")
    currency: str = Field(default="USD", max_length=10)
    publication_date: date
    submission_deadline: date
    opening_date: date
    status: str = Field(default="Published")

    @field_validator("tender_id")
    @classmethod
    def clean_tender_id(cls, v: str) -> str:
        clean = v.strip().upper()
        if not clean:
            raise ValueError("Tender ID cannot be empty.")
        return clean

    @field_validator("title")
    @classmethod
    def clean_title(cls, v: str) -> str:
        clean = v.strip()
        if len(clean) < 5:
            raise ValueError("Tender title must be at least 5 characters long.")
        return clean

    @model_validator(mode="after")
    def validate_date_sequence(self):
        if self.publication_date and self.submission_deadline:
            if self.submission_deadline < self.publication_date:
                raise ValueError("Submission deadline cannot be earlier than the publication date.")
        if self.submission_deadline and self.opening_date:
            if self.opening_date < self.submission_deadline:
                raise ValueError("Opening date cannot be earlier than the submission deadline.")
        return self


class TenderCreate(TenderBase):
    pass


class TenderUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = None
    sub_category: Optional[str] = None
    procurement_authority: Optional[str] = Field(None, min_length=3, max_length=200)
    location: Optional[str] = Field(None, min_length=2, max_length=150)
    estimated_value: Optional[Decimal] = Field(None, gt=0)
    currency: Optional[str] = Field(None, max_length=10)
    publication_date: Optional[date] = None
    submission_deadline: Optional[date] = None
    opening_date: Optional[date] = None
    status: Optional[str] = None

    @model_validator(mode="after")
    def validate_partial_dates(self):
        if self.publication_date and self.submission_deadline:
            if self.submission_deadline < self.publication_date:
                raise ValueError("Submission deadline cannot be earlier than the publication date.")
        if self.submission_deadline and self.opening_date:
            if self.opening_date < self.submission_deadline:
                raise ValueError("Opening date cannot be earlier than the submission deadline.")
        return self


class UserSummary(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True


class TenderResponse(BaseModel):
    id: int
    tender_id: str
    title: str
    description: Optional[str] = None
    category: str
    sub_category: Optional[str] = None
    procurement_authority: str
    location: str
    estimated_value: float
    currency: str
    publication_date: date
    submission_deadline: date
    opening_date: date
    status: str
    is_deleted: bool = False
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    creator: Optional[UserSummary] = None
    updater: Optional[UserSummary] = None
    created_at: datetime
    updated_at: datetime

    # Bidding and risk indicators
    bidders_count: int = 0
    risk_status: str = "Not Analyzed"

    class Config:
        from_attributes = True


class TenderListResponse(BaseModel):
    items: List[TenderResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
