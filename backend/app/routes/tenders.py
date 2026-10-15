import math
from datetime import date
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, and_, asc, desc
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.tender import Tender
from app.schemas.common import ApiResponse
from app.schemas.tender import (
    TenderCreate,
    TenderUpdate,
    TenderResponse,
    TenderListResponse,
)
from app.routes.deps import get_current_user

router = APIRouter(prefix="/tenders", tags=["Tenders"])

ALLOWED_SORT_FIELDS = {
    "tender_id": Tender.tender_id,
    "title": Tender.title,
    "estimated_value": Tender.estimated_value,
    "publication_date": Tender.publication_date,
    "submission_deadline": Tender.submission_deadline,
    "status": Tender.status,
    "created_at": Tender.created_at,
}


def find_tender_by_id_or_code(tender_id_or_id: str, db: Session, include_deleted: bool = False) -> Tender:
    """Helper to locate a tender by numeric ID or business tender_id code."""
    query = db.query(Tender)
    if not include_deleted:
        query = query.filter(Tender.is_deleted == False)

    # Check if input is integer primary key
    if tender_id_or_id.isdigit():
        tender = query.filter(Tender.id == int(tender_id_or_id)).first()
        if tender:
            return tender

    # Query by string tender_id (e.g. TND-2026-001)
    tender = query.filter(Tender.tender_id == tender_id_or_id.strip().upper()).first()
    if not tender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tender '{tender_id_or_id}' was not found in the registry."
        )
    return tender


@router.get(
    "",
    response_model=ApiResponse[TenderListResponse],
    summary="List and Search Tenders",
    description="Returns a paginated list of procurement tenders with multi-criteria filtering and sorting."
)
def list_tenders(
    search: Optional[str] = Query(None, description="Search term for ID, title, authority, location, or category"),
    category: Optional[str] = Query(None, description="Filter by sector category"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by controlled status"),
    min_value: Optional[float] = Query(None, ge=0, description="Minimum estimated budget value"),
    max_value: Optional[float] = Query(None, ge=0, description="Maximum estimated budget value"),
    from_date: Optional[date] = Query(None, description="Filter tenders published on or after this date"),
    to_date: Optional[date] = Query(None, description="Filter tenders with deadline on or before this date"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort direction"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[TenderListResponse]:
    # Base query excluding soft-deleted records
    query = db.query(Tender).filter(Tender.is_deleted == False)

    # 1. Search filter across text columns
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Tender.tender_id.ilike(term),
                Tender.title.ilike(term),
                Tender.procurement_authority.ilike(term),
                Tender.location.ilike(term),
                Tender.category.ilike(term),
            )
        )

    # 2. Exact match filters
    if category and category.strip() and category != "All":
        query = query.filter(Tender.category == category.strip())

    if status_filter and status_filter.strip() and status_filter != "All":
        query = query.filter(Tender.status == status_filter.strip())

    # 3. Numeric range filters
    if min_value is not None:
        query = query.filter(Tender.estimated_value >= Decimal(str(min_value)))
    if max_value is not None:
        query = query.filter(Tender.estimated_value <= Decimal(str(max_value)))

    # 4. Date range filters
    if from_date:
        query = query.filter(Tender.publication_date >= from_date)
    if to_date:
        query = query.filter(Tender.submission_deadline <= to_date)

    # 5. Total count before pagination
    total_count = query.count()

    # 6. Safe sorting
    sort_column = ALLOWED_SORT_FIELDS.get(sort_by, Tender.created_at)
    if sort_order.lower() == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    # 7. Pagination
    total_pages = math.ceil(total_count / page_size) if total_count > 0 else 1
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    # Convert to response schemas with dynamic participant count
    serialized_items = []
    for item in items:
        resp = TenderResponse.model_validate(item)
        resp.bidders_count = len(item.participations)
        serialized_items.append(resp)

    return ApiResponse[TenderListResponse](
        success=True,
        message="Tenders retrieved successfully.",
        data=TenderListResponse(
            items=serialized_items,
            total=total_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    )


@router.get(
    "/{tender_id_or_id}",
    response_model=ApiResponse[TenderResponse],
    summary="Get Tender Details",
    description="Retrieves a complete tender dossier by numeric ID or business tender_id."
)
def get_tender_detail(
    tender_id_or_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[TenderResponse]:
    tender = find_tender_by_id_or_code(tender_id_or_id, db)
    resp = TenderResponse.model_validate(tender)
    resp.bidders_count = len(tender.participations)
    return ApiResponse[TenderResponse](
        success=True,
        message="Tender dossier retrieved.",
        data=resp
    )


@router.post(
    "",
    response_model=ApiResponse[TenderResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create New Tender",
    description="Registers a new procurement tender notice and associates it with the authenticated administrator."
)
def create_tender(
    payload: TenderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[TenderResponse]:
    clean_id = payload.tender_id.strip().upper()

    # Check for duplicate active tender_id
    existing = db.query(Tender).filter(
        and_(Tender.tender_id == clean_id, Tender.is_deleted == False)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tender with ID '{clean_id}' already exists in the system."
        )

    new_tender = Tender(
        tender_id=clean_id,
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else None,
        category=payload.category.strip(),
        sub_category=payload.sub_category.strip() if payload.sub_category else None,
        procurement_authority=payload.procurement_authority.strip(),
        location=payload.location.strip(),
        estimated_value=payload.estimated_value,
        currency=payload.currency.strip().upper(),
        publication_date=payload.publication_date,
        submission_deadline=payload.submission_deadline,
        opening_date=payload.opening_date,
        status=payload.status.strip(),
        is_deleted=False,
        created_by=current_user.id,
        updated_by=current_user.id,
    )

    db.add(new_tender)
    db.commit()
    db.refresh(new_tender)

    return ApiResponse[TenderResponse](
        success=True,
        message=f"Tender '{clean_id}' registered successfully.",
        data=TenderResponse.model_validate(new_tender)
    )


@router.put(
    "/{tender_id_or_id}",
    response_model=ApiResponse[TenderResponse],
    summary="Update Existing Tender",
    description="Updates procurement tender specifications and updates the audit modifier."
)
def update_tender(
    tender_id_or_id: str,
    payload: TenderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[TenderResponse]:
    tender = find_tender_by_id_or_code(tender_id_or_id, db)

    # Apply updates for provided fields
    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None:
            if isinstance(val, str):
                setattr(tender, field, val.strip())
            else:
                setattr(tender, field, val)

    tender.updated_by = current_user.id
    db.commit()
    db.refresh(tender)

    return ApiResponse[TenderResponse](
        success=True,
        message=f"Tender '{tender.tender_id}' updated successfully.",
        data=TenderResponse.model_validate(tender)
    )


@router.delete(
    "/{tender_id_or_id}",
    response_model=ApiResponse[dict],
    summary="Delete Tender (Soft Delete)",
    description="Soft deletes a tender from active registry while preserving downstream relationship integrity."
)
def delete_tender(
    tender_id_or_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[dict]:
    tender = find_tender_by_id_or_code(tender_id_or_id, db)

    # Perform soft-delete
    tender.is_deleted = True
    tender.updated_by = current_user.id
    db.commit()

    return ApiResponse[dict](
        success=True,
        message=f"Tender '{tender.tender_id}' has been removed successfully.",
        data={"tender_id": tender.tender_id, "is_deleted": True}
    )
