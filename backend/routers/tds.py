import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.database import get_db
from backend.models.tds import TDSReturn, TDSDeductee
from backend.schemas.tds import TDSReturnCreate, TDSReturnOut, TDSSectionSuggestRequest, TDSValidationError
from backend.services import excel_parser, ollama_service
from backend.core.validators import validate_tds_deductee
from backend.core.constants import TDS_SECTIONS

router = APIRouter(prefix="/api/tds", tags=["tds"])

TDS_EXPECTED_FIELDS = [
    "deductee_pan", "deductee_name", "section_code",
    "payment_date", "gross_amount", "tds_amount",
    "challan_number", "challan_date"
]


@router.get("/{client_id}/returns", response_model=list[TDSReturnOut])
async def list_returns(client_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TDSReturn).where(TDSReturn.client_id == client_id).order_by(TDSReturn.created_at.desc())
    )
    return result.scalars().all()


@router.post("/upload-excel")
async def upload_excel(file: UploadFile = File(...)):
    """Parse Excel and return headers + sample for column mapping."""
    content = await file.read()
    parsed = excel_parser.parse_excel_tds(content)
    return {
        "headers": parsed["headers"],
        "sample_rows": parsed["sample_rows"],
        "row_count": parsed["row_count"],
        "expected_fields": TDS_EXPECTED_FIELDS,
    }


@router.post("/validate")
async def validate_tds(payload: dict):
    """Validate mapped TDS rows. Returns list of errors."""
    rows = payload.get("rows", [])
    errors = []
    for idx, row in enumerate(rows):
        row_errors = validate_tds_deductee(row)
        for err in row_errors:
            errors.append({
                "row": idx + 1,
                "field": err.split(":")[0] if ":" in err else "general",
                "value": "",
                "issue": err
            })
    return {"errors": errors, "valid_count": len(rows) - len(set(e["row"] for e in errors))}


@router.post("/generate-json")
async def generate_json(payload: dict):
    """Generate NSDL-compatible JSON for TDS return filing."""
    rows = payload.get("rows", [])
    meta = payload.get("meta", {})
    total_tds = sum(float(r.get("tds_amount", 0)) for r in rows)
    output = {
        "form_type": meta.get("form_type", "26Q"),
        "quarter": meta.get("quarter", "Q1-2024-25"),
        "financial_year": meta.get("financial_year", "2024-25"),
        "deductee_count": len(rows),
        "total_tds_amount": round(total_tds, 2),
        "deductees": rows,
        "generated_at": datetime.utcnow().isoformat(),
    }
    return output


@router.post("/suggest-section")
async def suggest_section(req: TDSSectionSuggestRequest):
    """Use local Ollama to suggest TDS section from payment description."""
    result = await ollama_service.suggest_tds_section(req.payment_description)
    return result
