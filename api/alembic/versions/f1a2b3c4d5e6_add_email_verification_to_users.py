"""add email verification to users

Revision ID: f1a2b3c4d5e6
Revises: e1f2a3b4c5d6
Create Date: 2026-10-16 22:30:00.000000

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

revision: str = 'f1a2b3c4d5e6'
down_revision: str | None = 'e1f2a3b4c5d6'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Add is_verified with server_default=true so ALL existing users remain verified
    op.add_column(
        'users',
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=text('true'))
    )
    op.create_index('ix_users_is_verified', 'users', ['is_verified'])

    # 2. Add verification token and rate-limiting metadata columns
    op.add_column('users', sa.Column('verification_code_hash', sa.String(length=64), nullable=True))
    op.add_column('users', sa.Column('verification_code_expires_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('verification_attempts', sa.Integer(), nullable=False, server_default=text('0')))
    op.add_column('users', sa.Column('last_verification_sent_at', sa.DateTime(timezone=True), nullable=True))

    # 3. Alter server_default for new inserts so future users default to false
    op.alter_column('users', 'is_verified', server_default=text('false'))


def downgrade() -> None:
    op.drop_index('ix_users_is_verified', table_name='users')
    op.drop_column('users', 'last_verification_sent_at')
    op.drop_column('users', 'verification_attempts')
    op.drop_column('users', 'verification_code_expires_at')
    op.drop_column('users', 'verification_code_hash')
    op.drop_column('users', 'is_verified')
