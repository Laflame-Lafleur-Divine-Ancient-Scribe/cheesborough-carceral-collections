-- 20260913-community-inbox-and-messaging.sql
-- Direct messages and inbox notifications for The Yard community

CREATE TABLE IF NOT EXISTS community_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id uuid REFERENCES community_users(id) ON DELETE CASCADE,
    recipient_id uuid NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
    subject varchar(150),
    content text NOT NULL,
    read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_messages_recipient_idx ON community_messages(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS community_messages_sender_idx ON community_messages(sender_id, created_at DESC);
