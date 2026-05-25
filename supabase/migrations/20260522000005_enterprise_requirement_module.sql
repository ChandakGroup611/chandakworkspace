-- ============================================================================
-- Phase 5 Migration: Enterprise Requirement Engineering Engine
-- ============================================================================

-- 1. Update Category Master to Support Requirement Identification
-- Assuming 'ticket_categories' or similar exists. We'll add the flag.
ALTER TABLE IF EXISTS public.ticket_categories 
  ADD COLUMN IF NOT EXISTS is_requirement_category BOOLEAN DEFAULT false;

-- 2. Requirement Master Entity
CREATE TABLE IF NOT EXISTS public.requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_code TEXT UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    business_justification TEXT NOT NULL,
    department_id UUID, -- References department_master if it exists
    priority_id UUID REFERENCES public.priority_master(id),
    status_id UUID REFERENCES public.status_master(id),
    assigned_analyst_id UUID REFERENCES auth.users(id),
    estimated_hours NUMERIC(6,2),
    estimated_cost NUMERIC(12,2),
    technical_notes TEXT,
    business_notes TEXT,
    implementation_risk TEXT,
    affected_modules JSONB,
    completion_percentage INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

-- 3. Junction: Ticket ↔ Requirement
CREATE TABLE IF NOT EXISTS public.ticket_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
    requirement_id UUID REFERENCES public.requirements(id) ON DELETE CASCADE NOT NULL,
    linked_by UUID REFERENCES auth.users(id),
    linked_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(ticket_id, requirement_id)
);

-- 4. Junction: Requirement ↔ Task
CREATE TABLE IF NOT EXISTS public.requirement_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID REFERENCES public.requirements(id) ON DELETE CASCADE NOT NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    linked_by UUID REFERENCES auth.users(id),
    linked_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(requirement_id, task_id)
);

-- 5. Requirement Watchers
CREATE TABLE IF NOT EXISTS public.requirement_watchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID REFERENCES public.requirements(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(requirement_id, user_id)
);

-- 6. Approvals
CREATE TABLE IF NOT EXISTS public.requirement_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID REFERENCES public.requirements(id) ON DELETE CASCADE NOT NULL,
    approver_id UUID NOT NULL REFERENCES auth.users(id),
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    comments TEXT,
    requested_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Note: We reuse public.activity_events for requirement_comments and requirement_activity_events natively.

-- 7. RLS Enforcement (Minimal)
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "requirements Access" ON public.requirements;
CREATE POLICY "requirements Access" ON public.requirements FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

ALTER TABLE public.ticket_requirements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ticket_requirements Access" ON public.ticket_requirements;
CREATE POLICY "ticket_requirements Access" ON public.ticket_requirements FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

ALTER TABLE public.requirement_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "requirement_tasks Access" ON public.requirement_tasks;
CREATE POLICY "requirement_tasks Access" ON public.requirement_tasks FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

ALTER TABLE public.requirement_watchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "requirement_watchers Access" ON public.requirement_watchers;
CREATE POLICY "requirement_watchers Access" ON public.requirement_watchers FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

ALTER TABLE public.requirement_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "requirement_approvals Access" ON public.requirement_approvals;
CREATE POLICY "requirement_approvals Access" ON public.requirement_approvals FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

-- 8. Storage Bucket for Requirement Files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'requirement-files',
    'requirement-files',
    false, -- STRICTLY PRIVATE
    104857600, -- 100MB
    ARRAY[
        'application/pdf', 
        'application/vnd.ms-excel', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/webp'
    ]::text[]
) ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Authenticated users can upload requirement files" ON storage.objects;
CREATE POLICY "Authenticated users can upload requirement files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'requirement-files');

DROP POLICY IF EXISTS "Authenticated users can select requirement files" ON storage.objects;
CREATE POLICY "Authenticated users can select requirement files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'requirement-files');
