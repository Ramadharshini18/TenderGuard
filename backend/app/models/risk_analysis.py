from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import TimestampMixin


class RiskAnalysisRecord(Base, TimestampMixin):
    """
    Persistent store of completed tender risk assessments,
    including calculated suspicion score (0-100), deterministic risk level,
    evidence-based explanations, and structured indicator flags.
    """
    __tablename__ = "risk_analyses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tender_id = Column(Integer, ForeignKey("tenders.id", ondelete="CASCADE"), index=True, nullable=False)
    
    # 0 to 100 Suspicion Score (Deterministic calculation from real procurement data)
    suspicion_score = Column(Float, nullable=False, index=True)
    
    # Low | Moderate | High | Very High
    risk_level = Column(String(50), nullable=False, index=True)
    
    # Pattern-Assisted Graph Engine (or future Supervised GNN)
    analysis_type = Column(String(100), default="Pattern-Assisted Graph Engine", nullable=False)
    model_version = Column(String(50), default="v1.0-graph-evidence", nullable=False)
    
    # Human-readable evidence list stored as JSON array of strings
    explanation = Column(JSON, nullable=False)
    
    # Structured key risk indicator dict: { indicator_name: { status: "Detected"|"Not Detected"|"Insufficient Data", details: "..." } }
    risk_indicators = Column(JSON, nullable=False)
    
    # Graph metrics summary: { nodes: int, edges: int, density: float, etc. }
    graph_metrics = Column(JSON, nullable=True)
    
    analyzed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    tender = relationship("Tender", lazy="joined")
    analyzer = relationship("User", lazy="joined")
    alerts = relationship("RiskAlert", back_populates="risk_analysis", cascade="all, delete-orphan")


class RiskAlert(Base, TimestampMixin):
    """
    Actionable alert record generated when risk analysis identifies
    High or Very High suspicion or critical patterns (e.g., similar prices, repeated co-bidding).
    """
    __tablename__ = "risk_alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tender_id = Column(Integer, ForeignKey("tenders.id", ondelete="CASCADE"), index=True, nullable=False)
    risk_analysis_id = Column(Integer, ForeignKey("risk_analyses.id", ondelete="CASCADE"), nullable=True)
    
    # Alert Title & Pattern Type
    title = Column(String(255), nullable=False)
    pattern_type = Column(String(100), index=True, nullable=False)
    
    # Severity: Low | Moderate | High | Very High
    severity = Column(String(50), index=True, nullable=False)
    
    # Status: New | Under Review | Resolved | Dismissed
    status = Column(String(50), default="New", index=True, nullable=False)
    
    # Human-readable rationale
    description = Column(Text, nullable=False)
    evidence_details = Column(JSON, nullable=True)
    
    # Reviewer tracking
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    
    # Relationships
    tender = relationship("Tender", lazy="joined")
    risk_analysis = relationship("RiskAnalysisRecord", back_populates="alerts")
    reviewer = relationship("User", foreign_keys=[reviewed_by], lazy="joined")
