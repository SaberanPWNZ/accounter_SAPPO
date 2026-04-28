"""CRUD operations for Account."""

from sqlalchemy.orm import Session

from models import Account
from schemas import AccountCreate


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
