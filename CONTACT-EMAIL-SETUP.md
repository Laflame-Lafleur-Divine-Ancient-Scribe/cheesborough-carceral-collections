# Contact inquiry delivery

`POST /api/contact` sends inquiries to **Contact@carceralcollections.org**.
The separate **Payments@carceralcollections.org** address is shown as a direct email link. Form submissions, including the Payment Inquiry topic, go to Contact as requested.

The prepared transport uses Resend's HTTPS email API. No mailbox password or API key belongs in a public page or this repository.

In the Railway **ServiceAPI** service, configure:

- `RESEND_API_KEY`: a sending API key from the email provider account.
- `CONTACT_FROM_EMAIL`: an email address on a domain verified for sending in Resend, optionally `Carceral Collections <address@verified-domain>`.
- `REDIS_URL`: the existing Redis connection, used to limit public inquiries to five per IP per 15 minutes.
- Keep the public site origins in the existing `ALLOWED_ORIGINS` configuration.

The recipient is fixed server-side. The visitor's email is used only as Reply-To. Inquiries use plain text, length validation, a honeypot, origin checks, rate limiting, and provider idempotency keys for identical requests within a 15-minute window.

Without email configuration the form returns a clear unavailable message. It never claims an email was sent when the provider has not accepted it. Browser errors retain the entered message.

After deploying the backend and configuring the variables, send an explicitly authorized test inquiry and check receipt in Contact@carceralcollections.org. Provider acceptance alone does not prove inbox delivery.

If the existing mailbox uses a different sending service, adapt the transport in `lib/contact-service.js`; a receiving mailbox alone does not supply outbound API access.

Reference: https://resend.com/docs/api-reference/emails/send-email
