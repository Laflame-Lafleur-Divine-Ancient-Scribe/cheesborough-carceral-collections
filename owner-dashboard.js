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

  let selectedMember = null;

  function memberName(member) {
    return text(member.displayName || member.username || member.name || 'Unnamed member');
  }

  function memberRole(member) {
    const role = text(member.role || 'member').toLowerCase();
    return ['member', 'moderator', 'admin'].includes(role) ? role : 'member';
  }

  function memberStatus(member) {
    const status = text(member.status || member.accountStatus || 'active').toLowerCase();
    return ['active', 'suspended', 'banned'].includes(status) ? status : 'active';
  }

  function setMemberDetail(member) {
    const detail = byId('owner-member-detail');
    const empty = byId('owner-member-empty');
    const updateStatus = byId('owner-member-update-status');
    selectedMember = member || null;
    if (!member) { detail.hidden = true; empty.hidden = false; return; }
    empty.hidden = true; detail.hidden = false;
    byId('owner-member-id').value = text(member.id);
    byId('owner-member-detail-heading').textContent = memberName(member);
    byId('owner-member-handle').textContent = member.username ? `@${member.username}` : 'No public username';
    byId('owner-member-email').textContent = member.email || 'No email address recorded';
    byId('owner-member-role').value = memberRole(member);
    byId('owner-member-state').value = memberStatus(member);
    byId('owner-member-reason').value = '';
    updateStatus.textContent = '';
    detail.focus({ preventScroll: true });
  }

  function renderMembers(payload) {
    const result = byId('owner-member-results');
    const members = Array.isArray(payload) ? payload : (payload.members || payload.results || []);
    const emptyRow = (message) => {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 4;
      cell.className = 'owner-table-empty';
      cell.textContent = message;
      row.append(cell);
      result.replaceChildren(row);
    };
    if (!members.length) {
      emptyRow('No matching member records were found.');
      setMemberDetail(null);
      return;
    }
    const fragment = document.createDocumentFragment();
    members.forEach((member) => {
      const row = document.createElement('tr');
      const memberCell = document.createElement('td');
      const name = document.createElement('strong');
      name.textContent = memberName(member);
      memberCell.append(name);
      if (member.username) {
        memberCell.append(document.createElement('br'));
        const handle = document.createElement('small');
        handle.textContent = `@${text(member.username)}`;
        memberCell.append(handle);
      }
      const roleCell = document.createElement('td');
      roleCell.textContent = memberRole(member);
      const statusCell = document.createElement('td');
      statusCell.textContent = memberStatus(member);
      const actionCell = document.createElement('td');
      const choose = document.createElement('button');
      choose.type = 'button';
      choose.textContent = 'Select';
      choose.addEventListener('click', () => setMemberDetail(member));
      actionCell.append(choose);
      row.append(memberCell, roleCell, statusCell, actionCell);
      fragment.append(row);
    });
    result.replaceChildren(fragment);
  }

  async function searchMembers(event) {
    event?.preventDefault();
    const status = byId('owner-member-status');
    const query = byId('owner-member-query').value.trim();
    const submit = document.querySelector('#owner-member-search button');
    status.textContent = 'Searching the member record…';
    submit.disabled = true;
    try {
      const payload = await window.CCCCommunity.request(`/api/owner/members?q=${encodeURIComponent(query)}`);
      renderMembers(payload);
      const members = Array.isArray(payload) ? payload : (payload.members || payload.results || []);
      status.textContent = members.length ? `${members.length} member record${members.length === 1 ? '' : 's'} found.` : 'No matching member records were found.';
    } catch (error) {
      status.textContent = `Member records are temporarily unavailable. ${error.message || 'Please try again shortly.'}`;
      renderMembers({ members: [] });
      byId('owner-member-results').querySelector('.owner-table-empty').textContent = 'Member records are unavailable.';
    } finally { submit.disabled = false; }
  }

  async function updateMember(event) {
    event.preventDefault();
    if (!selectedMember || !selectedMember.id) return;
    const role = byId('owner-member-role').value;
    const statusValue = byId('owner-member-state').value;
    const reason = byId('owner-member-reason').value.trim();
    const message = byId('owner-member-update-status');
    const confirm = byId('owner-member-confirm');
    if (statusValue !== memberStatus(selectedMember) && !reason) { message.textContent = 'Please record a reason before changing account status.'; byId('owner-member-reason').focus(); return; }
    if (!window.confirm(`Confirm changes to ${memberName(selectedMember)}?`)) return;
    confirm.disabled = true; message.textContent = 'Saving this account action…';
    try {
      const payload = await window.CCCCommunity.request(`/api/owner/members/${encodeURIComponent(selectedMember.id)}`, { method: 'POST', body: JSON.stringify({ role, status: statusValue, reason }) });
      const updated = payload.member || payload.user || { ...selectedMember, role, status: statusValue };
      selectedMember = { ...selectedMember, ...updated };
      setMemberDetail(selectedMember);
      message.textContent = 'Account action recorded.';
      searchMembers();
    } catch (error) { message.textContent = `This account action could not be saved. ${error.message || 'Please try again shortly.'}`; }
    finally { confirm.disabled = false; }
  }

  async function boot() {
    const status = byId('owner-status');
    const root = document.querySelector('.owner-layout');
    const user = await window.CCCCommunity.restoreSession();
    if (!user || user.role !== 'owner') { location.replace('PROFILE.html'); return; }
    byId('owner-logout').addEventListener('click', () => window.CCCCommunity.logout());
    byId('owner-member-search').addEventListener('submit', searchMembers);
    byId('owner-member-update').addEventListener('submit', updateMember);
    searchMembers();
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
