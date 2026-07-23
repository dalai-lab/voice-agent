import os
import sys
from dotenv import load_dotenv

# Add the project root to PYTHONPATH so we can import 'api'
sys.path.insert(0, os.path.abspath("."))

# Load the dev DB url from api/.env
load_dotenv("api/.env")

import alembic.config

def main():
    # Pass the config file and upgrade command to alembic
    args = [
        "-c",
        "api/alembic.ini",
        "upgrade",
        "head"
    ]
    alembic.config.main(argv=args)

if __name__ == "__main__":
    main()
