-- Research Help Finder Schema Migration
CREATE SEQUENCE IF NOT EXISTS research_inquiry_seq START WITH 1;

CREATE TABLE IF NOT EXISTS research_inquiries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id varchar(32) NOT NULL UNIQUE,
    user_id uuid REFERENCES community_users(id) ON DELETE SET NULL,
    member_name varchar(120),
    member_email varchar(254),
    subscription_tier_at_submission varchar(32) NOT NULL DEFAULT 'full_member',
    
    -- Requester Details
    requester_name varchar(120) NOT NULL,
    requester_email varchar(254) NOT NULL,
    requester_phone varchar(32),
    relationship varchar(64) NOT NULL,
    preferred_contact_method varchar(48) NOT NULL DEFAULT 'email',
    permission_to_contact boolean NOT NULL DEFAULT true,
    
    -- Incarcerated Individual Details
    inmate_name varchar(120) NOT NULL,
    inmate_number varchar(64),
    facility varchar(180),
    state varchar(64),
    jurisdiction varchar(64),
    county varchar(100),
    court varchar(180),
    case_number varchar(100),
    
    -- Research Request Details
    categories jsonb NOT NULL DEFAULT '[]'::jsonb,
    inquiry text NOT NULL,
    documents_already_available text,
    documents_requested text,
    disclaimer_acknowledged boolean NOT NULL DEFAULT true,
    
    -- Staff & Case Management Details
    status varchar(32) NOT NULL DEFAULT 'new' CHECK (status IN ('new','under_review','researching','waiting_for_info','documents_located','response_prepared','completed','unable_to_assist','archived')),
    assigned_staff varchar(120),
    staff_notes text,
    member_response_notes text,
    date_reviewed timestamptz,
    date_response_sent timestamptz,
    outcome text,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS research_inquiries_user_time_idx ON research_inquiries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS research_inquiries_status_idx ON research_inquiries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS research_inquiries_request_id_idx ON research_inquiries(request_id);
CREATE INDEX IF NOT EXISTS research_inquiries_state_idx ON research_inquiries(state);

-- Chronological Research Activity Log
CREATE TABLE IF NOT EXISTS research_inquiry_activity_log (
    id bigserial PRIMARY KEY,
    inquiry_id uuid NOT NULL REFERENCES research_inquiries(id) ON DELETE CASCADE,
    staff_name varchar(120) NOT NULL,
    action varchar(120) NOT NULL,
    source_searched varchar(255),
    agency_contacted varchar(255),
    correspondence_sent text,
    document_located text,
    result text,
    follow_up_needed text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS research_inquiry_activity_idx ON research_inquiry_activity_log(inquiry_id, created_at ASC);

-- Associated Files & Document Records
CREATE TABLE IF NOT EXISTS research_inquiry_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id uuid NOT NULL REFERENCES research_inquiries(id) ON DELETE CASCADE,
    file_name varchar(255) NOT NULL,
    document_type varchar(80) NOT NULL,
    file_size bigint NOT NULL DEFAULT 0,
    mime_type varchar(100) NOT NULL DEFAULT 'application/octet-stream',
    description text,
    uploaded_by varchar(120),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS research_inquiry_files_idx ON research_inquiry_files(inquiry_id, created_at DESC);

-- Status History Audit Trail
CREATE TABLE IF NOT EXISTS research_inquiry_status_history (
    id bigserial PRIMARY KEY,
    inquiry_id uuid NOT NULL REFERENCES research_inquiries(id) ON DELETE CASCADE,
    previous_status varchar(32),
    new_status varchar(32) NOT NULL,
    changed_by varchar(120) NOT NULL,
    reason varchar(500),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS research_inquiry_status_history_idx ON research_inquiry_status_history(inquiry_id, created_at DESC);

