CREATE OR REPLACE FUNCTION public.sync_master_role_to_security()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
    -- Sync to user_roles
    DELETE FROM public.user_roles WHERE user_id = NEW.id;
    
    IF NEW.role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role_id) VALUES (NEW.id, NEW.role_id);
    END IF;
    
    -- Refresh Snapshot
    DELETE FROM public.user_permissions_snapshot WHERE user_id = NEW.id;
    
    IF NEW.role_id IS NOT NULL THEN
        INSERT INTO public.user_permissions_snapshot (user_id, permission_code, updated_at)
        SELECT 
            NEW.id,
            p.code,
            now()
        FROM public.role_permissions rp
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = NEW.role_id
        ON CONFLICT (user_id, permission_code) DO NOTHING;
    END IF;
        
    RETURN NEW;
END;
$function$;
