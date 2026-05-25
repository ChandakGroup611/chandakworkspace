-- ====================================================
-- ADIOS PLATFORM MIGRATION - Add custom_fields column to tasks
-- ====================================================

-- Add a JSONB column to store arbitrary custom fields per task.
-- This column is optional and defaults to an empty JSON object.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NULL;

-- Create an index to allow efficient querying of specific keys if needed.
CREATE INDEX IF NOT EXISTS idx_tasks_custom_fields ON public.tasks USING gin (custom_fields);
