from datetime import date
from typing import Optional
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base


class DepreciationAsset(Base):
    __tablename__ = "depreciation_assets"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"))
    asset_name: Mapped[str]
    asset_block: Mapped[str]
    purchase_date: Mapped[date]
    cost: Mapped[float]
    companies_act_rate: Mapped[float]
    income_tax_rate: Mapped[float]
    opening_wdv_companies: Mapped[Optional[float]]
    opening_wdv_tax: Mapped[Optional[float]]
    depreciation_companies: Mapped[Optional[float]]
    depreciation_tax: Mapped[Optional[float]]
    closing_wdv_companies: Mapped[Optional[float]]
    closing_wdv_tax: Mapped[Optional[float]]
    financial_year: Mapped[str]

    client: Mapped["Client"] = relationship(back_populates="assets")
