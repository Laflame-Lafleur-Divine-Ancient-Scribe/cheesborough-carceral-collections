# Community accounts

In Railway set `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`, `APP_URL`, `NODE_ENV`, `EMAIL_FROM`, `EMAIL_API_KEY`, and `ALLOWED_ORIGINS=https://carceralcollections.org,https://www.carceralcollections.org`.

## Database Provisioning
Run `db/schema.sql` (or allow `ensureCommunitySchema()` on server boot) against Railway PostgreSQL.
The Yard Community tables (`community_posts`, `community_post_comments`, `community_post_reactions`) are automatically ensured on deployment.

## The Yard Community Hub Endpoints
- `GET /api/community/posts`: Lists live discussion posts with category filters, reaction state, and comment threads.
- `POST /api/community/posts`: Authenticated endpoint to publish a new discussion post.
- `POST /api/community/posts/:id/react`: Authenticated toggle to support/react to a post.
- `POST /api/community/posts/:id/comments`: Authenticated reply submission to a post.

For a future article, load `community-auth.js` and `article-comments.js`, then add `<section data-community-comments data-resource-id="stable-article-id"></section>`.

