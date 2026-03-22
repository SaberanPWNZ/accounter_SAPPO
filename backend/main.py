from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import crud
import models
from database import Base, engine, get_db
from schemas import (
    AccountCreate, AccountOut, AccountSummary,
    CategoryStat, DayStat, MonthStat,
    TransactionCreate, TransactionOut,
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
            TransactionOut(
                id=t.id,
                account_id=t.account_id,
                amount=t.amount,
                description=t.description,
                category=t.category,
                created_at=t.created_at,
            )
            for t in sorted(account.transactions, key=lambda t: t.created_at, reverse=True)
        ],
    )


@app.delete("/api/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(account_id: int, db: Session = Depends(get_db)):
    if not crud.delete_account(db, account_id):
        raise HTTPException(status_code=404, detail="Account not found")


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
