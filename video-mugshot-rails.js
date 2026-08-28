(() => {
  // Original CrimeNewsTV portraits are composed for the shared masthead crop.
  const mugshots = [
    { filename: 'crime-newstv-mugshot-evan-carter.png', focus: '50% 45%' },
    { filename: 'crime-newstv-mugshot-daniel-harper.png', focus: '50% 45%' },
    { filename: 'crime-newstv-mugshot-claire-bennett.png', focus: '50% 45%' },
    { filename: 'crime-newstv-mugshot-megan-lawson.png', focus: '50% 45%' }
  ];

  const shuffle = (items) => {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const selected = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[selected]] = [copy[selected], copy[index]];
    }
    return copy;
  };

  const renderMugshotRails = () => {
    const rails = [...document.querySelectorAll('[data-mugshot-rail]')];
    if (rails.length !== 2) return;

    const selected = shuffle(mugshots);
    rails.forEach((rail, railIndex) => {
      rail.replaceChildren();
      selected.slice(railIndex * 2, railIndex * 2 + 2).forEach(({ filename, focus }) => {
        const card = document.createElement('figure');
        const image = document.createElement('img');

        card.className = 'mugshot-card';
        image.style.setProperty('--mugshot-focus', focus);
        image.src = `01_Photos/Illustrations/${encodeURIComponent(filename)}`;
        image.alt = '';
        image.decoding = 'async';
        card.append(image);
        rail.append(card);
      });
    });
  };

  document.addEventListener('DOMContentLoaded', renderMugshotRails);
})();
