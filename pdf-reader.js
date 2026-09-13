const byId = id => document.getElementById(id);
const raw = new URLSearchParams(location.search).get('file');
let page = 1, pages = 1, zoom = 1, serial = 0, doc;
const controls = byId('controls-wrap'), overlay = byId('status-overlay'), list = byId('pdf-pages-list');

// Setup download button
const download = document.createElement('button');
download.className = 'btn-control btn-download-sub';
download.textContent = '⬇ Download PDF · Paid subscription';
download.type = 'button';
download.onclick = () => window.CCCPdf.download(raw);

const utilityActions = byId('utility-actions');
if (utilityActions) {
  utilityActions.appendChild(download);
} else {
  document.querySelector('.toolbar-bar')?.append(download);
}

// Setup direct PDF buttons
const directBtn = byId('btn-direct-pdf');
if (directBtn && raw) {
  directBtn.href = raw;
  directBtn.style.display = 'inline-flex';
}
const dockDirectBtn = byId('dock-btn-direct');
if (dockDirectBtn && raw) {
  dockDirectBtn.href = raw;
}

function failure(message) {
  if (raw && /\.pdf$/i.test(raw)) {
    renderNativeFallback(raw, byId('doc-title').textContent || 'Document');
    return;
  }
  byId('spinner').hidden = true;
  overlay.hidden = false;
  byId('status-heading').textContent = 'Document unavailable';
  byId('status-desc').textContent = message;
  controls.hidden = true;
  const dock = byId('mobile-reader-dock');
  if (dock) dock.hidden = true;
}

function renderNativeFallback(url, title) {
  overlay.hidden = true;
  controls.hidden = true;
  const dock = byId('mobile-reader-dock');
  if (dock) dock.hidden = true;
  byId('doc-kicker').textContent = 'Open Document · Mobile & Native Direct Reading';
  list.innerHTML = `
    <div class="pdf-native-fallback-container">
      <div class="pdf-native-banner">
        <div class="pdf-native-info">
          <span class="pdf-native-badge">&#128220; Direct Archival Stream Active</span>
          <h2 class="pdf-native-title">${title || 'Archival Filing'}</h2>
          <p class="pdf-native-desc">Optimized for high-resolution mobile, tablet, and desktop viewing.</p>
        </div>
        <div class="pdf-native-actions">
          <a href="${url}" target="_blank" rel="noopener" class="btn-control btn-direct-primary">&#128241; Open High-Res PDF &#8599;</a>
          <a href="${url}" download class="btn-control btn-direct-secondary">&#11015; Download Copy</a>
        </div>
      </div>
      <div class="pdf-fallback-frame-wrap">
        <object data="${url}" type="application/pdf" class="pdf-fallback-embed">
          <iframe src="${url}" class="pdf-fallback-embed">
            <div class="pdf-fallback-alt-box">
              <p class="pdf-fallback-alt-title">Document Ready to View</p>
              <p class="pdf-fallback-alt-text">Your device can open this PDF directly in your native reader.</p>
              <a href="${url}" target="_blank" rel="noopener" class="btn-control btn-direct-primary">&#128241; Open Full PDF Now &#8599;</a>
            </div>
          </iframe>
        </object>
      </div>
    </div>
  `;
}

async function show(number) {
  page = Math.max(1, Math.min(number, pages));
  const request = ++serial;

  // Sync toolbar input and step buttons
  if (byId('page-jump-input')) byId('page-jump-input').value = page;
  if (byId('btn-prev-page')) byId('btn-prev-page').disabled = page === 1;
  if (byId('btn-next-page')) byId('btn-next-page').disabled = page === pages;

  // Sync mobile bottom dock
  if (byId('dock-current-page')) byId('dock-current-page').textContent = page;
  if (byId('dock-total-pages')) byId('dock-total-pages').textContent = pages;
  if (byId('dock-btn-prev')) byId('dock-btn-prev').disabled = page === 1;
  if (byId('dock-btn-next')) byId('dock-btn-next').disabled = page === pages;

  const image = new Image();
  image.alt = `${byId('doc-title').textContent}, page ${page} of ${pages}`;
  image.style.cssText = `display:block;width:${zoom * 100}%;max-width:none;height:auto;margin:0 auto;`;
  image.src = `${window.CCCPdf.api}/api/pdf/page?id=${doc.id}&page=${page}`;

  byId('status-heading').textContent = 'Accessing Archival Vault...';
  byId('status-desc').textContent = 'Unsealing page ' + page + ' of ' + pages + '...';
  byId('spinner').hidden = false;
  overlay.hidden = false;

  try {
    await image.decode();
    if (request !== serial) return;

    const card = document.createElement('article');
    card.className = 'pdf-page-card';
    card.id = 'active-page-card';

    const strip = document.createElement('div');
    strip.className = 'pdf-card-strip';
    strip.innerHTML = `
      <span class="pdf-strip-title">${byId('doc-title').textContent || 'Carceral Archive'}</span>
      <span class="pdf-strip-tag">Page ${page} of ${pages}</span>
    `;
    card.appendChild(strip);

    const wrap = document.createElement('div');
    wrap.className = 'pdf-page-paper-wrap';
    wrap.appendChild(image);
    card.appendChild(wrap);

    const footer = document.createElement('div');
    footer.className = 'pdf-card-footer';
    footer.innerHTML = `
      <span class="pdf-footer-tag">&#9878;&#65039; Official Archival Exhibit &bull; Page ${page} of ${pages}</span>
      <span class="pdf-footer-nav-hint">The Cheesborough Carceral Collections</span>
    `;
    card.appendChild(footer);

    list.replaceChildren(card);
    overlay.hidden = true;
    byId('reader-container').scrollTo({ top: 0, left: 0 });
    controls.hidden = false;
    const dock = byId('mobile-reader-dock');
    if (dock) dock.hidden = false;
  } catch {
    if (request === serial) failure('This page could not load. Refresh to try again. Your reading access is free.');
  }
}

// Toolbar listeners
byId('btn-prev-page').onclick = () => show(page - 1);
byId('btn-next-page').onclick = () => show(page + 1);
byId('page-jump-input').onchange = e => show(Number(e.target.value) || 1);
byId('btn-zoom-in').onclick = () => { zoom = Math.min(2.5, zoom + 0.2); show(page); };
byId('btn-zoom-out').onclick = () => { zoom = Math.max(0.5, zoom - 0.2); show(page); };
byId('btn-fit-width').onclick = () => { zoom = 1; show(page); };

// Mobile bottom dock listeners
const dockPrev = byId('dock-btn-prev');
if (dockPrev) dockPrev.onclick = () => show(page - 1);
const dockNext = byId('dock-btn-next');
if (dockNext) dockNext.onclick = () => show(page + 1);

try {
  if (!raw) throw Error('Choose a document from the collection to start reading.');
  byId('status-heading').textContent = 'Accessing Archival Vault...';
  byId('status-desc').textContent = 'Unsealing court record, forensic exhibits & docket pages...';
  
  doc = await window.CCCPdf.lookup(raw);
  if (!doc) {
    const filename = raw.split('/').pop().replace(/\.pdf$/i, '').replace(/_/g, ' ');
    byId('doc-title').textContent = filename;
    renderNativeFallback(raw, filename);
  } else {
    const title = doc.path.split('/').pop().replace(/\.pdf$/i, '').replace(/_/g, ' ');
    byId('doc-title').textContent = title;
    document.title = title + ' | Document Reader';
    byId('doc-kicker').textContent = 'Free reading · The Cheesborough Carceral Collections';
    
    if (doc.path.includes('TheYellowjacket_DozierPaper/')) {
      const { openNewspaper } = await import('./newspaper-reader.js');
      await openNewspaper(doc.path);
    } else {
      const response = await fetch(`${window.CCCPdf.api}/api/pdf/info?id=${doc.id}`);
      const body = await response.json();
      if (!response.ok) throw Error(body.error || 'Document unavailable.');
      pages = body.pages;
      byId('total-pages-count').textContent = pages;
      byId('page-jump-input').max = pages;
      if (byId('dock-total-pages')) byId('dock-total-pages').textContent = pages;
      await show(1);
    }
  }
} catch (error) {
  failure(error.message);
}
