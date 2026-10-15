"""remove_callback_feature

Revision ID: b57bb0a7ba54
Revises: b41f7c9d2e05
Create Date: 2026-10-15 21:41:55.660362

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b57bb0a7ba54'
down_revision: Union[str, None] = 'b41f7c9d2e05'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Clean existing queued runs: mark any pending callback queued runs as cancelled
    op.execute(
        """
        UPDATE queued_runs 
        SET state = 'cancelled' 
        WHERE retry_reason = 'user_requested_callback' AND state = 'queued';
        """
    )

    # 2. Drop the partial index on queued_runs if it exists
    op.execute("DROP INDEX IF EXISTS idx_queued_runs_callback;")

    # 3. Drop scheduled_callbacks table and its indexes
    op.drop_table('scheduled_callbacks')

    # 4. Drop scheduled_callback_status enum
    sa.Enum(name='scheduled_callback_status').drop(op.get_bind(), checkfirst=True)

    # 5. Drop columns from workflows table
    op.drop_column('workflows', 'enable_callbacks')
    op.drop_column('workflows', 'callback_resume_mode')


def downgrade() -> None:
    # 1. Re-add columns to workflows table
    op.add_column('workflows', sa.Column('callback_resume_mode', sa.String(), server_default=sa.text("'fresh'"), nullable=False))
    op.add_column('workflows', sa.Column('enable_callbacks', sa.Boolean(), server_default=sa.text('false'), nullable=False))

    # 2. Re-create scheduled_callback_status enum
    sa.Enum('pending', 'completed', 'failed', 'cancelled', name='scheduled_callback_status').create(op.get_bind(), checkfirst=True)

    # 3. Re-create scheduled_callbacks table
    op.create_table(
        'scheduled_callbacks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('workflow_id', sa.Integer(), nullable=False),
        sa.Column('original_run_id', sa.Integer(), nullable=False),
        sa.Column('status', postgresql.ENUM('pending', 'completed', 'failed', 'cancelled', name='scheduled_callback_status', create_type=False), nullable=False),
        sa.Column('scheduled_for', sa.DateTime(timezone=True), nullable=False),
        sa.Column('to_number', sa.String(length=32), nullable=False),
        sa.Column('from_number', sa.String(length=32), nullable=False),
        sa.Column('conversation_summary', sa.Text(), nullable=False),
        sa.Column('gathered_context', sa.JSON(), nullable=False),
        sa.Column('callback_chain_depth', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workflow_id'], ['workflows.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 4. Re-create indexes on scheduled_callbacks
    op.create_index('ix_scheduled_callbacks_org_id', 'scheduled_callbacks', ['organization_id'], unique=False)
    op.create_index(op.f('ix_scheduled_callbacks_original_run_id'), 'scheduled_callbacks', ['original_run_id'], unique=False)
    op.create_index(op.f('ix_scheduled_callbacks_scheduled_for'), 'scheduled_callbacks', ['scheduled_for'], unique=False)
    op.create_index('ix_scheduled_callbacks_status', 'scheduled_callbacks', ['status'], unique=False)
    op.create_index('ix_scheduled_callbacks_workflow_id', 'scheduled_callbacks', ['workflow_id'], unique=False)

    # 5. Re-create partial index on queued_runs
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_queued_runs_callback 
        ON queued_runs (campaign_id, scheduled_for) 
        WHERE (state = 'queued' AND retry_reason = 'user_requested_callback');
        """
    )
