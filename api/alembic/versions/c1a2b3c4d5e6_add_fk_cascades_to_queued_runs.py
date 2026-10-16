"""add_fk_cascades_to_queued_runs

Revision ID: c1a2b3c4d5e6
Revises: b57bb0a7ba54
Create Date: 2026-10-16 13:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1a2b3c4d5e6'
down_revision: Union[str, None] = 'b57bb0a7ba54'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update queued_runs.parent_queued_run_id foreign key constraint to ON DELETE CASCADE
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'queued_runs_parent_queued_run_id_fkey'
                AND table_name = 'queued_runs'
            ) THEN
                ALTER TABLE queued_runs DROP CONSTRAINT queued_runs_parent_queued_run_id_fkey;
            END IF;
            ALTER TABLE queued_runs
                ADD CONSTRAINT queued_runs_parent_queued_run_id_fkey
                FOREIGN KEY (parent_queued_run_id)
                REFERENCES queued_runs(id)
                ON DELETE CASCADE;
        END $$;
        """
    )

    # 2. Update workflow_runs.queued_run_id foreign key constraint to ON DELETE SET NULL
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'workflow_runs_queued_run_id_fkey'
                AND table_name = 'workflow_runs'
            ) THEN
                ALTER TABLE workflow_runs DROP CONSTRAINT workflow_runs_queued_run_id_fkey;
            END IF;
            ALTER TABLE workflow_runs
                ADD CONSTRAINT workflow_runs_queued_run_id_fkey
                FOREIGN KEY (queued_run_id)
                REFERENCES queued_runs(id)
                ON DELETE SET NULL;
        END $$;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'workflow_runs_queued_run_id_fkey'
                AND table_name = 'workflow_runs'
            ) THEN
                ALTER TABLE workflow_runs DROP CONSTRAINT workflow_runs_queued_run_id_fkey;
            END IF;
            ALTER TABLE workflow_runs
                ADD CONSTRAINT workflow_runs_queued_run_id_fkey
                FOREIGN KEY (queued_run_id)
                REFERENCES queued_runs(id);
        END $$;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'queued_runs_parent_queued_run_id_fkey'
                AND table_name = 'queued_runs'
            ) THEN
                ALTER TABLE queued_runs DROP CONSTRAINT queued_runs_parent_queued_run_id_fkey;
            END IF;
            ALTER TABLE queued_runs
                ADD CONSTRAINT queued_runs_parent_queued_run_id_fkey
                FOREIGN KEY (parent_queued_run_id)
                REFERENCES queued_runs(id);
        END $$;
        """
    )
