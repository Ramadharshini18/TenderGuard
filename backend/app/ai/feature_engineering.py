import numpy as np
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from app.models.tender import Tender
from app.models.company import Company
from app.models.participation import TenderParticipation


class ProcurementFeatureExtractor:
    """
    Computes numerical and structural features from real PostgreSQL data.
    Provides structured feature tensors and evidence inputs for both GNN architectures
    and transparent deterministic scoring engines.
    """

    def __init__(self, db: Session):
        self.db = db

    def extract_tender_features(self, tender_id: int) -> Dict[str, Any]:
        """
        Extracts tender-level tabular and network features from real database records.
        """
        tender = self.db.query(Tender).filter(Tender.id == tender_id).first()
        if not tender:
            return {}

        parts = self.db.query(TenderParticipation).filter(TenderParticipation.tender_id == tender_id).all()
        bid_prices = [float(p.quoted_price) for p in parts]
        qualified_count = sum(1 for p in parts if p.qualification_status == "Qualified")

        est_val = float(tender.estimated_value) if tender.estimated_value else 0.0

        if bid_prices:
            min_price = min(bid_prices)
            max_price = max(bid_prices)
            mean_price = sum(bid_prices) / len(bid_prices)
            spread_pct = round(((max_price - min_price) / max(min_price, 1.0)) * 100.0, 2)
            bid_to_est_ratio = round(min_price / max(est_val, 1.0), 4)
        else:
            min_price = 0.0
            max_price = 0.0
            mean_price = 0.0
            spread_pct = 0.0
            bid_to_est_ratio = 0.0

        return {
            "tender_id": tender.id,
            "tender_code": tender.tender_id,
            "bidders_count": len(parts),
            "qualified_count": qualified_count,
            "estimated_value": est_val,
            "min_bid_price": min_price,
            "max_bid_price": max_price,
            "mean_bid_price": round(mean_price, 2),
            "price_spread_pct": spread_pct,
            "lowest_bid_to_estimate_ratio": bid_to_est_ratio,
        }

    def extract_company_features(self, company_id: int) -> Dict[str, Any]:
        """
        Extracts company-level historical performance and participation features.
        """
        parts = self.db.query(TenderParticipation).filter(TenderParticipation.company_id == company_id).all()
        total_bids = len(parts)
        wins = sum(1 for p in parts if p.participation_result == "Won")
        losses = sum(1 for p in parts if p.participation_result == "Lost")
        disqualified = sum(1 for p in parts if p.participation_result == "Disqualified")

        win_rate = round((wins / max(total_bids, 1)) * 100.0, 2)
        prices = [float(p.quoted_price) for p in parts]
        avg_bid = round(sum(prices) / max(len(prices), 1), 2) if prices else 0.0

        return {
            "company_id": company_id,
            "total_bids": total_bids,
            "total_wins": wins,
            "total_losses": losses,
            "total_disqualified": disqualified,
            "win_rate_pct": win_rate,
            "average_bid_price": avg_bid,
        }
