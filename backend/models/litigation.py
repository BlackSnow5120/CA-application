from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base


class LitigationCase(Base):
    __tablename__ = "litigation_cases"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"))
    case_title: Mapped[str]
    case_type: Mapped[str]          # 'search_seizure','benami','appeal','scrutiny','survey'
    authority: Mapped[str]          # 'ITAT','CIT(A)','High Court'
    notice_date: Mapped[Optional[date]]
    hearing_date: Mapped[Optional[date]]
    status: Mapped[str] = mapped_column(default="active")
    facts_of_case: Mapped[Optional[str]]
    it_sections: Mapped[Optional[list]] = mapped_column(JSON)
    case_laws: Mapped[Optional[list]] = mapped_column(JSON)

    draft_statement_of_facts: Mapped[Optional[str]]
    draft_grounds_of_appeal: Mapped[Optional[str]]
    draft_written_submissions: Mapped[Optional[str]]
    draft_version: Mapped[int] = mapped_column(default=0)
    last_drafted_at: Mapped[Optional[datetime]]
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    client: Mapped["Client"] = relationship(back_populates="litigation_cases")
    draft_history: Mapped[List["LitigationDraftHistory"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )


class LitigationDraftHistory(Base):
    __tablename__ = "litigation_draft_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("litigation_cases.id"))
    version: Mapped[int]
    section: Mapped[str]
    content: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    case: Mapped["LitigationCase"] = relationship(back_populates="draft_history")
