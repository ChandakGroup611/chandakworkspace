const fs = require('fs');

const fixSQL = `
-- ============================================================================
-- FINAL FUNCTION OVERWRITES TO FIX LEGACY REFERENCES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_see_task(p_task_id UUID, p_creator_id UUID) 
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ 
BEGIN 
    IF public.is_super_admin() THEN RETURN TRUE; END IF; 
    IF auth.uid() = p_creator_id THEN RETURN TRUE; END IF; 
    IF EXISTS (SELECT 1 FROM public.task_assignees WHERE task_id = p_task_id AND user_id = auth.uid()) THEN RETURN TRUE; END IF; 
    IF EXISTS (SELECT 1 FROM public.task_teams tt JOIN public.team_members tm ON tt.team_id = tm.team_id WHERE tt.task_id = p_task_id AND tm.user_id = auth.uid()) THEN RETURN TRUE; END IF; 
    IF EXISTS (SELECT 1 FROM public.tasks t JOIN public.workspace_members wm ON t.workspace_id = wm.workspace_id WHERE t.id = p_task_id AND wm.user_id = auth.uid()) THEN RETURN TRUE; END IF; 
    RETURN FALSE; 
END; 
$$;

CREATE OR REPLACE FUNCTION public.is_task_member(p_task_id UUID) 
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ 
BEGIN 
    IF public.is_super_admin() THEN RETURN TRUE; END IF; 
    IF EXISTS (SELECT 1 FROM public.tasks WHERE id = p_task_id AND created_by = auth.uid()) THEN RETURN TRUE; END IF; 
    IF EXISTS (SELECT 1 FROM public.task_assignees WHERE task_id = p_task_id AND user_id = auth.uid()) THEN RETURN TRUE; END IF; 
    IF EXISTS (SELECT 1 FROM public.task_teams tt JOIN public.team_members tm ON tt.team_id = tm.team_id WHERE tt.task_id = p_task_id AND tm.user_id = auth.uid()) THEN RETURN TRUE; END IF; 
    RETURN FALSE; 
END; 
$$;

CREATE OR REPLACE FUNCTION public.can_see_workspace(p_workspace_id UUID) 
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ 
BEGIN 
    IF public.is_super_admin() THEN RETURN TRUE; END IF; 
    IF EXISTS (SELECT 1 FROM public.workspaces WHERE id = p_workspace_id AND workspace_owner_id = auth.uid()) THEN RETURN TRUE; END IF; 
    IF EXISTS (SELECT 1 FROM public.workspaces w JOIN public.user_master u ON w.company_id = u.company_id JOIN public.role_master r ON u.role_id = r.id WHERE w.id = p_workspace_id AND u.id = auth.uid() AND r.role_name IN ('COMPANY_ADMIN', 'COMPANY_OWNER')) THEN RETURN TRUE; END IF; 
    IF EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = p_workspace_id AND wm.user_id = auth.uid()) THEN RETURN TRUE; END IF; 
    IF EXISTS (SELECT 1 FROM public.tasks t WHERE t.workspace_id = p_workspace_id AND (t.created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.task_teams tt JOIN public.team_members tm ON tt.team_id = tm.team_id WHERE tt.task_id = t.id AND tm.user_id = auth.uid()))) THEN RETURN TRUE; END IF; 
    RETURN FALSE; 
END; 
$$;
`;

const content = fs.readFileSync('guaranteed_schema.sql', 'utf8');
const parts = content.split('-- POLICIES DEFERRED TO END --');
fs.writeFileSync('guaranteed_schema.sql', parts[0] + fixSQL + '\n-- POLICIES DEFERRED TO END --' + parts[1]);
console.log('Fixed functions appended before policies.');
