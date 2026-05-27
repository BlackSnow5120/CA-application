from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base


class TDSReturn(Base):
    __tablename__ = "tds_returns"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"))
    form_type: Mapped[str]          # '24Q' or '26Q'
    quarter: Mapped[str]            # 'Q1-2024-25'
    financial_year: Mapped[str]     # '2024-25'
    status: Mapped[str] = mapped_column(default="draft")
    deductee_count: Mapped[int] = mapped_column(default=0)
    total_tds_amount: Mapped[float] = mapped_column(default=0.0)
    json_path: Mapped[Optional[str]]
    errors_json: Mapped[Optional[str]]
    filed_at: Mapped[Optional[datetime]]
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    client: Mapped["Client"] = relationship(back_populates="tds_returns")
    deductees: Mapped[List["TDSDeductee"]] = relationship(
        back_populates="tds_return", cascade="all, delete-orphan"
    )


class TDSDeductee(Base):
    __tablename__ = "tds_deductees"

    id: Mapped[int] = mapped_column(primary_key=True)
    tds_return_id: Mapped[int] = mapped_column(ForeignKey("tds_returns.id"))
    deductee_pan: Mapped[str] = mapped_column(String(10))
    deductee_name: Mapped[str]
    section_code: Mapped[str]
    payment_date: Mapped[date]
    gross_amount: Mapped[float]
    tds_amount: Mapped[float]
    challan_number: Mapped[Optional[str]]
    challan_date: Mapped[Optional[date]]

    tds_return: Mapped["TDSReturn"] = relationship(back_populates="deductees")
