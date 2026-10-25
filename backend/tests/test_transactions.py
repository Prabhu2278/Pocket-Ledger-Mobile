def test_transactions_and_wallet_deduction(client):
    # Create wallet with 10,000 initial balance
    w_res = client.post("/api/wallets", json={
        "name": "Wallet A",
        "wallet_type": "BANK",
        "initial_balance": 10000.0,
        "color": "#10b981"
    })
    assert w_res.status_code == 201
    wallet_id = w_res.json()["id"]

    # Add expense of 2,500 assigned to Wallet A
    txn_res = client.post("/api/transactions", json={
        "type": "expense",
        "amount": 2500.0,
        "category": "Food",
        "note": "Team dinner",
        "date": "2026-10-21",
        "wallet_id": wallet_id
    })
    assert txn_res.status_code == 201
    txn = txn_res.json()
    assert txn["amount"] == 2500.0
    assert txn["category"] == "Food"

    # Verify wallet balance is deducted to 7,500
    wallets_res = client.get("/api/wallets")
    w = next(item for item in wallets_res.json() if item["id"] == wallet_id)
    assert w["current_balance"] == 7500.0

    # Add income of 5,000
    inc_res = client.post("/api/transactions", json={
        "type": "income",
        "amount": 5000.0,
        "category": "Salary",
        "note": "Bonus",
        "date": "2026-10-21",
        "wallet_id": wallet_id
    })
    assert inc_res.status_code == 201

    # Verify wallet balance is now 12,500
    wallets_res2 = client.get("/api/wallets")
    w2 = next(item for item in wallets_res2.json() if item["id"] == wallet_id)
    assert w2["current_balance"] == 12500.0

    # Query transactions list
    list_res = client.get("/api/transactions?page=1&limit=10")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 2

    # Delete transaction
    del_res = client.delete(f"/api/transactions/{txn['id']}?type=expense")
    assert del_res.status_code in [200, 204]


def test_bulk_import_running_balance_prevents_negative(client):
    # Create wallet with exactly 1000 initial balance
    w_res = client.post("/api/wallets", json={
        "name": "Current Wallet",
        "wallet_type": "BANK",
        "initial_balance": 1000.0,
        "color": "#3b82f6"
    })
    assert w_res.status_code == 201
    wallet_id = w_res.json()["id"]

    # Bulk import two expenses: 700 and 800
    bulk_res = client.post("/api/transactions/bulk", json={
        "transactions": [
            {
                "type": "expense",
                "amount": 700.0,
                "category": "Food",
                "note": "First expense",
                "date": "2026-10-25",
                "wallet_id": wallet_id
            },
            {
                "type": "expense",
                "amount": 800.0,
                "category": "Shopping",
                "note": "Second expense",
                "date": "2026-10-25",
                "wallet_id": wallet_id
            }
        ]
    })
    assert bulk_res.status_code == 201
    res_data = bulk_res.json()
    assert res_data["imported"] == 1
    assert res_data["skipped"] == 1

    # Verify wallet balance is 300 (1000 - 700), NOT -500
    wallets_res = client.get("/api/wallets")
    w = next(item for item in wallets_res.json() if item["id"] == wallet_id)
    assert w["current_balance"] == 300.0

