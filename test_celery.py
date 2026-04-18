import os
import sys

# Add the backend dir to sys.path so we can import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from app.worker import analyze_repository

# We run the task synchronously to see where it hangs
print("Starting synchronous analysis test...")
result = analyze_repository("https://github.com/tiangolo/fastapi")
print("Result:", result)
