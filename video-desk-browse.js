(() => {
  if (document.body.dataset.videoPage !== 'browse') return;
  window.CCCVideoBrowse = true;
  document.addEventListener('error', event => { const image = event.target; if (image.tagName === 'IMG' && image.closest('#featured-film, #video-grid') && !image.dataset.fallback) { image.dataset.fallback = 'true'; image.src = '01_Photos/ShareImages/CrimeNewsTV.png'; } }, true);
  const escape = value => String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const thumbnail = film => film.thumbnail || `https://i.ytimg.com/vi/${encodeURIComponent(film.embed)}/hqdefault.jpg`;
  const videoMeta = film => { const date = film.publishedAt && new Date(film.publishedAt); const upload = date && !Number.isNaN(date.getTime()) ? 'Uploaded ' + date.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}) : ''; const match = String(film.duration || '').match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/); const duration = match ? [match[1] && match[1]+'h',match[2] && match[2]+'m',match[3] && match[3]+'s'].filter(Boolean).join(' ') : ''; return [upload,duration].filter(Boolean).join(' / '); };
  const href = film => `VIDEO.html?id=${encodeURIComponent(film.id)}`;
  const editions = typeof CCC_DATED_VIDEO_EDITIONS !== 'undefined' ? CCC_DATED_VIDEO_EDITIONS : [];
  const recent = editions.slice(0,4);
  const datedIds = new Set(editions.flatMap(edition => edition.videos.map(film => film.id)));
  const archive = CCC_VIDEO_CATALOG.filter(film => !datedIds.has(film.id));
  const params = new URLSearchParams(location.search);
  const valid = ['all','archive',...editions.map(edition => edition.date)];
  let edition = valid.includes(params.get('edition')) ? params.get('edition') : recent[0]?.date || 'all';
  let limit = 18;
  const search = document.querySelector('#video-search');
  const category = document.querySelector('#video-category');
  search.value = params.get('q') || '';
  [...new Set(CCC_VIDEO_CATALOG.map(film => film.category).filter(Boolean))].sort().forEach(value => category.add(new Option(value,value)));
  if ([...category.options].some(option => option.value === params.get('category'))) category.value = params.get('category');
  const button = (label,value,count) => `<button type="button" data-edition="${escape(value)}" aria-pressed="${edition === value}"><span>${escape(label)}</span><small>${count} videos</small></button>`;
  document.querySelector('#edition-selector').innerHTML = recent.map(item => button(item.date,item.date,item.videos.length)).join('') + button('Earlier editions','archive',editions.slice(4).reduce((sum,item) => sum+item.videos.length,archive.length)) + button('Full desk','all',CCC_VIDEO_CATALOG.length);
  const groups = () => edition === 'all' ? [...editions,{date:'Archive selection',videos:archive}] : edition === 'archive' ? [...editions.slice(4),{date:'Archive selection',videos:archive}] : editions.filter(item => item.date === edition);
  const card = film => `<article class="video-card"><a href="${href(film)}"><div class="video-thumb"><img src="${escape(thumbnail(film))}" alt="${escape(film.title)} video thumbnail" loading="lazy"><span class="play-mini" aria-hidden="true">&#9654; Watch</span></div><div class="card-copy"><p class="eyebrow">${escape(film.category)}</p><h3>${escape(film.title)}</h3><p class="publisher">${escape(film.channelTitle || 'Public video')}</p><p class="video-metadata">${escape(videoMeta(film))}</p></div></a></article>`;
  function featured() {
    const film = groups().flatMap(item => item.videos)[0];
    const mount = document.querySelector('#featured-film');
    if (!film) { mount.replaceChildren(); return; }
    mount.innerHTML = `<article class="lead-film"><a class="film-visual" href="${href(film)}" aria-label="Watch ${escape(film.title)}"><img src="${escape(thumbnail(film))}" alt="${escape(film.title)} video thumbnail" fetchpriority="high"><span class="play-disc" aria-hidden="true">&#9654;</span></a><div class="lead-copy"><p class="eyebrow">Featured selection / ${escape(film.category)}</p><h2>${escape(film.title)}</h2><p class="feature-publisher">${escape(film.channelTitle || 'From the CrimeNewsTV collection')}</p><p class="video-metadata">${escape(videoMeta(film))}</p><a class="watch-link" href="${href(film)}">Watch the video <span aria-hidden="true">&#8599;</span></a></div></article>`;
  }
  function render() {
    const query = search.value.trim().toLowerCase();
    let remaining = limit, count = 0;
    const output = groups().map(group => {
      const matches = group.videos.filter(film => (category.value === 'All' || film.category === category.value) && `${film.title} ${film.category} ${film.channelTitle || ''} ${film.deck || ''}`.toLowerCase().includes(query));
      count += matches.length;
      const visible = matches.slice(0,remaining); remaining -= visible.length;
      return visible.length ? `<section class="video-edition"><header class="edition-header"><h3>${escape(group.date)}</h3><span>${matches.length} ${matches.length === 1 ? 'selection' : 'selections'}</span></header><div class="edition-cards">${visible.map(card).join('')}</div></section>` : '';
    }).join('');
    document.querySelector('#video-grid').innerHTML = output;
    document.querySelector('#video-results').textContent = `Showing ${Math.min(count,limit)} of ${count} matching videos`;
    document.querySelector('#catalog-count').textContent = `${CCC_VIDEO_CATALOG.length} videos in the full desk`;
    document.querySelector('#video-empty').hidden = count > 0;
    document.querySelector('#load-more-videos').hidden = count <= limit;
    document.querySelector('#reset-video-filters').disabled = !query && category.value === 'All';
    document.querySelectorAll('[data-edition]').forEach(item => item.setAttribute('aria-pressed',String(item.dataset.edition === edition)));
    const url = new URL(location.href); url.searchParams.set('edition',edition); if (query) url.searchParams.set('q',search.value); else url.searchParams.delete('q'); if (category.value !== 'All') url.searchParams.set('category',category.value); else url.searchParams.delete('category'); history.replaceState(null,'',url);
  }
  document.querySelector('#edition-selector').addEventListener('click',event => { const selected = event.target.closest('[data-edition]'); if (!selected) return; edition = selected.dataset.edition; limit = 18; featured(); render(); });
  search.addEventListener('input',() => {limit = 18;render();});
  category.addEventListener('change',() => {limit = 18;render();});
  const clear = () => { search.value='';category.value='All';limit=18;render(); };
  document.querySelector('#reset-video-filters').addEventListener('click',clear);
  document.querySelector('#clear-video-filters').addEventListener('click',() => {edition='all';clear();featured();});
  document.querySelector('#load-more-videos').addEventListener('click',() => {const oldCount=document.querySelectorAll('.video-card').length;limit+=18;render();document.querySelectorAll('.video-card a')[oldCount]?.focus({preventScroll:true});});
  featured();render();
})();
