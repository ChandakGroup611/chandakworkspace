-- =================================================================================
-- Migration: Bulletproof SSO Auth Triggers
-- Description: Replaces the handle_new_user trigger with a highly resilient 
--              version that handles Azure AD missing claims, JSON scalar errors,
--              and existing email collisions (to fix the "double login" bug).
-- =================================================================================

-- 1. Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Create the resilient function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    v_role_id UUID;
    v_email TEXT;
    v_user_code TEXT;
    v_name TEXT;
    v_avatar TEXT;
    v_existing_id UUID;
BEGIN
    -- A. Safely extract email (fallback to preferred_username or generate a placeholder)
    v_email := COALESCE(
        NULLIF(TRIM(NEW.email), ''), 
        NULLIF(TRIM(NEW.raw_user_meta_data->>'email'), ''), 
        NULLIF(TRIM(NEW.raw_user_meta_data->>'preferred_username'), ''),
        NEW.id::text || '@sso-placeholder.internal'
    );

    -- B. Safely extract name and avatar
    v_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 
        NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''), 
        v_email, 
        'New User'
    );
    v_avatar := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'profile_photo'), ''), 
        NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), ''), 
        ''
    );

    -- C. Collision Detection: Check if email already exists in user_master
    SELECT id INTO v_existing_id FROM public.user_master WHERE email = v_email LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        -- The user already exists in user_master (e.g., from seed data or admin provision).
        -- We cannot insert a new row because email is UNIQUE. We also shouldn't fail
        -- because failing rolls back auth.users, causing the SSO redirect loop.
        -- We gracefully update the profile info and return.
        UPDATE public.user_master 
        SET 
            full_name = v_name, 
            profile_photo = CASE WHEN v_avatar != '' THEN v_avatar ELSE profile_photo END,
            last_login_at = now()
        WHERE id = v_existing_id;
        
        RETURN NEW;
    END IF;

    -- D. Generate user code
    v_user_code := 'USR-' || substr(md5(random()::text || NEW.id::text), 1, 6);

    -- E. Insert into user_master safely
    INSERT INTO public.user_master (
        id, email, full_name, profile_photo, role_id, user_code, password_hash, is_active, is_deleted, last_login_at
    ) VALUES (
        NEW.id,
        v_email,
        v_name,
        v_avatar,
        (SELECT id FROM public.roles WHERE code = 'USER' LIMIT 1),
        v_user_code,
        'OAUTH_USER',
        true,
        false,
        now()
    );

    -- F. Safely handle provisioned_roles array
    BEGIN
        IF jsonb_typeof(NEW.raw_user_meta_data->'provisioned_roles') = 'array' THEN
            FOR v_role_id IN 
                SELECT id FROM public.roles WHERE code IN (
                    SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'provisioned_roles')
                )
            LOOP
                INSERT INTO public.user_roles (user_id, role_id)
                VALUES (NEW.id, v_role_id)
                ON CONFLICT DO NOTHING;
            END LOOP;
        ELSE
            -- Default to USER if no array provided
            INSERT INTO public.user_roles (user_id, role_id)
            SELECT NEW.id, id FROM public.roles WHERE code = 'USER'
            ON CONFLICT DO NOTHING;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore role parsing errors to ensure login succeeds
        INSERT INTO public.user_roles (user_id, role_id)
        SELECT NEW.id, id FROM public.roles WHERE code = 'USER'
        ON CONFLICT DO NOTHING;
    END;

    RETURN NEW;
END;
$$;

-- 3. Re-attach the trigger
CREATE TRIGGER on_auth_user_created 
    AFTER INSERT ON auth.users 
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
