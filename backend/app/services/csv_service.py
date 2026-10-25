import csv
import io
from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.expense import Expense

class CsvService:
    @staticmethod
    def parse_csv_stream(file_content: bytes) -> List[Dict[str, Any]]:
        """Parses CSV text into standard transaction dictionaries."""
        text = file_content.decode("utf-8", errors="ignore")
        reader = csv.DictReader(io.StringIO(text))
        rows = []
        for r in reader:
            # Normalize column keys
            normalized = {k.strip().lower(): v.strip() for k, v in r.items() if k}
            amount = float(normalized.get("amount", 0.0) or 0.0)
            date_str = normalized.get("date") or normalized.get("spent_on") or datetime.now().strftime("%Y-%m-%d")
            category = normalized.get("category", "General")
            note = normalized.get("note") or normalized.get("title") or "Imported Transaction"
            tx_type = normalized.get("type", "EXPENSE").upper()
            rows.append({
                "amount": amount,
                "date": date_str,
                "category": category,
                "note": note,
                "type": tx_type
            })
        return rows

    @staticmethod
    def bulk_import(db: Session, transactions: List[Dict[str, Any]]) -> int:
        from app.models.wallet import Wallet
        from app.services.wallet_service import WalletService
        from app.models.income import Income

        running_balances = {}
        default_wallet = db.query(Wallet).order_by(Wallet.id.asc()).first()
        default_wallet_id = default_wallet.id if default_wallet else None

        count = 0
        for tx in transactions:
            amt = float(tx.get("amount", 0.0) or 0.0)
            if amt <= 0:
                continue
            t_type = (tx.get("type") or "EXPENSE").upper()
            w_id = tx.get("wallet_id") or default_wallet_id

            if w_id and w_id not in running_balances:
                w_obj = db.query(Wallet).filter(Wallet.id == w_id).first()
                running_balances[w_id] = WalletService.calculate_wallet_balance(db, w_obj) if w_obj else 0.0

            spent_date = datetime.strptime(str(tx["date"])[:10], "%Y-%m-%d").date() if isinstance(tx["date"], str) else tx["date"]

            if t_type in ("INCOME", "DEPOSIT", "CREDIT"):
                record = Income(
                    amount=amt,
                    category=tx.get("category", "Salary"),
                    note=tx.get("note", "Imported Income"),
                    received_on=spent_date,
                    wallet_id=w_id,
                )
                db.add(record)
                if w_id:
                    running_balances[w_id] += amt
                count += 1
            else:
                if w_id:
                    if amt > running_balances.get(w_id, 0.0):
                        continue
                    running_balances[w_id] -= amt

                record = Expense(
                    amount=amt,
                    category=tx.get("category", "General"),
                    note=tx.get("note", "Imported Transaction"),
                    spent_on=spent_date,
                    wallet_id=w_id,
                    type="EXPENSE"
                )
                db.add(record)
                count += 1
        db.commit()
        return count
