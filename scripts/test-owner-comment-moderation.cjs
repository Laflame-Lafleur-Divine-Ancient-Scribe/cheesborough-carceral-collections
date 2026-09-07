const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../owner-comment-moderation.js'), 'utf8');
function setup(options = {}) {
  const events = {}, changeEvents = {}, messages = [], calls = [];
  const action = { value: '', addEventListener(type, callback) { changeEvents[type] = callback; } };
  const reason = { value: '' }, confirmDelete = { checked: false }, button = {};
  const elements = Object.assign([action, reason, confirmDelete, button], { action, reason, confirmDelete });
  const status = { textContent: '' }, confirmation = { hidden: true };
  const form = { elements, dataset: { commentForm: 'comment-id' },
    querySelector: selector => selector === '[role="status"]' ? status : confirmation,
    addEventListener(type, callback) { events[type] = callback; },
    setAttribute() {}
  };
  const window = {};
  vm.runInNewContext(source, { window });
  window.CCCOwnerComments.bind({ querySelectorAll: () => [form] }, {
    request: async (path, optionsArg) => { calls.push({ path, ...optionsArg }); return options.request?.(); },
    reload: async () => { calls.push('reload'); return options.reload ? options.reload() : true; },
    notify: message => messages.push(message)
  });
  return { action, reason, confirmDelete, button, status, confirmation, calls, messages,
    change(value) { action.value = value; changeEvents.change(); },
    submit: () => events.submit({ preventDefault() {} })
  };
}
test('selecting Approve does not submit; Apply persists before refreshing counts', async () => {
  let resolveSave;
  const s = setup({ request: () => new Promise(resolve => { resolveSave = resolve; }) });
  s.change('approve');
  assert.equal(s.calls.length, 0);
  const pending = s.submit();
  assert.equal(s.calls.length, 1);
  assert.equal(s.calls[0].path, '/api/owner/comments/comment-id');
  assert.deepEqual(JSON.parse(s.calls[0].body), { action: 'approve', reason: '' });
  assert.equal(s.button.disabled, true);
  await s.submit();
  assert.equal(s.calls.length, 1, 'double Apply must not repeat the mutation');
  resolveSave(); await pending;
  assert.equal(s.calls[1], 'reload');
  assert.deepEqual(s.messages, ['Comment approved and published.']);
});
test('a failed save retains the decision and permits retry without showing success', async () => {
  const s = setup({ request: () => { throw new Error('Session expired'); } });
  s.change('approve'); s.reason.value = 'Reviewed'; await s.submit();
  assert.equal(s.action.value, 'approve');
  assert.equal(s.reason.value, 'Reviewed');
  assert.equal(s.button.disabled, false);
  assert.equal(s.status.textContent, 'Session expired');
  assert.equal(s.calls.length, 1);
  assert.equal(s.messages.length, 0);
});
test('a refresh failure reports that approval saved but counts need refreshing', async () => {
  const s = setup({ reload: () => false }); s.change('approve'); await s.submit();
  assert.match(s.messages[0], /approved and published.*Refresh/);
});
test('delete requires explicit inline confirmation', async () => {
  const s = setup(); s.change('delete');
  assert.equal(s.confirmation.hidden, false);
  await s.submit(); assert.equal(s.calls.length, 0);
  s.confirmDelete.checked = true; await s.submit();
  assert.equal(JSON.parse(s.calls[0].body).action, 'delete');
});
test('changing away from delete resets its confirmation', () => {
  const s = setup(); s.change('delete'); s.confirmDelete.checked = true; s.change('approve');
  assert.equal(s.confirmation.hidden, true); assert.equal(s.confirmDelete.checked, false);
});
test('Apply without an action does not mutate the comment', async () => {
  const s = setup(); await s.submit(); assert.equal(s.calls.length, 0);
  assert.match(s.status.textContent, /Choose a moderation action/);
});
