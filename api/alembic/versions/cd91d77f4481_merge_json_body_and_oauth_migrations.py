"""merge json body and oauth migrations

Revision ID: cd91d77f4481
Revises: 1236f759fffe, hh22ee334455
Create Date: 2026-08-02 17:30:40.996022

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cd91d77f4481'
down_revision: Union[str, None] = ('1236f759fffe', 'hh22ee334455')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
