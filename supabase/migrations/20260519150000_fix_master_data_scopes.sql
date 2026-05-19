-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: Scope Alignment & Reseed for Master Dropdown Tables
-- ============================================================================

-- Define scope variables for references:
-- INFRA:  'e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1'
-- ERP:    'e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2'
-- OTHERS: 'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3'

-- 1. Globally Shared Masters: Priorities and Workflow States
-- Make priorities and workflow states globally shared by setting their scope_id to NULL.
UPDATE public.master_priorities 
SET scope_id = NULL;

UPDATE public.workflow_states 
SET scope_id = NULL;

-- 2. Software Systems Alignment
-- Map 'SYS_OTHERS' to OTHERS scope, everything else to ERP scope.
UPDATE public.software_systems 
SET scope_id = 'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3' 
WHERE code = 'SYS_OTHERS';

UPDATE public.software_systems 
SET scope_id = 'e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2' 
WHERE code <> 'SYS_OTHERS';

-- 3. Software Modules Alignment
-- Map 'MOD_GEN_SUPPORT' and 'MOD_ACCESS' to OTHERS scope, everything else to ERP scope.
UPDATE public.software_modules 
SET scope_id = 'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3' 
WHERE code IN ('MOD_GEN_SUPPORT', 'MOD_ACCESS');

UPDATE public.software_modules 
SET scope_id = 'e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2' 
WHERE code NOT IN ('MOD_GEN_SUPPORT', 'MOD_ACCESS');

-- 4. Software Submodules Alignment
-- Submodules inherit scope from their parent software modules.
UPDATE public.software_submodules ss
SET scope_id = sm.scope_id
FROM public.software_modules sm
WHERE ss.module_id = sm.id;

-- 5. Ticket Categories Alignment
-- Map ERP/software related categories to ERP scope; Map hardware/infrastructure related ones to INFRA scope.
UPDATE public.ticket_categories 
SET scope_id = 'e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2' 
WHERE code IN ('ERP', 'BUG & ISSUE', 'REQUIREMENT', 'REPORTS');

UPDATE public.ticket_categories 
SET scope_id = 'e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1' 
WHERE code IN ('HARDWARE', 'CAT_HARDWARE', 'INSTALLATION', 'TEST');

-- 6. Ticket Subcategories Alignment
-- Subcategories inherit scope from their parent ticket categories.
UPDATE public.ticket_subcategories tsc
SET scope_id = tc.scope_id
FROM public.ticket_categories tc
WHERE tsc.category_id = tc.id;

-- 7. Issue Types Alignment
-- Map general/service requests to OTHERS scope; Map requirements/software to ERP scope; Map hardware/OS/laptop/installation to INFRA.
UPDATE public.issue_types 
SET scope_id = 'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3' 
WHERE code IN ('TYPE_SERVICE_REQ', 'ISSUE');

UPDATE public.issue_types 
SET scope_id = 'e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2' 
WHERE code IN ('TYPE_REQUIREMENT', 'SOFTWARES');

UPDATE public.issue_types 
SET scope_id = 'e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1' 
WHERE code IN ('HARDWARE', 'LAPTOP NOT WORKING', 'OS', 'INSTALLATION');

-- 8. Issue Subtypes Alignment
-- Subtypes inherit scope from their parent issue types.
UPDATE public.issue_subtypes ist
SET scope_id = it.scope_id
FROM public.issue_types it
WHERE ist.issue_type_id = it.id;
