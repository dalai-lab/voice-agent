from dotenv import load_dotenv
import os
import sys

load_dotenv("api/.env")
os.system("python -m alembic -c api/alembic.ini revision --autogenerate -m \"add_pci\"")
