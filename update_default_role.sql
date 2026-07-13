-- 1. Update the handle_new_user trigger function to default to ROLE_AGENT ("Standard User")
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
        (SELECT id FROM public.roles WHERE code = 'ROLE_AGENT' LIMIT 1),
        'USR-' || substr(md5(random()::text), 1, 6),
        'OAUTH_USER',
        true,
        false
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        profile_photo = EXCLUDED.profile_photo;

    -- Handle provisioned_roles if provided (or default to ROLE_AGENT)
    FOR v_role_id IN 
        SELECT id FROM public.roles WHERE code IN (
            SELECT jsonb_array_elements_text(
                COALESCE(NEW.raw_user_meta_data->'provisioned_roles', '["ROLE_AGENT"]'::jsonb)
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

-- 2. Also update the refresh_ups_on_user_master_change trigger for the new ROLE_AGENT requirement
CREATE OR REPLACE FUNCTION public.refresh_ups_on_user_master_change()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.role_id IS DISTINCT FROM NEW.role_id) THEN
        IF NEW.role_id IS NOT NULL THEN
            IF EXISTS (SELECT 1 FROM public.roles WHERE id = NEW.role_id AND code = 'ROLE_AGENT') THEN
                INSERT INTO public.unified_personnel_store (id, personnel_type, status, user_master_id)
                VALUES (NEW.id, 'USER', 'ACTIVE', NEW.id)
                ON CONFLICT (id) DO NOTHING;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
