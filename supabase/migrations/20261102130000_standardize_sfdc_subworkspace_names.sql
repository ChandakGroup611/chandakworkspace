-- ============================================================================
-- Migration: Standardize SFDC sub-workspaces to hierarchical naming convention
-- Follows rule: Level 1 (WS -> SW): WS "A", SW "B" -> "A - B"
-- ============================================================================

UPDATE public.workspaces
SET workspace_name = 'SFDC - CRM'
WHERE parent_workspace_id = '017b249a-2848-46ef-ab1a-31f2536bde42' AND workspace_name = 'CRM';

UPDATE public.workspaces
SET workspace_name = 'SFDC - MARKETING'
WHERE parent_workspace_id = '017b249a-2848-46ef-ab1a-31f2536bde42' AND workspace_name = 'MARKETING';

UPDATE public.workspaces
SET workspace_name = 'SFDC - PRESALES'
WHERE parent_workspace_id = '017b249a-2848-46ef-ab1a-31f2536bde42' AND workspace_name = 'PRESALES';

UPDATE public.workspaces
SET workspace_name = 'SFDC - SALES'
WHERE parent_workspace_id = '017b249a-2848-46ef-ab1a-31f2536bde42' AND workspace_name = 'SALES';

UPDATE public.workspaces
SET workspace_name = 'SFDC - SOURCING'
WHERE parent_workspace_id = '017b249a-2848-46ef-ab1a-31f2536bde42' AND workspace_name = 'SOURCING';

