import os
import subprocess
from dotenv import load_dotenv

load_dotenv("api/.env")

env = os.environ.copy()
env["PYTHONPATH"] = os.path.abspath(".")

subprocess.run([r"venv\Scripts\python.exe", "-m", "alembic", "-c", r"api\alembic.ini", "revision", "--autogenerate", "-m", "Add ScheduledCallbackModel"], env=env)
