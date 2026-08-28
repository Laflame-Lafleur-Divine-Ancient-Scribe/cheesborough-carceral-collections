(() => {
  const mugshots = [
    'mugshot-black-woman-04.png',
    'mugshot-black-woman-05.png',
    'mugshot-white-woman-15.png',
    'mugshot-white-woman-17.png',
    'mugshot-black-man-07.png',
    'mugshot-white-man-18.png'
  ];
  const focusPoints = ['center top', '50% 22%', '46% top', '54% 16%'];

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

    const selected = shuffle(mugshots).slice(0, 4);
    rails.forEach((rail, railIndex) => {
      rail.replaceChildren();
      selected.slice(railIndex * 2, railIndex * 2 + 2).forEach((filename) => {
        const card = document.createElement('figure');
        const image = document.createElement('img');

        card.className = 'mugshot-card';
        image.style.setProperty('--mugshot-focus', focusPoints[Math.floor(Math.random() * focusPoints.length)]);
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
