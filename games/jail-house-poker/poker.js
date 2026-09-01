(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { user: null, table: null, poll: null, busy: false };
  const opponentNames = ['Marcus "Mack" Holloway','Darnell Bishop','Leon "Red" Carter','Terrence Wallace','Calvin "Keys" Mercer','Raymond Givens','Andre "Dre" Collins','Victor Salazar','Luis Mendoza','Hector Ramirez','Elijah Boone','Travis McCall','Curtis "C.J." Jackson','Malcolm Reed','Jerome Tate','Isaiah "Zay" Freeman','Nathaniel Brooks','Corey "Slim" Daniels','Desmond Price','Maurice Granger','Tasha Monroe','Renee "Ray" Carter','Monique Ellis','Keisha Grant','Angela Mercer','Dominique Price','Yolanda Brooks','Vanessa "Vee" Cole','Brianna Tate','Rochelle Givens','Marisol Vega','Carmen Salazar','Elena Ramirez','Latoya Bishop','Nicole "Nikki" Wallace','Jasmine Reed','Felicia Boone','Shanice Holloway','Teresa McCall','Candace "Candy" Daniels'];
  const opponentCategories = ['Tight','Caller','Maverick','Tight','Strategist','Rookie','Maverick','Tight','Strategist','Caller'];
  const seatPositions = [
    { left: '36%', top: '3%', transform: 'translateX(-50%)' }, { right: '17%', top: '10%' },
    { right: '2%', top: '36%' }, { right: '17%', bottom: '7%' },
    { left: '50%', bottom: '3%', transform: 'translateX(-50%)' }, { left: '17%', bottom: '7%' },
    { left: '2%', top: '36%' }, { left: '17%', top: '10%' },
    { left: '64%', top: '3%', transform: 'translateX(-50%)' },
  ];
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
    target.replaceChildren();
    if (!card || card.hidden) {
      target.classList.add('card--down');
      target.removeAttribute('data-card-rank'); target.removeAttribute('data-card-suit');
      return;
    }
    const rank = (card.rank || card[0] || '') === 'T' ? '10' : (card.rank || card[0] || '');
    const suitCode = card.suit || card[1] || '';
    const suit = { S: '♠', H: '♥', D: '♦', C: '♣' }[suitCode] || suitCode;
    target.dataset.cardRank = rank;
    target.dataset.cardSuit = suit;
    const corner = document.createElement('span'); corner.className = 'card__corner'; corner.textContent = `${rank}${suit}`;
    const pip = document.createElement('span'); pip.className = 'card__pip'; pip.textContent = suit;
    const cornerBottom = document.createElement('span'); cornerBottom.className = 'card__corner card__corner--bottom'; cornerBottom.textContent = `${rank}${suit}`;
    target.append(corner, pip, cornerBottom);
  }
  function renderSeat(seat, index) {
    const node = $(`[data-seat="${index}"]`);
    if (!node) return;
    node.className = `seat seat--position-${index}`;
    const position = seatPositions[index];
    Object.assign(node.style, { left: position.left || 'auto', right: position.right || 'auto', top: position.top || 'auto', bottom: position.bottom || 'auto', transform: position.transform || 'none' });
    node.textContent = '';
    if (!seat) { node.classList.add('seat--empty'); node.textContent = 'Open seat'; return; }
    if (seat.isTurn) node.classList.add('seat--active');
    const name = document.createElement('strong'); name.className = 'seat__name'; name.textContent = seat.displayName || seat.name || 'Player';
    const chips = document.createElement('span'); chips.className = 'seat__chips'; chips.textContent = `${money(seat.chips ?? seat.stack)} chips`;
    const status = document.createElement('span'); status.className = 'seat__state'; status.textContent = seat.folded ? 'Folded' : (seat.allIn ? 'All in' : (seat.status || (seat.isTurn ? 'Acting' : 'In hand')));
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
    $('[data-table-kind]').textContent = table.mode === 'solo' ? 'Solo Table / House Opponents' : 'Live Table';
    $('[data-table-name]').textContent = table.name || (table.mode === 'solo' ? 'Solo Table' : 'Live Table');
    const bigBlind = Number(table.stakes?.bigBlind || 10);
    $('[data-table-stakes]').textContent = `Blinds $${money(table.stakes?.smallBlind || 5)} / $${money(bigBlind)}`;
    $('[data-pot]').textContent = `$${money(table.pot)}`;
    $('[data-player-name]').textContent = table.localPlayer?.displayName || state.user?.displayName || 'Player';
    $('[data-hand-status]').textContent = table.handLabel || table.status || 'Waiting for the next hand.';
    $('[data-turn-note]').textContent = table.turnMessage || (table.isYourTurn ? 'Your turn at the table.' : 'Waiting for the next action.');
    $$('.card[data-community-card]').forEach((node, index) => cardMarkup((table.communityCards || [])[index], node));
    $$('.card[data-hole-card]').forEach((node, index) => cardMarkup((table.holeCards || [])[index], node));
    const seats = table.seats || table.players || [];
    for (let i = 0; i < 9; i += 1) renderSeat(seats[i], i);
    renderActivity(table.activity || table.events);
    const allowed = table.isYourTurn && !state.busy;
    $$('[data-poker-action]').forEach((button) => { button.disabled = !allowed; button.classList.toggle('is-disabled', !allowed); });
    const raiseInput = $('[data-raise-amount]');
    raiseInput.min = String(bigBlind); raiseInput.step = String(bigBlind);
    if (Number(raiseInput.value || 0) < bigBlind) raiseInput.value = String(bigBlind);
    raiseInput.disabled = !allowed;
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
    const roster = payload.onlinePlayers || [];
    $('[data-online-roster]').textContent = roster.length ? `Online now: ${roster.map((player) => player.displayName || player.name).join(', ')}` : 'No signed-in players are in the Poker lobby yet.';
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
  async function startSelectedSoloTable(aiIds, stakesId) {
    if (state.busy) return;
    state.busy = true;
    setConnection(state.table?.mode === 'solo' ? 'Closing the current solo table…' : 'Taking your seat…');
    try {
      // A solo room persists for the signed-in player. Leave it first so a
      // changed selection never silently reuses its previous AI lineup.
      if (state.table?.mode === 'solo') {
        await request('/api/poker/leave', { method: 'POST', body: '{}' });
        clearInterval(state.poll);
        state.table = null;
      }
      setConnection('Seating your selected opponents…');
      const payload = await request('/api/poker/practice', { method: 'POST', body: JSON.stringify({ aiIds, stakesId }) });
      renderTable(payload.table || payload);
      startPolling();
    } catch (error) {
      toast(error.message);
      setConnection('Unable to seat the selected lineup', true);
    } finally {
      state.busy = false;
    }
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
    $('[data-felt-table] .table-mark small').textContent = 'Texas Hold’em / Solo & Live Play';
    const selector = $('[data-ai-opponents]');
    const selectedTray = $('[data-selected-opponents]');
    selector.textContent = '';
    opponentNames.forEach((name, index) => {
      const id = `ai-${index + 1}`; const category = opponentCategories[index % opponentCategories.length];
      const label = document.createElement('label'); label.className = 'ai-picker__option';
      const input = document.createElement('input'); input.type = 'checkbox'; input.value = id; input.checked = index === 0; input.dataset.aiName = name; input.dataset.aiCategory = category;
      const copy = document.createElement('span'); copy.className = 'ai-picker__copy';
      const title = document.createElement('strong'); title.textContent = name;
      const tag = document.createElement('small'); tag.textContent = category;
      copy.append(title, tag); label.append(input, copy); selector.append(label);
    });
    const updateSelectionCount = () => {
      const selected = $$('input:checked', selector);
      const count = selected.length;
      $$('input', selector).forEach((input) => { input.disabled = count >= 8 && !input.checked; });
      $('[data-ai-selection-count]').textContent = `${count} selected / 8 seats available`;
      selectedTray.textContent = '';
      selected.forEach((input) => {
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'selected-opponents__chip'; remove.dataset.removeAi = input.value;
        remove.setAttribute('aria-label', `Remove ${input.dataset.aiName}`); remove.textContent = `${input.dataset.aiName} · ${input.dataset.aiCategory} ×`;
        selectedTray.append(remove);
      });
    };
    selector.addEventListener('change', updateSelectionCount); updateSelectionCount();
    selectedTray.addEventListener('click', (event) => { const button = event.target.closest('[data-remove-ai]'); if (!button) return; const input = $(`input[value="${button.dataset.removeAi}"]`, selector); if (input) { input.checked = false; updateSelectionCount(); } });
    const user = await window.CCCCommunity.restoreSession();
    if (!user) { gate.hidden = false; return; }
    state.user = user; app.hidden = false; gate.hidden = true;
    $('[data-wallet-note]').textContent = `${user.displayName} / account ledger`;
    loadLobby();
  }
  document.addEventListener('DOMContentLoaded', () => {
    $('[data-refresh-tables]').addEventListener('click', loadLobby);
    $('[data-start-practice]').addEventListener('click', () => {
      const aiIds = $$('input:checked', $('[data-ai-opponents]')).map((input) => input.value).slice(0, 8);
      if (!aiIds.length) { toast('Choose at least one opponent.'); return; }
      startSelectedSoloTable(aiIds, $('[data-solo-stakes]').value);
    });
    $('[data-live-tables]').addEventListener('click', (event) => { const button = event.target.closest('[data-join-table]'); if (button) enter('/api/poker/join', { tableId: button.dataset.joinTable }); });
    $$('[data-poker-action]').forEach((button) => button.addEventListener('click', () => action(button.dataset.pokerAction)));
    $('[data-leave-table]').addEventListener('click', leave);
    init();
  });
})();
