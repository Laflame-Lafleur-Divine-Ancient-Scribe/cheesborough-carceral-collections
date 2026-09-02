import '../community-auth.js';

const blockedEvents = ['click', 'pointerdown', 'keydown', 'submit'];
let gate = null;

// Keep the game quiet while the existing account session is checked. This stops
// a visitor from starting a game in the brief interval before an auth response.
const blockUntilReady = (event) => {
  if (!gate || !gate.contains(event.target)) event.stopImmediatePropagation();
};

for (const type of blockedEvents) document.addEventListener(type, blockUntilReady, true);

function releaseGame() {
  for (const type of blockedEvents) document.removeEventListener(type, blockUntilReady, true);
}

function mountSignInGate() {
  gate = document.createElement('section');
  gate.className = 'ccc-game-auth-gate';
  gate.setAttribute('role', 'dialog');
  gate.setAttribute('aria-modal', 'true');
  gate.setAttribute('aria-labelledby', 'ccc-game-auth-title');
  gate.innerHTML = `
    <div class="ccc-game-auth-card">
      <p>Cheesborough Carceral Collections</p>
      <h1 id="ccc-game-auth-title">Sign in to play</h1>
      <p>Games are available to signed-in community members. Virtual chips are for gameplay only.</p>
      <a class="ccc-game-auth-link" href="../../LOGIN.html?returnTo=${encodeURIComponent(location.pathname + location.search)}">Sign In</a>
      <a class="ccc-game-auth-back" href="../../GAMES.html">Return to Games Hub</a>
    </div>`;

  const style = document.createElement('style');
  style.id = 'ccc-game-auth-style';
  style.textContent = `.ccc-game-auth-gate{align-items:center;background:linear-gradient(135deg,#071523ed,#3c2c20ed);display:flex;inset:0;justify-content:center;padding:1rem;position:fixed;z-index:99999}.ccc-game-auth-card{background:#102338;border:1px solid #c69a45;box-shadow:9px 10px 0 #0008;color:#f2e5c7;max-width:32rem;padding:2rem;text-align:center}.ccc-game-auth-card p:first-child{color:#d6ad5c;font:700 .72rem Georgia,serif;letter-spacing:.13em;text-transform:uppercase}.ccc-game-auth-card h1{font:800 clamp(2rem,8vw,3.4rem)/.95 Georgia,serif;margin:.55rem 0}.ccc-game-auth-link,.ccc-game-auth-back{display:inline-block;font:700 .9rem Arial,sans-serif;margin:.5rem;padding:.75rem 1rem;text-decoration:none}.ccc-game-auth-link{background:#c69a45;color:#17130f}.ccc-game-auth-back{border:1px solid #c69a45;color:#f2e5c7}`;
  document.head.append(style);

  const appendGate = () => document.body.append(gate);
  if (document.body) appendGate();
  else document.addEventListener('DOMContentLoaded', appendGate, { once: true });
}

async function checkExistingSession() {
  try {
    const user = await window.CCCCommunity?.restoreSession?.();
    if (user) {
      releaseGame();
      return;
    }
  } catch {
    // The account module treats unavailable and anonymous sessions alike here.
  }
  mountSignInGate();
}

checkExistingSession();
