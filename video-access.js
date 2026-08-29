document.documentElement.classList.add('video-access-check');

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const user = await window.CCCCommunity?.restoreSession();
    if (user) {
      document.documentElement.classList.remove('video-access-check');
      return;
    }
  } catch (_) {
    // A failed session check is treated as signed out.
  }
  location.replace(`LOGIN.html?returnTo=${encodeURIComponent(location.pathname + location.search)}`);
});
