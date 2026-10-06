-- ==============================================================================
-- Dashboards module (IT, Marketing, ... budget dashboards served under /dashboards)
--  1. DASHBOARDS row in modules_master (tile in the module picker)
--  2. DASH_<KEY>_* permissions per dashboard, mapped to admin roles
--  3. dashboard_user_access: optional per-user company scope (IN4 company ids)
--  4. Rebuild permission snapshots
-- Permission meaning (per dashboard):
--   _VIEW      dashboard, KPIs, charts, KPI drill-downs
--   _DETAILS   record-level tables, record panel, saved views
--   _EXPORT    Excel / CSV downloads
--   _SCHEDULE  scheduled report emails (also needs _EXPORT)
--   _CHAT      "Ask the data" assistant
--   _ADMIN     data refresh, connection test, audit log
--   _MANAGE    all of the above
-- ==============================================================================

-- 1. Module
INSERT INTO public.modules_master (code, name, description, icon, route_path, display_order, is_active)
VALUES ('DASHBOARDS', 'Dashboards', 'Department budget & expense dashboards on live IN4 data (IT, Marketing, ...)',
        'LineChart', '/dashboards', 4, true)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon,
    route_path = EXCLUDED.route_path, display_order = EXCLUDED.display_order, is_active = true;

-- 2. Permissions
INSERT INTO public.permissions (code, name, module, submodule, action, resource_type) VALUES
  ('DASH_IT_VIEW',      'View IT Budget dashboard',                 'Dashboards', 'IT Budget', 'VIEW',     'PAGE'),
  ('DASH_IT_DETAILS',   'See IT Budget record-level details',       'Dashboards', 'IT Budget', 'DETAILS',  'PAGE'),
  ('DASH_IT_EXPORT',    'Export IT Budget data (Excel / CSV)',      'Dashboards', 'IT Budget', 'EXPORT',   'ACTION'),
  ('DASH_IT_SCHEDULE',  'Schedule IT Budget report emails',         'Dashboards', 'IT Budget', 'SCHEDULE', 'ACTION'),
  ('DASH_IT_CHAT',      'Use IT Budget "Ask the data" assistant',   'Dashboards', 'IT Budget', 'CHAT',     'ACTION'),
  ('DASH_IT_ADMIN',     'Administer IT Budget dashboard',           'Dashboards', 'IT Budget', 'ADMIN',    'ACTION'),
  ('DASH_IT_MANAGE',    'Full access to IT Budget dashboard',       'Dashboards', 'IT Budget', 'MANAGE',   'PAGE'),
  ('DASH_MKT_VIEW',     'View Marketing Budget dashboard',          'Dashboards', 'Marketing Budget', 'VIEW',     'PAGE'),
  ('DASH_MKT_DETAILS',  'See Marketing Budget record-level details', 'Dashboards', 'Marketing Budget', 'DETAILS',  'PAGE'),
  ('DASH_MKT_EXPORT',   'Export Marketing Budget data (Excel / CSV)', 'Dashboards', 'Marketing Budget', 'EXPORT',   'ACTION'),
  ('DASH_MKT_SCHEDULE', 'Schedule Marketing Budget report emails',  'Dashboards', 'Marketing Budget', 'SCHEDULE', 'ACTION'),
  ('DASH_MKT_CHAT',     'Use Marketing Budget "Ask the data" assistant', 'Dashboards', 'Marketing Budget', 'CHAT', 'ACTION'),
  ('DASH_MKT_ADMIN',    'Administer Marketing Budget dashboard',    'Dashboards', 'Marketing Budget', 'ADMIN',    'ACTION'),
  ('DASH_MKT_MANAGE',   'Full access to Marketing Budget dashboard', 'Dashboards', 'Marketing Budget', 'MANAGE',   'PAGE')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, module = EXCLUDED.module, submodule = EXCLUDED.submodule,
  action = EXCLUDED.action, resource_type = EXCLUDED.resource_type;

-- Admin roles get full access (they also bypass checks in lib/permissions)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN') AND p.code IN ('DASH_IT_MANAGE', 'DASH_MKT_MANAGE')
ON CONFLICT DO NOTHING;

-- 3. Optional company scope per user and dashboard. No row = all companies.
CREATE TABLE IF NOT EXISTS public.dashboard_user_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_master(id) ON DELETE CASCADE,
    dashboard_key TEXT NOT NULL,                 -- 'it', 'mkt', ...
    company_ids INTEGER[],                       -- IN4 company ids; NULL = all companies
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_dashboard_user_access UNIQUE (user_id, dashboard_key)
);
CREATE INDEX IF NOT EXISTS idx_dashboard_user_access_user ON public.dashboard_user_access(user_id);

ALTER TABLE public.dashboard_user_access ENABLE ROW LEVEL SECURITY;
-- Read and written only by the server (service role); users never query it directly.
DROP POLICY IF EXISTS "Users can view own dashboard access" ON public.dashboard_user_access;
CREATE POLICY "Users can view own dashboard access" ON public.dashboard_user_access
FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 4. Rebuild permission snapshots
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.user_master WHERE is_deleted = false LOOP
        BEGIN
            PERFORM public.refresh_single_user_permissions_snapshot(r.id);
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END LOOP;
END $$;
