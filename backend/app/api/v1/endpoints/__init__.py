"""
API v1 Endpoints Package
Exposes all domain endpoint routers for Pocket Ledger API.
"""
from app.api.v1.endpoints import (
    analytics,
    auth,
    categories,
    csv,
    expenses,
    health,
    income,
    insights,
    settings,
    transactions,
    wallets,
)

__all__ = [
    "analytics",
    "auth",
    "categories",
    "csv",
    "expenses",
    "health",
    "income",
    "insights",
    "settings",
    "transactions",
    "wallets",
]
