"""CRUD operations – single responsibility, no business logic in routes."""

from calendar import month_abbr
from collections import defaultdict
from datetime import date

from sqlalchemy.orm import Session

from models import Account, Transaction, Participant
from schemas import AccountCreate, CategoryStat, DayStat, MonthStat, TransactionCreate


# ---------- Account ----------

def get_accounts(db: Session) -> list[Account]:
    return db.query(Account).order_by(Account.created_at.desc()).all()


def get_account(db: Session, account_id: int) -> Account | None:
    return db.query(Account).filter(Account.id == account_id).first()


def create_account(db: Session, data: AccountCreate) -> Account:
    account = Account(name=data.name)
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def delete_account(db: Session, account_id: int) -> bool:
    account = get_account(db, account_id)
    if not account:
        return False
    db.delete(account)
    db.commit()
    return True


# ---------- Transaction ----------

def get_transactions(db: Session, account_id: int) -> list[Transaction]:
    return (
        db.query(Transaction)
        .filter(Transaction.account_id == account_id)
        .order_by(Transaction.created_at.desc())
        .all()
    )


def create_transaction(
    db: Session, account_id: int, data: TransactionCreate
) -> Transaction:
    tx = Transaction(
        account_id=account_id,
        amount=data.amount,
        description=data.description,
        category=data.category,
        is_expense=data.is_expense,
        is_paid=data.is_paid,
        card_number=data.card_number,
    )
    db.add(tx)
    db.flush()
    
    for participant_data in data.participants:
        participant = Participant(name=participant_data.name)
        tx.participants.append(participant)
    
    db.commit()
    db.refresh(tx)
    return tx


def delete_transaction(db: Session, transaction_id: int) -> bool:
    tx = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not tx:
        return False
    db.delete(tx)
    db.commit()
    return True


# ---------- Balance helper ----------

def compute_balance(account: Account) -> float:
    return round(sum(t.amount for t in account.transactions), 2)


# ---------- Statistics helpers ----------

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
