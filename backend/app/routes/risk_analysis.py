from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.tender import Tender
from app.models.risk_analysis import RiskAnalysisRecord, RiskAlert
from app.routes.deps import get_current_user
from app.schemas.common import ApiResponse
from app.schemas.risk_analysis import (
    RiskAnalysisResponse,
    RiskAnalysisSummaryItem,
    AlertResponse,
    AlertUpdatePayload,
)
from app.ai.risk_engine import RiskEngine

router = APIRouter(tags=["Risk Analysis & Alerts"])


# ==========================================
# RISK ANALYSIS ENDPOINTS
# ==========================================

@router.post(
    "/risk-analysis/tenders/{tender_id_or_code}/run",
    response_model=ApiResponse[RiskAnalysisResponse],
    summary="Execute Real-Time AI Risk Analysis on Tender",
    description="Builds procurement graph, extracts actual bidding features, calculates deterministic suspicion score (0-100), and records evidence."
)
def run_risk_analysis(
    tender_id_or_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[RiskAnalysisResponse]:
    # Find tender by ID or tender_id code
    tender = None
    if tender_id_or_code.isdigit():
        tender = db.query(Tender).filter(Tender.id == int(tender_id_or_code), Tender.is_deleted == False).first()
    if not tender:
        tender = db.query(Tender).filter(Tender.tender_id == tender_id_or_code, Tender.is_deleted == False).first()
    if not tender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tender '{tender_id_or_code}' not found."
        )

    engine = RiskEngine(db)
    result = engine.analyze_tender(tender.id, user_id=current_user.id)

    return ApiResponse[RiskAnalysisResponse](
        success=True,
        message=f"Risk analysis completed for {tender.tender_id}. Suspicion Score: {result['suspicion_score']}/100 ({result['risk_level']}).",
        data=RiskAnalysisResponse(**result)
    )


@router.get(
    "/risk-analysis/tenders/{tender_id_or_code}",
    response_model=ApiResponse[Optional[RiskAnalysisResponse]],
    summary="Get Latest Risk Analysis for Tender",
    description="Retrieves the most recent stored risk analysis result for a tender."
)
def get_latest_risk_analysis(
    tender_id_or_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[Optional[RiskAnalysisResponse]]:
    tender = None
    if tender_id_or_code.isdigit():
        tender = db.query(Tender).filter(Tender.id == int(tender_id_or_code), Tender.is_deleted == False).first()
    if not tender:
        tender = db.query(Tender).filter(Tender.tender_id == tender_id_or_code, Tender.is_deleted == False).first()
    if not tender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tender '{tender_id_or_code}' not found."
        )

    record = (
        db.query(RiskAnalysisRecord)
        .filter(RiskAnalysisRecord.tender_id == tender.id)
        .order_by(RiskAnalysisRecord.created_at.desc())
        .first()
    )

    if not record:
        return ApiResponse[Optional[RiskAnalysisResponse]](
            success=True,
            message="No prior risk analysis found for this tender.",
            data=None
        )

    response_data = RiskAnalysisResponse(
        analysis_id=record.id,
        tender_id=tender.id,
        tender_code=tender.tender_id,
        tender_title=tender.title,
        procurement_authority=tender.procurement_authority,
        category=tender.category,
        estimated_value=float(tender.estimated_value) if tender.estimated_value else 0.0,
        submission_deadline=str(tender.submission_deadline),
        bidders_count=len(tender.participations),
        suspicion_score=record.suspicion_score,
        risk_level=record.risk_level,
        is_sufficient_data=True,
        explanation=record.explanation or [],
        risk_indicators=record.risk_indicators or {},
        graph_metrics=record.graph_metrics,
        analysis_date=record.created_at.strftime("%Y-%m-%d %H:%M:%S"),
    )

    return ApiResponse[Optional[RiskAnalysisResponse]](
        success=True,
        message="Retrieved latest risk analysis record.",
        data=response_data
    )


@router.get(
    "/risk-analysis/recent",
    response_model=ApiResponse[List[RiskAnalysisSummaryItem]],
    summary="List Recent Risk Analysis Records",
    description="Returns recent completed analyses for dashboard integration and investigation history."
)
def get_recent_analyses(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[List[RiskAnalysisSummaryItem]]:
    records = (
        db.query(RiskAnalysisRecord, Tender)
        .join(Tender, RiskAnalysisRecord.tender_id == Tender.id)
        .order_by(RiskAnalysisRecord.created_at.desc())
        .limit(limit)
        .all()
    )

    items = [
        RiskAnalysisSummaryItem(
            id=rec.id,
            tender_id=tnd.id,
            tender_code=tnd.tender_id,
            tender_title=tnd.title,
            suspicion_score=rec.suspicion_score,
            risk_level=rec.risk_level,
            analysis_date=rec.created_at,
            created_at=rec.created_at,
        )
        for rec, tnd in records
    ]

    return ApiResponse[List[RiskAnalysisSummaryItem]](
        success=True,
        message=f"Retrieved {len(items)} recent risk analysis records.",
        data=items
    )


# ==========================================
# ALERTS SYSTEM ENDPOINTS
# ==========================================

@router.get(
    "/alerts",
    response_model=ApiResponse[List[AlertResponse]],
    summary="List Active Risk Alerts",
    description="Returns stored risk alerts filterable by severity, status, and pattern type."
)
def list_alerts(
    status_filter: Optional[str] = Query(None, description="New | Under Review | Resolved | Dismissed"),
    severity_filter: Optional[str] = Query(None, description="High | Very High"),
    pattern_filter: Optional[str] = Query(None, description="Filter by pattern"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[List[AlertResponse]]:
    query = (
        db.query(RiskAlert, Tender)
        .join(Tender, RiskAlert.tender_id == Tender.id)
        .order_by(RiskAlert.created_at.desc())
    )

    if status_filter and status_filter != "All":
        query = query.filter(RiskAlert.status == status_filter)
    if severity_filter and severity_filter != "All":
        query = query.filter(RiskAlert.severity == severity_filter)
    if pattern_filter and pattern_filter != "All":
        query = query.filter(RiskAlert.pattern_type.ilike(f"%{pattern_filter}%"))

    records = query.all()

    items = [
        AlertResponse(
            id=alt.id,
            tender_id=tnd.id,
            tender_code=tnd.tender_id,
            tender_title=tnd.title,
            risk_analysis_id=alt.risk_analysis_id,
            title=alt.title,
            pattern_type=alt.pattern_type,
            severity=alt.severity,
            status=alt.status,
            description=alt.description,
            evidence_details=alt.evidence_details,
            reviewed_by=alt.reviewer.name if alt.reviewer else None,
            review_notes=alt.review_notes,
            reviewed_at=alt.reviewed_at,
            created_at=alt.created_at,
        )
        for alt, tnd in records
    ]

    return ApiResponse[List[AlertResponse]](
        success=True,
        message=f"Retrieved {len(items)} alerts.",
        data=items
    )


@router.put(
    "/alerts/{alert_id}",
    response_model=ApiResponse[AlertResponse],
    summary="Update Alert Review Status & Notes",
    description="Allows investigators to triage alerts (New -> Under Review -> Resolved/Dismissed) and attach audit notes."
)
def update_alert_status(
    alert_id: int,
    payload: AlertUpdatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[AlertResponse]:
    alert = db.query(RiskAlert).filter(RiskAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")

    alert.status = payload.status
    if payload.review_notes is not None:
        alert.review_notes = payload.review_notes.strip()
    alert.reviewed_by = current_user.id
    alert.reviewed_at = datetime.utcnow()

    db.commit()
    db.refresh(alert)

    return ApiResponse[AlertResponse](
        success=True,
        message=f"Alert #{alert.id} status updated to '{alert.status}'.",
        data=AlertResponse(
            id=alert.id,
            tender_id=alert.tender.id,
            tender_code=alert.tender.tender_id,
            tender_title=alert.tender.title,
            risk_analysis_id=alert.risk_analysis_id,
            title=alert.title,
            pattern_type=alert.pattern_type,
            severity=alert.severity,
            status=alert.status,
            description=alert.description,
            evidence_details=alert.evidence_details,
            reviewed_by=current_user.name,
            review_notes=alert.review_notes,
            reviewed_at=alert.reviewed_at,
            created_at=alert.created_at,
        )
    )
