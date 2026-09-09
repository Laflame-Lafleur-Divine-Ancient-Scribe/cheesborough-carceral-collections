# Membership operations

The Reading Room (`MEMBERS.html`) is the member entrance. All existing public articles remain readable. Their added membership links lead to protected reading guides ($3), case reading collections ($6), and a private research notebook ($9). These are cumulative monthly USD prices, not one-time payments. One-time giving remains independent.

## Where data lives

- Public source: previews and tier metadata only in `lib/membership-catalog.js`. No paid reading bodies may be committed to this public repository.
- Private reading: PostgreSQL `member_content`, published through an owner-only endpoint. The prepared six-reading import is saved locally in ignored `private/membership-seed.json`. Keep a private backup; it is intentionally not deployed to GitHub or included in the public artifact.
- Personal notebook: PostgreSQL `member_notes`, scoped to the authenticated account on every request. Users keep read, download, and delete access after cancellation; creating/editing requires Legacy Circle.
- Stripe remains the billing authority. `member_subscriptions` is a reconciled access projection. The additive migration runs automatically through the membership service; it does not drop existing data.
- The public build excludes backend code, private folders, database files, credentials, and working documents. Railway's static server also refuses those paths. Old publicly published archive copies remain public; this release does not claim to erase past publication.

## Activation checklist

1. Deploy the code to Railway and the public files through the Pages workflow. Pages runs 48 isolated membership/account/analytics checks before upload. Tests use temporary PGlite, never production `DATABASE_URL`.
2. Verify existing Railway account configuration: `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`, `OWNER_ACCOUNT_EMAIL`, allowed site origins, and the email delivery settings already used for account recovery.
3. Verify `STRIPE_SECRET_KEY`, the three monthly Price IDs (`STRIPE_PRICE_PLUGGED_IN`, `STRIPE_PRICE_FULL_MEMBER`, `STRIPE_PRICE_LEGACY_CIRCLE`), and `STRIPE_WEBHOOK_SECRET`. Prices must be active, USD, recurring monthly, interval count 1, and exactly 300/600/900 cents. The existing Managed Payments integration is retained and requires compatible Stripe account configuration.
4. Stripe webhook URL: `https://serviceapi-production-f574.up.railway.app/api/stripe/webhook`. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, and `invoice.payment_failed`. Use the endpoint's signing secret in the matching environment. Do not put keys or signing secrets in frontend files or chat.
5. Configure a Stripe customer portal with cancellation at period end, payment-method updates, invoices, and subscription price changes among the three products. Show prorations before confirmation; configure decreases to take effect at period end. Set `STRIPE_PORTAL_CONFIGURATION_ID` to that configuration. An optional `STRIPE_CUSTOMER_PORTAL_URL` must be the Stripe-hosted `/p/login/` URL for guest billing access. The application requires an active cancellation-enabled portal before creating a portal session; verify price-change settings in Stripe too.
6. Sign in as the configured owner, open Reading Room, choose the prepared local JSON file under “Publish member reading,” and submit it. The owner endpoint validates the resource IDs and text structure, stores the bodies privately, and returns the number published. Subscriber roles cannot publish. Checkout stays disabled until all six advertised readings are present and required Stripe variables exist.
7. Verify actual signed-in $3/$6/$9 users, successful payment return, cancellation, upgrade and downgrade, failed renewal, and guest claim in Stripe test mode before accepting real payments. Verify on phone browsers as well as desktop. Do not call a payment complete based on `membership=success` in the URL.

## Lifecycle and recovery

- New subscription checkout requires login. Tier comes from the server's configured Stripe Price ID; browser metadata cannot grant access.
- Existing active/incomplete subscriptions route to the portal, avoiding a second subscription. Concurrent checkout requests are serialized by account; an open session is reused, and switching tiers expires the old unpaid session.
- Paid active subscriptions unlock through the paid period. Trials and unpaid first invoices do not unlock. Failed renewals have at most three days beyond the prior paid access; retries do not extend grace or promote the tier.
- Subscription changes are read back from Stripe under a customer lock. Processed event IDs are recorded transactionally. Old webhook payloads cannot overwrite current Stripe state. Access reads reconcile stale subscription state after five minutes; the refresh button reconciles explicitly.
- Existing guest subscribers use “Link an existing subscription.” Proof goes to the billing mailbox. A random token is stored only as a hash, expires after 30 minutes, and can be consumed only once by the requesting account. Ambiguous multiple customer records or an already-linked billing account require support rather than guessing ownership.
- A full refund does not by itself cancel a Stripe subscription. Operators must also cancel/revoke the subscription when access should end. Partial refunds have no automatic access effect.
- Email or service failures produce retry/help messages and never fabricate a successful claim or access grant.

## Local verification

Start `node server.js` and visit `http://localhost:8080/MEMBERS.html`. Without local secrets, public previews and the signed-out gate work; checkout reports unavailable.

Run `node --test scripts/test-membership.cjs scripts/test-account-email.cjs scripts/test-owner-analytics.cjs` with `PGLITE_MODULE_PATH` pointing to an isolated installation of `@electric-sql/pglite@0.5.8`. JavaScript syntax and `git diff --check` are also required. The build helper is `node scripts/prepare-public-site.cjs`; it requires a fresh output directory and never recursively deletes an existing one.

Browser review passed desktop/tablet/mobile: no horizontal overflow, correct required-tier dialog, Escape/focus restoration, and preview retention. Production Stripe configuration, private content import, and real authenticated payment return remain separate activation checks.

References: [Stripe subscription lifecycle](https://docs.stripe.com/billing/subscriptions/webhooks), [Stripe portal configuration](https://docs.stripe.com/customer-management/configure-portal), [GitHub Pages static hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
