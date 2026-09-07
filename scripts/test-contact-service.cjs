const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createContactService, validateInquiry } = require('../lib/contact-service');
const valid = { name: 'Test Reader', email: 'reader@example.com', topic: 'research', message: 'This is an isolated test inquiry.', website: '' };
function fixture(options = {}) {
  const sends = [], rates = [];
  const handler = createContactService({
    env: options.env || { RESEND_API_KEY: 'test-only', CONTACT_FROM_EMAIL: 'Archive <sender@example.com>' },
    parseBody: async () => options.body === undefined ? valid : options.body,
    json: (response, status, body) => Object.assign(response, { status, body }),
    rate: async (...args) => { rates.push(args); return options.allowed !== false; },
    fetchImpl: async (url, request) => { sends.push({ url, request }); if (options.throw) throw new Error('provider-secret-error'); return { ok: options.accepted !== false, json: async () => options.receipt === undefined ? { id: 'mail-test' } : options.receipt }; }
  });
  return { sends, rates, async submit() { const response = {}; await handler({}, response); return response; } };
}
test('sends a fixed-recipient plain-text inquiry with visitor Reply-To', async () => {
  const f = fixture({ body: { ...valid, to: 'attacker@example.net', from: 'forged@example.net' } });
  const response = await f.submit();
  assert.equal(response.status, 200); assert.equal(response.body.ok, true);
  const payload = JSON.parse(f.sends[0].request.body);
  assert.deepEqual(payload.to, ['Contact@carceralcollections.org']);
  assert.equal(payload.reply_to, valid.email);
  assert.equal(payload.from, 'Archive <sender@example.com>');
  assert.match(payload.text, /isolated test inquiry/);
  assert.equal(payload.html, undefined);
  assert.equal(f.rates[0][1], 'contact-inquiry');
  assert.equal(f.rates[0][2], 5);
});
test('payment topic still goes to the requested Contact inbox', async () => {
  const f = fixture({ body: { ...valid, topic: 'payment' } }); await f.submit();
  assert.deepEqual(JSON.parse(f.sends[0].request.body).to, ['Contact@carceralcollections.org']);
});
test('missing mail configuration never reports success or calls the provider', async () => {
  const f = fixture({ env: {} }); const result = await f.submit();
  assert.equal(result.status, 503); assert.equal(f.sends.length, 0); assert.equal(result.body.ok, undefined);
});
test('rate limiting stops delivery', async () => {
  const f = fixture({ allowed: false }); assert.equal((await f.submit()).status, 429); assert.equal(f.sends.length, 0);
});
for (const extra of [{ accepted: false }, { receipt: {} }, { throw: true }]) {
  test('provider failure or absent receipt does not falsely report sent: ' + JSON.stringify(extra), async () => {
    const f = fixture(extra); const result = await f.submit();
    assert.equal(result.status, 502); assert.equal(result.body.ok, undefined);
    assert.doesNotMatch(result.body.error, /provider-secret/);
  });
}
for (const body of [null, [], { ...valid, name: 'Header\r\nInjection' }, { ...valid, email: 'x@x.com\nBcc:other@x.com' }, { ...valid, topic: '__proto__' }, { ...valid, message: 'short' }, { ...valid, message: 'a'.repeat(5001) }, { ...valid, website: 'spam.example' }]) {
  test('invalid or honeypot input cannot send: ' + JSON.stringify(body).slice(0,100), async () => {
    assert.equal(validateInquiry(body), null);
    const f = fixture({ body }); assert.equal((await f.submit()).status, 400); assert.equal(f.sends.length, 0);
  });
}
test('same message gets the same provider idempotency key on retry', async () => {
  const f = fixture(); await f.submit(); await f.submit();
  assert.equal(f.sends[0].request.headers['Idempotency-Key'], f.sends[1].request.headers['Idempotency-Key']);
});
