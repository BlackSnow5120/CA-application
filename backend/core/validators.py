import re
from backend.core.constants import PAN_REGEX, GSTIN_REGEX, TDS_SECTIONS


def validate_pan(pan: str) -> bool:
    return bool(re.match(PAN_REGEX, pan.upper().strip()))


def validate_gstin(gstin: str) -> bool:
    return bool(re.match(GSTIN_REGEX, gstin.upper().strip()))


def validate_tds_section(section: str) -> bool:
    return section in TDS_SECTIONS


def validate_tds_deductee(row: dict) -> list[str]:
    errors = []
    if not validate_pan(row.get("deductee_pan", "")):
        errors.append(f"Invalid PAN: {row.get('deductee_pan')}")
    if not validate_tds_section(row.get("section_code", "")):
        errors.append(f"Unknown TDS section: {row.get('section_code')}")
    if row.get("gross_amount", 0) <= 0:
        errors.append("Gross amount must be positive")
    if row.get("tds_amount", 0) < 0:
        errors.append("TDS amount cannot be negative")
    if row.get("tds_amount", 0) > row.get("gross_amount", 0):
        errors.append("TDS amount cannot exceed gross amount")
    return errors
