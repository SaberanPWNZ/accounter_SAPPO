class TestListAccounts:
    def testEmpty(self, client):
        resp = client.get("/api/accounts")
        assert resp.status_code == 200
        assert resp.json() == []

    def testAfterCreate(self, client):
        client.post("/api/accounts", json={"name": "Test"})
        resp = client.get("/api/accounts")
        assert resp.status_code == 200
        assert len(resp.json()) == 1


class TestCreateAccount:
    def testSuccess(self, client):
        resp = client.post("/api/accounts", json={"name": "My Account"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "My Account"
        assert data["balance"] == 0.0

    def testEmptyNameFails(self, client):
        resp = client.post("/api/accounts", json={"name": ""})
        assert resp.status_code == 422


class TestGetAccount:
    def testSuccess(self, client):
        create_resp = client.post("/api/accounts", json={"name": "Details"})
        account_id = create_resp.json()["id"]
        resp = client.get(f"/api/accounts/{account_id}")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Details"
        assert resp.json()["transactions"] == []

    def testNotFound(self, client):
        resp = client.get("/api/accounts/9999")
        assert resp.status_code == 404


class TestDeleteAccount:
    def testSuccess(self, client):
        create_resp = client.post("/api/accounts", json={"name": "ToDelete"})
        account_id = create_resp.json()["id"]
        resp = client.delete(f"/api/accounts/{account_id}")
        assert resp.status_code == 204

    def testNotFound(self, client):
        resp = client.delete("/api/accounts/9999")
        assert resp.status_code == 404


class TestCreateTransaction:
    def testSimpleIncome(self, client):
        acc = client.post("/api/accounts", json={"name": "Acc"}).json()
        resp = client.post(
            f"/api/accounts/{acc['id']}/transactions",
            json={"amount": 500.0, "description": "Salary", "is_expense": False},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["amount"] == 500.0
        assert data["is_expense"] is False
        assert data["is_paid"] is True
        assert data["participants"] == []

    def testExpenseWithParticipants(self, client):
        acc = client.post("/api/accounts", json={"name": "Acc"}).json()
        resp = client.post(
            f"/api/accounts/{acc['id']}/transactions",
            json={
                "amount": -150.0,
                "description": "Dinner",
                "category": "food",
                "is_expense": True,
                "is_paid": False,
                "card_number": "5168 0000 0000 1234",
                "participants": [{"name": "Alice"}, {"name": "Bob"}],
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["is_expense"] is True
        assert data["is_paid"] is False
        assert data["card_number"] == "5168 0000 0000 1234"
        assert len(data["participants"]) == 2

    def testUnpaidExpense(self, client):
        acc = client.post("/api/accounts", json={"name": "Acc"}).json()
        resp = client.post(
            f"/api/accounts/{acc['id']}/transactions",
            json={
                "amount": -100.0,
                "description": "Pending",
                "is_expense": True,
                "is_paid": False,
            },
        )
        assert resp.status_code == 201
        assert resp.json()["is_paid"] is False

    def testAccountNotFound(self, client):
        resp = client.post(
            "/api/accounts/9999/transactions",
            json={"amount": 10.0, "description": "Nope"},
        )
        assert resp.status_code == 404

    def testZeroAmountFails(self, client):
        acc = client.post("/api/accounts", json={"name": "Acc"}).json()
        resp = client.post(
            f"/api/accounts/{acc['id']}/transactions",
            json={"amount": 0, "description": "Zero"},
        )
        assert resp.status_code == 422


class TestDeleteTransaction:
    def testSuccess(self, client):
        acc = client.post("/api/accounts", json={"name": "Acc"}).json()
        tx = client.post(
            f"/api/accounts/{acc['id']}/transactions",
            json={"amount": 10.0, "description": "Del"},
        ).json()
        resp = client.delete(
            f"/api/accounts/{acc['id']}/transactions/{tx['id']}"
        )
        assert resp.status_code == 204

    def testTransactionNotFound(self, client):
        acc = client.post("/api/accounts", json={"name": "Acc"}).json()
        resp = client.delete(f"/api/accounts/{acc['id']}/transactions/9999")
        assert resp.status_code == 404


class TestAccountWithTransactions:
    def testBalanceAfterTransactions(self, client):
        acc = client.post("/api/accounts", json={"name": "Bal"}).json()
        client.post(
            f"/api/accounts/{acc['id']}/transactions",
            json={"amount": 1000.0, "description": "Deposit", "is_expense": False},
        )
        client.post(
            f"/api/accounts/{acc['id']}/transactions",
            json={"amount": -300.0, "description": "Expense", "is_expense": True},
        )
        resp = client.get(f"/api/accounts/{acc['id']}")
        assert resp.status_code == 200
        assert resp.json()["balance"] == 700.0

    def testTransactionFieldsInAccountDetail(self, client):
        acc = client.post("/api/accounts", json={"name": "Detail"}).json()
        client.post(
            f"/api/accounts/{acc['id']}/transactions",
            json={
                "amount": -50.0,
                "description": "Test",
                "is_expense": True,
                "is_paid": False,
                "card_number": "4111 1111 1111 1111",
                "participants": [{"name": "Charlie"}],
            },
        )
        resp = client.get(f"/api/accounts/{acc['id']}")
        tx = resp.json()["transactions"][0]
        assert tx["is_expense"] is True
        assert tx["is_paid"] is False
        assert tx["card_number"] == "4111 1111 1111 1111"
        assert len(tx["participants"]) == 1
        assert tx["participants"][0]["name"] == "Charlie"
