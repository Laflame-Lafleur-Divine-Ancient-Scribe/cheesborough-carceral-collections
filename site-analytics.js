(() => {
  const apiBase = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)
    ? ''
    : 'https://serviceapi-production-f574.up.railway.app';
  const storageKey = 'cheesborough-anonymous-visitor';
  let visitor = '';
  try {
    visitor = localStorage.getItem(storageKey) || '';
    if (!visitor) {
      visitor = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(storageKey, visitor);
    }
  } catch (_) {
    visitor = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
  const params = new URLSearchParams({ page: window.location.pathname || '/', visitor });
  const endpoint = `${apiBase}/api/analytics/collect?${params}`;
  try {
    if (navigator.sendBeacon) navigator.sendBeacon(endpoint, '');
    else fetch(endpoint, { method: 'POST', mode: 'cors', keepalive: true }).catch(() => {});
  } catch (_) {}
})();
