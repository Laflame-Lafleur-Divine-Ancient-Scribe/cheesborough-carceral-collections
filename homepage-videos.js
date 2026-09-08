/* Draw directly from the same catalog and editions used by VIDEOS.html. */
(() => {
  function selectVideos(catalog, count = 4, random = Math.random) {
    const seen = new Set();
    const pool = catalog.filter(film => {
      if (!film || !film.id || !film.title || !/^[\w-]{11}$/.test(film.embed || '') || (film.privacyStatus && film.privacyStatus !== 'public') || seen.has(film.embed)) return false;
      seen.add(film.embed);
      return true;
    });
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  }
  if (typeof module !== 'undefined') module.exports = {selectVideos};
  if (typeof document === 'undefined') return;
  const grid = document.querySelector('[data-homepage-videos]');
  if (!grid || typeof CCC_VIDEO_CATALOG === 'undefined') return;
  const films = selectVideos(CCC_VIDEO_CATALOG);
  if (!films.length) return;
  const fragment = document.createDocumentFragment();
  films.forEach(film => {
    const card = document.createElement('article');
    card.className = 'trial-card';
    const link = document.createElement('a');
    link.href = `VIDEO.html?id=${encodeURIComponent(film.id)}`;
    link.style.cssText = 'display:block;color:inherit;text-decoration:none';
    const image = document.createElement('img');
    image.src = `https://i.ytimg.com/vi/${film.embed}/hqdefault.jpg`;
    image.alt = '';
    image.loading = 'lazy';
    image.width = 480; image.height = 360;
    image.style.cssText = 'display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover';
    const heading = document.createElement('h3'); heading.textContent = film.title;
    const category = document.createElement('p'); category.textContent = film.category || 'CrimeNewsTV';
    const action = document.createElement('span'); action.className = 'trial-action'; action.textContent = 'Watch Video →';
    link.append(image, heading, category, action); card.append(link); fragment.append(card);
  });
  grid.replaceChildren(fragment);
})();
