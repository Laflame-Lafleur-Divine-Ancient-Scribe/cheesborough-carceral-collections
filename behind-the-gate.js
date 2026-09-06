(() => {
  const article = document.querySelector('#article-body');
  const contents = document.querySelector('#article-contents');
  const status = document.querySelector('#reader-status');
  const media = matchMedia('(min-width: 761px)');
  const updateContents = () => { contents.open = media.matches; };
  updateContents();
  media.addEventListener('change', updateContents);
  let size = 1.15;
  const changeSize = step => {
    size = Math.min(1.45, Math.max(1, Math.round((size + step) * 100) / 100));
    document.documentElement.style.setProperty('--reading-size', `${size}rem`);
    document.querySelector('#text-smaller').disabled = size <= 1;
    document.querySelector('#text-larger').disabled = size >= 1.45;
    status.textContent = `Text size: ${Math.round(size / 1.15 * 100)}%`;
  };
  document.querySelector('#text-smaller').addEventListener('click', () => changeSize(-.05));
  document.querySelector('#text-larger').addEventListener('click', () => changeSize(.05));
  document.querySelector('#focus-mode').addEventListener('click', event => {
    const active = document.body.classList.toggle('focus-view');
    event.currentTarget.setAttribute('aria-pressed', String(active));
    status.textContent = active ? 'Focus view on. Contents hidden.' : 'Focus view off.';
  });
  document.querySelector('#copy-share').addEventListener('click', async () => {
    const url = 'https://carceralcollections.org/BEHIND-THE-GATE.html';
    try { await navigator.clipboard.writeText(url); status.textContent = 'Article link copied.'; }
    catch { window.prompt('Copy this article link:', url); status.textContent = 'Article link ready to copy.'; }
  });
  const updateProgress = () => {
    const top = article.getBoundingClientRect().top + scrollY;
    const distance = Math.max(1, article.offsetHeight - innerHeight);
    const progress = Math.min(1, Math.max(0, (scrollY - top) / distance));
    document.querySelector('#reading-progress').style.transform = `scaleX(${progress})`;
  };
  let pending = false;
  const scheduleProgress = () => { if (!pending) { pending = true; requestAnimationFrame(() => { updateProgress(); pending = false; }); } };
  addEventListener('scroll', scheduleProgress, {passive:true});
  addEventListener('resize', scheduleProgress);
  new ResizeObserver(scheduleProgress).observe(article);
  const sectionLinks = [...document.querySelectorAll('.contents li a')];
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) sectionLinks.forEach(link => { if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current'); }); });
  }, {rootMargin:'-10% 0px -65% 0px'});
  document.querySelectorAll('.article-body h2').forEach(heading => observer.observe(heading));
  document.querySelector('#reader-tools').hidden = false;
  updateProgress();
})();
