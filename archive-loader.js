/* Real page essentials: parsed DOM, masthead image, and document fonts when supported. */
(() => {
  'use strict';
  const loader = document.getElementById('page-loader');
  if (!loader) return;
  const preview = new URLSearchParams(location.search).get('previewLoader') === '1';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const motion = loader.querySelector('[data-loader-motion]');
  const status = loader.querySelector('[data-loader-status]');
  const tasks = new Map([['dom', 'pending'], ['masthead', 'pending']]);
  if (document.fonts?.ready) tasks.set('fonts', 'pending');
  const inertState = new Map();
  const previousFocus = document.activeElement;
  const oldOverflow = document.body.style.overflow;
  let still = reduced.matches;
  let closed = false;
  let finished = false;
  let observer;
  let fallback;
  let completionTimer;
  function isolate() {
    for (const element of document.body.children) {
      if (element === loader || /^(SCRIPT|STYLE|LINK)$/.test(element.tagName) || inertState.has(element)) continue;
      inertState.set(element, element.inert);
      element.inert = true;
    }
  }
  function close() {
    if (closed) return;
    closed = true;
    clearTimeout(fallback);
    clearTimeout(completionTimer);
    observer?.disconnect();
    controller.abort();
    document.body.style.overflow = oldOverflow;
    const focusInside = loader.contains(document.activeElement);
    loader.classList.add('is-closing');
    loader.inert = true;
    for (const [element, wasInert] of inertState) element.inert = wasInert;
    inertState.clear();
    if (still) loader.hidden = true;
    else setTimeout(() => { loader.hidden = true; }, 300);
    if (focusInside) {
      const target = previousFocus && previousFocus !== document.body ? previousFocus : document.querySelector('#search-input, header a');
      target?.focus({ preventScroll: true });
    }
  }
  function render() {
    const states = [...tasks.values()];
    const completed = states.filter(state => state !== 'pending').length;
    const percentage = Math.round(completed / tasks.size * 100);
    loader.querySelector('[data-loader-progress]').style.width = percentage + '%';
    loader.querySelector('[data-loader-percent]').textContent = percentage + '%';
    loader.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', String(percentage));
    loader.querySelector('[data-loader-count]').textContent = completed + ' of ' + tasks.size + ' essentials checked';
    if (tasks.get('dom') === 'pending') status.textContent = 'Opening the case files...';
    else if (tasks.get('masthead') === 'pending') status.textContent = 'Loading collection imagery...';
    else if (tasks.get('fonts') === 'pending') status.textContent = 'Preparing the collection...';
    else status.textContent = tasks.get('masthead') === 'failed' ? 'Some imagery unavailable - continuing' : states.includes('failed') ? 'Some essentials unavailable - continuing' : 'Entering Carceral Collections...';
    if (completed === tasks.size && !finished) {
      finished = true;
      clearTimeout(fallback);
      if (!preview) completionTimer = setTimeout(close, still ? 0 : 220);
    }
  }
  function settle(name, failed = false) {
    if (closed || finished || tasks.get(name) !== 'pending') return;
    tasks.set(name, failed ? 'failed' : 'ready');
    render();
  }
  function ready() {
    if (closed) return;
    isolate();
    observer?.disconnect();
    settle('dom');
    const masthead = document.querySelector('.masthead img');
    if (!masthead) settle('masthead', true);
    else {
      masthead.addEventListener('load', () => settle('masthead'), { once: true, signal: controller.signal });
      masthead.addEventListener('error', () => settle('masthead', true), { once: true, signal: controller.signal });
      if (masthead.complete) settle('masthead', masthead.naturalWidth === 0);
    }
    if (tasks.has('fonts')) document.fonts.ready.then(() => settle('fonts'), () => settle('fonts', true));
  }
  function syncMotion() {
    if (reduced.matches) still = true;
    motion.disabled = reduced.matches;
    loader.classList.toggle('is-still', still);
    motion.textContent = reduced.matches ? 'Reduced motion' : still ? 'Motion off' : 'Motion on';
    motion.setAttribute('aria-pressed', String(!still));
  }
  loader.querySelector('[data-loader-skip]').addEventListener('click', close, options);
  loader.addEventListener('keydown', event => {
    if (event.key === 'Escape') close();
    if (event.key === 'Tab') {
      const controls = [...loader.querySelectorAll('button:not([disabled])')];
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }, options);
  motion.addEventListener('click', () => { still = !still; syncMotion(); }, options);
  reduced.addEventListener('change', event => { still = event.matches; syncMotion(); }, options);
  syncMotion();
  render();
  loader.querySelector('[data-loader-preview]').hidden = !preview;
  loader.hidden = false;
  document.body.style.overflow = 'hidden';
  isolate();
  loader.querySelector('[data-loader-skip]').focus({ preventScroll: true });
  // The deadline leaves unresolved tasks unresolved; it never invents completion.
  fallback = setTimeout(() => {
    if (closed || finished) return;
    finished = true;
    status.textContent = 'Some essentials are still loading - continuing';
    loader.dataset.loadResult = 'timeout';
    observer?.disconnect();
    if (!preview) completionTimer = setTimeout(close, 200);
  }, 7500);
  observer = new MutationObserver(isolate);
  observer.observe(document.body, { childList: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true, signal: controller.signal });
  else ready();
})();
