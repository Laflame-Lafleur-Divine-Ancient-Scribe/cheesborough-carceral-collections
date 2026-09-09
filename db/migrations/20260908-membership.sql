CREATE TABLE IF NOT EXISTS member_subscriptions (
 stripe_subscription_id text PRIMARY KEY,
 stripe_customer_id text NOT NULL,
 user_id uuid REFERENCES community_users(id) ON DELETE SET NULL,
 tier text NOT NULL DEFAULT 'free',
 status text NOT NULL,
 access_until timestamptz,
 cancel_at_period_end boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS member_subscriptions_user_idx ON member_subscriptions(user_id);
CREATE TABLE IF NOT EXISTS member_webhook_events (id text PRIMARY KEY, processed_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS member_checkout_pending (
 user_id uuid PRIMARY KEY REFERENCES community_users(id) ON DELETE CASCADE,
 session_id text NOT NULL,
 tier text NOT NULL,
 expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS member_notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
 title varchar(120) NOT NULL,
 body varchar(12000) NOT NULL,
 source_url varchar(2000) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS member_notes_user_idx ON member_notes(user_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS member_claim_tokens (
 token_hash text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
 customer_id text NOT NULL,
 expires_at timestamptz NOT NULL,
 used_at timestamptz
);
CREATE TABLE IF NOT EXISTS member_content (
 resource_id text PRIMARY KEY,
 sections jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
