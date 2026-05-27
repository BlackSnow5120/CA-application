from backend.models.client import Client
from backend.models.tds import TDSReturn, TDSDeductee
from backend.models.gst import GSTPeriod, GSTInvoice
from backend.models.itr import ITRReturn
from backend.models.accounting import DepreciationAsset
from backend.models.litigation import LitigationCase, LitigationDraftHistory

__all__ = [
    "Client",
    "TDSReturn", "TDSDeductee",
    "GSTPeriod", "GSTInvoice",
    "ITRReturn",
    "DepreciationAsset",
    "LitigationCase", "LitigationDraftHistory",
]
