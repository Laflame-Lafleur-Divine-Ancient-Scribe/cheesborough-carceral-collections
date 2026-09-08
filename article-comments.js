(() => {
  document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('[data-community-comments]').forEach((slot) => {
    const id = slot.dataset.resourceId;
    if (!id || !window.CCCCommunity) return;
    slot.className = 'community-discussion';
    slot.setAttribute('aria-label', 'Community discussion');
    slot.innerHTML = '<p class="community-discussion-kicker">Community discussion</p><h2>Community conversation</h2><p class="community-discussion-intro">Published comments are visible to every reader. Signed-in members can join the conversation below.</p><div class="community-comment-list" aria-live="polite"><p>Loading comments...</p></div><div class="community-comment-compose"></div>';
    const list = slot.querySelector('.community-comment-list');
    const compose = slot.querySelector('.community-comment-compose');
    if (slot.dataset.commentTitle) slot.querySelector('h2').textContent = slot.dataset.commentTitle;
    const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
    const render = (comments) => {
      list.innerHTML = comments.length
        ? comments.map((comment) => `<article class="community-comment"><p class="community-comment-author">${escapeHtml(comment.author?.displayName || 'Community member')}</p><p>${escapeHtml(comment.body)}</p></article>`).join('')
        : '<p>No published comments yet. Start the conversation below.</p>';
    };
    const load = async () => {
      try {
        const response = await window.CCCCommunity.request(`/api/comments?contentType=article&contentId=${encodeURIComponent(id)}`);
        render(response.comments || []);
      } catch (error) { list.innerHTML = `<p>${escapeHtml(error.message || 'Comments are temporarily unavailable.')}</p>`; }
    };
    window.CCCCommunity.restoreSession().then((user) => {
      if (!user) {
        compose.innerHTML = `<a class="community-comment-signin" href="LOGIN.html?returnTo=${encodeURIComponent(location.pathname + location.search)}">Sign in to comment</a>`;
        return;
      }
      compose.innerHTML = '<form class="community-comment-form"><label for="community-comment-body">Your comment</label><textarea id="community-comment-body" maxlength="1200" required placeholder="Share a respectful, evidence-based response."></textarea><button type="submit">Post comment</button><p role="status"></p></form>';
      const textarea = compose.querySelector('textarea');
      textarea.minLength = 2;
      if (slot.dataset.commentPlaceholder) textarea.placeholder = slot.dataset.commentPlaceholder;
      compose.querySelector('form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget, body = form.querySelector('textarea').value.trim(), status = form.querySelector('[role="status"]');
        if (body.length < 2) { status.textContent = 'Please write at least two characters.'; return; }
        const submit = form.querySelector('button[type="submit"]');
        if (submit.disabled) return;
        submit.disabled = true;
        submit.textContent = 'Submitting...';
        try {
          const response = await window.CCCCommunity.request('/api/comments', { method: 'POST', body: JSON.stringify({ contentType: 'article', contentId: id, body }) });
          status.textContent = response.message || 'Your comment is awaiting moderation.';
          form.reset();
          load();
        } catch (error) { status.textContent = error.message || 'Your comment could not be submitted.'; }
        finally { submit.disabled = false; submit.textContent = 'Post comment'; }
      });
    });
    window.CCCCommunity.renderNav();
    load();
  }));
})();
