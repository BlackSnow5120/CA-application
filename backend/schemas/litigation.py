from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel


class CaseLawIn(BaseModel):
    citation: str
    court: str
    year: int
    holding: str


class LitigationCaseCreate(BaseModel):
    client_id: int
    case_title: str
    case_type: str
    authority: str
    notice_date: Optional[date] = None
    hearing_date: Optional[date] = None
    facts_of_case: Optional[str] = None
    it_sections: Optional[List[str]] = None
    case_laws: Optional[List[dict]] = None


class LitigationCaseUpdate(BaseModel):
    case_title: Optional[str] = None
    case_type: Optional[str] = None
    authority: Optional[str] = None
    notice_date: Optional[date] = None
    hearing_date: Optional[date] = None
    status: Optional[str] = None
    facts_of_case: Optional[str] = None
    it_sections: Optional[List[str]] = None
    case_laws: Optional[List[dict]] = None


class LitigationCaseOut(BaseModel):
    id: int
    client_id: int
    case_title: str
    case_type: str
    authority: str
    notice_date: Optional[date]
    hearing_date: Optional[date]
    status: str
    facts_of_case: Optional[str]
    it_sections: Optional[List[str]]
    case_laws: Optional[List[dict]]
    draft_statement_of_facts: Optional[str]
    draft_grounds_of_appeal: Optional[str]
    draft_written_submissions: Optional[str]
    draft_version: int
    last_drafted_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class DraftHistoryOut(BaseModel):
    id: int
    case_id: int
    version: int
    section: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class DraftSectionRequest(BaseModel):
    section: str   # 'statement_of_facts' | 'grounds_of_appeal' | 'written_submissions'
