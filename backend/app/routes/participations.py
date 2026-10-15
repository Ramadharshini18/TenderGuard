from typing import Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.tender import Tender
from app.models.company import Company
from app.models.participation import TenderParticipation
from app.schemas.common import ApiResponse
from app.schemas.participation import (
    ParticipationCreate,
    ParticipationUpdate,
    ParticipationResponse,
    TenderParticipantsSummaryResponse,
)
from app.routes.deps import get_current_user

router = APIRouter(tags=["Tender Participations"])


def find_tender_helper(tender_id_or_id: str, db: Session) -> Tender:
    query = db.query(Tender).filter(Tender.is_deleted == False)
    if tender_id_or_id.isdigit():
        t = query.filter(Tender.id == int(tender_id_or_id)).first()
        if t:
            return t
    t = query.filter(Tender.tender_id == tender_id_or_id.strip().upper()).first()
    if not t:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tender '{tender_id_or_id}' was not found."
        )
    return t


def find_company_helper(company_identifier: str, db: Session) -> Company:
    query = db.query(Company).filter(Company.is_deleted == False)
    if company_identifier.isdigit():
        c = query.filter(Company.id == int(company_identifier)).first()
        if c:
            return c
    c = query.filter(Company.company_id == company_identifier.strip().upper()).first()
    if not c:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company '{company_identifier}' was not found in the directory."
        )
    return c


@router.get(
    "/tenders/{tender_id_or_id}/participants",
    response_model=ApiResponse[TenderParticipantsSummaryResponse],
    summary="List Tender Participating Companies",
    description="Returns all companies participating in a tender with quoted prices, qualification, and winner summary."
)
def get_tender_participants(
    tender_id_or_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[TenderParticipantsSummaryResponse]:
    tender = find_tender_helper(tender_id_or_id, db)

    participations = (
        db.query(TenderParticipation)
        .join(Company, TenderParticipation.company_id == Company.id)
        .filter(
            TenderParticipation.tender_id == tender.id,
            Company.is_deleted == False
        )
        .order_by(TenderParticipation.quoted_price.asc())
        .all()
    )

    qualified_count = 0
    not_qualified_count = 0
    pending_review_count = 0
    winner_name = None
    winner_id = None
    winner_price = None

    items = []
    for p in participations:
        c = p.company
        if p.qualification_status == "Qualified":
            qualified_count += 1
        elif p.qualification_status == "Not Qualified":
            not_qualified_count += 1
        else:
            pending_review_count += 1

        if p.participation_result == "Won":
            winner_name = c.company_name
            winner_id = c.company_id
            winner_price = float(p.quoted_price)

        items.append(
            ParticipationResponse(
                id=p.id,
                tender_id=tender.id,
                tender_id_code=tender.tender_id,
                company_id=c.id,
                company_id_code=c.company_id,
                company_name=c.company_name,
                registration_number=c.registration_number,
                contact_email=c.contact_email,
                quoted_price=float(p.quoted_price),
                currency=p.currency,
                submission_date=p.submission_date,
                qualification_status=p.qualification_status,
                participation_result=p.participation_result,
                notes=p.notes,
                created_at=p.created_at,
                updated_at=p.updated_at,
            )
        )

    summary = TenderParticipantsSummaryResponse(
        tender_numeric_id=tender.id,
        tender_id_code=tender.tender_id,
        tender_title=tender.title,
        tender_estimated_value=float(tender.estimated_value),
        tender_currency=tender.currency,
        total_participants=len(items),
        qualified_count=qualified_count,
        not_qualified_count=not_qualified_count,
        pending_review_count=pending_review_count,
        winner_company_name=winner_name,
        winner_company_id=winner_id,
        winner_quoted_price=winner_price,
        participants=items,
    )

    return ApiResponse[TenderParticipantsSummaryResponse](
        success=True,
        message=f"Retrieved {len(items)} participating companies for {tender.tender_id}.",
        data=summary,
    )


@router.post(
    "/tenders/{tender_id_or_id}/participants",
    response_model=ApiResponse[ParticipationResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Add Participating Company to Tender",
    description="Records a company's participation in a tender with their quoted price and qualification status."
)
def add_tender_participant(
    tender_id_or_id: str,
    payload: ParticipationCreate,
    override_winner: bool = Query(False, description="Set to true to reassign winner if another company is already marked as Won"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[ParticipationResponse]:
    tender = find_tender_helper(tender_id_or_id, db)
    target_ident = payload.company_identifier or str(payload.company_id) if (payload.company_identifier or payload.company_id) else None
    if not target_ident:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A company identifier or company_id must be provided."
        )
    company = find_company_helper(target_ident, db)

    # 1. Rule: Same company cannot participate twice in the same tender
    existing = db.query(TenderParticipation).filter(
        TenderParticipation.tender_id == tender.id,
        TenderParticipation.company_id == company.id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Company '{company.company_name}' ({company.company_id}) is already registered as a participant in tender {tender.tender_id}."
        )

    # 2. Rule: Quoted price must be > 0
    if payload.quoted_price <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quoted price must be greater than zero."
        )

    # 3. Rule: Check winner conflicts
    if payload.participation_result == "Won":
        existing_winner = (
            db.query(TenderParticipation)
            .join(Company, TenderParticipation.company_id == Company.id)
            .filter(
                TenderParticipation.tender_id == tender.id,
                TenderParticipation.participation_result == "Won"
            )
            .first()
        )
        if existing_winner:
            if not override_winner:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"This tender already has a recorded winner: '{existing_winner.company.company_name}' "
                        f"({existing_winner.company.company_id}). Please review the existing result before assigning another winner."
                    )
                )
            else:
                # Reassign previous winner to "Lost"
                existing_winner.participation_result = "Lost"

    # Create participation record
    new_p = TenderParticipation(
        tender_id=tender.id,
        company_id=company.id,
        quoted_price=payload.quoted_price,
        currency=payload.currency or tender.currency or "USD",
        submission_date=payload.submission_date,
        qualification_status=payload.qualification_status,
        participation_result=payload.participation_result,
        notes=payload.notes.strip() if payload.notes else None,
    )

    db.add(new_p)
    db.commit()
    db.refresh(new_p)

    resp = ParticipationResponse(
        id=new_p.id,
        tender_id=tender.id,
        tender_id_code=tender.tender_id,
        company_id=company.id,
        company_id_code=company.company_id,
        company_name=company.company_name,
        registration_number=company.registration_number,
        contact_email=company.contact_email,
        quoted_price=float(new_p.quoted_price),
        currency=new_p.currency,
        submission_date=new_p.submission_date,
        qualification_status=new_p.qualification_status,
        participation_result=new_p.participation_result,
        notes=new_p.notes,
        created_at=new_p.created_at,
        updated_at=new_p.updated_at,
    )

    return ApiResponse[ParticipationResponse](
        success=True,
        message=f"Added '{company.company_name}' to tender {tender.tender_id}.",
        data=resp,
    )


@router.get(
    "/participations/{participation_id}",
    response_model=ApiResponse[ParticipationResponse],
    summary="Get Participation Details",
    description="Retrieves a specific tender participation record."
)
def get_participation_detail(
    participation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[ParticipationResponse]:
    p = db.query(TenderParticipation).filter(TenderParticipation.id == participation_id).first()
    if not p:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Participation record with ID {participation_id} not found."
        )

    return ApiResponse[ParticipationResponse](
        success=True,
        data=ParticipationResponse(
            id=p.id,
            tender_id=p.tender.id,
            tender_id_code=p.tender.tender_id,
            company_id=p.company.id,
            company_id_code=p.company.company_id,
            company_name=p.company.company_name,
            registration_number=p.company.registration_number,
            contact_email=p.company.contact_email,
            quoted_price=float(p.quoted_price),
            currency=p.currency,
            submission_date=p.submission_date,
            qualification_status=p.qualification_status,
            participation_result=p.participation_result,
            notes=p.notes,
            created_at=p.created_at,
            updated_at=p.updated_at,
        ),
    )


@router.put(
    "/participations/{participation_id}",
    response_model=ApiResponse[ParticipationResponse],
    summary="Update Participation Details",
    description="Updates quoted price, qualification, or result for an existing tender participation."
)
def update_participation(
    participation_id: int,
    payload: ParticipationUpdate,
    override_winner: bool = Query(False, description="Set to true to reassign winner if another company is already marked as Won"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[ParticipationResponse]:
    p = db.query(TenderParticipation).filter(TenderParticipation.id == participation_id).first()
    if not p:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Participation record with ID {participation_id} not found."
        )

    # Check winner conflict if result is being updated to "Won"
    if payload.participation_result == "Won" and p.participation_result != "Won":
        existing_winner = (
            db.query(TenderParticipation)
            .join(Company, TenderParticipation.company_id == Company.id)
            .filter(
                TenderParticipation.tender_id == p.tender_id,
                TenderParticipation.id != p.id,
                TenderParticipation.participation_result == "Won"
            )
            .first()
        )
        if existing_winner:
            if not override_winner:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"This tender already has a recorded winner: '{existing_winner.company.company_name}' "
                        f"({existing_winner.company.company_id}). Set override_winner=true to reassign the winner."
                    )
                )
            else:
                existing_winner.participation_result = "Lost"

    if payload.quoted_price is not None:
        if payload.quoted_price <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quoted price must be greater than zero.")
        p.quoted_price = payload.quoted_price

    if payload.currency:
        p.currency = payload.currency
    if payload.submission_date:
        p.submission_date = payload.submission_date
    if payload.qualification_status:
        p.qualification_status = payload.qualification_status
    if payload.participation_result:
        p.participation_result = payload.participation_result
    if payload.notes is not None:
        p.notes = payload.notes.strip() if payload.notes else None

    db.commit()
    db.refresh(p)

    return ApiResponse[ParticipationResponse](
        success=True,
        message="Participation record updated successfully.",
        data=ParticipationResponse(
            id=p.id,
            tender_id=p.tender.id,
            tender_id_code=p.tender.tender_id,
            company_id=p.company.id,
            company_id_code=p.company.company_id,
            company_name=p.company.company_name,
            registration_number=p.company.registration_number,
            contact_email=p.company.contact_email,
            quoted_price=float(p.quoted_price),
            currency=p.currency,
            submission_date=p.submission_date,
            qualification_status=p.qualification_status,
            participation_result=p.participation_result,
            notes=p.notes,
            created_at=p.created_at,
            updated_at=p.updated_at,
        ),
    )


@router.delete(
    "/participations/{participation_id}",
    response_model=ApiResponse[dict],
    summary="Delete Participation Record",
    description="Removes a company's participation record from a tender."
)
@router.delete(
    "/tenders/{tender_id_or_id}/participants/{participation_id}",
    response_model=ApiResponse[dict],
    summary="Delete Tender Participant Alias",
    description="Alias route matching frontend client convention."
)
def delete_participation(
    participation_id: int,
    tender_id_or_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[dict]:
    p = db.query(TenderParticipation).filter(TenderParticipation.id == participation_id).first()
    if not p:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Participation record with ID {participation_id} not found."
        )

    t_code = p.tender.tender_id
    c_name = p.company.company_name

    db.delete(p)
    db.commit()

    return ApiResponse[dict](
        success=True,
        message=f"Removed participation record for '{c_name}' from tender {t_code}.",
        data={"deleted_id": participation_id}
    )
