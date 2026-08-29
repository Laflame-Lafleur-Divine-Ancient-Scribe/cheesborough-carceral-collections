# Protected Atum owner account

The owner account is configured only on Railway, never in browser code or this repository.

1. In the Railway ServiceAPI service, add `OWNER_ACCOUNT_EMAIL` with the email used by the Atum account.
2. Redeploy the service. On schema initialization, the service designates that exact existing account as `owner` and removes the owner role from every other account.
3. Sign in to that account, open `PROFILE.html`, and select **Owner dashboard**.

The owner role cannot be created by registration or supplied through ordinary API requests. If `OWNER_ACCOUNT_EMAIL` is absent, owner-only endpoints fail closed.

For future email delivery, configure these Railway variables only after selecting an email provider:

```text
EMAIL_FROM=Carceral Collections <contact@carceralcollections.org>
EMAIL_REPLY_TO=contact@carceralcollections.org
EMAIL_API_KEY=provider secret
```

Never place passwords, provider keys, or reset tokens in this repository.
