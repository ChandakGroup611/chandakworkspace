CREATE OR REPLACE FUNCTION public.sync_user_master_role_to_user_roles()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
    -- Delete old roles for this user from user_roles
    DELETE FROM public.user_roles WHERE user_id = NEW.id;

    -- Insert the new role if it is not null
    IF NEW.role_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role_id = NEW.role_id
    ) THEN
        INSERT INTO public.user_roles (user_id, role_id)
        VALUES (NEW.id, NEW.role_id);
    END IF;

    RETURN NEW;
END;
$function$;
