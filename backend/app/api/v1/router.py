from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    transactions,
    wallets,
    expenses,
    income,
    insights,
    settings,
    categories,
    csv,
    health,
    analytics,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="", tags=["Authentication"])
api_router.include_router(settings.router, prefix="", tags=["Settings"])
api_router.include_router(categories.router, prefix="", tags=["Categories"])
api_router.include_router(transactions.router, prefix="", tags=["Transactions"])
api_router.include_router(wallets.router, prefix="", tags=["Wallets"])
api_router.include_router(expenses.router, prefix="", tags=["Expenses"])
api_router.include_router(income.router, prefix="", tags=["Income"])
api_router.include_router(insights.router, prefix="", tags=["Insights & Budgets"])
api_router.include_router(analytics.router, prefix="", tags=["Analytics"])
api_router.include_router(csv.router, prefix="", tags=["CSV Tools"])
api_router.include_router(health.router, prefix="", tags=["Health"])
