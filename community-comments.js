document.addEventListener('DOMContentLoaded', async () => {
  const article = document.querySelector('article.article, article.story');
  if (!article || document.querySelector('#community-discussion')) return;

  const id = location.pathname.split('/').pop().replace(/\.html$/i, '').toLowerCase();
  const section = document.createElement('section');
  section.id = 'community-discussion';
  section.className = 'community-discussion';
  section.innerHTML = '<p class="community-discussion-kicker">Community discussion</p><h2>Discuss this article</h2><p class="community-discussion-intro">Published comments are visible to every reader. Sign in to share a respectful, evidence-based response.</p><div class="community-comment-list" aria-live="polite"><p>Loading discussion...</p></div><div class="community-comment-compose"></div>';
  article.after(section);

  const list = section.querySelector('.community-comment-list');
  const compose = section.querySelector('.community-comment-compose');
  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const render = comments => {
    list.innerHTML = comments.length
      ? comments.map(comment => `<article class="community-comment"><p class="community-comment-author">${esc(comment.author.displayName)}</p><p>${esc(comment.body)}</p></article>`).join('')
      : '<p>No published comments yet. Be the first community member to respond.</p>';
  };

  try {
    const response = await fetch(`https://serviceapi-production-f574.up.railway.app/api/comments?contentType=article&contentId=${encodeURIComponent(id)}`, { credentials: 'include' });
    if (!response.ok) throw new Error('Unable to load comments');
    render((await response.json()).comments || []);
  } catch (_) {
    list.innerHTML = '<p>Discussion is temporarily unavailable.</p>';
  }

  const user = await window.CCCCommunity?.restoreSession();
  if (!user) {
    compose.innerHTML = '<a class="community-comment-signin" href="LOGIN.html">Sign in to comment</a>';
    return;
  }

  compose.innerHTML = '<form class="community-comment-form"><label for="community-comment-body">Your comment</label><textarea id="community-comment-body" maxlength="1200" required placeholder="Share a respectful, evidence-based response."></textarea><button type="submit">Submit comment</button><p role="status"></p></form>';
  compose.querySelector('form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const body = form.querySelector('textarea').value.trim();
    const status = form.querySelector('[role="status"]');
    try {
      const response = await window.CCCCommunity.request('/api/comments', { method: 'POST', body: JSON.stringify({ contentType: 'article', contentId: id, body }) });
      status.textContent = response.message || 'Your comment is awaiting moderation.';
      form.reset();
    } catch (error) {
      status.textContent = error.message || 'Your comment could not be submitted.';
    }
  });
});
