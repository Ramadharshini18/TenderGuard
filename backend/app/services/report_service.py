from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.tender import Tender
from app.models.company import Company
from app.models.participation import TenderParticipation
from app.models.risk_analysis import RiskAnalysisRecord, RiskAlert
from app.services.pattern_service import PatternAnalysisService
from app.ai.risk_engine import RiskEngine


class ReportService:
    def __init__(self, db: Session):
        self.db = db
        self.risk_engine = RiskEngine(db)
        self.pattern_service = PatternAnalysisService(db)

    def generate_tender_risk_report(self, tender_id: int) -> Dict[str, Any]:
        """
        Compiles exhaustive tender risk report with specifications, bids,
        risk assessment evidence, and official investigative disclaimer.
        """
        tender = self.db.query(Tender).filter(Tender.id == tender_id, Tender.is_deleted == False).first()
        if not tender:
            raise ValueError(f"Tender {tender_id} not found.")

        # Latest or on-the-fly risk analysis
        latest_analysis = (
            self.db.query(RiskAnalysisRecord)
            .filter(RiskAnalysisRecord.tender_id == tender.id)
            .order_by(RiskAnalysisRecord.created_at.desc())
            .first()
        )

        if not latest_analysis:
            analysis_data = self.risk_engine.analyze_tender(tender.id)
            score = analysis_data["suspicion_score"]
            risk_level = analysis_data["risk_level"]
            explanation = analysis_data["explanation"]
            indicators = analysis_data["risk_indicators"]
        else:
            score = latest_analysis.suspicion_score
            risk_level = latest_analysis.risk_level
            explanation = latest_analysis.explanation or []
            indicators = latest_analysis.risk_indicators or {}

        # Participants
        parts = (
            self.db.query(TenderParticipation, Company)
            .join(Company, TenderParticipation.company_id == Company.id)
            .filter(TenderParticipation.tender_id == tender.id, Company.is_deleted == False)
            .all()
        )

        bidders_list = [
            {
                "company_id": comp.company_id,
                "company_name": comp.company_name,
                "quoted_price": float(p.quoted_price),
                "qualification_status": p.qualification_status,
                "participation_result": p.participation_result,
                "submission_date": str(p.submission_date),
            }
            for p, comp in parts
        ]

        # Recommendation based on score
        if score >= 80.0:
            recommendation = "Immediate manual audit recommended. Cross-verify bid bonds, sub-contractor ownership declarations, and IP submission timestamps."
        elif score >= 60.0:
            recommendation = "Secondary compliance review recommended before final contract execution."
        elif score >= 30.0:
            recommendation = "Standard procurement monitoring with normal milestone verifications."
        else:
            recommendation = "Standard competitive clearance. No anomalous bidding patterns observed."

        disclaimer = (
            "This report provides an AI-assisted risk indicator based on available tender and historical bidding data. "
            "It does not prove fraud, collusion, wrongdoing, or unlawful activity. Manual investigation and appropriate "
            "due process are required before taking action."
        )

        return {
            "report_title": f"Procurement Risk Dossier: {tender.tender_id}",
            "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "system_name": "TenderGuard Enterprise Surveillance",
            "tender": {
                "id": tender.id,
                "tender_code": tender.tender_id,
                "title": tender.title,
                "procurement_authority": tender.procurement_authority,
                "category": tender.category,
                "estimated_value": float(tender.estimated_value) if tender.estimated_value else 0.0,
                "currency": tender.currency,
                "status": tender.status,
                "publication_date": str(tender.publication_date),
                "submission_deadline": str(tender.submission_deadline),
            },
            "bidders": bidders_list,
            "risk_assessment": {
                "suspicion_score": score,
                "risk_level": risk_level,
                "evidence_points": explanation,
                "indicators": indicators,
            },
            "recommendation": recommendation,
            "disclaimer": disclaimer,
        }

    def generate_overall_risk_summary(self) -> Dict[str, Any]:
        """
        High-level oversight portfolio summary across all monitored tenders and active alerts.
        """
        total_tenders = self.db.query(Tender).filter(Tender.is_deleted == False).count()
        total_companies = self.db.query(Company).filter(Company.is_deleted == False).count()
        analyses_count = self.db.query(RiskAnalysisRecord).count()
        high_risk_count = (
            self.db.query(RiskAnalysisRecord)
            .filter(RiskAnalysisRecord.risk_level.in_(["High", "Very High"]))
            .distinct(RiskAnalysisRecord.tender_id)
            .count()
        )
        active_alerts_count = self.db.query(RiskAlert).filter(RiskAlert.status.in_(["New", "Under Review"])).count()

        pattern_summary = self.pattern_service.get_summary()

        return {
            "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "portfolio_metrics": {
                "total_tenders": total_tenders,
                "total_companies": total_companies,
                "tenders_analyzed": analyses_count,
                "high_or_very_high_suspicion_tenders": high_risk_count,
                "open_alerts": active_alerts_count,
            },
            "pattern_overview": {
                "repeated_company_pairs": pattern_summary.repeated_company_pairs,
                "unusual_patterns_found": pattern_summary.unusual_patterns_found,
                "similar_price_pairs": pattern_summary.similar_price_pairs_count,
                "alternating_winners_pairs": pattern_summary.alternating_winners_pairs_count,
            },
            "disclaimer": (
                "This report provides an AI-assisted risk indicator based on available tender and historical bidding data. "
                "It does not prove fraud, collusion, wrongdoing, or unlawful activity. Manual investigation and appropriate "
                "due process are required before taking action."
            ),
        }
