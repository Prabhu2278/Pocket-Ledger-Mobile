from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import Optional, List
import datetime as dt
import calendar
import csv
import io
from pydantic import BaseModel, Field

from app.database import get_db
from app.models import Expense, Income, User, Category
from app.models.wallet import Wallet
from app.deps import get_optional_current_user
from app.services.wallet_service import WalletService

router = APIRouter(prefix="/transactions", tags=["Transactions"])

class TransactionItemCreate(BaseModel):
    type: str = Field(..., description="Transaction type: 'income', 'expense', or 'transfer'")
    amount: Optional[float] = None
    amt: Optional[float] = None
    category: Optional[str] = None
    cat: Optional[str] = None
    category_color: Optional[str] = None
    note: Optional[str] = None
    title: Optional[str] = None
    date: Optional[dt.date] = None
    spent_on: Optional[dt.date] = None
    received_on: Optional[dt.date] = None
    payment_method: Optional[str] = None
    wallet_id: Optional[int] = None
    to_wallet_id: Optional[int] = None

    def resolve_amount(self) -> float:
        val = self.amount if self.amount is not None else self.amt
        if val is None or val <= 0:
            raise ValueError("Amount must be greater than 0.")
        return float(val)

    def resolve_category(self) -> str:
        t = self.type.strip().lower()
        if t == "transfer":
            default_cat = "Transfer"
        elif t == "income":
            default_cat = "Salary"
        else:
            default_cat = "Other"
        cat = self.category or self.cat or default_cat
        return cat.strip()

    def resolve_note(self) -> str:
        return (self.note if self.note is not None else self.title or "").strip()

    def resolve_date(self) -> dt.date:
        d = self.date or self.spent_on or self.received_on or dt.date.today()
        return d

class TransactionItemUpdate(BaseModel):
    type: Optional[str] = None
    amount: Optional[float] = None
    amt: Optional[float] = None
    category: Optional[str] = None
    cat: Optional[str] = None
    category_color: Optional[str] = None
    note: Optional[str] = None
    title: Optional[str] = None
    date: Optional[dt.date] = None
    spent_on: Optional[dt.date] = None
    received_on: Optional[dt.date] = None
    payment_method: Optional[str] = None
    wallet_id: Optional[int] = None
    to_wallet_id: Optional[int] = None

class BulkTransactionImport(BaseModel):
    transactions: List[TransactionItemCreate]

def serialize_unified(item, item_type: str, db: Optional[Session] = None) -> dict:
    d = str(getattr(item, "received_on", None) or getattr(item, "spent_on", None) or getattr(item, "date", ""))
    note = getattr(item, "note", None) or getattr(item, "title", "") or ""
    w_id = getattr(item, "wallet_id", None)
    to_w_id = getattr(item, "to_wallet_id", None)
    w_name = None
    to_w_name = None
    if db:
        if w_id:
            w = db.query(Wallet).filter(Wallet.id == w_id).first()
            if w:
                w_name = w.name
        if to_w_id:
            to_w = db.query(Wallet).filter(Wallet.id == to_w_id).first()
            if to_w:
                to_w_name = to_w.name

    return {
        "id": item.id,
        "type": item_type,
        "amount": float(item.amount),
        "amt": float(item.amount),
        "category": item.category,
        "cat": item.category,
        "note": note,
        "title": note,
        "date": d,
        "spent_on": d,
        "received_on": d,
        "payment_method": getattr(item, "payment_method", "UPI"),
        "wallet_id": w_id,
        "wallet_name": w_name,
        "to_wallet_id": to_w_id,
        "to_wallet_name": to_w_name,
        "user_id": item.user_id,
        "created_at": item.created_at.isoformat() if getattr(item, "created_at", None) else None,
    }

def fetch_transactions(
    db: Session,
    month_key: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    item_type: str = "all",
    category: Optional[str] = None,
    search: Optional[str] = None,
    wallet_id: Optional[int] = None,
    sort_by: str = "date",
    sort_order: str = "desc",
    limit: int = 5000,
    user_id: Optional[int] = None,
) -> List[dict]:
    type_clean = (item_type or "all").strip().lower()
    results = []

    # Filter date range: prioritize explicit start_date / end_date, then fallback to month_key
    start_d, end_d = None, None
    if start_date:
        try:
            start_d = dt.date.fromisoformat(start_date)
        except Exception:
            pass
    if end_date:
        try:
            end_d = dt.date.fromisoformat(end_date)
        except Exception:
            pass

    if not start_d and not end_d and month_key and len(month_key.split("-")) == 2:
        try:
            year, month = map(int, month_key.split("-"))
            _, last_day = calendar.monthrange(year, month)
            start_d = dt.date(year, month, 1)
            end_d = dt.date(year, month, last_day)
        except Exception:
            pass

    # 1. Fetch Expenses & Transfers
    if type_clean in ("all", "expense", "expenses", "transfer", "transfers"):
        eq = db.query(Expense)
        if user_id is not None:
            eq = eq.filter(Expense.user_id == user_id)
        if type_clean in ("transfer", "transfers"):
            eq = eq.filter(Expense.type == "TRANSFER")
        elif type_clean in ("expense", "expenses"):
            eq = eq.filter(Expense.type != "TRANSFER")

        if wallet_id is not None:
            eq = eq.filter(or_(Expense.wallet_id == wallet_id, Expense.to_wallet_id == wallet_id))
        if start_d:
            eq = eq.filter(Expense.spent_on >= start_d)
        if end_d:
            eq = eq.filter(Expense.spent_on <= end_d)
        if category and category != "All":
            eq = eq.filter(Expense.category == category)
        expenses = eq.all()
        for e in expenses:
            e_type = "transfer" if (e.type or "").upper() == "TRANSFER" else "expense"
            results.append(serialize_unified(e, e_type, db=db))

    # 2. Fetch Incomes
    if type_clean in ("all", "income", "incomes"):
        iq = db.query(Income)
        if user_id is not None:
            iq = iq.filter(Income.user_id == user_id)
        if wallet_id is not None:
            iq = iq.filter(Income.wallet_id == wallet_id)
        if start_d:
            iq = iq.filter(Income.received_on >= start_d)
        if end_d:
            iq = iq.filter(Income.received_on <= end_d)
        if category and category != "All":
            iq = iq.filter(Income.category == category)
        incomes = iq.all()
        for i in incomes:
            results.append(serialize_unified(i, "income", db=db))

    # 3. Search filtering
    if search:
        s = search.strip().lower()
        results = [
            r for r in results
            if s in r["note"].lower() or s in r["category"].lower() or s in str(r["amount"])
        ]

    # 4. Sorting
    reverse = (sort_order or "desc").lower() != "asc"
    if sort_by in ("amount", "amt"):
        results.sort(key=lambda x: x["amount"], reverse=reverse)
    else:
        results.sort(key=lambda x: (x["date"], x["id"]), reverse=reverse)

    return results[:limit]

@router.get("")
def get_transactions(
    month_key: Optional[str] = Query(None, description="Month in YYYY-MM format"),
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    type: Optional[str] = Query("all", description="Filter by type: 'all', 'income', 'expense', 'transfer'"),
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search term in note or category"),
    wallet_id: Optional[int] = Query(None, description="Filter by wallet ID"),
    sort_by: Optional[str] = Query("date", description="'date' or 'amount'"),
    sort_order: Optional[str] = Query("desc", description="'asc' or 'desc'"),
    limit: int = Query(5000, ge=1, le=10000),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    return fetch_transactions(
        db=db,
        month_key=month_key,
        start_date=start_date,
        end_date=end_date,
        item_type=type or "all",
        category=category,
        search=search,
        wallet_id=wallet_id,
        sort_by=sort_by or "date",
        sort_order=sort_order or "desc",
        limit=limit,
        user_id=user_id,
    )

@router.post("", status_code=status.HTTP_201_CREATED)
def create_transaction(
    tx_in: TransactionItemCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    t_type = tx_in.type.strip().lower()

    amt = tx_in.resolve_amount()
    cat = tx_in.resolve_category()
    note = tx_in.resolve_note()
    d = tx_in.resolve_date()
    wallet_id = tx_in.wallet_id

    # If wallet is specified (or picking user's first wallet if exists)
    if not wallet_id and t_type != "transfer":
        first_w = db.query(Wallet).filter(Wallet.user_id == user_id).first() if user_id else db.query(Wallet).first()
        if first_w:
            wallet_id = first_w.id

    # Ensure category exists in categories table so it is saved in settings and db
    clean_cat = cat.strip() if cat else ""
    if clean_cat and t_type != "transfer":
        cat_type = "income" if t_type in ("income", "deposit", "credit") else "expense"
        existing_cat = db.query(Category).filter(
            or_(Category.user_id == user_id, Category.user_id == None),
            Category.type == cat_type,
            func.lower(Category.name) == clean_cat.lower()
        ).first()
        if not existing_cat:
            import random
            fallback_colors = [
                '#b42c45', '#2563eb', '#15803d', '#b45309', '#0d7a6f',
                '#9333ea', '#ec4899', '#0284c7', '#6366f1', '#d97706',
                '#059669', '#e11d48', '#7c3aed', '#0891b2'
            ]
            cat_color = getattr(tx_in, "category_color", None) or random.choice(fallback_colors)
            new_category = Category(
                user_id=user_id,
                name=clean_cat,
                type=cat_type,
                icon="tag",
                color=cat_color,
                is_default=False,
                is_active=True
            )
            db.add(new_category)
            db.flush()

    # 1. TRANSFER
    if t_type == "transfer":
        to_wallet_id = tx_in.to_wallet_id
        if not wallet_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Source wallet ('From') is required.")
        if not to_wallet_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Destination wallet ('To') is required.")
        if int(wallet_id) == int(to_wallet_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Source and destination wallets cannot be the same.")

        src_wallet = db.query(Wallet).filter(Wallet.id == wallet_id).first()
        if not src_wallet:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source wallet not found.")
        dest_wallet = db.query(Wallet).filter(Wallet.id == to_wallet_id).first()
        if not dest_wallet:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination wallet not found.")

        curr_balance = WalletService.calculate_wallet_balance(db, src_wallet)
        if amt > curr_balance:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient funds in wallet '{src_wallet.name}'. Available balance is ₹{curr_balance:,.2f}, cannot transfer ₹{amt:,.2f}."
            )

        transfer_note = note if note else f"Transfer from {src_wallet.name} to {dest_wallet.name}"
        item = Expense(
            amount=amt,
            category=cat or "Transfer",
            note=transfer_note,
            spent_on=d,
            payment_method=tx_in.payment_method or "Wallet Transfer",
            type="TRANSFER",
            wallet_id=wallet_id,
            to_wallet_id=to_wallet_id,
            user_id=user_id,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return serialize_unified(item, "transfer", db=db)

    # 2. EXPENSE (Low balance check)
    elif t_type != "income":
        if wallet_id:
            target_wallet = db.query(Wallet).filter(Wallet.id == wallet_id).first()
            if target_wallet:
                curr_balance = WalletService.calculate_wallet_balance(db, target_wallet)
                if amt > curr_balance:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Insufficient funds in wallet '{target_wallet.name}'. Available balance is ₹{curr_balance:,.2f}, cannot spend ₹{amt:,.2f}."
                    )

        item = Expense(
            amount=amt,
            category=cat,
            note=note,
            spent_on=d,
            payment_method=tx_in.payment_method or "UPI",
            type="EXPENSE",
            wallet_id=wallet_id,
            user_id=user_id,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return serialize_unified(item, "expense", db=db)

    # 3. INCOME
    else:
        item = Income(
            amount=amt,
            category=cat,
            note=note,
            received_on=d,
            payment_method=tx_in.payment_method or "Bank Transfer",
            wallet_id=wallet_id,
            user_id=user_id,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return serialize_unified(item, "income", db=db)

@router.post("/bulk", status_code=status.HTTP_201_CREATED)
def bulk_import_transactions(
    payload: BulkTransactionImport,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    created_count = 0
    skipped_count = 0

    # Running balance map to prevent wallet balances from going below 0 during batch import
    running_balances: dict[int, float] = {}

    for tx in payload.transactions:
        try:
            amt = tx.resolve_amount()
            cat = tx.resolve_category()
            note = tx.resolve_note()
            d = tx.resolve_date()
            t_type = tx.type.strip().lower()
            wallet_id = tx.wallet_id

            if not wallet_id:
                first_w = db.query(Wallet).filter(Wallet.user_id == user_id).first() if user_id else db.query(Wallet).first()
                if first_w:
                    wallet_id = first_w.id

            if wallet_id and wallet_id not in running_balances:
                target_wallet = db.query(Wallet).filter(Wallet.id == wallet_id).first()
                if target_wallet:
                    running_balances[wallet_id] = WalletService.calculate_wallet_balance(db, target_wallet)
                else:
                    running_balances[wallet_id] = 0.0

            # Ensure category exists in categories table so it is saved in settings and db
            clean_cat = cat.strip() if cat else ""
            cat_type = "income" if t_type in ("income", "deposit", "credit") else "expense"
            if clean_cat:
                existing_cat = db.query(Category).filter(
                    or_(Category.user_id == user_id, Category.user_id == None),
                    Category.type == cat_type,
                    func.lower(Category.name) == clean_cat.lower()
                ).first()
                if not existing_cat:
                    new_category = Category(
                        user_id=user_id,
                        name=clean_cat,
                        type=cat_type,
                        icon="tag",
                        color="#2563eb",
                        is_default=False,
                        is_active=True
                    )
                    db.add(new_category)
                    db.flush()

            if t_type in ("income", "deposit", "credit"):
                item = Income(
                    amount=amt,
                    category=cat,
                    note=note,
                    received_on=d,
                    payment_method=tx.payment_method or "Bank Transfer",
                    wallet_id=wallet_id,
                    user_id=user_id,
                )
                db.add(item)
                if wallet_id and wallet_id in running_balances:
                    running_balances[wallet_id] += amt
                created_count += 1
            elif t_type == "transfer":
                to_wallet_id = tx.to_wallet_id
                if wallet_id and wallet_id in running_balances:
                    if amt > running_balances[wallet_id]:
                        skipped_count += 1
                        continue
                    running_balances[wallet_id] -= amt

                if to_wallet_id:
                    if to_wallet_id not in running_balances:
                        tw = db.query(Wallet).filter(Wallet.id == to_wallet_id).first()
                        running_balances[to_wallet_id] = WalletService.calculate_wallet_balance(db, tw) if tw else 0.0
                    running_balances[to_wallet_id] += amt

                transfer_note = note if note else "Wallet Transfer"
                item = Expense(
                    amount=amt,
                    category=cat or "Transfer",
                    note=transfer_note,
                    spent_on=d,
                    payment_method=tx.payment_method or "Wallet Transfer",
                    type="TRANSFER",
                    wallet_id=wallet_id,
                    to_wallet_id=to_wallet_id,
                    user_id=user_id,
                )
                db.add(item)
                created_count += 1
            else:
                if wallet_id and wallet_id in running_balances:
                    if amt > running_balances[wallet_id]:
                        skipped_count += 1
                        continue
                    running_balances[wallet_id] -= amt

                item = Expense(
                    amount=amt,
                    category=cat,
                    note=note,
                    spent_on=d,
                    payment_method=tx.payment_method or "UPI",
                    type="EXPENSE",
                    wallet_id=wallet_id,
                    user_id=user_id,
                )
                db.add(item)
                created_count += 1
        except Exception:
            continue

    db.commit()
    msg = f"Successfully imported {created_count} transaction(s)."
    if skipped_count > 0:
        msg += f" {skipped_count} transaction(s) skipped due to insufficient wallet funds."
    return {
        "success": True,
        "imported": created_count,
        "skipped": skipped_count,
        "message": msg,
    }

@router.put("/{tx_id}")
def update_transaction(
    tx_id: int,
    tx_in: TransactionItemUpdate,
    type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    t_type = (tx_in.type or type or "").strip().lower()

    expense = None
    income = None

    if t_type in ("income", "deposit"):
        iq = db.query(Income).filter(Income.id == tx_id)
        if user_id:
            iq = iq.filter(Income.user_id == user_id)
        income = iq.first()
    elif t_type in ("expense", "transfer"):
        eq = db.query(Expense).filter(Expense.id == tx_id)
        if user_id:
            eq = eq.filter(Expense.user_id == user_id)
        expense = eq.first()
    else:
        eq = db.query(Expense).filter(Expense.id == tx_id)
        if user_id:
            eq = eq.filter(Expense.user_id == user_id)
        expense = eq.first()
        if not expense:
            iq = db.query(Income).filter(Income.id == tx_id)
            if user_id:
                iq = iq.filter(Income.user_id == user_id)
            income = iq.first()

    if not expense and not income:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    amt = tx_in.amount if tx_in.amount is not None else tx_in.amt
    cat = tx_in.category or tx_in.cat
    note = tx_in.note if tx_in.note is not None else tx_in.title
    d = tx_in.date or tx_in.spent_on or tx_in.received_on

    if expense:
        new_amt = float(amt) if amt is not None else float(expense.amount)
        new_w_id = tx_in.wallet_id if tx_in.wallet_id is not None else expense.wallet_id
        is_transfer = (tx_in.type or expense.type or "").upper() == "TRANSFER"

        if new_w_id and not is_transfer:
            w_obj = db.query(Wallet).filter(Wallet.id == new_w_id).first()
            if w_obj:
                curr_bal = WalletService.calculate_wallet_balance(db, w_obj)
                max_allowed = (curr_bal + float(expense.amount)) if new_w_id == expense.wallet_id else curr_bal
                if new_amt > max_allowed:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Insufficient funds in wallet '{w_obj.name}'. Available balance is ₹{max_allowed:,.2f}, cannot set transaction amount to ₹{new_amt:,.2f}."
                    )

        if amt is not None:
            expense.amount = float(amt)
        if cat is not None:
            expense.category = cat
        if note is not None:
            expense.note = note
        if d is not None:
            expense.spent_on = d
        if tx_in.payment_method is not None:
            expense.payment_method = tx_in.payment_method
        if tx_in.wallet_id is not None:
            expense.wallet_id = tx_in.wallet_id
        if tx_in.to_wallet_id is not None:
            expense.to_wallet_id = tx_in.to_wallet_id
        if tx_in.type is not None:
            expense.type = tx_in.type.upper()
        db.commit()
        db.refresh(expense)
        e_type = "transfer" if (expense.type or "").upper() == "TRANSFER" else "expense"
        return serialize_unified(expense, e_type, db=db)
    else:
        new_amt = float(amt) if amt is not None else float(income.amount)
        new_w_id = tx_in.wallet_id if tx_in.wallet_id is not None else income.wallet_id

        if income.wallet_id:
            w_obj = db.query(Wallet).filter(Wallet.id == income.wallet_id).first()
            if w_obj:
                curr_bal = WalletService.calculate_wallet_balance(db, w_obj)
                reduction = float(income.amount) if new_w_id != income.wallet_id else (float(income.amount) - new_amt)
                if reduction > 0 and reduction > curr_bal:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Cannot reduce income: wallet '{w_obj.name}' would fall below 0 (current balance is ₹{curr_bal:,.2f})."
                    )

        if amt is not None:
            income.amount = float(amt)
        if cat is not None:
            income.category = cat
        if note is not None:
            income.note = note
        if d is not None:
            income.received_on = d
        if tx_in.payment_method is not None:
            income.payment_method = tx_in.payment_method
        if tx_in.wallet_id is not None:
            income.wallet_id = tx_in.wallet_id
        db.commit()
        db.refresh(income)
        return serialize_unified(income, "income", db=db)

@router.delete("/{tx_id}")
def delete_transaction(
    tx_id: int,
    type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    t_type = (type or "").strip().lower()

    if t_type in ("income", "deposit"):
        q = db.query(Income).filter(Income.id == tx_id)
        if user_id:
            q = q.filter(Income.user_id == user_id)
        item = q.first()
        if item:
            db.delete(item)
            db.commit()
            return {"message": "Transaction deleted", "id": tx_id}
    else:
        q = db.query(Expense).filter(Expense.id == tx_id)
        if user_id:
            q = q.filter(Expense.user_id == user_id)
        item = q.first()
        if item:
            db.delete(item)
            db.commit()
            return {"message": "Transaction deleted", "id": tx_id}

    # Fallback search both
    q_exp = db.query(Expense).filter(Expense.id == tx_id)
    if user_id:
        q_exp = q_exp.filter(Expense.user_id == user_id)
    item_exp = q_exp.first()
    if item_exp:
        db.delete(item_exp)
        db.commit()
        return {"message": "Transaction deleted", "id": tx_id}

    q_inc = db.query(Income).filter(Income.id == tx_id)
    if user_id:
        q_inc = q_inc.filter(Income.user_id == user_id)
    item_inc = q_inc.first()
    if item_inc:
        db.delete(item_inc)
        db.commit()
        return {"message": "Transaction deleted", "id": tx_id}

    raise HTTPException(status_code=404, detail="Transaction not found.")

@router.get("/export-csv")
def export_csv(
    month_key: Optional[str] = Query(None),
    type: Optional[str] = Query("all"),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    wallet_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    txs = fetch_transactions(
        db=db,
        month_key=month_key,
        item_type=type or "all",
        category=category,
        search=search,
        wallet_id=wallet_id,
        limit=1000,
        user_id=user_id,
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Type", "Category", "Amount", "Note", "Wallet", "Payment Method"])

    for tx in txs:
        wallet_display = tx.get("wallet_name", "") or ""
        if tx.get("type") == "transfer" and tx.get("to_wallet_name"):
            wallet_display = f"{wallet_display} -> {tx['to_wallet_name']}"
        writer.writerow([
            tx["date"],
            tx["type"].upper(),
            tx["category"],
            tx["amount"],
            tx["note"],
            wallet_display,
            tx.get("payment_method", ""),
        ])

    csv_data = output.getvalue()
    filename = f"pocket_ledger_transactions_{month_key or 'all'}.csv"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"'
    }
    return PlainTextResponse(content=csv_data, media_type="text/csv", headers=headers)
