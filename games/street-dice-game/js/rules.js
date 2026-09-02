export const STATES = Object.freeze({ WAITING_FOR_BET: 'WAITING_FOR_BET', COME_OUT: 'COME_OUT', POINT_ACTIVE: 'POINT_ACTIVE', ROUND_OVER: 'ROUND_OVER' });
export const getRollTotal = (dice) => dice.reduce((sum, value) => sum + value, 0);
export function resolveComeOutRoll(total, side) {
  if (side === 'PASS') {
    if (total === 7 || total === 11) return { outcome: 'win', message: total === 7 ? 'Natural 7! Pass Line Wins!' : 'Yo Eleven! Pass Line Wins!' };
    if ([2, 3, 12].includes(total)) return { outcome: 'lose', message: total === 2 ? 'Snake Eyes! Pass Line Loses!' : total === 3 ? 'Ace-Deuce! Pass Line Loses!' : 'Boxcars! Pass Line Loses!' };
  } else {
    if ([2, 3].includes(total)) return { outcome: 'win', message: `Come-out ${total}! Don’t Pass Wins!` };
    if (total === 12) return { outcome: 'push', message: 'Boxcars! Don’t Pass Pushes.' };
    if ([7, 11].includes(total)) return { outcome: 'lose', message: `Come-out ${total}! Don’t Pass Loses!` };
  }
  return { outcome: 'point', point: total, message: `Point Established: ${total}` };
}
export function resolvePointRoll(total, point, side) {
  if (total === point) return { outcome: side === 'PASS' ? 'win' : 'lose', message: side === 'PASS' ? 'Point Hit! Shooter Wins!' : 'Point Hit! Don’t Pass Loses!' };
  if (total === 7) return { outcome: side === 'PASS' ? 'lose' : 'win', sevenOut: true, message: side === 'PASS' ? 'Seven-Out! Shooter Loses!' : 'Seven-Out! Don’t Pass Wins!' };
  return { outcome: 'continue', message: 'No Decision. Roll Again.' };
}
export const resolvePassBet = (total, point, phase) => phase === STATES.COME_OUT ? resolveComeOutRoll(total, 'PASS') : resolvePointRoll(total, point, 'PASS');
export const resolveDontPassBet = (total, point, phase) => phase === STATES.COME_OUT ? resolveComeOutRoll(total, 'DONT_PASS') : resolvePointRoll(total, point, 'DONT_PASS');
export const establishPoint = (total) => [4, 5, 6, 8, 9, 10].includes(total) ? total : null;
export function settleWager(player, wager, outcome) { if (outcome === 'win') { player.balance += wager; player.wins++; } else if (outcome === 'lose') { player.balance -= wager; player.losses++; } return player; }
