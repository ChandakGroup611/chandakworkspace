-- Migration: Establish Workspace Priority Foreign Key relation
-- Description: Ensures workspaces can perform clean relational joins against master_priorities.

-- 1. Sanitize invalid priority references
UPDATE public.workspaces
SET priority_id = NULL
WHERE priority_id IS NOT NULL 
  AND priority_id NOT IN (SELECT id FROM public.master_priorities);

-- 2. Add foreign key constraint
ALTER TABLE public.workspaces 
ADD CONSTRAINT fk_workspaces_priority 
FOREIGN KEY (priority_id) 
REFERENCES public.master_priorities(id) 
ON DELETE SET NULL;
