(() => {
  'use strict';
  const form = document.getElementById('contact-form');
  if (!form) return;
  const button = document.getElementById('contact-submit');
  const status = document.getElementById('contact-status');
  const endpoint = /^(localhost|127\.0\.0\.1)$/i.test(location.hostname)
    ? '/api/contact' : 'https://serviceapi-production-f574.up.railway.app/api/contact';
  const topics = ['research', 'contribution', 'correction', 'press', 'payment', 'other'];
  let sending = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending || !form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form).entries());
    const payload = Object.fromEntries(['name', 'email', 'topic', 'message', 'website'].map((key) => [key, String(values[key] || '').trim()]));
    if (!payload.name || payload.name.length > 100 || payload.email.length > 254 || payload.message.length < 10 || payload.message.length > 5000 || !topics.includes(payload.topic)) {
      status.dataset.state = 'error';
      status.textContent = 'Please check your name, email, and message. Your message needs 10–5,000 characters.';
      return;
    }
    sending = true;
    button.disabled = true;
    button.textContent = 'Sending…';
    form.setAttribute('aria-busy', 'true');
    status.dataset.state = 'loading';
    status.textContent = 'Sending your inquiry…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal, credentials: 'omit' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true) throw new Error('delivery-unconfirmed');
      form.reset();
      status.dataset.state = 'success';
      status.textContent = 'Thank you. Your inquiry has been sent to Contact@carceralcollections.org.';
    } catch {
      status.dataset.state = 'error';
      status.textContent = 'We could not confirm delivery. Your message is still here. Please try again or ';
      const emailLink = document.createElement('a');
      emailLink.href = 'mailto:Contact@carceralcollections.org';
      emailLink.textContent = 'email Contact@carceralcollections.org directly';
      status.append(emailLink, '.');
    } finally {
      clearTimeout(timeout);
      sending = false;
      button.disabled = false;
      button.replaceChildren('Send Inquiry ');
      const arrow = document.createElement('span');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '↗';
      button.append(arrow);
      form.removeAttribute('aria-busy');
    }
  });
})();
