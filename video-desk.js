const CCC_VIDEO_CATALOG = [
  {id:'crazy-getaway-vehicles',title:'Cops Chase 9 Massive and Bizarre Getaway Vehicles',category:'Police Chases',embed:'bNJlXEDw4QE',deck:'A public YouTube video selected for the CrimeNewsTV desk.',description:'This public YouTube video is provided for viewing and discussion. Availability remains under the original publisher’s control.'},
  {id:'criminals-smarter-police',title:'When Criminals Are Smarter Than The Police...',category:'Police Chases',embed:'qmKt21Gir34',deck:'A public YouTube video selected for the CrimeNewsTV desk.',description:'This public YouTube video is provided for viewing and discussion. Availability remains under the original publisher’s control.'},
  {id:'dashcam-police-chases',title:'Unbelievable High-Speed Police Chases Caught on Dashcam',category:'Police Chases',embed:'PVaQP0jz194',deck:'A public YouTube video selected for the CrimeNewsTV desk.',description:'This public YouTube video is provided for viewing and discussion. Availability remains under the original publisher’s control.'},
  {id:'wendys-arrest',title:'Woman’s Meltdown Over Wendy’s Order Ends in Violent Arrest',category:'Bodycam',embed:'_w__G6p_FvQ',deck:'A public YouTube video selected for the CrimeNewsTV desk.',description:'This public YouTube video is provided for viewing and discussion. Availability remains under the original publisher’s control.'}
,
  {id:'unsettling-interrogation',title:'The Most Unsettling Interrogation You Have Ever Seen',category:'Interrogations',embed:'Gisy9l7OCA8',deck:'A public YouTube video selected for the CrimeNewsTV desk.',description:'This public YouTube video is provided for viewing and discussion.'},
  {id:'cops-careers',title:'When Cops Ruin Their Careers In Seconds',category:'Police Accountability',embed:'0ECZNdEr0dA',deck:'A public YouTube video selected for the CrimeNewsTV desk.',description:'This public YouTube video is provided for viewing and discussion.'},
  {id:'david-romero-interrogation',title:'David Romero Interrogation',category:'Interrogations',embed:'vW5mLGFfuYo',deck:'A public YouTube video selected for the CrimeNewsTV desk.',description:'This public YouTube video is provided for viewing and discussion.'},
  {id:'amelia-bissoon-interrogation',title:'Amelia Bissoon Interrogation',category:'Interrogations',embed:'TDfkuJRI8Bk',deck:'A public YouTube video selected for the CrimeNewsTV desk.',description:'This public YouTube video is provided for viewing and discussion.'},
  {id:'michigan-prison-riot',title:'Michigan Prison Riot',category:'Prison Conditions',embed:'zcys2Cn54sI',deck:'A public YouTube video selected for the CrimeNewsTV desk.',description:'This public YouTube video is provided for viewing and discussion.'},
  {id:'prison-fights',title:'Prison Fights - Joel Blaeser',category:'Prison Conditions',embed:'hqazXMLhM-U',deck:'A public YouTube video selected for the CrimeNewsTV desk.',description:'This public YouTube video is provided for viewing and discussion.'},
  {id:'arrests-at-work',title:'Arrests At Work',category:'Arrests',embed:'F-LAGlhPQs4',deck:'A public YouTube video selected for the CrimeNewsTV desk.',description:'This public YouTube video is provided for viewing and discussion.'},
  {id:'funny-police-moments',title:'Funniest Police Moments Of All Time',category:'Arrests',embed:'4PAWKYUw10E',deck:'A public YouTube video selected for the CrimeNewsTV desk.',description:'This public YouTube video is provided for viewing and discussion.'},
  {id:'corrupt-cops',title:'Corrupt Cops Getting Caught In The Act',category:'Police Accountability',embed:'5fGIisES7wE',deck:'A public YouTube video selected for the CrimeNewsTV desk.',description:'This public YouTube video is provided for viewing and discussion.'},
  {id:'atlanta-prison-riot',title:'The Atlanta Prison Riot | FBI Files',category:'Prison Conditions',embed:'yjqCHVtFFO4',deck:'A public YouTube video selected for the CrimeNewsTV desk.',description:'This public YouTube video is provided for viewing and discussion.'},
  {id:'inmate-fights',title:'60 Days In: Top 6 Inmate Fights - Part 2',category:'Prison Conditions',embed:'uf0bD6h_UkQ',deck:'A public YouTube video selected for the CrimeNewsTV desk.',description:'This public YouTube video is provided for viewing and discussion.'},
  {id:'atlanta-jail',title:'Inside Atlanta Jail',category:'Prison Conditions',embed:'OATswCuaGTM',deck:'A public YouTube video selected for the CrimeNewsTV desk.',description:'This public YouTube video is provided for viewing and discussion.'},
  {id:'school-fight-arrest',title:'School Fight Leads To Arrest',category:'Bodycam',embed:'7HU0UhE9Nqg',deck:'A public YouTube video selected for the CrimeNewsTV desk.',description:'This public YouTube video is provided for viewing and discussion.'},
  {id:'teen-interrogation',title:'Teen Interrogation',category:'Interrogations',embed:'hJw2t5qX-20',deck:'A public YouTube video selected for the CrimeNewsTV desk.',description:'This public YouTube video is provided for viewing and discussion.'},
  {id:'tiffany-haddish-dui',title:'Tiffany Haddish DUI Arrest',category:'Bodycam',embed:'9_P0C-ATcVg',deck:'A public YouTube video selected for the CrimeNewsTV desk.',description:'This public YouTube video is provided for viewing and discussion.'},
  {id:'target-shoplifter',title:'Target Shoplifter Bodycam Footage',category:'Bodycam',embed:'POcdw-Lzp3U',deck:'A public YouTube video selected for the CrimeNewsTV desk.',description:'This public YouTube video is provided for viewing and discussion.'}
];

(() => {
  const esc = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const apiBase = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? '' : 'https://serviceapi-production-f574.up.railway.app';
  let metadataRequest;
  const thumb = (film, loading = '') => film.embed ? `<img src="${esc(film.thumbnail || `https://i.ytimg.com/vi/${encodeURIComponent(film.embed)}/hqdefault.jpg`)}" alt="${esc(film.title)} video thumbnail" ${loading}>` : '<span class="source-poster">Source unavailable</span>';
  const link = (film) => `https://www.youtube.com/watch?v=${encodeURIComponent(film.embed)}`;
  const playerFallback = (film) => `<div class="source-poster player-fallback" role="status"><strong>This video could not start in the embedded player.</strong><span>Open the original public video on YouTube to continue watching.</span><a class="action-btn" href="${link(film)}" target="_blank" rel="noreferrer">Watch on YouTube &#8599;</a></div>`;
  const verifyEmbeddedPlayback = (film) => {
    if (!film.embed || film.embeddable === false) return;
    const mount = document.querySelector('#youtube-player');
    if (!mount) return;
    let settled = false;
    let failureTimer;
    const showFallback = () => {
      if (settled) return;
      settled = true;
      clearTimeout(failureTimer);
      const frame = document.querySelector('#youtube-player');
      if (frame) frame.outerHTML = playerFallback(film);
    };
    const connect = () => {
      if (!window.YT || typeof window.YT.Player !== 'function') return false;
      new window.YT.Player('youtube-player', {
        videoId: film.embed,
        playerVars: {
          rel: 0,
          origin: location.origin
        },
        events: {
          onReady: () => { clearTimeout(failureTimer); },
          onError: showFallback
        }
      });
      return true;
    };
    const scriptId = 'youtube-iframe-api';
    const start = () => {
      if (connect()) return;
      const retry = window.setInterval(() => {
        if (connect()) window.clearInterval(retry);
      }, 100);
      window.setTimeout(() => window.clearInterval(retry), 5000);
    };
    if (document.getElementById(scriptId)) start();
    else {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.addEventListener('load', start, { once: true });
      script.addEventListener('error', showFallback, { once: true });
      document.head.append(script);
    }
    failureTimer = window.setTimeout(showFallback, 15000);
  };
  const hydrateCatalog = () => {
    if (metadataRequest) return metadataRequest;
    const ids = [...new Set(CCC_VIDEO_CATALOG.map((film) => film.embed).filter(Boolean))];
    if (!ids.length) return Promise.resolve();
    const batches = Array.from({ length: Math.ceil(ids.length / 50) }, (_, index) => ids.slice(index * 50, (index + 1) * 50));
    metadataRequest = Promise.all(batches.map((batch) => fetch(`${apiBase}/api/youtube/videos?ids=${encodeURIComponent(batch.join(','))}`, { signal: AbortSignal.timeout(8000) })
      .then((response) => response.ok ? response.json() : null)
      .catch(() => null)))
      .then((payloads) => {
        const details = new Map(payloads.flatMap((payload) => payload?.videos || []).map((video) => [video.id, video]));
        CCC_VIDEO_CATALOG.forEach((film) => {
          const localThumbnail = film.thumbnail?.startsWith('assets/') ? film.thumbnail : null;
          Object.assign(film, details.get(film.embed) || {});
          if (localThumbnail) film.thumbnail = localThumbnail;
        });
      })
      .catch(() => {});
    return metadataRequest;
  };
  window.CCCVideoData = { hydrateCatalog };

  function browse() {
    const grid = document.querySelector('#video-grid');
    if (!grid) return;
    const filters = document.querySelector('#video-filters'), search = document.querySelector('#video-search'), results = document.querySelector('#video-results'), empty = document.querySelector('#video-empty'), clear = document.querySelector('#clear-video-filters');
    let active = 'All';
    const feature = CCC_VIDEO_CATALOG[0], root = document.querySelector('#featured-film'), count = document.querySelector('#catalog-count');
    if (count) count.textContent = `${CCC_VIDEO_CATALOG.length} videos`;
    if (feature && root) root.innerHTML = `<article class="lead-film"><div class="film-visual">${thumb(feature)}<a class="play-disc" href="VIDEO.html?id=${encodeURIComponent(feature.id)}" aria-label="Watch ${esc(feature.title)}">&#9654;</a></div><div class="lead-copy"><p class="eyebrow">${esc(feature.category)}</p><h2>${esc(feature.title)}</h2><p>${esc(feature.deck)}</p><a class="watch-link" href="VIDEO.html?id=${encodeURIComponent(feature.id)}">Watch video &rarr;</a></div></article>`;
    const render = () => {
      const categories = ['All', ...new Set(CCC_VIDEO_CATALOG.map((film) => film.category))];
      filters.innerHTML = categories.map((category) => `<button type="button" data-category="${esc(category)}" aria-pressed="${String(category === active)}">${esc(category)}</button>`).join('');
      const query = search.value.trim().toLowerCase();
      const films = CCC_VIDEO_CATALOG.filter((film) => (active === 'All' || film.category === active) && `${film.title} ${film.category} ${film.deck}`.toLowerCase().includes(query));
      grid.innerHTML = films.map((film) => `<article class="video-card"><a href="VIDEO.html?id=${encodeURIComponent(film.id)}"><div class="video-thumb">${thumb(film, 'loading="lazy"')}<span class="play-mini">Watch</span></div><p class="eyebrow">${esc(film.category)}</p><h3>${esc(film.title)}</h3><p class="deck">${esc(film.deck)}</p></a></article>`).join('');
      results.textContent = `${films.length} ${films.length === 1 ? 'video' : 'videos'} shown.`;
      empty.hidden = Boolean(films.length);
    };
    filters.addEventListener('click', (event) => { const button = event.target.closest('button[data-category]'); if (button) { active = button.dataset.category; render(); } });
    search.addEventListener('input', render);
    clear?.addEventListener('click', () => { active = 'All'; search.value = ''; render(); });
    render();
  }

  function comments(film) {
    const list = document.querySelector('#comment-list'), status = document.querySelector('#comment-status'), form = document.querySelector('#comment-form'), field = document.querySelector('#comment-field'), counter = document.querySelector('#comment-count');
    if (!list || !status || !form || !field) return;
    const paint = (items = []) => {
      list.replaceChildren();
      if (counter) counter.textContent = `${items.length} ${items.length === 1 ? 'comment' : 'comments'}`;
      items.forEach((comment) => {
        const row = document.createElement('article'), avatar = document.createElement('span'), wrap = document.createElement('div'), name = document.createElement('strong'), meta = document.createElement('span'), body = document.createElement('p');
        row.className = 'comment'; avatar.className = 'avatar'; avatar.textContent = String(comment.author?.displayName || 'Member').slice(0,1).toUpperCase(); name.textContent = comment.author?.displayName || 'Community member'; meta.className = 'comment-meta'; meta.textContent = ` · ${new Date(comment.createdAt).toLocaleDateString()}`; body.textContent = comment.body; wrap.append(name, meta, body); row.append(avatar, wrap); list.append(row);
      });
      if (!items.length) list.innerHTML = '<p>No published comments yet. Start the conversation below.</p>';
      status.textContent = '';
    };
    const load = async () => { status.textContent = 'Loading comments…'; try { const response = await window.CCCCommunity.request(` /api/comments?contentType=video&contentId=${encodeURIComponent(film.id)}`.trim()); paint(response.comments); } catch (error) { status.textContent = error.message; } };
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); const body = field.value.trim(); if (!body) return;
      const submit = form.querySelector('[type="submit"]'); submit.disabled = true;
      try { const response = await window.CCCCommunity.request('/api/comments', {method:'POST',body:JSON.stringify({contentType:'video',contentId:film.id,body})}); field.value = ''; status.textContent = response.message || 'Your comment is awaiting moderation.'; await load(); } catch (error) { status.textContent = error.message; } finally { submit.disabled = false; }
    });
    window.CCCCommunity.restoreSession().then((user) => { if (!user) { form.hidden = true; status.innerHTML = `Read the discussion. <a href="LOGIN.html?returnTo=${encodeURIComponent(location.pathname + location.search)}">Sign in to add a comment</a>.`; } });
    load();
  }

  function watch() {
    const root = document.querySelector('#watch-page'), id = new URLSearchParams(location.search).get('id');
    let film = CCC_VIDEO_CATALOG.find((entry) => entry.id === id || entry.embed === id);
    if (!film && /^[A-Za-z0-9_-]{6,20}$/.test(id || '')) film = {id,embed:id,title:'CrimeNewsTV Selection',category:'Video Record',deck:'A curated public video selected for the CrimeNewsTV desk.',description:'This public YouTube video is provided for viewing and discussion. Availability remains under the original publisher’s control.'};
    if (!film) { root.innerHTML = '<section class="not-found"><h1>Video not found</h1><p>That video is not in the CrimeNewsTV catalog.</p><a href="VIDEOS.html">Return to CrimeNewsTV</a></section>'; return; }
    const related = CCC_VIDEO_CATALOG.filter((entry) => entry.id !== film.id).slice(0,7);
    const player = !film.embed ? '<div class="source-poster">Video source unavailable</div>' : film.embeddable === false ? '<div class="source-poster"><strong>This publisher does not permit embedded playback.</strong><span>Use Watch on YouTube to open the original video.</span></div>' : `<div id="youtube-player" class="youtube-player-mount" aria-label="${esc(film.title)} video player"></div>`;
    root.innerHTML = `<a class="watch-back" href="VIDEOS.html">&larr; Back to CrimeNewsTV</a><section class="record-masthead" aria-labelledby="watch-heading"><div class="record-primary"><p class="record-kicker">CrimeNewsTV</p><h1 id="watch-heading">${esc(film.title)}</h1><p class="record-deck">${esc(film.deck || 'A selected video from the CrimeNewsTV desk.')}</p></div><aside class="record-slip"><span>Video category</span><strong>${esc(film.category)}</strong><p>Watch the video, review the source, and add to the conversation.</p></aside></section><div class="watch-layout"><article class="watch-main"><section class="player-frame"><div class="player">${player}</div></section><h2 class="watch-title">${esc(film.title)}</h2><p class="watch-meta">${esc(film.category)} &middot; CrimeNewsTV</p><div class="watch-actions"><a class="action-btn" href="${link(film)}" target="_blank" rel="noreferrer">Watch on YouTube &#8599;</a><a class="action-btn secondary" href="#discussion">Comments</a></div><p class="watch-description">${esc(film.description)}</p><p class="embed-note">If YouTube does not allow this embedded player to load, use <strong>Watch on YouTube</strong> to open the original public video.</p><section class="community-discussion" id="discussion" aria-label="Community discussion"><p class="community-discussion-kicker">Community discussion</p><h2 id="discussion-heading">Community conversation</h2><p class="community-discussion-intro">Published comments are visible to every reader. Signed-in members can join the conversation below.</p><p id="comment-status" class="community-thread-status" aria-live="polite"></p><div id="comment-list" class="community-comment-list" aria-live="polite"></div><div class="community-comment-compose"><form id="comment-form" class="community-comment-form"><label for="comment-field">Your comment</label><textarea id="comment-field" maxlength="1200" placeholder="Share a respectful, evidence-based response." required></textarea><button type="submit">Post comment</button></form></div></section></article><aside class="related-videos" aria-label="Related Videos"><h2>Related Videos</h2><p>More from CrimeNewsTV.</p>${related.map((entry) => `<a class="next-card" href="VIDEO.html?id=${encodeURIComponent(entry.id)}">${thumb(entry, 'loading="lazy"')}<div><h3>${esc(entry.title)}</h3><p>${esc(entry.category)}</p></div></a>`).join('')}</aside></div>`;
    verifyEmbeddedPlayback(film);
    window.CCCCommunity.renderNav();
    comments(film);
  }

  document.addEventListener('DOMContentLoaded', () => {
    hydrateCatalog().finally(() => {
      if (document.body.dataset.videoPage === 'browse') {
        if (!window.CCCVideoBrowse && typeof CCC_TODAYS_VIDEOS === 'undefined') browse();
      } else watch();
    });
  });
})();
