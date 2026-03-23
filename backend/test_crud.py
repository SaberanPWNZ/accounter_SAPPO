from schemas import AccountCreate, TransactionCreate, ParticipantCreate
from crud import (
    create_account,
    get_accounts,
    get_account,
    delete_account,
    create_transaction,
    get_transactions,
    delete_transaction,
    compute_balance,
)


class TestAccountCrud:
    def testCreateAccount(self, db):
        acc = create_account(db, AccountCreate(name="Test"))
        assert acc.id is not None
        assert acc.name == "Test"

    def testGetAccounts(self, db):
        create_account(db, AccountCreate(name="A"))
        create_account(db, AccountCreate(name="B"))
        accounts = get_accounts(db)
        assert len(accounts) == 2

    def testGetAccountById(self, db):
        acc = create_account(db, AccountCreate(name="Find me"))
        found = get_account(db, acc.id)
        assert found is not None
        assert found.name == "Find me"

    def testGetAccountNotFound(self, db):
        assert get_account(db, 9999) is None

    def testDeleteAccount(self, db):
        acc = create_account(db, AccountCreate(name="Delete me"))
        assert delete_account(db, acc.id) is True
        assert get_account(db, acc.id) is None

    def testDeleteAccountNotFound(self, db):
        assert delete_account(db, 9999) is False


class TestTransactionCrud:
    def testCreateSimpleTransaction(self, db):
        acc = create_account(db, AccountCreate(name="Acc"))
        tx = create_transaction(
            db, acc.id, TransactionCreate(amount=100.0, description="Income")
        )
        assert tx.id is not None
        assert tx.amount == 100.0
        assert tx.is_expense is True
        assert tx.is_paid is True

    def testCreateExpenseWithParticipants(self, db):
        acc = create_account(db, AccountCreate(name="Acc"))
        tx = create_transaction(
            db,
            acc.id,
            TransactionCreate(
                amount=-200.0,
                description="Team lunch",
                is_expense=True,
                is_paid=False,
                card_number="5168 0000 0000 0000",
                participants=[
                    ParticipantCreate(name="Alice"),
                    ParticipantCreate(name="Bob"),
                ],
            ),
        )
        assert tx.is_paid is False
        assert tx.card_number == "5168 0000 0000 0000"
        assert len(tx.participants) == 2
        names = {p.name for p in tx.participants}
        assert names == {"Alice", "Bob"}

    def testCreateExpenseWithoutParticipants(self, db):
        acc = create_account(db, AccountCreate(name="Acc"))
        tx = create_transaction(
            db,
            acc.id,
            TransactionCreate(
                amount=-50.0,
                description="Solo expense",
                is_expense=True,
                is_paid=True,
            ),
        )
        assert len(tx.participants) == 0

    def testGetTransactions(self, db):
        acc = create_account(db, AccountCreate(name="Acc"))
        create_transaction(db, acc.id, TransactionCreate(amount=10.0, description="A"))
        create_transaction(db, acc.id, TransactionCreate(amount=-5.0, description="B"))
        txs = get_transactions(db, acc.id)
        assert len(txs) == 2

    def testDeleteTransaction(self, db):
        acc = create_account(db, AccountCreate(name="Acc"))
        tx = create_transaction(
            db, acc.id, TransactionCreate(amount=10.0, description="Del")
        )
        assert delete_transaction(db, tx.id) is True
        assert len(get_transactions(db, acc.id)) == 0

    def testDeleteTransactionNotFound(self, db):
        assert delete_transaction(db, 9999) is False

    def testDeleteTransactionCascadesParticipants(self, db):
        acc = create_account(db, AccountCreate(name="Acc"))
        tx = create_transaction(
            db,
            acc.id,
            TransactionCreate(
                amount=-100.0,
                description="Cascading",
                participants=[ParticipantCreate(name="Alice")],
            ),
        )
        delete_transaction(db, tx.id)
        from models import Participant
        assert db.query(Participant).count() == 0


class TestComputeBalance:
    def testEmptyBalance(self, db):
        acc = create_account(db, AccountCreate(name="Empty"))
        assert compute_balance(acc) == 0.0

    def testMixedBalance(self, db):
        acc = create_account(db, AccountCreate(name="Mixed"))
        create_transaction(db, acc.id, TransactionCreate(amount=100.0, description="In"))
        create_transaction(db, acc.id, TransactionCreate(amount=-30.0, description="Out"))
        db.refresh(acc)
        assert compute_balance(acc) == 70.0

    def testNegativeBalance(self, db):
        acc = create_account(db, AccountCreate(name="Negative"))
        create_transaction(db, acc.id, TransactionCreate(amount=-50.0, description="Out"))
        db.refresh(acc)
        assert compute_balance(acc) == -50.0
