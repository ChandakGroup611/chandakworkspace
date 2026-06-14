-- Migration: Fix master data global unique constraints
-- Change global 'code' unique constraints to be scoped to 'scope_id'

-- 1. ticket_categories
ALTER TABLE public.ticket_categories DROP CONSTRAINT IF EXISTS ticket_categories_code_key;
ALTER TABLE public.ticket_categories DROP CONSTRAINT IF EXISTS ticket_categories_scope_code_key;
ALTER TABLE public.ticket_categories ADD CONSTRAINT ticket_categories_scope_code_key UNIQUE (scope_id, code);

-- 2. ticket_subcategories
ALTER TABLE public.ticket_subcategories DROP CONSTRAINT IF EXISTS ticket_subcategories_code_key;
ALTER TABLE public.ticket_subcategories DROP CONSTRAINT IF EXISTS ticket_subcategories_scope_code_key;
ALTER TABLE public.ticket_subcategories ADD CONSTRAINT ticket_subcategories_scope_code_key UNIQUE (scope_id, code);

-- 3. issue_types
ALTER TABLE public.issue_types DROP CONSTRAINT IF EXISTS issue_types_code_key;
ALTER TABLE public.issue_types DROP CONSTRAINT IF EXISTS issue_types_scope_code_key;
ALTER TABLE public.issue_types ADD CONSTRAINT issue_types_scope_code_key UNIQUE (scope_id, code);

-- 4. issue_subtypes
ALTER TABLE public.issue_subtypes DROP CONSTRAINT IF EXISTS issue_subtypes_code_key;
ALTER TABLE public.issue_subtypes DROP CONSTRAINT IF EXISTS issue_subtypes_scope_code_key;
ALTER TABLE public.issue_subtypes ADD CONSTRAINT issue_subtypes_scope_code_key UNIQUE (scope_id, code);

-- 5. assets
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_code_key;
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_scope_code_key;
ALTER TABLE public.assets ADD CONSTRAINT assets_scope_code_key UNIQUE (scope_id, code);

-- 6. software_systems
ALTER TABLE public.software_systems DROP CONSTRAINT IF EXISTS software_systems_code_key;
ALTER TABLE public.software_systems DROP CONSTRAINT IF EXISTS software_systems_scope_code_key;
ALTER TABLE public.software_systems ADD CONSTRAINT software_systems_scope_code_key UNIQUE (scope_id, code);

-- 7. software_modules
ALTER TABLE public.software_modules DROP CONSTRAINT IF EXISTS software_modules_code_key;
ALTER TABLE public.software_modules DROP CONSTRAINT IF EXISTS software_modules_scope_code_key;
ALTER TABLE public.software_modules ADD CONSTRAINT software_modules_scope_code_key UNIQUE (scope_id, code);

-- 8. software_submodules
ALTER TABLE public.software_submodules DROP CONSTRAINT IF EXISTS software_submodules_code_key;
ALTER TABLE public.software_submodules DROP CONSTRAINT IF EXISTS software_submodules_scope_code_key;
ALTER TABLE public.software_submodules ADD CONSTRAINT software_submodules_scope_code_key UNIQUE (scope_id, code);
