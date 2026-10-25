from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc, or_
from datetime import datetime, date, timedelta
import calendar
from typing import Optional, List

from app.models import User, Expense, Income, Budget, Setting, CurrencySetting, Category
from app.models.wallet import Wallet
from fastapi import HTTPException
from app.schemas import (
    UserRegister,
    UserUpdate,
    UserResponse,
    SettingsUpdate,
    SettingsResponse,
    CurrencySettingBase,
    CurrencySettingUpdate,
    CurrencySettingResponse,
    SUPPORTED_CURRENCIES,
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    CategoryDeleteResponse,
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse,
    IncomeCreate,
    IncomeUpdate,
    IncomeResponse,
    BudgetCreate,
    BudgetResponse,
    InsightsSummary,
    CategorySpending,
    DaySpending,
    ActivityLog,
    EXPENSE_COLORS,
    INCOME_COLORS,
)
from app.core.security import hash_password, verify_password

# ==================== USER & AUTH CRUD ====================

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    if not email:
        return None
    return db.query(User).filter(func.lower(User.email) == email.strip().lower()).first()

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    if not username:
        return None
    return db.query(User).filter(func.lower(User.username) == username.strip().lower()).first()

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def create_user(db: Session, user_in: UserRegister) -> User:
    email_clean = user_in.email.strip().lower()
    existing = get_user_by_email(db, email_clean)
    if existing:
        raise ValueError("An account with this email address already exists.")

    user = User(
        full_name=user_in.name.strip(),
        email=email_clean,
        username=email_clean.split("@")[0],
        password=hash_password(user_in.password),
        currency="INR",
        theme="dark",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Automatically create user setting record
    setting = Setting(
        user_id=user.id,
        theme="dark",
        currency="INR",
    )
    db.add(setting)

    # Automatically create user currency_settings record
    currency_setting = CurrencySetting(
        user_id=user.id,
        currency_code="INR",
    )
    db.add(currency_setting)
    db.commit()

    return user

def authenticate_user(db: Session, email_or_username: str, password: str) -> Optional[User]:
    term = email_or_username.strip().lower()
    user = db.query(User).filter(
        or_(
            func.lower(User.email) == term,
            func.lower(User.username) == term
        )
    ).first()

    if not user:
        return None
    if not verify_password(password, user.password):
        return None
    return user

def update_user(db: Session, user_id: int, user_in: UserUpdate) -> Optional[User]:
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    if user_in.full_name is not None:
        user.full_name = user_in.full_name.strip()
    if user_in.currency is not None:
        user.currency = user_in.currency.strip().upper()
    if user_in.theme is not None:
        user.theme = user_in.theme.strip().lower()

    # Sync with settings table
    setting = db.query(Setting).filter(Setting.user_id == user_id).first()
    if not setting:
        setting = Setting(
            user_id=user_id,
            theme=user.theme or "dark",
            currency=user.currency or "INR",
        )
        db.add(setting)
    else:
        if user_in.theme is not None:
            setting.theme = user_in.theme.strip().lower()
        if user_in.currency is not None:
            setting.currency = user_in.currency.strip().upper()

    db.commit()
    db.refresh(user)
    return user

def get_user_currency_setting(db: Session, user_id: Optional[int]) -> CurrencySetting:
    """
    Retrieve authenticated user's currency preference from currency_settings table.
    Defaults to INR for new users or when preference doesn't exist.
    """
    if user_id:
        cs = db.query(CurrencySetting).filter(CurrencySetting.user_id == user_id).first()
        if cs:
            return cs
        # Fall back to legacy user or setting preference if present
        user = get_user_by_id(db, user_id)
        preferred_code = "INR"
        if user and user.currency and user.currency.upper() in SUPPORTED_CURRENCIES:
            preferred_code = user.currency.upper()
        else:
            legacy = db.query(Setting).filter(Setting.user_id == user_id).first()
            if legacy and legacy.currency and legacy.currency.upper() in SUPPORTED_CURRENCIES:
                preferred_code = legacy.currency.upper()

        cs = CurrencySetting(user_id=user_id, currency_code=preferred_code)
        db.add(cs)
        try:
            db.commit()
            db.refresh(cs)
            return cs
        except Exception:
            db.rollback()
            return db.query(CurrencySetting).filter(CurrencySetting.user_id == user_id).first() or CurrencySetting(id=0, user_id=user_id, currency_code="INR")

    return CurrencySetting(id=0, user_id=None, currency_code="INR")

def update_user_currency_setting(db: Session, user_id: Optional[int], currency_code: str) -> CurrencySetting:
    """
    Update authenticated user's currency preference in currency_settings table.
    Validates against SUPPORTED_CURRENCIES ('INR', 'USD', 'EUR', 'GBP').
    """
    cleaned_code = (currency_code or "").strip().upper()
    if cleaned_code not in SUPPORTED_CURRENCIES:
        raise ValueError(f"Invalid currency code '{currency_code}'. Supported currencies are: {', '.join(SUPPORTED_CURRENCIES)}")

    if user_id:
        cs = db.query(CurrencySetting).filter(CurrencySetting.user_id == user_id).first()
        if not cs:
            cs = CurrencySetting(user_id=user_id, currency_code=cleaned_code)
            db.add(cs)
        else:
            cs.currency_code = cleaned_code

        # Sync user record and legacy setting
        user = get_user_by_id(db, user_id)
        if user:
            user.currency = cleaned_code
        legacy = db.query(Setting).filter(Setting.user_id == user_id).first()
        if legacy:
            legacy.currency = cleaned_code

        db.commit()
        db.refresh(cs)
        return cs

    return CurrencySetting(id=0, user_id=None, currency_code=cleaned_code)

def get_user_settings(db: Session, user_id: Optional[int]) -> Setting:
    if user_id:
        setting = db.query(Setting).filter(Setting.user_id == user_id).first()
        cs = get_user_currency_setting(db, user_id)
        if setting:
            # Sync currency from canonical currency_settings
            setting.currency = cs.currency_code
            return setting
        # If user exists but no settings row, create one
        user = get_user_by_id(db, user_id)
        if user:
            setting = Setting(
                user_id=user_id,
                theme=user.theme or "dark",
                currency=cs.currency_code or "INR",
            )
            db.add(setting)
            db.commit()
            db.refresh(setting)
            return setting

    return Setting(id=0, user_id=None, theme="dark", currency="INR")

def update_user_settings(db: Session, user_id: Optional[int], update_in: SettingsUpdate) -> Setting:
    if user_id:
        setting = db.query(Setting).filter(Setting.user_id == user_id).first()
        user = get_user_by_id(db, user_id)
        
        # If currency is provided, update currency_settings as the canonical store
        curr_code = None
        if update_in.currency is not None:
            cs = update_user_currency_setting(db, user_id, update_in.currency)
            curr_code = cs.currency_code

        if not setting:
            setting = Setting(
                user_id=user_id,
                theme=(update_in.theme or (user.theme if user else "dark") or "dark").strip().lower(),
                currency=curr_code or (user.currency if user else "INR") or "INR",
            )
            db.add(setting)
        else:
            if update_in.theme is not None:
                setting.theme = update_in.theme.strip().lower()
            if curr_code is not None:
                setting.currency = curr_code

        if user:
            if update_in.theme is not None:
                user.theme = update_in.theme.strip().lower()
            if curr_code is not None:
                user.currency = curr_code

        db.commit()
        db.refresh(setting)
        return setting

    return Setting(
        id=0,
        user_id=None,
        theme=(update_in.theme or "dark").strip().lower(),
        currency=(update_in.currency or "INR").strip().upper(),
    )

# ==================== CATEGORY CRUD ====================

DEFAULT_EXPENSE_CATEGORIES = [
    {"name": "Food", "type": "expense", "icon": "utensils", "color": "#b42c45"},
    {"name": "Transport", "type": "expense", "icon": "car", "color": "#2563eb"},
    {"name": "Shopping", "type": "expense", "icon": "shopping-bag", "color": "#b45309"},
    {"name": "Bills", "type": "expense", "icon": "receipt", "color": "#0284c7"},
    {"name": "Home", "type": "expense", "icon": "home", "color": "#0d7a6f"},
    {"name": "Health", "type": "expense", "icon": "activity", "color": "#15803d"},
    {"name": "Education", "type": "expense", "icon": "graduation-cap", "color": "#6366f1"},
    {"name": "Entertainment", "type": "expense", "icon": "film", "color": "#9333ea"},
    {"name": "Fun", "type": "expense", "icon": "smile", "color": "#9333ea"},
    {"name": "Travel", "type": "expense", "icon": "compass", "color": "#0ea5e9"},
    {"name": "Other", "type": "expense", "icon": "more-horizontal", "color": "#64748b"},
]

DEFAULT_INCOME_CATEGORIES = [
    {"name": "Salary", "type": "income", "icon": "briefcase", "color": "#15803d"},
    {"name": "Freelance", "type": "income", "icon": "laptop", "color": "#2563eb"},
    {"name": "Business", "type": "income", "icon": "trending-up", "color": "#b45309"},
    {"name": "Investments", "type": "income", "icon": "pie-chart", "color": "#9333ea"},
    {"name": "Gifts", "type": "income", "icon": "gift", "color": "#ec4899"},
    {"name": "Other", "type": "income", "icon": "dollar-sign", "color": "#64748b"},
]

def seed_default_categories_if_needed(db: Session) -> None:
    """Ensure system default categories are present in database without creating duplicates."""
    existing = db.query(Category.name, Category.type).filter(Category.user_id == None).all()
    existing_keys = {(r[0].lower(), r[1].lower()) for r in existing}
    
    all_defs = DEFAULT_EXPENSE_CATEGORIES + DEFAULT_INCOME_CATEGORIES
    added = False
    for d in all_defs:
        key = (d["name"].lower(), d["type"].lower())
        if key not in existing_keys:
            cat = Category(
                user_id=None,
                name=d["name"],
                type=d["type"],
                icon=d["icon"],
                color=d["color"],
                is_default=True,
                is_active=True
            )
            db.add(cat)
            existing_keys.add(key)
            added = True
    if added:
        db.commit()

def get_categories(
    db: Session,
    user_id: Optional[int] = None,
    cat_type: Optional[str] = None,
    include_inactive: bool = False
) -> List[Category]:
    """
    Retrieve categories available to the user:
    System defaults (user_id IS NULL) + user's custom categories.
    Can be filtered by type ('expense' or 'income').
    """
    # Check if defaults exist, seed if empty
    has_defaults = db.query(Category.id).filter(Category.user_id == None).first()
    if not has_defaults:
        seed_default_categories_if_needed(db)

    query = db.query(Category)
    
    if user_id:
        query = query.filter(or_(Category.user_id == None, Category.user_id == user_id))
    else:
        query = query.filter(Category.user_id == None)
        
    if cat_type:
        query = query.filter(Category.type == cat_type.strip().lower())
        
    if not include_inactive:
        query = query.filter(Category.is_active == True)
        
    return query.order_by(Category.is_default.desc(), Category.name.asc()).all()

def create_category(db: Session, user_id: int, cat_in: CategoryCreate) -> Category:
    """
    Create a custom category for the authenticated user.
    Prevents duplicates against defaults and user's existing categories.
    """
    name_clean = cat_in.name.strip()
    type_clean = cat_in.type.strip().lower()
    
    # 1. Check conflict with system default categories of the same type
    default_dup = db.query(Category).filter(
        Category.user_id == None,
        Category.type == type_clean,
        func.lower(Category.name) == name_clean.lower()
    ).first()
    if default_dup:
        raise ValueError(f"Category '{name_clean}' already exists as a default {type_clean} category.")
        
    # 2. Check conflict with user's own custom categories of the same type
    user_dup = db.query(Category).filter(
        Category.user_id == user_id,
        Category.type == type_clean,
        func.lower(Category.name) == name_clean.lower()
    ).first()
    
    if user_dup:
        if user_dup.is_active:
            raise ValueError(f"You already have a {type_clean} category named '{name_clean}'.")
        else:
            # Reactivate previously deactivated category
            user_dup.is_active = True
            if cat_in.icon:
                user_dup.icon = cat_in.icon
            if cat_in.color:
                user_dup.color = cat_in.color
            db.commit()
            db.refresh(user_dup)
            return user_dup
            
    category_color = cat_in.color
    if not category_color:
        import random
        category_color = random.choice([
            '#b42c45', '#2563eb', '#15803d', '#b45309', '#0d7a6f',
            '#9333ea', '#ec4899', '#0284c7', '#6366f1', '#d97706',
            '#059669', '#e11d48', '#7c3aed', '#0891b2'
        ])

    cat = Category(
        user_id=user_id,
        name=name_clean,
        type=type_clean,
        icon=cat_in.icon or "tag",
        color=category_color,
        is_default=False,
        is_active=True
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat

def update_category(db: Session, user_id: int, category_id: int, cat_in: CategoryUpdate) -> Category:
    """
    Update a custom category owned by the authenticated user.
    System defaults cannot be edited.
    """
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")
        
    if cat.is_default or cat.user_id is None:
        raise HTTPException(status_code=403, detail="Default system categories cannot be modified.")
        
    if cat.user_id != user_id:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this category.")
        
    if cat_in.name is not None:
        new_name = cat_in.name.strip()
        if new_name.lower() != cat.name.lower():
            # Check duplicate against default
            if db.query(Category).filter(
                Category.user_id == None,
                Category.type == cat.type,
                func.lower(Category.name) == new_name.lower()
            ).first():
                raise ValueError(f"Category '{new_name}' already exists as a default {cat.type} category.")
            # Check duplicate against user's categories
            if db.query(Category).filter(
                Category.user_id == user_id,
                Category.type == cat.type,
                Category.id != cat.id,
                func.lower(Category.name) == new_name.lower()
            ).first():
                raise ValueError(f"You already have a {cat.type} category named '{new_name}'.")
        cat.name = new_name
        
    if cat_in.icon is not None:
        cat.icon = cat_in.icon
    if cat_in.color is not None:
        cat.color = cat_in.color
    if cat_in.is_active is not None:
        cat.is_active = cat_in.is_active
        
    db.commit()
    db.refresh(cat)
    return cat

def delete_category(db: Session, user_id: int, category_id: int) -> dict:
    """
    Safely delete or deactivate a custom category owned by the authenticated user.
    If referenced by transactions/incomes, deactivates instead of deleting to preserve history.
    """
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")
        
    if cat.is_default or cat.user_id is None:
        raise HTTPException(status_code=403, detail="Default system categories cannot be deleted.")
        
    if cat.user_id != user_id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this category.")
        
    ref_count = 0
    if cat.type == "expense":
        ref_count += db.query(Expense).filter(
            Expense.user_id == user_id,
            func.lower(Expense.category) == cat.name.lower()
        ).count()
    elif cat.type == "income":
        ref_count += db.query(Income).filter(
            Income.user_id == user_id,
            func.lower(Income.category) == cat.name.lower()
        ).count()
        
    if ref_count > 0:
        cat.is_active = False
        db.commit()
        return {
            "status": "deactivated",
            "message": f"Category '{cat.name}' is referenced by {ref_count} record(s). It has been deactivated to preserve transaction history.",
            "category_id": cat.id,
            "is_active": False,
        }
    else:
        cat_id = cat.id
        cat_name = cat.name
        db.delete(cat)
        db.commit()
        return {
            "status": "deleted",
            "message": f"Category '{cat_name}' was successfully deleted.",
            "category_id": cat_id,
            "is_active": False,
        }

def change_user_password(db: Session, user_id: int, current_pw: str, new_pw: str) -> bool:
    user = get_user_by_id(db, user_id)
    if not user:
        return False
    if not verify_password(current_pw, user.password):
        return False
    user.password = hash_password(new_pw)
    db.commit()
    return True

# ==================== EXPENSE CRUD ====================

def serialize_expense(e: Expense, db: Optional[Session] = None) -> ExpenseResponse:
    spent_str = e.spent_on.isoformat() if isinstance(e.spent_on, (date, datetime)) else str(e.spent_on)
    w_name = None
    if e.wallet_id and db:
        w = db.query(Wallet).filter(Wallet.id == e.wallet_id).first()
        if w:
            w_name = w.name
    return ExpenseResponse(
        id=e.id,
        amount=float(e.amount),
        amt=float(e.amount),
        category=e.category or "Other",
        cat=e.category or "Other",
        note=e.note or "",
        date=spent_str,
        spent_on=spent_str,
        payment_method=e.payment_method or "UPI",
        type=e.type or "EXPENSE",
        wallet_id=e.wallet_id,
        wallet_name=w_name,
        to_wallet_id=e.to_wallet_id,
        user_id=e.user_id,
        created_at=e.created_at,
    )

def get_expenses(
    db: Session,
    user_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 500,
    category: Optional[str] = None,
    search: Optional[str] = None,
    month_key: Optional[str] = None,
    sort_by: str = "date",
    sort_order: str = "desc"
) -> List[ExpenseResponse]:
    query = db.query(Expense)

    if user_id is not None:
        query = query.filter(Expense.user_id == user_id)

    if category and category.strip().lower() != "all":
        query = query.filter(func.lower(Expense.category) == category.strip().lower())

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(or_(
            Expense.note.ilike(term),
            Expense.category.ilike(term)
        ))

    if month_key and "-" in month_key:
        try:
            year, month = map(int, month_key.split("-"))
            _, last_day = calendar.monthrange(year, month)
            start_d = date(year, month, 1)
            end_d = date(year, month, last_day)
            query = query.filter(Expense.spent_on >= start_d, Expense.spent_on <= end_d)
        except Exception:
            pass

    order_col = Expense.spent_on if sort_by in ("date", "spent_on") else (
        Expense.amount if sort_by in ("amt", "amount") else Expense.id
    )
    query = query.order_by(desc(order_col) if sort_order.lower() == "desc" else asc(order_col), desc(Expense.id))

    records = query.offset(skip).limit(limit).all()
    return [serialize_expense(r, db=db) for r in records]

def get_expense(db: Session, expense_id: int, user_id: Optional[int] = None) -> Optional[ExpenseResponse]:
    query = db.query(Expense).filter(Expense.id == expense_id)
    if user_id is not None:
        query = query.filter(Expense.user_id == user_id)
    r = query.first()
    return serialize_expense(r, db=db) if r else None

def create_expense(db: Session, expense_in: ExpenseCreate, user_id: Optional[int] = None) -> ExpenseResponse:
    amt = expense_in.resolve_amount()
    cat = expense_in.resolve_category()
    note = expense_in.resolve_note()
    d = expense_in.resolve_date()
    wallet_id = expense_in.wallet_id

    if not wallet_id:
        first_w = db.query(Wallet).filter(Wallet.user_id == user_id).first() if user_id else db.query(Wallet).first()
        if first_w:
            wallet_id = first_w.id

    if wallet_id:
        target_wallet = db.query(Wallet).filter(Wallet.id == wallet_id).first()
        if target_wallet:
            from app.services.wallet_service import WalletService
            curr_balance = WalletService.calculate_wallet_balance(db, target_wallet)
            if amt > curr_balance:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient funds in wallet '{target_wallet.name}'. Available balance is ₹{curr_balance:,.2f}, cannot spend ₹{amt:,.2f}."
                )

    expense = Expense(
        amount=amt,
        category=cat,
        note=note,
        spent_on=d,
        payment_method=expense_in.payment_method or "UPI",
        type=expense_in.type or "EXPENSE",
        wallet_id=wallet_id,
        to_wallet_id=expense_in.to_wallet_id,
        user_id=user_id
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return serialize_expense(expense, db=db)

def update_expense(db: Session, expense_id: int, expense_in: ExpenseUpdate, user_id: Optional[int] = None) -> Optional[ExpenseResponse]:
    query = db.query(Expense).filter(Expense.id == expense_id)
    if user_id is not None:
        query = query.filter(Expense.user_id == user_id)
    expense = query.first()
    if not expense:
        return None

    if expense_in.amount is not None or expense_in.amt is not None:
        val = expense_in.amount if expense_in.amount is not None else expense_in.amt
        expense.amount = float(val)

    if expense_in.category is not None or expense_in.cat is not None:
        expense.category = (expense_in.category or expense_in.cat).strip()

    if expense_in.note is not None or expense_in.title is not None:
        expense.note = (expense_in.note if expense_in.note is not None else expense_in.title).strip()

    if expense_in.spent_on is not None or expense_in.date is not None:
        expense.spent_on = expense_in.spent_on or expense_in.date

    if expense_in.payment_method is not None:
        expense.payment_method = expense_in.payment_method

    if expense_in.wallet_id is not None:
        expense.wallet_id = expense_in.wallet_id

    if expense_in.to_wallet_id is not None:
        expense.to_wallet_id = expense_in.to_wallet_id

    db.commit()
    db.refresh(expense)
    return serialize_expense(expense, db=db)

def delete_expense(db: Session, expense_id: int, user_id: Optional[int] = None) -> bool:
    query = db.query(Expense).filter(Expense.id == expense_id)
    if user_id is not None:
        query = query.filter(Expense.user_id == user_id)
    expense = query.first()
    if not expense:
        return False
    db.delete(expense)
    db.commit()
    return True

# ==================== INCOME CRUD ====================

def serialize_income(inc: Income, db: Optional[Session] = None) -> IncomeResponse:
    rec_str = inc.received_on.isoformat() if isinstance(inc.received_on, (date, datetime)) else str(inc.received_on)
    w_name = None
    if inc.wallet_id and db:
        w = db.query(Wallet).filter(Wallet.id == inc.wallet_id).first()
        if w:
            w_name = w.name
    return IncomeResponse(
        id=inc.id,
        amount=float(inc.amount),
        amt=float(inc.amount),
        category=inc.category or "Other",
        cat=inc.category or "Other",
        note=inc.note or "",
        date=rec_str,
        received_on=rec_str,
        payment_method=inc.payment_method or "Bank Transfer",
        wallet_id=inc.wallet_id,
        wallet_name=w_name,
        user_id=inc.user_id,
        created_at=inc.created_at,
    )

def get_incomes(
    db: Session,
    user_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 500,
    category: Optional[str] = None,
    search: Optional[str] = None,
    month_key: Optional[str] = None,
    sort_by: str = "date",
    sort_order: str = "desc"
) -> List[IncomeResponse]:
    query = db.query(Income)

    if user_id is not None:
        query = query.filter(Income.user_id == user_id)

    if category and category.strip().lower() != "all":
        query = query.filter(func.lower(Income.category) == category.strip().lower())

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(or_(
            Income.note.ilike(term),
            Income.category.ilike(term)
        ))

    if month_key and "-" in month_key:
        try:
            year, month = map(int, month_key.split("-"))
            _, last_day = calendar.monthrange(year, month)
            start_d = date(year, month, 1)
            end_d = date(year, month, last_day)
            query = query.filter(Income.received_on >= start_d, Income.received_on <= end_d)
        except Exception:
            pass

    order_col = Income.received_on if sort_by in ("date", "received_on") else (
        Income.amount if sort_by in ("amt", "amount") else Income.id
    )
    query = query.order_by(desc(order_col) if sort_order.lower() == "desc" else asc(order_col), desc(Income.id))

    records = query.offset(skip).limit(limit).all()
    return [serialize_income(r, db=db) for r in records]

def get_income(db: Session, income_id: int, user_id: Optional[int] = None) -> Optional[IncomeResponse]:
    query = db.query(Income).filter(Income.id == income_id)
    if user_id is not None:
        query = query.filter(Income.user_id == user_id)
    r = query.first()
    return serialize_income(r, db=db) if r else None

def create_income(db: Session, income_in: IncomeCreate, user_id: Optional[int] = None) -> IncomeResponse:
    amt = income_in.resolve_amount()
    cat = income_in.resolve_category()
    note = income_in.resolve_note()
    d = income_in.resolve_date()
    wallet_id = income_in.wallet_id

    if not wallet_id:
        first_w = db.query(Wallet).filter(Wallet.user_id == user_id).first() if user_id else db.query(Wallet).first()
        if first_w:
            wallet_id = first_w.id

    income = Income(
        amount=amt,
        category=cat,
        note=note,
        received_on=d,
        payment_method=income_in.payment_method or "Bank Transfer",
        wallet_id=wallet_id,
        user_id=user_id
    )
    db.add(income)
    db.commit()
    db.refresh(income)
    return serialize_income(income, db=db)

def update_income(db: Session, income_id: int, income_in: IncomeUpdate, user_id: Optional[int] = None) -> Optional[IncomeResponse]:
    query = db.query(Income).filter(Income.id == income_id)
    if user_id is not None:
        query = query.filter(Income.user_id == user_id)
    income = query.first()
    if not income:
        return None

    if income_in.amount is not None or income_in.amt is not None:
        val = income_in.amount if income_in.amount is not None else income_in.amt
        income.amount = float(val)

    if income_in.category is not None or income_in.cat is not None:
        income.category = (income_in.category or income_in.cat).strip()

    if income_in.note is not None or income_in.title is not None:
        income.note = (income_in.note if income_in.note is not None else income_in.title).strip()

    if income_in.received_on is not None or income_in.date is not None:
        income.received_on = income_in.received_on or income_in.date

    if income_in.payment_method is not None:
        income.payment_method = income_in.payment_method

    if income_in.wallet_id is not None:
        income.wallet_id = income_in.wallet_id

    db.commit()
    db.refresh(income)
    return serialize_income(income, db=db)

def delete_income(db: Session, income_id: int, user_id: Optional[int] = None) -> bool:
    query = db.query(Income).filter(Income.id == income_id)
    if user_id is not None:
        query = query.filter(Income.user_id == user_id)
    income = query.first()
    if not income:
        return False
    db.delete(income)
    db.commit()
    return True

# ==================== BUDGET & INSIGHTS CRUD ====================

def get_or_create_budget(db: Session, month_key: str, user_id: Optional[int] = None, default_target: float = 20000.0) -> BudgetResponse:
    query = db.query(Budget).filter(Budget.month_key == month_key)
    if user_id is not None:
        query = query.filter(Budget.user_id == user_id)
    b = query.first()

    if not b:
        b = Budget(month_key=month_key, user_id=user_id, target_amount=default_target)
        db.add(b)
        db.commit()
        db.refresh(b)

    return BudgetResponse(
        id=b.id,
        month_key=b.month_key,
        target_amount=float(b.target_amount),
        budget=float(b.target_amount),
        user_id=b.user_id,
        created_at=b.created_at,
    )

def set_budget(db: Session, budget_in: BudgetCreate, user_id: Optional[int] = None) -> BudgetResponse:
    target = budget_in.resolve_target()
    query = db.query(Budget).filter(Budget.month_key == budget_in.month_key)
    if user_id is not None:
        query = query.filter(Budget.user_id == user_id)
    b = query.first()

    if b:
        b.target_amount = target
    else:
        b = Budget(month_key=budget_in.month_key, user_id=user_id, target_amount=target)
        db.add(b)

    db.commit()
    db.refresh(b)
    return BudgetResponse(
        id=b.id,
        month_key=b.month_key,
        target_amount=float(b.target_amount),
        budget=float(b.target_amount),
        user_id=b.user_id,
        created_at=b.created_at,
    )

def get_insights(db: Session, month_key: str, user_id: Optional[int] = None) -> InsightsSummary:
    b_resp = get_or_create_budget(db, month_key, user_id=user_id)
    target_budget = b_resp.target_amount

    # Month bounds
    year, month = map(int, month_key.split("-"))
    _, last_day = calendar.monthrange(year, month)
    start_d = date(year, month, 1)
    end_d = date(year, month, last_day)

    # Expenses Query
    exp_query = db.query(Expense).filter(Expense.spent_on >= start_d, Expense.spent_on <= end_d)
    if user_id is not None:
        exp_query = exp_query.filter(Expense.user_id == user_id)
    month_expenses = exp_query.all()

    # Incomes Query
    inc_query = db.query(Income).filter(Income.received_on >= start_d, Income.received_on <= end_d)
    if user_id is not None:
        inc_query = inc_query.filter(Income.user_id == user_id)
    month_incomes = inc_query.all()

    total_spent = sum(float(e.amount) for e in month_expenses)
    total_income = sum(float(i.amount) for i in month_incomes)
    net_cash_flow = total_income - total_spent

    remaining = target_budget - total_spent
    pct_used = (total_spent / target_budget) if target_budget > 0 else 0.0

    # Expense Category breakdown
    cat_totals = {}
    cat_counts = {}
    for e in month_expenses:
        c = e.category or "Other"
        cat_totals[c] = cat_totals.get(c, 0.0) + float(e.amount)
        cat_counts[c] = cat_counts.get(c, 0) + 1

    sorted_cats = sorted(cat_totals.keys(), key=lambda c: cat_totals[c], reverse=True)
    top_cat = sorted_cats[0] if sorted_cats else None

    breakdown = []
    for c in sorted_cats:
        amt = cat_totals[c]
        pct = round((amt / total_spent * 100), 1) if total_spent > 0 else 0.0
        color = EXPENSE_COLORS.get(c, "#64748b")
        breakdown.append(CategorySpending(
            category=c,
            amount=round(amt, 2),
            percentage=pct,
            count=cat_counts[c],
            color=color,
        ))

    # Income Category breakdown
    inc_cat_totals = {}
    inc_cat_counts = {}
    for i in month_incomes:
        c = i.category or "Salary"
        inc_cat_totals[c] = inc_cat_totals.get(c, 0.0) + float(i.amount)
        inc_cat_counts[c] = inc_cat_counts.get(c, 0) + 1

    sorted_inc_cats = sorted(inc_cat_totals.keys(), key=lambda c: inc_cat_totals[c], reverse=True)
    top_inc_cat = sorted_inc_cats[0] if sorted_inc_cats else None

    income_breakdown = []
    for c in sorted_inc_cats:
        amt = inc_cat_totals[c]
        pct = round((amt / total_income * 100), 1) if total_income > 0 else 0.0
        color = INCOME_COLORS.get(c, "#15803d")
        income_breakdown.append(CategorySpending(
            category=c,
            amount=round(amt, 2),
            percentage=pct,
            count=inc_cat_counts[c],
            color=color,
        ))

    # Last 7 days daily spending (expenses)
    today = date.today()
    last_7_days = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        day_query = db.query(Expense).filter(Expense.spent_on == d)
        if user_id is not None:
            day_query = day_query.filter(Expense.user_id == user_id)
        day_expenses = day_query.all()
        day_amt = sum(float(e.amount) for e in day_expenses)
        day_name = d.strftime("%a")
        last_7_days.append(DaySpending(
            index=i,
            date=d.isoformat(),
            day_name=day_name,
            amount=round(day_amt, 2),
            is_today=(i == 0),
        ))

    # Recent activity logs from recent expenses and incomes
    recent_logs = []
    all_recent_events = []

    recent_exp_query = db.query(Expense)
    if user_id is not None:
        recent_exp_query = recent_exp_query.filter(Expense.user_id == user_id)
    for exp in recent_exp_query.order_by(desc(Expense.spent_on), desc(Expense.id)).limit(10).all():
        all_recent_events.append({
            "date": exp.spent_on,
            "id": exp.id,
            "txt": f"Spent ₹{round(float(exp.amount)):,} on {exp.category}{(' \"' + exp.note + '\"') if exp.note else ''}",
            "type": "EXPENSE"
        })

    recent_inc_query = db.query(Income)
    if user_id is not None:
        recent_inc_query = recent_inc_query.filter(Income.user_id == user_id)
    for inc in recent_inc_query.order_by(desc(Income.received_on), desc(Income.id)).limit(10).all():
        all_recent_events.append({
            "date": inc.received_on,
            "id": inc.id,
            "txt": f"Received ₹{round(float(inc.amount)):,} from {inc.category}{(' \"' + inc.note + '\"') if inc.note else ''}",
            "type": "INCOME"
        })

    all_recent_events.sort(key=lambda x: (x["date"], x["id"]), reverse=True)
    for ev in all_recent_events[:10]:
        recent_logs.append(ActivityLog(
            t=int(datetime.combine(ev["date"], datetime.min.time()).timestamp() * 1000),
            txt=ev["txt"],
        ))

    return InsightsSummary(
        month_key=month_key,
        total_spent=round(total_spent, 2),
        total_expenses=round(total_spent, 2),
        total_income=round(total_income, 2),
        net_cash_flow=round(net_cash_flow, 2),
        budget_target=round(target_budget, 2),
        budget=round(target_budget, 2),
        remaining_budget=round(remaining, 2),
        budget_percentage_used=round(pct_used, 4),
        expense_count=len(month_expenses),
        income_count=len(month_incomes),
        top_category=top_cat,
        top_income_category=top_inc_cat,
        category_breakdown=breakdown,
        income_category_breakdown=income_breakdown,
        last_7_days=last_7_days,
        recent_activity=recent_logs,
    )
