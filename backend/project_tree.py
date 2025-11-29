import os, sys

# Fix Windows encoding issue (for PowerShell)
sys.stdout.reconfigure(encoding='utf-8')

# Folders to ignore
IGNORE_DIRS = {"node_modules", ".next", "__pycache__", ".git", ".venv", "env", "dist", "build"}

def print_tree(path, prefix=""):
    entries = sorted([e for e in os.listdir(path) if e not in IGNORE_DIRS])
    for i, entry in enumerate(entries):
        full_path = os.path.join(path, entry)
        connector = "└── " if i == len(entries) - 1 else "├── "
        print(prefix + connector + entry)
        if os.path.isdir(full_path):
            new_prefix = prefix + ("    " if i == len(entries) - 1 else "│   ")
            print_tree(full_path, new_prefix)

if __name__ == "__main__":
    # Step one directory up (from backend to interviewplatform)
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    print(f"📁 Project Tree: {os.path.basename(root)}\n")
    print_tree(root)
