(() => {
  const endpoint = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)
    ? '/api/site-theme'
    : 'https://serviceapi-production-f574.up.railway.app/api/site-theme';
  const fallback = {
    navy: '#102c4c', deep: '#091e36', gold: '#c29b53', paper: '#f5f2eb',
    red: '#8f3d32', ink: '#202020',
    display: 'Georgia, Times New Roman, serif', ui: 'system-ui, -apple-system, Segoe UI, sans-serif',
  };
  const colorKeys = ['navy', 'deep', 'gold', 'paper', 'red', 'ink'];
  const isColor = (value) => /^#[0-9a-f]{6}$/i.test(String(value || ''));
  const isFont = (value) => /^[a-zA-Z0-9 ,"'_-]{1,120}$/.test(String(value || ''));
  const apply = (raw) => {
    const theme = raw && typeof raw === 'object' ? raw : {};
    colorKeys.forEach((key) => document.documentElement.style.setProperty(`--${key}`, isColor(theme[key]) ? theme[key] : fallback[key]));
    ['display', 'ui'].forEach((key) => document.documentElement.style.setProperty(`--${key}`, isFont(theme[key]) ? theme[key] : fallback[key]));
  };
  fetch(endpoint, { mode: 'cors', cache: 'no-store' })
    .then((response) => response.status === 204 ? null : response.ok ? response.json() : null)
    .then((data) => { if (data && data.theme) apply(data.theme); })
    .catch(() => {});
})();
