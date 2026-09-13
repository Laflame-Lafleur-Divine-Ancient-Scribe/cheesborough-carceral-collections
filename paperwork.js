/* ==========================================================================
   CARCERAL EVIDENCE ROOM & 48-HOUR DOCKET ENGINE
   Cheesborough Carceral Collections
   ========================================================================== */

(() => {
  'use strict';

  const normalize = val => String(val || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'dj')
    .replace(/\u0110/g, 'Dj')
    .toLowerCase();

  function selectDocuments(docs, state) {
    const terms = normalize(state.q).trim().split(/\s+/).filter(Boolean);
    const cat = state.category || state.filter || 'all';

    return docs.filter(doc => {
      // Search text match
      const docText = normalize([
        doc.title,
        doc.summary,
        doc.country,
        doc.jurisdiction,
        doc.type,
        doc.docket,
        doc.classification,
        doc.receiptQuote,
        (doc.tags || []).join(' ')
      ].join(' '));

      const matchesSearch = terms.length === 0 || terms.every(term => docText.includes(term));
      if (!matchesSearch) return false;

      // Category / filter match
      if (cat === '48hr-drops') {
        if (!doc.isFeaturedDrop && !String(doc.id || '').startsWith('rot-')) return false;
      } else if (cat === 'indictment') {
        if (!/Indictment/i.test(doc.type)) return false;
      } else if (cat === 'police-report') {
        if (!/Police|Report|Dispatch/i.test(doc.type + ' ' + (doc.classification || ''))) return false;
      } else if (cat === 'affidavit') {
        if (!/Affidavit|Warrant/i.test(doc.type + ' ' + (doc.classification || ''))) return false;
      } else if (cat === 'mittimus-vault') {
        if (!/Mittimus|Vault|NORJAK|FBI/i.test(doc.type + ' ' + (doc.classification || ''))) return false;
      } else if (cat !== 'all') {
        if (doc.category !== cat) return false;
      }

      // Location match
      if (state.location && state.location !== 'all') {
        if (state.location.startsWith('country:') && 'country:' + doc.country !== state.location) return false;
        if (state.location.startsWith('court:') && 'court:' + doc.jurisdiction !== state.location) return false;
      }

      // Type match
      if (state.type && state.type !== 'all' && doc.type !== state.type) return false;

      return true;
    }).sort((a, b) => {
      if (state.sort === 'title') return a.title.localeCompare(b.title);
      if (state.sort === 'pages') return (b.pages || 0) - (a.pages || 0);
      const da = Date.parse(a.date || '') || -Infinity;
      const db = Date.parse(b.date || '') || -Infinity;
      return db - da || a.title.localeCompare(b.title);
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { selectDocuments };
  }
  if (typeof document === 'undefined') return;

  // Load records from embedded JSON or API
  let records = [];
  let featuredDrops = [];
  let epoch = 0;
  let nextEpochMs = 0;

  const indexEl = document.getElementById('paperwork-index');
  if (indexEl) {
    try {
      const parsed = JSON.parse(indexEl.textContent);
      records = parsed.documents || [];
      featuredDrops = parsed.featuredDrops || [];
      epoch = parsed.epoch || 0;
    } catch (e) {
      console.error('Error parsing embedded paperwork index', e);
    }
  }

  // DOM Elements
  const listEl = document.getElementById('pw-documents');
  const countEl = document.getElementById('pw-count');
  const searchInput = document.getElementById('pw-search');
  const clearSearchBtn = document.getElementById('pw-clear-search');
  const locationSelect = document.getElementById('pw-location');
  const typeSelect = document.getElementById('pw-type');
  const sortSelect = document.getElementById('pw-sort');
  const resetBtn = document.getElementById('pw-reset');
  const moreBtn = document.getElementById('pw-more');
  const emptyEl = document.getElementById('pw-empty');
  const emptyResetBtn = document.getElementById('pw-empty-reset');
  const countdownEl = document.getElementById('pw-countdown');
  const epochEl = document.getElementById('pw-epoch');
  const rotatingDeskEl = document.getElementById('pw-rotating-grid');

  let activeFilter = 'all';
  let limit = 12;

  // 48-Hour Live Countdown Timer
  function updateCountdown() {
    const EPOCH_MS = 48 * 60 * 60 * 1000;
    const now = Date.now();
    const curEpoch = Math.floor(now / EPOCH_MS);
    const nextEpoch = (curEpoch + 1) * EPOCH_MS;
    const diff = Math.max(0, nextEpoch - now);

    const hours = Math.floor(diff / (3600 * 1000));
    const mins = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
    const secs = Math.floor((diff % (60 * 1000)) / 1000);

    const pad = n => String(n).padStart(2, '0');
    if (countdownEl) {
      countdownEl.textContent = `${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;
    }
    if (epochEl && epoch) {
      epochEl.textContent = epoch;
    }
  }

  setInterval(updateCountdown, 1000);
  updateCountdown();

  // Try fetching dynamic 48-hour feed from /api/research/paperwork
  fetch('/api/research/paperwork')
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data && Array.isArray(data.documents) && data.documents.length > 0) {
        records = data.documents;
        featuredDrops = data.featuredDrops || [];
        epoch = data.epoch || epoch;
        renderFeaturedDrops();
        render();
      }
    })
    .catch(err => {
      console.log('Serving from static paperwork catalog index');
    });

  // Stamp badge helper
  function getStampBadge(item) {
    const cls = item.classification || item.type || 'COURT PAPERWORK';
    let colorClass = 'stamp-gold';
    if (item.category === 'murder' || /HOMICIDE|MURDER/i.test(cls)) colorClass = 'stamp-red';
    else if (item.category === 'drugs' || /DRUG|CARTEL|TRAFFICKING/i.test(cls)) colorClass = 'stamp-purple';
    else if (item.category === 'corruption' || /RICO|CORRUPTION/i.test(cls)) colorClass = 'stamp-gold';
    else if (item.category === 'fraud' || /FRAUD|SECURITIES|VAULT/i.test(cls)) colorClass = 'stamp-teal';
    else if (/AFFIDAVIT|SEARCH|POLICE/i.test(cls)) colorClass = 'stamp-blue';

    return `<span class="pw-stamp-badge ${colorClass}">[${cls}]</span>`;
  }

  // Category badge helper
  function getCategoryBadge(cat) {
    const map = {
      'murder': { label: 'Murder & Violent Crime', cls: 'cat-murder' },
      'drugs': { label: 'Drugs & Trafficking', cls: 'cat-drugs' },
      'corruption': { label: 'Corruption & Bribery', cls: 'cat-corruption' },
      'sex-trafficking': { label: 'Sex Trafficking', cls: 'cat-sex-trafficking' },
      'fraud': { label: 'Fraud & Financial', cls: 'cat-fraud' }
    };
    const c = map[cat] || { label: cat || 'Official Record', cls: 'cat-corruption' };
    return `<span class="pw-meta-category-badge ${c.cls}">${c.label}</span>`;
  }

  // Format file size
  function formatBytes(bytes) {
    if (!bytes) return '';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1024).toFixed(0) + ' KB';
  }

  // Render 48-Hour Rotating Drops Banner
  function renderFeaturedDrops() {
    if (!rotatingDeskEl) return;
    const drops = featuredDrops.length > 0 ? featuredDrops : records.filter(d => d.isFeaturedDrop).slice(0, 4);
    if (!drops || drops.length === 0) return;

    rotatingDeskEl.innerHTML = drops.map(doc => {
      const directPdf = doc.directPdf || doc.file;
      const readerUrl = `PDF-READER.html?file=${encodeURIComponent(doc.file)}`;
      const quoteHtml = doc.receiptQuote ? `<div class="pw-rotation-quote">${doc.receiptQuote}</div>` : '';
      const tagsHtml = doc.tags ? `<div class="pw-rotation-meta-tags">${doc.tags.map(t => `<span class="pw-tag-pill">${t}</span>`).join('')}</div>` : '';

      return `
        <article class="pw-rotation-card" data-doc-id="${doc.id}">
          <div>
            <div class="pw-rotation-card-top">
              ${getStampBadge(doc)}
              <span class="pw-rotation-docket">${doc.docket || doc.type}</span>
            </div>
            <h3>${doc.title}</h3>
            <p class="pw-rotation-court">${doc.jurisdiction || ''} &bull; ${doc.date || ''}</p>
            ${quoteHtml}
            <p style="font-size:13px; color:#cbd5e1; line-height:1.5; margin-bottom:12px;">${doc.summary || ''}</p>
            ${tagsHtml}
          </div>
          <div class="pw-card-actions">
            <a class="btn-pw-view" href="${readerUrl}" data-reader-open>
              <span>🔍 Open In Archive Viewer</span> &rarr;
            </a>
            <div class="pw-card-subactions">
              <a class="btn-pw-ipad" href="${directPdf}" target="_blank" rel="noopener" data-free="true" title="Direct PDF for iPad Safari">
                <span>📱 iPad PDF</span> &nearr;
              </a>
              <a class="btn-pw-download" href="${directPdf}" download data-free="true" title="Download Document">
                <span>📥 Download</span>
              </a>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }


  // Render main document list
  function render() {
    const q = searchInput ? searchInput.value : '';
    const loc = locationSelect ? locationSelect.value : 'all';
    const typ = typeSelect ? typeSelect.value : 'all';
    const srt = sortSelect ? sortSelect.value : 'date';

    const matches = selectDocuments(records, {
      q,
      filter: activeFilter,
      location: loc,
      type: typ,
      sort: srt
    });

    if (countEl) {
      countEl.textContent = `Showing ${Math.min(limit, matches.length)} of ${matches.length} Unsealed Documents`;
    }

    if (emptyEl) emptyEl.hidden = matches.length !== 0;
    if (clearSearchBtn) clearSearchBtn.hidden = !q;
    if (resetBtn) {
      resetBtn.hidden = !q && activeFilter === 'all' && loc === 'all' && typ === 'all' && srt === 'date';
    }

    if (moreBtn) {
      moreBtn.hidden = matches.length <= limit;
      moreBtn.textContent = `Show ${Math.min(12, matches.length - limit)} More Documents (Remaining: ${matches.length - limit})`;
    }

    // Update filter pills UI
    document.querySelectorAll('.pw-pill').forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn.dataset.filter === activeFilter));
    });

    const visibleDocs = matches.slice(0, limit);
    listEl.innerHTML = visibleDocs.map(doc => {
      const directPdf = doc.directPdf || doc.file;
      const readerUrl = `PDF-READER.html?file=${encodeURIComponent(doc.file)}`;
      const pagesStr = doc.pages ? `${doc.pages} Pages` : '';
      const sizeStr = formatBytes(doc.bytes);
      const metaMetrics = [pagesStr, sizeStr].filter(Boolean).join(' / ');
      const quoteHtml = doc.receiptQuote ? `<div class="pw-doc-receipt-quote">${doc.receiptQuote}</div>` : '';
      const sourceLink = doc.sourceUrl ? `<a class="btn-pw-source" href="${doc.sourceUrl}" target="_blank" rel="noopener">🏛️ Official Filing &nearr;</a>` : '';

      return `
        <article class="pw-document-card" data-document-id="${doc.id}">
          <div class="pw-card-meta-col">
            ${getCategoryBadge(doc.category)}
            <div class="pw-meta-item">
              <strong>${doc.date || 'Record'}</strong>
              <span>${metaMetrics}</span>
            </div>
            ${doc.docket ? `<div class="pw-meta-item"><strong>Docket</strong><span>${doc.docket}</span></div>` : ''}
          </div>
          
          <div class="pw-card-body-col">
            ${getStampBadge(doc)}
            <span class="pw-doc-type-label">${doc.type}</span>
            <h3>${doc.title}</h3>
            <p class="pw-doc-summary">${doc.summary}</p>
            <p class="pw-doc-court">${doc.jurisdiction} &bull; ${doc.country}</p>
            ${quoteHtml}
          </div>

          <div class="pw-card-actions-col">
            <a class="btn-pw-view" href="${readerUrl}" data-reader-open>
              <span>🔍 Open In Archive Viewer</span> &rarr;
            </a>
            <a class="btn-pw-ipad-outline" href="${directPdf}" target="_blank" rel="noopener" data-free="true" title="Open directly in Safari without paywall">
              <span>📱 Open Direct PDF (iPad)</span> &nearr;
            </a>
            <a class="btn-pw-ipad-outline" href="${directPdf}" download data-free="true" title="Download official PDF file">
              <span>📥 Download PDF</span>
            </a>
            ${sourceLink}
          </div>
        </article>
      `;
    }).join('');
  }

  function clearAll() {
    if (searchInput) searchInput.value = '';
    activeFilter = 'all';
    if (locationSelect) locationSelect.value = 'all';
    if (typeSelect) typeSelect.value = 'all';
    if (sortSelect) sortSelect.value = 'date';
    limit = 12;
    render();
    if (searchInput) searchInput.focus({ preventScroll: true });
  }

  // Event Listeners
  if (searchInput) {
    searchInput.addEventListener('input', () => { limit = 12; render(); });
  }
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      limit = 12;
      render();
      searchInput.focus();
    });
  }

  [locationSelect, typeSelect, sortSelect].forEach(sel => {
    if (sel) sel.addEventListener('change', () => { limit = 12; render(); });
  });

  document.querySelectorAll('.pw-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      activeFilter = pill.dataset.filter || 'all';
      limit = 12;
      render();
    });
  });

  if (resetBtn) resetBtn.addEventListener('click', clearAll);
  if (emptyResetBtn) emptyResetBtn.addEventListener('click', clearAll);

  if (moreBtn) {
    moreBtn.addEventListener('click', () => {
      limit += 12;
      render();
    });
  }

  // Initial renders
  renderFeaturedDrops();
  render();
})();
