-- Additive migration. Existing Redis totals are not reinterpreted as sessions.
CREATE TABLE IF NOT EXISTS owner_dashboard_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO owner_dashboard_settings(singleton) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS analytics_visitors (
  id uuid PRIMARY KEY, first_seen timestamptz NOT NULL DEFAULT now(), last_seen timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id uuid PRIMARY KEY, visitor_id uuid NOT NULL REFERENCES analytics_visitors(id) ON DELETE CASCADE,
  member_id uuid REFERENCES community_users(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(), last_activity_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz, engagement_seconds numeric NOT NULL DEFAULT 0,
  pageview_count integer NOT NULL DEFAULT 0, landing_page text, exit_page text,
  is_returning boolean NOT NULL DEFAULT false, source varchar(40) NOT NULL DEFAULT 'Unknown',
  referrer varchar(253), medium varchar(100), campaign varchar(150), utm_source varchar(100),
  utm_content varchar(150), utm_term varchar(150),
  country varchar(100), country_code varchar(2), region varchar(100), city varchar(100),
  latitude numeric, longitude numeric, accuracy_km numeric, timezone varchar(80), asn varchar(30), isp varchar(150),
  device varchar(20), browser varchar(40), operating_system varchar(40), screen_category varchar(20)
);
CREATE INDEX IF NOT EXISTS analytics_sessions_started ON analytics_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS analytics_sessions_visitor ON analytics_sessions(visitor_id,started_at DESC);
CREATE INDEX IF NOT EXISTS analytics_sessions_recent ON analytics_sessions(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS analytics_sessions_geo ON analytics_sessions(country,region,city,started_at DESC);
CREATE TABLE IF NOT EXISTS analytics_pageviews (
  id uuid PRIMARY KEY, session_id uuid NOT NULL REFERENCES analytics_sessions(id) ON DELETE CASCADE,
  page_path varchar(500) NOT NULL, page_title varchar(250), content_type varchar(40),
  started_at timestamptz NOT NULL DEFAULT now(), last_activity_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz, engagement_seconds numeric NOT NULL DEFAULT 0,
  client_engagement_seconds numeric NOT NULL DEFAULT 0,
  max_scroll integer NOT NULL DEFAULT 0 CHECK(max_scroll BETWEEN 0 AND 100), last_sequence integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS analytics_pageviews_path_time ON analytics_pageviews(page_path,started_at DESC);
CREATE INDEX IF NOT EXISTS analytics_pageviews_session ON analytics_pageviews(session_id,started_at);
CREATE INDEX IF NOT EXISTS analytics_pageviews_time ON analytics_pageviews(started_at DESC);
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY, pageview_id uuid NOT NULL REFERENCES analytics_pageviews(id) ON DELETE CASCADE,
  event_type varchar(40) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), label varchar(200)
);
CREATE INDEX IF NOT EXISTS analytics_events_type_time ON analytics_events(event_type,created_at DESC);
CREATE TABLE IF NOT EXISTS analytics_daily_rollups (
  day date NOT NULL, page_path varchar(500) NOT NULL,
  page_views bigint NOT NULL DEFAULT 0, engagement_seconds numeric NOT NULL DEFAULT 0,
  PRIMARY KEY(day,page_path)
);
CREATE TABLE IF NOT EXISTS owner_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), administrator_id uuid REFERENCES community_users(id),
  title varchar(160) NOT NULL, body varchar(10000) NOT NULL, audience varchar(80) NOT NULL,
  type varchar(24) NOT NULL, status varchar(24) NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz, delivered integer, opened integer, failed integer
);
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id bigserial PRIMARY KEY, administrator_id uuid REFERENCES community_users(id), action varchar(80) NOT NULL,
  target varchar(200), result varchar(24) NOT NULL DEFAULT 'success', metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_time ON admin_audit_log(created_at DESC);
CREATE TABLE IF NOT EXISTS security_events (
  id bigserial PRIMARY KEY, member_id uuid REFERENCES community_users(id), event_type varchar(80) NOT NULL,
  result varchar(24), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS security_events_time ON security_events(created_at DESC);
ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false;
ALTER TABLE security_events ADD COLUMN IF NOT EXISTS source_audit_id bigint UNIQUE;
ALTER TABLE admin_audit_log ADD COLUMN IF NOT EXISTS source_moderation_id bigint UNIQUE;
CREATE INDEX IF NOT EXISTS analytics_sessions_member ON analytics_sessions(member_id,started_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_page ON analytics_events(pageview_id,event_type);
-- Reuse existing account event producers; no second authentication system.
CREATE OR REPLACE FUNCTION owner_capture_security() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.event_type ~ 'login|logged_in|password|reset|recover|rate_limit|blocked|auth_failure|owner_member' THEN
    INSERT INTO security_events(member_id,event_type,result,created_at,source_audit_id)
    VALUES(NEW.user_id,NEW.event_type,CASE WHEN NEW.event_type ~ 'fail|blocked|rate_limit' THEN 'blocked' ELSE 'recorded' END,NEW.created_at,NEW.id)
    ON CONFLICT(source_audit_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS owner_security_capture ON community_audit_log;
CREATE TRIGGER owner_security_capture AFTER INSERT ON community_audit_log FOR EACH ROW EXECUTE FUNCTION owner_capture_security();
INSERT INTO security_events(member_id,event_type,result,created_at,source_audit_id)
SELECT user_id,event_type,CASE WHEN event_type ~ 'fail|blocked|rate_limit' THEN 'blocked' ELSE 'recorded' END,created_at,id
FROM community_audit_log WHERE event_type ~ 'login|logged_in|password|reset|recover|rate_limit|blocked|auth_failure|owner_member'
AND created_at>=now()-(COALESCE((SELECT (settings->>'securityRetentionDays')::int FROM owner_dashboard_settings WHERE singleton),30)*interval '1 day')
ON CONFLICT(source_audit_id) DO NOTHING;
CREATE OR REPLACE FUNCTION owner_capture_moderation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO admin_audit_log(administrator_id,action,target,metadata,created_at,source_moderation_id)
  VALUES(NEW.actor_id,NEW.action,COALESCE(NEW.target_user_id::text,NEW.comment_id::text),jsonb_build_object('reason',NEW.reason,'previous',NEW.previous_state,'next',NEW.new_state),NEW.created_at,NEW.id)
  ON CONFLICT(source_moderation_id) DO NOTHING;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS owner_moderation_capture ON community_moderation_actions;
CREATE TRIGGER owner_moderation_capture AFTER INSERT ON community_moderation_actions FOR EACH ROW EXECUTE FUNCTION owner_capture_moderation();
INSERT INTO admin_audit_log(administrator_id,action,target,metadata,created_at,source_moderation_id)
SELECT actor_id,action,COALESCE(target_user_id::text,comment_id::text),jsonb_build_object('reason',reason,'previous',previous_state,'next',new_state),created_at,id
FROM community_moderation_actions ON CONFLICT(source_moderation_id) DO NOTHING;
