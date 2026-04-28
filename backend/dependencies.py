"""Shared FastAPI dependencies."""

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

import crud
from database import get_db
from models import Account


def get_account_or_404(
    account_id: int, db: Session = Depends(get_db)
) -> Account:
    """Fetch an account by id or raise 404."""
    account = crud.get_account(db, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Account not found"
        )
    return account
