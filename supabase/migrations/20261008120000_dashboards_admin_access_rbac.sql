INSERT INTO public.permissions (code, name, module, submodule, action, resource_type) VALUES
  ('DASH_ADM_VIEW',    'View Admin Access dashboard',                 'Dashboards', 'Admin Access', 'VIEW',    'PAGE'),
  ('DASH_ADM_DETAILS', 'See named people, roles and staffing lists',  'Dashboards', 'Admin Access', 'DETAILS', 'PAGE'),
  ('DASH_ADM_EXPORT',  'Export Admin Access data (Excel / CSV)',      'Dashboards', 'Admin Access', 'EXPORT',  'ACTION'),
  ('DASH_ADM_ADMIN',   'Administer Admin Access dashboard',           'Dashboards', 'Admin Access', 'ADMIN',   'ACTION'),
  ('DASH_ADM_MANAGE',  'Full access to Admin Access dashboard',       'Dashboards', 'Admin Access', 'MANAGE',  'PAGE')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, module = EXCLUDED.module, submodule = EXCLUDED.submodule,
  action = EXCLUDED.action, resource_type = EXCLUDED.resource_type;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN') AND p.code = 'DASH_ADM_MANAGE'
ON CONFLICT DO NOTHING;

UPDATE public.modules_master
SET description = 'Department dashboards on live IN4 data (IT, Marketing, Admin Access, ...)'
WHERE code = 'DASHBOARDS';

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
