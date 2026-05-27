from datetime import date
from typing import Optional, List
from pydantic import BaseModel


class GSTInvoiceCreate(BaseModel):
    invoice_type: str
    invoice_number: str
    invoice_date: date
    party_gstin: Optional[str] = None
    party_name: Optional[str] = None
    hsn_code: Optional[str] = None
    taxable_amount: float
    igst: float = 0.0
    cgst: float = 0.0
    sgst: float = 0.0
    direction: str


class GSTInvoiceOut(GSTInvoiceCreate):
    id: int
    gst_period_id: int
    recon_status: str

    class Config:
        from_attributes = True


class GSTPeriodCreate(BaseModel):
    client_id: int
    period: str


class GSTPeriodOut(BaseModel):
    id: int
    client_id: int
    period: str
    gstr1_status: str
    gstr3b_status: str
    total_output_gst: float
    total_itc_claimed: float
    net_payable: float
    invoices: List[GSTInvoiceOut] = []

    class Config:
        from_attributes = True


class ReconRequest(BaseModel):
    gst_period_id: int
    portal_2b: List[dict]


class ReconActionRequest(BaseModel):
    invoice_id: int
    action: str   # 'accept' | 'reject' | 'pending'
