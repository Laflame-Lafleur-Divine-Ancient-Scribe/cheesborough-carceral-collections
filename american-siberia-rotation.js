(function () {
  const ROTATION_INTERVAL = 16 * 60 * 60 * 1000;
  const images = [
    '01_Photos/interpreted/Live Oak Railroad Convict Procession, 1876_interpreted.png',
    '01_Photos/interpreted/Camp Padlock 1877_interpreted.png'
  ];
  const hero = document.querySelector('.prison-hero-image');

  if (!hero) return;

  function applyImage() {
    const slot = Math.floor(Date.now() / ROTATION_INTERVAL) % images.length;
    hero.style.backgroundImage = `url("${encodeURI(images[slot])}")`;
    hero.dataset.rotationSlot = String(slot);
  }

  function scheduleNextRotation() {
    const delay = ROTATION_INTERVAL - (Date.now() % ROTATION_INTERVAL) + 100;
    window.setTimeout(() => {
      applyImage();
      scheduleNextRotation();
    }, delay);
  }

  applyImage();
  scheduleNextRotation();
})();
