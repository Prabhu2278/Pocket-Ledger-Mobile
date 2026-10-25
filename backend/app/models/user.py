from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name = Column(String(100), nullable=True)
    email = Column(String(100), unique=True, index=True, nullable=True)
    username = Column(String(50), unique=True, index=True, nullable=True)
    password = Column(String(255), nullable=False)
    currency = Column(String(10), default="INR", nullable=True)
    theme = Column(String(50), default="dark", nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    try:
        wallets = relationship("Wallet", back_populates="user", cascade="all, delete-orphan")
        settings = relationship("Setting", back_populates="user", uselist=False, cascade="all, delete-orphan")
        currency_setting = relationship("CurrencySetting", back_populates="user", uselist=False, cascade="all, delete-orphan")
        categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    except Exception:
        pass

    @property
    def name(self):
        return self.full_name or self.username or (self.email.split("@")[0] if self.email else "User")
