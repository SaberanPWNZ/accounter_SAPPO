"""Balance computation helper."""

from models import Account


def compute_balance(account: Account) -> float:
    return round(
        sum(
            t.amount
            for t in account.transactions
            if not (t.is_expense and not t.is_paid)
        ),
        2,
    )
