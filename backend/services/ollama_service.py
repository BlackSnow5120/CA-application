import httpx
import json
import re
from typing import Optional
from backend.config import settings
import logging

logger = logging.getLogger(__name__)

OLLAMA_BASE = settings.ollama_base_url
MODEL       = settings.ollama_model
TIMEOUT     = settings.ollama_timeout


async def _call_ollama(prompt: str, max_tokens: int = 1024,
                        system: str = "") -> Optional[str]:
    """
    Core Ollama call. Returns None if Ollama is unavailable.
    Uses /api/generate endpoint (works with all Ollama versions).
    """
    payload = {
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "num_predict": max_tokens,
            "temperature": 0.3,
            "top_p": 0.9,
        }
    }
    if system:
        payload["system"] = system

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                f"{OLLAMA_BASE}/api/generate",
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            return data.get("response", "").strip()
    except httpx.ConnectError:
        logger.warning("Ollama not reachable at %s", OLLAMA_BASE)
        return None
    except httpx.TimeoutException:
        logger.warning("Ollama timed out after %s seconds", TIMEOUT)
        return None
    except Exception as e:
        logger.error("Ollama error: %s", str(e))
        return None


async def check_ollama_status() -> dict:
    """Returns {available, model, version} — used by frontend status banner."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(f"{OLLAMA_BASE}/api/tags")
            r.raise_for_status()
            tags = r.json().get("models", [])
            available_models = [m["name"] for m in tags]
            model_available = any(MODEL in m for m in available_models)
            return {
                "available": True,
                "model": MODEL,
                "model_loaded": model_available,
                "all_models": available_models,
            }
    except Exception:
        return {"available": False, "model": MODEL, "model_loaded": False}


# ── 1. Excel column mapping ────────────────────────────────────────────────────
async def detect_column_mapping(
    headers: list[str],
    sample_rows: list[dict],
    expected_fields: list[str]
) -> dict:
    """Map messy client Excel headers to our standard fields."""
    prompt = f"""You are a data mapping assistant for Indian CA firm software.
Map these Excel column headers to our standard field names.
Return ONLY a valid JSON object. No explanation. No markdown.

Our standard fields: {json.dumps(expected_fields)}
Excel headers found: {json.dumps(headers)}
Sample data (2 rows): {json.dumps(sample_rows)}

Example output format:
{{"PAN No": "deductee_pan", "Employee Name": "deductee_name", "Amount Paid": "gross_amount"}}

If a header cannot be mapped to any standard field, map it to null.
Return only the JSON object:"""

    result = await _call_ollama(
        prompt, max_tokens=400,
        system="You are a precise data mapping tool. Output valid JSON only."
    )
    if not result:
        return {}
    try:
        cleaned = re.sub(r'```(?:json)?|```', '', result).strip()
        return json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("Column mapping returned invalid JSON: %s", result[:200])
        return {}


# ── 2. Bank transaction categorisation ────────────────────────────────────────
async def categorise_transactions(narrations: list[dict]) -> list[dict]:
    """Suggest ledger head for each bank transaction."""
    ledger_heads = [
        "Salary", "Rent", "Professional Fees", "GST Payment", "Advance Tax",
        "Office Expenses", "Utilities", "Vendor Payment", "Client Receipt",
        "Bank Charges", "Interest Income", "Loan Repayment",
        "Capital Contribution", "Petty Cash", "Other"
    ]

    prompt = f"""Categorise each bank transaction into a ledger head.
Available ledger heads: {json.dumps(ledger_heads)}

Return a JSON array only. No explanation. No markdown.
Format: [{{"id": 1, "suggested_ledger": "Rent", "confidence": "high"}}]
Confidence levels: high / medium / low

Transactions:
{json.dumps(narrations)}

JSON array:"""

    result = await _call_ollama(
        prompt, max_tokens=600,
        system="You are an accounting assistant. Output valid JSON arrays only."
    )
    if not result:
        return [{"id": n["id"], "suggested_ledger": "Other", "confidence": "low"}
                for n in narrations]
    try:
        cleaned = re.sub(r'```(?:json)?|```', '', result).strip()
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return [{"id": n["id"], "suggested_ledger": "Other", "confidence": "low"}
                for n in narrations]


# ── 3. TDS section suggestion ──────────────────────────────────────────────────
async def suggest_tds_section(payment_description: str) -> dict:
    """Suggest TDS section code from a plain-English payment description."""
    sections_ref = """
192  - Salary payments to employees
194C - Contractor / sub-contractor payments (1% individual, 2% company)
194J - Professional fees / technical services (10%)
194I - Rent for land, building, plant, machinery (10%)
194H - Commission or brokerage (5%)
194A - Interest other than bank interest (10%)
194Q - Purchase of goods where buyer turnover > ₹10 crore (0.1%)
206C - Tax collected at source on sale of goods/scrap (1%)
"""
    prompt = f"""You are a TDS expert for Indian income tax.
Given the payment description below, suggest the correct TDS section.

TDS sections:
{sections_ref}

Payment description: "{payment_description}"

Return ONLY a JSON object:
{{"section": "194J", "rate": 10, "reason": "one sentence explanation"}}

If unsure, return: {{"section": null, "rate": null, "reason": "Cannot determine from description"}}

JSON:"""

    result = await _call_ollama(
        prompt, max_tokens=150,
        system="You are a TDS expert. Output valid JSON only."
    )
    if not result:
        return {"section": None, "rate": None, "reason": "Local AI unavailable"}
    try:
        cleaned = re.sub(r'```(?:json)?|```', '', result).strip()
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {"section": None, "rate": None, "reason": "Could not parse AI response"}


# ── 4. ITR anomaly review (anonymised) ─────────────────────────────────────────
async def review_itr_anonymised(summary: dict) -> str:
    """
    Review an ITR summary for anomalies before filing.
    CALLER MUST anonymise before calling — replace client name, remove PAN/address.
    """
    prompt = f"""You are a senior Chartered Accountant reviewing an Income Tax Return
before filing. Review the anonymised summary below and flag:

1. Figures that may trigger departmental scrutiny
2. Deduction amounts that seem unusually high
3. Income sources visible in AIS/TIS that may be missing
4. Turnover mismatch with GST returns (if flagged)
5. Any ratio that looks anomalous for the stated profession/business type

Be specific and concise. Number each flag. If the return looks clean, say so.
Maximum 250 words.

ITR Summary:
{json.dumps(summary, indent=2)}

Review:"""

    result = await _call_ollama(
        prompt, max_tokens=512,
        system="You are a senior CA reviewing tax returns for anomalies. Be concise and practical."
    )
    if not result:
        return "Local AI unavailable — manual review required before filing."
    return result


# ── 5. Litigation drafting ─────────────────────────────────────────────────────
async def draft_litigation_section(section: str, case_data: dict) -> str:
    """Draft one section of a litigation document."""
    section_instructions = {
        "statement_of_facts": (
            "Draft a Statement of Facts in formal Indian legal English. "
            "Structure: (1) Background of assessee, (2) Chronology of events, "
            "(3) The department's action/notice/assessment, (4) Assessee's response. "
            "Write in third person. Be precise with dates, amounts, and section numbers."
        ),
        "grounds_of_appeal": (
            "Draft Grounds of Appeal numbered sequentially (Ground No. 1, Ground No. 2...). "
            "Each ground must: state the legal grievance clearly, cite the specific "
            "provision of the Income Tax Act violated, reference a provided case law "
            "if applicable, and conclude with why the action is legally unsustainable. "
            "Language must be appropriate for ITAT / CIT(A) proceedings."
        ),
        "written_submissions": (
            "Draft Written Submissions grouped by issue. "
            "For each issue: state relevant facts, cite applicable IT Act sections, "
            "apply provided case law precedents to the facts of the case. "
            "Conclude each issue with a specific prayer for relief. "
            "Use formal legal English suitable for submission before tax authorities."
        )
    }

    case_laws_text = "\n".join([
        f"  - {cl['citation']} ({cl['court']}, {cl['year']}): {cl['holding']}"
        for cl in (case_data.get("case_laws") or [])
    ]) or "  None provided by the CA."

    sections_text = ", ".join(case_data.get("it_sections") or []) or "Not specified"

    system_prompt = (
        "You are a senior tax advocate drafting documents for Indian income tax litigation. "
        "Write in formal legal English. "
        "CRITICAL RULE: Never cite, invent, or hallucinate any case law not explicitly "
        "listed in the provided case laws section. If no case laws are provided, "
        "do not cite any. Accuracy is more important than completeness."
    )

    section_title = section.replace("_", " ").title()
    prompt = f"""Task: Draft the {section_title}

Instructions:
{section_instructions.get(section, "Draft the requested section.")}

--- CASE INFORMATION ---

Facts of the case:
{case_data.get("facts_of_case", "Not provided")}

Income Tax sections involved:
{sections_text}

Case laws (USE ONLY THESE — do not add others):
{case_laws_text}

Authority before which this is filed:
{case_data.get("authority", "Not specified")}

Case type:
{case_data.get("case_type", "Not specified")}

--- END CASE INFORMATION ---

Draft the {section_title} now.
Output only the draft. No preamble, no commentary, no headings outside the document itself."""

    result = await _call_ollama(prompt, max_tokens=1800, system=system_prompt)

    if not result:
        return (
            "Local AI unavailable. Please ensure Ollama is running:\n"
            "  docker-compose up -d ollama\n"
            "  bash ollama-models.sh\n\n"
            "Then retry drafting."
        )
    return result


# ── 6. Batch draft all three sections ─────────────────────────────────────────
async def draft_all_litigation_sections(case_data: dict) -> dict:
    """Draft all three sections sequentially."""
    results = {}
    for section in ["statement_of_facts", "grounds_of_appeal", "written_submissions"]:
        results[section] = await draft_litigation_section(section, case_data)
    return results
