from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

import crud
from database import get_db
from schemas import CategoryStat, DayStat, MonthContributions, MonthStat

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/by-day", response_model=list[DayStat])
def stats_by_day(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    account_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return crud.get_stats_by_day(db, year=year, month=month, account_id=account_id)


@router.get("/by-month", response_model=list[MonthStat])
def stats_by_month(
    year: int = Query(..., ge=2000, le=2100),
    account_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return crud.get_stats_by_month(db, year=year, account_id=account_id)


@router.get("/by-category", response_model=list[CategoryStat])
def stats_by_category(
    account_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return crud.get_stats_by_category(db, account_id=account_id)


@router.get("/contributions", response_model=list[MonthContributions])
def stats_contributions(
    year: int = Query(..., ge=2000, le=2100),
    account_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return crud.get_contributions_by_month(db, year=year, account_id=account_id)
