from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ITRCreate(BaseModel):
    client_id: int
    financial_year: str
    assessment_year: str
    itr_form: Optional[str] = None
    regime: str = "new"
    salary_data: Optional[dict] = None
    house_property_data: Optional[dict] = None
    capital_gains_data: Optional[dict] = None
    business_income_data: Optional[dict] = None
    other_sources_data: Optional[dict] = None
    deductions_data: Optional[dict] = None


class ITROut(BaseModel):
    id: int
    client_id: int
    financial_year: str
    assessment_year: str
    itr_form: Optional[str]
    status: str
    regime: str
    gross_total_income: float
    taxable_income: float
    tax_liability: float
    advance_tax_paid: float
    tds_credit: float
    self_assessment_tax: float
    ai_review_notes: Optional[str]
    gst_turnover_mismatch: bool
    filed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class TaxComputeRequest(BaseModel):
    taxable_income: float
    regime: str = "new"


class TaxComputeOut(BaseModel):
    taxable_income: float
    regime: str
    slab_breakdown: list
    slab_tax: float
    rebate_87a: float
    surcharge: float
    cess: float
    net_tax_liability: float
