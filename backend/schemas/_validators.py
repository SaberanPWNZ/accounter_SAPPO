"""Common Pydantic validators shared across schemas."""


def name_not_empty(v: str) -> str:
    if not v.strip():
        raise ValueError("name must not be empty")
    return v.strip()


def amount_not_zero(v: float) -> float:
    if v == 0:
        raise ValueError("amount must not be zero")
    return v
