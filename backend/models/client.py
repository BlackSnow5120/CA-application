from datetime import datetime
from typing import Optional, List
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    pan: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    gstin: Mapped[Optional[str]] = mapped_column(String(15))
    email: Mapped[Optional[str]]
    phone: Mapped[Optional[str]]
    client_type: Mapped[str] = mapped_column(default="individual")
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    tds_returns: Mapped[List["TDSReturn"]] = relationship(back_populates="client")
    gst_periods: Mapped[List["GSTPeriod"]] = relationship(back_populates="client")
    itr_returns: Mapped[List["ITRReturn"]] = relationship(back_populates="client")
    litigation_cases: Mapped[List["LitigationCase"]] = relationship(back_populates="client")
    assets: Mapped[List["DepreciationAsset"]] = relationship(back_populates="client")
