# Script to rename Fortune Ferguson / Newberry documents and update all code references
import os, glob, re, urllib.parse

RENAME_MAP = {
    "newberry 6.pdf": "Newberry_Six_1916_Memorial_Service_Transcript_AAHP.pdf",
    "FORTUNE FERGUSON JR by Brandon Jett.pdf": "Brandon_Jett_State_of_Florida_v_Fortune_Ferguson_Jr_2024.pdf",
    "Fortune Ferguson, FL, 1927 April 27 - M.E. Grenander Department of Special Collections & Archives.pdf": "Fortune_Ferguson_1927_Execution_Record_Card_Grenander_Archives.pdf",
    "Florida, U.S., State Prison Register, 1875-1959 - Ancestry.com.pdf": "Florida_State_Prison_Register_Fortune_Ferguson_1924_1927.pdf",
    "1910 United States Federal Census - Ancestry.com.pdf": "1910_Federal_Census_Fortune_Ferguson_Sr_Newberry_Alachua.pdf",
    "1910 United States Federal Census - Ancestry.com2.pdf": "1910_Federal_Census_Fortune_Ferguson_Jr_Childhood_Newberry.pdf",
    "1920 United States Federal Census - Ancestry.com.pdf": "1920_Federal_Census_Fortune_Ferguson_Family_Farm_Newberry.pdf",
    "Death Penalty for Children.pdf": "Death_Penalty_for_Children_Victor_Streib_Oklahoma_Law_Review_1983.pdf",
    "HISTORY OF THE JUVENILE DEATH PENALTY - The Washington Post.pdf": "History_of_Juvenile_Death_Penalty_Washington_Post_1988.pdf",
    "Judge Herbert Rider and the Lynching at Labelle.pdf": "Judge_Herbert_Rider_and_the_Lynching_at_LaBelle_Shofner_1980.pdf",
    "Paper2.pdf": "Atlanta_Tri_Weekly_Journal_Historical_Press_1920s.pdf",
    "paper3.pdf": "Georgia_Court_Elections_and_Legal_Press_1920s.pdf",
    "spanish paper.pdf": "La_Traduccion_Tampa_Florida_Spanish_Language_Press_1920s.pdf"
}

# 1. Rename physical files in both directories
folders = [
    "03_Research/03_Archival-Notes/FORTUNE FERGUSON JR",
    "RESEARCH WEBSITE HERO/FORTUNE FERGUSON JR"
]

for folder in folders:
    if not os.path.exists(folder): continue
    for old_name, new_name in RENAME_MAP.items():
        old_path = os.path.join(folder, old_name)
        new_path = os.path.join(folder, new_name)
        if os.path.exists(old_path):
            if os.path.exists(new_path) and old_path != new_path:
                os.remove(new_path)
            os.rename(old_path, new_path)
            print(f"Renamed in {folder}: {old_name} -> {new_name}")

# 2. Update all references in all HTML and JS files
html_and_js = glob.glob("*.html") + glob.glob("*.js")

for file_path in html_and_js:
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    
    modified = False
    for old_name, new_name in RENAME_MAP.items():
        # Check both raw filename and URL-encoded versions
        old_encoded = urllib.parse.quote(old_name)
        new_encoded = urllib.parse.quote(new_name)
        
        if old_name in content:
            content = content.replace(old_name, new_name)
            modified = True
        if old_encoded in content:
            content = content.replace(old_encoded, new_encoded)
            modified = True

    if modified:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated references in: {file_path}")

print("File renamings and codebase references updated successfully.")
