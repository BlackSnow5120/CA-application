from backend.core.constants import (
    NEW_REGIME_SLABS, OLD_REGIME_SLABS,
    REBATE_87A_INCOME_LIMIT, REBATE_87A_MAX_AMOUNT, CESS_RATE,
    IT_ACT_DEP_RATES
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

    rebate = min(slab_tax, REBATE_87A_MAX_AMOUNT) \
        if taxable_income <= REBATE_87A_INCOME_LIMIT else 0.0
    tax_after_rebate = max(0, slab_tax - rebate)

    surcharge = 0.0
    if taxable_income > 5_000_000:
        rate = 0.10 if taxable_income <= 10_000_000 else 0.15
        surcharge = tax_after_rebate * rate

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
