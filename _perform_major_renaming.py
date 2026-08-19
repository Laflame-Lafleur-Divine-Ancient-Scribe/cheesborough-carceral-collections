# Script to perform major file renaming and update all code references
import os, glob, re, urllib.parse

# 1. HTML Pages to rename (brief, accurate names)
HTML_RENAMES = {
    "CENSUS-AND-CAMP.html": "NEWBERRY-AND-FORTUNE.html",
    "POWELL-AMERICAN-SIBERIA.html": "AMERICAN-SIBERIA.html",
    "DIGITAL-PHOTOGRAPHY-COLLECTIONS.html": "PHOTOGRAPHY.html",
    "DOC-1969-DOZIER-REPORT.html": "DOZIER-1969-REPORT.html",
    "DOC-FORTUNE-FERGUSON-JETT.html": "FERGUSON-JETT-STUDY.html",
    "DOC-FORTUNE-FERGUSON-WAPO.html": "JUVENILE-DEATH-PENALTY.html",
    "FORTUNE-FERGUSON-RESEARCH.html": "FORTUNE-FERGUSON.html",
    "PHOTOGRAPHY-STATES.html": "PHOTOGRAPHY-BY-STATE.html"
}

# 2. Document files to rename
DOC_RENAMES = {
    "02_Books-and-Manuscripts/Books/02_Secondary-Scholarship/Correctional bookshelf_a bibliography  U.S. Bureau of Prisons Library.pdf":
    "02_Books-and-Manuscripts/Books/02_Secondary-Scholarship/Correctional_Bookshelf_Bibliography_US_Bureau_of_Prisons.pdf",

    "03_Research/03_Archival-Notes/DozierArchives/Anthropology and Humanism - 2016 - Jackson - Exhuming the Dead and Talking to the Living  The 1914 Fire at the Florida.pdf":
    "03_Research/03_Archival-Notes/DozierArchives/Antoinette_Jackson_1914_Fire_Exhuming_the_Dead_2016.pdf",

    "03_Research/03_Archival-Notes/DozierArchives/For Their Own Good_St (1).pdf":
    "03_Research/03_Archival-Notes/DozierArchives/For_Their_Own_Good_St_Petersburg_Times_Report.pdf",

    "03_Research/03_Archival-Notes/DozierArchives/Dozier School Handbook/Handbook1963.pdf":
    "03_Research/03_Archival-Notes/DozierArchives/Dozier School Handbook/Dozier_School_Handbook_1963.pdf",

    "03_Research/03_Archival-Notes/DozierArchives/Dozier School Handbook/live1958.pdf":
    "03_Research/03_Archival-Notes/DozierArchives/Dozier School Handbook/Dozier_Living_Conditions_1958.pdf",

    "RESEARCH WEBSITE HERO/Dozier/DozierArchives/For Their Own Good_St (1).pdf":
    "RESEARCH WEBSITE HERO/Dozier/DozierArchives/For_Their_Own_Good_St_Petersburg_Times_Report.pdf"
}

# Step A: Rename document files on disk
for old_path, new_path in DOC_RENAMES.items():
    if os.path.exists(old_path):
        if os.path.exists(new_path) and old_path != new_path:
            os.remove(new_path)
        os.rename(old_path, new_path)
        print(f"Renamed DOC: {old_path} -> {new_path}")

# Step B: Rename HTML files on disk
for old_html, new_html in HTML_RENAMES.items():
    if os.path.exists(old_html):
        if os.path.exists(new_html) and old_html != new_html:
            os.remove(new_html)
        os.rename(old_html, new_html)
        print(f"Renamed HTML: {old_html} -> {new_html}")

# Step C: Update references across all .html and .js files
all_code_files = glob.glob("*.html") + glob.glob("*.js")

for code_file in all_code_files:
    with open(code_file, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    original = content

    # Replace HTML page references
    for old_html, new_html in HTML_RENAMES.items():
        content = content.replace(f'"{old_html}"', f'"{new_html}"')
        content = content.replace(f"'{old_html}'", f"'{new_html}'")
        content = content.replace(f'href="{old_html}"', f'href="{new_html}"')
        content = content.replace(f"href='{old_html}'", f"href='{new_html}'")
        content = content.replace(f'url: "{old_html}"', f'url: "{new_html}"')
        # In query strings (e.g. ?file=...)
        content = content.replace(old_html, new_html)

    # Replace DOC references (raw and URL-encoded)
    for old_doc, new_doc in DOC_RENAMES.items():
        old_doc_encoded = urllib.parse.quote(old_doc)
        new_doc_encoded = urllib.parse.quote(new_doc)
        
        old_base = os.path.basename(old_doc)
        new_base = os.path.basename(new_doc)
        old_base_encoded = urllib.parse.quote(old_base)
        new_base_encoded = urllib.parse.quote(new_base)

        content = content.replace(old_doc, new_doc)
        content = content.replace(old_doc_encoded, new_doc_encoded)
        content = content.replace(old_base, new_base)
        content = content.replace(old_base_encoded, new_base_encoded)

    if content != original:
        with open(code_file, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated references in: {code_file}")

# Ensure index.html and index2.html are identical
with open("index.html", "r", encoding="utf-8") as f:
    c_index = f.read()
with open("index2.html", "w", encoding="utf-8") as f:
    f.write(c_index)
print("index.html and index2.html verified in sync.")
