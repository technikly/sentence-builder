import os

def explore_directory(directory):
    """
    Walks through the given directory and its subdirectories.
    Explains the tree structure of folders, CATS .py, .js, and .jsx files, and lists non-matching files.
    Ignores walking into 'node_modules' folders.
    """
    for root, dirs, files in os.walk(directory):
        level = root.replace(directory, '').count(os.sep)
        indent = '    ' * level
        print(f"{indent}\U0001F4C1 {os.path.basename(root)}")  # Directory name

        # Skip 'node_modules' folder
        if os.path.basename(root) == 'node_modules':
            continue

        # Process .py, .js, and .jsx files
        for file in files:
            if file.endswith(('.py', '.js', '.jsx')):
                file_path = os.path.join(root, file)
                print(f"{indent}    \U0001F408 {file}")  # Cat icon for matching files
                try:
                    with open(file_path, 'r') as f:
                        content = f.read()
                        print(f"{indent}        Contents of {file}:")
                        print("-" * 40)
                        print(content)
                        print("-" * 40)
                except Exception as e:
                    print(f"{indent}        \u26A0\uFE0F Error reading {file}: {e}")

        # List non-matching files
        for file in files:
            if not file.endswith(('.py', '.js', '.jsx')):
                print(f"{indent}    \U0001F4C4 {file}")  # Document icon for non-matching files

if __name__ == "__main__":
    print("Exploring directory structure...")
    explore_directory(os.getcwd())
