-- Fix the requirements select policy to use only valid columns
DROP POLICY IF EXISTS "requirements_strict_select" ON public.requirements;

CREATE POLICY "requirements_strict_select"
ON public.requirements FOR SELECT TO authenticated
USING (
  public.is_super_admin() OR
  public.has_permission_snapshot('REQUIREMENTS_MANAGE') OR
  creator_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.departments d WHERE d.id = requirements.department_id AND d.manager_id = auth.uid() AND d.is_deleted = false) OR
  EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = (requirements.custom_fields->>'workspace_id')::uuid
      AND wm.user_id = auth.uid()
      AND wm.is_deleted = false
  )
);
