from datetime import datetime
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Account(Base):

    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    transactions: Mapped[list["Transaction"]] = relationship(
        "Transaction", back_populates="account", cascade="all, delete-orphan"
    )
    members: Mapped[list["Member"]] = relationship(
        "Member", back_populates="account", cascade="all, delete-orphan"
    )
    categories: Mapped[list["Category"]] = relationship(
        "Category", back_populates="account", cascade="all, delete-orphan"
    )


class Member(Base):

    __tablename__ = "members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    account_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    card_number: Mapped[str | None] = mapped_column(String(30), nullable=True)

    account: Mapped["Account"] = relationship("Account", back_populates="members")


class Transaction(Base):

    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    account_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False
    )
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False, server_default="")
    category: Mapped[str] = mapped_column(String(100), nullable=False, server_default="")
    is_expense: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    is_paid: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    card_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    contributor_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    account: Mapped["Account"] = relationship("Account", back_populates="transactions")
    participants: Mapped[list["Participant"]] = relationship(
        "Participant", back_populates="transaction", cascade="all, delete-orphan"
    )


class Participant(Base):

    __tablename__ = "participants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    transaction_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    transaction: Mapped["Transaction"] = relationship("Transaction", back_populates="participants")


class Category(Base):

    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    account_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    account: Mapped["Account"] = relationship("Account", back_populates="categories")
