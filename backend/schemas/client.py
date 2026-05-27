from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator
import re

PAN_REGEX   = r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$"
GSTIN_REGEX = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"


class ClientCreate(BaseModel):
    name: str
    pan: str
    gstin: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    client_type: str = "individual"

    @field_validator("pan")
    @classmethod
    def validate_pan(cls, v):
        v = v.upper().strip()
        if not re.match(PAN_REGEX, v):
            raise ValueError("Invalid PAN format")
        return v

    @field_validator("gstin")
    @classmethod
    def validate_gstin(cls, v):
        if v is None:
            return v
        v = v.upper().strip()
        if not re.match(GSTIN_REGEX, v):
            raise ValueError("Invalid GSTIN format")
        return v


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    gstin: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    client_type: Optional[str] = None


class ClientOut(BaseModel):
    id: int
    name: str
    pan: str
    gstin: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    client_type: str
    created_at: datetime

    class Config:
        from_attributes = True
