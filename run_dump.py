import json
from pathlib import Path
from dotenv import load_dotenv
import os
from unittest.mock import patch

load_dotenv("api/.env")

# Patch Minio before importing app
import minio
with patch.object(minio, "Minio"):
    from fastapi.openapi.utils import get_openapi
    from api.app import app

    REPO_ROOT = Path(".").resolve()
    OUTPUT = REPO_ROOT / "docs" / "api-reference" / "openapi.json"
    
    spec = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
        servers=app.servers,
    )
    OUTPUT.write_text(json.dumps(spec, separators=(",", ":")))
    print(f"Wrote {len(spec['paths'])} paths to {OUTPUT.relative_to(REPO_ROOT)}")
