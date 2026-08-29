(() => {
  const byId = (id) => document.getElementById(id);
  const fieldNames = ['members', 'activeToday', 'newThisWeek', 'comments', 'pendingComments', 'pageViews'];
  const number = (value) => Number.isFinite(Number(value)) ? Number(value).toLocaleString() : '\u2014';
  const text = (value) => String(value == null ? '' : value);
  const escape = (value) => text(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  function renderStats(overview) {
    const stats = overview.stats || overview;
    fieldNames.forEach((name) => {
      const target = document.querySelector(`[data-stat="${name}"]`);
      if (target) target.textContent = number(stats[name]);
    });
  }

  function renderPopular(items) {
    const list = byId('owner-popular-content');
    if (!list) return;
    if (!Array.isArray(items) || !items.length) { list.innerHTML = '<li class="owner-empty">No public content activity is available yet.</li>'; return; }
    list.innerHTML = items.slice(0, 8).map((item) => {
      const title = escape(item.title || item.name || item.slug || 'Untitled item');
      const href = text(item.url || item.href || '#');
      const views = number(item.views ?? item.pageViews ?? item.count);
      return `<li><a href="${escape(href)}">${title}</a><small>${views === '\u2014' ? 'No count' : `${views} views`}</small></li>`;
    }).join('');
  }

  function renderActivity(items) {
    const list = byId('owner-activity-list');
    if (!list) return;
    if (!Array.isArray(items) || !items.length) { list.innerHTML = '<li class="owner-empty">No activity summary is available yet.</li>'; return; }
    list.innerHTML = items.slice(0, 8).map((item) => `<li>${escape(item.summary || item.message || item.label || item)}</li>`).join('');
  }

  async function boot() {
    const status = byId('owner-status');
    const root = document.querySelector('.owner-layout');
    const user = await window.CCCCommunity.restoreSession();
    if (!user || user.role !== 'owner') { location.replace('PROFILE.html'); return; }
    byId('owner-logout').addEventListener('click', () => window.CCCCommunity.logout());
    try {
      const overview = await window.CCCCommunity.request('/api/owner/overview');
      const data = overview.overview || overview;
      renderStats(data);
      renderPopular(data.popularContent || data.popular || data.content);
      renderActivity((data.recentOwnerActivity || data.activity || data.recentActivity || []).map((item) => ({ summary: item.summary || item.event || item })));
      status.textContent = 'Owner record loaded.';
    } catch (error) {
      status.textContent = `The owner record is temporarily unavailable. ${error.message || 'Please try again shortly.'}`;
      renderPopular([]); renderActivity([]);
    } finally { root.setAttribute('aria-busy', 'false'); }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
