# 📱 Pocket Ledger — Mobile Full-Stack Financial Management System

Pocket Ledger is a clean, production-architecture mobile personal finance application built with **React Native (Expo SDK, TypeScript, Expo Router)** and a high-performance **FastAPI (Python)** backend backed by **PostgreSQL** (with automated local SQLite fallback).

---

## 🛠️ Technology Stack

- **Mobile Client**: React Native, Expo SDK, TypeScript, Expo Router, Expo SecureStore, Lucide / Ionicons
- **Backend API**: Python 3.10+, FastAPI, Uvicorn, Pydantic v2
- **Database & ORM**: PostgreSQL / SQLite, SQLAlchemy 2.0 ORM, Alembic migrations
- **Authentication**: Bcrypt password hashing, PyJWT signed access tokens, Bearer token authorization

---

## 📁 Repository Structure

```text
pocket-ledger/
├── .env.example              # Development environment variables template
├── .gitignore                # Git ignore configuration
├── README.md                 # Project setup and documentation
├── docs/
│   └── ARCHITECTURE.md       # Full architecture & domain design documentation
├── scripts/
│   └── start.bat             # One-click Windows dev startup script
│
├── backend/                  # FastAPI Backend API & Database
│   ├── .env.example          # Backend environment template
│   ├── alembic.ini           # Database migration configuration
│   ├── requirements.txt      # Python dependencies
│   ├── alembic/              # Database migration versions
│   │   ├── env.py
│   │   └── versions/
│   ├── data/                 # Local dev database directory (git-ignored)
│   └── app/
│       ├── main.py           # FastAPI application entry point
│       ├── api/
│       │   ├── deps.py       # Authentication & DB session dependencies
│       │   └── v1/
│       │       ├── router.py # API v1 router
│       │       └── endpoints/# Modular route controllers
│       │           ├── auth.py
│       │           ├── categories.py
│       │           ├── csv.py
│       │           ├── expenses.py
│       │           ├── health.py
│       │           ├── income.py
│       │           ├── insights.py
│       │           ├── settings.py
│       │           ├── transactions.py
│       │           ├── wallets.py
│       │           └── analytics.py
│       ├── core/             # Config, database engine, security, logging
│       ├── models/           # SQLAlchemy ORM models
│       ├── repositories/     # Database queries and CRUD operations
│       ├── schemas/          # Pydantic validation schemas
│       └── services/         # Business logic services
│
└── mobile/                   # React Native + Expo Mobile Application
    ├── .env.example          # Mobile environment variables template
    ├── app.json              # Expo application manifest
    ├── package.json          # Mobile dependencies & scripts
    ├── tsconfig.json         # TypeScript strict configuration
    ├── app/                  # Expo Router file-based screens
    │   ├── _layout.tsx       # Root layout with theme, auth & alert providers
    │   ├── login.tsx         # User login screen
    │   ├── register.tsx      # User registration screen
    │   ├── (tabs)/           # Bottom navigation tabs
    │   │   ├── index.tsx     # Dashboard
    │   │   ├── transactions.tsx
    │   │   ├── wallets.tsx
    │   │   └── settings.tsx
    │   └── modal/            # Full-screen dialogs (Transaction, Wallet, Category, CSV)
    ├── assets/images/        # App icons, splash screens, favicon
    ├── scripts/              # Connectivity verification script
    └── src/
        ├── api/              # API client & SecureStore service
        ├── components/       # Grouped UI components (ui/, cards/, modals/, charts/)
        ├── constants/        # Categories & default configurations
        ├── context/          # React contexts (Auth, App, Theme, Alert)
        ├── theme/            # Theme tokens, spacing, typography, radii
        ├── types/            # TypeScript interfaces & types
        └── utils/            # Currency and date utilities
```

---

## 🚀 Getting Started (Development)

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+** & `npm`
- **Expo Go** app on your physical mobile device, or an Android/iOS emulator

---

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment variables:
   ```bash
   copy .env.example .env
   ```
5. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 9000
   ```
   Interactive API documentation will be available at [http://localhost:9000/docs](http://localhost:9000/docs).

---

### 3. Mobile App Setup
1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment variables:
   ```bash
   copy .env.example .env
   ```
   > **Note for Physical Devices**: Set `EXPO_PUBLIC_API_URL=http://YOUR_PC_LAN_IP:9000` in `mobile/.env` so your physical device can reach the backend over your Wi-Fi network.

4. Start the Expo development server:
   ```bash
   npx expo start
   ```
5. Scan the QR code using the **Expo Go** app on your Android or iOS device, or press `a` for Android Emulator / `i` for iOS Simulator.

---

### 4. One-Click Launch (Windows)
Run `scripts/start.bat` from the root directory to automatically launch both the FastAPI backend and the Expo development server in separate console windows.
