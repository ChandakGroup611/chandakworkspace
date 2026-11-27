-- Release 2: Expected Drawing Deliverables Register
-- Reuses existing design_projects, design_towers, design_packages, design_sub_packages, design_consultants, and dmac_drawings.

CREATE TABLE IF NOT EXISTS public.design_expected_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES public.design_projects(id) ON DELETE CASCADE,
  tower_id TEXT REFERENCES public.design_towers(id) ON DELETE SET NULL,
  package_id TEXT NOT NULL REFERENCES public.design_packages(id) ON DELETE RESTRICT,
  sub_package_id TEXT REFERENCES public.design_sub_packages(id) ON DELETE SET NULL,
  sub_package_name TEXT,
  consultant_id TEXT REFERENCES public.design_consultants(id) ON DELETE SET NULL,
  consultant_name TEXT,
  expected_drawing_ref TEXT,
  title TEXT NOT NULL,
  planned_submission_date DATE,
  responsible_party TEXT,
  priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  milestone_name TEXT,
  matched_drawing_id UUID UNIQUE REFERENCES public.dmac_drawings(id) ON DELETE SET NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ded_project_pkg ON public.design_expected_deliverables (project_id, package_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_ded_planned_date ON public.design_expected_deliverables (planned_submission_date) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_ded_ref ON public.design_expected_deliverables (project_id, upper(expected_drawing_ref)) WHERE expected_drawing_ref IS NOT NULL AND is_deleted = false;

ALTER TABLE public.design_expected_deliverables ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.design_expected_deliverables FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.design_expected_deliverables TO service_role;
