-- ============================================================================
-- ADIOS PLATFORM: Legacy Snapshot Permissions Column Cleanup
-- ============================================================================

-- 1. Redefine handle_new_user to use the new snapshot refresh function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_master (id, full_name, email, role_id)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Unnamed User'),
        NEW.email,
        (SELECT id FROM public.roles WHERE code = 'ROLE_STAFF')
    )
    ON CONFLICT (id) DO NOTHING;

    -- Call the modern schema-compliant snapshot refresh function
    PERFORM public.refresh_single_user_permissions_snapshot(NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Explicitly drop legacy trigger functions referencing obsolete permissions column
DROP FUNCTION IF EXISTS public.refresh_user_permissions_snapshot_on_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.refresh_user_permissions_snapshot_on_role_perm() CASCADE;

-- 3. Ensure auth.users triggers are clean and strictly AFTER INSERT
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS tr_on_auth_user_created ON auth.users;
CREATE TRIGGER tr_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_sync();
