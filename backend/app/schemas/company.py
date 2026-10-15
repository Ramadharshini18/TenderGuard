from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator, EmailStr


class CompanyBase(BaseModel):
    company_id: str = Field(..., min_length=2, max_length=64, description="Unique contractor/company identifier")
    company_name: str = Field(..., min_length=2, max_length=255, description="Full corporate registered name")
    registration_number: Optional[str] = Field(None, max_length=100, description="Official government registration / tax ID")
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(default="India", max_length=100)

    @field_validator("company_id")
    @classmethod
    def clean_company_id(cls, v: str) -> str:
        clean = v.strip().upper()
        if not clean:
            raise ValueError("Company ID cannot be blank.")
        return clean

    @field_validator("company_name")
    @classmethod
    def clean_company_name(cls, v: str) -> str:
        clean = v.strip()
        if len(clean) < 2:
            raise ValueError("Company name must be at least 2 characters.")
        return clean


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    company_name: Optional[str] = Field(None, min_length=2, max_length=255)
    registration_number: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None


class CompanyResponse(BaseModel):
    id: int
    company_id: str
    company_name: str
    registration_number: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    is_deleted: bool = False
    participations_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CompanyListResponse(BaseModel):
    items: List[CompanyResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class CompanyHistoryItemResponse(BaseModel):
    participation_id: int
    tender_id_code: str
    tender_numeric_id: int
    tender_title: str
    tender_category: str
    tender_status: str
    tender_estimated_value: float
    quoted_price: float
    currency: str
    submission_date: date
    qualification_status: str
    participation_result: str
    notes: Optional[str] = None
    created_at: datetime


class CompanyHistoryResponse(BaseModel):
    company: CompanyResponse
    history: List[CompanyHistoryItemResponse]
    total_participations: int
    total_won: int
    total_lost: int
