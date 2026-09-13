-- Migration: Add community_connections and media_url for posts
-- Date: 2026-09-13

-- 1. Add media_url to community_posts for attached images/sketches
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS media_url text;

-- 2. Create community_connections table for mutual Facebook-style connection requests
CREATE TABLE IF NOT EXISTS community_connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id uuid NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
    receiver_id uuid NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
    status varchar(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_community_connections UNIQUE (requester_id, receiver_id)
);

CREATE INDEX IF NOT EXISTS community_connections_receiver_idx ON community_connections(receiver_id, status);
CREATE INDEX IF NOT EXISTS community_connections_requester_idx ON community_connections(requester_id, status);
