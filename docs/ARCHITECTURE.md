# Pocket Ledger — System Architecture & Design Documentation

## 1. Architectural Overview

Pocket Ledger is a mobile-first, full-stack personal finance application structured with a decoupled, domain-driven architecture:

```text
┌────────────────────────────────────────────────────────┐
│               React Native Mobile App                  │
│       (Expo SDK, Expo Router, TypeScript UI)           │
└───────────────────────────┬────────────────────────────┘
                            │ REST / JSON (HTTP)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   FastAPI Backend                      │
│     (App Entry: app.main:app, Router: /api/v1)         │
└─────────────┬───────────────────────────┬──────────────┘
              │                           │
              ▼                           ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│     Business Services     │ │      Security Engine      │
│ (Wallet, Expense, Budget) │ │ (Bcrypt, HS256 JWT, Auth) │
└─────────────┬─────────────┘ └───────────┬───────────────┘
              │                           │
              └─────────────┬─────────────┘
                            ▼
┌────────────────────────────────────────────────────────┐
│                  Repositories Layer                    │
│           (Database Queries, CRUD Operations)          │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                   SQLAlchemy 2.0 ORM                   │
│         (Declarative Base, Models, Sessions)           │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│              PostgreSQL / SQLite Database              │
│       (Automatic fallback for seamless local dev)      │
└────────────────────────────────────────────────────────┘
```

---

## 2. Backend Architecture (`backend/app/`)

### A. Application Entrypoint
- `backend/app/main.py`: Official FastAPI application factory configuring CORS middleware for mobile network communication, database table initialization, and mounting `api_router`.
- Run locally with: `uvicorn app.main:app --reload --host 0.0.0.0 --port 9000`

### B. Core Layer (`backend/app/core/`)
- `config.py`: Environment variable loading (`DATABASE_URL`, `CORS_ORIGINS`).
- `database.py`: Database engine with connection pooling (`pool_pre_ping=True`), automatic SQLite dev fallback, `SessionLocal` factory, and `get_db()` dependency.
- `security.py`: Bcrypt password hashing, verification, and PyJWT token generation/validation.
- `exceptions.py` & `logging.py`: Structured logging and global HTTP exception handlers.

### C. API & Endpoints (`backend/app/api/`)
- `api/deps.py`: Dependency injection for DB sessions (`get_db`) and JWT authentication (`get_current_user`, `get_optional_current_user`).
- `api/v1/router.py`: Master router aggregating all domain endpoints.
- `api/v1/endpoints/`:
  - `auth.py`: User registration, login, profile, password change.
  - `wallets.py`: Multi-wallet management and balance adjustments.
  - `transactions.py`: Unified transactions ledger (`expense`, `income`, `transfer`).
  - `expenses.py` & `income.py`: Dedicated expense and income CRUD.
  - `categories.py`: Category creation, listing, color/icon updates, deletion.
  - `settings.py`: Currency and theme settings.
  - `insights.py`: Cash flow summary, monthly budget targets.
  - `analytics.py`: Historical analytics.
  - `csv.py`: CSV import and statement parsing endpoints.
  - `health.py`: Healthcheck probe.

### D. Repositories Layer (`backend/app/repositories/`)
- Encapsulates database queries and persistence logic, decoupling business services and routers from direct SQLAlchemy query calls.

### E. Models Layer (`backend/app/models/`)
Modular SQLAlchemy ORM definitions:
- `user.py`: User account credentials and metadata.
- `wallet.py`: Wallets and bank accounts with real-time balance calculations.
- `expense.py`: Transactions records with wallet relations.
- `income.py`: Income records.
- `budget.py`: Monthly budget allocations.
- `category.py`: User and default categories.
- `setting.py` & `currency_setting.py`: User preferences.

### F. Schemas Layer (`backend/app/schemas/`)
Strict Pydantic models for request validation and response serialization.

---

## 3. Mobile Architecture (`mobile/`)

### A. Navigation & Routing (`mobile/app/`)
- File-based navigation via Expo Router.
- `_layout.tsx`: Root layout configuring `ThemeProvider`, `AuthProvider`, `AppProvider`, and `AlertProvider`.
- `(tabs)/`: Tab-based navigation for Dashboard, Transactions, Wallets, and Settings.
- `modal/`: Full-screen modal sheets for transaction entry, wallet creation, category management, and CSV statement import.

### B. Grouped Components (`mobile/src/components/`)
- `ui/`: Core elements (`Button`, `Input`, `Header`, `EmptyState`, `FilterChips`, `LoadingView`).
- `cards/`: Financial display cards (`WalletCard`, `TransactionItem`, `StatCard`, `CashFlowOverview`).
- `modals/`: User dialogs (`CustomAlertDialog`, `FilterDrawerModal`, `AddCurrencyModal`, `DatePickerModal`).
- `charts/`: Visual graphs (`CashFlowChart`).

### C. Networking & Storage (`mobile/src/api/`)
- `api.ts`: Centralized fetch client with automatic JWT token attachment, IP resolution for LAN/emulator, and session handling.
- `storage.ts`: Encrypted storage via Expo SecureStore for auth tokens, with AsyncStorage for local preferences.

### D. Global State (`mobile/src/context/`)
- `AuthContext`: Authentication session and profile state.
- `AppContext`: Global financial data (wallets, transactions, active filters).
- `ThemeContext`: Dark and light theme modes.
- `AlertContext`: Global interception of React Native `Alert.alert` into custom styled theme dialogs.
