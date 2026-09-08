"""Restore missing original PDFs from the verified Paperwork manifest.
Requires requests and pypdf. Existing files are checked, never overwritten.
"""
import hashlib
import io
import json
from pathlib import Path
import requests
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]

def main():
    docs = json.loads((ROOT / 'data/paperwork-documents.json').read_text(encoding='utf-8'))['documents']
    destination = (ROOT / '03_Research/IndictmentPaperwork').resolve()
    for doc in docs:
        path = (ROOT / doc['file']).resolve()
        if not path.is_relative_to(destination):
            raise ValueError('Document path must remain in the Paperwork collection')
        if path.exists():
            content = path.read_bytes()
        else:
            response = requests.get(doc['sourceUrl'], timeout=90)
            response.raise_for_status()
            content = response.content
        if hashlib.sha256(content).hexdigest() != doc['sha256']:
            raise ValueError('Source changed or local file damaged: ' + doc['id'])
        if len(PdfReader(io.BytesIO(content)).pages) != doc['pages']:
            raise ValueError('Unexpected page count: ' + doc['id'])
        if not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open('xb') as output:
                output.write(content)
        print('Verified:', doc['id'])

if __name__ == '__main__':
    main()
