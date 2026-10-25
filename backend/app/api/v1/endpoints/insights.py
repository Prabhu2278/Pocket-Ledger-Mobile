from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from app.core.database import get_db
from app.models import User
from app.schemas import InsightsSummary, BudgetCreate, BudgetResponse
from app.api.deps import get_optional_current_user
from app.repositories import crud

router = APIRouter(prefix="/insights", tags=["Insights & Budgets"])

@router.get("", response_model=InsightsSummary)
def read_insights(
    month_key: Optional[str] = Query(None, description="Month format YYYY-MM"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    if not month_key:
        now = datetime.now()
        month_key = f"{now.year:04d}-{now.month:02d}"
    user_id = current_user.id if current_user else None
    return crud.get_insights(db, month_key=month_key, user_id=user_id)

@router.get("/budget", response_model=BudgetResponse)
def read_budget(
    month_key: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    if not month_key:
        now = datetime.now()
        month_key = f"{now.year:04d}-{now.month:02d}"
    user_id = current_user.id if current_user else None
    return crud.get_or_create_budget(db, month_key=month_key, user_id=user_id)

@router.post("/budget", response_model=BudgetResponse, status_code=status.HTTP_200_OK)
def update_budget(
    budget_in: BudgetCreate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    return crud.set_budget(db, budget_in=budget_in, user_id=user_id)
