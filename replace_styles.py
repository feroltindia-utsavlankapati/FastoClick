import os
import re

directory = r"c:\Utsav\ferolt\FastoClick\client\src\components"

replacements = [
    (r"bg-\[\#E0E5EC\]", "bg-slate-50"),
    (r"text-\[\#3D4852\]", "text-slate-900"),
    (r"text-\[\#6B7280\]", "text-slate-500"),
    (r"text-\[\#A0AEC0\]", "text-slate-400"),
    (r"text-\[\#6C63FF\]", "text-primary-600"),
    (r"bg-\[\#6C63FF\]", "bg-primary-600"),
    (r"border-\[\#6C63FF\]", "border-primary-600"),
    (r"ring-\[\#6C63FF\]", "ring-primary-500"),
    (r"text-red-500", "text-danger"),
    (r"text-green-500", "text-success"),
    
    (r"soft-extruded-hover", "hover:shadow-md transition-shadow"),
    (r"soft-extruded-sm", "bg-white border border-slate-200 shadow-sm rounded-lg"),
    (r"soft-extruded", "bg-white border border-slate-200 shadow-sm rounded-xl"),
    
    (r"soft-inset-deep", "bg-slate-100 border border-slate-200 shadow-inner rounded-xl"),
    (r"soft-inset-sm", "bg-slate-50 border border-slate-200 shadow-inner rounded-md"),
    (r"soft-inset", "bg-slate-50 border border-slate-200 rounded-xl"),
    
    (r"soft-btn-primary", "inline-flex items-center justify-center font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"),
    (r"soft-btn", "inline-flex items-center justify-center font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"),
    
    (r"soft-input", "flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"),
    (r"soft-textarea", "min-h-[100px]"),
    (r"soft-checkbox", "w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"),
    
    (r"soft-badge-blue", "bg-info/10 text-info"),
    (r"soft-badge-amber", "bg-warning/10 text-warning"),
    (r"soft-badge-green", "bg-success/10 text-success"),
    (r"soft-badge-red", "bg-danger/10 text-danger"),
    (r"soft-badge-gray", "bg-slate-100 text-slate-600"),
    (r"soft-badge-purple", "bg-primary-100 text-primary-700"),
    (r"soft-badge", "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"),
    
    (r"soft-calendar-cell", "bg-white border border-slate-200 hover:border-primary-500 transition-colors"),
    (r"soft-dropzone", "border-2 border-dashed border-slate-300 hover:border-primary-500 bg-slate-50 transition-colors"),
    (r"soft-tab", "px-4 py-2 font-medium text-slate-600 hover:text-slate-900 transition-colors rounded-md"),
    (r"soft-transition", "transition-smooth"),
    (r"soft-skeleton", "animate-pulse bg-slate-200 rounded"),
    (r"animate-soft-pulse", "animate-pulse"),
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    new_content = content
    for pattern, repl in replacements:
        new_content = re.sub(pattern, repl, new_content)
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith((".tsx", ".ts", ".jsx", ".js")):
            process_file(os.path.join(root, file))

print("Done.")
