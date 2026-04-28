from pydantic import BaseModel


class DayStat(BaseModel):
    date: str  # "YYYY-MM-DD"
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
