import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, desc
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.company import Company
from app.models.participation import TenderParticipation
from app.models.tender import Tender
from app.schemas.common import ApiResponse
from app.schemas.company import (
    CompanyCreate,
    CompanyUpdate,
    CompanyResponse,
    CompanyListResponse,
    CompanyHistoryItemResponse,
    CompanyHistoryResponse,
)
from app.routes.deps import get_current_user

router = APIRouter(prefix="/companies", tags=["Participating Companies"])


def find_company_by_id_or_code(company_id_or_id: str, db: Session) -> Company:
    """Helper to locate a company by numeric primary key or unique business company_id code."""
    query = db.query(Company).filter(Company.is_deleted == False)

    if company_id_or_id.isdigit():
        company = query.filter(Company.id == int(company_id_or_id)).first()
        if company:
            return company

    company = query.filter(Company.company_id == company_id_or_id.strip().upper()).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company '{company_id_or_id}' was not found in the registry."
        )
    return company


@router.get(
    "",
    response_model=ApiResponse[CompanyListResponse],
    summary="List and Search Participating Companies",
    description="Returns a paginated list of participating companies with search and location filtering."
)
def list_companies(
    search: Optional[str] = Query(None, description="Search by company name, ID, registration number, or city"),
    city: Optional[str] = Query(None, description="Filter by city"),
    state: Optional[str] = Query(None, description="Filter by state"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[CompanyListResponse]:
    query = db.query(Company).filter(Company.is_deleted == False)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Company.company_name.ilike(term),
                Company.company_id.ilike(term),
                Company.registration_number.ilike(term),
                Company.city.ilike(term),
                Company.contact_email.ilike(term),
            )
        )

    if city and city.strip():
        query = query.filter(Company.city.ilike(f"%{city.strip()}%"))

    if state and state.strip():
        query = query.filter(Company.state.ilike(f"%{state.strip()}%"))

    total_count = query.count()
    total_pages = math.ceil(total_count / page_size) if total_count > 0 else 1
    offset = (page - 1) * page_size

    companies = query.order_by(desc(Company.created_at)).offset(offset).limit(page_size).all()

    items = []
    for c in companies:
        p_count = db.query(TenderParticipation).filter(TenderParticipation.company_id == c.id).count()
        item = CompanyResponse(
            id=c.id,
            company_id=c.company_id,
            company_name=c.company_name,
            registration_number=c.registration_number,
            contact_email=c.contact_email,
            contact_phone=c.contact_phone,
            address=c.address,
            city=c.city,
            state=c.state,
            country=c.country,
            is_deleted=c.is_deleted,
            participations_count=p_count,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
        items.append(item)

    return ApiResponse[CompanyListResponse](
        success=True,
        message="Companies retrieved successfully.",
        data=CompanyListResponse(
            items=items,
            total=total_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
    )


@router.get(
    "/{company_id_or_id}",
    response_model=ApiResponse[CompanyResponse],
    summary="Get Company Profile",
    description="Retrieves a specific company's corporate details and total participation count."
)
def get_company(
    company_id_or_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[CompanyResponse]:
    c = find_company_by_id_or_code(company_id_or_id, db)
    p_count = db.query(TenderParticipation).filter(TenderParticipation.company_id == c.id).count()
    resp = CompanyResponse(
        id=c.id,
        company_id=c.company_id,
        company_name=c.company_name,
        registration_number=c.registration_number,
        contact_email=c.contact_email,
        contact_phone=c.contact_phone,
        address=c.address,
        city=c.city,
        state=c.state,
        country=c.country,
        is_deleted=c.is_deleted,
        participations_count=p_count,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )
    return ApiResponse[CompanyResponse](success=True, data=resp)


@router.post(
    "",
    response_model=ApiResponse[CompanyResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register New Company",
    description="Adds a new company to the contractor directory."
)
def create_company(
    payload: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[CompanyResponse]:
    clean_id = payload.company_id.strip().upper()

    # Check for duplicate company_id
    existing = db.query(Company).filter(
        Company.company_id == clean_id,
        Company.is_deleted == False
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Company with ID '{clean_id}' is already registered."
        )

    # Check registration_number uniqueness if provided
    if payload.registration_number and payload.registration_number.strip():
        clean_reg = payload.registration_number.strip()
        reg_existing = db.query(Company).filter(
            Company.registration_number == clean_reg,
            Company.is_deleted == False
        ).first()
        if reg_existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Company with registration number '{clean_reg}' already exists."
            )

    new_company = Company(
        company_id=clean_id,
        company_name=payload.company_name.strip(),
        registration_number=payload.registration_number.strip() if payload.registration_number else None,
        contact_email=payload.contact_email.strip().lower() if payload.contact_email else None,
        contact_phone=payload.contact_phone.strip() if payload.contact_phone else None,
        address=payload.address.strip() if payload.address else None,
        city=payload.city.strip() if payload.city else None,
        state=payload.state.strip() if payload.state else None,
        country=payload.country.strip() if payload.country else "India",
        is_deleted=False,
    )

    db.add(new_company)
    db.commit()
    db.refresh(new_company)

    resp = CompanyResponse(
        id=new_company.id,
        company_id=new_company.company_id,
        company_name=new_company.company_name,
        registration_number=new_company.registration_number,
        contact_email=new_company.contact_email,
        contact_phone=new_company.contact_phone,
        address=new_company.address,
        city=new_company.city,
        state=new_company.state,
        country=new_company.country,
        is_deleted=new_company.is_deleted,
        participations_count=0,
        created_at=new_company.created_at,
        updated_at=new_company.updated_at,
    )
    return ApiResponse[CompanyResponse](
        success=True,
        message=f"Company '{new_company.company_name}' registered successfully.",
        data=resp
    )


@router.put(
    "/{company_id_or_id}",
    response_model=ApiResponse[CompanyResponse],
    summary="Update Company",
    description="Updates corporate registration and contact details."
)
def update_company(
    company_id_or_id: str,
    payload: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[CompanyResponse]:
    c = find_company_by_id_or_code(company_id_or_id, db)

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None:
            if isinstance(val, str):
                setattr(c, field, val.strip())
            else:
                setattr(c, field, val)

    db.commit()
    db.refresh(c)

    p_count = db.query(TenderParticipation).filter(TenderParticipation.company_id == c.id).count()
    resp = CompanyResponse(
        id=c.id,
        company_id=c.company_id,
        company_name=c.company_name,
        registration_number=c.registration_number,
        contact_email=c.contact_email,
        contact_phone=c.contact_phone,
        address=c.address,
        city=c.city,
        state=c.state,
        country=c.country,
        is_deleted=c.is_deleted,
        participations_count=p_count,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )
    return ApiResponse[CompanyResponse](
        success=True,
        message=f"Company '{c.company_name}' updated successfully.",
        data=resp
    )


@router.delete(
    "/{company_id_or_id}",
    response_model=ApiResponse[dict],
    summary="Delete Company (Safe Check)",
    description="Deletes a company only if it has zero dependent participation records."
)
def delete_company(
    company_id_or_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[dict]:
    c = find_company_by_id_or_code(company_id_or_id, db)

    # Check for dependent participation records
    participations_count = db.query(TenderParticipation).filter(
        TenderParticipation.company_id == c.id
    ).count()

    if participations_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Cannot delete company '{c.company_name}' ({c.company_id}) because it has "
                f"{participations_count} active tender participation record(s). "
                "Historical bidding records must be preserved for auditability and graph integrity."
            )
        )

    # Soft delete the company
    c.is_deleted = True
    db.commit()

    return ApiResponse[dict](
        success=True,
        message=f"Company '{c.company_name}' ({c.company_id}) was removed successfully.",
        data={"company_id": c.company_id, "is_deleted": True}
    )


@router.get(
    "/{company_id_or_id}/participation-history",
    response_model=ApiResponse[CompanyHistoryResponse],
    summary="Company Tender Participation History",
    description="Returns all historical tenders where the company submitted quoted prices, qualifications, and outcomes."
)
def get_company_participation_history(
    company_id_or_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[CompanyHistoryResponse]:
    c = find_company_by_id_or_code(company_id_or_id, db)

    # Query all participations joining tender
    participations = (
        db.query(TenderParticipation)
        .join(Tender, TenderParticipation.tender_id == Tender.id)
        .filter(
            TenderParticipation.company_id == c.id,
            Tender.is_deleted == False
        )
        .order_by(desc(TenderParticipation.submission_date))
        .all()
    )

    history_items = []
    won_count = 0
    lost_count = 0

    for p in participations:
        t = p.tender
        if p.participation_result == "Won":
            won_count += 1
        elif p.participation_result == "Lost":
            lost_count += 1

        history_items.append(
            CompanyHistoryItemResponse(
                participation_id=p.id,
                tender_id_code=t.tender_id,
                tender_numeric_id=t.id,
                tender_title=t.title,
                tender_category=t.category,
                tender_status=t.status,
                tender_estimated_value=float(t.estimated_value),
                quoted_price=float(p.quoted_price),
                currency=p.currency,
                submission_date=p.submission_date,
                qualification_status=p.qualification_status,
                participation_result=p.participation_result,
                notes=p.notes,
                created_at=p.created_at,
            )
        )

    company_resp = CompanyResponse(
        id=c.id,
        company_id=c.company_id,
        company_name=c.company_name,
        registration_number=c.registration_number,
        contact_email=c.contact_email,
        contact_phone=c.contact_phone,
        address=c.address,
        city=c.city,
        state=c.state,
        country=c.country,
        is_deleted=c.is_deleted,
        participations_count=len(history_items),
        created_at=c.created_at,
        updated_at=c.updated_at,
    )

    return ApiResponse[CompanyHistoryResponse](
        success=True,
        message=f"Participation history for '{c.company_name}' retrieved successfully.",
        data=CompanyHistoryResponse(
            company=company_resp,
            history=history_items,
            total_participations=len(history_items),
            total_won=won_count,
            total_lost=lost_count,
        )
    )
