from datetime import datetime
from typing import Optional
from sqlalchemy import ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base


class ITRReturn(Base):
    __tablename__ = "itr_returns"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"))
    financial_year: Mapped[str]
    assessment_year: Mapped[str]
    itr_form: Mapped[Optional[str]]
    status: Mapped[str] = mapped_column(default="draft")
    regime: Mapped[str] = mapped_column(default="new")

    salary_data: Mapped[Optional[dict]] = mapped_column(JSON)
    house_property_data: Mapped[Optional[dict]] = mapped_column(JSON)
    capital_gains_data: Mapped[Optional[dict]] = mapped_column(JSON)
    business_income_data: Mapped[Optional[dict]] = mapped_column(JSON)
    other_sources_data: Mapped[Optional[dict]] = mapped_column(JSON)
    deductions_data: Mapped[Optional[dict]] = mapped_column(JSON)

    gross_total_income: Mapped[float] = mapped_column(default=0.0)
    taxable_income: Mapped[float] = mapped_column(default=0.0)
    tax_liability: Mapped[float] = mapped_column(default=0.0)
    advance_tax_paid: Mapped[float] = mapped_column(default=0.0)
    tds_credit: Mapped[float] = mapped_column(default=0.0)
    self_assessment_tax: Mapped[float] = mapped_column(default=0.0)

    ai_review_notes: Mapped[Optional[str]]
    gst_turnover_mismatch: Mapped[bool] = mapped_column(default=False)
    filed_at: Mapped[Optional[datetime]]
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    client: Mapped["Client"] = relationship(back_populates="itr_returns")
