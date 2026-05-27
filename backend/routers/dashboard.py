from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from backend.database import get_db
from backend.models.client import Client
from backend.models.tds import TDSReturn
from backend.models.gst import GSTPeriod
from backend.models.itr import ITRReturn
from backend.core.constants import GST_DEADLINES
from backend.services.ollama_service import check_ollama_status

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/system/ollama-status")
async def ollama_status():
    return await check_ollama_status()


@router.get("/dashboard/summary")
async def dashboard_summary(db: AsyncSession = Depends(get_db)):
    today = date.today()
    current_month = today.month
    current_year = today.year

    # Deadlines for current month
    deadlines = []
    for return_type, day in GST_DEADLINES.items():
        deadline_date = date(current_year, current_month, day)
        days_left = (deadline_date - today).days
        status = "overdue" if days_left < 0 else "red" if days_left <= 1 else "amber" if days_left <= 5 else "green"
        deadlines.append({
            "type": return_type,
            "deadline_date": deadline_date.isoformat(),
            "days_left": days_left,
            "status": status,
        })

    # TDS quarterly deadlines — Q1/Q2 are in current FY start year; Q3/Q4 spill into next calendar year
    # FY runs Apr–Mar, so Q3 due Jan and Q4 due May belong to the year AFTER FY start
    fy_start_year = current_year if current_month >= 4 else current_year - 1
    tds_quarters = [
        ("Q1", date(fy_start_year, 7, 31)),
        ("Q2", date(fy_start_year, 10, 31)),
        ("Q3", date(fy_start_year + 1, 1, 31)),
        ("Q4", date(fy_start_year + 1, 5, 31)),
    ]
    for q, ddate in tds_quarters:
        days_left = (ddate - today).days
        status = "overdue" if days_left < 0 else "red" if days_left <= 1 else "amber" if days_left <= 5 else "green"
        deadlines.append({
            "type": f"TDS-{q}",
            "deadline_date": ddate.isoformat(),
            "days_left": days_left,
            "status": status,
        })

    # --- Bulk queries to avoid N+1 per client ---
    clients_result = await db.execute(select(Client))
    clients = clients_result.scalars().all()
    client_ids = [c.id for c in clients]

    if client_ids:
        # Latest TDS return per client (bulk fetch, pick first per client_id)
        tds_all_result = await db.execute(
            select(TDSReturn)
            .where(TDSReturn.client_id.in_(client_ids))
            .order_by(TDSReturn.client_id, TDSReturn.created_at.desc())
        )
        latest_tds_map: dict[int, TDSReturn] = {}
        for t in tds_all_result.scalars().all():
            if t.client_id not in latest_tds_map:
                latest_tds_map[t.client_id] = t

        # GST periods for current month (one query)
        period_str = today.strftime("%b-%Y")
        gst_all_result = await db.execute(
            select(GSTPeriod).where(
                GSTPeriod.client_id.in_(client_ids),
                GSTPeriod.period == period_str,
            )
        )
        gst_period_map: dict[int, GSTPeriod] = {
            p.client_id: p for p in gst_all_result.scalars().all()
        }

        # Latest ITR per client (bulk fetch, pick first per client_id)
        itr_all_result = await db.execute(
            select(ITRReturn)
            .where(ITRReturn.client_id.in_(client_ids))
            .order_by(ITRReturn.client_id, ITRReturn.created_at.desc())
        )
        latest_itr_map: dict[int, ITRReturn] = {}
        for itr in itr_all_result.scalars().all():
            if itr.client_id not in latest_itr_map:
                latest_itr_map[itr.client_id] = itr
    else:
        latest_tds_map, gst_period_map, latest_itr_map = {}, {}, {}
        period_str = today.strftime("%b-%Y")

    client_summaries = []
    for c in clients:
        latest_tds = latest_tds_map.get(c.id)
        gst_period = gst_period_map.get(c.id)
        latest_itr = latest_itr_map.get(c.id)

        client_summaries.append({
            "id": c.id,
            "name": c.name,
            "pan": c.pan,
            "gstin": c.gstin,
            "client_type": c.client_type,
            "gst_this_month": {
                "period": period_str,
                "gstr1_status": gst_period.gstr1_status if gst_period else "no_data",
                "gstr3b_status": gst_period.gstr3b_status if gst_period else "no_data",
                "net_payable": gst_period.net_payable if gst_period else 0,
            },
            "tds_latest": {
                "quarter": latest_tds.quarter if latest_tds else "no_data",
                "status": latest_tds.status if latest_tds else "no_data",
                "total_tds": latest_tds.total_tds_amount if latest_tds else 0,
            },
            "itr_status": {
                "fy": latest_itr.financial_year if latest_itr else "no_data",
                "status": latest_itr.status if latest_itr else "no_data",
            },
        })

    return {
        "deadlines": deadlines,
        "clients": client_summaries,
        "total_clients": len(clients),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
