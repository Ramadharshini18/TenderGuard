"""
Pattern Analysis Engine Service
Computes historical tender bidding relationships, repeated company pairs,
quoted price proximity, alternating winners, and participation frequencies.
Strictly statistical and neutral: zero machine learning, zero fraud accusations.
"""

from datetime import date
from typing import List, Dict, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.tender import Tender
from app.models.company import Company
from app.models.participation import TenderParticipation
from app.schemas.pattern import (
    DataSufficiencyResponse,
    PatternSummaryResponse,
    CompanyRelationshipItem,
    CompanyPairDetailResponse,
    SharedTenderBreakdown,
    CompanyFrequencyItem,
    UnusualPatternItem,
    TenderPatternSummaryResponse,
)


def calculate_price_difference(price_a: float, price_b: float) -> Tuple[float, float]:
    """
    Calculates absolute and percentage price difference between two bids.
    Formula: ABS(Price_A - Price_B) / Price_A * 100
    Handles zero safely.
    """
    abs_diff = abs(price_a - price_b)
    if price_a <= 0:
        base = max(price_b, 1.0)
    else:
        base = price_a
    pct_diff = round((abs_diff / base) * 100.0, 2)
    return round(abs_diff, 2), pct_diff


class PatternAnalysisService:
    def __init__(self, db: Session):
        self.db = db

    def check_data_sufficiency(self) -> DataSufficiencyResponse:
        """
        Validates if there is enough historical data in the database
        to perform meaningful relationship and pattern analysis.
        """
        tenders_count = self.db.query(Tender).filter(Tender.is_deleted == False).count()
        companies_count = self.db.query(Company).filter(Company.is_deleted == False).count()
        participations_count = (
            self.db.query(TenderParticipation)
            .join(Tender, TenderParticipation.tender_id == Tender.id)
            .filter(Tender.is_deleted == False)
            .count()
        )
        
        # Count tenders that have at least 2 participating companies
        tenders_with_multiple_bids = (
            self.db.query(TenderParticipation.tender_id)
            .join(Tender, TenderParticipation.tender_id == Tender.id)
            .filter(Tender.is_deleted == False)
            .group_by(TenderParticipation.tender_id)
            .having(func.count(TenderParticipation.id) >= 2)
            .count()
        )

        completed_tenders = (
            self.db.query(Tender)
            .filter(
                Tender.is_deleted == False,
                Tender.status.in_(["Awarded", "Closed", "Under Evaluation"])
            )
            .count()
        )

        is_sufficient = (tenders_with_multiple_bids >= 1 and companies_count >= 2 and participations_count >= 2)

        if tenders_count == 0:
            msg = "No tenders found in registry."
            rec = "Register procurement tenders and record participating company bids to enable pattern analysis."
        elif companies_count < 2:
            msg = "At least two participating companies are required for company relationship analysis."
            rec = "Register additional contractor organizations and attach their bids to tenders."
        elif tenders_with_multiple_bids == 0:
            msg = "Insufficient historical data for relationship analysis."
            rec = "At least one tender must have two or more participating companies recorded."
        else:
            msg = "Historical data is sufficient for pattern analysis."
            rec = None

        return DataSufficiencyResponse(
            is_sufficient=is_sufficient,
            tenders_count=tenders_count,
            companies_count=companies_count,
            completed_tenders_count=completed_tenders,
            total_participations_count=participations_count,
            status_message=msg,
            recommendation=rec,
        )

    def get_summary(
        self,
        threshold_pct: float = 5.0,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
    ) -> PatternSummaryResponse:
        """
        Computes high-level dashboard metrics across all historical relationships.
        """
        sufficiency = self.check_data_sufficiency()
        if not sufficiency.is_sufficient:
            return PatternSummaryResponse(
                total_tenders_analyzed=sufficiency.tenders_count,
                companies_analyzed=sufficiency.companies_count,
                repeated_company_pairs=0,
                unusual_patterns_found=0,
                similar_price_pairs_count=0,
                alternating_winners_pairs_count=0,
                is_sufficient_data=False,
                status_note=sufficiency.status_message,
            )

        pairs = self.get_company_relationships(
            min_shared=2,
            threshold_pct=threshold_pct,
            from_date=from_date,
            to_date=to_date,
        )

        repeated_pairs_count = len(pairs)
        similar_price_pairs = sum(1 for p in pairs if p.similar_price_tenders_count > 0)
        alternating_winners_pairs = sum(1 for p in pairs if p.has_alternating_winners)
        unusual_patterns = self.get_unusual_patterns(threshold_pct=threshold_pct, from_date=from_date, to_date=to_date)

        # Unique tenders that had multiple bidders
        query = (
            self.db.query(TenderParticipation.tender_id)
            .join(Tender, TenderParticipation.tender_id == Tender.id)
            .filter(Tender.is_deleted == False)
        )
        if from_date:
            query = query.filter(Tender.publication_date >= from_date)
        if to_date:
            query = query.filter(Tender.publication_date <= to_date)
        tenders_analyzed_count = query.distinct().count()

        # Unique companies participating
        comp_query = (
            self.db.query(TenderParticipation.company_id)
            .join(Tender, TenderParticipation.tender_id == Tender.id)
            .filter(Tender.is_deleted == False)
        )
        if from_date:
            comp_query = comp_query.filter(Tender.publication_date >= from_date)
        if to_date:
            comp_query = comp_query.filter(Tender.publication_date <= to_date)
        companies_analyzed_count = comp_query.distinct().count()

        return PatternSummaryResponse(
            total_tenders_analyzed=tenders_analyzed_count,
            companies_analyzed=companies_analyzed_count,
            repeated_company_pairs=repeated_pairs_count,
            unusual_patterns_found=len(unusual_patterns),
            similar_price_pairs_count=similar_price_pairs,
            alternating_winners_pairs_count=alternating_winners_pairs,
            is_sufficient_data=True,
            status_note="Active historical pattern metrics calculated from database.",
        )

    def get_company_relationships(
        self,
        min_shared: int = 2,
        threshold_pct: float = 5.0,
        company_filter_id: Optional[int] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
    ) -> List[CompanyRelationshipItem]:
        """
        Finds all pairs of companies that shared at least `min_shared` tenders.
        Evaluates co-bidding counts, wins by each party, similar prices <= threshold_pct,
        and alternating winner patterns.
        """
        # 1. Fetch participations join tender and company
        query = (
            self.db.query(TenderParticipation, Tender, Company)
            .join(Tender, TenderParticipation.tender_id == Tender.id)
            .join(Company, TenderParticipation.company_id == Company.id)
            .filter(Tender.is_deleted == False, Company.is_deleted == False)
        )
        if from_date:
            query = query.filter(Tender.publication_date >= from_date)
        if to_date:
            query = query.filter(Tender.publication_date <= to_date)

        records = query.all()

        # Group participations by tender_id
        tenders_map: Dict[int, List[Tuple[TenderParticipation, Company, Tender]]] = {}
        for part, tnd, comp in records:
            if tnd.id not in tenders_map:
                tenders_map[tnd.id] = []
            tenders_map[tnd.id].append((part, comp, tnd))

        # Build pair co-bidding map: (min_id, max_id) -> list of shared tenders info
        pairs_map: Dict[Tuple[int, int], List[dict]] = {}

        for tnd_id, part_list in tenders_map.items():
            if len(part_list) < 2:
                continue

            for i in range(len(part_list)):
                for j in range(i + 1, len(part_list)):
                    p_a, c_a, tnd = part_list[i]
                    p_b, c_b, _ = part_list[j]

                    # Standardize order by company_id so pair is symmetric
                    if c_a.id < c_b.id:
                        pair_key = (c_a.id, c_b.id)
                        first_p, first_c = p_a, c_a
                        second_p, second_c = p_b, c_b
                    else:
                        pair_key = (c_b.id, c_a.id)
                        first_p, first_c = p_b, c_b
                        second_p, second_c = p_a, c_a

                    price_a = float(first_p.quoted_price)
                    price_b = float(second_p.quoted_price)
                    abs_diff, pct_diff = calculate_price_difference(price_a, price_b)

                    # Determine winner
                    winner_id = None
                    if first_p.participation_result == "Won":
                        winner_id = first_c.id
                    elif second_p.participation_result == "Won":
                        winner_id = second_c.id
                    else:
                        # Check if someone else won this tender
                        for other_p, other_c, _ in part_list:
                            if other_p.participation_result == "Won":
                                winner_id = other_c.id
                                break

                    pair_record = {
                        "tender_id": tnd.id,
                        "tender_code": tnd.tender_id,
                        "tender_title": tnd.title,
                        "tender_category": tnd.category,
                        "publication_date": tnd.publication_date,
                        "submission_deadline": tnd.submission_deadline,
                        "company_a_id": first_c.id,
                        "company_a_code": first_c.company_id,
                        "company_a_name": first_c.company_name,
                        "company_a_price": price_a,
                        "company_b_id": second_c.id,
                        "company_b_code": second_c.company_id,
                        "company_b_name": second_c.company_name,
                        "company_b_price": price_b,
                        "currency": first_p.currency,
                        "absolute_difference": abs_diff,
                        "percentage_difference": pct_diff,
                        "is_similar_price": (pct_diff <= threshold_pct),
                        "winner_id": winner_id,
                    }

                    if pair_key not in pairs_map:
                        pairs_map[pair_key] = []
                    pairs_map[pair_key].append(pair_record)

        # Build CompanyRelationshipItem list
        result_items: List[CompanyRelationshipItem] = []

        for (c_a_id, c_b_id), shared_list in pairs_map.items():
            if len(shared_list) < min_shared:
                continue

            if company_filter_id and company_filter_id not in (c_a_id, c_b_id):
                continue

            sample = shared_list[0]
            shared_count = len(shared_list)

            c_a_wins = sum(1 for item in shared_list if item["winner_id"] == c_a_id)
            c_b_wins = sum(1 for item in shared_list if item["winner_id"] == c_b_id)
            other_wins = sum(1 for item in shared_list if item["winner_id"] not in (c_a_id, c_b_id) and item["winner_id"] is not None)
            similar_price_count = sum(1 for item in shared_list if item["is_similar_price"])
            diff_price_count = shared_count - similar_price_count

            # Repeated Winner Changes / Alternating Winners:
            # Both companies have won at least once in their shared history, or multiple transitions
            has_alternating_winners = (c_a_wins >= 1 and c_b_wins >= 1 and (c_a_wins + c_b_wins >= 2))

            # Pattern Severity Classification (Descriptive, not a fraud score):
            # Normal: 2-3 shared tenders with differing prices
            # Attention: 4+ shared tenders OR alternating winners OR >= 50% similar prices
            # Unusual Pattern: >= 5 shared tenders AND (similar prices in majority OR alternating winners)
            if shared_count >= 5 and (similar_price_count >= 3 or has_alternating_winners):
                severity = "Unusual Pattern"
                status = "Needs AI Review"
            elif shared_count >= 4 or similar_price_count >= 2 or has_alternating_winners:
                severity = "Attention"
                status = "Needs AI Review" if (similar_price_count >= 2 or has_alternating_winners) else "Recorded"
            else:
                severity = "Normal Pattern"
                status = "Recorded"

            desc_parts = [f"Participated together in {shared_count} tenders."]
            if similar_price_count > 0:
                desc_parts.append(f"Similar quoted prices observed in {similar_price_count} of {shared_count} tenders.")
            if has_alternating_winners:
                desc_parts.append(f"Alternating winners observed ({sample['company_a_name']}: {c_a_wins} wins, {sample['company_b_name']}: {c_b_wins} wins).")

            result_items.append(
                CompanyRelationshipItem(
                    pair_id=f"{c_a_id}_{c_b_id}",
                    company_a_id=c_a_id,
                    company_a_code=sample["company_a_code"],
                    company_a_name=sample["company_a_name"],
                    company_b_id=c_b_id,
                    company_b_code=sample["company_b_code"],
                    company_b_name=sample["company_b_name"],
                    shared_tenders_count=shared_count,
                    company_a_wins=c_a_wins,
                    company_b_wins=c_b_wins,
                    other_wins=other_wins,
                    similar_price_tenders_count=similar_price_count,
                    different_price_tenders_count=diff_price_count,
                    has_alternating_winners=has_alternating_winners,
                    severity=severity,
                    status=status,
                    summary_description=" ".join(desc_parts),
                )
            )

        # Sort by shared_tenders_count descending
        result_items.sort(key=lambda x: (x.severity == "Unusual Pattern", x.shared_tenders_count), reverse=True)
        return result_items

    def get_company_pair_detail(
        self,
        company_a_id: int,
        company_b_id: int,
        threshold_pct: float = 5.0,
    ) -> Optional[CompanyPairDetailResponse]:
        """
        Retrieves tender-by-tender comparison details for a specific pair of companies.
        """
        c_a = self.db.query(Company).filter(Company.id == company_a_id).first()
        c_b = self.db.query(Company).filter(Company.id == company_b_id).first()
        if not c_a or not c_b:
            return None

        # Find tenders where both participated
        # Subquery or query all participations for both
        parts_a = {
            p.tender_id: p
            for p in self.db.query(TenderParticipation).filter(TenderParticipation.company_id == company_a_id).all()
        }
        parts_b = {
            p.tender_id: p
            for p in self.db.query(TenderParticipation).filter(TenderParticipation.company_id == company_b_id).all()
        }

        shared_tender_ids = set(parts_a.keys()).intersection(set(parts_b.keys()))
        if not shared_tender_ids:
            return CompanyPairDetailResponse(
                company_a_id=c_a.id,
                company_a_code=c_a.company_id,
                company_a_name=c_a.company_name,
                company_b_id=c_b.id,
                company_b_code=c_b.company_id,
                company_b_name=c_b.company_name,
                shared_tenders_count=0,
                company_a_wins=0,
                company_b_wins=0,
                similar_price_count=0,
                severity="Normal Pattern",
                summary_description="No shared tenders found between these two companies.",
                tenders=[],
            )

        tenders = (
            self.db.query(Tender)
            .filter(Tender.id.in_(shared_tender_ids), Tender.is_deleted == False)
            .order_by(Tender.publication_date.desc())
            .all()
        )

        breakdowns: List[SharedTenderBreakdown] = []
        c_a_wins = 0
        c_b_wins = 0
        similar_count = 0

        for tnd in tenders:
            p_a = parts_a[tnd.id]
            p_b = parts_b[tnd.id]

            price_a = float(p_a.quoted_price)
            price_b = float(p_b.quoted_price)
            abs_diff, pct_diff = calculate_price_difference(price_a, price_b)
            is_similar = pct_diff <= threshold_pct
            if is_similar:
                similar_count += 1

            winner_id = None
            winner_name = None
            winner_label = "None Declared"

            if p_a.participation_result == "Won":
                winner_id = c_a.id
                winner_name = c_a.company_name
                winner_label = c_a.company_name
                c_a_wins += 1
            elif p_b.participation_result == "Won":
                winner_id = c_b.id
                winner_name = c_b.company_name
                winner_label = c_b.company_name
                c_b_wins += 1
            else:
                # Check if third company won
                winner_part = (
                    self.db.query(TenderParticipation, Company)
                    .join(Company, TenderParticipation.company_id == Company.id)
                    .filter(
                        TenderParticipation.tender_id == tnd.id,
                        TenderParticipation.participation_result == "Won"
                    )
                    .first()
                )
                if winner_part:
                    winner_id = winner_part[1].id
                    winner_name = winner_part[1].company_name
                    winner_label = f"Other ({winner_part[1].company_name})"

            breakdowns.append(
                SharedTenderBreakdown(
                    tender_id=tnd.id,
                    tender_code=tnd.tender_id,
                    tender_title=tnd.title,
                    tender_category=tnd.category,
                    publication_date=tnd.publication_date,
                    submission_deadline=tnd.submission_deadline,
                    company_a_price=price_a,
                    company_b_price=price_b,
                    currency=p_a.currency,
                    absolute_difference=abs_diff,
                    percentage_difference=pct_diff,
                    is_similar_price=is_similar,
                    winner_company_id=winner_id,
                    winner_company_name=winner_name,
                    winner_label=winner_label,
                )
            )

        total_shared = len(breakdowns)
        has_alternating = (c_a_wins >= 1 and c_b_wins >= 1)

        if total_shared >= 5 and (similar_count >= 3 or has_alternating):
            severity = "Unusual Pattern"
        elif total_shared >= 4 or similar_count >= 2 or has_alternating:
            severity = "Attention"
        else:
            severity = "Normal Pattern"

        desc = f"{c_a.company_name} and {c_b.company_name} participated together in {total_shared} tenders."
        if similar_count > 0:
            desc += f" Similar quoted prices (difference <= {threshold_pct}%) were observed in {similar_count} tenders."
        if has_alternating:
            desc += f" Alternating winners observed ({c_a.company_name}: {c_a_wins}, {c_b.company_name}: {c_b_wins})."

        return CompanyPairDetailResponse(
            company_a_id=c_a.id,
            company_a_code=c_a.company_id,
            company_a_name=c_a.company_name,
            company_b_id=c_b.id,
            company_b_code=c_b.company_id,
            company_b_name=c_b.company_name,
            shared_tenders_count=total_shared,
            company_a_wins=c_a_wins,
            company_b_wins=c_b_wins,
            similar_price_count=similar_count,
            severity=severity,
            summary_description=desc,
            tenders=breakdowns,
        )

    def get_company_frequencies(self) -> List[CompanyFrequencyItem]:
        """
        Computes participation frequency and win rates for each registered company.
        Win Rate = Wins / Completed Participations * 100
        """
        companies = (
            self.db.query(Company)
            .filter(Company.is_deleted == False)
            .order_by(Company.company_name)
            .all()
        )

        items: List[CompanyFrequencyItem] = []
        for c in companies:
            parts = (
                self.db.query(TenderParticipation)
                .join(Tender, TenderParticipation.tender_id == Tender.id)
                .filter(
                    TenderParticipation.company_id == c.id,
                    Tender.is_deleted == False
                )
                .all()
            )

            total = len(parts)
            wins = sum(1 for p in parts if p.participation_result == "Won")
            losses = sum(1 for p in parts if p.participation_result == "Lost")
            disqualified = sum(1 for p in parts if p.participation_result == "Disqualified")
            pending = sum(1 for p in parts if p.participation_result == "Pending")

            completed = wins + losses + disqualified
            if completed > 0:
                win_rate = round((wins / completed) * 100.0, 1)
            else:
                win_rate = 0.0

            items.append(
                CompanyFrequencyItem(
                    company_id=c.id,
                    company_code=c.company_id,
                    company_name=c.company_name,
                    registration_number=c.registration_number,
                    city=c.city,
                    country=c.country,
                    total_participations=total,
                    total_wins=wins,
                    total_losses=losses,
                    total_disqualifications=disqualified,
                    total_pending=pending,
                    win_rate_percentage=win_rate,
                )
            )

        # Sort by total_participations descending
        items.sort(key=lambda x: x.total_participations, reverse=True)
        return items

    def get_unusual_patterns(
        self,
        threshold_pct: float = 5.0,
        pattern_type_filter: Optional[str] = None,
        severity_filter: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
    ) -> List[UnusualPatternItem]:
        """
        Identifies and indexes patterns that warrant further AI/GNN review.
        Neutral descriptive categories:
        1. Repeated Participation
        2. Similar Quoted Prices
        3. Repeated Winner Changes
        4. High Shared Participation
        """
        relationships = self.get_company_relationships(
            min_shared=2,
            threshold_pct=threshold_pct,
            from_date=from_date,
            to_date=to_date,
        )

        items: List[UnusualPatternItem] = []
        pattern_counter = 1

        for rel in relationships:
            # 1. Similar Quoted Prices Pattern
            if rel.similar_price_tenders_count >= 2:
                items.append(
                    UnusualPatternItem(
                        id=f"PAT-SP-{pattern_counter}",
                        pattern_type="Similar Quoted Prices",
                        entity_label=f"{rel.company_a_name} & {rel.company_b_name}",
                        company_ids=[rel.company_a_id, rel.company_b_id],
                        tender_codes=[],
                        observed_description=(
                            f"Similar quoted prices (difference <= {threshold_pct}%) submitted in "
                            f"{rel.similar_price_tenders_count} of {rel.shared_tenders_count} shared tenders."
                        ),
                        frequency_metric=f"{rel.similar_price_tenders_count} / {rel.shared_tenders_count} tenders ({round(rel.similar_price_tenders_count / rel.shared_tenders_count * 100)}%)",
                        severity="Unusual Pattern" if rel.similar_price_tenders_count >= 3 else "Attention",
                        status="Needs AI Review",
                    )
                )
                pattern_counter += 1

            # 2. Repeated Winner Changes / Alternating Winners
            if rel.has_alternating_winners:
                items.append(
                    UnusualPatternItem(
                        id=f"PAT-WC-{pattern_counter}",
                        pattern_type="Repeated Winner Changes",
                        entity_label=f"{rel.company_a_name} & {rel.company_b_name}",
                        company_ids=[rel.company_a_id, rel.company_b_id],
                        tender_codes=[],
                        observed_description=(
                            f"Alternating winner outcomes recorded across shared tenders: "
                            f"{rel.company_a_name} won {rel.company_a_wins} times, "
                            f"{rel.company_b_name} won {rel.company_b_wins} times."
                        ),
                        frequency_metric=f"{rel.company_a_wins + rel.company_b_wins} awarded shared tenders",
                        severity="Unusual Pattern" if (rel.company_a_wins >= 2 and rel.company_b_wins >= 2) else "Attention",
                        status="Needs AI Review",
                    )
                )
                pattern_counter += 1

            # 3. High Shared Participation / Repeated Co-Bidding
            if rel.shared_tenders_count >= 3:
                items.append(
                    UnusualPatternItem(
                        id=f"PAT-RP-{pattern_counter}",
                        pattern_type="Repeated Participation",
                        entity_label=f"{rel.company_a_name} & {rel.company_b_name}",
                        company_ids=[rel.company_a_id, rel.company_b_id],
                        tender_codes=[],
                        observed_description=(
                            f"Companies repeatedly participate together in state tenders ({rel.shared_tenders_count} shared tenders recorded)."
                        ),
                        frequency_metric=f"{rel.shared_tenders_count} shared tenders",
                        severity="Unusual Pattern" if rel.shared_tenders_count >= 5 else "Attention",
                        status="Needs AI Review" if rel.shared_tenders_count >= 4 else "Recorded",
                    )
                )
                pattern_counter += 1

        # Apply optional filters
        if pattern_type_filter and pattern_type_filter != "All":
            items = [it for it in items if it.pattern_type.lower() == pattern_type_filter.lower()]
        if severity_filter and severity_filter != "All":
            items = [it for it in items if it.severity.lower() == severity_filter.lower()]

        return items

    def get_tender_pattern_summary(self, tender_id_or_code: str) -> Optional[TenderPatternSummaryResponse]:
        """
        Evaluates co-bidding and historical pattern summary for a specific tender.
        """
        # Find tender
        tender = None
        if tender_id_or_code.isdigit():
            tender = self.db.query(Tender).filter(Tender.id == int(tender_id_or_code), Tender.is_deleted == False).first()
        if not tender:
            tender = self.db.query(Tender).filter(Tender.tender_id == tender_id_or_code, Tender.is_deleted == False).first()
        if not tender:
            return None

        parts = (
            self.db.query(TenderParticipation, Company)
            .join(Company, TenderParticipation.company_id == Company.id)
            .filter(
                TenderParticipation.tender_id == tender.id,
                Company.is_deleted == False
            )
            .all()
        )

        company_ids = [comp.id for _, comp in parts]
        participant_count = len(company_ids)

        # Check pairs of companies in this tender
        co_bidding_pairs = []
        similar_price_pairs = 0
        repeated_participation_pairs = 0
        previous_winner_relationships = 0

        for i in range(len(parts)):
            for j in range(i + 1, len(parts)):
                p_a, c_a = parts[i]
                p_b, c_b = parts[j]

                # Price diff in this tender
                price_a = float(p_a.quoted_price)
                price_b = float(p_b.quoted_price)
                abs_diff, pct_diff = calculate_price_difference(price_a, price_b)
                is_similar_here = pct_diff <= 5.0
                if is_similar_here:
                    similar_price_pairs += 1

                # Query historical shared tenders between c_a and c_b
                sub_a = (
                    self.db.query(TenderParticipation.tender_id)
                    .filter(TenderParticipation.company_id == c_a.id)
                )
                sub_b = (
                    self.db.query(TenderParticipation.tender_id)
                    .filter(TenderParticipation.company_id == c_b.id)
                )
                shared_hist_ids = set([r[0] for r in sub_a.all()]).intersection(set([r[0] for r in sub_b.all()]))
                shared_count = len(shared_hist_ids)

                if shared_count >= 2:
                    repeated_participation_pairs += 1

                # Check if either had won in past shared tenders
                past_wins = (
                    self.db.query(TenderParticipation)
                    .filter(
                        TenderParticipation.tender_id.in_(shared_hist_ids),
                        TenderParticipation.company_id.in_([c_a.id, c_b.id]),
                        TenderParticipation.participation_result == "Won",
                    )
                    .count()
                )
                if past_wins >= 1:
                    previous_winner_relationships += 1

                co_bidding_pairs.append({
                    "company_a": c_a.company_name,
                    "company_b": c_b.company_name,
                    "price_difference_pct": pct_diff,
                    "is_similar_price": is_similar_here,
                    "historical_shared_tenders": shared_count,
                })

        companies_with_prior_shared = sum(1 for p in co_bidding_pairs if p["historical_shared_tenders"] >= 2)

        notes = (
            f"Tender {tender.tender_id} has {participant_count} participating companies. "
            f"Identified {similar_price_pairs} company pairs with similar quoted prices (<= 5%) "
            f"and {repeated_participation_pairs} company pairs with repeated historical co-bidding."
        )

        return TenderPatternSummaryResponse(
            tender_id=tender.id,
            tender_code=tender.tender_id,
            tender_title=tender.title,
            participating_companies_count=participant_count,
            companies_with_previous_shared_participation=companies_with_prior_shared,
            similar_price_pairs_count=similar_price_pairs,
            repeated_participation_pairs_count=repeated_participation_pairs,
            previous_winner_relationships_count=previous_winner_relationships,
            co_bidding_pairs=co_bidding_pairs,
            pattern_notes=notes,
        )
