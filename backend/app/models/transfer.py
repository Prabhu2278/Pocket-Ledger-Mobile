from sqlalchemy import Column, Integer, Float, String, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, synonym

from app.core.database import Base

class Transfer(Base):
    __tablename__ = "transfers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    amount = Column(Float, nullable=False)
    from_wallet_id = Column(Integer, ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False, index=True)
    to_wallet_id = Column(Integer, ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    transferred_on = Column(Date, nullable=False, index=True)
    note = Column(String(255), default="", nullable=False)
    category = Column(String(50), default="Transfer", nullable=False, index=True)
    payment_method = Column(String(50), default="Wallet Transfer", nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    from_wallet = relationship("Wallet", foreign_keys=[from_wallet_id])
    to_wallet = relationship("Wallet", foreign_keys=[to_wallet_id])
    user = relationship("User", foreign_keys=[user_id])

    # Synonyms for seamless querying compatibility
    wallet_id = synonym("from_wallet_id")
    spent_on = synonym("transferred_on")
    date = synonym("transferred_on")

    @property
    def received_on(self):
        return self.transferred_on

    @property
    def type(self):
        return "TRANSFER"

    @property
    def amt(self):
        return self.amount

    @property
    def cat(self):
        return self.category

    @property
    def title(self):
        return self.note
