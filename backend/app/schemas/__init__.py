from pydantic import BaseModel, Field
import datetime as dt
from typing import Optional, List, Any

# Standard Category Colors
EXPENSE_COLORS = {
    "Food": "#b42c45",
    "Transport": "#2563eb",
    "Home": "#0d7a6f",
    "Fun": "#9333ea",
    "Health": "#15803d",
    "Shopping": "#b45309",
    "Other": "#64748b",
}

INCOME_COLORS = {
    "Salary": "#15803d",
    "Freelance": "#2563eb",
    "Business": "#b45309",
    "Investments": "#9333ea",
    "Gifts": "#ec4899",
    "Other": "#64748b",
}

CATEGORY_COLORS = {**EXPENSE_COLORS, **INCOME_COLORS}

# --- Authentication Schemas ---

class UserRegister(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=6, max_length=100)

class UserLogin(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    currency: Optional[str] = None
    theme: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=100)

class UserResponse(BaseModel):
    id: int
    full_name: Optional[str] = None
    email: Optional[str] = None
    currency: Optional[str] = "INR"
    theme: Optional[str] = "dark"
    created_at: Optional[dt.datetime] = None

    class Config:
        from_attributes = True

from app.schemas.setting import SettingsBase, SettingsUpdate, SettingsResponse

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- Expense Schemas ---

class ExpenseBase(BaseModel):
    amount: Optional[float] = None
    amt: Optional[float] = None
    category: Optional[str] = None
    cat: Optional[str] = None
    note: Optional[str] = ""
    title: Optional[str] = None
    date: Optional[dt.date] = None
    spent_on: Optional[dt.date] = None
    payment_method: Optional[str] = "UPI"
    type: Optional[str] = "EXPENSE"
    wallet_id: Optional[int] = None
    to_wallet_id: Optional[int] = None

class ExpenseCreate(ExpenseBase):
    def resolve_amount(self) -> float:
        val = self.amount if self.amount is not None else self.amt
        if val is None or float(val) <= 0:
            raise ValueError("Amount must be greater than 0")
        return float(val)

    def resolve_category(self) -> str:
        return (self.category or self.cat or "Other").strip()

    def resolve_note(self) -> str:
        return (self.note or self.title or "").strip()

    def resolve_date(self) -> dt.date:
        return self.spent_on or self.date or dt.date.today()

class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    amt: Optional[float] = None
    category: Optional[str] = None
    cat: Optional[str] = None
    note: Optional[str] = None
    title: Optional[str] = None
    date: Optional[dt.date] = None
    spent_on: Optional[dt.date] = None
    payment_method: Optional[str] = None
    type: Optional[str] = None
    wallet_id: Optional[int] = None
    to_wallet_id: Optional[int] = None

class ExpenseResponse(BaseModel):
    id: int
    amount: float
    amt: float
    category: str
    cat: str
    note: str
    date: str
    spent_on: str
    payment_method: Optional[str] = "UPI"
    type: Optional[str] = "EXPENSE"
    wallet_id: Optional[int] = None
    wallet_name: Optional[str] = None
    to_wallet_id: Optional[int] = None
    to_wallet_name: Optional[str] = None
    user_id: Optional[int] = None
    created_at: Optional[dt.datetime] = None

    class Config:
        from_attributes = True

# --- Income Schemas ---

class IncomeBase(BaseModel):
    amount: Optional[float] = None
    amt: Optional[float] = None
    category: Optional[str] = None
    cat: Optional[str] = None
    note: Optional[str] = ""
    title: Optional[str] = None
    date: Optional[dt.date] = None
    received_on: Optional[dt.date] = None
    payment_method: Optional[str] = "Bank Transfer"
    wallet_id: Optional[int] = None

class IncomeCreate(IncomeBase):
    def resolve_amount(self) -> float:
        val = self.amount if self.amount is not None else self.amt
        if val is None or float(val) <= 0:
            raise ValueError("Amount must be greater than 0")
        return float(val)

    def resolve_category(self) -> str:
        return (self.category or self.cat or "Salary").strip()

    def resolve_note(self) -> str:
        return (self.note or self.title or "").strip()

    def resolve_date(self) -> dt.date:
        return self.received_on or self.date or dt.date.today()

class IncomeUpdate(BaseModel):
    amount: Optional[float] = None
    amt: Optional[float] = None
    category: Optional[str] = None
    cat: Optional[str] = None
    note: Optional[str] = None
    title: Optional[str] = None
    date: Optional[dt.date] = None
    received_on: Optional[dt.date] = None
    payment_method: Optional[str] = None
    wallet_id: Optional[int] = None

class IncomeResponse(BaseModel):
    id: int
    amount: float
    amt: float
    category: str
    cat: str
    note: str
    date: str
    received_on: str
    payment_method: Optional[str] = "Bank Transfer"
    wallet_id: Optional[int] = None
    wallet_name: Optional[str] = None
    user_id: Optional[int] = None
    created_at: Optional[dt.datetime] = None

    class Config:
        from_attributes = True

# --- Budget Schemas ---

class BudgetBase(BaseModel):
    month_key: str
    target_amount: Optional[float] = None
    budget: Optional[float] = None
    amount: Optional[float] = None

class BudgetCreate(BudgetBase):
    def resolve_target(self) -> float:
        val = self.target_amount if self.target_amount is not None else (self.budget if self.budget is not None else self.amount)
        if val is None or float(val) < 0:
            return 20000.0
        return float(val)

class BudgetResponse(BaseModel):
    id: int
    month_key: str
    target_amount: float
    budget: float
    user_id: Optional[int] = None
    created_at: Optional[dt.datetime] = None

    class Config:
        from_attributes = True

# --- Insights & Analytics Schemas ---

class CategorySpending(BaseModel):
    category: str
    amount: float
    percentage: float
    count: int
    color: str

class DaySpending(BaseModel):
    index: int
    date: str
    day_name: str
    amount: float
    is_today: bool

class ActivityLog(BaseModel):
    t: int
    txt: str

class InsightsSummary(BaseModel):
    month_key: str
    total_spent: float
    total_expenses: float
    total_income: float
    net_cash_flow: float
    budget_target: float
    budget: float
    remaining_budget: float
    budget_percentage_used: float
    expense_count: int
    income_count: int
    top_category: Optional[str] = None
    top_income_category: Optional[str] = None
    category_breakdown: List[CategorySpending] = []
    income_category_breakdown: List[CategorySpending] = []
    last_7_days: List[DaySpending] = []
    recent_activity: List[ActivityLog] = []

# Optional sub-schema imports for compatibility
try:
    from app.schemas.wallet import WalletCreate, WalletUpdate, WalletResponse
except Exception:
    pass

from app.schemas.currency import (
    SUPPORTED_CURRENCIES,
    CurrencySettingBase,
    CurrencySettingUpdate,
    CurrencySettingResponse,
)
from app.schemas.category import (
    CategoryBase,
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    CategoryDeleteResponse,
)
from app.schemas.transfer import (
    TransferBase,
    TransferCreate,
    TransferUpdate,
    TransferResponse,
)
