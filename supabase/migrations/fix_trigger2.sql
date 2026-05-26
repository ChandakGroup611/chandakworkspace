CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$
BEGIN
    SET search_path = public;
    INSERT INTO public.user_master (id, full_name, user_code, email, role_id, is_active, is_deleted)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Unnamed User'),
        COALESCE(NEW.raw_user_meta_data ->> 'user_code', 'USR-' || upper(substring(NEW.id::text from 1 for 8))),
        NEW.email,
        (SELECT id FROM public.roles WHERE code = 'ROLE_STAFF'),
        TRUE,
        FALSE
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        is_deleted = FALSE,
        is_active = TRUE;

    -- PERFORM public.refresh_single_user_permissions_snapshot(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
