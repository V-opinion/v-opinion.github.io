import os
import glob
from datetime import datetime

DOMAIN = "https://dpns.multireligionvalsystem.eu.org"
OUTPUT_FILE = "sitemap.xml"

# Find all markdown files (excluding node_modules or template folders if needed)
md_files = glob.glob("**/*.md", recursive=True)

urls = []
for file_path in md_files:
    # Skip READMEs or templates if desired
    if file_path.lower().startswith("readme") or "node_modules" in file_path:
        continue

    # Convert file path to clean URL
    clean_path = file_path.replace("\\", "/").replace(".md", "")
    if clean_path == "index":
        url = f"{DOMAIN}/"
    else:
        url = f"{DOMAIN}/{clean_path}"

    # Get file last modified date
    mtime = os.path.getmtime(file_path)
    lastmod = datetime.fromtimestamp(mtime).strftime('%Y-%m-%d')

    urls.append((url, lastmod))

# Build XML output
xml_lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
]

for url, lastmod in urls:
    priority = "1.0" if url == f"{DOMAIN}/" else "0.8"
    xml_lines.append(f"  <url>")
    xml_lines.append(f"    <loc>{url}</loc>")
    xml_lines.append(f"    <lastmod>{lastmod}</lastmod>")
    xml_lines.append(f"    <changefreq>weekly</changefreq>")
    xml_lines.append(f"    <priority>{priority}</priority>")
    xml_lines.append(f"  </url>")

xml_lines.append('</urlset>')

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    f.write("\n".join(xml_lines))

print(f"Successfully updated {OUTPUT_FILE} with {len(urls)} URLs.")
