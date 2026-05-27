from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel


class TDSDeducteeCreate(BaseModel):
    deductee_pan: str
    deductee_name: str
    section_code: str
    payment_date: date
    gross_amount: float
    tds_amount: float
    challan_number: Optional[str] = None
    challan_date: Optional[date] = None


class TDSDeducteeOut(TDSDeducteeCreate):
    id: int
    tds_return_id: int

    class Config:
        from_attributes = True


class TDSReturnCreate(BaseModel):
    client_id: int
    form_type: str
    quarter: str
    financial_year: str


class TDSReturnOut(BaseModel):
    id: int
    client_id: int
    form_type: str
    quarter: str
    financial_year: str
    status: str
    deductee_count: int
    total_tds_amount: float
    json_path: Optional[str]
    errors_json: Optional[str]
    filed_at: Optional[datetime]
    created_at: datetime
    deductees: List[TDSDeducteeOut] = []

    class Config:
        from_attributes = True


class TDSSectionSuggestRequest(BaseModel):
    payment_description: str


class TDSValidationError(BaseModel):
    row: int
    field: str
    value: str
    issue: str


class TDSValidateRequest(BaseModel):
    rows: list[dict]


class TDSGenerateMeta(BaseModel):
    client_id: int | None = None
    form_type: str = "26Q"
    quarter: str = "Q1-2024-25"
    financial_year: str = "2024-25"


class TDSGenerateRequest(BaseModel):
    rows: list[dict]
    meta: TDSGenerateMeta = TDSGenerateMeta()
