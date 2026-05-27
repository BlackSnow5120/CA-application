from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from backend.database import get_db
from backend.models.gst import GSTPeriod, GSTInvoice
from backend.schemas.gst import GSTPeriodCreate, GSTPeriodOut, ReconRequest, ReconActionRequest
from backend.services.gst_service import reconcile_2b, compute_3b

router = APIRouter(prefix="/api/gst", tags=["gst"])


@router.get("/{client_id}/{period}", response_model=GSTPeriodOut)
async def get_period(client_id: int, period: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(GSTPeriod)
        .where(GSTPeriod.client_id == client_id, GSTPeriod.period == period)
        .options(selectinload(GSTPeriod.invoices))
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="GST period not found")
    return p


@router.post("/invoices/upload")
async def upload_invoices(payload: dict, db: AsyncSession = Depends(get_db)):
    """Bulk-insert invoices for a period."""
    period_id = payload.get("gst_period_id")
    invoices = payload.get("invoices", [])
    period = await db.get(GSTPeriod, period_id)
    if not period:
        raise HTTPException(status_code=404, detail="GST period not found")
    for inv_data in invoices:
        inv = GSTInvoice(gst_period_id=period_id, **inv_data)
        db.add(inv)
    await db.flush()
    return {"inserted": len(invoices)}


@router.post("/reconcile")
async def reconcile(req: ReconRequest, db: AsyncSession = Depends(get_db)):
    """Reconcile my purchase invoices vs GSTR-2B from portal."""
    result = await db.execute(
        select(GSTInvoice)
        .where(GSTInvoice.gst_period_id == req.gst_period_id,
               GSTInvoice.direction == "purchase")
    )
    my_purchases = [
        {
            "invoice_number": inv.invoice_number,
            "party_gstin": inv.party_gstin or "",
            "taxable_amount": inv.taxable_amount,
            "igst": inv.igst, "cgst": inv.cgst, "sgst": inv.sgst,
        }
        for inv in result.scalars().all()
    ]
    recon = reconcile_2b(my_purchases, req.portal_2b)
    return recon


@router.get("/{client_id}/{period}/3b")
async def get_3b(client_id: int, period: str, db: AsyncSession = Depends(get_db)):
    """Compute GSTR-3B figures from stored invoices."""
    p_result = await db.execute(
        select(GSTPeriod)
        .where(GSTPeriod.client_id == client_id, GSTPeriod.period == period)
    )
    p = p_result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="GST period not found")

    inv_result = await db.execute(
        select(GSTInvoice).where(GSTInvoice.gst_period_id == p.id)
    )
    invoices = inv_result.scalars().all()

    sales = [{"igst": i.igst, "cgst": i.cgst, "sgst": i.sgst}
             for i in invoices if i.direction == "sale"]
    purchases = [{"igst": i.igst, "cgst": i.cgst, "sgst": i.sgst}
                 for i in invoices if i.direction == "purchase" and i.recon_status == "matched"]
    return compute_3b(sales, purchases)


@router.post("/recon/action")
async def recon_action(req: ReconActionRequest, db: AsyncSession = Depends(get_db)):
    """Mark an invoice as accepted/rejected/pending in reconciliation."""
    inv = await db.get(GSTInvoice, req.invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    inv.recon_status = req.action
    await db.flush()
    return {"id": inv.id, "recon_status": inv.recon_status}
