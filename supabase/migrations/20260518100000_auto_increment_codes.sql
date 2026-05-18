-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: Native PostgreSQL Sequence-Driven Entity Codes Auto-Generation
-- Entities: Companies, Workspaces, Workspace Tasks
-- ============================================================================

-- Ensure foreign key relationships exist for workspace_tasks and user_master
ALTER TABLE public.workspace_tasks DROP CONSTRAINT IF EXISTS workspace_tasks_assignee_fkey;
ALTER TABLE public.workspace_tasks ADD CONSTRAINT workspace_tasks_assignee_fkey FOREIGN KEY (assignee_id) REFERENCES public.user_master(id) ON DELETE SET NULL;

ALTER TABLE public.workspace_tasks DROP CONSTRAINT IF EXISTS workspace_tasks_creator_fkey;
ALTER TABLE public.workspace_tasks ADD CONSTRAINT workspace_tasks_creator_fkey FOREIGN KEY (creator_id) REFERENCES public.user_master(id) ON DELETE SET NULL;

-- 1. Companies Auto Code Sequence & Default Value
CREATE SEQUENCE IF NOT EXISTS public.companies_code_seq;
SELECT setval(
    'public.companies_code_seq', 
    COALESCE((SELECT MAX(NULLIF(regexp_replace(code, '\D', '', 'g'), '')::integer) FROM public.companies), 0) + 1, 
    false
);
ALTER TABLE public.companies ALTER COLUMN code SET DEFAULT ('CO-' || lpad(nextval('public.companies_code_seq')::text, 6, '0'));

-- 2. Workspaces Auto Code Sequence & Default Value
CREATE SEQUENCE IF NOT EXISTS public.workspaces_code_seq;
SELECT setval(
    'public.workspaces_code_seq', 
    COALESCE((SELECT MAX(NULLIF(regexp_replace(code, '\D', '', 'g'), '')::integer) FROM public.workspaces), 0) + 1, 
    false
);
ALTER TABLE public.workspaces ALTER COLUMN code SET DEFAULT ('WS-' || lpad(nextval('public.workspaces_code_seq')::text, 6, '0'));

-- 3. Workspace Tasks Auto Code Sequence & Default Value
CREATE SEQUENCE IF NOT EXISTS public.workspace_tasks_code_seq;
SELECT setval(
    'public.workspace_tasks_code_seq', 
    COALESCE((SELECT MAX(NULLIF(regexp_replace(code, '\D', '', 'g'), '')::integer) FROM public.workspace_tasks), 0) + 1, 
    false
);
ALTER TABLE public.workspace_tasks ALTER COLUMN code SET DEFAULT ('TSK-' || lpad(nextval('public.workspace_tasks_code_seq')::text, 6, '0'));

-- 4. Seed Foundational Corporate Teams
INSERT INTO public.teams (name, description) VALUES
    ('Cloud Engineering Squad', 'Enterprise scale cloud migration, serverless design, and DevOps optimization.'),
    ('SecOps Integrity Unit', 'Global threat mitigation, IAM controls verification, and pentesting routines.'),
    ('ERP Operations & Finance', 'Calibrating S/4HANA financial ledgers, audit compliance, and resource mapping.')
ON CONFLICT (name) DO NOTHING;
