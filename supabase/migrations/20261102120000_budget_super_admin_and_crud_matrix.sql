-- ==============================================================================
-- Organization Budget: Super Admin Universal Access & CRUD Permission Matrix
-- 1. Ensure all CRUD permissions exist for Projects, Versions, Budget, Cost, Reports, Settings, Access
-- 2. Grant Super Admin universal unrestricted access across all budget entities, bypassing member checks
-- 3. Update budget_my_access to automatically grant Super Admins full Administrator capabilities
-- ==============================================================================

-- 1. Insert comprehensive CRUD permissions
INSERT INTO public.budget_permissions (code, area, label, sort) VALUES
  ('project.view',     'Projects', 'View projects, overview, and structures', 1),
  ('project.create',   'Projects', 'Create new development projects', 2),
  ('project.setup',    'Projects', 'Maintain towers, areas, cost heads, and GST rules', 3),
  ('project.delete',   'Projects', 'Delete or archive projects and set-up', 4),

  ('version.view',     'Versions', 'View budget versions, history, and status', 9),
  ('version.open',     'Versions', 'Open and prepare a new budget version', 10),
  ('version.approve',  'Versions', 'Approve versions prepared by user or team', 11),
  ('version.override', 'Versions', 'Edit, override, or manage versions prepared by others', 12),
  ('version.delete',   'Versions', 'Delete or revert draft budget versions', 13),

  ('budget.view',      'Budget',   'View budget worksheets, rates, and line totals', 19),
  ('budget.edit',      'Budget',   'Enter and edit budget figures, rates, and remarks', 20),
  ('budget.import',    'Budget',   'Import detail budget workbooks', 21),
  ('budget.delete',    'Budget',   'Delete or reset budget figures and lines', 22),

  ('cost.view',        'Cost',     'View cost incurred ledger and historical actuals', 29),
  ('cost.enter',       'Cost',     'Record and log cost incurred transactions', 30),
  ('cost.import',      'Cost',     'Import cost incurred sheets', 31),
  ('cost.delete',      'Cost',     'Delete or void recorded cost entries', 32),

  ('report.view',      'Reports',  'View summary, detail, and variance reports', 39),
  ('report.export',    'Reports',  'Export reports and summaries to Excel/PDF', 40),
  ('audit.view',       'Reports',  'View change history and audit trail', 41),
  ('audit.delete',     'Reports',  'Purge or manage audit logs', 42),

  ('fields.view',      'Settings', 'View custom fields and formulas', 49),
  ('fields.manage',    'Settings', 'Add, change, and configure custom fields and forms', 50),
  ('fields.delete',    'Settings', 'Delete or deactivate custom fields', 52),

  ('access.view',      'Settings', 'View member directory, roles, and permissions', 53),
  ('access.manage',    'Settings', 'Manage roles, rights, and member limits', 51),
  ('access.delete',    'Settings', 'Delete custom roles and remove members', 54)
ON CONFLICT (code) DO UPDATE SET
  area = EXCLUDED.area,
  label = EXCLUDED.label,
  sort = EXCLUDED.sort;

-- Ensure Administrator role possesses every single permission in budget_permissions
INSERT INTO public.budget_role_permissions (role_id, permission)
SELECT r.id, p.code
FROM public.budget_roles r
CROSS JOIN public.budget_permissions p
WHERE r.name = 'Administrator'
ON CONFLICT (role_id, permission) DO NOTHING;

-- 2. Helper to determine if user has Super Admin authority in Chandak Workspace
CREATE OR REPLACE FUNCTION public.budget_is_super_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_master um
    JOIN public.roles r ON r.id = um.role_id
    WHERE um.id = COALESCE(p_user_id, auth.uid())
      AND UPPER(r.code) IN ('SUPER_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ADMIN', 'SUPERADMIN')
      AND um.is_active AND NOT um.is_deleted
  ) OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') IN ('SUPER_ADMIN', 'ROLE_SUPER_ADMIN')
    OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') IN ('SUPER_ADMIN', 'ROLE_SUPER_ADMIN');
$$;

-- 3. Super Admins automatically qualify as budget members
CREATE OR REPLACE FUNCTION public.budget_is_member()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.budget_is_super_admin()
     OR EXISTS (SELECT 1 FROM public.budget_members WHERE user_id = auth.uid() AND active);
$$;

-- 4. Super Admins automatically have every right across all projects & departments
CREATE OR REPLACE FUNCTION public.budget_has(p_permission text, p_project bigint DEFAULT null, p_department bigint DEFAULT null)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.budget_is_super_admin()
     OR EXISTS (
       SELECT 1 FROM public.budget_members m
       JOIN public.budget_role_permissions rp ON rp.role_id = m.role_id AND rp.permission = p_permission
       WHERE m.user_id = auth.uid() AND m.active
         AND (m.project_ids IS NULL OR (p_project IS NOT NULL AND p_project = ANY (m.project_ids)))
         AND (p_department IS NULL OR m.department_ids IS NULL OR p_department = ANY (m.department_ids))
     );
$$;

-- 5. budget_my_access returns full unrestricted Administrator access for Super Admins
CREATE OR REPLACE FUNCTION public.budget_my_access()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_super boolean;
  v_uid uuid := auth.uid();
  v_res jsonb;
BEGIN
  v_is_super := public.budget_is_super_admin(v_uid);
  
  IF v_is_super THEN
    SELECT jsonb_build_object(
      'user_id', v_uid,
      'role', 'Super Administrator',
      'role_id', 1,
      'permissions', (SELECT coalesce(jsonb_agg(code ORDER BY sort), '[]'::jsonb) FROM public.budget_permissions),
      'project_ids', null,
      'department_ids', null,
      'name', coalesce(w.full_name, 'Super Administrator'),
      'email', w.email,
      'is_super_admin', true
    ) INTO v_res
    FROM (SELECT 1) _
    LEFT JOIN public.budget_workspace_users w ON w.user_id = v_uid;
    
    RETURN v_res;
  END IF;

  SELECT jsonb_build_object(
    'user_id', m.user_id,
    'role', r.name,
    'role_id', r.id,
    'permissions', coalesce((SELECT jsonb_agg(permission ORDER BY permission) FROM public.budget_role_permissions WHERE role_id = r.id), '[]'::jsonb),
    'project_ids', m.project_ids,
    'department_ids', m.department_ids,
    'name', w.full_name,
    'email', w.email,
    'is_super_admin', false
  ) INTO v_res
  FROM public.budget_members m
  JOIN public.budget_roles r ON r.id = m.role_id
  LEFT JOIN public.budget_workspace_users w ON w.user_id = m.user_id
  WHERE m.user_id = v_uid AND m.active;

  RETURN v_res;
END;
$$;

