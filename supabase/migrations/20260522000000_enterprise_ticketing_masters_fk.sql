-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Purpose: Add Relational Master Data Columns to Tickets
-- ============================================================================

-- Add scope_type column to explicitly track the ticket domain
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS scope_type TEXT NOT NULL DEFAULT 'INFRA';

-- Add Asset FK
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL;

-- Add Issue Type FK
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS issue_type_id UUID REFERENCES public.issue_types(id) ON DELETE SET NULL;

-- Add Issue Sub Type FK
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS issue_sub_type_id UUID REFERENCES public.issue_subtypes(id) ON DELETE SET NULL;

-- Add Category FK
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.ticket_categories(id) ON DELETE SET NULL;

-- Add Sub Category FK
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS sub_category_id UUID REFERENCES public.ticket_subcategories(id) ON DELETE SET NULL;

-- Note: priority_id already exists in tickets schema

-- Add Software System FK
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS software_system_id UUID REFERENCES public.software_systems(id) ON DELETE SET NULL;

-- Add Software Module FK
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.software_modules(id) ON DELETE SET NULL;

-- Add Software Sub Module FK
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS sub_module_id UUID REFERENCES public.software_submodules(id) ON DELETE SET NULL;

-- Note: assignee_id and department_id already exist

-- Queue Owner (Manager Assignment)
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS queue_owner_id UUID REFERENCES public.user_master(id) ON DELETE SET NULL;

-- Re-create accelerated indexes
CREATE INDEX IF NOT EXISTS idx_tickets_asset ON public.tickets(asset_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_tickets_issue_type ON public.tickets(issue_type_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_tickets_software ON public.tickets(software_system_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_tickets_queue_owner ON public.tickets(queue_owner_id) WHERE NOT is_deleted;
