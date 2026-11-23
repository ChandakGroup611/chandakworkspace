-- ==============================================================================
-- Portal permissions for the Chandak Workspace Admin dashboard (key cws).
-- Same meaning as the IT / Marketing / Admin permissions (see 20261006120000_dashboards_module_rbac.sql).
-- It lists every Chandak Workspace user, so only the admin roles get it by default.
-- ==============================================================================
INSERT INTO public.permissions (code, name, module, submodule, action, resource_type) VALUES
  ('DASH_CWS_VIEW',    'View Chandak Workspace Admin dashboard',             'Dashboards', 'Chandak Workspace Admin', 'VIEW',    'PAGE'),
  ('DASH_CWS_DETAILS', 'See Chandak Workspace Admin user-level details',     'Dashboards', 'Chandak Workspace Admin', 'DETAILS', 'PAGE'),
  ('DASH_CWS_EXPORT',  'Export Chandak Workspace Admin data (Excel / CSV)',  'Dashboards', 'Chandak Workspace Admin', 'EXPORT',  'ACTION'),
  ('DASH_CWS_ADMIN',   'Administer Chandak Workspace Admin dashboard',       'Dashboards', 'Chandak Workspace Admin', 'ADMIN',   'ACTION'),
  ('DASH_CWS_MANAGE',  'Full access to Chandak Workspace Admin dashboard',   'Dashboards', 'Chandak Workspace Admin', 'MANAGE',  'PAGE')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, module = EXCLUDED.module, submodule = EXCLUDED.submodule,
  action = EXCLUDED.action, resource_type = EXCLUDED.resource_type;

-- Admin roles get full access
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN') AND p.code = 'DASH_CWS_MANAGE'
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
