from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import crud
from database import get_db
from dependencies import get_account_or_404
from models import Account
from schemas import TransactionCreate, TransactionOut, TransactionUpdate

router = APIRouter(
    prefix="/api/accounts/{account_id}/transactions", tags=["transactions"]
)


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    data: TransactionCreate,
    account: Account = Depends(get_account_or_404),
    db: Session = Depends(get_db),
):
    return crud.create_transaction(db, account.id, data)


@router.put("/{transaction_id}", response_model=TransactionOut)
def update_transaction(
    transaction_id: int,
    data: TransactionUpdate,
    account: Account = Depends(get_account_or_404),
    db: Session = Depends(get_db),
):
    tx = crud.update_transaction(db, transaction_id, data)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: int,
    account: Account = Depends(get_account_or_404),
    db: Session = Depends(get_db),
):
    if not crud.delete_transaction(db, transaction_id):
        raise HTTPException(status_code=404, detail="Transaction not found")
