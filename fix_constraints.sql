-- Drop the restrictive unique constraints that prevent duplicate codes across different scopes
ALTER TABLE public.status_master DROP CONSTRAINT IF EXISTS workflow_states_code_key;
ALTER TABLE public.status_master DROP CONSTRAINT IF EXISTS status_master_status_code_key;

ALTER TABLE public.priority_master DROP CONSTRAINT IF EXISTS master_priorities_code_key;
ALTER TABLE public.priority_master DROP CONSTRAINT IF EXISTS priority_master_priority_code_key;

ALTER TABLE public.issue_types DROP CONSTRAINT IF EXISTS issue_types_code_key;
ALTER TABLE public.issue_subtypes DROP CONSTRAINT IF EXISTS issue_subtypes_code_key;
ALTER TABLE public.ticket_categories DROP CONSTRAINT IF EXISTS ticket_categories_code_key;
ALTER TABLE public.ticket_subcategories DROP CONSTRAINT IF EXISTS ticket_subcategories_code_key;
