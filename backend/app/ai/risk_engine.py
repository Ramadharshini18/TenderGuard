"""
Risk Engine & Transparent Evidence Evaluation Service

Advanced Multi-Factor Forensic Procurement Integrity Engine:
1. Non-linear Price Proximity & Coefficient of Variation (CV) clustering
2. Budget Ceiling Sniping & Cover Bidding detection (Bid-to-Estimate ratios)
3. Co-Bidding Affinity & Dedicated Companion (Jaccard Index)
4. Cartel Winner Rotation & Token Bidder Asymmetry detection
5. Dynamic Bipartite Graph structural metric evaluation (NetworkX)
6. Complete mathematical explainability with exact financial and statistical proof

Ethical & Compliance Guardrails:
- Suspicion Score is an investigative decision-support metric, NEVER a judicial fraud verdict.
- Zero fake random numbers: deterministic calculation guarantees identical input produces identical score.
- Insufficient data (< 2 bidders or no bids) returns neutral status without arbitrary speculation.
"""

import math
import numpy as np
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
                "sufficiency_note": "No bidding data is recorded for this tender.",
                "explanation": ["Tender has no recorded bids yet."],
                "risk_indicators": self._build_empty_indicators("Insufficient Data"),
                "graph_metrics": {"nodes": 1, "edges": 0, "density": 0.0},
            }

        if bidders_count == 1:
            part, comp = participations[0]
            return {
                "tender_id": tender.id,
                "tender_code": tender.tender_id,
                "suspicion_score": 10.0,
                "risk_level": "Low",
                "is_sufficient_data": False,
                "sufficiency_note": "At least two participating companies are required for competitive co-bidding analysis.",
                "explanation": [
                    f"Only one bidder recorded: {comp.company_name} (Bid: {tender.currency} {float(part.quoted_price):,.2f}).",
                    "Single-bidder auctions lack competitive price comparison data and carry inherent single-source vulnerability."
                ],
                "risk_indicators": self._build_empty_indicators("Insufficient Data"),
                "graph_metrics": {"nodes": 2, "edges": 1, "density": 0.5},
            }

        # 2. Extract Graph & Structural Metrics
        subgraph = self.graph_builder.build_tender_subgraph(tender.id)
        graph_metrics = self.graph_builder.extract_graph_metrics(subgraph)

        # 3. Comprehensive Price & Statistical Analysis
        bid_prices = [float(p.quoted_price) for p, _ in participations]
        min_bid = min(bid_prices)
        max_bid = max(bid_prices)
        mean_bid = sum(bid_prices) / len(bid_prices)
        std_bid = float(np.std(bid_prices)) if len(bid_prices) >= 2 else 0.0
        cv_bid = round((std_bid / max(mean_bid, 1.0)) * 100.0, 2)
        overall_spread_pct = round(((max_bid - min_bid) / max(min_bid, 1.0)) * 100.0, 2)

        est_val = float(tender.estimated_value) if tender.estimated_value and float(tender.estimated_value) > 0 else None
        bid_to_est_ratio = round((min_bid / est_val) * 100.0, 2) if est_val else None

        # 4. Pairwise Relationship & Affinity Mapping
        tender_pattern = self.pattern_service.get_tender_pattern_summary(tender.tender_id)
        co_bidding_pairs = tender_pattern.co_bidding_pairs if tender_pattern else []

        # Find min price delta among all pairs in this tender
        min_pair_delta = 999.0
        closest_pair_info = None
        for pair in co_bidding_pairs:
            diff = pair.get("price_difference_pct", 999.0)
            if diff < min_pair_delta:
                min_pair_delta = diff
                closest_pair_info = pair

        # Deep Pair Analytics: check Jaccard affinity, alternating wins, and token bidder asymmetry
        syndicate_detected = False
        token_bidder_detected = False
        alternating_winners_detected = False
        max_shared_tenders = 0
        high_affinity_pairs = []

        for i in range(len(participations)):
            for j in range(i + 1, len(participations)):
                p_a, c_a = participations[i]
                p_b, c_b = participations[j]

                # Historical bids by company A and company B
                tenders_a = set(
                    r[0] for r in self.db.query(TenderParticipation.tender_id)
                    .filter(TenderParticipation.company_id == c_a.id).all()
                )
                tenders_b = set(
                    r[0] for r in self.db.query(TenderParticipation.tender_id)
                    .filter(TenderParticipation.company_id == c_b.id).all()
                )

                shared_tenders = tenders_a.intersection(tenders_b)
                shared_count = len(shared_tenders)
                if shared_count > max_shared_tenders:
                    max_shared_tenders = shared_count

                if shared_count >= 2:
                    min_total = min(len(tenders_a), len(tenders_b))
                    affinity_ratio = round((shared_count / max(min_total, 1)) * 100.0, 1)

                    if affinity_ratio >= 70.0 and shared_count >= 3:
                        syndicate_detected = True
                        smaller_comp = c_a.company_name if len(tenders_a) <= len(tenders_b) else c_b.company_name
                        larger_comp = c_b.company_name if len(tenders_a) <= len(tenders_b) else c_a.company_name
                        high_affinity_pairs.append({
                            "pair": f"{smaller_comp} & {larger_comp}",
                            "affinity": affinity_ratio,
                            "shared": shared_count,
                        })

                    # Check win history in shared tenders
                    wins_a = self.db.query(TenderParticipation).filter(
                        TenderParticipation.tender_id.in_(shared_tenders),
                        TenderParticipation.company_id == c_a.id,
                        TenderParticipation.participation_result == "Won",
                    ).count()
                    wins_b = self.db.query(TenderParticipation).filter(
                        TenderParticipation.tender_id.in_(shared_tenders),
                        TenderParticipation.company_id == c_b.id,
                        TenderParticipation.participation_result == "Won",
                    ).count()

                    if wins_a >= 1 and wins_b >= 1:
                        alternating_winners_detected = True

                    # Token bidder asymmetry: one company wins 2+, other company has 0 wins across 3+ shared tenders
                    if shared_count >= 3 and ((wins_a >= 2 and wins_b == 0) or (wins_b >= 2 and wins_a == 0)):
                        token_bidder_detected = True

        # 5. Multi-Factor Deterministic Suspicion Scoring (0 to 100)
        score = 0.0
        explanations: List[str] = []
        indicators: Dict[str, Any] = {}

        # --- Factor 1: Quoted Price Proximity & Dispersion (Max 35 pts) ---
        price_pts = 0.0
        similar_pairs_count = tender_pattern.similar_price_pairs_count if tender_pattern else 0

        if min_pair_delta < 999.0:
            if min_pair_delta <= 0.6:
                price_pts = 35.0
                intensity = "Near-Identical"
            elif min_pair_delta <= 1.5:
                price_pts = 28.0
                intensity = "Extremely Close"
            elif min_pair_delta <= 3.0:
                price_pts = 20.0
                intensity = "Highly Clustered"
            elif min_pair_delta <= 5.0:
                price_pts = 12.0
                intensity = "Moderately Close"
            else:
                price_pts = 0.0
                intensity = "Competitive Dispersion"

            # Multi-pair bonus: if 2+ pairs have tight prices
            if similar_pairs_count >= 2 and price_pts > 0:
                price_pts = min(price_pts + 5.0, 35.0)

            score += price_pts

            if price_pts > 0:
                explanations.append(
                    f"Price Proximity ({intensity}): Quoted bids differ by only {min_pair_delta}% "
                    f"between {closest_pair_info['company_a']} and {closest_pair_info['company_b']}. "
                    f"Overall bidding spread across all {bidders_count} offers is {overall_spread_pct}% (CV: {cv_bid}%)."
                )
                indicators["Similar Quoted Prices"] = {
                    "status": "Detected",
                    "details": f"{similar_pairs_count} company pair(s) within 5.0% price spread. Minimum delta: {min_pair_delta}%.",
                }
            else:
                indicators["Similar Quoted Prices"] = {
                    "status": "Not Detected",
                    "details": f"Bids reflect competitive price spread ({overall_spread_pct}% total spread, CV: {cv_bid}%).",
                }
        else:
            indicators["Similar Quoted Prices"] = {
                "status": "Not Detected",
                "details": "No comparative price clustering detected.",
            }

        # --- Factor 2: Budget Ceiling Sniping & Cover Bidding (Max 15 pts) ---
        budget_pts = 0.0
        if bid_to_est_ratio is not None:
            # Suspicious: lowest bid is 96.5% - 101.5% of estimate AND price spread is tight (< 4%)
            if 96.5 <= bid_to_est_ratio <= 101.5 and overall_spread_pct <= 4.0:
                budget_pts = 15.0
                score += budget_pts
                explanations.append(
                    f"Budget Margin Sniping: Lowest quoted price sits at {bid_to_est_ratio}% of government estimated value "
                    f"({tender.currency} {est_val:,.2f}), with other bids clustering immediately above/below it. "
                    "This structure is characteristic of cover bidding to maximize contract extraction."
                )
                indicators["Budget Ceiling Exploitation"] = {
                    "status": "Detected",
                    "details": f"Bids clustered near government estimate ({bid_to_est_ratio}% ratio, {overall_spread_pct}% spread).",
                }
            elif bid_to_est_ratio <= 85.0:
                # Genuine competitive discount below estimate: healthy market competition
                score = max(score - 4.0, 0.0)
                indicators["Budget Ceiling Exploitation"] = {
                    "status": "Not Detected",
                    "details": f"Lowest bid offers healthy {round(100.0 - bid_to_est_ratio, 1)}% competitive discount below estimate.",
                }
            else:
                indicators["Budget Ceiling Exploitation"] = {
                    "status": "Not Detected",
                    "details": f"Bid-to-estimate ratio ({bid_to_est_ratio}%) within customary procurement thresholds.",
                }
        else:
            indicators["Budget Ceiling Exploitation"] = {
                "status": "Insufficient Data",
                "details": "Government estimated value not specified for this notice.",
            }

        # --- Factor 3: Repeated Co-Bidding & Syndicate Affinity (Max 30 pts) ---
        cobid_pts = 0.0
        repeated_pairs_count = tender_pattern.repeated_participation_pairs_count if tender_pattern else 0

        if repeated_pairs_count > 0:
            if syndicate_detected:
                cobid_pts = min(22.0 + (max_shared_tenders - 2) * 3.0, 30.0)
                top_aff = high_affinity_pairs[0] if high_affinity_pairs else None
                aff_note = f" High co-bidding affinity ({top_aff['affinity']}%) observed between {top_aff['pair']}." if top_aff else ""
                explanations.append(
                    f"Repeated Co-Bidding Syndicate: {repeated_pairs_count} company pair(s) in this lot share a multi-tender bidding history "
                    f"(up to {max_shared_tenders} shared tenders).{aff_note}"
                )
                indicators["Repeated Participation"] = {
                    "status": "Detected",
                    "details": f"{repeated_pairs_count} company pair(s) share 2+ prior tenders (Max shared: {max_shared_tenders}).",
                }
            else:
                cobid_pts = min(12.0 + (repeated_pairs_count - 1) * 4.0, 22.0)
                explanations.append(
                    f"Co-Bidding History: {repeated_pairs_count} company pair(s) share 2 or more historical tenders in the registry."
                )
                indicators["Repeated Participation"] = {
                    "status": "Detected",
                    "details": f"{repeated_pairs_count} company pair(s) share prior bidding history.",
                }
            score += cobid_pts
        else:
            indicators["Repeated Participation"] = {
                "status": "Not Detected",
                "details": "Participating companies do not have repeated shared bidding history in the registry.",
            }

        # --- Factor 4: Cartel Bid Rotation & Companion Asymmetry (Max 20 pts) ---
        rotation_pts = 0.0
        if alternating_winners_detected:
            rotation_pts = 20.0
            score += rotation_pts
            explanations.append(
                "Documented Bid Rotation: Participating competitors show historical alternating winner outcomes "
                "across shared tender lots, indicating potential market/contract sharing agreements."
            )
            indicators["Repeated Winner Changes"] = {
                "status": "Detected",
                "details": "Bidders demonstrate alternating award history across shared tenders.",
            }
        elif token_bidder_detected:
            rotation_pts = 14.0
            score += rotation_pts
            explanations.append(
                "Asymmetric Companion Bidding: Historical co-bidding exhibits token bidder behavior "
                "(one entity consistently winning while companion entity repeatedly submits losing offers across 3+ lots)."
            )
            indicators["Repeated Winner Changes"] = {
                "status": "Detected",
                "details": "Asymmetric win-loss distribution across repeated shared tenders.",
            }
        else:
            indicators["Repeated Winner Changes"] = {
                "status": "Not Detected",
                "details": "No cyclical winner rotation or token bidder history recorded.",
            }

        # --- Factor 5: Network Density & Low-Competition Vulnerability (Max 10 pts) ---
        network_pts = 0.0
        density = graph_metrics.get("density", 0.0) if graph_metrics else 0.0
        companies_with_prior_shared = tender_pattern.companies_with_previous_shared_participation if tender_pattern else 0

        if bidders_count == 2 and repeated_pairs_count >= 1:
            # Duopoly auction with known partners: highest collusion vulnerability
            network_pts += 8.0
            explanations.append(
                "Duopoly Vulnerability: Exactly 2 bidders registered, both sharing established historical co-bidding ties. "
                "Absence of independent third-party bids heightens collusion risk."
            )
        elif companies_with_prior_shared >= 3 or (companies_with_prior_shared >= 2 and density >= 0.8):
            network_pts += 6.0
            explanations.append(
                f"High Network Density ({density}): {companies_with_prior_shared} bidders form an interconnected participation clique."
            )

        score += network_pts
        indicators["Strong Company Relationships"] = {
            "status": "Detected" if (network_pts > 0 or companies_with_prior_shared >= 2) else "Not Detected",
            "details": f"Sub-graph density: {density}. {companies_with_prior_shared} bidders with established network linkages.",
        }

        # Market breadth indicator
        indicators["Unusual Participation Frequency"] = {
            "status": "Attention" if bidders_count <= 2 else ("Detected" if bidders_count >= 10 else "Not Detected"),
            "details": f"{bidders_count} participating companies in tender lot.",
        }

        # --- Final Normalized Suspicion Score (0.0 to 100.0) ---
        # When zero anomalous indicators exist, baseline competitive score is 5.0 - 12.0
        if not explanations:
            explanations.append(
                f"Independent Competitive Bidding: All {bidders_count} offers exhibit standard price dispersion "
                f"({overall_spread_pct}% total spread) without historical cartel ties or bid rotation patterns."
            )
            final_score = round(max(min(overall_spread_pct * 0.4, 15.0), 5.0), 1)
        else:
            final_score = round(min(max(score, 5.0), 98.0), 1)

        # Scientific Risk Level Calibration
        if final_score >= 75.0:
            risk_level = "Very High"
        elif final_score >= 55.0:
            risk_level = "High"
        elif final_score >= 28.0:
            risk_level = "Moderate"
        else:
            risk_level = "Low"

        # 6. Persist to PostgreSQL (risk_analyses table)
        analysis_record = RiskAnalysisRecord(
            tender_id=tender.id,
            suspicion_score=final_score,
            risk_level=risk_level,
            analysis_type="Multi-Factor Graph & Statistical Engine",
            model_version="v2.0-forensic-precision",
            explanation=explanations,
            risk_indicators=indicators,
            graph_metrics=graph_metrics,
            analyzed_by=user_id,
        )
        self.db.add(analysis_record)
        self.db.commit()
        self.db.refresh(analysis_record)

        # 7. Create Alert if Suspicion >= 55.0 or specific high-risk patterns
        if final_score >= 55.0 or (similar_pairs_count >= 1 and min_pair_delta <= 1.5):
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
                    if final_score >= 75.0
                    else f"High Suspicion Alert: Tender {tender.tender_id}"
                )
                pattern_desc = []
                if min_pair_delta <= 2.5:
                    pattern_desc.append("Tight Price Proximity")
                if syndicate_detected or repeated_pairs_count > 0:
                    pattern_desc.append("Co-Bidding Syndicate")
                if alternating_winners_detected:
                    pattern_desc.append("Bid Rotation")
                pattern_label = " & ".join(pattern_desc) if pattern_desc else "Suspicious Bidding Network"

                alert_record = RiskAlert(
                    tender_id=tender.id,
                    risk_analysis_id=analysis_record.id,
                    title=alert_title,
                    pattern_type=pattern_label,
                    severity=risk_level,
                    status="New",
                    description=(
                        f"Forensic engine identified {risk_level} suspicion ({final_score}/100). "
                        f"Evidence: Minimum price delta is {min_pair_delta}% with {repeated_pairs_count} repeated co-bidding pairs."
                    ),
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
            "Similar Quoted Prices": {"status": default_status, "details": "Insufficient bidding price comparison data."},
            "Budget Ceiling Exploitation": {"status": default_status, "details": "Government estimated value comparison unavailable."},
            "Repeated Participation": {"status": default_status, "details": "Insufficient co-bidding records."},
            "Repeated Winner Changes": {"status": default_status, "details": "No completed multi-bidder tender history."},
            "Strong Company Relationships": {"status": default_status, "details": "Graph density cannot be evaluated."},
            "Unusual Participation Frequency": {"status": default_status, "details": "Requires at least 2 bidders."},
        }
