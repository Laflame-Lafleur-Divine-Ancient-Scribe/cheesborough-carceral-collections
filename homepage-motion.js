/* Visible by default. Animate only when a section is already on screen. */
(() => {
  'use strict';
  if (!document.body.classList.contains('homepage-heroes')) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)');
  if (reduced.matches || coarse.matches || typeof IntersectionObserver !== 'function') return;
  const active = new Map();
  let observer;
  function stop() {
    observer?.disconnect();
    active.forEach(animation => { try { animation.cancel(); } catch (_) {} });
    active.clear();
  }
  try {
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target;
        observer.unobserve(element);
        if (reduced.matches || coarse.matches || element.contains(document.activeElement) || typeof element.animate !== 'function') continue;
        try {
          const animation = element.animate([{ transform: 'translateY(10px)', opacity: .88 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 230, easing: 'ease-out', fill: 'none' });
          active.set(element, animation);
          animation.onfinish = () => active.delete(element);
          animation.oncancel = () => active.delete(element);
        } catch (_) { /* The unchanged, visible layout is the fallback. */ }
      }
    }, { threshold: .12 });
    document.querySelectorAll('.mh-home-feature, .feature-story, .mini-story, .archive-box, .trial-card, .topic-card, .explore-card, .prison-hero-copy, .games-promo-copy').forEach(element => observer.observe(element));
    document.addEventListener('focusin', event => { active.forEach((animation, element) => { if (element.contains(event.target)) { animation.cancel(); active.delete(element); } }); });
    reduced.addEventListener('change', event => { if (event.matches) stop(); });
    coarse.addEventListener('change', event => { if (event.matches) stop(); });
    addEventListener('pagehide', stop, { once: true });
  } catch (_) { stop(); }
})();
