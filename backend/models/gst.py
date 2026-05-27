from datetime import date
from typing import Optional, List
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base


class GSTPeriod(Base):
    __tablename__ = "gst_periods"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"))
    period: Mapped[str]             # 'Apr-2024'
    gstr1_status: Mapped[str] = mapped_column(default="pending")
    gstr3b_status: Mapped[str] = mapped_column(default="pending")
    total_output_gst: Mapped[float] = mapped_column(default=0.0)
    total_itc_claimed: Mapped[float] = mapped_column(default=0.0)
    net_payable: Mapped[float] = mapped_column(default=0.0)

    client: Mapped["Client"] = relationship(back_populates="gst_periods")
    invoices: Mapped[List["GSTInvoice"]] = relationship(
        back_populates="period", cascade="all, delete-orphan"
    )


class GSTInvoice(Base):
    __tablename__ = "gst_invoices"

    id: Mapped[int] = mapped_column(primary_key=True)
    gst_period_id: Mapped[int] = mapped_column(ForeignKey("gst_periods.id"))
    invoice_type: Mapped[str]       # 'B2B', 'B2C', 'export'
    invoice_number: Mapped[str]
    invoice_date: Mapped[date]
    party_gstin: Mapped[Optional[str]]
    party_name: Mapped[Optional[str]]
    hsn_code: Mapped[Optional[str]]
    taxable_amount: Mapped[float]
    igst: Mapped[float] = mapped_column(default=0.0)
    cgst: Mapped[float] = mapped_column(default=0.0)
    sgst: Mapped[float] = mapped_column(default=0.0)
    direction: Mapped[str]          # 'sale' or 'purchase'
    recon_status: Mapped[str] = mapped_column(default="pending")

    period: Mapped["GSTPeriod"] = relationship(back_populates="invoices")
