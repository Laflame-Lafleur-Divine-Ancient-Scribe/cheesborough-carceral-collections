# Stripe Checkout setup

The public Donate page sends support requests to the Railway service. The service creates a Stripe-hosted Checkout page, so card details never pass through this repository or GitHub Pages.

## Railway variables

In the Railway service that deploys `server.js`, add these variables:

```text
STRIPE_SECRET_KEY=sk_test_...
PUBLIC_SITE_URL=https://carceralcollections.org
```

Use an `sk_test_...` key while testing. When Stripe account verification and live payouts are ready, replace it in Railway with the live `sk_live_...` key. Do not add either key to a source file, GitHub secret, browser script, or chat.

`ALLOWED_ORIGINS` must continue to include:

```text
https://carceralcollections.org,https://www.carceralcollections.org
```

## What the checkout supports

- One-time support: donor-entered USD amount from $1.00 through $10,000.00.
- Monthly support: $3 Plugged In, $6 Full Member, or $9 Legacy Circle.
- Success and cancel returns: `DONATE.html?donation=success` and `DONATE.html?donation=cancelled`.

## Test before going live

1. Add the test key in Railway and wait for the service deploy.
2. Open `DONATE.html`, choose a one-time amount or a monthly level, and continue to Checkout.
3. In Stripe test mode, use the documented success test card `4242 4242 4242 4242` with any future expiration and CVC.
4. Confirm that Stripe shows the payment or subscription and that the site returns to the thank-you message.
5. Complete Stripe’s live-account verification, replace only the Railway key with the live key, and repeat a small live test.

Stripe is the source of truth for payment and subscription status. Add webhooks before tying donor access, fulfillment, or member-only privileges to successful payments.
