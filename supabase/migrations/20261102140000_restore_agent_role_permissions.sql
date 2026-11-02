-- ============================================================================
-- Migration: Restore standard operational permissions to ROLE_AGENT
-- Re-establishes the 31 baseline permissions (Tasks, Workspaces, Tickets, Requirements, etc.)
-- ============================================================================

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'c940b6ee-d774-4ccd-aa8e-06e40135e69c', permission_id
FROM public.role_permissions
WHERE role_id = '9ccf7d63-df1d-4c74-a5c4-b7c5ab142295'
ON CONFLICT (role_id, permission_id) DO NOTHING;

