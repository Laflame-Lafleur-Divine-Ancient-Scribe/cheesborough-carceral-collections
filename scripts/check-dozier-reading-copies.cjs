const fs = require('node:fs');
const assert = require('node:assert/strict');
const html = fs.readFileSync('DOZIER-NEWSPAPERS.html', 'utf8');
const data = JSON.parse(html.match(/const NEWSPAPER_DATA = (.*?);/)[1]);
const issues = Object.values(data).flatMap(years => Object.values(years).flat());
const manifest = JSON.parse(fs.readFileSync('documents/dozier-newspapers/manifest.json', 'utf8'));
assert.equal(Object.keys(manifest).length, issues.length, 'Every catalog issue needs a reading copy');
const paths = new Set();
let bytes = 0;
let damaged = 0;
for (const issue of issues) {
  const copy = manifest[issue.path];
  if (copy?.status === 'damaged') {
    assert.equal(copy.pages.length, 0);
    assert.ok(copy.message);
    damaged++;
    continue;
  }
  assert.ok(copy?.pages.length, `Missing issue: ${issue.path}`);
  for (const page of copy.pages) {
    assert.match(page.src, /^documents\/dozier-newspapers\/[a-f0-9]{16}\/\d+\.webp$/);
    assert.ok(!paths.has(page.src), `Duplicate page: ${page.src}`);
    paths.add(page.src);
    assert.ok(page.width > 0 && page.height > 0);
    const file = fs.openSync(page.src, 'r');
    const signature = Buffer.alloc(12);
    fs.readSync(file, signature, 0, 12, 0);
    fs.closeSync(file);
    assert.equal(signature.toString('ascii',0,4),'RIFF');
    assert.equal(signature.toString('ascii',8,12),'WEBP');
    bytes += fs.statSync(page.src).size;
  }
}
console.log(`${issues.length-damaged} readable issues, ${paths.size} unique pages, ${(bytes/1024/1024).toFixed(1)} MB: all reading assets present. ${damaged} damaged source scans explicitly identified.`);
