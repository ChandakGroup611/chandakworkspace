-- ==============================================================================
-- Migration: Design Tracking Full Master & Transaction CRUD Schema
-- Description: Complete Postgres schema for Chandak Design & Tracking module.
--              Includes Projects, Wings/Towers, Packages, Sub-Packages, Consultants,
--              Matrix Entries, Look-Ahead Milestones, Statutory Clearances, 
--              Drawings, Revisions, Transmittals, RFIs, and Audit Trail.
-- ==============================================================================

-- 1. Design Projects
CREATE TABLE IF NOT EXISTS public.design_projects (
    id TEXT PRIMARY KEY DEFAULT ('dp-' || substr(md5(random()::text), 1, 10)),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    location VARCHAR(200),
    is_sub_project BOOLEAN DEFAULT false,
    parent_project_id TEXT REFERENCES public.design_projects(id) ON DELETE CASCADE,
    parent_project_name VARCHAR(200),
    sub_project_name VARCHAR(200),
    project_type VARCHAR(100) DEFAULT 'Residential High-Rise',
    plot_area VARCHAR(100),
    built_up_area VARCHAR(100),
    estimated_budget VARCHAR(100),
    rera_number VARCHAR(100),
    project_status VARCHAR(100) DEFAULT 'Planning & Design',
    target_completion_date DATE,
    lead_manager VARCHAR(200),
    lead_manager_email VARCHAR(200),
    tagged_consultants TEXT[] DEFAULT '{}',
    tagged_categories TEXT[] DEFAULT '{}',
    tagged_packages TEXT[] DEFAULT '{}',
    sub_project_consultants JSONB DEFAULT '{}',
    sub_project_categories JSONB DEFAULT '{}',
    sub_project_packages JSONB DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Design Towers / Wings (Sub-Projects)
CREATE TABLE IF NOT EXISTS public.design_towers (
    id TEXT PRIMARY KEY DEFAULT ('twr-' || substr(md5(random()::text), 1, 10)),
    project_id TEXT NOT NULL REFERENCES public.design_projects(id) ON DELETE CASCADE,
    project_name VARCHAR(200),
    tower_name VARCHAR(200) NOT NULL,
    sub_project_code VARCHAR(50),
    tower_type VARCHAR(100) DEFAULT 'Sale',
    total_floors INTEGER DEFAULT 0,
    height_meters NUMERIC(10,2) DEFAULT 0,
    target_completion_date DATE,
    tagged_consultants TEXT[] DEFAULT '{}',
    tagged_categories TEXT[] DEFAULT '{}',
    tagged_packages TEXT[] DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Design Packages / Disciplines (Category Master)
CREATE TABLE IF NOT EXISTS public.design_packages (
    id TEXT PRIMARY KEY DEFAULT ('pkg-' || substr(md5(random()::text), 1, 10)),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    icon VARCHAR(50) DEFAULT '📁',
    color VARCHAR(50) DEFAULT 'blue',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Design Sub-Packages / Work Packages
CREATE TABLE IF NOT EXISTS public.design_sub_packages (
    id TEXT PRIMARY KEY DEFAULT ('spkg-' || substr(md5(random()::text), 1, 10)),
    discipline_id TEXT REFERENCES public.design_packages(id) ON DELETE CASCADE,
    discipline_name VARCHAR(200),
    package_name VARCHAR(200) NOT NULL,
    package_code VARCHAR(50) NOT NULL,
    sub_package_name VARCHAR(200),
    sub_package_code VARCHAR(50),
    default_consultant VARCHAR(200),
    default_duration_days INTEGER DEFAULT 14,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Design Consultants
CREATE TABLE IF NOT EXISTS public.design_consultants (
    id TEXT PRIMARY KEY DEFAULT ('cns-' || substr(md5(random()::text), 1, 10)),
    firm_name VARCHAR(200) NOT NULL,
    discipline VARCHAR(200) NOT NULL,
    categories TEXT[] DEFAULT '{}',
    packages TEXT[] DEFAULT '{}',
    expertise TEXT[] DEFAULT '{}',
    sub_packages TEXT[] DEFAULT '{}',
    contact_person VARCHAR(200),
    email VARCHAR(200),
    phone VARCHAR(100),
    active_projects TEXT[] DEFAULT '{}',
    onboarding_status VARCHAR(50) DEFAULT 'Not Onboard',
    rating NUMERIC(3,2) DEFAULT 4.5,
    total_drawings_submitted INTEGER DEFAULT 0,
    average_tat_days INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Statutory Authorities Master
CREATE TABLE IF NOT EXISTS public.design_statutory_authorities (
    id TEXT PRIMARY KEY DEFAULT ('auth-' || substr(md5(random()::text), 1, 10)),
    authority_name VARCHAR(200) NOT NULL,
    scope VARCHAR(300),
    category VARCHAR(100) DEFAULT 'Municipal',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Statutory Clearances & NOCs
CREATE TABLE IF NOT EXISTS public.design_statutory_clearances (
    id TEXT PRIMARY KEY DEFAULT ('clr-' || substr(md5(random()::text), 1, 10)),
    entry_key VARCHAR(200) UNIQUE,
    project_id TEXT NOT NULL REFERENCES public.design_projects(id) ON DELETE CASCADE,
    tower_id TEXT REFERENCES public.design_towers(id) ON DELETE CASCADE,
    authority_id TEXT REFERENCES public.design_statutory_authorities(id) ON DELETE CASCADE,
    authority_name VARCHAR(200),
    status VARCHAR(50) DEFAULT 'Not Applied',
    planned_date DATE,
    actual_date DATE,
    target_date DATE,
    document_ref VARCHAR(200),
    remarks TEXT,
    updated_by VARCHAR(150),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Master Tender Matrix Status Entries
CREATE TABLE IF NOT EXISTS public.design_matrix_entries (
    id TEXT PRIMARY KEY DEFAULT ('mtx-' || substr(md5(random()::text), 1, 10)),
    entry_key VARCHAR(200) UNIQUE NOT NULL,
    project_id TEXT NOT NULL REFERENCES public.design_projects(id) ON DELETE CASCADE,
    project_name VARCHAR(200),
    tower_id TEXT NOT NULL REFERENCES public.design_towers(id) ON DELETE CASCADE,
    tower_name VARCHAR(200),
    package_id TEXT NOT NULL,
    package_name VARCHAR(200),
    discipline_name VARCHAR(200),
    current_stage VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Pending',
    planned_date DATE,
    actual_date DATE,
    target_date DATE,
    consultant_id TEXT,
    consultant_name VARCHAR(200),
    remarks TEXT,
    updated_by VARCHAR(150),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Look-Ahead Milestones
CREATE TABLE IF NOT EXISTS public.design_look_aheads (
    id TEXT PRIMARY KEY DEFAULT ('la-' || substr(md5(random()::text), 1, 10)),
    project_id TEXT NOT NULL REFERENCES public.design_projects(id) ON DELETE CASCADE,
    tower_id TEXT REFERENCES public.design_towers(id) ON DELETE CASCADE,
    package_id TEXT,
    deliverable_description TEXT NOT NULL,
    milestone_type VARCHAR(100) DEFAULT 'Consultant Submission',
    planned_date DATE NOT NULL,
    forecast_date DATE,
    actual_date DATE,
    status VARCHAR(50) DEFAULT 'On Track',
    lead_discipline VARCHAR(100),
    consultant_responsible VARCHAR(200),
    is_critical_path BOOLEAN DEFAULT false,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Drawings Register
CREATE TABLE IF NOT EXISTS public.design_drawings (
    id TEXT PRIMARY KEY DEFAULT ('drw-' || substr(md5(random()::text), 1, 10)),
    project_id TEXT REFERENCES public.design_projects(id) ON DELETE SET NULL,
    project VARCHAR(200),
    tower_name VARCHAR(200),
    code VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(300) NOT NULL,
    discipline VARCHAR(50) NOT NULL,
    sub_package VARCHAR(200),
    current_revision VARCHAR(20) DEFAULT 'R0',
    status VARCHAR(50) DEFAULT 'Under Review',
    consultant_name VARCHAR(200),
    file_url TEXT,
    file_size VARCHAR(50),
    submitted_date DATE DEFAULT CURRENT_DATE,
    approved_date DATE,
    tags TEXT[] DEFAULT '{}',
    is_gfc BOOLEAN DEFAULT false,
    gfc_released_date DATE,
    gfc_recipient VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Drawing Revisions Ledger
CREATE TABLE IF NOT EXISTS public.design_drawing_revisions (
    id TEXT PRIMARY KEY DEFAULT ('drev-' || substr(md5(random()::text), 1, 10)),
    drawing_id TEXT NOT NULL REFERENCES public.design_drawings(id) ON DELETE CASCADE,
    revision_number VARCHAR(20) NOT NULL,
    file_url TEXT,
    file_size VARCHAR(50),
    changes_summary TEXT,
    submitted_by VARCHAR(150),
    approved_by VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Design Transmittals
CREATE TABLE IF NOT EXISTS public.design_transmittals (
    id TEXT PRIMARY KEY DEFAULT ('trm-' || substr(md5(random()::text), 1, 10)),
    transmittal_number VARCHAR(100) UNIQUE NOT NULL,
    project_id TEXT REFERENCES public.design_projects(id) ON DELETE SET NULL,
    project_name VARCHAR(200),
    tower_name VARCHAR(200),
    issue_date DATE DEFAULT CURRENT_DATE,
    purpose VARCHAR(100) DEFAULT 'For Execution (GFC)',
    recipient_agency VARCHAR(200) NOT NULL,
    recipient_contact VARCHAR(200),
    issued_by VARCHAR(150) NOT NULL,
    drawing_ids TEXT[] DEFAULT '{}',
    drawings_data JSONB DEFAULT '[]',
    remarks TEXT,
    status VARCHAR(50) DEFAULT 'Issued',
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Design RFIs (Requests For Information)
CREATE TABLE IF NOT EXISTS public.design_rfis (
    id TEXT PRIMARY KEY DEFAULT ('rfi-' || substr(md5(random()::text), 1, 10)),
    rfi_number VARCHAR(100) UNIQUE NOT NULL,
    project_id TEXT REFERENCES public.design_projects(id) ON DELETE SET NULL,
    project_name VARCHAR(200),
    tower_name VARCHAR(200),
    discipline VARCHAR(100) NOT NULL,
    drawing_code VARCHAR(100),
    drawing_title VARCHAR(300),
    subject VARCHAR(300) NOT NULL,
    query_description TEXT NOT NULL,
    raised_by VARCHAR(150) NOT NULL,
    raised_date DATE DEFAULT CURRENT_DATE,
    assigned_consultant VARCHAR(200) NOT NULL,
    priority VARCHAR(50) DEFAULT 'Medium',
    target_resolution_date DATE,
    status VARCHAR(50) DEFAULT 'Open',
    consultant_response TEXT,
    responded_by VARCHAR(150),
    responded_date DATE,
    resolving_revision_number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Design Matrix Audit Logs
CREATE TABLE IF NOT EXISTS public.design_matrix_audit_logs (
    id TEXT PRIMARY KEY DEFAULT ('aud-' || substr(md5(random()::text), 1, 10)),
    entry_key VARCHAR(200),
    action VARCHAR(50) DEFAULT 'STATUS_CHANGE',
    entity_type VARCHAR(50),
    entity_id TEXT,
    entity_name VARCHAR(200),
    project_id TEXT,
    project_name VARCHAR(200),
    tower_id TEXT,
    tower_name VARCHAR(200),
    package_id TEXT,
    package_name VARCHAR(200),
    discipline_name VARCHAR(200),
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    previous_planned_date DATE,
    new_planned_date DATE,
    previous_actual_date DATE,
    new_actual_date DATE,
    consultant_name VARCHAR(200),
    changed_by VARCHAR(150),
    changed_by_email VARCHAR(200),
    remarks TEXT,
    impact_summary TEXT,
    mail_sent BOOLEAN DEFAULT false,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create High-Velocity Indexes
CREATE INDEX IF NOT EXISTS idx_design_towers_project ON public.design_towers(project_id);
CREATE INDEX IF NOT EXISTS idx_design_matrix_entries_proj_tower ON public.design_matrix_entries(project_id, tower_id);
CREATE INDEX IF NOT EXISTS idx_design_look_aheads_project ON public.design_look_aheads(project_id);
CREATE INDEX IF NOT EXISTS idx_design_drawings_project ON public.design_drawings(project_id);
CREATE INDEX IF NOT EXISTS idx_design_transmittals_project ON public.design_transmittals(project_id);
CREATE INDEX IF NOT EXISTS idx_design_rfis_project ON public.design_rfis(project_id);
CREATE INDEX IF NOT EXISTS idx_design_matrix_audit_timestamp ON public.design_matrix_audit_logs(timestamp DESC);

-- Enable RLS & Policies
ALTER TABLE public.design_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_towers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_sub_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_consultants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_statutory_authorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_statutory_clearances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_matrix_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_look_aheads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_drawing_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_transmittals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_rfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_matrix_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT unnest(ARRAY[
            'design_projects', 'design_towers', 'design_packages', 'design_sub_packages',
            'design_consultants', 'design_statutory_authorities', 'design_statutory_clearances',
            'design_matrix_entries', 'design_look_aheads', 'design_drawings',
            'design_drawing_revisions', 'design_transmittals', 'design_rfis', 'design_matrix_audit_logs'
        ])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated full access to %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Allow authenticated full access to %I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl, tbl);
        EXECUTE format('GRANT ALL ON public.%I TO authenticated', tbl);
        EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl);
    END LOOP;
END $$;
