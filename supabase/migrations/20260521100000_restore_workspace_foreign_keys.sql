-- 20260521100000_restore_workspace_foreign_keys.sql
-- Restores missing foreign key constraints on the workspaces table

-- Add foreign key constraint for owner_id linking to user_master
ALTER TABLE public.workspaces
    DROP CONSTRAINT IF EXISTS workspaces_owner_id_fkey;

ALTER TABLE public.workspaces
    ADD CONSTRAINT workspaces_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES public.user_master(id)
    ON DELETE SET NULL;

-- Notify PostgREST to reload the schema cache so the API recognizes the relationship
NOTIFY pgrst, 'reload schema';
