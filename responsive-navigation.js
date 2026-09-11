/**
 * Cheesborough Carceral Collections - Responsive Navigation & Mobile Controller
 * Provides compact mobile header, horizontal quick-scroll pill track, and accessible drawer.
 */
(function () {
  'use strict';

  const NAV_ITEMS = [
    { href: 'index.html', label: 'Home', badge: 'Archive' },
    { href: 'SEARCH.html', label: 'Search', badge: 'Desk' },
    { href: 'COLLECTIONS.html', label: 'Collections', badge: 'Series' },
    { href: 'RESEARCH.html', label: 'Paperwork', badge: '50 Cases' },
    { href: 'LAW-LIBRARY.html', label: 'Law Library', badge: '14 Treatises' },
    { href: 'NEWS.html', label: 'News', badge: 'Dispatches' },
    { href: 'EVIDENCE-INDEX.html', label: 'Evidence Index', badge: 'Dockets' },
    { href: 'ABOUT.html', label: 'About', badge: 'Mission' },
    { href: 'DONATE.html', label: 'Donate', badge: 'Support' },
    { href: 'CONTACT.html', label: 'Contact', badge: 'Inquiries' }
  ];

  function initMobileNav() {
    if (document.querySelector('.ccc-mobile-nav-bar')) return;

    // Determine current active page
    let currentPath = window.location.pathname.split('/').pop() || 'index.html';
    if (!currentPath || currentPath === '') currentPath = 'index.html';

    // 1. Build Mobile Header Bar
    const bar = document.createElement('div');
    bar.className = 'ccc-mobile-nav-bar';
    bar.innerHTML = `
      <a href="index.html" class="ccc-mobile-brand" aria-label="Cheesborough Carceral Collections Home">
        <span class="ccc-brand-crest" aria-hidden="true">CC</span>
        <span class="ccc-brand-text">Carceral Collections</span>
      </a>
      <button type="button" class="ccc-mobile-toggle" aria-expanded="false" aria-controls="ccc-mobile-drawer" aria-label="Toggle navigation menu">
        <span class="ccc-toggle-icon" aria-hidden="true">
          <span></span><span></span><span></span>
        </span>
        <span class="ccc-toggle-label">Menu</span>
      </button>
    `;

    // 2. Build Horizontal Quick-Scroll Pill Strip
    const quickTrack = document.createElement('div');
    quickTrack.className = 'ccc-quick-scroll-track';
    quickTrack.setAttribute('role', 'navigation');
    quickTrack.setAttribute('aria-label', 'Quick section navigation');

    NAV_ITEMS.forEach(item => {
      const pill = document.createElement('a');
      pill.href = item.href;
      pill.className = 'ccc-quick-pill';
      pill.textContent = item.label;
      if (item.href.toLowerCase() === currentPath.toLowerCase()) {
        pill.classList.add('active');
        pill.setAttribute('aria-current', 'page');
      }
      quickTrack.appendChild(pill);
    });

    // 3. Build Mobile Drawer
    const drawer = document.createElement('div');
    drawer.id = 'ccc-mobile-drawer';
    drawer.className = 'ccc-mobile-drawer';
    drawer.setAttribute('aria-hidden', 'true');

    let linksHtml = '';
    NAV_ITEMS.forEach(item => {
      const isActive = item.href.toLowerCase() === currentPath.toLowerCase();
      linksHtml += `
        <a href="${item.href}" class="ccc-drawer-link${isActive ? ' active' : ''}" ${isActive ? 'aria-current="page"' : ''}>
          <span>${item.label}</span>
          <span class="ccc-link-badge">${item.badge}</span>
        </a>
      `;
    });

    drawer.innerHTML = `
      <div class="ccc-drawer-inner" role="dialog" aria-modal="true" aria-label="Archive Navigation Menu">
        <div class="ccc-drawer-header">
          <span class="ccc-drawer-title">Archive Navigation</span>
          <button type="button" class="ccc-drawer-close" aria-label="Close navigation menu">&times;</button>
        </div>
        <nav class="ccc-drawer-links" aria-label="Mobile destinations">
          ${linksHtml}
        </nav>
        <div class="ccc-drawer-footer">
          <a href="MEMBERS.html" class="ccc-footer-reading">Reading Room &rarr;</a>
          <a href="LOGIN.html?returnTo=${encodeURIComponent(location.pathname + location.search)}" class="ccc-footer-signin" data-mobile-account-link>Sign In / Account</a>
        </div>
      </div>
    `;

    // Insertion point: immediately before the existing header/topbar or top of body
    const targetAnchor = document.querySelector('.topbar, .pw-header, header, .site-head') || document.body.firstChild;
    if (targetAnchor && targetAnchor.parentNode) {
      targetAnchor.parentNode.insertBefore(bar, targetAnchor);
      bar.after(quickTrack);
    } else {
      document.body.prepend(quickTrack);
      document.body.prepend(bar);
    }
    document.body.appendChild(drawer);

    // Scroll active pill into view smoothly
    const activePill = quickTrack.querySelector('.ccc-quick-pill.active');
    if (activePill) {
      setTimeout(() => {
        activePill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }, 150);
    }

    // Event listeners for toggle & drawer
    const toggleBtn = bar.querySelector('.ccc-mobile-toggle');
    const closeBtn = drawer.querySelector('.ccc-drawer-close');

    function openDrawer() {
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      toggleBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }

    function closeDrawer() {
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      toggleBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      toggleBtn.focus();
    }

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = drawer.classList.contains('is-open');
      if (isOpen) closeDrawer();
      else openDrawer();
    });

    closeBtn.addEventListener('click', closeDrawer);

    // Close when clicking outside inner drawer
    drawer.addEventListener('click', (e) => {
      if (e.target === drawer) closeDrawer();
    });

    // Keyboard support: Escape closes drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        closeDrawer();
      }
    });

    // Close on clicking any navigation link inside drawer
    drawer.querySelectorAll('.ccc-drawer-link').forEach(link => {
      link.addEventListener('click', () => {
        closeDrawer();
      });
    });

    // Sync with community-auth if available
    function syncAccountState() {
      const user = window.CCCCommunity?.user;
      const accountLink = drawer.querySelector('[data-mobile-account-link]');
      if (!accountLink) return;
      if (user) {
        accountLink.href = 'PROFILE.html';
        accountLink.textContent = `Profile (${user.displayName || 'Member'})`;
      } else {
        accountLink.href = `LOGIN.html?returnTo=${encodeURIComponent(location.pathname + location.search)}`;
        accountLink.textContent = 'Sign In / Account';
      }
    }
    syncAccountState();
    window.addEventListener('ccc:auth', syncAccountState);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileNav);
  } else {
    initMobileNav();
  }
})();

