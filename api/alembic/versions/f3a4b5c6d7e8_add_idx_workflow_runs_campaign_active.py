"""add idx_workflow_runs_campaign_active compound partial index

Revision ID: f3a4b5c6d7e8
Revises: e1f2a3b4c5d6
Create Date: 2026-10-16 16:45:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f3a4b5c6d7e8"
down_revision: str | None = "e1f2a3b4c5d6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index(
        "idx_workflow_runs_campaign_active",
        "workflow_runs",
        ["campaign_id", "is_completed"],
        unique=False,
        postgresql_where=sa.text("is_completed IS FALSE"),
    )


def downgrade() -> None:
    op.drop_index(
        "idx_workflow_runs_campaign_active",
        table_name="workflow_runs",
        postgresql_where=sa.text("is_completed IS FALSE"),
    )
