import re


def reconcile_2b(my_purchases: list[dict], portal_2b: list[dict]) -> dict:
    def norm(inv: str) -> str:
        return re.sub(r'[^A-Z0-9]', '', inv.upper().strip())

    portal_idx = {(norm(p["invoice_number"]), p.get("party_gstin", "")): p for p in portal_2b}
    my_idx     = {(norm(p["invoice_number"]), p.get("party_gstin", "")): p for p in my_purchases}

    matched, mismatched, missing, extra = [], [], [], []

    for key, pi in portal_idx.items():
        mi = my_idx.get(key)
        if not mi:
            extra.append({**pi, "recon_status": "extra_in_2b"})
        elif abs(mi["taxable_amount"] - pi["taxable_amount"]) <= 1:
            matched.append({**mi, "recon_status": "matched"})
        else:
            mismatched.append({
                **mi, "recon_status": "mismatch",
                "portal_amount": pi["taxable_amount"],
                "diff": mi["taxable_amount"] - pi["taxable_amount"]
            })

    for key, mi in my_idx.items():
        if key not in portal_idx:
            missing.append({**mi, "recon_status": "missing_in_2b"})

    eligible_itc = sum(i["igst"] + i["cgst"] + i["sgst"] for i in matched)
    return {
        "matched": matched,
        "mismatched": mismatched,
        "missing_in_2b": missing,
        "extra_in_2b": extra,
        "summary": {
            "matched_count": len(matched),
            "mismatch_count": len(mismatched),
            "missing_count": len(missing),
            "extra_count": len(extra),
            "eligible_itc": round(eligible_itc, 2)
        }
    }


def compute_3b(sales: list[dict], accepted_purchases: list[dict]) -> dict:
    out = {k: sum(i.get(k, 0) for i in sales) for k in ["igst", "cgst", "sgst"]}
    itc = {k: sum(i.get(k, 0) for i in accepted_purchases) for k in ["igst", "cgst", "sgst"]}
    out["total"] = out["igst"] + out["cgst"] + out["sgst"]
    itc["total"] = itc["igst"] + itc["cgst"] + itc["sgst"]
    net = {k: max(0, round(out[k] - itc[k], 2)) for k in ["igst", "cgst", "sgst", "total"]}
    return {
        "output_gst": out,
        "eligible_itc": itc,
        "net_payable": net,
        "credit_balance": round(max(0, itc["total"] - out["total"]), 2)
    }
