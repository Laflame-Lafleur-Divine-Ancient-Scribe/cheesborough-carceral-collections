"""Build on-page newspaper images; requires PyMuPDF and Pillow. Originals are never modified."""
import concurrent.futures, hashlib, json, re
from pathlib import Path
import pymupdf
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'documents/dozier-newspapers'
def build(item):
    source = ROOT / item['path']
    key = hashlib.sha256(item['path'].encode()).hexdigest()[:16]
    target = DEST / key
    target.mkdir(parents=True, exist_ok=True)
    with pymupdf.open(source) as doc:
        pages = []
        for i, page in enumerate(doc):
            output = target / f'{i+1}.webp'
            if output.exists():
                try:
                    with Image.open(output) as existing: existing.load()
                except OSError:
                    output.unlink()
            if not output.exists():
                pix = page.get_pixmap(dpi=150, colorspace=pymupdf.csRGB, alpha=False)
                image = Image.frombytes('RGB', (pix.width,pix.height), pix.samples)
                temporary = output.with_suffix('.tmp')
                image.save(temporary, 'WEBP', quality=60, method=1)
                temporary.replace(output)
            with Image.open(output) as image:
                pages.append({'src': output.relative_to(ROOT).as_posix(), 'width':image.width, 'height':image.height})
    result = {'pages': pages, 'title': item['filename'].removesuffix('.pdf')}
    if not pages: result.update(status='damaged', message='The source scan is damaged. A replacement is needed before this issue can be read.')
    return item['path'], result
if __name__ == '__main__':
    html = (ROOT / 'DOZIER-NEWSPAPERS.html').read_text(encoding='utf-8')
    data = json.loads(re.search(r'const NEWSPAPER_DATA = (.*?);',html).group(1))
    items = [item for years in data.values() for issues in years.values() for item in issues]
    result = {}
    with concurrent.futures.ProcessPoolExecutor(max_workers=8) as pool:
        for i,(key,value) in enumerate(pool.map(build,items),1):
            result[key]=value
            if i % 25 == 0: print(f'{i}/{len(items)} issues ready',flush=True)
    (DEST / 'manifest.json').write_text(json.dumps(result,separators=(',',':')),encoding='utf-8')
    print(f'Built {len(result)} issues, {sum(len(v["pages"]) for v in result.values())} pages.',flush=True)
