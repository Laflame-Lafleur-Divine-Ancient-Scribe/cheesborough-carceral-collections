import os, glob, re, urllib.parse

html_files = glob.glob("*.html")
broken = set()

for f in html_files:
    content = open(f, "r", encoding="utf-8", errors="ignore").read()
    reader_matches = re.findall(r'file=([^"\'&>\s]+)', content)
    attr_matches = re.findall(r'(?:href|src)=["\']([^"\'>#\s]+)["\']', content)

    for link in set(reader_matches + attr_matches):
        if link.startswith("http") or link.startswith("mailto:") or link.startswith("tel:") or link.startswith("javascript:") or link.startswith("#"):
            continue
        if "?" in link and "file=" in link:
            file_part = urllib.parse.unquote(link.split("file=", 1)[1].split("&")[0])
            if not os.path.exists(file_part):
                broken.add((f, link, file_part))
        else:
            decoded = urllib.parse.unquote(link).replace("\\", "/")
            if "?" in decoded:
                decoded = decoded.split("?")[0]
            if not decoded or decoded.startswith("#"):
                continue
            if not os.path.exists(decoded):
                broken.add((f, link, decoded))

print(f"Total broken references in HTML files: {len(broken)}")
for src, raw, decoded in sorted(broken):
    print(f"  [{src}] RAW: {raw} --> MISSING: {decoded}")
