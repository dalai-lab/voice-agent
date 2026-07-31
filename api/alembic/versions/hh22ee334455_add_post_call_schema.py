"""add post_call_schema and extracted_data

Revision ID: hh22ee334455
Revises: gg11dd223344
Create Date: 2026-07-31 15:33:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'hh22ee334455'
down_revision = 'gg11dd223344'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Add post_call_schema to workflows
    op.add_column('workflows', sa.Column('post_call_schema', sa.JSON(), server_default=sa.text("'[]'::json"), nullable=False))
    # Add post_call_schema to workflow_definitions
    op.add_column('workflow_definitions', sa.Column('post_call_schema', sa.JSON(), server_default=sa.text("'[]'::json"), nullable=False))
    # Add extracted_data to workflow_runs
    op.add_column('workflow_runs', sa.Column('extracted_data', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('workflow_runs', 'extracted_data')
    op.drop_column('workflow_definitions', 'post_call_schema')
    op.drop_column('workflows', 'post_call_schema')
