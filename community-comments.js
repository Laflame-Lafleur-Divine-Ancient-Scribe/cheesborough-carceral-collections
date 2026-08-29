async function initializeCommunityDiscussion() {
  if (document.body.dataset.communityDiscussion !== 'article') return;
  const article = document.querySelector('main article, article');
  if (!article || document.querySelector('#community-discussion')) return;

  const id = location.pathname.split('/').pop().replace(/\.html$/i, '').toLowerCase();
  const section = document.createElement('section');
  section.id = 'community-discussion';
  section.className = 'community-discussion';
  section.setAttribute('aria-label', 'Community discussion');
  section.innerHTML = '<p class="community-discussion-kicker">Community discussion</p><h2>Community conversation</h2><p class="community-discussion-intro">Published comments are visible to every reader. Signed-in members can join the conversation below.</p><div class="community-comment-list" aria-live="polite"><p>Loading comments...</p></div><div class="community-comment-compose"></div>';
  article.append(section);

  const list = section.querySelector('.community-comment-list');
  const compose = section.querySelector('.community-comment-compose');
  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const render = comments => {
    list.innerHTML = comments.length
      ? comments.map(comment => `<article class="community-comment"><p class="community-comment-author">${esc(comment.author.displayName)}</p><p>${esc(comment.body)}</p></article>`).join('')
      : '<p>No published comments yet. Start the conversation below.</p>';
  };

  try {
    const response = await fetch(`https://serviceapi-production-f574.up.railway.app/api/comments?contentType=article&contentId=${encodeURIComponent(id)}`, { credentials: 'include' });
    if (!response.ok) throw new Error('Unable to load comments');
    render((await response.json()).comments || []);
  } catch (_) {
    list.innerHTML = '<p>Comments are temporarily unavailable.</p>';
  }

  const user = await window.CCCCommunity?.restoreSession();
  if (!user) {
    compose.innerHTML = '<a class="community-comment-signin" href="LOGIN.html">Sign in to comment</a>';
    return;
  }

  compose.innerHTML = '<form class="community-comment-form"><label for="community-comment-body">Your comment</label><textarea id="community-comment-body" maxlength="1200" required placeholder="Share a respectful, evidence-based response."></textarea><button type="submit">Post comment</button><p role="status"></p></form>';
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
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeCommunityDiscussion, { once: true });
else initializeCommunityDiscussion();
