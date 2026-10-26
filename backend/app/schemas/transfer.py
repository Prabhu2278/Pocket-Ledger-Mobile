from pydantic import BaseModel, Field
import datetime as dt
from typing import Optional

class TransferBase(BaseModel):
    amount: float = Field(..., gt=0, description="Transfer amount")
    from_wallet_id: int = Field(..., description="Source wallet ID")
    to_wallet_id: int = Field(..., description="Destination wallet ID")
    note: Optional[str] = Field(default="", description="Optional transfer note")
    category: Optional[str] = Field(default="Transfer", description="Category")
    payment_method: Optional[str] = Field(default="Wallet Transfer", description="Payment method")
    transferred_on: Optional[dt.date] = Field(default_factory=dt.date.today, description="Date of transfer")

class TransferCreate(TransferBase):
    pass

class TransferUpdate(BaseModel):
    amount: Optional[float] = None
    from_wallet_id: Optional[int] = None
    to_wallet_id: Optional[int] = None
    note: Optional[str] = None
    category: Optional[str] = None
    payment_method: Optional[str] = None
    transferred_on: Optional[dt.date] = None

class TransferResponse(TransferBase):
    id: int
    user_id: Optional[int] = None
    created_at: Optional[dt.datetime] = None

    class Config:
        from_attributes = True
