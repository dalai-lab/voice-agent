import os
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from api.constants import DATABASE_URL


class BaseDBClient:
    def __init__(self):
        self.engine = create_async_engine(
            DATABASE_URL,
            echo=os.getenv("DB_ECHO", "false").lower() == "true",
            pool_size=int(os.getenv("DB_POOL_SIZE", "30")),
            max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "20")),
            pool_recycle=int(os.getenv("DB_POOL_RECYCLE", "1800")),
            pool_pre_ping=True,
        )
        self.async_session = async_sessionmaker(bind=self.engine)

    async def execute_raw_query(
        self, query: str, params: dict[str, Any] = None
    ) -> list[dict[str, Any]]:
        """
        Execute a raw SQL query and return results as a list of dictionaries.

        Args:
            query: The SQL query to execute
            params: Optional dictionary of query parameters

        Returns:
            List of dictionaries containing the query results
        """
        async with self.async_session() as session:
            result = await session.execute(text(query), params or {})
            rows = result.fetchall()
            if rows:
                # Convert rows to dictionaries
                columns = result.keys()
                return [dict(zip(columns, row)) for row in rows]
            return []
