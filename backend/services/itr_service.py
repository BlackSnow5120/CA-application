from backend.core.constants import (
    NEW_REGIME_SLABS, OLD_REGIME_SLABS,
    REBATE_87A_INCOME_LIMIT, REBATE_87A_MAX_AMOUNT,
    REBATE_87A_OLD_INCOME_LIMIT, REBATE_87A_OLD_MAX_AMOUNT,
    SURCHARGE_BRACKETS_NEW, SURCHARGE_BRACKETS_OLD,
    CESS_RATE, IT_ACT_DEP_RATES,
)


def compute_tax_liability(taxable_income: float, regime: str = "new") -> dict:
    slabs = NEW_REGIME_SLABS if regime == "new" else OLD_REGIME_SLABS
    slab_tax = 0.0
    breakdown = []

    for lower, upper, rate in slabs:
        if taxable_income <= lower:
            break
        amount_in_slab = (min(taxable_income, upper) if upper else taxable_income) - lower
        tax_in_slab = amount_in_slab * rate / 100
        slab_tax += tax_in_slab
        breakdown.append({
            "from": lower, "to": upper, "rate": rate,
            "amount": round(amount_in_slab), "tax": round(tax_in_slab)
        })

    # Rebate 87A — regime-specific limits (FY 2024-25)
    if regime == "new":
        rebate = min(slab_tax, REBATE_87A_MAX_AMOUNT) \
            if taxable_income <= REBATE_87A_INCOME_LIMIT else 0.0
    else:
        rebate = min(slab_tax, REBATE_87A_OLD_MAX_AMOUNT) \
            if taxable_income <= REBATE_87A_OLD_INCOME_LIMIT else 0.0
    tax_after_rebate = max(0, slab_tax - rebate)

    # Surcharge — full brackets, regime-dependent (FY 2024-25)
    surcharge = 0.0
    brackets = SURCHARGE_BRACKETS_NEW if regime == "new" else SURCHARGE_BRACKETS_OLD
    for lower_threshold, upper_threshold, surcharge_rate in brackets:
        if taxable_income > lower_threshold:
            surcharge = tax_after_rebate * surcharge_rate
            break

    cess = (tax_after_rebate + surcharge) * CESS_RATE
    net_tax = round(tax_after_rebate + surcharge + cess)

    return {
        "taxable_income": taxable_income,
        "regime": regime,
        "slab_breakdown": breakdown,
        "slab_tax": round(slab_tax),
        "rebate_87a": round(rebate),
        "surcharge": round(surcharge),
        "cess": round(cess),
        "net_tax_liability": net_tax,
    }


def recommend_regime(taxable_income: float, deductions: float = 0) -> dict:
    """Compare old vs new regime and recommend the better one."""
    new = compute_tax_liability(taxable_income, "new")
    old = compute_tax_liability(max(0, taxable_income - deductions), "old")
    if new["net_tax_liability"] <= old["net_tax_liability"]:
        return {"recommended": "new", "new": new, "old": old,
                "saving": old["net_tax_liability"] - new["net_tax_liability"]}
    return {"recommended": "old", "new": new, "old": old,
            "saving": new["net_tax_liability"] - old["net_tax_liability"]}
