(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { user: null, table: null, poll: null, busy: false };
  const opponentNames = ['Marcus "Mack" Holloway','Darnell Bishop','Leon "Red" Carter','Terrence Wallace','Calvin "Keys" Mercer','Raymond Givens','Andre "Dre" Collins','Victor Salazar','Luis Mendoza','Hector Ramirez','Elijah Boone','Travis McCall','Curtis "C.J." Jackson','Malcolm Reed','Jerome Tate','Isaiah "Zay" Freeman','Nathaniel Brooks','Corey "Slim" Daniels','Desmond Price','Maurice Granger','Tasha Monroe','Renee "Ray" Carter','Monique Ellis','Keisha Grant','Angela Mercer','Dominique Price','Yolanda Brooks','Vanessa "Vee" Cole','Brianna Tate','Rochelle Givens','Marisol Vega','Carmen Salazar','Elena Ramirez','Latoya Bishop','Nicole "Nikki" Wallace','Jasmine Reed','Felicia Boone','Shanice Holloway','Teresa McCall','Candace "Candy" Daniels'];
  const root = $('[data-poker-root]');
  const app = $('[data-poker-app]');
  const gate = $('[data-auth-gate]');

  function money(value) {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value || 0));
  }
  function toast(message) {
    const element = $('[data-toast]');
    element.textContent = message;
    element.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { element.hidden = true; }, 4600);
  }
  function setConnection(text, isError = false) {
    const element = $('[data-connection-state]');
    element.textContent = text;
    element.style.color = isError ? 'var(--danger)' : '';
  }
  function cardMarkup(card, target) {
    target.className = 'card';
    if (!card || card.hidden) {
      target.classList.add('card--down');
      target.removeAttribute('data-card-rank'); target.removeAttribute('data-card-suit');
      return;
    }
    target.dataset.cardRank = card.rank || card[0] || '';
    target.dataset.cardSuit = card.suit || card[1] || '';
  }
  function renderSeat(seat, index) {
    const node = $(`[data-seat="${index}"]`);
    if (!node) return;
    node.className = `seat seat--${['north','north-east','south-east','south','south-west','north-west'][index]}`;
    node.textContent = '';
    if (!seat) { node.classList.add('seat--empty'); node.textContent = 'Open seat'; return; }
    if (seat.isTurn) node.classList.add('seat--active');
    const name = document.createElement('strong'); name.className = 'seat__name'; name.textContent = seat.displayName || seat.name || 'Player';
    const chips = document.createElement('span'); chips.className = 'seat__chips'; chips.textContent = `${money(seat.chips ?? seat.stack)} chips`;
    const status = document.createElement('span'); status.className = 'seat__state'; status.textContent = seat.folded ? 'Folded' : (seat.status || (seat.isTurn ? 'Acting' : 'In hand'));
    node.append(name, chips, status);
  }
  function renderActivity(items) {
    const feed = $('[data-activity-feed]');
    feed.textContent = '';
    (items || []).slice(-8).reverse().forEach((item) => {
      const li = document.createElement('li');
      const time = document.createElement('time'); time.textContent = item.time || item.createdAt ? new Date(item.time || item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'NOW';
      li.append(time, document.createTextNode(item.message || item.text || String(item)));
      feed.append(li);
    });
    if (!feed.children.length) feed.innerHTML = '<li>Hands, bets, wins, folds, and table activity will appear here as the game unfolds.</li>';
  }
  function renderTable(table) {
    state.table = table;
    $('[data-poker-stage]').hidden = false;
    $('[data-poker-lobby]').hidden = true;
    $('[data-table-kind]').textContent = table.mode === 'practice' ? 'Solo Table / House Opponent' : 'Live Table';
    $('[data-table-name]').textContent = table.name || (table.mode === 'practice' ? 'Solo Table' : 'Live Table');
    $('[data-pot]').textContent = `$${money(table.pot)}`;
    $('[data-player-name]').textContent = table.localPlayer?.displayName || state.user?.displayName || 'Player';
    $('[data-hand-status]').textContent = table.handLabel || table.status || 'Waiting for the next hand.';
    $('[data-turn-note]').textContent = table.turnMessage || (table.isYourTurn ? 'Your turn at the table.' : 'Waiting for the next action.');
    $$('.card[data-community-card]').forEach((node, index) => cardMarkup((table.communityCards || [])[index], node));
    $$('.card[data-hole-card]').forEach((node, index) => cardMarkup((table.holeCards || [])[index], node));
    const seats = table.seats || table.players || [];
    for (let i = 0; i < 6; i += 1) renderSeat(seats[i], i);
    renderActivity(table.activity || table.events);
    const allowed = table.isYourTurn && !state.busy;
    $$('[data-poker-action]').forEach((button) => { button.disabled = !allowed; button.classList.toggle('is-disabled', !allowed); });
    $('[data-raise-amount]').disabled = !allowed;
  }
  function tableRow(table) {
    const row = document.createElement('article'); row.className = 'live-table-row';
    const info = document.createElement('div'); const heading = document.createElement('h4'); heading.textContent = table.name || 'Open Hold’em Table';
    const detail = document.createElement('p'); detail.textContent = `${table.stakesLabel || 'Chips'} · ${table.status || 'Table Talk On'}`; info.append(heading, detail);
    const count = document.createElement('span'); count.className = 'seat-count'; count.textContent = `${table.playerCount ?? table.players ?? 0}/${table.maxPlayers || 6} seated`;
    const join = document.createElement('button'); join.className = 'row-button'; join.type = 'button'; join.dataset.joinTable = table.id; join.textContent = table.canJoin === false ? 'Table Full' : 'Join Table'; join.disabled = table.canJoin === false;
    row.append(info, count, join); return row;
  }
  function renderLobby(payload) {
    const tables = payload.tables || payload.liveTables || [];
    const container = $('[data-live-tables]'); container.textContent = '';
    if (!tables.length) container.innerHTML = '<p class="table-list__message">No live table is open yet. Take a solo seat while the room fills.</p>';
    tables.forEach((table) => container.append(tableRow(table)));
    $('[data-online-count]').textContent = `${payload.onlineCount ?? payload.onlinePlayers ?? 0} online`;
    if (payload.balance !== undefined) { $('[data-wallet-balance]').textContent = `$${money(payload.balance)}`; $('[data-wallet-note]').textContent = 'For gameplay only'; }
  }
  async function request(route, options) { return window.CCCCommunity.request(route, options); }
  async function loadLobby() {
    setConnection('Checking live room…');
    try { const payload = await request('/api/poker/state'); renderLobby(payload); if (payload.table) { renderTable(payload.table); startPolling(); } setConnection('Live table updates enabled'); }
    catch (error) { setConnection('Live room unavailable', true); $('[data-live-tables]').innerHTML = `<p class="table-list__message">${error.message}</p>`; }
  }
  async function loadTable() {
    if (!state.table?.id) return;
    try { const payload = await request('/api/poker/state'); if (payload.balance !== undefined) { $('[data-wallet-balance]').textContent = `$${money(payload.balance)}`; } if (payload.table) renderTable(payload.table); setConnection('Live table updates'); }
    catch (error) { setConnection('Connection interrupted', true); toast(error.message); }
  }
  function startPolling() { clearInterval(state.poll); state.poll = setInterval(loadTable, 3000); }
  async function enter(route, body = {}) {
    if (state.busy) return; state.busy = true; setConnection('Taking your seat…');
    try { const payload = await request(route, { method: 'POST', body: JSON.stringify(body) }); renderTable(payload.table || payload); startPolling(); }
    catch (error) { toast(error.message); setConnection('Unable to enter table', true); }
    finally { state.busy = false; }
  }
  async function action(kind) {
    if (!state.table?.id || state.busy) return;
    const amount = Number($('[data-raise-amount]').value || 0);
    state.busy = true; renderTable(state.table);
    try { const normalized = kind === 'check-call' ? 'call' : kind; const payload = await request('/api/poker/action', { method: 'POST', body: JSON.stringify({ action: normalized, raiseBy: normalized === 'raise' ? amount : undefined }) }); renderTable(payload.table || payload); if (payload.balance !== undefined) $('[data-wallet-balance]').textContent = `$${money(payload.balance)}`; }
    catch (error) { toast(error.message); }
    finally { state.busy = false; }
  }
  async function leave() {
    if (!state.table?.id) return;
    try { await request('/api/poker/leave', { method: 'POST', body: '{}' }); }
    catch (error) { toast(error.message); return; }
    clearInterval(state.poll); state.table = null; $('[data-poker-stage]').hidden = true; $('[data-poker-lobby]').hidden = false; loadLobby();
  }
  async function init() {
    const returnTo = `${location.pathname}${location.search}`;
    $('[data-login-link]').href = `../../LOGIN.html?returnTo=${encodeURIComponent(returnTo)}`;
    const selector = $('[data-ai-opponent]');
    selector.textContent = '';
    opponentNames.forEach((name) => { const option = document.createElement('option'); option.value = name; option.textContent = name; selector.append(option); });
    const user = await window.CCCCommunity.restoreSession();
    if (!user) { gate.hidden = false; return; }
    state.user = user; app.hidden = false; gate.hidden = true;
    $('[data-wallet-note]').textContent = `${user.displayName} / account ledger`;
    loadLobby();
  }
  document.addEventListener('DOMContentLoaded', () => {
    $('[data-refresh-tables]').addEventListener('click', loadLobby);
    $('[data-start-practice]').addEventListener('click', () => enter('/api/poker/practice', { opponentName: $('[data-ai-opponent]').value }));
    $('[data-live-tables]').addEventListener('click', (event) => { const button = event.target.closest('[data-join-table]'); if (button) enter('/api/poker/join', { tableId: button.dataset.joinTable }); });
    $$('[data-poker-action]').forEach((button) => button.addEventListener('click', () => action(button.dataset.pokerAction)));
    $('[data-leave-table]').addEventListener('click', leave);
    init();
  });
})();
