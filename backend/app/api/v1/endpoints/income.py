from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models import User
from app.schemas import IncomeCreate, IncomeUpdate, IncomeResponse
from app.api.deps import get_optional_current_user
from app.repositories import crud

router = APIRouter(prefix="/income", tags=["Income"])

@router.get("", response_model=List[IncomeResponse])
def read_incomes(
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
    return crud.get_incomes(
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

@router.post("", response_model=IncomeResponse, status_code=status.HTTP_201_CREATED)
def create_income(
    income_in: IncomeCreate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    return crud.create_income(db, income_in, user_id=user_id)

@router.get("/{income_id}", response_model=IncomeResponse)
def read_income(
    income_id: int,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    income = crud.get_income(db, income_id, user_id=user_id)
    if not income:
        raise HTTPException(status_code=404, detail="Income record not found")
    return income

@router.put("/{income_id}", response_model=IncomeResponse)
def update_income(
    income_id: int,
    income_in: IncomeUpdate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    updated = crud.update_income(db, income_id, income_in, user_id=user_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Income record not found or unauthorized")
    return updated

@router.delete("/{income_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_income(
    income_id: int,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    success = crud.delete_income(db, income_id, user_id=user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Income record not found or unauthorized")
    return None
