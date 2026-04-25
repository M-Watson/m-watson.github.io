import os
import subprocess

# Paths
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT_DIR = os.path.join(ROOT_DIR, 'content', 'posts')
PUBLISH_SCRIPT = os.path.join(ROOT_DIR, 'scripts', 'publish_post.py')
PYTHON_EXE = os.path.join(ROOT_DIR, 'venv', 'Scripts', 'python.exe')

if not os.path.exists(PYTHON_EXE):
    PYTHON_EXE = 'python' # Fallback for CI environments

def publish_all():
    if not os.path.exists(CONTENT_DIR):
        print(f"No content directory found at {CONTENT_DIR}")
        return

    for filename in os.listdir(CONTENT_DIR):
        if filename.endswith('.md'):
            file_path = os.path.join(CONTENT_DIR, filename)
            print(f"Publishing {filename}...")
            subprocess.run([PYTHON_EXE, PUBLISH_SCRIPT, file_path])

if __name__ == "__main__":
    publish_all()
