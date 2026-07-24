"""add cancelled to queued run state enum

Revision ID: 706947697a0f
Revises: 4b6743b8b2a1
Create Date: 2026-07-24 21:50:48.254248

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '706947697a0f'
down_revision: Union[str, None] = '4b6743b8b2a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use raw SQL to add the new enum value.
    # Postgres ENUM types cannot be altered within a transaction using ALTER TYPE ... ADD VALUE
    # when the value is used in the same transaction. Setting autocommit=True allows it.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE queued_run_state ADD VALUE IF NOT EXISTS 'cancelled'")


def downgrade() -> None:
    # Postgres does not support removing values from an enum without recreating it entirely.
    pass
