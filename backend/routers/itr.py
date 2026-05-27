from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from backend.database import get_db
from backend.models.itr import ITRReturn
from backend.models.gst import GSTPeriod, GSTInvoice
from backend.schemas.itr import ITRCreate, ITROut, TaxComputeRequest, TaxComputeOut
from backend.services.itr_service import compute_tax_liability
from backend.services import ollama_service
from backend.core.constants import STANDARD_DEDUCTION_SALARY

router = APIRouter(prefix="/api/itr", tags=["itr"])


@router.get("/{client_id}/{fy}", response_model=list[ITROut])
async def list_itr(client_id: int, fy: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ITRReturn)
        .where(ITRReturn.client_id == client_id, ITRReturn.financial_year == fy)
    )
    return result.scalars().all()


@router.post("/save", response_model=ITROut, status_code=201)
async def save_itr(data: ITRCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        select(ITRReturn).where(
            ITRReturn.client_id == data.client_id,
            ITRReturn.financial_year == data.financial_year,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail=f"ITR for client {data.client_id} FY {data.financial_year} already exists",
        )
    itr = ITRReturn(**data.model_dump())
    db.add(itr)
    await db.flush()
    await db.refresh(itr)
    return itr


@router.post("/{itr_id}/compute-tax")
async def compute_tax(itr_id: int, req: TaxComputeRequest, db: AsyncSession = Depends(get_db)):
    itr = await db.get(ITRReturn, itr_id)
    if not itr:
        raise HTTPException(status_code=404, detail="ITR not found")
    result = compute_tax_liability(req.taxable_income, req.regime)
    # Update the record
    itr.tax_liability = result["net_tax_liability"]
    itr.taxable_income = req.taxable_income
    await db.flush()
    return result


@router.post("/{itr_id}/gst-crosscheck")
async def gst_crosscheck(itr_id: int, db: AsyncSession = Depends(get_db)):
    """Cross-check ITR turnover against actual GST sales invoices for the FY."""
    itr = await db.get(ITRReturn, itr_id)
    if not itr:
        raise HTTPException(status_code=404, detail="ITR not found")

    itr_turnover = 0.0
    if itr.business_income_data:
        itr_turnover = itr.business_income_data.get("turnover", 0.0)

    # Derive all 12 GST period strings for the ITR's financial year
    fy_start = int(itr.financial_year.split("-")[0])
    fy_periods = [
        f"Apr-{fy_start}", f"May-{fy_start}", f"Jun-{fy_start}",
        f"Jul-{fy_start}", f"Aug-{fy_start}", f"Sep-{fy_start}",
        f"Oct-{fy_start}", f"Nov-{fy_start}", f"Dec-{fy_start}",
        f"Jan-{fy_start + 1}", f"Feb-{fy_start + 1}", f"Mar-{fy_start + 1}",
    ]

    # Fetch matching GST period IDs for this client
    period_result = await db.execute(
        select(GSTPeriod.id).where(
            GSTPeriod.client_id == itr.client_id,
            GSTPeriod.period.in_(fy_periods),
        )
    )
    period_ids = [r[0] for r in period_result.all()]

    gst_turnover = 0.0
    if period_ids:
        turnover_result = await db.execute(
            select(func.sum(GSTInvoice.taxable_amount)).where(
                GSTInvoice.gst_period_id.in_(period_ids),
                GSTInvoice.direction == "sale",
            )
        )
        gst_turnover = turnover_result.scalar_one() or 0.0

    mismatch = abs(itr_turnover - gst_turnover) > 50_000 if gst_turnover > 0 else False
    itr.gst_turnover_mismatch = mismatch
    await db.flush()
    return {
        "itr_turnover": itr_turnover,
        "gst_turnover": round(gst_turnover, 2),
        "mismatch": mismatch,
        "diff": round(itr_turnover - gst_turnover, 2),
    }


@router.post("/{itr_id}/ai-review")
async def ai_review(itr_id: int, db: AsyncSession = Depends(get_db)):
    """Anonymised AI review of ITR using local Ollama."""
    itr = await db.get(ITRReturn, itr_id)
    if not itr:
        raise HTTPException(status_code=404, detail="ITR not found")

    # Build anonymised summary — NO PAN, NO name
    summary = {
        "client": "Client A",    # anonymised
        "financial_year": itr.financial_year,
        "regime": itr.regime,
        "itr_form": itr.itr_form,
        "gross_total_income": itr.gross_total_income,
        "taxable_income": itr.taxable_income,
        "tax_liability": itr.tax_liability,
        "tds_credit": itr.tds_credit,
        "advance_tax_paid": itr.advance_tax_paid,
        "salary_income": (itr.salary_data or {}).get("gross_salary", 0),
        "business_turnover": (itr.business_income_data or {}).get("turnover", 0),
        "gst_turnover_mismatch": itr.gst_turnover_mismatch,
        "deductions_80c": (itr.deductions_data or {}).get("section_80c", 0),
    }

    notes = await ollama_service.review_itr_anonymised(summary)
    itr.ai_review_notes = notes
    await db.flush()
    return {"review_notes": notes}
