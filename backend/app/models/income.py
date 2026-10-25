from sqlalchemy import Column, Integer, Float, String, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base

class Income(Base):
    __tablename__ = "incomes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    amount = Column(Float, nullable=False)
    category = Column(String(50), nullable=False, index=True)
    note = Column(String(255), default="", nullable=False)
    received_on = Column(Date, nullable=False, index=True)
    payment_method = Column(String(30), default="Bank Transfer", nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    wallet_id = Column(Integer, ForeignKey("wallets.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    @property
    def amt(self):
        return self.amount

    @property
    def cat(self):
        return self.category

    @property
    def date(self):
        return self.received_on

    @property
    def spent_on(self):
        return self.received_on

    @property
    def title(self):
        return self.note
