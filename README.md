# accounter_SAPPO

Group money management app. Track shared funds — add deposits, record expenses, and always know the current balance.

## Features

- Create multiple named **accounts** (e.g. per group, trip, project)
- **Add deposits** (positive amounts) to an account
- **Record expenses** (negative amounts)
- Real-time **running balance** per account
- Delete individual transactions or entire accounts

## Tech stack

| Layer    | Technology                  |
|----------|-----------------------------|
| Backend  | Python 3.12 + FastAPI + SQLite (SQLAlchemy) |
| Frontend | Vanilla HTML / CSS / JavaScript (no build step) |
| Server   | Nginx (reverse proxy)        |
| Deploy   | Docker + docker-compose      |

## Quick start (Docker)

```bash
# Clone the repo
git clone https://github.com/SaberanPWNZ/accounter_SAPPO.git
cd accounter_SAPPO

# Build & run
docker compose up --build
```

Open **http://localhost:3000** in your browser.

The SQLite database is persisted in a Docker named volume (`db_data`) so your data survives container restarts.

## API reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/accounts` | List all accounts with balance |
| POST   | `/api/accounts` | Create account `{"name": "..."}` |
| GET    | `/api/accounts/{id}` | Get account detail with transactions |
| DELETE | `/api/accounts/{id}` | Delete account (and all transactions) |
| POST   | `/api/accounts/{id}/transactions` | Add transaction `{"amount": 50.0, "description": "..."}` |
| DELETE | `/api/accounts/{id}/transactions/{tx_id}` | Delete transaction |

Interactive API docs are available at **http://localhost:8000/docs** (served by FastAPI/Swagger UI) when running locally (expose port 8000 in docker-compose if needed).

## Architecture (SOLID & KISS)

```
backend/
  database.py   – DB engine & session factory (Single Responsibility)
  models.py     – SQLAlchemy ORM models
  schemas.py    – Pydantic request/response schemas
  crud.py       – Data access layer (no business logic in routes)
  main.py       – FastAPI app & route definitions

frontend/
  index.html    – Single HTML page
  style.css     – All styles
  app.js        – All client-side logic (fetch API, DOM updates)
  nginx.conf    – Reverse proxy to backend
```

- **S**ingle Responsibility – each file/module has one job  
- **O**pen/Closed – new transaction types can be added without touching existing code  
- **L**iskov – models and schemas are substitutable through proper inheritance  
- **I**nterface Segregation – small, focused API endpoints  
- **D**ependency Inversion – database session injected via FastAPI `Depends()`  
- **KISS** – no JS framework, no ORM magic, plain SQLite, minimal dependencies  
