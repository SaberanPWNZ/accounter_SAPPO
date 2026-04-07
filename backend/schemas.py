from datetime import datetime
from pydantic import BaseModel, field_validator


# ---------- Transaction ----------

class ParticipantCreate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be empty")
        return v.strip()


class ParticipantOut(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class TransactionCreate(BaseModel):
    amount: float
    description: str = ""
    category: str = ""
    is_expense: bool = True
    is_paid: bool = True
    card_number: str | None = None
    contributor_name: str | None = None
    spender_name: str | None = None
    created_at: datetime | None = None
    participants: list[ParticipantCreate] = []

    @field_validator("description")
    @classmethod
    def description_strip(cls, v: str) -> str:
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
    is_expense: bool
    is_paid: bool
    card_number: str | None
    contributor_name: str | None
    spender_name: str | None
    created_at: datetime
    participants: list[ParticipantOut] = []

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


class MemberCreate(BaseModel):
    name: str
    card_number: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be empty")
        return v.strip()


class MemberUpdate(BaseModel):
    name: str
    card_number: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be empty")
        return v.strip()


class MemberOut(BaseModel):
    id: int
    name: str
    card_number: str | None

    model_config = {"from_attributes": True}


class TransactionUpdate(BaseModel):
    amount: float
    description: str = ""
    category: str = ""
    is_expense: bool = True
    is_paid: bool = True
    card_number: str | None = None
    contributor_name: str | None = None
    spender_name: str | None = None
    created_at: datetime | None = None

    @field_validator("amount")
    @classmethod
    def amount_not_zero(cls, v: float) -> float:
        if v == 0:
            raise ValueError("amount must not be zero")
        return v


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


class ContributorMonthStat(BaseModel):
    name: str
    amount: float
    count: int


class MonthContributions(BaseModel):
    year: int
    month: int
    month_name: str
    total: float
    contributors: list[ContributorMonthStat]


class CategoryStat(BaseModel):
    category: str
    total: float
    count: int


class CategoryCreate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be empty")
        return v.strip()


class CategoryOut(BaseModel):
    id: int
    account_id: int
    name: str

    model_config = {"from_attributes": True}
