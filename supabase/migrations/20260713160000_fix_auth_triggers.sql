-- 1. Drop the broken sync trigger that is missing the password_hash column
DROP TRIGGER IF EXISTS tr_on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_sync();

-- 2. Recreate the correct handle_new_user function that includes password_hash and handles roles correctly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    v_role_id UUID;
BEGIN
    -- Insert the core user record
    INSERT INTO public.user_master (
        id,
        email,
        full_name,
        profile_photo,
        role_id,
        user_code,
        password_hash,
        is_active,
        is_deleted
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email, 'New User'),
        COALESCE(NEW.raw_user_meta_data->>'profile_photo', NEW.raw_user_meta_data->>'avatar_url', ''),
        (SELECT id FROM public.roles WHERE code = 'USER' LIMIT 1),
        'USR-' || substr(md5(random()::text), 1, 6),
        'OAUTH_USER',
        true,
        false
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        profile_photo = EXCLUDED.profile_photo;

    -- Handle provisioned_roles if provided (or default to USER)
    FOR v_role_id IN 
        SELECT id FROM public.roles WHERE code IN (
            SELECT jsonb_array_elements_text(
                COALESCE(NEW.raw_user_meta_data->'provisioned_roles', '["USER"]'::jsonb)
            )
        )
    LOOP
        INSERT INTO public.user_roles (user_id, role_id)
        VALUES (NEW.id, v_role_id)
        ON CONFLICT DO NOTHING;
    END LOOP;

    RETURN NEW;
END;
$$;

-- 3. Re-attach the trigger
CREATE TRIGGER on_auth_user_created 
    AFTER INSERT ON auth.users 
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Fix the refresh_ups_on_user_master_change trigger that has the role_code bug
CREATE OR REPLACE FUNCTION public.refresh_ups_on_user_master_change()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.role_id IS DISTINCT FROM NEW.role_id) THEN
        IF NEW.role_id IS NOT NULL THEN
            IF EXISTS (SELECT 1 FROM public.roles WHERE id = NEW.role_id AND code = 'USER') THEN
                INSERT INTO public.unified_personnel_store (id, personnel_type, status, user_master_id)
                VALUES (NEW.id, 'USER', 'ACTIVE', NEW.id)
                ON CONFLICT (id) DO NOTHING;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
