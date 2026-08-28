(() => {
  const apiBase = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? '' : 'https://api.carceralcollections.org';
  const loginMugshots = [
    'mugshot-white-woman-club-20s-07.png', 'mugshot-white-woman-club-20s-09.png', 'mugshot-white-woman-club-20s-10.png',
    'mugshot-black-man-05.png', 'mugshot-black-man-06.png', 'mugshot-black-man-07.png',
    'mugshot-black-woman-01.png', 'mugshot-black-woman-02.png', 'mugshot-black-woman-03.png', 'mugshot-black-woman-05.png',
    'mugshot-white-man-17.png', 'mugshot-white-man-18.png',
    'mugshot-white-woman-13.png', 'mugshot-white-woman-14.png', 'mugshot-white-woman-15.png',
    'mugshot-white-woman-17.png', 'mugshot-white-woman-18.png', 'mugshot-white-woman-19.png',
    'mugshot-white-woman-club-20s-01.png', 'mugshot-white-woman-club-20s-02.png', 'mugshot-white-woman-club-20s-03.png',
    'mugshot-white-woman-club-20s-05.png', 'mugshot-white-woman-club-20s-06.png',
  ];

  const safeReturnTo = (value) => /^\/[\w./?=&%-]*$/.test(value || '') && !value.startsWith('//') ? value : '/VIDEOS.html';

  function selectLoginMugshot() {
    const panel = document.querySelector('.auth-archive');
    if (!panel) return;
    const image = loginMugshots[Math.floor(Math.random() * loginMugshots.length)];
    panel.style.setProperty('--auth-mugshot', `url("01_Photos/Illustrations/${image}")`);
  }

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

  function renderFloatingAvatar(user) {
    document.querySelectorAll('[data-community-avatar-fixed]').forEach((node) => node.remove());
    if (!user || document.body.classList.contains('community-auth-page')) return;
    const link = document.createElement('a');
    link.className = 'community-avatar-fixed';
    link.dataset.communityAvatarFixed = 'true';
    link.href = 'PROFILE.html';
    link.title = `${user.displayName}: open profile`;
    link.setAttribute('aria-label', `${user.displayName}: open profile`);
    const fallback = document.createElement('span');
    fallback.className = 'community-avatar-initials';
    fallback.textContent = initials(user.displayName);
    const src = avatarUrl(user);
    if (src) {
      const image = document.createElement('img');
      image.src = src;
      image.alt = '';
      image.onload = () => fallback.hidden = true;
      image.onerror = () => { image.remove(); fallback.hidden = false; };
      link.append(image);
    }
    link.append(fallback);
    document.body.append(link);
  }

  function renderNav(user) {
    document.querySelectorAll('[data-community-account]').forEach((slot) => {
      slot.textContent = '';
      if (user) {
        const name = document.createElement('span');
        name.className = 'account-chip';
        name.textContent = user.displayName;
        const button = document.createElement('button');
        button.className = 'account-logout';
        button.type = 'button';
        button.textContent = 'Sign out';
        button.onclick = logout;
        slot.append(name, button);
      } else {
        const link = document.createElement('a');
        link.className = 'account-link';
        link.href = `LOGIN.html?returnTo=${encodeURIComponent(location.pathname + location.search)}`;
        link.textContent = 'Sign in to comment';
        slot.append(link);
      }
    });
    renderFloatingAvatar(user);
  }

  window.CCCCommunity = { request, restoreSession, submitAccount, logout, safeReturnTo, renderNav, avatarUrl, initials };
  document.addEventListener('DOMContentLoaded', () => {
    selectLoginMugshot();
    restoreSession();
  });
})();
