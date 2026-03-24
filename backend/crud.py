"""CRUD operations – single responsibility, no business logic in routes."""

from calendar import month_abbr
from collections import defaultdict
from datetime import date

from sqlalchemy.orm import Session

from models import Account, Transaction, Participant, Member, Category
from schemas import (
    AccountCreate, CategoryCreate, CategoryStat, ContributorMonthStat,
    DayStat, MemberCreate, MemberUpdate, MonthContributions, MonthStat,
    TransactionCreate, TransactionUpdate,
)


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


def get_members(db: Session, account_id: int) -> list[Member]:
    return (
        db.query(Member)
        .filter(Member.account_id == account_id)
        .order_by(Member.name)
        .all()
    )


def create_member(db: Session, account_id: int, data: MemberCreate) -> Member:
    member = Member(
        account_id=account_id,
        name=data.name,
        card_number=data.card_number,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


def delete_member(db: Session, member_id: int) -> bool:
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        return False
    db.delete(member)
    db.commit()
    return True


def update_member(db: Session, member_id: int, data: MemberUpdate) -> Member | None:
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        return None
    member.name = data.name
    member.card_number = data.card_number
    db.commit()
    db.refresh(member)
    return member


# ---------- Category ----------

def get_categories(db: Session, account_id: int) -> list[Category]:
    return (
        db.query(Category)
        .filter(Category.account_id == account_id)
        .order_by(Category.name)
        .all()
    )


def create_category(db: Session, account_id: int, data: CategoryCreate) -> Category:
    category = Category(account_id=account_id, name=data.name)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_category(db: Session, category_id: int, data: CategoryCreate) -> Category | None:
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        return None
    category.name = data.name
    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, category_id: int) -> bool:
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        return False
    db.delete(category)
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
        contributor_name=data.contributor_name,
    )
    if data.created_at:
        tx.created_at = data.created_at
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


def update_transaction(
    db: Session, transaction_id: int, data: TransactionUpdate
) -> Transaction | None:
    tx = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not tx:
        return None
    tx.amount = data.amount
    tx.description = data.description
    tx.category = data.category
    tx.is_expense = data.is_expense
    tx.is_paid = data.is_paid
    tx.card_number = data.card_number
    tx.contributor_name = data.contributor_name
    if data.created_at:
        tx.created_at = data.created_at
    db.commit()
    db.refresh(tx)
    return tx


# ---------- Balance helper ----------

def compute_balance(account: Account) -> float:
    return round(
        sum(t.amount for t in account.transactions if not (t.is_expense and not t.is_paid)),
        2,
    )


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
