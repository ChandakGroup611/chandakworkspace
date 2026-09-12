-- ==============================================================================
-- Migration: Design Tracking Core Schema (Chandak Workspace)
-- Description: Creates tables for design projects, drawing registers, revisions, 
--              consultant stage-gate reviews, and Good For Construction (GFC) handovers.
-- ==============================================================================

-- 1. Design Projects
CREATE TABLE IF NOT EXISTS public.design_projects (
    id TEXT PRIMARY KEY DEFAULT ('dp-' || substr(md5(random()::text), 1, 10)),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    location VARCHAR(200),
    architect_firm VARCHAR(200),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Design Drawings Register
CREATE TABLE IF NOT EXISTS public.design_drawings (
    id TEXT PRIMARY KEY DEFAULT ('drw-' || substr(md5(random()::text), 1, 10)),
    project_id TEXT REFERENCES public.design_projects(id) ON DELETE SET NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(300) NOT NULL,
    discipline VARCHAR(50) NOT NULL, -- Architectural, Structural, MEP, Landscape, Interior
    current_revision VARCHAR(20) DEFAULT 'R0',
    status VARCHAR(50) DEFAULT 'Under Review', -- Under Review, Approved (GFC), Revision Requested, Site Handed Over
    consultant_name VARCHAR(200),
    file_url TEXT,
    file_size VARCHAR(50),
    submitted_date DATE DEFAULT CURRENT_DATE,
    approved_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Drawing Revisions Audit
CREATE TABLE IF NOT EXISTS public.drawing_revisions (
    id TEXT PRIMARY KEY DEFAULT ('rev-' || substr(md5(random()::text), 1, 10)),
    drawing_id TEXT NOT NULL REFERENCES public.design_drawings(id) ON DELETE CASCADE,
    revision_number VARCHAR(20) NOT NULL,
    file_url TEXT,
    file_size VARCHAR(50),
    changes_summary TEXT,
    submitted_by VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Consultant Stage-Gate Reviews
CREATE TABLE IF NOT EXISTS public.consultant_reviews (
    id TEXT PRIMARY KEY DEFAULT ('crv-' || substr(md5(random()::text), 1, 10)),
    drawing_id TEXT NOT NULL REFERENCES public.design_drawings(id) ON DELETE CASCADE,
    revision_number VARCHAR(20) NOT NULL,
    reviewer_name VARCHAR(150) NOT NULL,
    decision VARCHAR(50) NOT NULL, -- APPROVED, REVISION_REQUIRED, REJECTED
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Good For Construction (GFC) Handover Ledger
CREATE TABLE IF NOT EXISTS public.gfc_releases (
    id TEXT PRIMARY KEY DEFAULT ('gfc-' || substr(md5(random()::text), 1, 10)),
    drawing_id TEXT NOT NULL REFERENCES public.design_drawings(id) ON DELETE CASCADE,
    revision_number VARCHAR(20) NOT NULL,
    site_engineer_name VARCHAR(150) NOT NULL,
    contractor_firm VARCHAR(200) NOT NULL,
    handover_date DATE DEFAULT CURRENT_DATE,
    physical_copies_issued INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Indexes for High-Velocity Queries
CREATE INDEX IF NOT EXISTS idx_design_drawings_project ON public.design_drawings(project_id);
CREATE INDEX IF NOT EXISTS idx_design_drawings_discipline ON public.design_drawings(discipline);
CREATE INDEX IF NOT EXISTS idx_design_drawings_status ON public.design_drawings(status);
CREATE INDEX IF NOT EXISTS idx_drawing_revisions_drawing ON public.drawing_revisions(drawing_id);
