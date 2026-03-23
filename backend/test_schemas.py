import pytest
from pydantic import ValidationError

from schemas import (
    AccountCreate,
    ParticipantCreate,
    TransactionCreate,
)


class TestAccountCreate:
    def testValidName(self):
        acc = AccountCreate(name="Test Account")
        assert acc.name == "Test Account"

    def testNameStripping(self):
        acc = AccountCreate(name="  spaced  ")
        assert acc.name == "spaced"

    def testEmptyNameRaises(self):
        with pytest.raises(ValidationError):
            AccountCreate(name="")

    def testWhitespaceOnlyNameRaises(self):
        with pytest.raises(ValidationError):
            AccountCreate(name="   ")


class TestParticipantCreate:
    def testValidName(self):
        p = ParticipantCreate(name="Alice")
        assert p.name == "Alice"

    def testNameStripping(self):
        p = ParticipantCreate(name="  Bob  ")
        assert p.name == "Bob"

    def testEmptyNameRaises(self):
        with pytest.raises(ValidationError):
            ParticipantCreate(name="")

    def testWhitespaceOnlyNameRaises(self):
        with pytest.raises(ValidationError):
            ParticipantCreate(name="   ")


class TestTransactionCreate:
    def testValidExpense(self):
        tx = TransactionCreate(amount=-100.0, description="Lunch")
        assert tx.amount == -100.0
        assert tx.description == "Lunch"
        assert tx.is_expense is True
        assert tx.is_paid is True
        assert tx.card_number is None
        assert tx.participants == []

    def testWithAllFields(self):
        tx = TransactionCreate(
            amount=-50.0,
            description="Dinner",
            category="food",
            is_expense=True,
            is_paid=False,
            card_number="5168 1234 5678 9012",
            participants=[
                ParticipantCreate(name="Alice"),
                ParticipantCreate(name="Bob"),
            ],
        )
        assert tx.is_paid is False
        assert tx.card_number == "5168 1234 5678 9012"
        assert len(tx.participants) == 2

    def testZeroAmountRaises(self):
        with pytest.raises(ValidationError):
            TransactionCreate(amount=0, description="Nothing")

    def testEmptyDescriptionRaises(self):
        with pytest.raises(ValidationError):
            TransactionCreate(amount=10.0, description="")

    def testCategoryStripping(self):
        tx = TransactionCreate(amount=10.0, description="test", category="  food  ")
        assert tx.category == "food"

    def testDescriptionStripping(self):
        tx = TransactionCreate(amount=10.0, description="  trimmed  ")
        assert tx.description == "trimmed"

    def testDefaultIsExpenseTrue(self):
        tx = TransactionCreate(amount=-10.0, description="expense")
        assert tx.is_expense is True

    def testDefaultIsPaidTrue(self):
        tx = TransactionCreate(amount=-10.0, description="expense")
        assert tx.is_paid is True

    def testIncome(self):
        tx = TransactionCreate(amount=500.0, description="Salary", is_expense=False)
        assert tx.is_expense is False
