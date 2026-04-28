from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

import crud
from database import get_db
from dependencies import get_account_or_404
from models import Account
from schemas import AccountCreate, AccountOut, AccountSummary, TransactionOut

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


@router.get("", response_model=list[AccountSummary])
def list_accounts(db: Session = Depends(get_db)):
    accounts = crud.get_accounts(db)
    return [
        AccountSummary(
            id=a.id,
            name=a.name,
            balance=crud.compute_balance(a),
            created_at=a.created_at,
        )
        for a in accounts
    ]


@router.post("", response_model=AccountSummary, status_code=status.HTTP_201_CREATED)
def create_account(data: AccountCreate, db: Session = Depends(get_db)):
    account = crud.create_account(db, data)
    return AccountSummary(
        id=account.id,
        name=account.name,
        balance=0.0,
        created_at=account.created_at,
    )


@router.get("/{account_id}", response_model=AccountOut)
def get_account(account: Account = Depends(get_account_or_404)):
    return AccountOut(
        id=account.id,
        name=account.name,
        balance=crud.compute_balance(account),
        created_at=account.created_at,
        transactions=[
            TransactionOut.model_validate(t)
            for t in sorted(
                account.transactions, key=lambda t: t.created_at, reverse=True
            )
        ],
    )


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    account: Account = Depends(get_account_or_404),
    db: Session = Depends(get_db),
):
    crud.delete_account(db, account.id)
