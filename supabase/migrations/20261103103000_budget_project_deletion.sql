-- Migration: 20261103103000_budget_project_deletion.sql
-- Description: Enable clean deletion of empty/test projects and add budget_delete_project RPC function.
-- Resolves block where empty projects with approved version R1 could not be deleted.

-- 1. Helper to determine if caller is Super Admin (including service_role & postgres)
CREATE OR REPLACE FUNCTION public.budget_is_super_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(auth.role(), '') = 'service_role'
    OR current_user = 'postgres'
    OR EXISTS (
      SELECT 1 FROM public.user_master um
      JOIN public.roles r ON r.id = um.role_id
      WHERE um.id = COALESCE(p_user_id, auth.uid())
        AND UPPER(r.code) IN ('SUPER_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ADMIN', 'SUPERADMIN')
        AND um.is_active AND NOT um.is_deleted
    ) OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') IN ('SUPER_ADMIN', 'ROLE_SUPER_ADMIN')
      OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') IN ('SUPER_ADMIN', 'ROLE_SUPER_ADMIN');
$$;

-- 2. Update budget_guard_version to allow project deletion and deletion of empty versions
CREATE OR REPLACE FUNCTION public.budget_guard_version() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- If project deletion session flag is active or caller is super admin, allow all mutations
  IF current_setting('budget.deleting_project', true) = 'true' OR public.budget_is_super_admin() THEN
    IF tg_op = 'DELETE' THEN
      RETURN old;
    ELSE
      RETURN new;
    END IF;
  END IF;

  IF tg_op = 'DELETE' THEN
    -- If the version has no non-zero figures, allow deletion
    IF old.status = 'approved' AND EXISTS (
      SELECT 1 FROM public.budget_lines l
      WHERE l.version_id = old.id AND (COALESCE(l.initial_paise, 0) <> 0 OR COALESCE(l.ctc_paise, 0) <> 0)
    ) THEN
      RAISE EXCEPTION 'An approved version cannot be deleted';
    END IF;

    RETURN old;
  END IF;

  IF old.status = 'approved' THEN
    RAISE EXCEPTION 'Version R% is approved and locked', old.number;
  END IF;

  RETURN new;
END $$;

-- 3. Update budget_guard_line to allow line cleanup during project deletion or for zero-amount lines
CREATE OR REPLACE FUNCTION public.budget_guard_line() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v record;
BEGIN
  IF tg_op = 'DELETE' AND (current_setting('budget.deleting_project', true) = 'true' OR public.budget_is_super_admin()) THEN
    RETURN old;
  END IF;

  SELECT status, project_id INTO v FROM public.budget_versions
  WHERE id = CASE WHEN tg_op = 'DELETE' THEN old.version_id else new.version_id end;

  IF v IS NULL THEN
    RETURN COALESCE(new, old);
  END IF;

  IF tg_op = 'DELETE' AND v.status = 'approved' AND NOT EXISTS (
    SELECT 1 FROM public.budget_lines l
    WHERE l.id = old.id AND (COALESCE(l.initial_paise, 0) <> 0 OR COALESCE(l.ctc_paise, 0) <> 0)
  ) THEN
    RETURN old;
  END IF;

  IF v.status <> 'draft' THEN
    RAISE EXCEPTION 'Version is approved and locked; open a new version to make changes';
  END IF;

  IF tg_op <> 'DELETE' THEN
    IF NOT EXISTS (SELECT 1 FROM public.budget_cost_heads h WHERE h.id = new.cost_head_id AND h.project_id = v.project_id) THEN
      RAISE EXCEPTION 'Cost head % does not belong to this project', new.cost_head_id;
    END IF;
    IF new.subproject_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.budget_subprojects s WHERE s.id = new.subproject_id AND s.project_id = v.project_id) THEN
      RAISE EXCEPTION 'Tower % does not belong to this project', new.subproject_id;
    END IF;
    new.updated_at := now();
    new.updated_by := COALESCE(auth.uid(), new.updated_by);
  END IF;

  RETURN COALESCE(new, old);
END $$;

-- 4. Create budget_delete_project RPC function
CREATE OR REPLACE FUNCTION public.budget_delete_project(p_project bigint)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.budget_projects;
BEGIN
  SELECT * INTO p FROM public.budget_projects WHERE id = p_project;
  IF p.id IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  -- Verify permissions: Super Admin, or user with project.delete or project.setup permission
  IF NOT (public.budget_is_super_admin() OR public.budget_has('project.delete', p_project) OR public.budget_has('project.setup', p_project)) THEN
    RAISE EXCEPTION 'You do not have permission to delete this project';
  END IF;

  -- Safety check for non-super-admin: cannot delete if project carries actual figures or recorded bills
  IF NOT public.budget_is_super_admin() THEN
    IF EXISTS (SELECT 1 FROM public.budget_bills WHERE project_id = p_project) THEN
      RAISE EXCEPTION 'Cannot delete project: it has recorded bills';
    END IF;
    IF EXISTS (SELECT 1 FROM public.budget_incurred_entries WHERE project_id = p_project AND COALESCE(amount_paise, 0) <> 0) THEN
      RAISE EXCEPTION 'Cannot delete project: it has cost incurred recorded against it';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.budget_lines l
      JOIN public.budget_versions v ON v.id = l.version_id
      WHERE v.project_id = p_project AND (COALESCE(l.initial_paise, 0) <> 0 OR COALESCE(l.ctc_paise, 0) <> 0)
    ) THEN
      RAISE EXCEPTION 'Cannot delete project: it has active budget figures';
    END IF;
  END IF;

  -- Set session flag to signal project deletion in progress
  PERFORM set_config('budget.deleting_project', 'true', true);

  -- Clear self-referencing foreign keys on budget_versions for this project
  UPDATE public.budget_versions SET parent_id = NULL WHERE project_id = p_project;

  -- Delete the project (cascades to child tables: versions, subprojects, cost heads, etc.)
  DELETE FROM public.budget_projects WHERE id = p_project;

  PERFORM set_config('budget.deleting_project', 'false', true);
END $$;

REVOKE EXECUTE ON FUNCTION public.budget_delete_project(bigint) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.budget_delete_project(bigint) TO authenticated;
