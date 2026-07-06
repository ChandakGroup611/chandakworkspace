-- ============================================================================
-- ADIOS PLATFORM MIGRATION - SCOPE-AWARE RLS SECURITY AND VISIBILITY
-- ============================================================================

-- 1. Redefine WORKSPACES Select Policy (Scope-Aware)
DROP POLICY IF EXISTS policy_workspaces_select ON public.workspaces;
DROP POLICY IF EXISTS policy_workspaces_select ON public.workspaces;
CREATE POLICY policy_workspaces_select ON public.workspaces FOR SELECT TO authenticated
USING (
    public.is_super_admin()
    OR public.can_see_record(owner_id, NULL)
    OR public.is_workspace_member(id)
    OR EXISTS (
        SELECT 1 FROM public.user_permissions_snapshot ups
        WHERE ups.user_id = auth.uid()
          AND ups.permission_code IN ('WORKSPACES_VIEW', 'WORKSPACES_MANAGE')
          AND (
              id = ANY(ups.workspace_scope)
              OR (department_id IS NOT NULL AND department_id = ANY(ups.department_scope))
              OR (company_id IS NOT NULL AND company_id = ANY(ups.company_scope))
              OR COALESCE((visibility_settings ->> 'public')::boolean, false) = true
          )
    )
);

-- 2. Redefine TASKS (workspace_tasks) Select Policy (Linked to Workspace Visibility)
DROP POLICY IF EXISTS policy_tasks_select ON public.workspace_tasks;
DROP POLICY IF EXISTS policy_tasks_select ON public.workspace_tasks;
CREATE POLICY policy_tasks_select ON public.workspace_tasks FOR SELECT TO authenticated
USING (
    public.is_super_admin()
    OR public.can_see_record(creator_id, assignee_id)
    OR (
        (public.check_user_permission('TASKS_VIEW') OR public.check_user_permission('TASKS_MANAGE'))
        AND EXISTS (
            SELECT 1 FROM public.workspaces w
            WHERE w.id = workspace_id
        )
    )
);

-- 3. Redefine TICKETS Select Policy (Scope-Aware)
DROP POLICY IF EXISTS policy_tickets_select ON public.tickets;
DROP POLICY IF EXISTS policy_tickets_select ON public.tickets;
CREATE POLICY policy_tickets_select ON public.tickets FOR SELECT TO authenticated
USING (
    public.is_super_admin()
    OR public.can_see_record(creator_id, assignee_id)
    OR EXISTS (
        SELECT 1 FROM public.user_permissions_snapshot ups
        WHERE ups.user_id = auth.uid()
          AND ups.permission_code IN ('TICKETS_VIEW', 'TICKETS_MANAGE')
          AND (
              (department_id IS NOT NULL AND department_id = ANY(ups.department_scope))
          )
    )
);

-- 4. Redefine REQUIREMENTS Select Policy (Scope-Aware)
DROP POLICY IF EXISTS policy_requirements_select ON public.requirements;
DROP POLICY IF EXISTS policy_requirements_select ON public.requirements;
CREATE POLICY policy_requirements_select ON public.requirements FOR SELECT TO authenticated
USING (
    public.is_super_admin()
    OR public.can_see_record(creator_id, NULL)
    OR EXISTS (
        SELECT 1 FROM public.user_permissions_snapshot ups
        WHERE ups.user_id = auth.uid()
          AND ups.permission_code IN ('REQUIREMENTS_VIEW', 'REQUIREMENTS_MANAGE')
          AND (
              (department_id IS NOT NULL AND department_id = ANY(ups.department_scope))
          )
    )
);
