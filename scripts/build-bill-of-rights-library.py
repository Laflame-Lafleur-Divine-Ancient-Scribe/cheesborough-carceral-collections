"""Generate static, accessible research rows from the verified Bill of Rights manifest."""
from pathlib import Path
import hashlib,html,json,re
from urllib.parse import quote
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[1]
esc=lambda value:html.escape(str(value),quote=True)
manifest=ROOT/'data/bill-of-rights-resources.json'
if not manifest.exists(): raise SystemExit('Merge data/bill-of-rights-resources.json before generating pages.')
resources=json.loads(manifest.read_text(encoding='utf-8-sig'))
legacy=[
 ('4thAmendResearch_3rdparty.pdf','The Fourth Amendment Third-Party Doctrine','Congressional Research Service',2014,'Official analysis','CRS report R43586, June 5, 2014; this analysis predates Carpenter v. United States (2018).','https://crsreports.congress.gov/product/pdf/R/R43586'),
 ('4thAmend_ResearchGuide.pdf','Fourth Amendment: A List of Resources','Wisconsin State Law Library',2020,'Research guide','Jaime Healy-Plotkin research guide, updated October 23, 2020; a starting point for search-and-seizure sources.','https://wilawlibrary.gov/learn/starthere/fourth-amendment.pdf'),
 ('The-Fourth-Amendment-in-the-Digital-Age.pdf','The Fourth Amendment in the Digital Age','National Association of Criminal Defense Lawyers',2016,'Research report','Andrew Guthrie Ferguson symposium report released in June 2016; its digital-privacy discussion predates Carpenter (2018).','https://www.nacdl.org/Document/FourthAmendmentintheDigitalAge')]
for filename,title,publisher,year,kind,description,url in legacy:
 path='03_Research/Amendments/4th/'+filename
 if not any(item['path']==path for item in resources):
  content=(ROOT/path).read_bytes(); resources.append(dict(title=title,publisher=publisher,year=year,type=kind,description=description,amendment=4,path=path,sourceUrl=url,pages=len(PdfReader(ROOT/path).pages),bytes=len(content),sha256=hashlib.sha256(content).hexdigest()))

def row(item):
 path=item['path']; size=f"{item['bytes']/1024/1024:.1f} MB" if item['bytes']>=1048576 else f"{round(item['bytes']/1024)} KB"
 meta=' / '.join(str(v) for v in [item.get('year'),str(item['pages'])+' pages',size] if v)
 return f'''<article class="research-document" data-resource-type="{esc(item['type'])}"><div class="resource-identity"><span class="doc-format">{esc(item['type'])}</span><span class="resource-file-meta">PDF / {esc(meta)}</span></div><div class="resource-content"><h3>{esc(item['title'])}</h3><p class="resource-publisher">{esc(item['publisher'])}</p><p class="resource-description">{esc(item['description'])}</p><div class="resource-actions"><a class="resource-read" href="PDF-READER.html?file={quote(path,safe='')}">Read PDF <span aria-hidden="true">&#8599;</span></a><a href="{esc(path)}" download>Download PDF <span aria-hidden="true">&#8595;</span></a><a href="{esc(item['sourceUrl'])}" target="_blank" rel="noopener">Original source <span aria-hidden="true">&#8599;</span></a></div></div></article>'''
counts={n:sum(item['amendment']==n for item in resources) for n in range(1,11)}
if any(count == 0 for count in counts.values()): raise SystemExit('All ten amendment groups are required before writing pages.')
for n in range(1,11):
 p=ROOT/f'AMENDMENT-{n}.html'; s=p.read_text(encoding='utf-8-sig'); items=[item for item in resources if item['amendment']==n]
 if not items: raise SystemExit(f'No resources for amendment {n}; refusing incomplete build.')
 rows='\n'.join(row(item) for item in sorted(items,key=lambda x:(-(x.get('year') or 0),x['title'])))
 section=f'''<section class="documents-section" id="documents" aria-labelledby="documents-title"><div class="section-heading"><div><p class="eyebrow">Read. Compare. Follow the source.</p><h2 id="documents-title">The research file.</h2></div><p>{len(items)} local PDFs for this amendment, with source details and a direct download for each. Start with an overview or follow a case.</p></div><div class="resource-notice"><strong>Read each source in context.</strong> Court decisions and dated analyses are preserved as published. Later law may change their meaning. Sources marked as context explore related questions; they are not direct holdings on this amendment.</div><div class="resource-filters" hidden><div><label for="resource-search">Find a document</label><input id="resource-search" type="search" placeholder="Search a case, publisher, or topic" autocomplete="off"></div><div><label for="resource-type">Source type</label><select id="resource-type"><option value="all">All source types</option></select></div><button type="button" id="resource-reset" hidden>Clear filters</button></div><p class="resource-count" id="resource-count" role="status" aria-live="polite">{len(items)} documents in this file</p><div class="research-document-list">{rows}</div><div class="resource-empty" id="resource-empty" hidden><h3>No documents match that search.</h3><p>Try a shorter phrase or a different source type.</p><button type="button" id="resource-empty-reset">Show all documents</button></div><div class="official-reference-links"><h3>Keep the official references close.</h3><a href="https://www.archives.gov/founding-docs/bill-of-rights-transcript" target="_blank" rel="noopener">National Archives: original text &#8599;</a><a href="https://constitution.congress.gov/browse/amendment-{n}/" target="_blank" rel="noopener">Constitution Annotated: Amendment {n} analysis &#8599;</a></div></section>'''
 s,count=re.subn(r'<section class="documents-section".*?</section>',lambda _:section,s,flags=re.S);assert count==1
 s=re.sub(r'bill-of-rights\.(css|js)(?:\?v=[^" ]*)?',r'bill-of-rights.\1?v=20260908-heading-case',s)
 p.write_text(s,encoding='utf-8')
p=ROOT/'BILL-OF-RIGHTS.html';s=p.read_text(encoding='utf-8-sig')
s=re.sub(r'(<section class="section-heading" id="amendments">.*?</div><p>).*?(</p></section>)', lambda m:m.group(1)+f"{len(resources)} downloadable PDFs across the ten amendments. Each file pairs the original text with court decisions, analysis, and research sources you can read here or save."+m.group(2),s,flags=re.S)
def card(match):
 text=match.group(0);n=int(re.search(r'href="AMENDMENT-(\d+)\.html"',text).group(1));text=re.sub(r'<span class="card-resource-count">.*?</span>','',text);return text.replace('<span class="card-action">',f'<span class="card-resource-count">{counts[n]} local PDFs</span><span class="card-action">')
s=re.sub(r'<a class="amendment-card".*?</a>',card,s,flags=re.S)
s=re.sub(r'bill-of-rights\.(css|js)(?:\?v=[^" ]*)?',r'bill-of-rights.\1?v=20260908-heading-case',s)
p.write_text(s,encoding='utf-8')
print('Generated 10 research files and hub:',counts,'total',len(resources))
