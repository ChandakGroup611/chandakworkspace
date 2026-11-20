-- ==============================================================================
-- Portal permissions for the Sales (Salesforce) dashboard (key sfdc).
-- Same meaning as the IT / Marketing / Admin permissions (see 20261006120000_dashboards_module_rbac.sql).
-- ==============================================================================
INSERT INTO public.permissions (code, name, module, submodule, action, resource_type) VALUES
  ('DASH_SFDC_VIEW',     'View Sales (Salesforce) dashboard',                  'Dashboards', 'Sales (Salesforce)', 'VIEW',     'PAGE'),
  ('DASH_SFDC_DETAILS',  'See Sales (Salesforce) record-level details',        'Dashboards', 'Sales (Salesforce)', 'DETAILS',  'PAGE'),
  ('DASH_SFDC_EXPORT',   'Export Sales (Salesforce) data (Excel / CSV)',       'Dashboards', 'Sales (Salesforce)', 'EXPORT',   'ACTION'),
  ('DASH_SFDC_SCHEDULE', 'Schedule Sales (Salesforce) report emails',          'Dashboards', 'Sales (Salesforce)', 'SCHEDULE', 'ACTION'),
  ('DASH_SFDC_CHAT',     'Use Sales (Salesforce) "Ask the data" assistant',    'Dashboards', 'Sales (Salesforce)', 'CHAT',     'ACTION'),
  ('DASH_SFDC_ADMIN',    'Administer Sales (Salesforce) dashboard',            'Dashboards', 'Sales (Salesforce)', 'ADMIN',    'ACTION'),
  ('DASH_SFDC_MANAGE',   'Full access to Sales (Salesforce) dashboard',        'Dashboards', 'Sales (Salesforce)', 'MANAGE',   'PAGE')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, module = EXCLUDED.module, submodule = EXCLUDED.submodule,
  action = EXCLUDED.action, resource_type = EXCLUDED.resource_type;

-- Admin roles get full access
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN') AND p.code = 'DASH_SFDC_MANAGE'
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
