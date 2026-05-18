-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: User Identity Synchronization & Profile Governance
-- Purpose: Ensures auth.users stays in sync with user_master and enforces
--          secure profile update policies.
-- ============================================================================

-- 1. Table Alignment & Constraints
-- ----------------------------------------------------------------------------

-- Ensure user_master.id is linked to auth.users.id
-- Note: We use a soft-ref (no FK to auth schema in public usually) or just ensure consistency.
-- However, we can add a check or just assume identity parity.

-- 2. Registration Auto-Provisioning Engine
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role_code TEXT;
    v_role_id UUID;
BEGIN
    -- Force search path to public for reliable reference resolving
    SET search_path = public;
    -- 1. Create the User Master record
    INSERT INTO public.user_master (
        id,
        full_name,
        email,
        user_code,
        department_id,
        designation_id,
        profile_photo,
        is_active,
        password_hash
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'user_code', 
            'USR-' || substring(NEW.id::text from 1 for 8)
        ),
        NULLIF(NEW.raw_user_meta_data->>'department_id', '')::UUID,
        NULLIF(NEW.raw_user_meta_data->>'designation_id', '')::UUID,
        NEW.raw_user_meta_data->>'profile_photo',
        true,
        'SUPABASE_AUTH'
    );

    -- 2. Assign Roles Dynamically from Metadata
    -- If no roles provided, default to ROLE_STAFF
    FOR v_role_code IN 
        SELECT jsonb_array_elements_text(
            COALESCE(NEW.raw_user_meta_data->'provisioned_roles', '["ROLE_STAFF"]'::jsonb)
        )
    LOOP
        SELECT id INTO v_role_id FROM public.roles WHERE code = v_role_code LIMIT 1;
        
        IF v_role_id IS NOT NULL THEN
            INSERT INTO public.user_roles (user_id, role_id)
            VALUES (NEW.id, v_role_id)
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;

    -- 3. High-Performance Permission Snapshot Refresh
    -- Flattens all roles and permissions into a single row for instant RLS checks
    INSERT INTO public.user_permissions_snapshot (user_id, permissions, updated_at)
    SELECT 
        NEW.id,
        COALESCE(array_agg(DISTINCT p.code), '{}') as permissions,
        now()
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = NEW.id
    GROUP BY ur.user_id
    ON CONFLICT (user_id) DO UPDATE SET
        permissions = EXCLUDED.permissions,
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users (requires superuser or bypass)
-- Note: In Supabase, you run this in the SQL Editor
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 3. Hardened RLS Governance for User Profiles
-- ----------------------------------------------------------------------------

-- Reset existing policies
DROP POLICY IF EXISTS policy_user_master_select ON user_master;
DROP POLICY IF EXISTS policy_user_master_select_v2 ON user_master;
DROP POLICY IF EXISTS policy_user_master_mutate ON user_master;
DROP POLICY IF EXISTS policy_user_master_update ON user_master;
DROP POLICY IF EXISTS policy_user_master_insert ON user_master;

-- Governance Policies:
-- 1. Visibility Policy: Who can see whom?
CREATE POLICY policy_user_master_select_v2 ON user_master
    FOR SELECT TO authenticated
    USING (
        -- 1. Super Admin sees everyone
        EXISTS (
            SELECT 1 FROM user_permissions_snapshot 
            WHERE user_id = auth.uid() 
            AND 'SUPER_ADMIN' = ANY(permissions)
        )
        OR
        -- 2. Department Admin / Manager sees their department
        (
            EXISTS (
                SELECT 1 FROM user_permissions_snapshot 
                WHERE user_id = auth.uid() 
                AND 'USER_MANAGE' = ANY(permissions)
            )
            AND 
            department_id = (SELECT department_id FROM user_master WHERE id = auth.uid())
        )
        OR
        -- 3. Standard User sees themselves
        (id = auth.uid())
    );

-- 2. Mutation Policy: Who can update?
CREATE POLICY policy_user_master_update ON user_master
    FOR UPDATE TO authenticated
    USING (
        -- 1. Self-service
        (auth.uid() = id)
        OR
        -- 2. Management Authority (Super Admin or User Manage permission)
        EXISTS (
            SELECT 1 FROM user_permissions_snapshot 
            WHERE user_id = auth.uid() 
            AND (
                'SUPER_ADMIN' = ANY(permissions) OR 
                'USER_MANAGE' = ANY(permissions)
            )
        )
    )
    WITH CHECK (true);

-- 3. Creation Policy: Managed by System Trigger (SECURITY DEFINER)
ALTER TABLE user_master FORCE ROW LEVEL SECURITY;


-- 4. Seed User Management Permission
-- ----------------------------------------------------------------------------

INSERT INTO permissions (code, name, module, submodule, action, resource_type)
VALUES ('USER_MANAGE', 'Manage User Directory', 'IAM', 'Users', 'MANAGE', 'PAGE')
ON CONFLICT (code) DO NOTHING;

-- Map to Admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN') AND p.code = 'USER_MANAGE'
ON CONFLICT DO NOTHING;
