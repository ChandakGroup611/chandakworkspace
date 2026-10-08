-- ============================================================================
-- DMAC Enterprise Core Database Migration Script
-- Version: 4.0 (Final Production Hardened)
-- Modules: Drawing Tracking, 6-Layer RBAC DMS, Multi-Floor Architecture,
--          Universal Deny-by-Default RLS, Partial Unique GFC Integrity,
--          Immutable Partitioned Audit Logging, IST Indian Holiday Calendar
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- 2. INDIAN BUSINESS CALENDAR & IST WORKING DAYS
-- ============================================================================

CREATE TABLE IF NOT EXISTS dmac_holiday_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID, -- NULL = Corporate Global Holiday, Set = Site/Project Specific
    holiday_date DATE NOT NULL,
    holiday_name VARCHAR(100) NOT NULL,
    is_statutory BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partial Unique Indexes for Global vs Project-Specific Holiday Uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS uq_dmac_holiday_global ON dmac_holiday_calendar (holiday_date) WHERE project_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_dmac_holiday_project ON dmac_holiday_calendar (project_id, holiday_date) WHERE project_id IS NOT NULL;

-- Seed complete statutory Indian holidays for 2026-2027
INSERT INTO dmac_holiday_calendar (holiday_date, holiday_name) VALUES
('2026-01-26', 'Republic Day'),
('2026-03-03', 'Holi'),
('2026-03-19', 'Gudi Padwa'),
('2026-05-01', 'Maharashtra Day'),
('2026-08-15', 'Independence Day'),
('2026-09-14', 'Ganesh Chaturthi'),
('2026-10-02', 'Gandhi Jayanti'),
('2026-10-20', 'Dussehra'),
('2026-11-09', 'Diwali Laxmi Pujan'),
('2026-11-10', 'Diwali Balipratipada'),
('2026-12-25', 'Christmas'),
('2027-01-26', 'Republic Day'),
('2027-03-22', 'Holi'),
('2027-04-07', 'Gudi Padwa'),
('2027-05-01', 'Maharashtra Day'),
('2027-09-04', 'Ganesh Chaturthi'),
('2027-10-02', 'Gandhi Jayanti'),
('2027-10-09', 'Dussehra'),
('2027-10-29', 'Diwali'),
('2027-12-25', 'Christmas')
ON CONFLICT DO NOTHING;

-- Submission Day Rule: Day 0 is submission day; working days count starts from next business day.
CREATE OR REPLACE FUNCTION fn_dmac_working_days_between(start_ts TIMESTAMPTZ, end_ts TIMESTAMPTZ, p_project_id UUID DEFAULT NULL)
RETURNS INT AS $$
DECLARE
    start_d DATE := ((start_ts AT TIME ZONE 'Asia/Kolkata') + INTERVAL '1 day')::DATE;
    end_d DATE := (end_ts AT TIME ZONE 'Asia/Kolkata')::DATE;
    w_days INT;
BEGIN
    IF start_d > end_d THEN
        RETURN 0;
    END IF;
    SELECT count(*) INTO w_days
    FROM generate_series(start_d, end_d, '1 day'::interval) g
    WHERE extract(isodow from g) != 7 -- Exclude Sundays
      AND g::date NOT IN (
          SELECT holiday_date 
          FROM dmac_holiday_calendar 
          WHERE project_id IS NULL OR project_id = p_project_id
      );
    RETURN coalesce(w_days, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 3. WORKSPACES, GROUPS & 6-LAYER RBAC PERMISSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS dms_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO dms_workspaces (code, name) VALUES ('CHANDAK_CORP', 'Chandak Group Corporate') ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS dms_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES dms_workspaces(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (workspace_id, code)
);

CREATE TABLE IF NOT EXISTS dms_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES dms_groups(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dms_group_members_user ON dms_group_members (user_id);

CREATE TABLE IF NOT EXISTS dms_user_import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES dms_workspaces(id) ON DELETE RESTRICT,
    initiated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    total_users INT DEFAULT 0,
    created_users INT DEFAULT 0,
    failed_users INT DEFAULT 0,
    row_errors JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(30) DEFAULT 'PROCESSING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS dms_group_rights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES dms_groups(id) ON DELETE RESTRICT,
    module_code VARCHAR(50) NOT NULL,
    can_view BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    can_modify BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    can_purge BOOLEAN DEFAULT false,
    can_export BOOLEAN DEFAULT false,
    UNIQUE (group_id, module_code)
);

CREATE TABLE IF NOT EXISTS dms_workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES dms_workspaces(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    access_start_at TIMESTAMPTZ,
    access_end_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dms_workspace_members_user_ws ON dms_workspace_members (user_id, workspace_id);

CREATE TABLE IF NOT EXISTS dms_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES dms_workspaces(id) ON DELETE RESTRICT,
    parent_id UUID REFERENCES dms_folders(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    path ltree NOT NULL,
    approval_required BOOLEAN DEFAULT true,
    inherit_permissions BOOLEAN DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dms_folders_path_gist ON dms_folders USING gist (path);

CREATE TABLE IF NOT EXISTS dms_folder_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID NOT NULL REFERENCES dms_folders(id) ON DELETE RESTRICT,
    group_id UUID REFERENCES dms_groups(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    is_hidden BOOLEAN DEFAULT false,
    can_upload BOOLEAN DEFAULT true,
    can_download BOOLEAN DEFAULT true,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    CONSTRAINT chk_folder_grantee CHECK ((group_id IS NOT NULL AND user_id IS NULL) OR (group_id IS NULL AND user_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_dms_folder_access_folder ON dms_folder_access (folder_id);

CREATE TABLE IF NOT EXISTS dms_doc_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS dms_doc_type_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES dms_workspaces(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS dms_doc_type_set_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_id UUID NOT NULL REFERENCES dms_doc_type_sets(id) ON DELETE RESTRICT,
    doc_type_id UUID NOT NULL REFERENCES dms_doc_types(id) ON DELETE RESTRICT,
    UNIQUE (set_id, doc_type_id)
);

CREATE TABLE IF NOT EXISTS dms_doc_type_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES dms_groups(id) ON DELETE RESTRICT,
    doc_type_id UUID NOT NULL REFERENCES dms_doc_types(id) ON DELETE RESTRICT,
    can_add BOOLEAN DEFAULT true,
    can_view BOOLEAN DEFAULT true,
    can_print BOOLEAN DEFAULT true,
    can_edit_fields BOOLEAN DEFAULT true,
    can_delete BOOLEAN DEFAULT false,
    can_download BOOLEAN DEFAULT true,
    can_email BOOLEAN DEFAULT false,
    is_private_view BOOLEAN DEFAULT false,
    UNIQUE (group_id, doc_type_id)
);

CREATE TABLE IF NOT EXISTS dms_field_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES dms_workspaces(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS dms_field_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_group_id UUID NOT NULL REFERENCES dms_field_groups(id) ON DELETE RESTRICT,
    field_key VARCHAR(50) NOT NULL,
    field_label VARCHAR(100) NOT NULL,
    data_type VARCHAR(30) NOT NULL,
    is_required BOOLEAN DEFAULT false,
    default_value TEXT,
    dropdown_options JSONB DEFAULT '[]'::jsonb,
    deleted_at TIMESTAMPTZ,
    UNIQUE (field_group_id, field_key)
);

CREATE TABLE IF NOT EXISTS dms_field_visibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES dms_groups(id) ON DELETE RESTRICT,
    field_definition_id UUID NOT NULL REFERENCES dms_field_definitions(id) ON DELETE RESTRICT,
    show_in_list BOOLEAN DEFAULT true,
    allow_in_search BOOLEAN DEFAULT true,
    UNIQUE (group_id, field_definition_id)
);

CREATE TABLE IF NOT EXISTS dms_master_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES dms_workspaces(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    unique_key_field VARCHAR(50) NOT NULL,
    deleted_at TIMESTAMPTZ,
    UNIQUE (workspace_id, code)
);

CREATE TABLE IF NOT EXISTS dms_master_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_table_id UUID NOT NULL REFERENCES dms_master_tables(id) ON DELETE RESTRICT,
    field_key VARCHAR(50) NOT NULL,
    field_label VARCHAR(100) NOT NULL,
    data_type VARCHAR(30) NOT NULL,
    is_required BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    UNIQUE (master_table_id, field_key)
);

CREATE TABLE IF NOT EXISTS dms_master_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_table_id UUID NOT NULL REFERENCES dms_master_tables(id) ON DELETE RESTRICT,
    record_key VARCHAR(100) NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (master_table_id, record_key)
);

CREATE TABLE IF NOT EXISTS dms_master_table_rights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES dms_groups(id) ON DELETE RESTRICT,
    master_table_id UUID NOT NULL REFERENCES dms_master_tables(id) ON DELETE RESTRICT,
    can_view BOOLEAN DEFAULT true,
    can_add_rows BOOLEAN DEFAULT false,
    can_edit_rows BOOLEAN DEFAULT false,
    can_delete_rows BOOLEAN DEFAULT false,
    can_export BOOLEAN DEFAULT true,
    UNIQUE (group_id, master_table_id)
);

CREATE TABLE IF NOT EXISTS dms_folder_doc_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID NOT NULL REFERENCES dms_folders(id) ON DELETE RESTRICT,
    doc_type_id UUID NOT NULL REFERENCES dms_doc_types(id) ON DELETE RESTRICT,
    UNIQUE (folder_id, doc_type_id)
);

CREATE TABLE IF NOT EXISTS dms_folder_field_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID NOT NULL REFERENCES dms_folders(id) ON DELETE RESTRICT,
    field_group_id UUID NOT NULL REFERENCES dms_field_groups(id) ON DELETE RESTRICT,
    UNIQUE (folder_id, field_group_id)
);

CREATE TABLE IF NOT EXISTS dms_folder_master_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID NOT NULL REFERENCES dms_folders(id) ON DELETE RESTRICT,
    master_table_id UUID NOT NULL REFERENCES dms_master_tables(id) ON DELETE RESTRICT,
    UNIQUE (folder_id, master_table_id)
);

-- ============================================================================
-- 4. DRAWING WORKFLOW & MULTI-FLOOR ARCHITECTURE
-- ============================================================================

CREATE TABLE IF NOT EXISTS dmac_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO dmac_departments (code, name) VALUES
('ARC', 'Architecture'),
('STR', 'Structural'),
('PLB', 'Plumbing & Drainage'),
('ELE', 'Electrical & Lighting'),
('HVAC', 'HVAC Ducting & Mech'),
('FIRE', 'Fire Fighting & Life Safety')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS dmac_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES dms_workspaces(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    review_target_working_days INT DEFAULT 5,
    revision_target_working_days INT DEFAULT 7,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (workspace_id, code)
);

CREATE TABLE IF NOT EXISTS dmac_project_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES dmac_projects(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES dmac_departments(id) ON DELETE RESTRICT,
    design_owner_id UUID REFERENCES auth.users(id),
    engineering_reviewer_id UUID REFERENCES auth.users(id),
    UNIQUE (project_id, department_id)
);

CREATE TABLE IF NOT EXISTS dmac_buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES dmac_projects(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    sort_order INT DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    UNIQUE (project_id, code)
);

CREATE TABLE IF NOT EXISTS dmac_floors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES dmac_buildings(id) ON DELETE RESTRICT,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    floor_order INT NOT NULL,
    deleted_at TIMESTAMPTZ,
    UNIQUE (building_id, code)
);

-- Concurrency-Safe Sequence Counter (Scoped per Project x Department)
CREATE TABLE IF NOT EXISTS dmac_number_sequences (
    project_id UUID NOT NULL REFERENCES dmac_projects(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES dmac_departments(id) ON DELETE RESTRICT,
    current_seq INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (project_id, department_id)
);

CREATE TABLE IF NOT EXISTS dmac_number_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES dms_workspaces(id) ON DELETE RESTRICT,
    pattern_name VARCHAR(100) NOT NULL,
    format_string VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dmac_drawings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES dmac_projects(id) ON DELETE RESTRICT,
    building_id UUID NOT NULL REFERENCES dmac_buildings(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES dmac_departments(id) ON DELETE RESTRICT,
    design_owner_id UUID REFERENCES auth.users(id),
    engineering_reviewer_id UUID REFERENCES auth.users(id),
    drawing_number VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    planned_submission_date DATE,
    planned_approval_date DATE,
    current_status VARCHAR(50) DEFAULT 'NOT_SUBMITTED',
    current_holder VARCHAR(50) DEFAULT 'DESIGN',
    latest_rev_no INT DEFAULT NULL,
    status_changed_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (project_id, drawing_number)
);

-- Matrix Performance Index
CREATE INDEX IF NOT EXISTS idx_dmac_drawings_matrix 
ON dmac_drawings (project_id, building_id, department_id, current_status) 
WHERE deleted_at IS NULL;

-- Multi-Floor Support (Typical floor drawings F02-F09, All Floors)
CREATE TABLE IF NOT EXISTS dmac_drawing_floors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drawing_id UUID NOT NULL REFERENCES dmac_drawings(id) ON DELETE RESTRICT,
    floor_id UUID NOT NULL REFERENCES dmac_floors(id) ON DELETE RESTRICT,
    is_primary BOOLEAN DEFAULT false,
    UNIQUE (drawing_id, floor_id)
);

CREATE INDEX IF NOT EXISTS idx_dmac_drawing_floors_lookup ON dmac_drawing_floors (floor_id, drawing_id);

-- Enforce Exactly One Primary Floor per Drawing
CREATE UNIQUE INDEX IF NOT EXISTS uq_dmac_drawing_primary_floor 
ON dmac_drawing_floors (drawing_id) 
WHERE is_primary = true;

CREATE TABLE IF NOT EXISTS dmac_drawing_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drawing_id UUID NOT NULL REFERENCES dmac_drawings(id) ON DELETE RESTRICT,
    rev_no INT NOT NULL,
    submitted_by UUID REFERENCES auth.users(id),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    is_superseded BOOLEAN DEFAULT false,
    is_gfc BOOLEAN DEFAULT false,
    gfc_released_at TIMESTAMPTZ,
    gfc_released_by UUID REFERENCES auth.users(id),
    qr_code_token VARCHAR(100) UNIQUE,
    UNIQUE (drawing_id, rev_no)
);

-- Partial Unique Indexes for Revision & GFC Integrity
CREATE UNIQUE INDEX IF NOT EXISTS uq_dmac_drawing_active_rev 
ON dmac_drawing_revisions (drawing_id) 
WHERE is_superseded = false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dmac_drawing_active_gfc 
ON dmac_drawing_revisions (drawing_id) 
WHERE is_gfc = true AND is_superseded = false;

CREATE TABLE IF NOT EXISTS dmac_revision_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    revision_id UUID NOT NULL REFERENCES dmac_drawing_revisions(id) ON DELETE RESTRICT,
    file_role VARCHAR(20) NOT NULL,
    storage_key TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    converted_view_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dmac_approval_chains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES dmac_projects(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dmac_approval_chain_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id UUID NOT NULL REFERENCES dmac_approval_chains(id) ON DELETE RESTRICT,
    step_order INT NOT NULL,
    role_type VARCHAR(50) NOT NULL,
    reviewer_user_id UUID REFERENCES auth.users(id),
    is_parallel BOOLEAN DEFAULT false,
    UNIQUE (chain_id, step_order)
);

CREATE TABLE IF NOT EXISTS dmac_approval_delegations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delegator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    delegate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dmac_review_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    revision_id UUID NOT NULL REFERENCES dmac_drawing_revisions(id) ON DELETE RESTRICT,
    chain_step_id UUID REFERENCES dmac_approval_chain_steps(id),
    step_order INT DEFAULT 1,
    reviewer_id UUID REFERENCES auth.users(id),
    delegated_from_user_id UUID REFERENCES auth.users(id),
    role_type VARCHAR(50) NOT NULL,
    is_parallel BOOLEAN DEFAULT false,
    status VARCHAR(30) DEFAULT 'PENDING',
    decision_code VARCHAR(10),
    remarks TEXT,
    due_at TIMESTAMPTZ,
    decided_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS dmac_drawing_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    revision_id UUID NOT NULL REFERENCES dmac_drawing_revisions(id) ON DELETE RESTRICT,
    comment_number INT NOT NULL,
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'MEDIUM',
    comment_text TEXT NOT NULL,
    markup_geometry JSONB,
    status VARCHAR(20) DEFAULT 'OPEN',
    resolved_in_revision_id UUID REFERENCES dmac_drawing_revisions(id),
    created_by UUID REFERENCES auth.users(id),
    author_email VARCHAR(255),
    author_role VARCHAR(50) DEFAULT 'INTERNAL',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (revision_id, comment_number),
    CONSTRAINT chk_dmac_comment_author CHECK (created_by IS NOT NULL OR author_email IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS dmac_comment_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES dmac_drawing_comments(id) ON DELETE RESTRICT,
    author_id UUID REFERENCES auth.users(id),
    author_role VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    revision_id UUID REFERENCES dmac_drawing_revisions(id),
    author_email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_dmac_thread_author CHECK (author_id IS NOT NULL OR author_email IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS dmac_transmittals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES dms_workspaces(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL REFERENCES dmac_projects(id) ON DELETE RESTRICT,
    transmittal_number VARCHAR(100) NOT NULL,
    direction VARCHAR(20) NOT NULL,
    sender_id UUID REFERENCES auth.users(id),
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    notes TEXT,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (workspace_id, transmittal_number)
);

CREATE TABLE IF NOT EXISTS dmac_transmittal_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transmittal_id UUID NOT NULL REFERENCES dmac_transmittals(id) ON DELETE RESTRICT,
    revision_id UUID NOT NULL REFERENCES dmac_drawing_revisions(id) ON DELETE RESTRICT,
    purpose VARCHAR(50) DEFAULT 'FOR_REVIEW'
);

CREATE TABLE IF NOT EXISTS dmac_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link_url TEXT,
    is_read BOOLEAN DEFAULT false,
    event_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dmac_email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_body TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dmac_sms_whatsapp_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_phone VARCHAR(20) NOT NULL,
    channel VARCHAR(20) DEFAULT 'SMS',
    dlt_template_id VARCHAR(50),
    encrypted_payload TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dmac_sla_escalation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES dmac_projects(id) ON DELETE RESTRICT,
    department_id UUID REFERENCES dmac_departments(id) ON DELETE RESTRICT,
    days_overdue_threshold INT NOT NULL,
    escalate_to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT true
);

-- ============================================================================
-- 5. ENTERPRISE DMS CORE, VERSIONING & QC GATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS dms_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES dms_workspaces(id) ON DELETE RESTRICT,
    folder_id UUID NOT NULL REFERENCES dms_folders(id) ON DELETE RESTRICT,
    doc_type_id UUID NOT NULL REFERENCES dms_doc_types(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    current_version_no INT DEFAULT 1,
    approval_status VARCHAR(50) DEFAULT 'PENDING',
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dms_documents_folder ON dms_documents (folder_id);

CREATE TABLE IF NOT EXISTS dms_document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES dms_documents(id) ON DELETE RESTRICT,
    version_no INT NOT NULL,
    storage_key TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    ocr_extracted_text TEXT,
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(file_name, '') || ' ' || coalesce(ocr_extracted_text, ''))) STORED,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (document_id, version_no)
);

CREATE INDEX IF NOT EXISTS idx_dms_doc_version_search ON dms_document_versions USING gin(search_vector);

CREATE TABLE IF NOT EXISTS dms_document_locks (
    document_id UUID PRIMARY KEY REFERENCES dms_documents(id) ON DELETE RESTRICT,
    locked_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    locked_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS dms_field_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES dms_documents(id) ON DELETE RESTRICT,
    field_definition_id UUID NOT NULL REFERENCES dms_field_definitions(id) ON DELETE RESTRICT,
    text_value TEXT,
    number_value NUMERIC,
    date_value DATE,
    json_value JSONB,
    UNIQUE (document_id, field_definition_id)
);

CREATE INDEX IF NOT EXISTS idx_dms_field_val_num ON dms_field_values (field_definition_id, number_value);
CREATE INDEX IF NOT EXISTS idx_dms_field_val_date ON dms_field_values (field_definition_id, date_value);
CREATE INDEX IF NOT EXISTS idx_dms_field_val_text_trgm ON dms_field_values USING gin (text_value gin_trgm_ops);

CREATE TABLE IF NOT EXISTS dms_document_master_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES dms_documents(id) ON DELETE RESTRICT,
    master_table_id UUID NOT NULL REFERENCES dms_master_tables(id) ON DELETE RESTRICT,
    master_record_id UUID NOT NULL REFERENCES dms_master_records(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (document_id, master_record_id)
);

CREATE INDEX IF NOT EXISTS idx_dms_master_tag_lookup ON dms_document_master_tags (master_record_id, document_id);

CREATE TABLE IF NOT EXISTS dms_document_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_document_id UUID NOT NULL REFERENCES dms_documents(id) ON DELETE RESTRICT,
    target_document_id UUID NOT NULL REFERENCES dms_documents(id) ON DELETE RESTRICT,
    link_type VARCHAR(50) DEFAULT 'RELATED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (source_document_id, target_document_id)
);

CREATE TABLE IF NOT EXISTS dms_saved_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES dms_workspaces(id) ON DELETE RESTRICT,
    folder_id UUID REFERENCES dms_folders(id) ON DELETE RESTRICT,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    shared_group_id UUID REFERENCES dms_groups(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    visible_columns JSONB NOT NULL DEFAULT '[]'::jsonb,
    filter_conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dms_user_favourites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS dms_recycle_bin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES dms_workspaces(id) ON DELETE RESTRICT,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    deleted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    deleted_at TIMESTAMPTZ DEFAULT NOW(),
    is_purged BOOLEAN DEFAULT false,
    purge_reason TEXT,
    purged_by UUID REFERENCES auth.users(id),
    purged_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS dms_qc_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES dms_documents(id) ON DELETE RESTRICT,
    version_no INT DEFAULT 1,
    status VARCHAR(30) DEFAULT 'UNAPPROVED',
    decided_by UUID REFERENCES auth.users(id),
    decided_at TIMESTAMPTZ,
    decision_comment TEXT,
    UNIQUE (document_id, version_no)
);

CREATE TABLE IF NOT EXISTS dms_qc_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qc_approval_id UUID NOT NULL REFERENCES dms_qc_approvals(id) ON DELETE RESTRICT,
    action VARCHAR(30) NOT NULL,
    actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    remarks TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dms_import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES dms_workspaces(id) ON DELETE RESTRICT,
    job_type VARCHAR(50) NOT NULL,
    initiated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    total_rows INT DEFAULT 0,
    successful_rows INT DEFAULT 0,
    failed_rows INT DEFAULT 0,
    row_errors JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(30) DEFAULT 'PROCESSING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ============================================================================
-- 6. SECURE EXTERNAL CONSULTANT SHARING & OTP GATEWAY (§8.23)
-- ============================================================================

CREATE TABLE IF NOT EXISTS dms_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES dms_workspaces(id) ON DELETE RESTRICT,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    encrypted_envelope_key TEXT NOT NULL,
    allow_view BOOLEAN DEFAULT true,
    allow_comment BOOLEAN DEFAULT false,
    allow_upload_revision BOOLEAN DEFAULT false,
    allow_print BOOLEAN DEFAULT false,
    allow_download BOOLEAN DEFAULT false,
    failed_otp_attempts INT DEFAULT 0,
    failed_password_attempts INT DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN DEFAULT false,
    revoked_reason TEXT,
    revoked_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_recipient_email_normalized CHECK (recipient_email = lower(trim(recipient_email)))
);

CREATE TABLE IF NOT EXISTS dms_share_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id UUID NOT NULL REFERENCES dms_shares(id) ON DELETE RESTRICT,
    recipient_email VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT false,
    attempt_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dms_share_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id UUID NOT NULL REFERENCES dms_shares(id) ON DELETE RESTRICT,
    document_id UUID REFERENCES dms_documents(id) ON DELETE RESTRICT,
    drawing_revision_id UUID REFERENCES dmac_drawing_revisions(id) ON DELETE RESTRICT,
    CONSTRAINT chk_share_item CHECK ((document_id IS NOT NULL AND drawing_revision_id IS NULL) OR (document_id IS NULL AND drawing_revision_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS dms_share_access_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id UUID NOT NULL REFERENCES dms_shares(id) ON DELETE RESTRICT,
    attempt_type VARCHAR(30) NOT NULL,
    email_entered VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_successful BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dms_share_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id UUID NOT NULL REFERENCES dms_shares(id) ON DELETE RESTRICT,
    device_fingerprint_hash VARCHAR(64) NOT NULL,
    session_token_hash VARCHAR(64) NOT NULL,
    authenticated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- ============================================================================
-- 7. AUDIT LOG ENGINE WITH AUTOMATED PARTITIONS & DEFAULT FALLBACK
-- ============================================================================

CREATE TABLE IF NOT EXISTS dms_audit_logs (
    id UUID DEFAULT gen_random_uuid(),
    log_month DATE NOT NULL DEFAULT date_trunc('month', (NOW() AT TIME ZONE 'Asia/Kolkata'))::date,
    actor_id UUID,
    actor_email VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (id, log_month)
) PARTITION BY RANGE (log_month);

CREATE TABLE IF NOT EXISTS dms_audit_logs_default PARTITION OF dms_audit_logs DEFAULT;
ALTER TABLE dms_audit_logs_default ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON dms_audit_logs_default FROM anon, authenticated, public;
DROP POLICY IF EXISTS rls_dms_audit_logs_default_deny ON dms_audit_logs_default;
CREATE POLICY rls_dms_audit_logs_default_deny ON dms_audit_logs_default FOR ALL USING (false);

CREATE OR REPLACE FUNCTION fn_create_monthly_audit_partition(p_month DATE)
RETURNS VOID AS $$
DECLARE
    v_start_date DATE := date_trunc('month', p_month)::DATE;
    v_end_date DATE := (date_trunc('month', p_month) + INTERVAL '1 month')::DATE;
    v_part_name TEXT := 'dms_audit_logs_y' || to_char(v_start_date, 'YYYY') || 'm' || to_char(v_start_date, 'MM');
BEGIN
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF dms_audit_logs FOR VALUES FROM (%L) TO (%L);', 
        v_part_name, v_start_date, v_end_date);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', v_part_name);
    EXECUTE format('REVOKE ALL ON %I FROM anon, authenticated, public;', v_part_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'rls_' || v_part_name || '_deny', v_part_name);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (false);', 'rls_' || v_part_name || '_deny', v_part_name);
END;
$$ LANGUAGE plpgsql;

-- Pre-generate monthly partitions from Oct 2026 through Dec 2028
DO $$
DECLARE
    d DATE := '2026-10-01';
BEGIN
    WHILE d <= '2028-12-01' LOOP
        PERFORM fn_create_monthly_audit_partition(d);
        d := (d + INTERVAL '1 month')::DATE;
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION trg_enforce_audit_immutability()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit log entries are strictly immutable. UPDATE or DELETE operations are prohibited.';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_dms_audit_immutable
BEFORE UPDATE OR DELETE ON dms_audit_logs
FOR EACH ROW EXECUTE FUNCTION trg_enforce_audit_immutability();

REVOKE UPDATE, DELETE, TRUNCATE ON dms_audit_logs FROM anon, authenticated, public;

-- ============================================================================
-- 8. LIVE DRAWINGS STATUS & SLA VIEW (IST CALENDAR AWARE)
-- ============================================================================

CREATE OR REPLACE VIEW v_dmac_drawings_live_status AS
SELECT 
    d.id AS drawing_id,
    d.project_id,
    d.building_id,
    d.department_id,
    dept.code AS department_code,
    dept.name AS department_name,
    d.design_owner_id,
    d.engineering_reviewer_id,
    d.drawing_number,
    d.title,
    d.planned_submission_date,
    d.planned_approval_date,
    d.current_status,
    d.current_holder,
    d.latest_rev_no,
    CASE 
        WHEN d.latest_rev_no IS NOT NULL THEN 'R' || d.latest_rev_no 
        ELSE '–' 
    END AS display_rev,
    d.status_changed_at,
    fn_dmac_working_days_between(d.status_changed_at, NOW(), d.project_id) AS days_in_current_state,
    CASE 
        WHEN d.current_status = 'UNDER_REVIEW' AND 
             fn_dmac_working_days_between(d.status_changed_at, NOW(), d.project_id) > coalesce(p.review_target_working_days, 5) THEN true
        WHEN d.current_status = 'RETURNED' AND 
             fn_dmac_working_days_between(d.status_changed_at, NOW(), d.project_id) > coalesce(p.revision_target_working_days, 7) THEN true
        ELSE false
    END AS is_overdue,
    ARRAY(
        SELECT df.floor_id 
        FROM dmac_drawing_floors df 
        WHERE df.drawing_id = d.id
    ) AS floor_ids
FROM dmac_drawings d
JOIN dmac_projects p ON p.id = d.project_id
JOIN dmac_departments dept ON dept.id = d.department_id
WHERE d.deleted_at IS NULL;

-- ============================================================================
-- 9. UNIVERSAL DENY-BY-DEFAULT ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Dynamic Enforcement: Enable RLS on EVERY Table in public Schema
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', r.tablename);
    END LOOP;
END $$;

-- 1. Folder RLS: Visible only if user is in workspace AND no ancestor folder is hidden
DROP POLICY IF EXISTS rls_dms_folders_select ON dms_folders;
CREATE POLICY rls_dms_folders_select ON dms_folders
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM dms_workspace_members wm
        WHERE wm.workspace_id = dms_folders.workspace_id
          AND wm.user_id = auth.uid()
          AND wm.is_active = true
    )
    AND NOT EXISTS (
        SELECT 1 FROM dms_folders ancestor
        JOIN dms_folder_access fa ON fa.folder_id = ancestor.id
        WHERE ancestor.path @> dms_folders.path
          AND (fa.user_id = auth.uid() OR fa.group_id IN (SELECT group_id FROM dms_group_members WHERE user_id = auth.uid()))
          AND fa.is_hidden = true
    )
);

-- 2. Document Access: Workspace member + Folder visible + Doc Type Private View permission
DROP POLICY IF EXISTS rls_dms_documents_select ON dms_documents;
CREATE POLICY rls_dms_documents_select ON dms_documents
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM dms_workspace_members wm
        WHERE wm.workspace_id = dms_documents.workspace_id
          AND wm.user_id = auth.uid()
          AND wm.is_active = true
    )
    AND EXISTS (
        SELECT 1 FROM dms_folders f
        WHERE f.id = dms_documents.folder_id
          AND NOT EXISTS (
              SELECT 1 FROM dms_folders ancestor
              JOIN dms_folder_access fa ON fa.folder_id = ancestor.id
              WHERE ancestor.path @> f.path
                AND (fa.user_id = auth.uid() OR fa.group_id IN (SELECT group_id FROM dms_group_members WHERE user_id = auth.uid()))
                AND fa.is_hidden = true
          )
    )
    AND (
        NOT EXISTS (
            SELECT 1 FROM dms_doc_type_permissions dtp
            WHERE dtp.doc_type_id = dms_documents.doc_type_id
              AND dtp.group_id IN (SELECT group_id FROM dms_group_members WHERE user_id = auth.uid())
              AND dtp.is_private_view = true
        )
        OR dms_documents.created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM dms_group_members gm
            JOIN dms_groups g ON g.id = gm.group_id
            WHERE gm.user_id = auth.uid() 
              AND g.workspace_id = dms_documents.workspace_id 
              AND g.code = 'SUPER_ADMIN'
              AND g.is_system = true
        )
    )
);

-- 3. Document Versions & Revisions Select Policies
DROP POLICY IF EXISTS rls_dms_doc_versions_select ON dms_document_versions;
CREATE POLICY rls_dms_doc_versions_select ON dms_document_versions
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM dms_documents d
        WHERE d.id = dms_document_versions.document_id
    )
);

DROP POLICY IF EXISTS rls_dmac_drawings_select ON dmac_drawings;
CREATE POLICY rls_dmac_drawings_select ON dmac_drawings
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM dmac_projects p
        JOIN dms_workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE p.id = dmac_drawings.project_id
          AND wm.user_id = auth.uid()
          AND wm.is_active = true
    )
);

DROP POLICY IF EXISTS rls_dmac_revisions_select ON dmac_drawing_revisions;
CREATE POLICY rls_dmac_revisions_select ON dmac_drawing_revisions
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM dmac_drawings d
        WHERE d.id = dmac_drawing_revisions.drawing_id
    )
);

-- 4. Internal / Security-Sensitive Tables: Deny direct browser SELECT/MUTATION (Service-Role Only)
DROP POLICY IF EXISTS rls_dms_audit_logs_deny ON dms_audit_logs;
CREATE POLICY rls_dms_audit_logs_deny ON dms_audit_logs FOR ALL USING (false);

DROP POLICY IF EXISTS rls_dms_shares_deny ON dms_shares;
CREATE POLICY rls_dms_shares_deny ON dms_shares FOR ALL USING (false);

DROP POLICY IF EXISTS rls_dms_share_otps_deny ON dms_share_otps;
CREATE POLICY rls_dms_share_otps_deny ON dms_share_otps FOR ALL USING (false);

DROP POLICY IF EXISTS rls_dms_share_devices_deny ON dms_share_devices;
CREATE POLICY rls_dms_share_devices_deny ON dms_share_devices FOR ALL USING (false);

DROP POLICY IF EXISTS rls_dms_share_attempts_deny ON dms_share_access_attempts;
CREATE POLICY rls_dms_share_attempts_deny ON dms_share_access_attempts FOR ALL USING (false);

DROP POLICY IF EXISTS rls_dmac_email_queue_deny ON dmac_email_queue;
CREATE POLICY rls_dmac_email_queue_deny ON dmac_email_queue FOR ALL USING (false);

DROP POLICY IF EXISTS rls_dmac_sms_whatsapp_deny ON dmac_sms_whatsapp_queue;
CREATE POLICY rls_dmac_sms_whatsapp_deny ON dmac_sms_whatsapp_queue FOR ALL USING (false);

DROP POLICY IF EXISTS rls_dms_user_import_jobs_deny ON dms_user_import_jobs;
CREATE POLICY rls_dms_user_import_jobs_deny ON dms_user_import_jobs FOR ALL USING (false);

DROP POLICY IF EXISTS rls_dms_import_jobs_deny ON dms_import_jobs;
CREATE POLICY rls_dms_import_jobs_deny ON dms_import_jobs FOR ALL USING (false);

DROP POLICY IF EXISTS rls_dms_recycle_bin_deny ON dms_recycle_bin;
CREATE POLICY rls_dms_recycle_bin_deny ON dms_recycle_bin FOR ALL USING (false);
