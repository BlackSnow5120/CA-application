from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.database import get_db
from backend.models.accounting import DepreciationAsset
from backend.schemas.accounting import DepreciationAssetCreate, DepreciationAssetOut, ColumnMapRequest
from backend.services import ollama_service, excel_parser
from backend.services.depreciation_service import compute_depreciation, get_it_dep_rate

router = APIRouter(prefix="/api/accounting", tags=["accounting"])


@router.post("/map-columns")
async def map_columns(req: ColumnMapRequest):
    """Use Ollama to map arbitrary Excel headers to our standard fields."""
    mapping = await ollama_service.detect_column_mapping(
        req.headers, req.sample_rows, req.expected_fields
    )
    return {"mapping": mapping, "ai_used": bool(mapping)}


@router.post("/upload-bank-statement")
async def upload_bank(file: UploadFile = File(...)):
    """Parse uploaded bank statement CSV."""
    content = await file.read()
    rows = excel_parser.parse_bank_statement_csv(content)
    return {"rows": rows, "count": len(rows)}


@router.post("/categorise-transactions")
async def categorise(payload: dict):
    """Use Ollama to suggest ledger heads for bank transactions."""
    narrations = payload.get("narrations", [])
    results = await ollama_service.categorise_transactions(narrations)
    return {"categorised": results}


@router.post("/depreciation/compute", response_model=DepreciationAssetOut, status_code=201)
async def add_asset(data: DepreciationAssetCreate, db: AsyncSession = Depends(get_db)):
    """Add asset and compute depreciation for both Acts."""
    # IT Act
    it_rate = data.income_tax_rate or get_it_dep_rate(data.asset_block)
    it_dep = compute_depreciation(
        cost=data.cost,
        opening_wdv=data.opening_wdv_tax or data.cost,
        rate=it_rate,
        purchase_date=str(data.purchase_date),
        financial_year=data.financial_year,
    )
    # Companies Act (simplified WDV for now)
    ca_dep = compute_depreciation(
        cost=data.cost,
        opening_wdv=data.opening_wdv_companies or data.cost,
        rate=data.companies_act_rate,
        purchase_date=str(data.purchase_date),
        financial_year=data.financial_year,
    )

    asset = DepreciationAsset(
        **data.model_dump(),
        depreciation_tax=it_dep["depreciation"],
        closing_wdv_tax=it_dep["closing_wdv"],
        depreciation_companies=ca_dep["depreciation"],
        closing_wdv_companies=ca_dep["closing_wdv"],
    )
    db.add(asset)
    await db.flush()
    await db.refresh(asset)
    return asset


@router.get("/depreciation/{client_id}", response_model=list[DepreciationAssetOut])
async def list_assets(client_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(DepreciationAsset).where(DepreciationAsset.client_id == client_id)
    )
    return result.scalars().all()
