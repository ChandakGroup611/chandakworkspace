-- ==============================================================================
-- Portal permissions for the Engineering Budget & Inventory dashboard (key engg).
-- Copy to supabase/migrations/<yyyymmddhhmmss>_dashboard_<key>.sql and replace:
--   KEY   -> the permission prefix in capitals, e.g. HR   (codes become DASH_HR_VIEW ...)
--   Engineering Budget -> the dashboard name as users see it, e.g. HR Budget
-- Same meaning as the IT / Marketing / Admin permissions (see 20261006120000_dashboards_module_rbac.sql).
-- ==============================================================================
INSERT INTO public.permissions (code, name, module, submodule, action, resource_type) VALUES
  ('DASH_ENGG_VIEW',     'View Engineering Budget dashboard',                  'Dashboards', 'Engineering Budget', 'VIEW',     'PAGE'),
  ('DASH_ENGG_DETAILS',  'See Engineering Budget record-level details',        'Dashboards', 'Engineering Budget', 'DETAILS',  'PAGE'),
  ('DASH_ENGG_EXPORT',   'Export Engineering Budget data (Excel / CSV)',       'Dashboards', 'Engineering Budget', 'EXPORT',   'ACTION'),
  ('DASH_ENGG_SCHEDULE', 'Schedule Engineering Budget report emails',          'Dashboards', 'Engineering Budget', 'SCHEDULE', 'ACTION'),
  ('DASH_ENGG_CHAT',     'Use Engineering Budget "Ask the data" assistant',    'Dashboards', 'Engineering Budget', 'CHAT',     'ACTION'),
  ('DASH_ENGG_ADMIN',    'Administer Engineering Budget dashboard',            'Dashboards', 'Engineering Budget', 'ADMIN',    'ACTION'),
  ('DASH_ENGG_MANAGE',   'Full access to Engineering Budget dashboard',        'Dashboards', 'Engineering Budget', 'MANAGE',   'PAGE')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, module = EXCLUDED.module, submodule = EXCLUDED.submodule,
  action = EXCLUDED.action, resource_type = EXCLUDED.resource_type;

-- Admin roles get full access
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN') AND p.code = 'DASH_ENGG_MANAGE'
ON CONFLICT DO NOTHING;

-- Rebuild permission snapshots
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
