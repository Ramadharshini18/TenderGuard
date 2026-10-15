from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.routes.deps import get_current_user
from app.services.pattern_service import PatternAnalysisService
from app.schemas.common import ApiResponse
from app.schemas.pattern import (
    DataSufficiencyResponse,
    PatternSummaryResponse,
    CompanyRelationshipItem,
    CompanyPairDetailResponse,
    CompanyFrequencyItem,
    UnusualPatternItem,
    TenderPatternSummaryResponse,
)

router = APIRouter(prefix="/patterns", tags=["Pattern Analysis"])


@router.get(
    "/data-sufficiency",
    response_model=ApiResponse[DataSufficiencyResponse],
    summary="Check Historical Data Sufficiency",
    description="Validates whether there are enough tenders and bidding records in the database to run pattern analysis."
)
def get_data_sufficiency(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[DataSufficiencyResponse]:
    service = PatternAnalysisService(db)
    res = service.check_data_sufficiency()
    return ApiResponse[DataSufficiencyResponse](
        success=True,
        message="Historical data sufficiency evaluated.",
        data=res
    )


@router.get(
    "/summary",
    response_model=ApiResponse[PatternSummaryResponse],
    summary="Pattern Analysis Dashboard Summary Metrics",
    description="Returns aggregate KPI counts: total tenders, analyzed companies, repeated company pairs, and unusual patterns."
)
def get_pattern_summary(
    threshold_pct: float = Query(5.0, ge=0.5, le=50.0, description="Percentage threshold for similar quoted price detection"),
    from_date: Optional[date] = Query(None, description="Start date filter"),
    to_date: Optional[date] = Query(None, description="End date filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[PatternSummaryResponse]:
    service = PatternAnalysisService(db)
    res = service.get_summary(threshold_pct=threshold_pct, from_date=from_date, to_date=to_date)
    return ApiResponse[PatternSummaryResponse](
        success=True,
        message="Summary metrics retrieved successfully.",
        data=res
    )


@router.get(
    "/company-relationships",
    response_model=ApiResponse[List[CompanyRelationshipItem]],
    summary="List Repeated Company Co-Bidding Relationships",
    description="Identifies pairs of companies participating together in multiple tenders (default shared >= 2)."
)
def get_company_relationships(
    min_shared: int = Query(2, ge=2, description="Minimum shared tenders required to flag a pair"),
    threshold_pct: float = Query(5.0, ge=0.5, le=50.0, description="Similar price threshold percentage"),
    company_id: Optional[int] = Query(None, description="Filter for relationships involving a specific company"),
    from_date: Optional[date] = Query(None, description="Start date filter"),
    to_date: Optional[date] = Query(None, description="End date filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[List[CompanyRelationshipItem]]:
    service = PatternAnalysisService(db)
    res = service.get_company_relationships(
        min_shared=min_shared,
        threshold_pct=threshold_pct,
        company_filter_id=company_id,
        from_date=from_date,
        to_date=to_date,
    )
    return ApiResponse[List[CompanyRelationshipItem]](
        success=True,
        message=f"Found {len(res)} company pairs with >= {min_shared} shared tenders.",
        data=res
    )


@router.get(
    "/company-relationships/{company_a_id}/{company_b_id}",
    response_model=ApiResponse[CompanyPairDetailResponse],
    summary="Tender Breakdown Comparison for Company Pair",
    description="Compares Company A and Company B across all shared tenders, displaying quoted prices, price difference %, and award results."
)
def get_company_pair_detail(
    company_a_id: int,
    company_b_id: int,
    threshold_pct: float = Query(5.0, ge=0.5, le=50.0, description="Similar price threshold percentage"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[CompanyPairDetailResponse]:
    service = PatternAnalysisService(db)
    res = service.get_company_pair_detail(
        company_a_id=company_a_id,
        company_b_id=company_b_id,
        threshold_pct=threshold_pct,
    )
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or both companies were not found in the registry."
        )
    return ApiResponse[CompanyPairDetailResponse](
        success=True,
        message="Company pair breakdown retrieved.",
        data=res
    )


@router.get(
    "/company-frequencies",
    response_model=ApiResponse[List[CompanyFrequencyItem]],
    summary="Company Participation Frequencies and Win Rates",
    description="Calculates total tenders participated, wins, losses, disqualifications, and win rate percentage per company."
)
def get_company_frequencies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[List[CompanyFrequencyItem]]:
    service = PatternAnalysisService(db)
    res = service.get_company_frequencies()
    return ApiResponse[List[CompanyFrequencyItem]](
        success=True,
        message=f"Retrieved participation frequency for {len(res)} companies.",
        data=res
    )


@router.get(
    "/unusual",
    response_model=ApiResponse[List[UnusualPatternItem]],
    summary="List Flagged Unusual Patterns for AI Review",
    description="Catalog of bidding patterns (Repeated Participation, Similar Quoted Prices, Repeated Winner Changes) marked for AI Risk Analysis and GNN review."
)
def get_unusual_patterns(
    threshold_pct: float = Query(5.0, ge=0.5, le=50.0, description="Similar price threshold percentage"),
    pattern_type: Optional[str] = Query(None, description="Filter by pattern type"),
    severity: Optional[str] = Query(None, description="Filter by descriptive severity (Attention, Unusual Pattern)"),
    from_date: Optional[date] = Query(None, description="Start date filter"),
    to_date: Optional[date] = Query(None, description="End date filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[List[UnusualPatternItem]]:
    service = PatternAnalysisService(db)
    res = service.get_unusual_patterns(
        threshold_pct=threshold_pct,
        pattern_type_filter=pattern_type,
        severity_filter=severity,
        from_date=from_date,
        to_date=to_date,
    )
    return ApiResponse[List[UnusualPatternItem]](
        success=True,
        message=f"Identified {len(res)} patterns requiring review.",
        data=res
    )


@router.get(
    "/tender/{tender_id_or_code}",
    response_model=ApiResponse[TenderPatternSummaryResponse],
    summary="Tender Pattern and Co-Bidding Summary",
    description="Summarizes co-bidding pairs, similar price occurrences, and previous winner relationships for a given tender."
)
def get_tender_pattern_summary(
    tender_id_or_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[TenderPatternSummaryResponse]:
    service = PatternAnalysisService(db)
    res = service.get_tender_pattern_summary(tender_id_or_code)
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tender '{tender_id_or_code}' not found."
        )
    return ApiResponse[TenderPatternSummaryResponse](
        success=True,
        message="Tender pattern summary generated.",
        data=res
    )
