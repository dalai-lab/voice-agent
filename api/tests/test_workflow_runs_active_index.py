import importlib.util
from pathlib import Path
from unittest.mock import MagicMock, patch
from api.db.models import WorkflowRunModel

_MIGRATION_PATH = (
    Path(__file__).resolve().parents[1]
    / "alembic"
    / "versions"
    / "f3a4b5c6d7e8_add_idx_workflow_runs_campaign_active.py"
)


def _load_migration():
    assert _MIGRATION_PATH.exists(), f"Migration file missing at {_MIGRATION_PATH}"
    spec = importlib.util.spec_from_file_location(
        "f3a4b5c6d7e8_add_idx_workflow_runs_campaign_active", _MIGRATION_PATH
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_migration_metadata_and_revisions():
    migration = _load_migration()
    assert migration.revision == "f3a4b5c6d7e8"
    assert migration.down_revision == "e1f2a3b4c5d6"


def test_upgrade_executes_create_index():
    migration = _load_migration()
    with patch("alembic.op.create_index") as mock_create:
        migration.upgrade()
        mock_create.assert_called_once()
        args, kwargs = mock_create.call_args
        assert args[0] == "idx_workflow_runs_campaign_active"
        assert args[1] == "workflow_runs"
        assert args[2] == ["campaign_id", "is_completed"]
        assert kwargs.get("unique") is False
        assert "is_completed IS FALSE" in str(kwargs.get("postgresql_where"))


def test_downgrade_executes_drop_index():
    migration = _load_migration()
    with patch("alembic.op.drop_index") as mock_drop:
        migration.downgrade()
        mock_drop.assert_called_once()
        args, kwargs = mock_drop.call_args
        assert args[0] == "idx_workflow_runs_campaign_active"
        assert kwargs.get("table_name") == "workflow_runs"


def test_workflow_run_model_has_compound_partial_index():
    found = False
    for arg in WorkflowRunModel.__table_args__:
        if hasattr(arg, "name") and arg.name == "idx_workflow_runs_campaign_active":
            found = True
            col_names = [col.name if hasattr(col, "name") else str(col) for col in arg.columns]
            assert "campaign_id" in col_names
            assert "is_completed" in col_names
            dialect_options = arg.dialect_options.get("postgresql", {})
            where_clause = str(dialect_options.get("where"))
            assert "is_completed IS FALSE" in where_clause
            break

    assert found, "Index idx_workflow_runs_campaign_active not found in WorkflowRunModel.__table_args__"
