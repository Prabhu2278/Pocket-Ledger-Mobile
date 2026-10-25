from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.models import User, Expense, Income, Budget, Wallet, Setting
from app.api.v1.router import api_router

# Create tables in PostgreSQL/SQLite on startup if they do not exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Pocket Ledger API",
    description="Clean, modern REST API for tracking expenses, income, monthly budgets, user authentication, and financial insights.",
    version="1.1.0"
)

# CORS middleware for mobile client communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers under /api/v1, /api, and root for mobile API client compatibility
app.include_router(api_router, prefix="/api/v1")
app.include_router(api_router, prefix="/api")
app.include_router(api_router)

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "service": "pocket-ledger-api", "version": "1.1.0"}

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Pocket Ledger API is running",
        "docs": "/docs",
        "endpoints": ["/api/v1/auth", "/api/v1/transactions", "/api/v1/wallets", "/api/v1/insights"]
    }
