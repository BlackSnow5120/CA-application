def format_inr(amount: float) -> str:
    """Format number as Indian Rupee string with lakhs/crores notation."""
    amount = round(amount, 2)
    is_negative = amount < 0
    amount = abs(amount)

    s = f"{amount:.2f}"
    integer_part, decimal_part = s.split(".")

    # Indian number system grouping
    if len(integer_part) <= 3:
        formatted = integer_part
    else:
        formatted = integer_part[-3:]
        integer_part = integer_part[:-3]
        while integer_part:
            formatted = integer_part[-2:] + "," + formatted
            integer_part = integer_part[:-2]

    result = f"₹{formatted}.{decimal_part}"
    return f"-{result}" if is_negative else result


def format_pan(pan: str) -> str:
    return pan.upper().strip() if pan else ""


def format_gstin(gstin: str) -> str:
    return gstin.upper().strip() if gstin else ""


def financial_year_label(fy: str) -> str:
    """Convert '2024-25' to 'FY 2024-25'"""
    return f"FY {fy}" if not fy.startswith("FY") else fy
