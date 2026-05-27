# TDS
TDS_SECTIONS = {
    "192":   {"description": "Salary",                        "rate": None},
    "192A":  {"description": "PF withdrawal",                 "rate": 10},
    "194A":  {"description": "Interest (non-bank)",           "rate": 10},
    "194C":  {"description": "Contractor payments",           "rate_ind": 1, "rate_co": 2},
    "194D":  {"description": "Insurance commission",          "rate": 5},
    "194G":  {"description": "Lottery commission",            "rate": 5},
    "194H":  {"description": "Commission / brokerage",        "rate": 5},
    "194I":  {"description": "Rent",                          "rate": 10},
    "194J":  {"description": "Professional / technical fees", "rate": 10},
    "194LA": {"description": "Compensation (land acq.)",      "rate": 10},
    "194Q":  {"description": "Purchase of goods",             "rate": 0.1},
    "206C":  {"description": "TCS",                           "rate": 1},
}
VALID_26Q_SECTIONS = ["194C", "194J", "194I", "194H", "194A", "194B", "194D",
                       "194G", "194LA", "194Q", "206C"]
VALID_24Q_SECTIONS = ["192", "192A"]

# Validation regex
PAN_REGEX   = r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$"
GSTIN_REGEX = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"

# GST
GST_RATES = [0, 5, 12, 18, 28]
GST_DEADLINES = {"GSTR-1": 11, "GSTR-2B_lock": 14, "GSTR-3B": 20}

# Income Tax FY 2024-25 — New Regime slabs (from, to, rate%)
NEW_REGIME_SLABS = [
    (0,          300_000,   0),
    (300_000,    700_000,   5),
    (700_000,  1_000_000,  10),
    (1_000_000, 1_200_000, 15),
    (1_200_000, 1_500_000, 20),
    (1_500_000,       None, 30),
]
OLD_REGIME_SLABS = [
    (0,        250_000,  0),
    (250_000,  500_000,  5),
    (500_000, 1_000_000, 20),
    (1_000_000,    None, 30),
]
REBATE_87A_INCOME_LIMIT = 700_000
REBATE_87A_MAX_AMOUNT   = 25_000
CESS_RATE               = 0.04

# Standard deductions
STANDARD_DEDUCTION_SALARY          = 75_000
STANDARD_DEDUCTION_HOUSE_PROPERTY  = 0.30
MAX_DEDUCTION_80C                  = 150_000
MAX_HOME_LOAN_SELF_OCCUPIED        = 200_000

# Presumptive taxation
PRESUMPTIVE = {
    "44AD":  {"rate": 8,  "digital_rate": 6,  "turnover_limit": 30_000_000},
    "44ADA": {"rate": 50, "digital_rate": 50, "receipts_limit":  7_500_000},
}

# Capital Gains FY 2024-25
CAPITAL_GAINS_RATES = {
    "equity_stcg":        15,
    "equity_ltcg":        12.5,
    "equity_ltcg_exempt": 125_000,
    "property_ltcg":      20,
    "gold_ltcg":          20,
}

# Depreciation — Income Tax Act WDV rates
IT_ACT_DEP_RATES = {
    "Buildings (residential)": 5,
    "Buildings (commercial)":  10,
    "Buildings (temporary)":   40,
    "Plant & Machinery":       15,
    "Computers & software":    40,
    "Furniture & fittings":    10,
    "Motor vehicles":          15,
    "Intangibles":             25,
}
