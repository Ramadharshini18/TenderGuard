from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class RiskIndicatorItem(BaseModel):
    status: str  # "Detected" | "Not Detected" | "Insufficient Data"
    details: str


class RiskAnalysisResponse(BaseModel):
    analysis_id: Optional[int] = None
    tender_id: int
    tender_code: str
    tender_title: str
    procurement_authority: Optional[str] = None
    category: str
    estimated_value: float
    submission_deadline: Optional[str] = None
    bidders_count: int
    suspicion_score: float = Field(..., description="Deterministic suspicion score from 0 to 100")
    risk_level: str = Field(..., description="Low | Moderate | High | Very High")
    is_sufficient_data: bool = True
    sufficiency_note: Optional[str] = None
    explanation: List[str] = []
    risk_indicators: Dict[str, RiskIndicatorItem] = {}
    graph_metrics: Optional[Dict[str, Any]] = None
    analysis_date: Optional[str] = None


class RiskAnalysisSummaryItem(BaseModel):
    id: int
    tender_id: int
    tender_code: str
    tender_title: str
    suspicion_score: float
    risk_level: str
    analysis_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class AlertResponse(BaseModel):
    id: int
    tender_id: int
    tender_code: str
    tender_title: str
    risk_analysis_id: Optional[int] = None
    title: str
    pattern_type: str
    severity: str
    status: str
    description: str
    evidence_details: Optional[Dict[str, Any]] = None
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AlertUpdatePayload(BaseModel):
    status: str = Field(..., description="New | Under Review | Resolved | Dismissed")
    review_notes: Optional[str] = Field(None, max_length=2000)
