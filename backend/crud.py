"""CRUD operations – single responsibility, no business logic in routes."""

from sqlalchemy.orm import Session

from models import Account, Transaction
from schemas import AccountCreate, TransactionCreate


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
        account_id=account_id, amount=data.amount, description=data.description
    )
    db.add(tx)
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
