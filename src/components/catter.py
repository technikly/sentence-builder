import os

def explore_directory(directory):
    """
    Walks through the given directory and its subdirectories.
    Explains the tree structure of folders, CATS .py files, and lists non-.py files.
    Ignores walking into 'node_modules' folders.
    """
    for root, dirs, files in os.walk(directory):
        level = root.replace(directory, '').count(os.sep)
        indent = '    ' * level
        print(f"{indent}📁 {os.path.basename(root)}")  # Directory name

        # Skip 'node_modules' folder
        if os.path.basename(root) == 'node_modules':
            continue

        # Process .py files
        for file in files:
            if file.endswith('.js'):
                py_file_path = os.path.join(root, file)
                print(f"{indent}    🐍 {file}")
                try:
                    with open(py_file_path, 'r') as f:
                        content = f.read()
                        print(f"{indent}        Contents of {file}:")
                        print("-" * 40)
                        print(content)
                        print("-" * 40)
                except Exception as e:
                    print(f"{indent}        ⚠️ Error reading {file}: {e}")

        # List non-.py files
        for file in files:
            if not file.endswith('.py'):
                print(f"{indent}    📄 {file}")

if __name__ == "__main__":
    print("Exploring directory structure...")
    explore_directory(os.getcwd())

