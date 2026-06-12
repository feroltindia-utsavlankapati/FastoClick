import os
import re

directory = r"c:\Utsav\ferolt\FastoClick\client\src\components\pages"

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith((".tsx", ".ts", ".jsx", ".js")):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            new_content = re.sub(r'<NavigationBar />\n?', '', content)
            new_content = re.sub(r'import NavigationBar from "[^"]+";\n?', '', new_content)
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")

print("Done removing NavigationBar.")
