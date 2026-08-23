import asyncio
import json
from db.database import SessionLocal
from db.models import WorkflowRunModel
from sqlalchemy.orm import selectinload

async def get_usage():
    async with SessionLocal() as session:
        run = await session.get(WorkflowRunModel, 40)
        print("USAGE_INFO:")
        print(json.dumps(run.usage_info, indent=2))
        print("LOGS:")
        print(json.dumps(run.logs, indent=2))

if __name__ == "__main__":
    asyncio.run(get_usage())
