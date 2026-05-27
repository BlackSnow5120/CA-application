"""
Seed script — creates 5 clients with full TDS, GST, ITR, depreciation and litigation data.
Run: python -m backend.seed    (from project root)
"""
import asyncio
from datetime import date, datetime, timedelta
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from backend.database import AsyncSessionLocal, init_db
from backend.models.client import Client
from backend.models.tds import TDSReturn, TDSDeductee
from backend.models.gst import GSTPeriod, GSTInvoice
from backend.models.itr import ITRReturn
from backend.models.accounting import DepreciationAsset
from backend.models.litigation import LitigationCase


CLIENTS = [
    {"name": "Ramesh Traders",          "pan": "AABCR1234F", "gstin": "27AABCR1234F1Z5", "client_type": "firm",       "email": "ramesh@traders.in"},
    {"name": "Priya Software Pvt Ltd",  "pan": "AABCP5678G", "gstin": "27AABCP5678G1Z3", "client_type": "company",    "email": "accounts@priyasoftware.com"},
    {"name": "Dr. Anand Sharma",        "pan": "AABCA9012H", "gstin": None,               "client_type": "individual", "email": "dr.anand@gmail.com"},
    {"name": "Sunrise Exports LLP",     "pan": "AABCS9012H", "gstin": "29AABCS9012H1Z1", "client_type": "llp",        "email": "sunrise@exports.in"},
    {"name": "Kavitha Textiles",        "pan": "AABCK3456I", "gstin": "33AABCK3456I1Z7", "client_type": "firm",       "email": "kavitha@textiles.in"},
]

QUARTERS = ["Q1-2024-25", "Q2-2024-25", "Q3-2024-25", "Q4-2024-25"]
QUARTER_STATUSES = ["filed", "filed", "validated", "draft"]

GST_PERIODS = ["Oct-2024", "Nov-2024", "Dec-2024", "Jan-2025", "Feb-2025", "Mar-2025"]

ASSETS = [
    {"asset_name": "Dell Laptop",        "asset_block": "Computers & software", "income_tax_rate": 40, "companies_act_rate": 33.33, "cost": 85000,  "purchase_date": date(2023, 6, 15)},
    {"asset_name": "Office Furniture",   "asset_block": "Furniture & fittings",  "income_tax_rate": 10, "companies_act_rate": 10,    "cost": 120000, "purchase_date": date(2022, 4, 1)},
    {"asset_name": "Honda City Car",     "asset_block": "Motor vehicles",        "income_tax_rate": 15, "companies_act_rate": 20,    "cost": 1200000,"purchase_date": date(2021, 9, 20)},
]


async def seed():
    await init_db()

    async with AsyncSessionLocal() as db:
        created_clients = []
        for cd in CLIENTS:
            c = Client(**cd)
            db.add(c)
            await db.flush()
            created_clients.append(c)

        for idx, client in enumerate(created_clients):
            # ── TDS returns ─────────────────────────────────────────────────
            for q_idx, quarter in enumerate(QUARTERS):
                status = QUARTER_STATUSES[q_idx]
                form_type = "24Q" if client.client_type in ("company", "llp") else "26Q"
                tds_ret = TDSReturn(
                    client_id=client.id,
                    form_type=form_type,
                    quarter=quarter,
                    financial_year="2024-25",
                    status=status,
                    deductee_count=3,
                    total_tds_amount=round(15000 + idx * 3000 + q_idx * 1000, 2),
                    filed_at=datetime(2024, 7 + q_idx * 3, 28) if status == "filed" else None,
                )
                db.add(tds_ret)
                await db.flush()

                # Add 3 deductees per return
                for d_idx in range(3):
                    pan_chars = "ABCDE"[d_idx] * 5
                    deductee = TDSDeductee(
                        tds_return_id=tds_ret.id,
                        deductee_pan=f"{pan_chars}{1000 + d_idx}A",
                        deductee_name=f"Vendor {d_idx + 1}",
                        section_code="194J" if d_idx == 0 else "194C",
                        payment_date=date(2024, 5 + q_idx * 3, 15),
                        gross_amount=50000 + d_idx * 10000,
                        tds_amount=5000 + d_idx * 1000,
                        challan_number=f"CHN{quarter.replace('-','')}{d_idx}",
                    )
                    db.add(deductee)

            # ── GST periods ─────────────────────────────────────────────────
            for p_idx, period in enumerate(GST_PERIODS):
                gst_period = GSTPeriod(
                    client_id=client.id,
                    period=period,
                    gstr1_status="filed" if p_idx < 4 else "pending",
                    gstr3b_status="filed" if p_idx < 4 else "pending",
                    total_output_gst=round(45000 + idx * 5000 + p_idx * 2000, 2),
                    total_itc_claimed=round(30000 + idx * 3000 + p_idx * 1000, 2),
                    net_payable=round(15000 + idx * 2000 + p_idx * 1000, 2),
                )
                db.add(gst_period)
                await db.flush()

                # Add 10 invoices per period
                for inv_idx in range(10):
                    is_sale = inv_idx < 7
                    taxable = round(20000 + inv_idx * 5000 + idx * 2000, 2)
                    gst_rate = 0.18 if inv_idx % 2 == 0 else 0.12
                    total_gst = round(taxable * gst_rate, 2)
                    invoice = GSTInvoice(
                        gst_period_id=gst_period.id,
                        invoice_type="B2B" if is_sale else "B2B",
                        invoice_number=f"INV-{period.replace('-','')}-{inv_idx + 1:03d}",
                        invoice_date=date(int("20" + period[-2:]), list(["Oct","Nov","Dec","Jan","Feb","Mar"]).index(period[:3]) + 10, 10 + inv_idx),
                        party_gstin=f"27XXXXXTEST{inv_idx}Z1" if is_sale else client.gstin,
                        party_name=f"Party {inv_idx + 1}",
                        hsn_code="9983" if is_sale else "8471",
                        taxable_amount=taxable,
                        igst=total_gst if inv_idx % 3 == 0 else 0,
                        cgst=total_gst / 2 if inv_idx % 3 != 0 else 0,
                        sgst=total_gst / 2 if inv_idx % 3 != 0 else 0,
                        direction="sale" if is_sale else "purchase",
                        recon_status="matched" if p_idx < 3 else "pending",
                    )
                    db.add(invoice)

            # ── ITR ──────────────────────────────────────────────────────────
            salary_income = 1200000 + idx * 200000
            business_inc  = 800000 + idx * 100000 if client.client_type != "individual" else 0
            other_inc     = 50000 + idx * 10000
            total_income  = salary_income + business_inc + other_inc
            deductions_80c = 150000

            itr = ITRReturn(
                client_id=client.id,
                financial_year="2024-25",
                assessment_year="2025-26",
                itr_form="ITR-3" if business_inc > 0 else "ITR-1",
                status="validated" if idx < 2 else "draft",
                regime="new",
                salary_data={"gross_salary": salary_income, "standard_deduction": 75000},
                business_income_data={"turnover": business_inc * 10, "profit": business_inc, "section": "44ADA"} if business_inc else None,
                other_sources_data={"interest": other_inc},
                deductions_data={"section_80c": deductions_80c},
                gross_total_income=total_income,
                taxable_income=total_income - 75000,
                tax_liability=round((total_income - 75000) * 0.10),
                advance_tax_paid=round((total_income - 75000) * 0.05),
                tds_credit=round((total_income - 75000) * 0.03),
                self_assessment_tax=0,
                gst_turnover_mismatch=False,
            )
            db.add(itr)

            # ── Depreciation assets ──────────────────────────────────────────
            for a_idx, asset_data in enumerate(ASSETS[:2 + (idx % 2)]):
                asset = DepreciationAsset(
                    client_id=client.id,
                    financial_year="2024-25",
                    opening_wdv_tax=round(asset_data["cost"] * 0.7, 2),
                    opening_wdv_companies=round(asset_data["cost"] * 0.65, 2),
                    depreciation_tax=round(asset_data["cost"] * 0.7 * asset_data["income_tax_rate"] / 100, 2),
                    depreciation_companies=round(asset_data["cost"] * 0.65 * asset_data["companies_act_rate"] / 100, 2),
                    closing_wdv_tax=round(asset_data["cost"] * 0.7 * (1 - asset_data["income_tax_rate"] / 100), 2),
                    closing_wdv_companies=round(asset_data["cost"] * 0.65 * (1 - asset_data["companies_act_rate"] / 100), 2),
                    **asset_data,
                )
                db.add(asset)

        # ── Litigation cases ─────────────────────────────────────────────────
        # Priya Software — search & seizure
        priya = created_clients[1]
        lit1 = LitigationCase(
            client_id=priya.id,
            case_title="Search & Seizure — AY 2022-23",
            case_type="search_seizure",
            authority="CIT(A)",
            notice_date=date(2024, 3, 15),
            hearing_date=date(2025, 8, 20),
            status="active",
            facts_of_case=(
                "A search and seizure operation under Section 132 of the Income Tax Act was "
                "conducted at the business premises of Priya Software Pvt Ltd on 15th March 2024. "
                "The Assessing Officer has added ₹45,00,000 as unexplained cash credit under "
                "Section 68, claiming the company failed to prove the identity and creditworthiness "
                "of share applicants. The assessee contends that all share applications were "
                "received through banking channels with full documentation."
            ),
            it_sections=["132", "68", "263"],
            case_laws=[
                {
                    "citation": "CIT v. Lovely Exports Pvt Ltd",
                    "court": "Supreme Court",
                    "year": 2008,
                    "holding": "Where share application money is received through banking channels with supporting documentation, the burden shifts to the department to prove the money is unexplained."
                }
            ],
        )
        db.add(lit1)

        # Dr. Anand — Section 148 reassessment
        anand = created_clients[2]
        lit2 = LitigationCase(
            client_id=anand.id,
            case_title="Reassessment Notice — AY 2021-22 (Section 148)",
            case_type="scrutiny",
            authority="ITAT",
            notice_date=date(2024, 6, 1),
            hearing_date=date(2025, 9, 10),
            status="active",
            facts_of_case=(
                "A notice under Section 148A(b) was issued to Dr. Anand Sharma for Assessment "
                "Year 2021-22, alleging that professional receipts of ₹28,00,000 were not "
                "disclosed in the ITR. The assessee had filed ITR-4 under Section 44ADA, "
                "declaring 50% of gross receipts as income. The department's notice relies on "
                "Form 26AS showing TDS deductions on the full amount, without accounting for "
                "the presumptive taxation scheme applicable to medical professionals."
            ),
            it_sections=["148A", "148", "44ADA", "271(1)(c)"],
            case_laws=[
                {
                    "citation": "PCIT v. Subhash Kumar Bhatia",
                    "court": "Delhi High Court",
                    "year": 2022,
                    "holding": "A medical professional eligible under Section 44ADA is required to declare only 50% of gross receipts; TDS on full receipts does not indicate income suppression."
                }
            ],
        )
        db.add(lit2)

        await db.commit()
        print("✅ Seeded: 5 clients with TDS, GST, ITR, Depreciation, and 2 Litigation cases.")


if __name__ == "__main__":
    asyncio.run(seed())
