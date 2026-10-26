from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from fastapi import HTTPException

from app.models.wallet import Wallet
from app.models.expense import Expense
from app.schemas.wallet import WalletCreate, WalletUpdate, WalletResponse

class WalletService:
    @staticmethod
    def auto_assign_orphaned_transactions(db: Session, user_id: Optional[int] = None) -> None:
        """Assign any existing expenses or incomes without a wallet_id to the user's primary wallet."""
        from app.models.income import Income

        query = db.query(Wallet)
        if user_id is not None:
            query = query.filter(Wallet.user_id == user_id)
        default_wallet = query.order_by(Wallet.id.asc()).first()
        if not default_wallet:
            return

        # 1. Update expenses where wallet_id is None
        exp_q = db.query(Expense).filter(Expense.wallet_id == None)
        if user_id is not None:
            exp_q = exp_q.filter(Expense.user_id == user_id)
        exp_q.update({Expense.wallet_id: default_wallet.id}, synchronize_session=False)

        # 2. Update incomes where wallet_id is None
        inc_q = db.query(Income).filter(Income.wallet_id == None)
        if user_id is not None:
            inc_q = inc_q.filter(Income.user_id == user_id)
        inc_q.update({Income.wallet_id: default_wallet.id}, synchronize_session=False)

        db.commit()

    @staticmethod
    def calculate_wallet_balance(db: Session, wallet: Wallet) -> float:
        from app.models.income import Income

        incomes_q = db.query(func.coalesce(func.sum(Expense.amount), 0.0))\
            .filter(Expense.wallet_id == wallet.id, func.upper(Expense.type) == "INCOME")
        if wallet.user_id is not None:
            incomes_q = incomes_q.filter(Expense.user_id == wallet.user_id)
        else:
            incomes_q = incomes_q.filter(Expense.user_id.is_(None))
        incomes = incomes_q.scalar()

        expenses_q = db.query(func.coalesce(func.sum(Expense.amount), 0.0))\
            .filter(Expense.wallet_id == wallet.id, or_(func.upper(Expense.type) == "EXPENSE", Expense.type == None, Expense.type == ""))
        if wallet.user_id is not None:
            expenses_q = expenses_q.filter(Expense.user_id == wallet.user_id)
        else:
            expenses_q = expenses_q.filter(Expense.user_id.is_(None))
        expenses = expenses_q.scalar()

        incomes_table_q = db.query(func.coalesce(func.sum(Income.amount), 0.0))\
            .filter(Income.wallet_id == wallet.id)
        if wallet.user_id is not None:
            incomes_table_q = incomes_table_q.filter(Income.user_id == wallet.user_id)
        else:
            incomes_table_q = incomes_table_q.filter(Income.user_id.is_(None))
        incomes_table = incomes_table_q.scalar()

        from app.models.transfer import Transfer

        transfers_in_q = db.query(func.coalesce(func.sum(Transfer.amount), 0.0))\
            .filter(Transfer.to_wallet_id == wallet.id)
        if wallet.user_id is not None:
            transfers_in_q = transfers_in_q.filter(Transfer.user_id == wallet.user_id)
        else:
            transfers_in_q = transfers_in_q.filter(Transfer.user_id.is_(None))
        transfers_in = transfers_in_q.scalar()

        # Also include any legacy transfers stored in Expense
        legacy_in_q = db.query(func.coalesce(func.sum(Expense.amount), 0.0))\
            .filter(Expense.to_wallet_id == wallet.id, func.upper(Expense.type) == "TRANSFER")
        if wallet.user_id is not None:
            legacy_in_q = legacy_in_q.filter(Expense.user_id == wallet.user_id)
        else:
            legacy_in_q = legacy_in_q.filter(Expense.user_id.is_(None))
        transfers_in += legacy_in_q.scalar()

        transfers_out_q = db.query(func.coalesce(func.sum(Transfer.amount), 0.0))\
            .filter(Transfer.from_wallet_id == wallet.id)
        if wallet.user_id is not None:
            transfers_out_q = transfers_out_q.filter(Transfer.user_id == wallet.user_id)
        else:
            transfers_out_q = transfers_out_q.filter(Transfer.user_id.is_(None))
        transfers_out = transfers_out_q.scalar()

        # Also include any legacy transfers stored in Expense
        legacy_out_q = db.query(func.coalesce(func.sum(Expense.amount), 0.0))\
            .filter(Expense.wallet_id == wallet.id, func.upper(Expense.type) == "TRANSFER")
        if wallet.user_id is not None:
            legacy_out_q = legacy_out_q.filter(Expense.user_id == wallet.user_id)
        else:
            legacy_out_q = legacy_out_q.filter(Expense.user_id.is_(None))
        transfers_out += legacy_out_q.scalar()

        return round(float(wallet.initial_balance or 0.0) + float(incomes) + float(incomes_table) - float(expenses) + float(transfers_in) - float(transfers_out), 2)

    @classmethod
    def to_response_dto(cls, db: Session, wallet: Wallet) -> WalletResponse:
        bal = cls.calculate_wallet_balance(db, wallet)
        return WalletResponse(
            id=wallet.id,
            name=wallet.name,
            wallet_type=wallet.wallet_type,
            initial_balance=wallet.initial_balance,
            color=wallet.color,
            user_id=wallet.user_id,
            current_balance=bal,
            created_at=wallet.created_at,
        )

    @classmethod
    def get_all(cls, db: Session, user_id: Optional[int] = None) -> List[WalletResponse]:
        cls.auto_assign_orphaned_transactions(db, user_id=user_id)
        query = db.query(Wallet)
        if user_id is not None:
            query = query.filter(Wallet.user_id == user_id)
        wallets = query.order_by(Wallet.id.asc()).all()
        return [cls.to_response_dto(db, w) for w in wallets]

    @classmethod
    def create(cls, db: Session, wallet_in: WalletCreate) -> WalletResponse:
        new_wallet = Wallet(
            name=wallet_in.name,
            wallet_type=wallet_in.wallet_type or "BANK",
            initial_balance=wallet_in.initial_balance or 0.0,
            color=wallet_in.color or "#10b981",
            user_id=wallet_in.user_id,
        )
        db.add(new_wallet)
        db.commit()
        db.refresh(new_wallet)
        return cls.to_response_dto(db, new_wallet)

    @classmethod
    def update(cls, db: Session, wallet_id: int, wallet_in: WalletUpdate) -> WalletResponse:
        wallet = db.query(Wallet).filter(Wallet.id == wallet_id).first()
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")

        if wallet_in.name is not None:
            wallet.name = wallet_in.name
        if wallet_in.wallet_type is not None:
            wallet.wallet_type = wallet_in.wallet_type
        if wallet_in.initial_balance is not None:
            wallet.initial_balance = wallet_in.initial_balance
        if wallet_in.color is not None:
            wallet.color = wallet_in.color

        db.commit()
        db.refresh(wallet)
        return cls.to_response_dto(db, wallet)

    @classmethod
    def delete(cls, db: Session, wallet_id: int) -> None:
        wallet = db.query(Wallet).filter(Wallet.id == wallet_id).first()
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")
        db.delete(wallet)
        db.commit()

    # Aliases for v1 API compatibility
    @classmethod
    def get_all_wallets_with_balances(cls, db: Session, user_id: Optional[int] = None) -> List[WalletResponse]:
        return cls.get_all(db, user_id=user_id)

    @classmethod
    def create_wallet(cls, db: Session, wallet_in: WalletCreate) -> WalletResponse:
        return cls.create(db, wallet_in)

    @classmethod
    def update_wallet(cls, db: Session, wallet_id: int, wallet_in: WalletUpdate) -> WalletResponse:
        return cls.update(db, wallet_id, wallet_in)

    @classmethod
    def delete_wallet(cls, db: Session, wallet_id: int) -> None:
        return cls.delete(db, wallet_id)
