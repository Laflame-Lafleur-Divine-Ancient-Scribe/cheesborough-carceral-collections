'use strict';

// Server-authoritative Texas Hold'em chip service. It intentionally
// has no payment, cashout, or prize code.  The live table lives in process while
// balances and the audit ledger remain in PostgreSQL.
const crypto = require('node:crypto');

const GAME_KEY = 'jail-house-poker';
const STARTING_BALANCE = 10000;
const OWNER_STARTING_BALANCE = 100000000000;
const DEFAULT_STAKES = { id: 'low-5-10', label: 'Low Stakes Room', smallBlind: 5, bigBlind: 10 };
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
].map(([name, level, tendency], index) => ({ id: `ai-${index + 1}`, name, level, tendency, ...aiProfile(level, tendency) }));
const AI_ROSTER = [
  ['Marcus "Mack" Holloway', 'rookie', 'cautious'], ['Darnell Bishop', 'rookie', 'calling-station'], ['Leon "Red" Carter', 'intermediate', 'pressure'], ['Terrence Wallace', 'rookie', 'selective'], ['Calvin "Keys" Mercer', 'intermediate', 'patient'], ['Raymond Givens', 'rookie', 'loose'], ['Andre "Dre" Collins', 'intermediate', 'pressure'], ['Victor Salazar', 'rookie', 'cautious'], ['Luis Mendoza', 'intermediate', 'patient'], ['Hector Ramirez', 'rookie', 'calling-station'],
  ['Elijah Boone', 'intermediate', 'selective'], ['Travis McCall', 'rookie', 'loose'], ['Curtis "C.J." Jackson', 'intermediate', 'pressure'], ['Malcolm Reed', 'rookie', 'cautious'], ['Jerome Tate', 'intermediate', 'patient'], ['Isaiah "Zay" Freeman', 'rookie', 'loose'], ['Nathaniel Brooks', 'intermediate', 'selective'], ['Corey "Slim" Daniels', 'rookie', 'calling-station'], ['Desmond Price', 'intermediate', 'pressure'], ['Maurice Granger', 'rookie', 'cautious'],
  ['Tasha Monroe', 'intermediate', 'patient'], ['Renee "Ray" Carter', 'rookie', 'selective'], ['Monique Ellis', 'intermediate', 'pressure'], ['Keisha Grant', 'rookie', 'loose'], ['Angela Mercer', 'intermediate', 'cautious'], ['Dominique Price', 'rookie', 'calling-station'], ['Yolanda Brooks', 'intermediate', 'patient'], ['Vanessa "Vee" Cole', 'rookie', 'selective'], ['Brianna Tate', 'intermediate', 'pressure'], ['Rochelle Givens', 'rookie', 'loose'],
  ['Marisol Vega', 'intermediate', 'cautious'], ['Carmen Salazar', 'rookie', 'calling-station'], ['Elena Ramirez', 'intermediate', 'patient'], ['Latoya Bishop', 'rookie', 'selective'], ['Nicole "Nikki" Wallace', 'intermediate', 'pressure'], ['Jasmine Reed', 'rookie', 'loose'], ['Felicia Boone', 'intermediate', 'cautious'], ['Shanice Holloway', 'rookie', 'calling-station'], ['Teresa McCall', 'intermediate', 'patient'], ['Candace "Candy" Daniels', 'rookie', 'selective'],
].map(([name, level, tendency], index) => ({ id: `ai-${index + 1}`, name, level, tendency, ...aiProfile(level, tendency) }));

const ranks = '23456789TJQKA';
const suits = ['S', 'H', 'D', 'C'];
const rooms = new Map();
const playerRoom = new Map();
const LIVE_TABLES = [
  { id: 'little-stakes', label: 'Little Stakes Room', smallBlind: 1, bigBlind: 2 },
  { id: 'low-stakes', label: 'Low Stakes Room', smallBlind: 5, bigBlind: 10 },
  { id: 'middle-stakes', label: 'Middle Stakes Room', smallBlind: 20, bigBlind: 40 },
  { id: 'big-stakes', label: 'Big Stakes Room', smallBlind: 100, bigBlind: 200 },
  { id: 'high-stakes', label: 'High Stakes Room', smallBlind: 250, bigBlind: 500 },
  { id: 'top-stakes', label: 'Top Stakes Room', smallBlind: 500, bigBlind: 1000 },
];

function randomInt(max) { return crypto.randomInt(0, max); }
function aiProfile(level, tendency) {
  const base = level === 'intermediate' ? { skill: 62, discipline: 65 } : { skill: 35, discipline: 38 };
  const traits = {
    cautious: { category: 'Tight', aggression: 28, bluff: 12 },
    'calling-station': { category: 'Caller', aggression: 38, bluff: 18 },
    pressure: { category: 'Maverick', aggression: 78, bluff: 58 },
    patient: { category: 'Strategist', aggression: 54, bluff: 28 },
    selective: { category: 'Tight', aggression: 42, bluff: 20 },
    loose: { category: 'Rookie', aggression: 63, bluff: 48 },
  };
  return { ...base, ...traits[tendency] };
}
function cleanCardLabel(card) { const faces = { T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A' }; const marks = { S: String.fromCharCode(0x2660), H: String.fromCharCode(0x2665), D: String.fromCharCode(0x2666), C: String.fromCharCode(0x2663) }; return `${faces[card[0]] || card[0]}${marks[card[1]]}`; }
function shuffledDeck() {
  const deck = suits.flatMap((suit) => [...ranks].map((rank) => `${rank}${suit}`));
  for (let i = deck.length - 1; i > 0; i -= 1) { const j = randomInt(i + 1); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  return deck;
}
function cardLabel(card) { return `${({ T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A' })[card[0]] || card[0]}${({ S: '♠', H: '♥', D: '♦', C: '♣' })[card[1]]}`; }
function stakesFor(id) { const table = LIVE_TABLES.find((item) => item.id === id); return table ? { id: table.id, label: table.label, smallBlind: table.smallBlind, bigBlind: table.bigBlind } : DEFAULT_STAKES; }
function stakesLabel(stakes) { return `$${stakes.smallBlind}/$${stakes.bigBlind}`; }
function tableBuyIn(stakes) { return stakes.bigBlind * 100; }
function newRoom(id, label, stakes = stakesFor(id)) { return { id, label, stakes, players: [], deck: [], board: [], pot: 0, currentBet: stakes.bigBlind, stage: 'waiting', turn: 0, messages: [`Table is open at ${stakesLabel(stakes)}. Two players are needed to deal.`], handId: null, settleTimer: null, updatedAt: Date.now() }; }
function getRoom(id = 'low-stakes', label, stakes) { if (!rooms.has(id)) rooms.set(id, newRoom(id, label || LIVE_TABLES.find((table) => table.id === id)?.label || 'Solo Table', stakes)); return rooms.get(id); }
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
  async function wallet(userId, isOwnerAccount = false) {
    const db = getDb();
    await ensureSchema();
    await db.query('INSERT INTO game_wallets (user_id,balance) VALUES ($1,$2) ON CONFLICT (user_id) DO NOTHING', [userId, STARTING_BALANCE]);
    if (isOwnerAccount) {
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`owner-bankroll:${userId}`]);
        const issued = await client.query("SELECT 1 FROM game_wallet_ledger WHERE user_id=$1 AND game_key=$2 AND reason='owner_bankroll_load' LIMIT 1 FOR UPDATE", [userId, GAME_KEY]);
        if (!issued.rows.length) {
          const current = await client.query('SELECT balance FROM game_wallets WHERE user_id=$1 FOR UPDATE', [userId]);
          const previousBalance = Number(current.rows[0]?.balance || 0);
          const loadAmount = OWNER_STARTING_BALANCE - previousBalance;
          await client.query('UPDATE game_wallets SET balance=$1,updated_at=now() WHERE user_id=$2', [OWNER_STARTING_BALANCE, userId]);
          await client.query('INSERT INTO game_wallet_ledger (user_id,game_key,amount,balance_after,reason,reference_id) VALUES ($1,$2,$3,$4,$5,$6)', [userId, GAME_KEY, loadAmount, OWNER_STARTING_BALANCE, 'owner_bankroll_load', 'atum-owner-initial-load']);
        }
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    }
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
    return { room: { id: room.id, label: room.label, stakes: room.stakes, stage: room.stage, pot: room.pot, currentBet: room.currentBet, board: room.board.map(visibleCard), turnPlayerId: room.players[room.turn]?.id || null, handId: room.handId, updatedAt: room.updatedAt }, players: room.players.map((player) => ({ id: player.id, name: player.name, isAI: player.isAI, stack: player.stack, folded: player.folded, allIn: player.allIn, roundBet: player.roundBet, isTurn: room.players[room.turn]?.id === player.id, cards: player.id === viewerId || room.stage === 'showdown' ? player.cards.map(visibleCard) : [{ hidden: true }, { hidden: true }] })), me: me ? { cards: me.cards.map(visibleCard), canAct: room.players[room.turn]?.id === viewerId && !me.folded && !me.allIn } : null, messages: room.messages.slice(-8) };
  }
  function uiTable(room, viewerId) {
    const raw = roomState(room, viewerId);
    const localPlayer = raw.players.find((player) => player.id === viewerId);
    const opponents = raw.players.filter((player) => player.id !== viewerId);
    const seats = Array(9).fill(null);
    // Keep the signed-in player at the near edge of the table and distribute
    // opponents around the remaining distinct seats.
    seats[4] = localPlayer || null;
    [0, 1, 2, 3, 5, 6, 7, 8].forEach((seatIndex, opponentIndex) => {
      seats[seatIndex] = opponents[opponentIndex] || null;
    });
    return {
      id: room.id, name: room.label, stakes: room.stakes, mode: room.players.some((player) => player.isAI) ? 'solo' : 'live', pot: room.pot,
      communityCards: raw.room.board, holeCards: raw.me?.cards || [], seats: seats.map((player) => player ? ({ ...player, displayName: player.name, chips: player.stack }) : null),
      localPlayer: { displayName: raw.players.find((player) => player.id === viewerId)?.name || '' }, isYourTurn: Boolean(raw.me?.canAct),
      handLabel: room.stage === 'waiting' ? 'Waiting for a second player.' : `${room.stage[0].toUpperCase() + room.stage.slice(1)} hand`,
      turnMessage: raw.me?.canAct ? 'Your turn: fold, check/call, or place a raise.' : 'Waiting for the next action.',
      activity: raw.messages.map((message) => ({ message, createdAt: nowISO() })),
    };
  }
  function tableList() { return LIVE_TABLES.map((definition) => { const room = getRoom(definition.id, definition.label, definition); return { id: room.id, name: room.label, playerCount: room.players.length, maxPlayers: 6, canJoin: room.players.length < 6, status: room.stage === 'waiting' ? 'Table Talk On' : `${room.stage[0].toUpperCase() + room.stage.slice(1)} hand`, stakesLabel: `Blinds ${stakesLabel(room.stakes)}` }; }); }
  async function publicState(request, response) {
    cors(request, response); const user = await getUser(request); if (!user) return json(response, 401, { error: 'Sign in is required.' });
    const balance = await wallet(user.id, user.role === 'owner'); const room = playerRoom.get(user.id) ? rooms.get(playerRoom.get(user.id)) : null;
    const onlineCount = LIVE_TABLES.reduce((count, definition) => count + getRoom(definition.id).players.filter((player) => !player.isAI).length, 0);
    return json(response, 200, { balance: balance.balance, tables: tableList(), onlineCount, aiCount: AI_ROSTER.length, table: room ? uiTable(room, user.id) : null });
  }
  async function join(request, response) {
    cors(request, response); const user = await getUser(request); if (!user) return json(response, 401, { error: 'Sign in is required to join a table.' });
    if (!await rate(request, 'poker_join', 12, 600)) return json(response, 429, { error: 'Please wait before joining another table.' });
    const body = await parseBody(request); const requestedTable = String(body?.tableId || 'yard-table');
    const definition = LIVE_TABLES.find((table) => table.id === requestedTable);
    if (!definition) return json(response, 400, { error: 'Choose an available live table.' });
    const room = getRoom(definition.id, definition.label);
    if (playerRoom.has(user.id)) return json(response, 200, { table: uiTable(rooms.get(playerRoom.get(user.id)), user.id), balance: (await wallet(user.id, user.role === 'owner')).balance });
    if (room.players.length >= 6) return json(response, 409, { error: 'That table is full.' });
    const balance = await wallet(user.id, user.role === 'owner'); const buyIn = tableBuyIn(room.stakes);
    if (Number(balance.balance) < buyIn) return json(response, 409, { error: `You need $${buyIn.toLocaleString()} available chips for this table.` });
    await applyChips(user.id, -buyIn, 'table_buy_in', room.id);
    room.players.push({ id: user.id, name: user.displayName, isAI: false, stack: buyIn, cards: [], roundBet: 0, handContribution: 0, folded: false, allIn: false, acted: false }); playerRoom.set(user.id, room.id);
    room.messages.push(`${user.displayName} took a seat.`); room.updatedAt = Date.now();
    if (room.players.length >= 2 && room.stage === 'waiting') await deal(room);
    return json(response, 200, { table: uiTable(room, user.id), balance: (await wallet(user.id, user.role === 'owner')).balance });
  }
  async function practice(request, response) {
    cors(request, response); const user = await getUser(request); if (!user) return json(response, 401, { error: 'Sign in is required to take a solo seat.' });
    const body = await parseBody(request);
    if (playerRoom.has(user.id) && !String(playerRoom.get(user.id)).startsWith('solo-')) return json(response, 409, { error: 'Leave your live table before taking a solo seat.' });
    const requestedStakes = stakesFor(String(body?.stakesId || DEFAULT_STAKES.id));
    const room = getRoom(playerRoom.get(user.id) || `solo-${user.id}-${requestedStakes.id}`, `${requestedStakes.label} / Solo Table`, requestedStakes);
    if (!playerRoom.has(user.id)) {
      const balance = await wallet(user.id, user.role === 'owner'); const buyIn = tableBuyIn(room.stakes);
      if (Number(balance.balance) < buyIn) return json(response, 409, { error: `You need $${buyIn.toLocaleString()} available chips for this table.` });
      await applyChips(user.id, -buyIn, 'table_buy_in', room.id);
      room.players.push({ id: user.id, name: user.displayName, isAI: false, stack: buyIn, cards: [], roundBet: 0, handContribution: 0, folded: false, allIn: false, acted: false }); playerRoom.set(user.id, room.id);
    }
    if (room.players.length < 2) {
      const requestedIds = Array.isArray(body?.aiIds) ? body.aiIds : [body?.aiId || body?.opponentName].filter(Boolean);
      const chosen = [...new Map(requestedIds.map((id) => AI_ROSTER.find((ai) => ai.id === String(id))).filter(Boolean).map((ai) => [ai.id, ai])).values()].slice(0, 8);
      if (!chosen.length) chosen.push(AI_ROSTER[randomInt(AI_ROSTER.length)]);
      const aiBuyIn = tableBuyIn(room.stakes);
      chosen.forEach((ai) => room.players.push({ ...ai, isAI: true, stack: aiBuyIn, cards: [], roundBet: 0, handContribution: 0, folded: false, allIn: false, acted: false }));
      room.messages.push(`${chosen.map((ai) => ai.name).join(', ')} took a seat at the solo table.`);
    }
    if (room.stage === 'waiting') await deal(room);
    return json(response, 200, { table: uiTable(room, user.id), balance: (await wallet(user.id, user.role === 'owner')).balance });
  }
  async function deal(room) {
    if (room.players.length < 2) return;
    room.deck = shuffledDeck(); room.board = []; room.pot = 0; room.currentBet = room.stakes.bigBlind; room.stage = 'preflop'; room.handId = crypto.randomUUID();
    for (const player of room.players) { player.cards = [room.deck.pop(), room.deck.pop()]; player.roundBet = 0; player.handContribution = 0; player.folded = false; player.allIn = false; player.acted = false; }
    const postBlind = async (player, amount) => { const payment = Math.min(amount, player.stack); player.stack -= payment; player.roundBet = payment; player.handContribution += payment; room.pot += payment; player.allIn = player.stack === 0; };
    await postBlind(room.players[0], room.stakes.smallBlind);
    await postBlind(room.players[1], room.stakes.bigBlind);
    room.turn = room.players.length === 2 ? 0 : 2; room.messages.push(`Hand dealt. Blinds: ${stakesLabel(room.stakes)}.`); room.updatedAt = Date.now(); await advanceAIs(room);
  }
  function active(room) { return room.players.filter((player) => !player.folded); }
  function nextTurn(room) { for (let i = 1; i <= room.players.length; i += 1) { const index = (room.turn + i) % room.players.length; if (!room.players[index].folded && !room.players[index].allIn) { room.turn = index; return; } } }
  async function settle(room, forcedWinner) {
    const contenders = active(room); if (!contenders.length) return;
    const atum = await recordAtumRake(room.pot, room.handId); let rakeRemaining = atum.rake;
    const levels = [...new Set(room.players.map((player) => Number(player.handContribution || 0)).filter(Boolean))].sort((a, b) => a - b);
    const awards = new Map(); let previous = 0;
    for (const level of levels) {
      const contributors = room.players.filter((player) => Number(player.handContribution || 0) >= level);
      const potSlice = (level - previous) * contributors.length; previous = level;
      const eligible = forcedWinner ? [forcedWinner] : contenders.filter((player) => Number(player.handContribution || 0) >= level);
      if (!eligible.length) continue;
      const best = forcedWinner ? eligible : eligible.reduce((winners, player) => { const score = handRank([...player.cards, ...room.board]); if (!winners.length || compareRank(score, handRank([...winners[0].cards, ...room.board])) > 0) return [player]; if (compareRank(score, handRank([...winners[0].cards, ...room.board])) === 0) winners.push(player); return winners; }, []);
      const distributable = potSlice - Math.min(rakeRemaining, potSlice); rakeRemaining -= Math.min(rakeRemaining, potSlice);
      best.forEach((player, index) => awards.set(player, (awards.get(player) || 0) + Math.floor(distributable / best.length) + (index < distributable % best.length ? 1 : 0)));
    }
    for (const [player, award] of awards) player.stack += award;
    const winners = [...awards.keys()]; const distributable = room.pot - atum.rake;
    room.stage = 'showdown'; const rakeNotice = atum.rake ? ` The Atum Account retained $${atum.rake} (15% of completed pot ${atum.completedPots}).` : '';
    room.messages.push(`${winners.map((player) => player.name).join(' and ')} won $${distributable} ${forcedWinner ? 'when the table folded.' : 'at showdown.'}${rakeNotice}`);
    const busted = room.players.filter((player) => !player.isAI && player.stack <= 0);
    busted.forEach((player) => { playerRoom.delete(player.id); room.messages.push(`${player.name} lost the all-in and was removed from the table. They may buy back in from their account balance.`); });
    room.players = room.players.filter((player) => player.isAI || player.stack > 0);
    room.updatedAt = Date.now();
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
    room.messages.push(`${room.stage[0].toUpperCase() + room.stage.slice(1)} is on the table.`); room.updatedAt = Date.now();
    // Nobody with chips can act: run the remaining board immediately and
    // settle the hand. This prevents an all-in river from stalling on a
    // player who has no chips left to wager.
    const nextActor = room.players.findIndex((player) => !player.folded && !player.allIn);
    if (nextActor === -1) return finishBetting(room);
    room.turn = nextActor; await advanceAIs(room);
  }
  async function perform(room, player, action, raiseBy = 0) {
    if (player.folded || player.allIn) return; const toCall = Math.max(0, room.currentBet - player.roundBet);
    if (action === 'fold') { player.folded = true; player.acted = true; room.messages.push(`${player.name} folded.`); }
    else {
      let payment = toCall; if (action === 'raise') { const minimumRaise = room.stakes.bigBlind; const maximumRaise = Math.max(minimumRaise * 100, 1000); const cappedRaise = Math.max(minimumRaise, Math.min(maximumRaise, Number(raiseBy) || minimumRaise)); payment += cappedRaise; room.currentBet = player.roundBet + payment; room.players.forEach((other) => { if (other !== player && !other.folded) other.acted = false; }); room.messages.push(`${player.name} raised $${cappedRaise}.`); } else room.messages.push(`${player.name} ${toCall ? `called $${toCall}` : 'checked'}.`);
      payment = Math.min(payment, player.stack); player.stack -= payment; player.roundBet += payment; player.handContribution += payment; room.pot += payment; player.allIn = player.stack === 0; player.acted = true;
    }
    room.updatedAt = Date.now(); nextTurn(room); await finishBetting(room); await advanceAIs(room);
  }
  function pokerSense(player, room, needed) {
    const values = player.cards.map((card) => ranks.indexOf(card[0]) + 2);
    const boardValues = room.board.map((card) => ranks.indexOf(card[0]) + 2);
    const pair = values[0] === values[1]; const boardMatch = values.some((value) => boardValues.includes(value));
    const suited = player.cards[0]?.[1] === player.cards[1]?.[1]; const connected = Math.abs(values[0] - values[1]) <= 2;
    const high = Math.max(...values, 0); let strength = (high - 2) * 3 + (pair ? 34 : 0) + (boardMatch ? 25 : 0) + (suited ? 7 : 0) + (connected ? 6 : 0);
    strength += (player.skill || 40) * 0.22 + randomInt(18) - 9;
    const pressure = needed / Math.max(room.stakes.bigBlind, player.stack || 1) * 100;
    return { strength, pressure };
  }
  async function advanceAIs(room) {
    const player = room.players[room.turn]; if (!player?.isAI || room.stage === 'waiting' || room.stage === 'showdown') return;
    clearTimeout(room.aiTimer); room.aiTimer = setTimeout(() => {
      const needed = Math.max(0, room.currentBet - player.roundBet); const { strength, pressure } = pokerSense(player, room, needed);
      const callThreshold = 36 + (player.discipline || 45) * 0.35 + (player.aggression || 45) * 0.14 - pressure;
      const unit = room.stakes.bigBlind;
      const bluff = randomInt(100) < (player.bluff || 20) && needed <= unit * 3;
      const action = needed && strength < callThreshold && !bluff ? 'fold' : strength > 72 - (player.aggression || 45) * 0.2 && player.stack > needed + unit ? 'raise' : 'call';
      const raiseBy = unit * (1 + Math.floor((player.aggression || 45) / 32) + randomInt(2));
      perform(room, player, action, raiseBy).catch(() => {});
    }, 750 + randomInt(900));
  }
  async function action(request, response) {
    cors(request, response); const user = await getUser(request); if (!user) return json(response, 401, { error: 'Sign in is required.' });
    if (!await rate(request, 'poker_action', 40, 600)) return json(response, 429, { error: 'Please slow down before your next move.' });
    const room = playerRoom.get(user.id) ? rooms.get(playerRoom.get(user.id)) : null; const body = await parseBody(request);
    if (!room || room.stage === 'waiting') return json(response, 409, { error: 'Join a table before playing.' });
    const player = room.players.find((seat) => seat.id === user.id); if (!player || room.players[room.turn] !== player) return json(response, 409, { error: 'It is not your turn.' });
    const kind = ['fold', 'call', 'raise'].includes(body?.action) ? body.action : null; if (!kind) return json(response, 400, { error: 'Choose fold, check/call, or raise.' });
    try { await perform(room, player, kind, body?.raiseBy || body?.amount); return json(response, 200, { table: uiTable(room, user.id), balance: (await wallet(user.id, user.role === 'owner')).balance }); }
    catch (error) { return json(response, error.message === 'INSUFFICIENT_CHIPS' ? 409 : 503, { error: error.message === 'INSUFFICIENT_CHIPS' ? 'You do not have enough chips for that wager.' : 'The table is temporarily unavailable.' }); }
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
      if (departing?.stack > 0) await applyChips(user.id, departing.stack, 'table_cash_out', room.id);
      room.players = room.players.filter((player) => player.id !== user.id); playerRoom.delete(user.id); room.messages.push(`${user.displayName} left the table with their remaining chips.`); room.updatedAt = Date.now();
      if (room.id.startsWith('solo-')) { clearTimeout(room.settleTimer); clearTimeout(room.aiTimer); rooms.delete(room.id); }
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
