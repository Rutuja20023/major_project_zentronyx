import sys
import asyncio
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from app.core.database import check_database_connection


async def main():
    print("Checking database connection...")
    result = await check_database_connection()
    print("Database Health Check Result:")
    print(result)
    if result.get("status") == "healthy":
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
