"""Check downloaded source integrity and amendment-to-page mapping.

Usage: python scripts/verify-bill-of-rights-library.py [--check-pages]
Requires pypdf. Run after updating data/bill-of-rights-resources.json.
"""
import argparse
import hashlib
import json
from concurrent.futures import ThreadPoolExecutor
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse
from urllib.parse import quote
from urllib.request import urlopen

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
FOLDERS = {1: '1st', 2: '2nd', 3: '3rd', **{n: f'{n}th' for n in range(4, 11)}}


class Links(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.paths = set()
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        if tag != 'a':
            return
        href = dict(attrs).get('href', '')
        parsed = urlparse(href)
        if parsed.scheme or parsed.netloc:
            return
        self.paths.add(unquote(parsed.path))
        for value in parse_qs(parsed.query).get('file', []):
            self.paths.add(value)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check-pages', action='store_true')
    parser.add_argument('--base-url', help='Also verify served PDF bytes, for example http://localhost:8080/')
    args = parser.parse_args()
    records = json.loads((ROOT / 'data/bill-of-rights-resources.json').read_text(encoding='utf-8-sig'))
    counts = Counter()
    seen = set()
    page_links = {}
    if args.check_pages:
        for amendment in FOLDERS:
            page_links[amendment] = Links((ROOT / f'AMENDMENT-{amendment}.html').read_text(encoding='utf-8')).paths
    total_bytes = 0
    total_pages = 0
    for record in records:
        amendment = record['amendment']
        assert amendment in FOLDERS, f'Invalid amendment: {amendment}'
        relative = Path(record['path'])
        folder = ROOT / '03_Research/Amendments' / FOLDERS[amendment]
        file = (ROOT / relative).resolve()
        assert file.is_relative_to(folder.resolve()), f'Wrong amendment folder: {relative}'
        assert file.suffix.lower() == '.pdf', f'Not a PDF: {relative}'
        with file.open('rb') as stream:
            assert stream.read(5) == b'%PDF-', f'Pointer or invalid PDF: {relative}'
            stream.seek(0)
            digest = hashlib.file_digest(stream, 'sha256').hexdigest()
        assert digest == record['sha256'], f'Checksum mismatch: {relative}'
        assert (amendment, digest) not in seen, f'Duplicate document in amendment {amendment}: {relative}'
        seen.add((amendment, digest))
        size = file.stat().st_size
        assert size == record['bytes'], f'Incorrect byte count: {relative}'
        reader = PdfReader(file)
        if reader.is_encrypted:
            assert reader.decrypt(''), f'Document requires a password: {relative}'
        pages = len(reader.pages)
        assert pages == record['pages'] and pages > 0, f'Incorrect page count: {relative}'
        for page in reader.pages:
            assert float(page.mediabox.width) > 0 and float(page.mediabox.height) > 0, relative
        for key in ['title', 'publisher', 'description', 'type', 'sourceUrl']:
            assert record.get(key), f'Missing {key}: {relative}'
        assert urlparse(record['sourceUrl']).scheme in ('https', 'http'), relative
        if args.check_pages:
            assert relative.as_posix() in page_links[amendment], f'Missing local link: {relative}'
            for other in FOLDERS:
                if other != amendment:
                    assert relative.as_posix() not in page_links[other], f'Misfiled link on Amendment {other}: {relative}'
        counts[amendment] += 1
        total_bytes += size
        total_pages += pages
    for amendment in FOLDERS:
        assert counts[amendment] >= 14, f'Amendment {amendment} has only {counts[amendment]} resources'
    if args.base_url:
        def check_served(record):
            url = args.base_url.rstrip('/') + '/' + quote(record['path'], safe='/')
            with urlopen(url, timeout=60) as response:
                assert response.status == 200, url
                digest = hashlib.file_digest(response, 'sha256').hexdigest()
            assert digest == record['sha256'], f'Served bytes differ: {url}'
        with ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(check_served, records))
    print(json.dumps({'documents': len(records), 'perAmendment': dict(sorted(counts.items())),
                      'pages': total_pages, 'bytes': total_bytes, 'pageLinksChecked': args.check_pages,
                      'servedBytesChecked': bool(args.base_url)}, indent=2))


if __name__ == '__main__':
    main()
