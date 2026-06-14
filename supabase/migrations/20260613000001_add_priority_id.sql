-- Add priority_id to requirements table since it was missing in the previous migration

BEGIN;

ALTER TABLE public.requirements 
ADD COLUMN IF NOT EXISTS priority_id UUID REFERENCES public.priority_master(id) ON DELETE SET NULL;

COMMIT;
