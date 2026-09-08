// Prevent publishing Git LFS pointers in place of the source memoir PDFs.
const fs = require('node:fs');
const path = require('node:path');

const directory = path.join(__dirname, '..', '03_Research', '05_Drafts',
  'Life and Times of a Correction Officer_Mark Shepard');
const names = [
  'Life and Times of Correction Officer__MarkShepard.pdf',
  'Life and Times of Correction OfficerPt2__MarkShepard.pdf',
  'The Life and Times of a Correctional Officer by Mark Shepard - Web.pdf',
  'The Life and Times of a Correctional Officer by Mark Shepard.pdf'
];
for (const name of names) {
  const file = path.join(directory, name);
  const fd = fs.openSync(file, 'r');
  try {
    const header = Buffer.alloc(5);
    fs.readSync(fd, header, 0, header.length, 0);
    if (header.toString('ascii') !== '%PDF-') {
      throw new Error(`${name} is not PDF data. Retrieve Git LFS objects before publishing.`);
    }
    console.log(`Verified PDF data: ${name}`);
  } finally {
    fs.closeSync(fd);
  }
}
