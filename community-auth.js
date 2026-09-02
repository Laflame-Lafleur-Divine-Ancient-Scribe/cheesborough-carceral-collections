(() => {
  const apiBase = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? '' : 'https://serviceapi-production-f574.up.railway.app';
  const safeReturnTo = (value) => /^\/[\w./?=&%-]*$/.test(value || '') && !value.startsWith('//') ? value : '/VIDEOS.html';

  async function request(route, options = {}) {
    let response;
    try {
      response = await fetch(apiBase + route, {
        ...options,
        credentials: 'include',
        headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
      });
    } catch {
      throw Error('The community service is unavailable. Please try again shortly.');
    }
    const payload = response.status === 204 ? {} : await response.json().catch(() => ({}));
    if (!response.ok) throw Error(payload.error || 'Something went wrong.');
    return payload;
  }

  async function restoreSession() {
    try {
      const payload = await request('/api/auth/me');
      renderNav(payload.user);
      return payload.user;
    } catch {
      renderNav(null);
      return null;
    }
  }

  async function submitAccount(mode, values) {
    const payload = await request(mode === 'create' ? '/api/auth/register' : '/api/auth/login', {
      method: 'POST', body: JSON.stringify(values),
    });
    renderNav(payload.user);
    return payload.user;
  }

  async function logout() {
    await request('/api/auth/logout', { method: 'POST' }).catch(() => {});
    renderNav(null);
    location.assign('LOGIN.html');
  }

  function initials(name) {
    return String(name || 'U').trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
  }

  function avatarUrl(user) {
    return user?.id && user?.avatarUpdatedAt ? `${apiBase}/api/auth/avatar/${encodeURIComponent(user.id)}?v=${encodeURIComponent(user.avatarUpdatedAt)}` : '';
  }

  function ensureNavigationSlot() {
    if (document.body.classList.contains('community-auth-page')) return;
    if (document.querySelector('[data-community-account]')) return;
    let topbar = document.querySelector('.topbar, nav.nav, nav[aria-label="Primary navigation"], nav[aria-label="Main navigation"]');
    if (!topbar) {
      topbar = document.createElement('nav');
      topbar.className = 'topbar community-global-topbar';
      topbar.setAttribute('aria-label', 'Primary navigation');
      topbar.innerHTML = '<a href="ABOUT.html">About</a><a href="SEARCH.html">Search</a><a href="COLLECTIONS.html">Collections</a><a href="RESEARCH.html">Research</a><a href="LAW-LIBRARY.html">Law Library</a><a href="NEWS.html">News</a><a href="VIDEOS.html">CrimeNewsTV</a><a href="CONTACT.html">Contact</a><a href="index.html">Home</a><a href="DONATE.html">Donate</a>';
      const anchor = document.querySelector('.site-masthead, .masthead, .site-head, header') || document.body.firstChild;
      anchor.before(topbar);
    }
    const navigation = topbar.matches('nav') ? topbar : topbar.querySelector('nav');
    if (!navigation) return;
    if (!document.querySelector('#community-navigation-style')) {
      const style = document.createElement('style');
      style.id = 'community-navigation-style';
      style.textContent = '.community-global-topbar{align-items:center;background:#081d35;border-bottom:2px solid #bd9448;display:flex;flex-wrap:wrap;gap:0;margin:0;padding:.55rem max(1rem,calc((100vw - 1180px)/2));position:relative;z-index:20}.community-global-topbar>a{border-right:1px solid rgba(255,255,255,.48);color:#fff;font:700 .72rem "Source Sans 3",sans-serif;letter-spacing:.06em;padding:0 .7rem;text-decoration:none;text-transform:uppercase}.community-global-topbar>a:first-child{padding-left:0}.community-global-topbar>a:hover{color:#f1d597}.community-navigation-account{align-items:center;display:flex;flex:0 0 auto;gap:.45rem;margin-left:auto;white-space:nowrap}.community-navigation-account .account-link{background:transparent;border:1px solid rgba(255,255,255,.8);color:#fff;font:700 .72rem "Source Sans 3",sans-serif;letter-spacing:.07em;padding:.38rem .62rem;text-decoration:none;text-transform:uppercase}.community-navigation-account .account-link:hover{background:#fff;color:#081d35}.account-avatar-link{align-items:center;background:#eee6d8;border:2px solid #f1d597;border-radius:50%;color:#081d35;display:flex;flex:0 0 34px;height:34px;justify-content:center;overflow:hidden;position:relative;width:34px}.account-avatar-link>img{display:block!important;height:100%!important;inset:0!important;max-height:none!important;max-width:none!important;min-height:0!important;min-width:0!important;object-fit:cover!important;object-position:center!important;position:absolute!important;width:100%!important}.account-avatar-initials{font:700 .7rem "Source Sans 3",sans-serif}.account-display-name{color:#fff;font:700 .72rem "Source Sans 3",sans-serif;letter-spacing:.04em;max-width:11rem;overflow:hidden;text-overflow:ellipsis}.account-avatar-link:focus-visible,.community-navigation-account .account-link:focus-visible{outline:3px solid #f1d597;outline-offset:3px}@media(max-width:700px){.community-global-topbar{gap:.45rem;padding:.55rem .75rem}.community-global-topbar>a{border:0;padding:0 .38rem}.community-navigation-account{gap:.3rem}.account-display-name{display:none}.community-navigation-account .account-link{padding:.31rem .48rem}}';
      document.head.append(style);
    }
    const slot = document.createElement('span');
    slot.className = 'community-account community-navigation-account';
    slot.dataset.communityAccount = 'true';
    navigation.append(slot);
  }

  function renderNav(user) {
    document.querySelectorAll('[data-community-avatar-fixed], [data-community-login-fixed]').forEach((node) => node.remove());
    ensureNavigationSlot();
    document.querySelectorAll('[data-community-account]').forEach((slot) => {
      slot.textContent = '';
      if (user) {
        const profile = document.createElement('a');
        profile.className = 'account-avatar-link';
        profile.href = 'PROFILE.html';
        profile.title = `${user.displayName}: open profile`;
        profile.setAttribute('aria-label', `${user.displayName}: open profile`);
        const fallback = document.createElement('span');
        fallback.className = 'account-avatar-initials';
        fallback.textContent = initials(user.displayName);
        const src = avatarUrl(user);
        if (src) {
          const image = document.createElement('img');
          image.src = src;
          image.alt = '';
          image.onload = () => fallback.hidden = true;
          image.onerror = () => { image.remove(); fallback.hidden = false; };
          profile.append(image);
        }
        profile.append(fallback);
        const name = document.createElement('span');
        name.className = 'account-display-name';
        name.textContent = user.displayName;
        slot.append(profile, name);
      } else {
        const link = document.createElement('a');
        link.className = 'account-link';
        link.href = `LOGIN.html?returnTo=${encodeURIComponent(location.pathname + location.search)}`;
        link.textContent = 'Sign In';
        slot.append(link);
      }
    });
  }

  window.CCCCommunity = { request, restoreSession, submitAccount, logout, safeReturnTo, renderNav, avatarUrl, initials };
  document.addEventListener('DOMContentLoaded', () => {
    restoreSession();
  });
})();
