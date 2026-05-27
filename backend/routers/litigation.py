from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from backend.database import get_db
from backend.models.litigation import LitigationCase, LitigationDraftHistory
from backend.schemas.litigation import (
    LitigationCaseCreate, LitigationCaseUpdate, LitigationCaseOut,
    DraftHistoryOut, DraftSectionRequest
)
from backend.services import ollama_service

router = APIRouter(prefix="/api/litigation", tags=["litigation"])


@router.get("/cases", response_model=list[LitigationCaseOut])
async def list_cases(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LitigationCase).order_by(LitigationCase.created_at.desc()))
    return result.scalars().all()


@router.post("/cases", response_model=LitigationCaseOut, status_code=201)
async def create_case(data: LitigationCaseCreate, db: AsyncSession = Depends(get_db)):
    case = LitigationCase(**data.model_dump())
    db.add(case)
    await db.flush()
    await db.refresh(case)
    return case


@router.put("/cases/{case_id}", response_model=LitigationCaseOut)
async def update_case(case_id: int, data: LitigationCaseUpdate, db: AsyncSession = Depends(get_db)):
    case = await db.get(LitigationCase, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(case, field, value)
    await db.flush()
    await db.refresh(case)
    return case


@router.post("/cases/{case_id}/draft")
async def draft_all(case_id: int, db: AsyncSession = Depends(get_db)):
    """Draft all three sections using local Ollama."""
    case = await db.get(LitigationCase, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    case_data = {
        "facts_of_case": case.facts_of_case,
        "it_sections": case.it_sections,
        "case_laws": case.case_laws,
        "authority": case.authority,
        "case_type": case.case_type,
    }
    drafts = await ollama_service.draft_all_litigation_sections(case_data)

    case.draft_statement_of_facts = drafts.get("statement_of_facts")
    case.draft_grounds_of_appeal = drafts.get("grounds_of_appeal")
    case.draft_written_submissions = drafts.get("written_submissions")
    case.draft_version += 1
    case.last_drafted_at = datetime.now(timezone.utc)

    # Save to history
    for section, content in drafts.items():
        hist = LitigationDraftHistory(
            case_id=case_id,
            version=case.draft_version,
            section=section,
            content=content,
        )
        db.add(hist)

    await db.flush()
    return drafts


@router.post("/cases/{case_id}/draft/{section}")
async def draft_section(case_id: int, section: str, db: AsyncSession = Depends(get_db)):
    """Draft a single section using local Ollama."""
    valid_sections = ["statement_of_facts", "grounds_of_appeal", "written_submissions"]
    if section not in valid_sections:
        raise HTTPException(status_code=400, detail=f"Section must be one of {valid_sections}")

    case = await db.get(LitigationCase, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    case_data = {
        "facts_of_case": case.facts_of_case,
        "it_sections": case.it_sections,
        "case_laws": case.case_laws,
        "authority": case.authority,
        "case_type": case.case_type,
    }
    content = await ollama_service.draft_litigation_section(section, case_data)

    setattr(case, f"draft_{section}", content)
    # Do not bump draft_version for single-section re-drafts; only draft_all
    # increments the version so the counter reflects complete drafts.
    case.last_drafted_at = datetime.now(timezone.utc)

    hist = LitigationDraftHistory(
        case_id=case_id,
        version=case.draft_version,
        section=section,
        content=content,
    )
    db.add(hist)
    await db.flush()
    return {"section": section, "content": content, "version": case.draft_version}


@router.get("/cases/{case_id}/history", response_model=list[DraftHistoryOut])
async def get_history(case_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(LitigationDraftHistory)
        .where(LitigationDraftHistory.case_id == case_id)
        .order_by(LitigationDraftHistory.created_at.desc())
    )
    return result.scalars().all()
