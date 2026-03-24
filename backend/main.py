from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import crud
import models
from database import Base, engine, get_db
from schemas import (
    AccountCreate, AccountOut, AccountSummary,
    CategoryCreate, CategoryOut, CategoryStat,
    DayStat, MemberCreate, MemberOut, MemberUpdate,
    MonthContributions, MonthStat,
    TransactionCreate, TransactionOut, TransactionUpdate,
)

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Accounter SAPPO", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Accounts ────────────────────────────────────────────────────────────────

@app.get("/api/accounts", response_model=list[AccountSummary])
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


@app.post("/api/accounts", response_model=AccountSummary, status_code=status.HTTP_201_CREATED)
def create_account(data: AccountCreate, db: Session = Depends(get_db)):
    account = crud.create_account(db, data)
    return AccountSummary(
        id=account.id,
        name=account.name,
        balance=0.0,
        created_at=account.created_at,
    )


@app.get("/api/accounts/{account_id}", response_model=AccountOut)
def get_account(account_id: int, db: Session = Depends(get_db)):
    account = crud.get_account(db, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return AccountOut(
        id=account.id,
        name=account.name,
        balance=crud.compute_balance(account),
        created_at=account.created_at,
        transactions=[
            TransactionOut.model_validate(t)
            for t in sorted(account.transactions, key=lambda t: t.created_at, reverse=True)
        ],
    )


@app.delete("/api/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(account_id: int, db: Session = Depends(get_db)):
    if not crud.delete_account(db, account_id):
        raise HTTPException(status_code=404, detail="Account not found")


@app.get("/api/accounts/{account_id}/members", response_model=list[MemberOut])
def list_members(account_id: int, db: Session = Depends(get_db)):
    if not crud.get_account(db, account_id):
        raise HTTPException(status_code=404, detail="Account not found")
    return crud.get_members(db, account_id)


@app.post(
    "/api/accounts/{account_id}/members",
    response_model=MemberOut,
    status_code=status.HTTP_201_CREATED,
)
def create_member(account_id: int, data: MemberCreate, db: Session = Depends(get_db)):
    if not crud.get_account(db, account_id):
        raise HTTPException(status_code=404, detail="Account not found")
    return crud.create_member(db, account_id, data)


@app.delete(
    "/api/accounts/{account_id}/members/{member_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_member(account_id: int, member_id: int, db: Session = Depends(get_db)):
    if not crud.get_account(db, account_id):
        raise HTTPException(status_code=404, detail="Account not found")
    if not crud.delete_member(db, member_id):
        raise HTTPException(status_code=404, detail="Member not found")


@app.put(
    "/api/accounts/{account_id}/members/{member_id}",
    response_model=MemberOut,
)
def update_member(
    account_id: int, member_id: int, data: MemberUpdate, db: Session = Depends(get_db)
):
    if not crud.get_account(db, account_id):
        raise HTTPException(status_code=404, detail="Account not found")
    member = crud.update_member(db, member_id, data)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member


# ── Categories ───────────────────────────────────────────────────────────────

@app.get("/api/accounts/{account_id}/categories", response_model=list[CategoryOut])
def list_categories(account_id: int, db: Session = Depends(get_db)):
    if not crud.get_account(db, account_id):
        raise HTTPException(status_code=404, detail="Account not found")
    return crud.get_categories(db, account_id)


@app.post(
    "/api/accounts/{account_id}/categories",
    response_model=CategoryOut,
    status_code=status.HTTP_201_CREATED,
)
def create_category(account_id: int, data: CategoryCreate, db: Session = Depends(get_db)):
    if not crud.get_account(db, account_id):
        raise HTTPException(status_code=404, detail="Account not found")
    return crud.create_category(db, account_id, data)


@app.put(
    "/api/accounts/{account_id}/categories/{category_id}",
    response_model=CategoryOut,
)
def update_category(
    account_id: int, category_id: int, data: CategoryCreate, db: Session = Depends(get_db)
):
    if not crud.get_account(db, account_id):
        raise HTTPException(status_code=404, detail="Account not found")
    cat = crud.update_category(db, category_id, data)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat


@app.delete(
    "/api/accounts/{account_id}/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_category(
    account_id: int, category_id: int, db: Session = Depends(get_db)
):
    if not crud.get_account(db, account_id):
        raise HTTPException(status_code=404, detail="Account not found")
    if not crud.delete_category(db, category_id):
        raise HTTPException(status_code=404, detail="Category not found")


# ── Transactions ─────────────────────────────────────────────────────────────

@app.post(
    "/api/accounts/{account_id}/transactions",
    response_model=TransactionOut,
    status_code=status.HTTP_201_CREATED,
)
def create_transaction(
    account_id: int, data: TransactionCreate, db: Session = Depends(get_db)
):
    if not crud.get_account(db, account_id):
        raise HTTPException(status_code=404, detail="Account not found")
    return crud.create_transaction(db, account_id, data)


@app.delete(
    "/api/accounts/{account_id}/transactions/{transaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_transaction(
    account_id: int, transaction_id: int, db: Session = Depends(get_db)
):
    if not crud.get_account(db, account_id):
        raise HTTPException(status_code=404, detail="Account not found")
    if not crud.delete_transaction(db, transaction_id):
        raise HTTPException(status_code=404, detail="Transaction not found")


@app.put(
    "/api/accounts/{account_id}/transactions/{transaction_id}",
    response_model=TransactionOut,
)
def update_transaction(
    account_id: int, transaction_id: int, data: TransactionUpdate, db: Session = Depends(get_db)
):
    if not crud.get_account(db, account_id):
        raise HTTPException(status_code=404, detail="Account not found")
    tx = crud.update_transaction(db, transaction_id, data)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx


# ── Statistics ───────────────────────────────────────────────────────────────

@app.get("/api/stats/by-day", response_model=list[DayStat])
def stats_by_day(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    account_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return crud.get_stats_by_day(db, year=year, month=month, account_id=account_id)


@app.get("/api/stats/by-month", response_model=list[MonthStat])
def stats_by_month(
    year: int = Query(..., ge=2000, le=2100),
    account_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return crud.get_stats_by_month(db, year=year, account_id=account_id)


@app.get("/api/stats/by-category", response_model=list[CategoryStat])
def stats_by_category(
    account_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return crud.get_stats_by_category(db, account_id=account_id)


@app.get("/api/stats/contributions", response_model=list[MonthContributions])
def stats_contributions(
    year: int = Query(..., ge=2000, le=2100),
    account_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return crud.get_contributions_by_month(db, year=year, account_id=account_id)
