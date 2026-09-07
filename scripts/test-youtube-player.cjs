const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../youtube-player.js'), 'utf8');

function setup({ api = true, embeddable = true } = {}) {
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.isConnected = true; this.listeners = {}; }
    append(...items) { this.children.push(...items); }
    replaceChildren(...items) { this.children = items; }
    setAttribute(key, value) { this[key] = value; }
    addEventListener(event, callback) { this.listeners[event] = callback; }
    remove() { this.isConnected = false; }
  }
  const timers = new Map(), players = [], head = new Element('head');
  let timerID = 0;
  const window = {};
  if (api) window.YT = { Player: function (frame, options) {
    this.frame = frame; this.events = options.events; this.destroy = () => { this.destroyed = true; };
    players.push(this);
  } };
  vm.runInNewContext(source, { window, document: { head, createElement: tag => new Element(tag), addEventListener() {} },
    location: { origin: 'https://carceralcollections.org' }, URLSearchParams,
    setTimeout(fn, ms) { timers.set(++timerID, { fn, ms }); return timerID; },
    clearTimeout(id) { timers.delete(id); }
  });
  const container = new Element('div');
  const control = window.CCCYouTubePlayer.mount(container, { embed: 'SeVBrR0VIJI', title: 'Reported video', embeddable });
  return { container, control, players, timers, head, window };
}
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
const text = node => [node.textContent || '', ...node.children.map(text)].join(' ');

test('identifies the site, keeps privacy enhanced embedding, and clears the connection timeout on ready', async () => {
  const s = setup(); await flush();
  const frame = s.players[0].frame, url = new URL(frame.src);
  assert.equal(url.hostname, 'www.youtube-nocookie.com');
  assert.equal(url.searchParams.get('origin'), 'https://carceralcollections.org');
  assert.equal(url.searchParams.get('enablejsapi'), '1');
  assert.equal(frame.referrerPolicy, 'strict-origin-when-cross-origin');
  s.players[0].events.onReady();
  assert.equal(s.timers.size, 0);
  assert.equal(s.container.children[0].tag, 'iframe');
});

for (const code of [2, 100, 101, 150, 153, 999]) {
  test(`YouTube error ${code} removes the failed frame and offers the correct original video`, async () => {
    const s = setup(); await flush();
    s.players[0].events.onError({ data: code });
    assert.equal(s.players[0].destroyed, true);
    const panel = s.container.children[0];
    assert.equal(panel.role, 'status');
    const link = panel.children.find(node => node.tag === 'a');
    assert.equal(link.href, 'https://www.youtube.com/watch?v=SeVBrR0VIJI');
    assert.equal(s.timers.size, 0);
    panel.children.find(node => node.tag === 'button').listeners.click();
    await flush();
    assert.equal(s.players.length, 2);
    s.players[0].events.onError({ data: 100 });
    assert.equal(s.container.children[0].tag, 'iframe', 'stale errors cannot replace a new player');
  });
}
test('HTML5 playback failure retries once, then recovers without looping', async () => {
  const s = setup(); await flush();
  s.players[0].events.onError({ data: 5 }); await flush();
  assert.equal(s.players.length, 2);
  assert.equal(s.players[0].destroyed, true);
  assert.equal(s.container.children[0].tag, 'iframe');
  s.players[1].events.onError({ data: 5 }); await flush();
  assert.equal(s.players.length, 2);
  assert.match(text(s.container), /could not play/);
});
test('known publisher restrictions skip the iframe', async () => {
  const s = setup({ embeddable: false }); await flush();
  assert.equal(s.players.length, 0);
  assert.match(text(s.container), /publisher does not allow/);
});
test('a player that never becomes ready provides recovery', async () => {
  const s = setup(); await flush();
  [...s.timers.values()][0].fn();
  assert.match(text(s.container), /could not connect/);
  assert.equal(s.players[0].destroyed, true);
});
test('blocked API scripts provide recovery and can be retried', async () => {
  const s = setup({ api: false });
  s.head.children[0].onerror(); await flush();
  assert.match(text(s.container), /could not connect/);
  s.control.reload(); await flush();
  assert.equal(s.head.children.length, 2);
});
test('API script timeout provides recovery', async () => {
  const s = setup({ api: false });
  [...s.timers.values()][0].fn(); await flush();
  assert.match(text(s.container), /could not connect/);
});
test('rapid reload only creates the latest requested player', async () => {
  const s = setup(); s.control.reload(); s.control.reload(); await flush();
  assert.equal(s.players.length, 1);
  s.control.destroy();
  assert.equal(s.timers.size, 0);
});
