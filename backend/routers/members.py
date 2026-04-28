from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import crud
from database import get_db
from dependencies import get_account_or_404
from models import Account
from schemas import MemberCreate, MemberOut, MemberUpdate

router = APIRouter(prefix="/api/accounts/{account_id}/members", tags=["members"])


@router.get("", response_model=list[MemberOut])
def list_members(
    account: Account = Depends(get_account_or_404),
    db: Session = Depends(get_db),
):
    return crud.get_members(db, account.id)


@router.post("", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
def create_member(
    data: MemberCreate,
    account: Account = Depends(get_account_or_404),
    db: Session = Depends(get_db),
):
    return crud.create_member(db, account.id, data)


@router.put("/{member_id}", response_model=MemberOut)
def update_member(
    member_id: int,
    data: MemberUpdate,
    account: Account = Depends(get_account_or_404),
    db: Session = Depends(get_db),
):
    member = crud.update_member(db, member_id, data)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_member(
    member_id: int,
    account: Account = Depends(get_account_or_404),
    db: Session = Depends(get_db),
):
    if not crud.delete_member(db, member_id):
        raise HTTPException(status_code=404, detail="Member not found")
