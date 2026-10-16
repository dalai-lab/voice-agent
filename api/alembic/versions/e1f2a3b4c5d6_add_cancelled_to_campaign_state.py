"""add cancelled to campaign_state enum

Revision ID: e1f2a3b4c5d6
Revises: c1a2b3c4d5e6
Create Date: 2026-10-16 16:30:00.000000

"""
from collections.abc import Sequence

from alembic import op

revision: str = 'e1f2a3b4c5d6'
down_revision: str | None = 'c1a2b3c4d5e6'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Postgres ENUM types cannot be altered within a transaction using ALTER TYPE ... ADD VALUE
    # when the value is used in the same transaction. Setting autocommit=True allows it.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE campaign_state ADD VALUE IF NOT EXISTS 'cancelled'")


def downgrade() -> None:
    pass
