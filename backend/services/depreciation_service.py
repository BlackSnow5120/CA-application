from backend.core.constants import IT_ACT_DEP_RATES


def compute_depreciation(
    cost: float,
    opening_wdv: float,
    rate: float,
    purchase_date: str,
    financial_year: str,
    half_year: bool = False
) -> dict:
    """
    Compute WDV depreciation for IT Act purposes.
    If asset acquired after 1st October (2nd half of FY), depreciation is halved.
    """
    base = opening_wdv if opening_wdv and opening_wdv > 0 else cost
    dep_rate = rate / 2 if half_year else rate
    dep_amount = round(base * dep_rate / 100, 2)
    closing_wdv = round(base - dep_amount, 2)

    return {
        "opening_wdv": base,
        "rate": rate,
        "half_year_rule": half_year,
        "effective_rate": dep_rate,
        "depreciation": dep_amount,
        "closing_wdv": max(0, closing_wdv),
    }


def compute_companies_act_depreciation(
    cost: float,
    useful_life_years: int,
    residual_value_pct: float = 5.0
) -> dict:
    """
    Straight-line method per Companies Act 2013 Schedule II.
    """
    residual_value = cost * residual_value_pct / 100
    depreciable_amount = cost - residual_value
    annual_dep = round(depreciable_amount / useful_life_years, 2) if useful_life_years > 0 else 0
    return {
        "cost": cost,
        "residual_value": residual_value,
        "depreciable_amount": depreciable_amount,
        "useful_life_years": useful_life_years,
        "annual_depreciation_slm": annual_dep,
    }


def get_it_dep_rate(asset_block: str) -> float:
    """Look up IT Act WDV rate for an asset block."""
    return IT_ACT_DEP_RATES.get(asset_block, 15.0)
