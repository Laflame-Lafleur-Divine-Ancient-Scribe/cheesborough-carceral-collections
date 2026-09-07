# Contact inquiry delivery

`POST /api/contact` sends inquiries to **Contact@carceralcollections.org**.
The separate **Payments@carceralcollections.org** address is shown as a direct email link. Form submissions, including the Payment Inquiry topic, go to Contact as requested.

Contact inquiries and password resets share the email transport. Use the existing IONOS mailbox through SMTP or Resend's HTTPS API. No mailbox password or API key belongs in a public page or this repository.

For IONOS, set these variables privately in Railway ServiceAPI:

- `EMAIL_TRANSPORT=smtp`
- `SMTP_HOST`: the outgoing server from your IONOS mailbox settings.
- `SMTP_PORT=465` (TLS) or `587` (required STARTTLS).
- `SMTP_USER`: the full sending mailbox address.
- `SMTP_PASS`: that mailbox's password, entered directly in Railway.
- `EMAIL_FROM=Carceral Collections <Contact@carceralcollections.org>` (must be an authorized sending address).
- `PUBLIC_SITE_URL=https://carceralcollections.org`

Ensure Contact@carceralcollections.org and Payments@carceralcollections.org exist as receiving mailboxes or aliases. DNS mail records alone do not create mailboxes. SMTP delivery also requires outbound SMTP connectivity from the Railway plan; use the HTTPS option below if SMTP is unavailable.

For Resend instead, set `EMAIL_TRANSPORT=resend` and configure:

- `RESEND_API_KEY`: a sending API key from the email provider account.
- `CONTACT_FROM_EMAIL`: an email address on a domain verified for sending in Resend, optionally `Carceral Collections <address@verified-domain>`.
- `REDIS_URL`: the existing Redis connection, used to limit public inquiries to five per IP per 15 minutes.
- Keep the public site origins in the existing `ALLOWED_ORIGINS` configuration.

The recipient is fixed server-side. The visitor's email is used only as Reply-To. Inquiries use plain text, length validation, a honeypot, origin checks, and rate limiting. Resend uses idempotency keys for identical requests within a 15-minute window; SMTP uses a stable Message-ID but does not guarantee deduplication.

Without email configuration the form returns a clear unavailable message. It never claims an email was sent when the provider has not accepted it. Browser errors retain the entered message.

After deploying the backend and configuring the variables, send an explicitly authorized test inquiry and check receipt in Contact@carceralcollections.org. Provider acceptance alone does not prove inbox delivery.

## Password resets

LOGIN.html links to RESET-PASSWORD.html. Reset links expire after 30 minutes and work once. Only token hashes are stored. Resetting a password revokes existing sessions. Requests are limited by IP and email address; the response does not disclose whether an account exists. Keep DATABASE_URL, REDIS_URL, and ALLOWED_ORIGINS configured. The backend applies the schema additions on initialization.

## Subscription cancellation

SUBSCRIPTIONS.html is linked from Donate and Profile. This manages existing paid Stripe subscriptions; it is not a newsletter mailing list.

In Stripe's customer portal settings, enable subscription cancellation and choose your cancellation timing. Set `STRIPE_PORTAL_CONFIGURATION_ID` in Railway if using a nondefault portal configuration. Keep the existing STRIPE_SECRET_KEY configured. Enable Stripe's customer portal login link and set its full `https://billing.stripe.com/p/login/...` URL as `STRIPE_CUSTOMER_PORTAL_URL` in Railway. This lets guest donors manage subscriptions using their billing email. Signed-in members use their server-stored Stripe customer ID.

Deploy both the frontend and Railway backend. Check an authorized test account's reset email receipt, link expiry/reuse, and old-session rejection; check receipt of an authorized contact inquiry; use a Stripe test subscription to verify cancellation. Unit tests use mocks and do not prove inbox delivery or live Stripe configuration. Do not cancel a real supporter subscription for testing.

Reference: https://resend.com/docs/api-reference/emails/send-email
