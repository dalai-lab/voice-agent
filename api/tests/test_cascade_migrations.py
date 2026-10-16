import importlib.util
from pathlib import Path
from unittest.mock import MagicMock, patch
from api.db.models import QueuedRunModel, WorkflowRunModel

_MIGRATION_PATH = (
    Path(__file__).resolve().parents[1]
    / "alembic"
    / "versions"
    / "c1a2b3c4d5e6_add_fk_cascades_to_queued_runs.py"
)


def _load_migration():
    assert _MIGRATION_PATH.exists(), f"Migration file missing at {_MIGRATION_PATH}"
    spec = importlib.util.spec_from_file_location(
        "c1a2b3c4d5e6_add_fk_cascades_to_queued_runs", _MIGRATION_PATH
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_migration_metadata_and_revisions():
    migration = _load_migration()
    assert migration.revision == "c1a2b3c4d5e6"
    assert migration.down_revision == "b57bb0a7ba54"


def test_upgrade_executes_expected_cascade_ddl():
    migration = _load_migration()
    with patch("alembic.op.execute") as mock_execute:
        migration.upgrade()
        assert mock_execute.call_count == 2

        parent_fk_call = mock_execute.call_args_list[0][0][0]
        assert "queued_runs_parent_queued_run_id_fkey" in parent_fk_call
        assert "ON DELETE CASCADE" in parent_fk_call

        wf_fk_call = mock_execute.call_args_list[1][0][0]
        assert "workflow_runs_queued_run_id_fkey" in wf_fk_call
        assert "ON DELETE SET NULL" in wf_fk_call


def test_downgrade_reverts_cascade_ddl():
    migration = _load_migration()
    with patch("alembic.op.execute") as mock_execute:
        migration.downgrade()
        assert mock_execute.call_count == 2


def test_models_have_matching_fk_cascade_definitions():
    # QueuedRunModel.parent_queued_run_id foreign key has ondelete="CASCADE"
    parent_fk = list(QueuedRunModel.parent_queued_run_id.property.columns[0].foreign_keys)[0]
    assert parent_fk.ondelete == "CASCADE"
    assert parent_fk.target_fullname == "queued_runs.id"

    # WorkflowRunModel.queued_run_id foreign key has ondelete="SET NULL"
    wf_fk = list(WorkflowRunModel.queued_run_id.property.columns[0].foreign_keys)[0]
    assert wf_fk.ondelete == "SET NULL"
    assert wf_fk.target_fullname == "queued_runs.id"
