ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS amendment_version INTEGER DEFAULT 0;
ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS revised_details TEXT;
