"""CRUD operations package.

Re-exports all CRUD functions so existing `from crud import X` imports
keep working unchanged after the split into submodules grouped by entity.
"""

from .accounts import (
    create_account,
    delete_account,
    get_account,
    get_accounts,
)
from .balance import compute_balance
from .categories import (
    create_category,
    delete_category,
    get_categories,
    update_category,
)
from .members import (
    create_member,
    delete_member,
    get_members,
    update_member,
)
from .stats import (
    get_contributions_by_month,
    get_stats_by_category,
    get_stats_by_day,
    get_stats_by_month,
)
from .transactions import (
    create_transaction,
    delete_transaction,
    get_transactions,
    update_transaction,
)

__all__ = [
    "compute_balance",
    "create_account",
    "create_category",
    "create_member",
    "create_transaction",
    "delete_account",
    "delete_category",
    "delete_member",
    "delete_transaction",
    "get_account",
    "get_accounts",
    "get_categories",
    "get_contributions_by_month",
    "get_members",
    "get_stats_by_category",
    "get_stats_by_day",
    "get_stats_by_month",
    "get_transactions",
    "update_category",
    "update_member",
    "update_transaction",
]
