from datetime import datetime
from pydantic import BaseModel, field_validator


# ---------- Transaction ----------

class TransactionCreate(BaseModel):
    amount: float
    description: str
    category: str = ""

    @field_validator("description")
    @classmethod
    def description_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("description must not be empty")
        return v.strip()

    @field_validator("amount")
    @classmethod
    def amount_not_zero(cls, v: float) -> float:
        if v == 0:
            raise ValueError("amount must not be zero")
        return v

    @field_validator("category")
    @classmethod
    def category_strip(cls, v: str) -> str:
        return v.strip()


class TransactionOut(BaseModel):
    id: int
    account_id: int
    amount: float
    description: str
    category: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------- Account ----------

class AccountCreate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be empty")
        return v.strip()


class AccountOut(BaseModel):
    id: int
    name: str
    balance: float
    created_at: datetime
    transactions: list[TransactionOut] = []

    model_config = {"from_attributes": True}


class AccountSummary(BaseModel):
    id: int
    name: str
    balance: float
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------- Statistics ----------

class DayStat(BaseModel):
    date: str          # "YYYY-MM-DD"
    income: float
    expenses: float
    net: float
    count: int


class MonthStat(BaseModel):
    year: int
    month: int
    month_name: str
    income: float
    expenses: float
    net: float
    count: int


class CategoryStat(BaseModel):
    category: str
    total: float
    count: int
