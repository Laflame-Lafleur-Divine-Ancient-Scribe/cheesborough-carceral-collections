'use strict';
const crypto = require('node:crypto');
const recipient = 'Contact@carceralcollections.org';
const topics = { research: 'Research', contribution: 'Archive Contribution', correction: 'Correction', press: 'Press', payment: 'Payment Inquiry', other: 'General Inquiry' };

function validateInquiry(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const fields = ['name', 'email', 'topic', 'message'];
  if (fields.some(key => typeof body[key] !== 'string')) return null;
  const data = Object.fromEntries(fields.map(key => [key, body[key].trim()]));
  if (body.website || !data.name || data.name.length > 100 || /[\r\n\x00]/.test(data.name)) return null;
  if (data.email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(data.email)) return null;
  if (!Object.hasOwn(topics, data.topic) || data.message.length < 10 || data.message.length > 5000 || /\x00/.test(data.message)) return null;
  return data;
}

function createContactService({ parseBody, json, rate, env = process.env, fetchImpl = globalThis.fetch }) {
  return async function contact(request, response) {
    const data = validateInquiry(await parseBody(request, 24000));
    if (!data) return json(response, 400, { error: 'Please check your name, email, topic, and message (10–5,000 characters).' });
    if (!env.RESEND_API_KEY || !env.CONTACT_FROM_EMAIL || /[\r\n]/.test(env.CONTACT_FROM_EMAIL)) {
      return json(response, 503, { error: 'The inquiry form is not connected to email delivery yet. Please email Contact@carceralcollections.org directly.' });
    }
    if (!await rate(request, 'contact-inquiry', 5, 900)) {
      return json(response, 429, { error: 'Please wait before sending another inquiry, or email Contact@carceralcollections.org directly.' });
    }
    const payload = {
      from: env.CONTACT_FROM_EMAIL,
      to: [recipient],
      reply_to: data.email,
      subject: `Website Inquiry: ${topics[data.topic]}`,
      text: `Name: ${data.name}\nEmail: ${data.email}\nTopic: ${topics[data.topic]}\n\n${data.message}`
    };
    // A retry of the same inquiry within this window must not send duplicate mail.
    const key = crypto.createHash('sha256').update(JSON.stringify(payload) + ':' + Math.floor(Date.now() / 900000)).digest('hex');
    try {
      const result = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `contact-${key}` },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(12000)
      });
      const receipt = await result.json().catch(() => null);
      if (!result.ok || typeof receipt?.id !== 'string' || !receipt.id) throw new Error('Mail not accepted');
      return json(response, 200, { ok: true, message: 'Your inquiry has been sent to Contact@carceralcollections.org.' });
    } catch {
      return json(response, 502, { error: 'Email delivery could not be confirmed. Your message is still in the form. Try again or email Contact@carceralcollections.org directly.' });
    }
  };
}
module.exports = { createContactService, validateInquiry };
