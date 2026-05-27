import io
from typing import Optional
import openpyxl
import pandas as pd


def parse_excel_tds(file_bytes: bytes) -> dict:
    """
    Parse a TDS Excel file. Returns headers, sample rows, and all rows.
    Handles merged cells and blank header rows gracefully.
    """
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    ws = wb.active

    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return {"headers": [], "sample_rows": [], "all_rows": []}

    # Find first non-empty row as headers
    header_row_idx = 0
    for i, row in enumerate(rows):
        if any(cell is not None for cell in row):
            header_row_idx = i
            break

    raw_headers = [str(h).strip() if h is not None else f"col_{j}"
                   for j, h in enumerate(rows[header_row_idx])]

    data_rows = []
    for row in rows[header_row_idx + 1:]:
        if any(cell is not None for cell in row):
            data_rows.append(dict(zip(raw_headers, [str(c) if c is not None else "" for c in row])))

    sample = data_rows[:2]
    return {
        "headers": raw_headers,
        "sample_rows": sample,
        "all_rows": data_rows,
        "row_count": len(data_rows),
    }


def apply_column_mapping(rows: list[dict], mapping: dict) -> list[dict]:
    """
    Apply AI-generated or manual column mapping to raw rows.
    Skips columns mapped to null.
    """
    result = []
    reverse_map = {k: v for k, v in mapping.items() if v is not None}
    for row in rows:
        mapped = {}
        for excel_col, std_field in reverse_map.items():
            if excel_col in row:
                mapped[std_field] = row[excel_col]
        result.append(mapped)
    return result


def parse_bank_statement_csv(file_bytes: bytes, encoding: str = "utf-8") -> list[dict]:
    """
    Parse a bank statement CSV.
    Returns list of {date, narration, debit, credit, balance}.
    """
    try:
        df = pd.read_csv(io.BytesIO(file_bytes), encoding=encoding, skip_blank_lines=True)
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

        # Normalize common column names
        col_map = {
            "transaction_date": "date", "txn_date": "date", "value_date": "date",
            "description": "narration", "particulars": "narration",
            "withdrawal_amt": "debit", "withdrawal": "debit",
            "deposit_amt": "credit", "deposit": "credit",
            "balance_amt": "balance", "closing_balance": "balance",
        }
        df.rename(columns={k: v for k, v in col_map.items() if k in df.columns}, inplace=True)

        rows = []
        for _, row in df.iterrows():
            rows.append({
                "date": str(row.get("date", "")),
                "narration": str(row.get("narration", "")),
                "debit": _to_float(row.get("debit", 0)),
                "credit": _to_float(row.get("credit", 0)),
                "balance": _to_float(row.get("balance", 0)),
            })
        return rows
    except Exception as e:
        return [{"error": str(e)}]


def _to_float(val) -> float:
    if val is None or str(val).strip() in ("", "-", "nan"):
        return 0.0
    try:
        return float(str(val).replace(",", ""))
    except ValueError:
        return 0.0
