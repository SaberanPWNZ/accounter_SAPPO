from pydantic import BaseModel, field_validator

from ._validators import name_not_empty


class CategoryCreate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def _name_not_empty(cls, v: str) -> str:
        return name_not_empty(v)


class CategoryOut(BaseModel):
    id: int
    account_id: int
    name: str

    model_config = {"from_attributes": True}
