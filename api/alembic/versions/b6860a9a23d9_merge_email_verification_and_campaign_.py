"""merge email verification and campaign active index

Revision ID: b6860a9a23d9
Revises: f1a2b3c4d5e6, f3a4b5c6d7e8
Create Date: 2026-10-16 23:15:25.197043

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b6860a9a23d9'
down_revision: Union[str, None] = ('f1a2b3c4d5e6', 'f3a4b5c6d7e8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
