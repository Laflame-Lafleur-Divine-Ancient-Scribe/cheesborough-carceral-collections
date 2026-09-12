document.addEventListener('DOMContentLoaded', async () => {
  const community = window.CCCCommunity, status = document.querySelector('#profile-status'), form = document.querySelector('#profile-form');
  const input = document.querySelector('#profile-avatar-input'), image = document.querySelector('#profile-avatar-preview'), fallback = document.querySelector('#profile-avatar-initials'), remove = document.querySelector('#profile-avatar-remove'), avatarHelp = document.querySelector('#profile-avatar-help'), logout = document.querySelector('#profile-logout');
  const interests = ['True Crime', 'Unsolved Cases', 'Cold Cases', 'Prison Stories', 'Gang History', 'Famous Trials', 'Historical Crime', 'Missing Persons', 'Criminal Justice', 'Courtroom Stories', 'Crime Documentaries', 'Forensics', 'Wrongful Convictions', 'Juvenile Justice']; let selectedInterests = [];
  let user = await community.restoreSession(); if (!user) { location.replace('LOGIN.html?returnTo=%2FPROFILE.html'); return; }
  logout?.addEventListener('click', () => community.logout());
  if (user.role === 'owner') { const ownerLink = document.createElement('a'); ownerLink.className = 'profile-owner-dashboard'; ownerLink.href = 'OWNER.html'; ownerLink.textContent = 'Owner dashboard'; logout?.before(ownerLink); }
  avatarHelp.textContent = 'JPG, PNG, or WebP. New uploads crop to fill the circular profile frame.';
  const field = (name) => form.elements.namedItem(name);
  const setAvatar = () => { const source = community.avatarUrl(user); fallback.textContent = community.initials(user.displayName); fallback.hidden = Boolean(source); image.hidden = !source; image.src = source || ''; remove.hidden = !source; remove.disabled = !source; };
  const count = (inputId, outputId) => { document.querySelector(outputId).textContent = document.querySelector(inputId).value.length; };
  const clearErrors = () => form.querySelectorAll('.field-error').forEach((node) => node.remove());
  const showError = (control, message) => { if (!control) return; control.setAttribute('aria-invalid', 'true'); const error = document.createElement('p'); error.className = 'field-error'; error.textContent = message; control.closest('label')?.append(error); };
  form.addEventListener('invalid', (event) => { event.preventDefault(); clearErrors(); const control = event.target; showError(control, control.name === 'username' ? 'Use 3-24 letters, numbers, or underscores for your @handle.' : control.validationMessage); control.focus(); }, true);
  const renderInterests = () => { const host = document.querySelector('#profile-interests'); host.textContent = ''; interests.forEach((interest) => { const button = document.createElement('button'); button.type = 'button'; button.className = 'interest-chip'; button.textContent = interest; button.setAttribute('aria-pressed', String(selectedInterests.includes(interest))); button.addEventListener('click', () => { if (selectedInterests.includes(interest)) selectedInterests = selectedInterests.filter((item) => item !== interest); else if (selectedInterests.length < 10) selectedInterests.push(interest); else { status.textContent = 'Choose up to 10 interests.'; return; } renderInterests(); }); host.append(button); }); };
  const addFavorite = (value = '') => { const row = document.createElement('div'); row.className = 'favorite-row'; const item = document.createElement('input'); item.type = 'text'; item.maxLength = 80; item.value = value; item.placeholder = 'Case or story title'; item.setAttribute('aria-label', 'Favorite case or story'); const deleteButton = document.createElement('button'); deleteButton.type = 'button'; deleteButton.className = 'favorite-remove'; deleteButton.textContent = 'Remove'; deleteButton.addEventListener('click', () => row.remove()); row.append(item, deleteButton); document.querySelector('#profile-favorites').append(row); };
  document.querySelector('#profile-display-name').textContent = user.displayName; document.querySelector('#profile-email').textContent = 'Your email address is private.'; field('displayName').value = user.displayName; setAvatar(); renderInterests();
  [['#profile-about', '#profile-about-count'], ['#profile-now', '#profile-now-count']].forEach(([source, output]) => document.querySelector(source).addEventListener('input', () => count(source, output)));
  document.querySelector('#profile-add-favorite').addEventListener('click', () => document.querySelectorAll('.favorite-row').length < 10 ? addFavorite() : status.textContent = 'You can save up to 10 favorites.');
  try { const profile = (await community.request('/api/auth/profile')).profile || {}; Object.entries(profile).forEach(([key, value]) => { const control = field(key); if (control && typeof value === 'string') control.value = value; }); selectedInterests = Array.isArray(profile.interests) ? profile.interests.filter((item) => interests.includes(item)).slice(0, 10) : []; (profile.favorites || []).slice(0, 10).forEach(addFavorite); renderInterests(); count('#profile-about', '#profile-about-count'); count('#profile-now', '#profile-now-count'); } catch { status.textContent = 'Your profile details could not load yet. You can still update them.'; }
  const resizeImage = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(Error('The selected image could not be read.')); reader.onload = () => { const photo = new Image(); photo.onerror = () => reject(Error('The selected file is not a supported image.')); photo.onload = () => { const shortestSide = Math.min(photo.naturalWidth, photo.naturalHeight), canvasSize = Math.min(800, shortestSide), scale = canvasSize / shortestSide, width = Math.max(1, Math.round(photo.naturalWidth * scale)), height = Math.max(1, Math.round(photo.naturalHeight * scale)), canvas = document.createElement('canvas'), context = canvas.getContext('2d'); canvas.width = canvasSize; canvas.height = canvasSize; context.drawImage(photo, Math.round((canvasSize - width) / 2), Math.round((canvasSize - height) / 2), width, height); resolve(canvas.toDataURL('image/jpeg', 0.88)); }; photo.src = reader.result; }; reader.readAsDataURL(file); });
  input.addEventListener('change', async () => { const file = input.files?.[0]; if (!file) return; if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) { status.textContent = 'Choose a JPG, PNG, or WebP image smaller than 12 MB.'; input.value = ''; return; } status.textContent = 'Preparing your profile photo...'; try { const payload = await community.request('/api/auth/avatar', { method: 'POST', body: JSON.stringify({ imageData: await resizeImage(file) }) }); user = { ...user, avatarUpdatedAt: payload.avatarUpdatedAt }; setAvatar(); community.renderNav(user); status.textContent = 'Your profile photo has been saved.'; } catch (error) { status.textContent = error.message; } input.value = ''; });
  remove.addEventListener('click', async () => { remove.disabled = true; try { await community.request('/api/auth/avatar', { method: 'DELETE' }); user = { ...user, avatarUpdatedAt: null }; setAvatar(); community.renderNav(user); status.textContent = 'Your profile photo has been removed.'; } catch (error) { status.textContent = error.message; } remove.disabled = false; });
  form.addEventListener('submit', async (event) => { event.preventDefault(); clearErrors(); form.querySelectorAll('[aria-invalid]').forEach((node) => node.removeAttribute('aria-invalid')); const data = Object.fromEntries(new FormData(form)); data.interests = selectedInterests; data.favorites = [...document.querySelectorAll('.favorite-row input')].map((node) => node.value.trim()).filter(Boolean); status.textContent = 'Saving your profile...'; try { const payload = await community.request('/api/auth/profile', { method: 'PUT', body: JSON.stringify(data) }); user = { ...user, displayName: payload.user.displayName }; document.querySelector('#profile-display-name').textContent = user.displayName; setAvatar(); community.renderNav(user); status.textContent = 'Your profile has been saved.'; } catch (error) { const message = error.message || 'Your profile could not be saved.'; const control = /display name/i.test(message) ? field('displayName') : /username/i.test(message) ? field('username') : /links|http/i.test(message) ? form.querySelector('input[type="url"]:invalid') || form.querySelector('input[type="url"]') : null; if (control) { showError(control, message); control.focus(); } status.textContent = message; } });

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  async function loadMyResearchInquiries() {
    const host = document.querySelector('#my-research-inquiries-list');
    if (!host) return;
    try {
      const res = await community.request('/api/research-help/my-inquiries');
      const list = res.inquiries || [];
      if (!list.length) {
        host.innerHTML = `
          <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;padding:2rem 1.5rem;text-align:center;">
            <p style="margin:0 0 0.5rem 0;color:#475569;font-size:0.95rem;">You have not submitted any research help inquiries yet.</p>
            <p style="margin:0;"><a href="HELP-FINDER.html" style="color:#081d35;font-weight:600;text-decoration:underline;">Submit your first research request &rarr;</a></p>
          </div>
        `;
        return;
      }

      const statusBadges = {
        new: ['#2563eb', 'Received / New'],
        under_review: ['#7c3aed', 'Under Review'],
        researching: ['#d97706', 'Researching'],
        waiting_for_info: ['#b45309', 'Waiting for Info'],
        documents_located: ['#059669', 'Documents Located'],
        response_prepared: ['#0d9488', 'Response Prepared'],
        completed: ['#16a34a', 'Completed'],
        unable_to_assist: ['#64748b', 'Unable to Assist'],
        archived: ['#475569', 'Archived']
      };

      host.innerHTML = list.map(item => {
        const badge = statusBadges[item.status] || ['#475569', item.status || 'Active'];
        const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
        const cats = Array.isArray(item.categories) ? item.categories.join(', ') : '';

        return `
          <article style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:1.25rem;margin-bottom:1rem;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;">
              <div>
                <span style="font-family:monospace;font-weight:700;font-size:0.92rem;color:#081d35;letter-spacing:0.02em;">${esc(item.requestId)}</span>
                <span style="display:inline-block;margin-left:0.5rem;padding:0.2rem 0.55rem;background:${badge[0]};color:#ffffff;border-radius:4px;font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.03em;">${esc(badge[1])}</span>
              </div>
              <time style="font-size:0.85rem;color:#64748b;">Submitted ${esc(dateStr)}</time>
            </div>
            <h3 style="font-family:'Libre Baskerville',serif;font-size:1.15rem;margin:0 0 0.35rem 0;color:#081d35;">
              Inmate: ${esc(item.inmateName || 'Name not specified')}${item.inmateNumber ? ` (${esc(item.inmateNumber)})` : ''}
            </h3>
            <p style="font-size:0.9rem;color:#475569;margin:0 0 0.5rem 0;">
              ${esc([item.facility, item.state].filter(Boolean).join(' • ') || 'Jurisdiction pending')}
            </p>
            ${cats ? `<p style="font-size:0.85rem;color:#64748b;margin:0 0 0.75rem 0;"><strong>Areas:</strong> ${esc(cats)}</p>` : ''}
            ${item.responseNotes ? `
              <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:0.85rem 1rem;border-radius:4px;margin-top:0.75rem;">
                <h4 style="margin:0 0 0.25rem 0;font-size:0.8rem;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.04em;">Staff Research Findings &amp; Response</h4>
                <p style="margin:0;font-size:0.92rem;color:#14532d;white-space:pre-wrap;line-height:1.5;">${esc(item.responseNotes)}</p>
              </div>
            ` : `
              <p style="margin:0.75rem 0 0 0;font-size:0.85rem;color:#64748b;font-style:italic;">Staff research is in progress. Findings and updates will appear here.</p>
            `}
            ${item.outcome ? `<p style="margin:0.5rem 0 0 0;font-size:0.85rem;color:#1e293b;"><strong>Outcome:</strong> ${esc(item.outcome)}</p>` : ''}
          </article>
        `;
      }).join('');
    } catch (err) {
      host.innerHTML = `<p style="color:#dc2626;font-size:0.9rem;">Unable to load your research requests at this time: ${esc(err.message)}</p>`;
    }
  }
  loadMyResearchInquiries();
});
