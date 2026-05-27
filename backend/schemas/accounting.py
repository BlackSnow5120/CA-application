from datetime import date
from typing import Optional
from pydantic import BaseModel


class DepreciationAssetCreate(BaseModel):
    client_id: int
    asset_name: str
    asset_block: str
    purchase_date: date
    cost: float
    companies_act_rate: float
    income_tax_rate: float
    opening_wdv_companies: Optional[float] = None
    opening_wdv_tax: Optional[float] = None
    financial_year: str


class DepreciationAssetOut(DepreciationAssetCreate):
    id: int
    depreciation_companies: Optional[float]
    depreciation_tax: Optional[float]
    closing_wdv_companies: Optional[float]
    closing_wdv_tax: Optional[float]

    class Config:
        from_attributes = True


class ColumnMapRequest(BaseModel):
    headers: list[str]
    sample_rows: list[dict]
    expected_fields: list[str]


class BankTransactionIn(BaseModel):
    id: int
    narration: str
