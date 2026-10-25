from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models import User
from app.schemas.category import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    CategoryDeleteResponse,
)
from app.api.deps import get_current_user, get_optional_current_user
from app.repositories import crud

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("", response_model=List[CategoryResponse])
def list_categories(
    type: Optional[str] = Query(None, description="Filter by category type: 'income' or 'expense'"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    List all available categories for the authenticated user.
    Returns both system default categories and the user's custom categories.
    """
    user_id = current_user.id if current_user else None
    cats = crud.get_categories(db, user_id=user_id, cat_type=type)
    return [CategoryResponse.model_validate(c) for c in cats]

@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    category_in: CategoryCreate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new custom category for the authenticated user (or guest).
    Category names are validated and must be unique per user and type.
    """
    user_id = current_user.id if current_user else None
    try:
        cat = crud.create_category(db, user_id=user_id, cat_in=category_in)
        return CategoryResponse.model_validate(cat)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    category_in: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a custom category owned by the authenticated user.
    System default categories cannot be modified.
    """
    try:
        cat = crud.update_category(db, user_id=current_user.id, category_id=category_id, cat_in=category_in)
        return CategoryResponse.model_validate(cat)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete("/{category_id}", response_model=CategoryDeleteResponse)
def delete_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Safely delete or deactivate a custom category owned by the authenticated user.
    If the category is referenced in transactions/income records, it is safely deactivated
    rather than hard-deleted to preserve transaction history.
    """
    result = crud.delete_category(db, user_id=current_user.id, category_id=category_id)
    return CategoryDeleteResponse(
        status=result["status"],
        message=result["message"],
        category_id=result["category_id"],
        is_active=result["is_active"],
    )
