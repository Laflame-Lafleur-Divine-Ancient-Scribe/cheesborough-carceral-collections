(() => {
  'use strict';
  const article = document.getElementById('mh-article');
  if (!article) return;
  const progress = document.querySelector('[data-reading-progress]');
  const chapters = [...article.querySelectorAll('.mh-chapter')];
  const chapterLinks = [...document.querySelectorAll('.mh-chapters a[href^="#"]')];
  let scheduled = false;
  function updateReading() {
    const rect = article.getBoundingClientRect();
    const distance = Math.max(1, article.offsetHeight - innerHeight);
    const fraction = Math.min(1, Math.max(0, -rect.top / distance));
    progress.style.width = (fraction * 100) + '%';
    const current = chapters.filter(section => section.getBoundingClientRect().top <= innerHeight * .3).at(-1);
    chapterLinks.forEach(link => { if (current && link.hash === '#' + current.id) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
    scheduled = false;
  }
  function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(updateReading); } }
  addEventListener('scroll', schedule, { passive: true }); addEventListener('resize', schedule, { passive: true }); updateReading();
  const disclosure = document.querySelector('.mh-chapters details');
  if (matchMedia('(max-width: 700px)').matches) disclosure.open = false;
  const photoDialog = document.getElementById('mh-photo-dialog');
  if (photoDialog && typeof photoDialog.showModal === 'function') {
    document.querySelectorAll('[data-open-photo]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); photoDialog.showModal(); }));
    photoDialog.querySelector('button').addEventListener('click', () => photoDialog.close());
    photoDialog.addEventListener('click', event => { if (event.target === photoDialog) { const rect = photoDialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) photoDialog.close(); } });
  }
  const share = document.querySelector('[data-share-story]');
  const status = document.querySelector('[data-share-status]');
  const canonical = document.querySelector('link[rel="canonical"]').href;
  share.hidden = false;
  share.addEventListener('click', async () => {
    status.textContent = '';
    try {
      if (navigator.share) { await navigator.share({ title: document.title, url: canonical }); status.textContent = 'Shared.'; }
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(canonical); status.textContent = 'Story link copied.'; }
      else throw new Error('Copy unavailable');
    } catch (error) {
      if (error.name === 'AbortError') return;
      const input = document.querySelector('[data-copy-link]'); input.hidden = false; input.value = canonical; input.focus(); input.select(); status.textContent = 'Copy the selected story link.';
    }
  });
  document.querySelectorAll('[data-video-id]').forEach(frame => {
    const id = frame.dataset.videoId;
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
    const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Play Video';
    button.addEventListener('click', () => {
      const iframe = document.createElement('iframe'); iframe.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?playsinline=1&rel=0'; iframe.title = frame.dataset.videoTitle || 'Related video'; iframe.allow = 'encrypted-media; picture-in-picture; fullscreen'; iframe.allowFullscreen = true; iframe.referrerPolicy = 'strict-origin-when-cross-origin'; frame.replaceChildren(iframe); iframe.focus();
    });
    frame.replaceChildren(button);
  });
})();
