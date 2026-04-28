from pydantic import BaseModel, field_validator

from ._validators import name_not_empty


class MemberCreate(BaseModel):
    name: str
    card_number: str | None = None

    @field_validator("name")
    @classmethod
    def _name_not_empty(cls, v: str) -> str:
        return name_not_empty(v)


class MemberUpdate(BaseModel):
    name: str
    card_number: str | None = None

    @field_validator("name")
    @classmethod
    def _name_not_empty(cls, v: str) -> str:
        return name_not_empty(v)


class MemberOut(BaseModel):
    id: int
    name: str
    card_number: str | None

    model_config = {"from_attributes": True}
