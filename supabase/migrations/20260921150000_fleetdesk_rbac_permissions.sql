-- ==============================================================================
-- FleetDesk / Vehicle Module — Granular RBAC Permissions Seeding
-- ==============================================================================

-- 1. Insert Granular Permissions into public.permissions
INSERT INTO public.permissions (code, name, module, submodule, action, resource_type) VALUES
  ('VEHICLES_VIEW', 'View Fleet Inventory & Vehicles', 'Fleet & Vehicles', 'Fleet Inventory', 'VIEW', 'PAGE'),
  ('VEHICLES_CREATE', 'Register New Fleet Vehicle', 'Fleet & Vehicles', 'Fleet Inventory', 'CREATE', 'ACTION'),
  ('VEHICLES_UPDATE', 'Edit Vehicle Specs & Compliance', 'Fleet & Vehicles', 'Fleet Inventory', 'UPDATE', 'ACTION'),
  ('VEHICLES_DELETE', 'Delete / Archive Fleet Vehicle', 'Fleet & Vehicles', 'Fleet Inventory', 'DELETE', 'ACTION'),
  ('VEHICLES_MANAGE', 'Full Fleet Vehicle Governance', 'Fleet & Vehicles', 'Fleet Inventory', 'MANAGE', 'PAGE'),

  ('DRIVERS_VIEW', 'View Chauffeurs & Drivers Directory', 'Fleet & Vehicles', 'Chauffeur Pool', 'VIEW', 'PAGE'),
  ('DRIVERS_MANAGE', 'Manage & Onboard Chauffeurs', 'Fleet & Vehicles', 'Chauffeur Pool', 'MANAGE', 'ACTION'),

  ('TRIPS_VIEW', 'View Corporate Trip Sheets & Movements', 'Fleet & Vehicles', 'Transit Operations', 'VIEW', 'PAGE'),
  ('TRIPS_CREATE', 'Dispatch / Book Corporate Movement', 'Fleet & Vehicles', 'Transit Operations', 'CREATE', 'ACTION'),
  ('TRIPS_DISPATCH', 'Dispatch Corporate Fleet Movement', 'Fleet & Vehicles', 'Transit Operations', 'CREATE', 'ACTION'),
  ('TRIPS_MANAGE', 'Manage Trip Sheets & Route Cancellations', 'Fleet & Vehicles', 'Transit Operations', 'MANAGE', 'ACTION'),

  ('FLEET_MAINTENANCE_VIEW', 'View Workshop & Service Logs', 'Fleet & Vehicles', 'Maintenance & Workshop', 'VIEW', 'PAGE'),
  ('FLEET_MAINTENANCE_MANAGE', 'Log & Approve Fleet Maintenance', 'Fleet & Vehicles', 'Maintenance & Workshop', 'MANAGE', 'ACTION'),

  ('FLEET_REPORTS_VIEW', 'View Fleet Analytics & Utilization', 'Fleet & Vehicles', 'Executive Analytics', 'VIEW', 'PAGE')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  module = EXCLUDED.module,
  submodule = EXCLUDED.submodule,
  action = EXCLUDED.action,
  resource_type = EXCLUDED.resource_type;

-- 2. Map All New Permissions to SUPER_ADMIN and ROLE_ADMIN
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p 
WHERE r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN')
  AND p.code IN (
    'VEHICLES_VIEW', 'VEHICLES_CREATE', 'VEHICLES_UPDATE', 'VEHICLES_DELETE', 'VEHICLES_MANAGE',
    'DRIVERS_VIEW', 'DRIVERS_MANAGE',
    'TRIPS_VIEW', 'TRIPS_CREATE', 'TRIPS_DISPATCH', 'TRIPS_MANAGE',
    'FLEET_MAINTENANCE_VIEW', 'FLEET_MAINTENANCE_MANAGE',
    'FLEET_REPORTS_VIEW'
  )
ON CONFLICT DO NOTHING;

-- 3. Map Basic View & Trip Booking Permissions to Standard Staff / Member Roles
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p 
WHERE r.code IN ('ROLE_STAFF', 'STAFF', 'MEMBER')
  AND p.code IN ('VEHICLES_VIEW', 'TRIPS_VIEW', 'TRIPS_CREATE')
ON CONFLICT DO NOTHING;

-- 4. Rebuild user permissions snapshot for all active users
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.user_master WHERE is_deleted = false LOOP
        BEGIN
            PERFORM public.refresh_single_user_permissions_snapshot(r.id);
        EXCEPTION WHEN OTHERS THEN
            -- Continue if user snapshot function encounters non-critical warning
            NULL;
        END;
    END LOOP;
END $$;
