-- Migration: Add missing index on workspace_members.workspace_id to fix Seq Scans during JOINs

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id 
ON public.workspace_members (workspace_id) 
WHERE is_deleted = false;
