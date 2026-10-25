from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.models import User
from app.schemas.setting import SettingsUpdate, SettingsResponse
from app.schemas.currency import CurrencySettingUpdate, CurrencySettingResponse
from app.api.deps import get_optional_current_user, get_current_user
from app.repositories import crud

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("", response_model=SettingsResponse)
def get_settings(
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    setting = crud.get_user_settings(db, user_id)
    return SettingsResponse(
        id=setting.id,
        user_id=setting.user_id,
        theme=setting.theme or "dark",
        currency=setting.currency or "INR",
        updated_at=getattr(setting, "updated_at", None),
    )

@router.put("", response_model=SettingsResponse)
def update_settings(
    update_in: SettingsUpdate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    setting = crud.update_user_settings(db, user_id, update_in)
    return SettingsResponse(
        id=setting.id,
        user_id=setting.user_id,
        theme=setting.theme or "dark",
        currency=setting.currency or "INR",
        updated_at=getattr(setting, "updated_at", None),
    )

@router.get("/currency", response_model=CurrencySettingResponse)
def get_currency_setting(
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the authenticated user's display currency preference.
    Defaults to 'INR' if no preference exists.
    """
    user_id = current_user.id if current_user else None
    cs = crud.get_user_currency_setting(db, user_id)
    return CurrencySettingResponse(
        id=cs.id,
        user_id=cs.user_id,
        currency_code=cs.currency_code or "INR",
        currency=cs.currency_code or "INR",
        created_at=getattr(cs, "created_at", None),
        updated_at=getattr(cs, "updated_at", None),
    )

@router.put("/currency", response_model=CurrencySettingResponse)
def update_currency_setting(
    currency_in: CurrencySettingUpdate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Update the authenticated user's display currency preference.
    Supported currencies: INR, USD, EUR, GBP.
    """
    code = currency_in.get_currency_code()
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid currency_code (INR, USD, EUR, GBP) is required."
        )
    try:
        user_id = current_user.id if current_user else None
        cs = crud.update_user_currency_setting(db, user_id, code)
        return CurrencySettingResponse(
            id=cs.id,
            user_id=cs.user_id,
            currency_code=cs.currency_code,
            currency=cs.currency_code,
            created_at=getattr(cs, "created_at", None),
            updated_at=getattr(cs, "updated_at", None),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
