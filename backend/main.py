"""FastAPI application entry point.

Routes are split into per-entity modules under `routers/`.
This module only wires the app together: middleware, table creation
and router registration.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models  # noqa: F401  -- ensure models are registered with Base
from database import Base, engine
from routers import accounts, categories, members, stats, transactions

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Accounter SAPPO", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(accounts.router)
app.include_router(members.router)
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(stats.router)
