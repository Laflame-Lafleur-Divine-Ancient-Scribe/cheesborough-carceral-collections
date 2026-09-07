# Dozier Newspaper Reading Copies

These WebP pages are reading copies of the original local newspaper PDFs, rendered at 150 dpi with the page dimensions, full page area, and color preserved. The originals are not changed. Each issue's directory uses a hash of its original path to prevent filename collisions.

`manifest.json` maps the 526 catalog paths to ordered page images. The newspaper reader loads only the selected page, rather than requiring an entire scan or a browser PDF plug-in. Existing bookmarked reader URLs continue to work.

To rebuild, install PyMuPDF and Pillow in your Python environment, then run `python scripts/prepare-dozier-reading-copies.py` from the repository. The original PDFs must be available locally. Existing images are reused; remove only the generated directory for an issue if its source scan changes before rebuilding.

Do not exclude this directory from Git or the Pages artifact: the original newspaper directory is excluded, which previously left the public reader pointing to missing files.

## Damaged Sources

The local copies of June 20, 1953; April 9, 1955; and October 22, 1955 are truncated PDFs with no readable page tree. They are explicitly marked `damaged` in the manifest rather than represented as complete newspapers. Replacement source scans are needed. All 523 other issues contain 3,102 published reading pages.
