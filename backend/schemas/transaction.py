from datetime import datetime

from pydantic import BaseModel, field_validator

from ._validators import amount_not_zero, name_not_empty


class ParticipantCreate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def _name_not_empty(cls, v: str) -> str:
        return name_not_empty(v)


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
    def _amount_not_zero(cls, v: float) -> float:
        return amount_not_zero(v)

    @field_validator("category")
    @classmethod
    def category_strip(cls, v: str) -> str:
        return v.strip()


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
    def _amount_not_zero(cls, v: float) -> float:
        return amount_not_zero(v)


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
