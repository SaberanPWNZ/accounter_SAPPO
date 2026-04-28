"""Statistics aggregation helpers."""

from calendar import month_abbr

from sqlalchemy.orm import Session

from models import Transaction
from schemas import (
    CategoryStat,
    ContributorMonthStat,
    DayStat,
    MonthContributions,
    MonthStat,
)


def _base_query(db: Session, account_id: int | None):
    q = db.query(Transaction)
    if account_id is not None:
        q = q.filter(Transaction.account_id == account_id)
    return q


def get_stats_by_day(
    db: Session, year: int, month: int, account_id: int | None = None
) -> list[DayStat]:
    rows = _base_query(db, account_id).all()
    buckets: dict[str, dict] = {}
    for tx in rows:
        d = tx.created_at.date()
        if d.year != year or d.month != month:
            continue
        key = d.isoformat()
        if key not in buckets:
            buckets[key] = {"income": 0.0, "expenses": 0.0, "count": 0}
        b = buckets[key]
        if tx.amount >= 0:
            b["income"] += tx.amount
        else:
            b["expenses"] += tx.amount
        b["count"] += 1

    result = []
    for day_str in sorted(buckets):
        b = buckets[day_str]
        result.append(
            DayStat(
                date=day_str,
                income=round(b["income"], 2),
                expenses=round(b["expenses"], 2),
                net=round(b["income"] + b["expenses"], 2),
                count=b["count"],
            )
        )
    return result


def get_stats_by_month(
    db: Session, year: int, account_id: int | None = None
) -> list[MonthStat]:
    rows = _base_query(db, account_id).all()
    buckets: dict[int, dict] = {}
    for tx in rows:
        d = tx.created_at.date()
        if d.year != year:
            continue
        m = d.month
        if m not in buckets:
            buckets[m] = {"income": 0.0, "expenses": 0.0, "count": 0}
        b = buckets[m]
        if tx.amount >= 0:
            b["income"] += tx.amount
        else:
            b["expenses"] += tx.amount
        b["count"] += 1

    result = []
    for m in sorted(buckets):
        b = buckets[m]
        result.append(
            MonthStat(
                year=year,
                month=m,
                month_name=month_abbr[m],
                income=round(b["income"], 2),
                expenses=round(b["expenses"], 2),
                net=round(b["income"] + b["expenses"], 2),
                count=b["count"],
            )
        )
    return result


def get_stats_by_category(
    db: Session, account_id: int | None = None
) -> list[CategoryStat]:
    rows = _base_query(db, account_id).all()
    # Use category if set, otherwise derive from sign
    buckets: dict[str, dict] = {}
    for tx in rows:
        label = tx.category if tx.category else ("income" if tx.amount >= 0 else "expense")
        if label not in buckets:
            buckets[label] = {"total": 0.0, "count": 0}
        buckets[label]["total"] += tx.amount
        buckets[label]["count"] += 1

    return [
        CategoryStat(
            category=label,
            total=round(data["total"], 2),
            count=data["count"],
        )
        for label, data in sorted(buckets.items())
    ]


def get_contributions_by_month(
    db: Session, year: int, account_id: int | None = None
) -> list[MonthContributions]:
    q = _base_query(db, account_id)
    rows = q.filter(Transaction.amount > 0).all()

    months: dict[int, dict[str, dict]] = {}
    for tx in rows:
        d = tx.created_at.date()
        if d.year != year:
            continue
        m = d.month
        if m not in months:
            months[m] = {}
        name = tx.contributor_name or tx.description
        if name not in months[m]:
            months[m][name] = {"amount": 0.0, "count": 0}
        months[m][name]["amount"] += tx.amount
        months[m][name]["count"] += 1

    result = []
    for m in sorted(months):
        contributors = [
            ContributorMonthStat(
                name=name,
                amount=round(data["amount"], 2),
                count=data["count"],
            )
            for name, data in sorted(months[m].items())
        ]
        total = round(sum(c.amount for c in contributors), 2)
        result.append(
            MonthContributions(
                year=year,
                month=m,
                month_name=month_abbr[m],
                total=total,
                contributors=contributors,
            )
        )
    return result
