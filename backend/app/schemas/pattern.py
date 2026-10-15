from datetime import date
from typing import Optional, List
from pydantic import BaseModel, Field


class DataSufficiencyResponse(BaseModel):
    is_sufficient: bool
    tenders_count: int
    companies_count: int
    completed_tenders_count: int
    total_participations_count: int
    status_message: str
    recommendation: Optional[str] = None


class PatternSummaryResponse(BaseModel):
    total_tenders_analyzed: int
    companies_analyzed: int
    repeated_company_pairs: int
    unusual_patterns_found: int
    similar_price_pairs_count: int
    alternating_winners_pairs_count: int
    is_sufficient_data: bool
    status_note: str


class SharedTenderBreakdown(BaseModel):
    tender_id: int
    tender_code: str
    tender_title: str
    tender_category: str
    publication_date: Optional[date] = None
    submission_deadline: Optional[date] = None
    company_a_price: float
    company_b_price: float
    currency: str
    absolute_difference: float
    percentage_difference: float
    is_similar_price: bool
    winner_company_id: Optional[int] = None
    winner_company_name: Optional[str] = None
    winner_label: str  # e.g., "Company A", "Company B", "Other", or "None"


class CompanyRelationshipItem(BaseModel):
    pair_id: str  # e.g., "1_2"
    company_a_id: int
    company_a_code: str
    company_a_name: str
    company_b_id: int
    company_b_code: str
    company_b_name: str
    shared_tenders_count: int
    company_a_wins: int
    company_b_wins: int
    other_wins: int
    similar_price_tenders_count: int
    different_price_tenders_count: int
    has_alternating_winners: bool
    severity: str  # "Normal Pattern", "Attention", "Unusual Pattern"
    status: str  # "Needs AI Review" or "Recorded"
    summary_description: str


class CompanyPairDetailResponse(BaseModel):
    company_a_id: int
    company_a_code: str
    company_a_name: str
    company_b_id: int
    company_b_code: str
    company_b_name: str
    shared_tenders_count: int
    company_a_wins: int
    company_b_wins: int
    similar_price_count: int
    severity: str
    summary_description: str
    tenders: List[SharedTenderBreakdown]


class CompanyFrequencyItem(BaseModel):
    company_id: int
    company_code: str
    company_name: str
    registration_number: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    total_participations: int
    total_wins: int
    total_losses: int
    total_disqualifications: int
    total_pending: int
    win_rate_percentage: float


class UnusualPatternItem(BaseModel):
    id: str
    pattern_type: str  # "Repeated Participation", "Similar Quoted Prices", "Repeated Winner Changes", "High Shared Participation"
    entity_label: str  # e.g. "ABC Infrastructure & XYZ Builders"
    company_ids: List[int] = []
    tender_codes: List[str] = []
    observed_description: str
    frequency_metric: str  # e.g. "5 of 8 shared tenders (62.5%)"
    severity: str  # "Normal Pattern", "Attention", "Unusual Pattern"
    status: str = "Needs AI Review"


class TenderPatternSummaryResponse(BaseModel):
    tender_id: int
    tender_code: str
    tender_title: str
    participating_companies_count: int
    companies_with_previous_shared_participation: int
    similar_price_pairs_count: int
    repeated_participation_pairs_count: int
    previous_winner_relationships_count: int
    co_bidding_pairs: List[dict] = []
    pattern_notes: str
