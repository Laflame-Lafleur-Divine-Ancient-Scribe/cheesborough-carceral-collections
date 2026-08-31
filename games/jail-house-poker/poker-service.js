'use strict';

// Server-authoritative, fictional-chip Texas Hold'em service.  It intentionally
// has no payment, cashout, or prize code.  The live table lives in process while
// balances and the audit ledger remain in PostgreSQL.
const crypto = require('node:crypto');

const GAME_KEY = 'jail-house-poker';
const STARTING_BALANCE = 10000;
const ANTE = 100;
const MAX_RAISE = 1000;
const LEGACY_AI_ROSTER = [
  ['Marcus “Mack” Holloway', 'rookie', 'cautious'], ['Darnell Bishop', 'rookie', 'calling-station'],
  ['Leon “Red” Carter', 'intermediate', 'pressure'], ['Terrence Wallace', 'rookie', 'selective'],
  ['Calvin “Keys” Mercer', 'intermediate', 'patient'], ['Raymond Givens', 'rookie', 'loose'],
  ['Andre “Dre” Collins', 'intermediate', 'pressure'], ['Victor Salazar', 'rookie', 'cautious'],
  ['Luis Mendoza', 'intermediate', 'patient'], ['Hector Ramirez', 'rookie', 'calling-station'],
  ['Elijah Boone', 'intermediate', 'selective'], ['Travis McCall', 'rookie', 'loose'],
  ['Curtis “C.J.” Jackson', 'intermediate', 'pressure'], ['Malcolm Reed', 'rookie', 'cautious'],
  ['Jerome Tate', 'intermediate', 'patient'], ['Isaiah “Zay” Freeman', 'rookie', 'loose'],
  ['Nathaniel Brooks', 'intermediate', 'selective'], ['Corey “Slim” Daniels', 'rookie', 'calling-station'],
  ['Desmond Price', 'intermediate', 'pressure'], ['Maurice Granger', 'rookie', 'cautious'],
  ['Tasha Monroe', 'intermediate', 'patient'], ['Renee “Ray” Carter', 'rookie', 'selective'],
  ['Monique Ellis', 'intermediate', 'pressure'], ['Keisha Grant', 'rookie', 'loose'],
  ['Angela Mercer', 'intermediate', 'cautious'], ['Dominique Price', 'rookie', 'calling-station'],
  ['Yolanda Brooks', 'intermediate', 'patient'], ['Vanessa “Vee” Cole', 'rookie', 'selective'],
  ['Brianna Tate', 'intermediate', 'pressure'], ['Rochelle Givens', 'rookie', 'loose'],
  ['Marisol Vega', 'intermediate', 'cautious'], ['Carmen Salazar', 'rookie', 'calling-station'],
  ['Elena Ramirez', 'intermediate', 'patient'], ['Latoya Bishop', 'rookie', 'selective'],
  ['Nicole “Nikki” Wallace', 'intermediate', 'pressure'], ['Jasmine Reed', 'rookie', 'loose'],
  ['Felicia Boone', 'intermediate', 'cautious'], ['Shanice Holloway', 'rookie', 'calling-station'],
  ['Teresa McCall', 'intermediate', 'patient'], ['Candace “Candy” Daniels', 'rookie', 'selective'],
].map(([name, level, tendency], index) => ({ id: `ai-${index + 1}`, name, level, tendency }));
const AI_ROSTER = [
  ['Marcus "Mack" Holloway', 'rookie', 'cautious'], ['Darnell Bishop', 'rookie', 'calling-station'], ['Leon "Red" Carter', 'intermediate', 'pressure'], ['Terrence Wallace', 'rookie', 'selective'], ['Calvin "Keys" Mercer', 'intermediate', 'patient'], ['Raymond Givens', 'rookie', 'loose'], ['Andre "Dre" Collins', 'intermediate', 'pressure'], ['Victor Salazar', 'rookie', 'cautious'], ['Luis Mendoza', 'intermediate', 'patient'], ['Hector Ramirez', 'rookie', 'calling-station'],
  ['Elijah Boone', 'intermediate', 'selective'], ['Travis McCall', 'rookie', 'loose'], ['Curtis "C.J." Jackson', 'intermediate', 'pressure'], ['Malcolm Reed', 'rookie', 'cautious'], ['Jerome Tate', 'intermediate', 'patient'], ['Isaiah "Zay" Freeman', 'rookie', 'loose'], ['Nathaniel Brooks', 'intermediate', 'selective'], ['Corey "Slim" Daniels', 'rookie', 'calling-station'], ['Desmond Price', 'intermediate', 'pressure'], ['Maurice Granger', 'rookie', 'cautious'],
  ['Tasha Monroe', 'intermediate', 'patient'], ['Renee "Ray" Carter', 'rookie', 'selective'], ['Monique Ellis', 'intermediate', 'pressure'], ['Keisha Grant', 'rookie', 'loose'], ['Angela Mercer', 'intermediate', 'cautious'], ['Dominique Price', 'rookie', 'calling-station'], ['Yolanda Brooks', 'intermediate', 'patient'], ['Vanessa "Vee" Cole', 'rookie', 'selective'], ['Brianna Tate', 'intermediate', 'pressure'], ['Rochelle Givens', 'rookie', 'loose'],
  ['Marisol Vega', 'intermediate', 'cautious'], ['Carmen Salazar', 'rookie', 'calling-station'], ['Elena Ramirez', 'intermediate', 'patient'], ['Latoya Bishop', 'rookie', 'selective'], ['Nicole "Nikki" Wallace', 'intermediate', 'pressure'], ['Jasmine Reed', 'rookie', 'loose'], ['Felicia Boone', 'intermediate', 'cautious'], ['Shanice Holloway', 'rookie', 'calling-station'], ['Teresa McCall', 'intermediate', 'patient'], ['Candace "Candy" Daniels', 'rookie', 'selective'],
].map(([name, level, tendency], index) => ({ id: `ai-${index + 1}`, name, level, tendency }));

const ranks = '23456789TJQKA';
const suits = ['S', 'H', 'D', 'C'];
const rooms = new Map();
const playerRoom = new Map();
const LIVE_TABLES = [
  { id: 'yard-table', label: 'The Yard Table' },
  { id: 'north-block', label: 'North Block Table' },
  { id: 'visiting-room', label: 'Visiting Room Table' },
];

function randomInt(max) { return crypto.randomInt(0, max); }
function cleanCardLabel(card) { const faces = { T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A' }; const marks = { S: String.fromCharCode(0x2660), H: String.fromCharCode(0x2665), D: String.fromCharCode(0x2666), C: String.fromCharCode(0x2663) }; return `${faces[card[0]] || card[0]}${marks[card[1]]}`; }
function shuffledDeck() {
  const deck = suits.flatMap((suit) => [...ranks].map((rank) => `${rank}${suit}`));
  for (let i = deck.length - 1; i > 0; i -= 1) { const j = randomInt(i + 1); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  return deck;
}
function cardLabel(card) { return `${({ T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A' })[card[0]] || card[0]}${({ S: '♠', H: '♥', D: '♦', C: '♣' })[card[1]]}`; }
function newRoom(id, label) { return { id, label, players: [], deck: [], board: [], pot: 0, currentBet: ANTE, stage: 'waiting', turn: 0, messages: ['Table is open. Two players are needed to deal.'], handId: null, settleTimer: null, updatedAt: Date.now() }; }
function getRoom(id = 'yard-table', label) { if (!rooms.has(id)) rooms.set(id, newRoom(id, label || LIVE_TABLES.find((table) => table.id === id)?.label || 'Private Practice Table')); return rooms.get(id); }
function visibleCard(card) { return card ? { code: card, label: cleanCardLabel(card), suit: card[1], rank: card[0] } : null; }
function nowISO() { return new Date().toISOString(); }

function fiveRank(cards) {
  const values = cards.map((card) => ranks.indexOf(card[0]) + 2).sort((a, b) => b - a);
  const counts = new Map(); values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  const groups = [...counts].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || b.value - a.value);
  const flush = cards.every((card) => card[1] === cards[0][1]);
  const unique = [...new Set(values)].sort((a, b) => b - a);
  const straightHigh = unique.length === 5 && (unique[0] - unique[4] === 4 ? unique[0] : unique.join(',') === '14,5,4,3,2' ? 5 : 0);
  if (flush && straightHigh) return [8, straightHigh];
  if (groups[0].count === 4) return [7, groups[0].value, groups[1].value];
  if (groups[0].count === 3 && groups[1].count === 2) return [6, groups[0].value, groups[1].value];
  if (flush) return [5, ...values];
  if (straightHigh) return [4, straightHigh];
  if (groups[0].count === 3) return [3, groups[0].value, ...groups.slice(1).map((g) => g.value)];
  if (groups[0].count === 2 && groups[1].count === 2) return [2, groups[0].value, groups[1].value, groups[2].value];
  if (groups[0].count === 2) return [1, groups[0].value, ...groups.slice(1).map((g) => g.value)];
  return [0, ...values];
}
function compareRank(a, b) { for (let i = 0; i < Math.max(a.length, b.length); i += 1) { if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0) ? 1 : -1; } return 0; }
function handRank(cards) {
  let best = null;
  for (let a = 0; a < cards.length - 4; a += 1) for (let b = a + 1; b < cards.length - 3; b += 1) for (let c = b + 1; c < cards.length - 2; c += 1) for (let d = c + 1; d < cards.length - 1; d += 1) for (let e = d + 1; e < cards.length; e += 1) {
    const value = fiveRank([cards[a], cards[b], cards[c], cards[d], cards[e]]); if (!best || compareRank(value, best) > 0) best = value;
  }
  return best;
}
function rankName(score) { return ['high card', 'pair', 'two pair', 'three of a kind', 'straight', 'flush', 'full house', 'four of a kind', 'straight flush'][score[0]]; }

function createPokerService(ctx) {
  const { db: getDb, user: getUser, isOwner, ensureSchema, parseBody, json, cors, rate } = ctx;
  async function wallet(userId) {
    const db = getDb();
    await ensureSchema();
    await db.query('INSERT INTO game_wallets (user_id,balance) VALUES ($1,$2) ON CONFLICT (user_id) DO NOTHING', [userId, STARTING_BALANCE]);
    return (await db.query('SELECT balance FROM game_wallets WHERE user_id=$1', [userId])).rows[0];
  }
  async function applyChips(userId, amount, reason, referenceId) {
    const db = getDb(); const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query('INSERT INTO game_wallets (user_id,balance) VALUES ($1,$2) ON CONFLICT (user_id) DO NOTHING', [userId, STARTING_BALANCE]);
      const updated = await client.query('UPDATE game_wallets SET balance=balance+$1,updated_at=now() WHERE user_id=$2 AND balance+$1>=0 RETURNING balance', [amount, userId]);
      if (!updated.rows[0]) throw Error('INSUFFICIENT_CHIPS');
      await client.query('INSERT INTO game_wallet_ledger (user_id,game_key,amount,balance_after,reason,reference_id) VALUES ($1,$2,$3,$4,$5,$6)', [userId, GAME_KEY, amount, updated.rows[0].balance, reason, referenceId || null]);
      await client.query('COMMIT'); return updated.rows[0].balance;
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  async function recordAtumRake(pot, handId) {
    const db = getDb(); const client = await db.connect();
    try {
      await client.query('BEGIN');
      const counter = await client.query("INSERT INTO game_counters (counter_key,value) VALUES ('jail-house-poker:completed-pots',1) ON CONFLICT (counter_key) DO UPDATE SET value=game_counters.value+1,updated_at=now() RETURNING value");
      const completedPots = Number(counter.rows[0].value);
      const rake = completedPots % 8 === 0 ? Math.floor(Number(pot) * 0.15) : 0;
      if (rake) {
        const wallet = await client.query("UPDATE game_house_wallets SET balance=balance+$1,updated_at=now() WHERE account_key='atum' RETURNING balance", [rake]);
        await client.query("INSERT INTO game_house_ledger (account_key,game_key,amount,reason,reference_id) VALUES ('atum',$1,$2,'eighth_pot_rake',$3)", [GAME_KEY, rake, handId]);
        await client.query('COMMIT'); return { completedPots, rake, atumBalance: wallet.rows[0].balance };
      }
      await client.query('COMMIT'); return { completedPots, rake: 0, atumBalance: null };
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  function roomState(room, viewerId) {
    const me = room.players.find((player) => player.id === viewerId);
    return { room: { id: room.id, label: room.label, stage: room.stage, pot: room.pot, currentBet: room.currentBet, board: room.board.map(visibleCard), turnPlayerId: room.players[room.turn]?.id || null, handId: room.handId, updatedAt: room.updatedAt }, players: room.players.map((player) => ({ id: player.id, name: player.name, isAI: player.isAI, stack: player.stack, folded: player.folded, allIn: player.allIn, roundBet: player.roundBet, isTurn: room.players[room.turn]?.id === player.id, cards: player.id === viewerId || room.stage === 'showdown' ? player.cards.map(visibleCard) : [{ hidden: true }, { hidden: true }] })), me: me ? { cards: me.cards.map(visibleCard), canAct: room.players[room.turn]?.id === viewerId && !me.folded && !me.allIn } : null, messages: room.messages.slice(-8) };
  }
  function uiTable(room, viewerId) {
    const raw = roomState(room, viewerId);
    return {
      id: room.id, name: room.label, mode: room.players.some((player) => player.isAI) ? 'practice' : 'live', pot: room.pot,
      communityCards: raw.room.board, holeCards: raw.me?.cards || [], seats: raw.players.map((player) => ({ ...player, displayName: player.name, chips: player.stack })),
      localPlayer: { displayName: raw.players.find((player) => player.id === viewerId)?.name || '' }, isYourTurn: Boolean(raw.me?.canAct),
      handLabel: room.stage === 'waiting' ? 'Waiting for a second player.' : `${room.stage[0].toUpperCase() + room.stage.slice(1)} hand`,
      turnMessage: raw.me?.canAct ? 'Your turn: fold, check/call, or place a raise.' : 'Waiting for the next action.',
      activity: raw.messages.map((message) => ({ message, createdAt: nowISO() })),
    };
  }
  function tableList() { return LIVE_TABLES.map((definition) => { const room = getRoom(definition.id, definition.label); return { id: room.id, name: room.label, playerCount: room.players.length, maxPlayers: 6, canJoin: room.players.length < 6, status: room.stage === 'waiting' ? 'Taking players' : `${room.stage[0].toUpperCase() + room.stage.slice(1)} hand`, stakesLabel: `Ante $${ANTE}` }; }); }
  async function publicState(request, response) {
    cors(request, response); const user = await getUser(request); if (!user) return json(response, 401, { error: 'Sign in is required.' });
    const balance = await wallet(user.id); const room = playerRoom.get(user.id) ? rooms.get(playerRoom.get(user.id)) : null;
    const onlineCount = LIVE_TABLES.reduce((count, definition) => count + getRoom(definition.id).players.filter((player) => !player.isAI).length, 0);
    return json(response, 200, { balance: balance.balance, tables: tableList(), onlineCount, aiCount: AI_ROSTER.length, table: room ? uiTable(room, user.id) : null, fictionalOnly: true });
  }
  async function join(request, response) {
    cors(request, response); const user = await getUser(request); if (!user) return json(response, 401, { error: 'Sign in is required to join a table.' });
    if (!await rate(request, 'poker_join', 12, 600)) return json(response, 429, { error: 'Please wait before joining another table.' });
    const body = await parseBody(request); const requestedTable = String(body?.tableId || 'yard-table');
    const definition = LIVE_TABLES.find((table) => table.id === requestedTable);
    if (!definition) return json(response, 400, { error: 'Choose an available live table.' });
    const room = getRoom(definition.id, definition.label);
    if (playerRoom.has(user.id)) return json(response, 200, { table: uiTable(rooms.get(playerRoom.get(user.id)), user.id), balance: (await wallet(user.id)).balance });
    if (room.players.length >= 6) return json(response, 409, { error: 'That table is full.' });
    const balance = await wallet(user.id); room.players.push({ id: user.id, name: user.displayName, isAI: false, stack: balance.balance, cards: [], roundBet: 0, folded: false, allIn: false, acted: false }); playerRoom.set(user.id, room.id);
    room.messages.push(`${user.displayName} took a seat.`); room.updatedAt = Date.now();
    if (room.players.length >= 2 && room.stage === 'waiting') await deal(room);
    return json(response, 200, { table: uiTable(room, user.id), balance: balance.balance });
  }
  async function practice(request, response) {
    cors(request, response); const user = await getUser(request); if (!user) return json(response, 401, { error: 'Sign in is required to practice.' });
    const body = await parseBody(request);
    if (playerRoom.has(user.id) && !String(playerRoom.get(user.id)).startsWith('practice-')) return json(response, 409, { error: 'Leave your live table before opening a practice table.' });
    const room = getRoom(playerRoom.get(user.id) || `practice-${user.id}`, 'Private Practice Table');
    if (!playerRoom.has(user.id)) {
      const balance = await wallet(user.id); room.players.push({ id: user.id, name: user.displayName, isAI: false, stack: balance.balance, cards: [], roundBet: 0, folded: false, allIn: false, acted: false }); playerRoom.set(user.id, room.id);
    }
    if (room.players.length < 2) {
      const requested = String(body?.aiId || body?.opponentName || '').replace(/[^a-z]/gi, '').toLowerCase();
      const chosen = AI_ROSTER.find((ai) => ai.id === String(body?.aiId || '') || ai.name.replace(/[^a-z]/gi, '').toLowerCase() === requested) || AI_ROSTER[randomInt(AI_ROSTER.length)];
      room.players.push({ ...chosen, isAI: true, stack: STARTING_BALANCE, cards: [], roundBet: 0, folded: false, allIn: false, acted: false }); room.messages.push(`${chosen.name} joined the practice table.`);
    }
    if (room.stage === 'waiting') await deal(room);
    return json(response, 200, { table: uiTable(room, user.id), balance: (await wallet(user.id)).balance });
  }
  async function deal(room) {
    if (room.players.length < 2) return;
    room.deck = shuffledDeck(); room.board = []; room.pot = 0; room.currentBet = ANTE; room.stage = 'preflop'; room.handId = crypto.randomUUID();
    for (const player of room.players) { player.cards = [room.deck.pop(), room.deck.pop()]; player.roundBet = 0; player.folded = false; player.allIn = false; player.acted = false; const ante = Math.min(ANTE, player.stack); player.stack -= ante; player.roundBet = ante; room.pot += ante; if (!player.isAI) await applyChips(player.id, -ante, 'ante', room.handId); }
    room.turn = 0; room.messages.push(`Hand dealt. Ante: $${ANTE} fictional chips.`); room.updatedAt = Date.now(); await advanceAIs(room);
  }
  function active(room) { return room.players.filter((player) => !player.folded && !player.allIn); }
  function nextTurn(room) { for (let i = 1; i <= room.players.length; i += 1) { const index = (room.turn + i) % room.players.length; if (!room.players[index].folded && !room.players[index].allIn) { room.turn = index; return; } } }
  async function settle(room, forcedWinner) {
    const candidates = active(room); const best = forcedWinner ? [forcedWinner] : candidates.reduce((winners, player) => { const score = handRank([...player.cards, ...room.board]); if (!winners.length || compareRank(score, handRank([...winners[0].cards, ...room.board])) > 0) return [player]; if (compareRank(score, handRank([...winners[0].cards, ...room.board])) === 0) winners.push(player); return winners; }, []);
    const atum = await recordAtumRake(room.pot, room.handId); const distributable = room.pot - atum.rake; const share = Math.floor(distributable / best.length); const remainder = distributable % best.length;
    for (const [index, player] of best.entries()) { const award = share + (index < remainder ? 1 : 0); player.stack += award; if (!player.isAI) await applyChips(player.id, award, 'hand_win', room.handId); }
    room.stage = 'showdown'; const rakeNotice = atum.rake ? ` The Atum Account retained $${atum.rake} (15% of completed pot ${atum.completedPots}).` : '';
    room.messages.push(`${best.map((player) => player.name).join(' and ')} won $${distributable} ${forcedWinner ? 'when the table folded.' : `with ${rankName(handRank([...best[0].cards, ...room.board]))}.`}${rakeNotice}`); room.updatedAt = Date.now();
    clearTimeout(room.settleTimer); room.settleTimer = setTimeout(() => deal(room).catch(() => {}), 7000);
  }
  async function finishBetting(room) {
    if (active(room).length === 1) return settle(room, active(room)[0]);
    if (!active(room).every((player) => player.acted || player.allIn)) return;
    room.players.forEach((player) => { player.acted = false; player.roundBet = 0; }); room.currentBet = 0;
    if (room.stage === 'preflop') { room.board = [room.deck.pop(), room.deck.pop(), room.deck.pop()]; room.stage = 'flop'; }
    else if (room.stage === 'flop') { room.board.push(room.deck.pop()); room.stage = 'turn'; }
    else if (room.stage === 'turn') { room.board.push(room.deck.pop()); room.stage = 'river'; }
    else return settle(room);
    room.turn = 0; room.messages.push(`${room.stage[0].toUpperCase() + room.stage.slice(1)} is on the table.`); room.updatedAt = Date.now(); await advanceAIs(room);
  }
  async function perform(room, player, action, raiseBy = 0) {
    if (player.folded || player.allIn) return; const toCall = Math.max(0, room.currentBet - player.roundBet);
    if (action === 'fold') { player.folded = true; player.acted = true; room.messages.push(`${player.name} folded.`); }
    else {
      let payment = toCall; if (action === 'raise') { const cappedRaise = Math.max(ANTE, Math.min(MAX_RAISE, Number(raiseBy) || ANTE)); payment += cappedRaise; room.currentBet = player.roundBet + payment; room.players.forEach((other) => { if (other !== player && !other.folded) other.acted = false; }); room.messages.push(`${player.name} raised $${cappedRaise}.`); } else room.messages.push(`${player.name} ${toCall ? `called $${toCall}` : 'checked'}.`);
      payment = Math.min(payment, player.stack); player.stack -= payment; player.roundBet += payment; room.pot += payment; player.allIn = player.stack === 0; player.acted = true; if (!player.isAI && payment) await applyChips(player.id, -payment, action === 'raise' ? 'raise' : 'call', room.handId);
    }
    room.updatedAt = Date.now(); nextTurn(room); await finishBetting(room); await advanceAIs(room);
  }
  async function advanceAIs(room) {
    const player = room.players[room.turn]; if (!player?.isAI || room.stage === 'waiting' || room.stage === 'showdown') return;
    clearTimeout(room.aiTimer); room.aiTimer = setTimeout(() => {
      const needed = Math.max(0, room.currentBet - player.roundBet); const roll = randomInt(100); const tendency = player.tendency;
      const foldAt = tendency === 'cautious' ? 48 : tendency === 'pressure' ? 18 : tendency === 'loose' ? 8 : 30;
      const raiseAt = tendency === 'pressure' ? 68 : tendency === 'loose' ? 88 : tendency === 'patient' ? 82 : 92;
      const action = needed && roll < foldAt ? 'fold' : roll > raiseAt && player.stack > needed + ANTE ? 'raise' : 'call';
      perform(room, player, action, ANTE * (1 + randomInt(3))).catch(() => {});
    }, 750 + randomInt(900));
  }
  async function action(request, response) {
    cors(request, response); const user = await getUser(request); if (!user) return json(response, 401, { error: 'Sign in is required.' });
    if (!await rate(request, 'poker_action', 40, 600)) return json(response, 429, { error: 'Please slow down before your next move.' });
    const room = playerRoom.get(user.id) ? rooms.get(playerRoom.get(user.id)) : null; const body = await parseBody(request);
    if (!room || room.stage === 'waiting') return json(response, 409, { error: 'Join a table before playing.' });
    const player = room.players.find((seat) => seat.id === user.id); if (!player || room.players[room.turn] !== player) return json(response, 409, { error: 'It is not your turn.' });
    const kind = ['fold', 'call', 'raise'].includes(body?.action) ? body.action : null; if (!kind) return json(response, 400, { error: 'Choose fold, check/call, or raise.' });
    try { await perform(room, player, kind, body?.raiseBy || body?.amount); return json(response, 200, { table: uiTable(room, user.id), balance: (await wallet(user.id)).balance }); }
    catch (error) { return json(response, error.message === 'INSUFFICIENT_CHIPS' ? 409 : 503, { error: error.message === 'INSUFFICIENT_CHIPS' ? 'You do not have enough fictional chips for that wager.' : 'The table is temporarily unavailable.' }); }
  }
  async function leave(request, response) {
    cors(request, response); const user = await getUser(request); if (!user) return json(response, 401, { error: 'Sign in is required.' });
    const room = playerRoom.get(user.id) ? rooms.get(playerRoom.get(user.id)) : null;
    if (room) {
      const departing = room.players.find((player) => player.id === user.id);
      if (departing && !['waiting', 'showdown'].includes(room.stage)) {
        departing.folded = true; room.messages.push(`${user.displayName} folded and left the hand.`);
        if (active(room).length === 1) await settle(room, active(room)[0]);
      }
      room.players = room.players.filter((player) => player.id !== user.id); playerRoom.delete(user.id); room.messages.push(`${user.displayName} left the table.`); room.updatedAt = Date.now();
      if (room.players.length < 2) { room.stage = 'waiting'; room.pot = 0; clearTimeout(room.settleTimer); clearTimeout(room.aiTimer); }
    }
    return json(response, 200, { left: true });
  }
  async function atumState(request, response) {
    cors(request, response); const user = await getUser(request); if (!isOwner(user)) return json(response, 403, { error: 'Atum Account access is restricted to the site owner.' });
    await ensureSchema(); const db = getDb();
    const [wallet, counter] = await Promise.all([db.query("SELECT display_name,balance,updated_at FROM game_house_wallets WHERE account_key='atum'"), db.query("SELECT value FROM game_counters WHERE counter_key='jail-house-poker:completed-pots'")]);
    const completedPots = Number(counter.rows[0]?.value || 0);
    return json(response, 200, { account: { name: wallet.rows[0]?.display_name || 'Atum Account', balance: Number(wallet.rows[0]?.balance || 0), updatedAt: wallet.rows[0]?.updated_at || null, completedPots, rakeEvery: 8, rakePercent: 15, nextRakeOn: completedPots + (completedPots % 8 === 0 ? 8 : 8 - (completedPots % 8)) } });
  }
  return { publicState, join, practice, action, leave, atumState };
}

module.exports = { createPokerService };
