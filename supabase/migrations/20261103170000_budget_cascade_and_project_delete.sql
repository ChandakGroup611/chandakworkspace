-- Migration: 20261103170000_budget_cascade_and_project_delete.sql
-- Description: Fix foreign key constraint violations on budget_cost_heads deletion and update budget_delete_project RPC.

-- 1. Alter foreign key constraints to cascade or set null on cost head and tower deletions
ALTER TABLE public.budget_lines
  DROP CONSTRAINT IF EXISTS budget_lines_cost_head_id_fkey,
  DROP CONSTRAINT IF EXISTS budget_lines_subproject_id_fkey;

ALTER TABLE public.budget_lines
  ADD CONSTRAINT budget_lines_cost_head_id_fkey
    FOREIGN KEY (cost_head_id) REFERENCES public.budget_cost_heads(id) ON DELETE CASCADE,
  ADD CONSTRAINT budget_lines_subproject_id_fkey
    FOREIGN KEY (subproject_id) REFERENCES public.budget_subprojects(id) ON DELETE SET NULL;

ALTER TABLE public.budget_incurred_entries
  DROP CONSTRAINT IF EXISTS budget_incurred_entries_cost_head_id_fkey,
  DROP CONSTRAINT IF EXISTS budget_incurred_entries_subproject_id_fkey;

ALTER TABLE public.budget_incurred_entries
  ADD CONSTRAINT budget_incurred_entries_cost_head_id_fkey
    FOREIGN KEY (cost_head_id) REFERENCES public.budget_cost_heads(id) ON DELETE CASCADE,
  ADD CONSTRAINT budget_incurred_entries_subproject_id_fkey
    FOREIGN KEY (subproject_id) REFERENCES public.budget_subprojects(id) ON DELETE SET NULL;

-- 2. Update budget_delete_project stored function to delete dependent child records in explicit order
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

  -- 1. Clear self-referencing foreign keys on budget_versions for this project
  UPDATE public.budget_versions SET parent_id = NULL WHERE project_id = p_project;

  -- 2. Delete schedule rows and schedules for lines of this project
  DELETE FROM public.budget_schedule_rows WHERE schedule_id IN (
    SELECT s.id FROM public.budget_schedules s
    JOIN public.budget_lines l ON l.id = s.line_id
    JOIN public.budget_versions v ON v.id = l.version_id
    WHERE v.project_id = p_project
  );
  DELETE FROM public.budget_schedules WHERE line_id IN (
    SELECT l.id FROM public.budget_lines l
    JOIN public.budget_versions v ON v.id = l.version_id
    WHERE v.project_id = p_project
  );

  -- 3. Delete comments on lines of this project
  DELETE FROM public.budget_comments WHERE version_id IN (
    SELECT id FROM public.budget_versions WHERE project_id = p_project
  );

  -- 4. Delete incurred entries and bills for this project
  DELETE FROM public.budget_incurred_entries WHERE project_id = p_project;
  DELETE FROM public.budget_bills WHERE project_id = p_project;

  -- 5. Delete budget lines for this project's versions
  DELETE FROM public.budget_lines WHERE version_id IN (
    SELECT id FROM public.budget_versions WHERE project_id = p_project
  );

  -- 6. Delete signoffs and signoff levels
  DELETE FROM public.budget_signoffs WHERE version_id IN (
    SELECT id FROM public.budget_versions WHERE project_id = p_project
  );
  DELETE FROM public.budget_signoff_levels WHERE project_id = p_project;

  -- 7. Delete custom values and custom fields for this project
  DELETE FROM public.budget_custom_values WHERE field_id IN (
    SELECT id FROM public.budget_custom_fields WHERE project_id = p_project
  );
  DELETE FROM public.budget_custom_fields WHERE project_id = p_project;

  -- 8. Delete imports for this project
  DELETE FROM public.budget_imports WHERE project_id = p_project;

  -- 9. Delete versions
  DELETE FROM public.budget_versions WHERE project_id = p_project;

  -- 10. Delete cost heads and subprojects
  DELETE FROM public.budget_cost_heads WHERE project_id = p_project;
  DELETE FROM public.budget_subprojects WHERE project_id = p_project;

  -- 11. Finally delete the project itself
  DELETE FROM public.budget_projects WHERE id = p_project;

  PERFORM set_config('budget.deleting_project', 'false', true);
END $$;

