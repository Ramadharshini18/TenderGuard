"""
Risk Engine & Transparent Evidence Evaluation Service

Integrates:
1. Dynamic graph construction (NetworkX)
2. Tabular feature extraction (Real DB records)
3. Pattern Analysis service metrics (Repeated co-bidding, price proximity, alternating winners)
4. Deterministic, explainable suspicion score calculation (0 to 100)
5. Structured Key Risk Indicators & human-readable evidence points
6. PostgreSQL persistence for analysis records & alerts

Ethical & Compliance Guardrails:
- Suspicion Score is an investigative indicator, NEVER a fraud verdict.
- Zero fake random numbers. The exact same data produces the exact same score.
- If data is insufficient (< 2 bidders or no bids), clean status is returned without fake calculation.
"""

from typing import Dict, Any, List, Tuple, Optional
from sqlalchemy.orm import Session

from app.models.tender import Tender
from app.models.company import Company
from app.models.participation import TenderParticipation
from app.models.risk_analysis import RiskAnalysisRecord, RiskAlert
from app.services.pattern_service import PatternAnalysisService
from app.ai.graph_builder import ProcurementGraphBuilder
from app.ai.feature_engineering import ProcurementFeatureExtractor


class RiskEngine:
    def __init__(self, db: Session):
        self.db = db
        self.pattern_service = PatternAnalysisService(db)
        self.graph_builder = ProcurementGraphBuilder(db)
        self.feature_extractor = ProcurementFeatureExtractor(db)

    def analyze_tender(self, tender_id: int, user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Executes full deterministic risk analysis on a tender using real database records.
        Returns:
            - suspicion_score (0 - 100)
            - risk_level ("Low", "Moderate", "High", "Very High")
            - explanation: List[str] evidence points
            - risk_indicators: Dict of structured indicator statuses
            - graph_metrics: Dict of graph structure metrics
        """
        tender = self.db.query(Tender).filter(Tender.id == tender_id, Tender.is_deleted == False).first()
        if not tender:
            raise ValueError(f"Tender with ID {tender_id} not found.")

        participations = (
            self.db.query(TenderParticipation, Company)
            .join(Company, TenderParticipation.company_id == Company.id)
            .filter(TenderParticipation.tender_id == tender.id, Company.is_deleted == False)
            .all()
        )

        bidders_count = len(participations)

        # 1. Check Data Sufficiency
        if bidders_count == 0:
            return {
                "tender_id": tender.id,
                "tender_code": tender.tender_id,
                "suspicion_score": 0.0,
                "risk_level": "Low",
                "is_sufficient_data": False,
                "sufficiency_note": "No bidding data is available for risk analysis.",
                "explanation": ["Tender has no recorded bids yet."],
                "risk_indicators": self._build_empty_indicators("Insufficient Data"),
                "graph_metrics": {"nodes": 1, "edges": 0, "density": 0.0},
            }

        if bidders_count == 1:
            return {
                "tender_id": tender.id,
                "tender_code": tender.tender_id,
                "suspicion_score": 0.0,
                "risk_level": "Low",
                "is_sufficient_data": False,
                "sufficiency_note": "At least two participating companies are required for relationship comparison.",
                "explanation": ["Only one company is currently recorded. Co-bidding and price comparison require at least two bidders."],
                "risk_indicators": self._build_empty_indicators("Insufficient Data"),
                "graph_metrics": {"nodes": 2, "edges": 1, "density": 0.5},
            }

        # 2. Extract Graph & Structural Metrics
        subgraph = self.graph_builder.build_tender_subgraph(tender.id)
        graph_metrics = self.graph_builder.extract_graph_metrics(subgraph)

        # 3. Retrieve Historical Relationship & Pattern Evidence
        tender_pattern = self.pattern_service.get_tender_pattern_summary(tender.tender_id)

        # 4. Transparent Deterministic Score Formulation (0 to 100)
        # Weights:
        # A. Similar Quoted Prices in current tender (Up to 35 pts)
        # B. Repeated Co-Bidding History between bidders (Up to 30 pts)
        # C. Alternating Winner Patterns / Winner Changes (Up to 20 pts)
        # D. High Co-bidding Density / Clustered network (Up to 15 pts)

        score = 0.0
        explanations: List[str] = []
        indicators: Dict[str, Any] = {}

        # --- A. Quoted Price Proximity ---
        similar_price_pairs = tender_pattern.similar_price_pairs_count if tender_pattern else 0
        co_bidding_pairs = tender_pattern.co_bidding_pairs if tender_pattern else []

        if similar_price_pairs > 0:
            # Score contribution: 20 base for 1 pair + 7.5 per additional pair up to 35 max
            price_pts = min(20.0 + (similar_price_pairs - 1) * 7.5, 35.0)
            score += price_pts

            # Gather exact percentage details for explanation
            close_details = []
            for pair in co_bidding_pairs:
                if pair.get("is_similar_price"):
                    close_details.append(f"{pair['company_a']} and {pair['company_b']} (differ by only {pair['price_difference_pct']}%)")
            
            explanations.append(
                f"Quoted prices within 5.0% threshold identified across {similar_price_pairs} participating company pair(s): " +
                "; ".join(close_details[:2]) + "."
            )
            indicators["Similar Quoted Prices"] = {
                "status": "Detected",
                "details": f"{similar_price_pairs} company pair(s) submitted quoted prices within 5.0% difference.",
            }
        else:
            indicators["Similar Quoted Prices"] = {
                "status": "Not Detected",
                "details": "No company pairs submitted quoted prices within 5.0% difference in this tender.",
            }

        # --- B. Repeated Co-Bidding History ---
        repeated_pairs_count = tender_pattern.repeated_participation_pairs_count if tender_pattern else 0
        if repeated_pairs_count > 0:
            # Score contribution: 15 base + 5 per additional pair up to 30 max
            cobid_pts = min(15.0 + (repeated_pairs_count - 1) * 5.0, 30.0)
            score += cobid_pts

            explanations.append(
                f"{repeated_pairs_count} company pair(s) in this tender have a history of repeated shared participation across 2 or more prior state tenders."
            )
            indicators["Repeated Participation"] = {
                "status": "Detected",
                "details": f"{repeated_pairs_count} company pair(s) share 2 or more historical tenders.",
            }
        else:
            indicators["Repeated Participation"] = {
                "status": "Not Detected",
                "details": "Participating companies do not have repeated shared bidding history in the registry.",
            }

        # --- C. Alternating Winner Patterns ---
        prior_winners = tender_pattern.previous_winner_relationships_count if tender_pattern else 0
        if prior_winners > 0:
            score += 20.0
            explanations.append(
                f"Historical winner rotation / alternating wins recorded among participating bidders across related tenders."
            )
            indicators["Repeated Winner Changes"] = {
                "status": "Detected",
                "details": "Participating bidders show documented history of alternating tender awards.",
            }
        else:
            indicators["Repeated Winner Changes"] = {
                "status": "Not Detected",
                "details": "No repeated winner change pattern recorded among this bidder group.",
            }

        # --- D. High Co-Bidding Cluster Density ---
        companies_with_prior_shared = tender_pattern.companies_with_previous_shared_participation if tender_pattern else 0
        if companies_with_prior_shared >= 3:
            score += 15.0
            explanations.append(
                f"High shared participation cluster: {companies_with_prior_shared} bidders belong to an established co-bidding syndication network."
            )
            indicators["Strong Company Relationships"] = {
                "status": "Detected",
                "details": f"{companies_with_prior_shared} bidders frequently participate in the same tender lots.",
            }
        else:
            indicators["Strong Company Relationships"] = {
                "status": "Not Detected",
                "details": "Bidders do not form a dense co-bidding syndication cluster.",
            }

        # Additional indicators
        indicators["Unusual Participation Frequency"] = {
            "status": "Not Detected" if bidders_count <= 8 else "Detected",
            "details": f"{bidders_count} companies registered in this tender.",
        }

        # Final score clamp (0 to 100)
        final_score = round(min(max(score, 5.0), 98.0), 1)

        # Risk level categorization
        if final_score >= 80.0:
            risk_level = "Very High"
        elif final_score >= 60.0:
            risk_level = "High"
        elif final_score >= 30.0:
            risk_level = "Moderate"
        else:
            risk_level = "Low"

        if not explanations:
            explanations.append("Bidding distribution and participant history fall within standard competitive parameters.")

        # 5. Persist to PostgreSQL (risk_analyses table)
        analysis_record = RiskAnalysisRecord(
            tender_id=tender.id,
            suspicion_score=final_score,
            risk_level=risk_level,
            analysis_type="Pattern-Assisted Graph Engine",
            model_version="v1.0-graph-evidence",
            explanation=explanations,
            risk_indicators=indicators,
            graph_metrics=graph_metrics,
            analyzed_by=user_id,
        )
        self.db.add(analysis_record)
        self.db.commit()
        self.db.refresh(analysis_record)

        # 6. Create Alert if Suspicion >= 60 or specific patterns detected
        if final_score >= 60.0 or similar_price_pairs >= 2:
            existing_alert = (
                self.db.query(RiskAlert)
                .filter(
                    RiskAlert.tender_id == tender.id,
                    RiskAlert.status.in_(["New", "Under Review"])
                )
                .first()
            )
            if not existing_alert:
                alert_title = (
                    f"Very High Suspicion: Tender {tender.tender_id}"
                    if final_score >= 80.0
                    else f"High Suspicion Alert: Tender {tender.tender_id}"
                )
                alert_record = RiskAlert(
                    tender_id=tender.id,
                    risk_analysis_id=analysis_record.id,
                    title=alert_title,
                    pattern_type="Similar Quoted Prices & Repeated Participation" if similar_price_pairs > 0 else "Repeated Co-Bidding",
                    severity=risk_level,
                    status="New",
                    description=f"Automated risk engine identified {risk_level} suspicion ({final_score}/100) based on real bidding proximity and co-bidding network patterns.",
                    evidence_details={"explanations": explanations, "score": final_score},
                )
                self.db.add(alert_record)
                self.db.commit()

        return {
            "analysis_id": analysis_record.id,
            "tender_id": tender.id,
            "tender_code": tender.tender_id,
            "tender_title": tender.title,
            "procurement_authority": tender.procurement_authority,
            "category": tender.category,
            "estimated_value": float(tender.estimated_value) if tender.estimated_value else 0.0,
            "submission_deadline": str(tender.submission_deadline),
            "bidders_count": bidders_count,
            "suspicion_score": final_score,
            "risk_level": risk_level,
            "is_sufficient_data": True,
            "explanation": explanations,
            "risk_indicators": indicators,
            "graph_metrics": graph_metrics,
            "analysis_date": analysis_record.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        }

    def _build_empty_indicators(self, default_status: str) -> Dict[str, Any]:
        return {
            "Repeated Participation": {"status": default_status, "details": "Insufficient co-bidding records."},
            "Similar Quoted Prices": {"status": default_status, "details": "Insufficient bidding price comparison data."},
            "Repeated Winner Changes": {"status": default_status, "details": "No completed multi-bidder tender history."},
            "Strong Company Relationships": {"status": default_status, "details": "Graph density cannot be evaluated."},
            "Unusual Participation Frequency": {"status": default_status, "details": "Requires at least 2 bidders."},
        }
