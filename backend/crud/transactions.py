"""CRUD operations for Transaction."""

from sqlalchemy.orm import Session

from models import Participant, Transaction
from schemas import TransactionCreate, TransactionUpdate


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
        spender_name=data.spender_name,
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
    tx.spender_name = data.spender_name
    if data.created_at:
        tx.created_at = data.created_at
    db.commit()
    db.refresh(tx)
    return tx
