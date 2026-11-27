-- Extend design_user_access with Sub-project (Tower) scope & per-project role overrides
-- Additive migration: preserves all existing rows and permissions.

ALTER TABLE public.design_user_access
  ADD COLUMN IF NOT EXISTS assigned_sub_project_ids TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS project_role_overrides JSONB NOT NULL DEFAULT '[]'::jsonb;
