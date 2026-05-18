-- ============================================================================
-- MASTER IAM REBUILD - DEFINITIVE STABLE VERSION
-- ============================================================================

-- 1. Table Reconstruction
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_master (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    user_code TEXT UNIQUE NOT NULL,
    profile_photo TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    manager_id UUID REFERENCES public.user_master(id),
    department_id UUID,
    designation_id UUID,
    role_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Clean Security Engine
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.code = 'SUPER_ADMIN'
    );
$$;

-- 3. The One & Only Visibility Policy
-- ----------------------------------------------------------------------------
ALTER TABLE public.user_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "policy_user_master_governance" ON public.user_master;
CREATE POLICY "policy_user_master_governance" ON public.user_master
FOR ALL TO authenticated
USING (auth.uid() = id OR public.is_super_admin())
WITH CHECK (auth.uid() = id OR public.is_super_admin());

-- 4. Unbreakable Identity Trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_sync()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.user_master (id, full_name, email, user_code, is_active, is_deleted)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Personnel-' || substring(NEW.id::text from 1 for 4)),
        NEW.email,
        'USR-' || substring(NEW.id::text from 1 for 8),
        TRUE,
        FALSE
    ) ON CONFLICT (id) DO UPDATE SET 
        email = EXCLUDED.email,
        is_deleted = false,
        is_active = true;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_on_auth_user_created ON auth.users;
CREATE TRIGGER tr_on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_sync();
