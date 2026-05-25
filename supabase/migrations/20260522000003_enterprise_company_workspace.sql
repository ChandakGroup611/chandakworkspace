-- ============================================================================
-- Phase 4 Migration: Company & Workspace Engine
-- ============================================================================

-- 1. Company Master
CREATE TABLE IF NOT EXISTS public.company_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    company_code TEXT UNIQUE NOT NULL,
    industry TEXT,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'ACTIVE',
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

-- Drop old workspace tables and recreate them to match the enterprise architecture cleanly
DROP TABLE IF EXISTS public.workspace_tasks CASCADE;
DROP TABLE IF EXISTS public.workspace_members CASCADE;
DROP TABLE IF EXISTS public.workspace_teams CASCADE;
DROP TABLE IF EXISTS public.workspaces CASCADE;

-- 2. Workspace Engine
CREATE TABLE public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.company_master(id) ON DELETE CASCADE,
    workspace_name TEXT NOT NULL,
    workspace_code TEXT UNIQUE NOT NULL,
    description TEXT,
    workspace_owner_id UUID NOT NULL REFERENCES auth.users(id),
    status_id UUID REFERENCES public.status_master(id),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    role TEXT DEFAULT 'MEMBER', -- e.g., 'ADMIN', 'MEMBER', 'VIEWER'
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, user_id)
);

-- 3. Enterprise Team Engine
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_name TEXT NOT NULL,
    description TEXT,
    manager_id UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(team_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.workspace_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, team_id)
);

-- 4. Apply Minimal RLS globally for these modules
ALTER TABLE public.company_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_master Access" ON public.company_master;
CREATE POLICY "company_master Access" ON public.company_master FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workspaces Access" ON public.workspaces;
CREATE POLICY "workspaces Access" ON public.workspaces FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workspace_members Access" ON public.workspace_members;
CREATE POLICY "workspace_members Access" ON public.workspace_members FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teams Access" ON public.teams;
CREATE POLICY "teams Access" ON public.teams FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_members Access" ON public.team_members;
CREATE POLICY "team_members Access" ON public.team_members FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

ALTER TABLE public.workspace_teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workspace_teams Access" ON public.workspace_teams;
CREATE POLICY "workspace_teams Access" ON public.workspace_teams FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);
