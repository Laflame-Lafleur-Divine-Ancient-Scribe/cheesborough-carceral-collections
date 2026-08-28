# Community accounts

In Railway set `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`, `APP_URL`, `NODE_ENV`, `EMAIL_FROM`, `EMAIL_API_KEY`, and `ALLOWED_ORIGINS=https://carceralcollections.org,https://www.carceralcollections.org`. Run `db/schema.sql` once against Railway PostgreSQL. The public site currently uses `https://serviceapi-production-f574.up.railway.app` directly; its CORS configuration must continue to allow both public site domains. Email verification and password resets are prepared in the schema but intentionally not enabled yet.

For a future article, load `community-auth.js` and `article-comments.js`, then add `<section data-community-comments data-resource-id="stable-article-id"></section>`.
