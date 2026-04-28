from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import crud
from database import get_db
from dependencies import get_account_or_404
from models import Account
from schemas import CategoryCreate, CategoryOut

router = APIRouter(prefix="/api/accounts/{account_id}/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
def list_categories(
    account: Account = Depends(get_account_or_404),
    db: Session = Depends(get_db),
):
    return crud.get_categories(db, account.id)


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    account: Account = Depends(get_account_or_404),
    db: Session = Depends(get_db),
):
    return crud.create_category(db, account.id, data)


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    data: CategoryCreate,
    account: Account = Depends(get_account_or_404),
    db: Session = Depends(get_db),
):
    cat = crud.update_category(db, category_id, data)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    account: Account = Depends(get_account_or_404),
    db: Session = Depends(get_db),
):
    if not crud.delete_category(db, category_id):
        raise HTTPException(status_code=404, detail="Category not found")
