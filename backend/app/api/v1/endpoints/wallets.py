from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.wallet import Wallet
from app.models import User
from app.api.deps import get_optional_current_user
from app.schemas.wallet import WalletCreate, WalletUpdate, WalletResponse
from app.services.wallet_service import WalletService

router = APIRouter(prefix="/wallets", tags=["Wallets"])

@router.get("", response_model=List[WalletResponse])
def get_wallets(
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    return WalletService.get_all(db, user_id=user_id)

@router.post("", response_model=WalletResponse, status_code=status.HTTP_201_CREATED)
def create_wallet(
    data: WalletCreate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    if current_user:
        data.user_id = current_user.id
    return WalletService.create(db, data)

@router.put("/{wallet_id}", response_model=WalletResponse)
def update_wallet(
    wallet_id: int,
    data: WalletUpdate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    return WalletService.update(db, wallet_id, data)

@router.delete("/{wallet_id}", status_code=status.HTTP_200_OK)
def delete_wallet(
    wallet_id: int,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    WalletService.delete(db, wallet_id)
    return {"message": "Wallet deleted successfully", "id": wallet_id}
