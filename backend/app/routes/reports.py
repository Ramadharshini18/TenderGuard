from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.routes.deps import get_current_user
from app.schemas.common import ApiResponse
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["Investigation Reports"])


@router.get(
    "/tender/{tender_id_or_code}",
    response_model=ApiResponse[Dict[str, Any]],
    summary="Generate Tender Risk Audit Report",
    description="Generates a complete forensic audit report for a specific tender with bidding history, evidence points, and disclaimer."
)
def get_tender_risk_report(
    tender_id_or_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[Dict[str, Any]]:
    from app.models.tender import Tender
    tender = None
    if tender_id_or_code.isdigit():
        tender = db.query(Tender).filter(Tender.id == int(tender_id_or_code), Tender.is_deleted == False).first()
    if not tender:
        tender = db.query(Tender).filter(Tender.tender_id == tender_id_or_code, Tender.is_deleted == False).first()
    if not tender:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tender not found.")

    service = ReportService(db)
    report = service.generate_tender_risk_report(tender.id)
    return ApiResponse[Dict[str, Any]](
        success=True,
        message=f"Tender risk report generated for {tender.tender_id}.",
        data=report
    )


@router.get(
    "/overview",
    response_model=ApiResponse[Dict[str, Any]],
    summary="Generate Overall Portfolio Risk Summary",
    description="Returns aggregate procurement oversight risk statistics, pattern frequencies, and audit summaries."
)
def get_overall_risk_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[Dict[str, Any]]:
    service = ReportService(db)
    summary_data = service.generate_overall_risk_summary()
    return ApiResponse[Dict[str, Any]](
        success=True,
        message="Overall risk summary compiled successfully.",
        data=summary_data
    )
