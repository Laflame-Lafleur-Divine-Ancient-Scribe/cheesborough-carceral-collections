-- The Yard Community Schema Migration
CREATE TABLE IF NOT EXISTS community_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id uuid NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
    category varchar(32) NOT NULL DEFAULT 'general',
    content text NOT NULL,
    tags jsonb NOT NULL DEFAULT '[]'::jsonb,
    pinned boolean NOT NULL DEFAULT false,
    status varchar(16) NOT NULL DEFAULT 'published' CHECK (status IN ('published','hidden','flagged')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_posts_feed_idx ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_category_idx ON community_posts(category, created_at DESC);

CREATE TABLE IF NOT EXISTS community_post_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    author_id uuid NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
    content text NOT NULL,
    status varchar(16) NOT NULL DEFAULT 'published' CHECK (status IN ('published','hidden','flagged')),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_post_comments_post_idx ON community_post_comments(post_id, created_at ASC);

CREATE TABLE IF NOT EXISTS community_post_reactions (
    post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
    reaction_type varchar(16) NOT NULL DEFAULT 'like',
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, user_id, reaction_type)
);

CREATE TABLE IF NOT EXISTS community_follows (
    follower_id uuid NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
    following_id uuid NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_id, following_id)
);
CREATE INDEX IF NOT EXISTS community_follows_following_idx ON community_follows(following_id);
CREATE INDEX IF NOT EXISTS community_follows_follower_idx ON community_follows(follower_id);

