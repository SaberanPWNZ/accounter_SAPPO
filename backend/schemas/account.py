from datetime import datetime

from pydantic import BaseModel, field_validator

from ._validators import name_not_empty
from .transaction import TransactionOut


class AccountCreate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def _name_not_empty(cls, v: str) -> str:
        return name_not_empty(v)


class AccountSummary(BaseModel):
    id: int
    name: str
    balance: float
    created_at: datetime

    model_config = {"from_attributes": True}


class AccountOut(BaseModel):
    id: int
    name: str
    balance: float
    created_at: datetime
    transactions: list[TransactionOut] = []

    model_config = {"from_attributes": True}
