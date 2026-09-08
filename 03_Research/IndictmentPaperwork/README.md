# Paperwork Collection

50 original public case documents, ten in each category. The public desk is `RESEARCH.html`.

Source URLs, document descriptions, original byte sizes, page counts, and SHA-256 checksums are recorded in `data/paperwork-documents.json`. Files retain the bytes supplied by the official publisher. Dates identify the document, not the present case status; year-only dates indicate year-level precision. Indictments describe allegations. The UK agreed statements and the Roof appellate brief are labeled separately from indictments.

Rebuild the public page with `python scripts/build-paperwork.py`. Restore missing copies and check existing files with `python scripts/download-paperwork.py` (requires requests and pypdf). The restore script refuses changed content instead of silently replacing a preserved filing.

UK public sector documents are reused under the Open Government Licence v3.0: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/

The pre-existing Lil Durk PDF in this directory was left untouched.
