# 💼 Pocket Ledger — Full-Stack Personal Treasury & Financial Management System

Pocket Ledger is a production-ready, full-stack personal finance and treasury web application built with a high-performance **React 18 + Vite** frontend and a modular **FastAPI** backend backed by **PostgreSQL** (with automated local SQLite fallback).

It features comprehensive daily transaction management (Expenses, Income, and Transfers), multi-account wallet tracking with real-time balance calculations, monthly budget monitoring with SVG gauge meters, slide-over filter drawers, bank statement CSV import/export, and complete user authentication.

---

## 🛠️ Technology Stack

- **Mobile**: React Native, Expo SDK, TypeScript, Expo Router, Expo SecureStore
- **Frontend**: React 18, Vite, Vanilla CSS Design System with CSS Custom Properties, Lucide Icons
- **Backend**: Python 3.11+, FastAPI, Uvicorn, Pydantic v2
- **Database & ORM**: PostgreSQL / SQLite fallback, SQLAlchemy 2.0 ORM, Alembic migrations
- **Authentication**: Bcrypt password hashing, PyJWT signed access tokens, Bearer token authorization
- **Testing**: Pytest with isolated in-memory SQLite fixtures, FastAPI TestClient, HTTPX
- **DevOps**: Docker, Docker Compose, Nginx

---

## 📁 Repository Structure

```text
Pocket-Ledger/
├── .env.example              # Reference environment variables template
├── docker-compose.yml        # Docker orchestration (Postgres, FastAPI, Vite)
├── start.bat                 # One-click Windows development startup
├── PROJECT_STRUCTURE.md      # Detailed file-by-file structure breakdown
│
├── docs/
│   └── ARCHITECTURE.md       # Full architecture & domain design documentation
│
├── backend/                  # FastAPI Backend API & Database models
│
├── frontend/                 # React 18 + Vite Web Application
│
└── mobile/                   # React Native + Expo Mobile Application
    ├── app/                  # Expo Router file-based navigation
    ├── src/                  # Components, Context, Services, Theme, Types
    ├── app.json              # Expo application manifest
    ├── package.json          # Mobile dependencies
    └── README.md             # Mobile setup & network configuration
```

---

## 🚀 Prerequisites

1. **Node.js** (v18+ recommended) & `npm`
2. **Python** (v3.10+ recommended)
3. *(Optional)* **PostgreSQL** running on port `5432` *(if PostgreSQL is not running, the application will automatically initialize a local SQLite `expenses.db` database seamlessly)*

---

## ⚙️ Configuration & Environment Variables

### 1. Backend Environment Setup (`backend/.env`)
Copy `.env.example` to `backend/.env`:
```env
DATABASE_URL=postgresql+psycopg2://postgres:YOUR_PASSWORD@localhost:5432/expense_tracker
SECRET_KEY=pocket-ledger-super-secure-jwt-secret-key-2026-production
PORT=8000
```
> **Note**: If PostgreSQL is not detected, the backend will automatically fallback to `sqlite:///./expenses.db` without crashing!

### 2. Frontend Environment Setup (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_API_URL=http://localhost:8000/api
```

---

## 🏃 Quick Start Guide

### Option A: One-Click Startup (Windows)
Double-click [start.bat](file:///d:/expense-tracker/start.bat) in the project root. This launches both the backend and frontend dev servers in separate console windows automatically.

---

### Option B: Manual Startup

#### 1. Start the Backend:
```bash
cd backend
# Windows
.\venv\Scripts\activate
# macOS / Linux: source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
- API Base: `http://localhost:8000`
- Interactive Swagger Docs: `http://localhost:8000/docs`
- Health Probe: `http://localhost:8000/health`

#### 2. Start the Frontend:
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
- Application Web UI: `http://localhost:5173`

---

## 🧪 Running Automated Tests

Pocket Ledger includes an isolated test suite that runs against an in-memory SQLite database, guaranteeing zero impact on your production or local data:

```bash
cd backend
pytest -v
```

All 6 core verification suites will execute and validate:
- User registration, login, and JWT Bearer token authentication
- Transaction creation, retrieval, updates, and deletion
- Real-time wallet balance math and automated expense deductions
- Wallet accounts CRUD
- Monthly budget targets and updates
- Financial analytics and spending category breakdowns

---

## 🐳 Docker Deployment

To launch the complete application stack (PostgreSQL + FastAPI + Nginx React Frontend):

```bash
docker-compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:9000`
- PostgreSQL: `localhost:5432`

---

## 🌟 Key Application Features

1. **Unified Financial Ledger**:
   - Record Expenses, Income, and Transfers with amount, category, account/wallet, and date.
   - Live multi-column sorting (Date, Amount, Category).
   - Instant search across descriptions, notes, and categories.
   - Configurable pagination (10, 20, 50, 100 rows per page).
   - 5-second **Undo Delete** safety toast.
2. **Multi-Account & Wallet System**:
   - Manage Bank Accounts, Digital/UPI wallets, Cash, and Credit Cards.
   - Real-time balance calculations automatically deducted from every expense.
   - Account-to-account balance transfers.
3. **Advanced Slide-Over Filter Drawer**:
   - Filter by date range (start/end date).
   - Filter by amount range (min/max).
   - Filter by account/wallet and payment method.
4. **CSV Bank Statement Tools**:
   - Drag-and-drop CSV statement parser with real-time row preview.
   - One-click bulk ledger import.
   - Filtered CSV transaction export.
5. **Monthly Budgets & Analytics**:
   - Month-by-month historical switcher (‹ Month Year ›).
   - SVG circular Budget Ring with dynamic threshold color alerts.
   - Last 7 days spending bar chart.
   - Category spending percentage breakdown.
6. **Authentication & Settings**:
   - Secure user registration, login, and password management.
   - Multi-currency support (INR `₹`, USD `$`, EUR `€`, GBP `£`).
   - Light and dark theme persistence.

---

## 📄 License
MIT License. Built for modern financial management.
