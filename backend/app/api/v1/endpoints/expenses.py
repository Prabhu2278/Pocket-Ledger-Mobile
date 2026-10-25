from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models import User
from app.schemas import ExpenseCreate, ExpenseUpdate, ExpenseResponse
from app.api.deps import get_optional_current_user
from app.repositories import crud

router = APIRouter(prefix="/expenses", tags=["Expenses"])

@router.get("", response_model=List[ExpenseResponse])
def read_expenses(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    month_key: Optional[str] = Query(None),
    sort_by: str = Query("date"),
    sort_order: str = Query("desc"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    return crud.get_expenses(
        db,
        user_id=user_id,
        skip=skip,
        limit=limit,
        category=category,
        search=search,
        month_key=month_key,
        sort_by=sort_by,
        sort_order=sort_order
    )

@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    expense_in: ExpenseCreate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    return crud.create_expense(db, expense_in, user_id=user_id)

@router.get("/{expense_id}", response_model=ExpenseResponse)
def read_expense(
    expense_id: int,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    expense = crud.get_expense(db, expense_id, user_id=user_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense

@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: int,
    expense_in: ExpenseUpdate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    updated = crud.update_expense(db, expense_id, expense_in, user_id=user_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Expense not found or unauthorized")
    return updated

@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    success = crud.delete_expense(db, expense_id, user_id=user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Expense not found or unauthorized")
    return None
