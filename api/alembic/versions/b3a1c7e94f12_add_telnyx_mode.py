"""add telnyx mode

Revision ID: b3a1c7e94f12
Revises: e54ddb048535
Create Date: 2026-03-24 12:00:00.000000

"""

from collections.abc import Sequence

from alembic_postgresql_enum import TableReference

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b3a1c7e94f12"
down_revision: str | None = "e54ddb048535"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.sync_enum_values(
        enum_schema="public",
        enum_name="workflow_run_mode",
        new_values=[
            "ari",
            "twilio",
            "vonage",
            "vobiz",
            "cloudonix",
            "telnyx",
            "webrtc",
            "smallwebrtc",
            "stasis",
            "VOICE",
            "CHAT",
        ],
        affected_columns=[
            TableReference(
                table_schema="public", table_name="workflow_runs", column_name="mode"
            )
        ],
        enum_values_to_rename=[],
    )


def downgrade() -> None:
    op.sync_enum_values(
        enum_schema="public",
        enum_name="workflow_run_mode",
        new_values=[
            "ari",
            "twilio",
            "vonage",
            "vobiz",
            "cloudonix",
            "webrtc",
            "smallwebrtc",
            "stasis",
            "VOICE",
            "CHAT",
        ],
        affected_columns=[
            TableReference(
                table_schema="public", table_name="workflow_runs", column_name="mode"
            )
        ],
        enum_values_to_rename=[],
    )
