import glob, re

for f in glob.glob("*.html"):
    with open(f, "r", encoding="utf-8") as file:
        c = file.read()
    if 'href="index2.html"' in c or "href='index2.html'" in c:
        c_new = c.replace('href="index2.html"', 'href="index.html"').replace("href='index2.html'", "href='index.html'")
        with open(f, "w", encoding="utf-8") as file:
            file.write(c_new)
        print(f"Updated home navigation link in: {f}")

# Ensure index.html and index2.html are 100% identical
with open("index.html", "r", encoding="utf-8") as file:
    c_index = file.read()
with open("index2.html", "w", encoding="utf-8") as file:
    file.write(c_index)
print("index.html and index2.html synchronized.")
