


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."allow_self_profile_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- If user is updating only their own profile photo, full_name (non-sensitive fields),
    -- and they are the record owner, always allow
    IF NEW.id = auth.uid() THEN
        -- Check if only updating non-sensitive fields
        IF (NEW.email IS NOT DISTINCT FROM OLD.email)
           AND (NEW.role_id IS NOT DISTINCT FROM OLD.role_id)
           AND (NEW.is_active IS NOT DISTINCT FROM OLD.is_active)
        THEN
            -- Only updating profile_photo, full_name, user_code (allowed for self-service)
            RETURN NEW;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."allow_self_profile_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_record"("p_creator_id" "uuid", "p_assignee_id" "uuid", "p_department_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT (
    auth.uid() = p_creator_id
    OR auth.uid() = p_assignee_id
    OR public.is_super_admin()
    OR public.has_permission_snapshot('USERS_VIEW')
    OR public.has_permission_snapshot('USERS_MANAGE')
    OR EXISTS (
        SELECT 1 FROM public.departments
        WHERE id = p_department_id AND manager_id = auth.uid()
    )
  );
$$;


ALTER FUNCTION "public"."can_access_record"("p_creator_id" "uuid", "p_assignee_id" "uuid", "p_department_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_ticket"("p_creator_id" "uuid", "p_assignee_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- RULE 1: SUPER_ADMIN sees everything (Fast JWT check)
    IF (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'SUPER_ADMIN'
    ) THEN RETURN TRUE; END IF;

    -- RULE 2: Ownership - Creator sees their own tickets
    IF auth.uid() = p_creator_id THEN RETURN TRUE; END IF;

    -- RULE 3: Assigned Work - Assignee sees tickets assigned to them to do work
    IF auth.uid() = p_assignee_id THEN RETURN TRUE; END IF;

    -- RULE 4: Reporting Line Manager check
    -- Allows creator's direct manager to view the ticket (Zero Cross-Listing allowed)
    IF EXISTS (
        SELECT 1 FROM public.user_master
        WHERE id = p_creator_id AND manager_id = auth.uid()
    ) THEN RETURN TRUE; END IF;

    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."can_access_ticket"("p_creator_id" "uuid", "p_assignee_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_see_record"("p_creator_id" "uuid", "p_assignee_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- 1. SUPER_ADMIN bypass
    IF public.is_super_admin() THEN
        RETURN TRUE;
    END IF;

    -- 2. Creator or Assignee Check
    IF auth.uid() = p_creator_id OR auth.uid() = p_assignee_id THEN
        RETURN TRUE;
    END IF;

    -- 3. Creator's Manager Check
    IF p_creator_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.user_master 
        WHERE id = p_creator_id AND manager_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- 4. Assignee's Manager Check
    IF p_assignee_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.user_master 
        WHERE id = p_assignee_id AND manager_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."can_see_record"("p_creator_id" "uuid", "p_assignee_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_see_task"("p_task_id" "uuid", "p_creator_id" "uuid", "p_assignee_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- 1. SUPER_ADMIN bypass (using our bulletproof view)
    IF public.is_super_admin() THEN
        RETURN TRUE;
    END IF;

    -- 2. Creator or Assignee Check
    IF auth.uid() = p_creator_id OR auth.uid() = p_assignee_id THEN
        RETURN TRUE;
    END IF;

    -- 3. Creator's Manager Check
    IF p_creator_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.user_master 
        WHERE id = p_creator_id AND manager_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- 4. Assignee's Manager Check
    IF p_assignee_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.user_master 
        WHERE id = p_assignee_id AND manager_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- 5. Explicit Assignees (from task_assignees)
    IF p_task_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.task_assignees 
        WHERE task_id = p_task_id AND user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- 6. Team Members (from task_teams)
    IF p_task_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.task_teams tt
        JOIN public.team_members tm ON tt.team_id = tm.team_id
        WHERE tt.task_id = p_task_id AND tm.user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."can_see_task"("p_task_id" "uuid", "p_creator_id" "uuid", "p_assignee_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_see_workspace"("p_workspace_id" "uuid", "p_owner_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- 1. SUPER_ADMIN bypass
    IF public.is_super_admin() THEN
        RETURN TRUE;
    END IF;

    -- 2. Owner Check
    IF auth.uid() = p_owner_id THEN
        RETURN TRUE;
    END IF;

    -- 3. Owner's Manager Check
    IF p_owner_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.user_master 
        WHERE id = p_owner_id AND manager_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- 4. Explicit Workspace Member Check
    IF EXISTS (
        SELECT 1 FROM public.workspace_members wm 
        WHERE wm.workspace_id = p_workspace_id AND wm.user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- 5. Has any visible tasks in the workspace
    -- We use can_see_task to safely check task visibility
    IF EXISTS (
        SELECT 1 FROM public.workspace_tasks wt
        WHERE wt.workspace_id = p_workspace_id 
        AND public.can_see_task(wt.id, wt.creator_id, wt.assignee_id)
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."can_see_workspace"("p_workspace_id" "uuid", "p_owner_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_is_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() 
        AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN')
    );
$$;


ALTER FUNCTION "public"."check_is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_user_permission"("p_permission_code" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT public.has_permission_snapshot(p_permission_code);
$$;


ALTER FUNCTION "public"."check_user_permission"("p_permission_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_user_permissions_snapshot"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.user_permissions_snapshot (user_id, permissions, updated_at)
    VALUES (
        p_user_id,
        COALESCE((
            SELECT array_agg(DISTINCT p.code)
            FROM public.user_roles ur
            JOIN public.role_permissions rp ON ur.role_id = rp.role_id
            JOIN public.permissions p ON rp.permission_id = p.id
            WHERE ur.user_id = p_user_id
        ), '{}'::TEXT[]),
        now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        permissions = EXCLUDED.permissions,
        updated_at = now();
END;
$$;


ALTER FUNCTION "public"."generate_user_permissions_snapshot"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_role_code"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_code TEXT;
BEGIN
    SELECT code INTO v_code FROM public.admin_check_bypass WHERE id = auth.uid();
    RETURN v_code;
END;
$$;


ALTER FUNCTION "public"."get_my_role_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
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

    PERFORM public.refresh_single_user_permissions_snapshot(NEW.id);
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_deep_sync_v2"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.user_master (
        id, 
        full_name, 
        email, 
        user_code, 
        department_id, 
        designation_id,
        profile_photo,
        is_active, 
        is_deleted
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Personnel-' || substring(NEW.id::text from 1 for 4)),
        NEW.email,
        'USR-' || substring(NEW.id::text from 1 for 8),
        (NEW.raw_user_meta_data->>'department_id')::UUID, -- Deep Sync: Department
        (NEW.raw_user_meta_data->>'designation_id')::UUID, -- Deep Sync: Designation
        NEW.raw_user_meta_data->>'profile_photo',
        TRUE,
        FALSE
    ) ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        department_id = EXCLUDED.department_id,
        designation_id = EXCLUDED.designation_id,
        profile_photo = EXCLUDED.profile_photo;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user_deep_sync_v2"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_sync_v4"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.user_master (id, full_name, email, user_code, is_active, is_deleted)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Personnel'),
        NEW.email,
        'USR-' || substring(NEW.id::text from 1 for 8),
        TRUE,
        FALSE
    ) ON CONFLICT (id) DO UPDATE SET is_deleted = false, is_active = true;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user_sync_v4"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_task_audit_and_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_actor_id UUID;
    v_action TEXT;
    v_old_state JSONB := NULL;
    v_new_state JSONB := NULL;
    v_task_id UUID;
    v_workspace_id UUID;
    v_event_type TEXT;
BEGIN
    -- Determine the actor
    v_actor_id := auth.uid();
    
    IF TG_OP = 'INSERT' THEN
        v_task_id := NEW.id;
        v_workspace_id := NEW.workspace_id;
        v_action := 'CREATE';
        v_event_type := 'task.created';
        v_new_state := to_jsonb(NEW);
        v_actor_id := COALESCE(v_actor_id, NEW.created_by);
    ELSIF TG_OP = 'UPDATE' THEN
        v_task_id := NEW.id;
        v_workspace_id := NEW.workspace_id;
        v_old_state := to_jsonb(OLD);
        v_new_state := to_jsonb(NEW);
        
        IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
            v_action := 'DELETE';
            v_event_type := 'task.deleted';
        ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
            v_action := 'RESTORE';
            v_event_type := 'task.restored';
        ELSIF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
            v_action := 'STATUS_CHANGE';
            v_event_type := 'task.updated';
        ELSE
            v_action := 'UPDATE';
            v_event_type := 'task.updated';
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    -- WRITE TO ACTIVITY LOG (task_activity_logs) - UI Specific
    INSERT INTO public.task_activity_logs (task_id, actor_id, action, old_state, new_state)
    VALUES (v_task_id, v_actor_id, v_action, v_old_state, v_new_state);

    -- WRITE TO CORE AUDIT LOG (task_audit_logs) - UI Specific
    INSERT INTO public.task_audit_logs (task_id, actor_id, operation, before_values, after_values)
    VALUES (v_task_id, COALESCE(v_actor_id, '00000000-0000-0000-0000-000000000000'::uuid), v_action, v_old_state, v_new_state);

    -- EMIT IMMUTABLE DOMAIN EVENT (Replaces the loop over workspace_members and inserts into notification_queue)
    IF v_action IN ('CREATE', 'DELETE', 'RESTORE', 'STATUS_CHANGE') THEN
        INSERT INTO public.system_domain_events (event_type, entity_id, actor_id, payload, priority)
        VALUES (v_event_type, v_task_id, v_actor_id, jsonb_build_object(
            'workspace_id', v_workspace_id,
            'action', v_action,
            'old_state', v_old_state,
            'new_state', v_new_state
        ), 'NORMAL');
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;


ALTER FUNCTION "public"."handle_task_audit_and_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_ticket_lifecycle"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_actor_id UUID;
    v_actor_name TEXT;
    v_operation TEXT;
    v_event_type TEXT;
BEGIN
    -- 1.1 Identify Action Caller (Actor)
    IF (TG_OP = 'DELETE') THEN
        v_actor_id := COALESCE(auth.uid(), OLD.creator_id);
    ELSE
        v_actor_id := COALESCE(auth.uid(), NEW.creator_id);
    END IF;
    
    -- 1.2 Determine Lifecycle Operation
    IF (TG_OP = 'INSERT') THEN
        v_operation := 'CREATE';
        v_event_type := 'ticket.created';
    ELSIF (TG_OP = 'DELETE') THEN
        v_operation := 'DELETE';
        v_event_type := 'ticket.deleted';
    ELSE
        IF (NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE) THEN
            v_operation := 'DELETE';
            v_event_type := 'ticket.deleted';
        ELSE
            v_operation := 'UPDATE';
            v_event_type := 'ticket.updated';
        END IF;
    END IF;

    -- 1.3 Populate Standalone Immutable Audit Logs (Keep local UI audit logs)
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.ticket_audit_logs (ticket_id, actor_id, operation, before_values, after_values)
        VALUES (NEW.id, v_actor_id, 'CREATE', NULL, to_jsonb(NEW));
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.ticket_audit_logs (ticket_id, actor_id, operation, before_values, after_values)
        VALUES (OLD.id, v_actor_id, 'DELETE', to_jsonb(OLD), NULL);
    ELSE
        INSERT INTO public.ticket_audit_logs (ticket_id, actor_id, operation, before_values, after_values)
        VALUES (NEW.id, v_actor_id, v_operation, to_jsonb(OLD), to_jsonb(NEW));
    END IF;

    -- 1.4 Publish Immutable Domain Event to the Event Bus
    IF (v_operation = 'CREATE') THEN
        INSERT INTO public.system_domain_events (event_type, entity_id, actor_id, payload, priority)
        VALUES (v_event_type, NEW.id, v_actor_id, jsonb_build_object('ticket', to_jsonb(NEW)), 'NORMAL');
    ELSIF (v_operation = 'DELETE') THEN
        INSERT INTO public.system_domain_events (event_type, entity_id, actor_id, payload, priority)
        VALUES (v_event_type, OLD.id, v_actor_id, jsonb_build_object('ticket', to_jsonb(OLD)), 'NORMAL');
    ELSIF (v_operation = 'UPDATE') THEN
        -- Only emit event if there are substantial changes to notify about
        IF (OLD.status_id IS DISTINCT FROM NEW.status_id) OR (OLD.assignee_id IS DISTINCT FROM NEW.assignee_id) THEN
            INSERT INTO public.system_domain_events (event_type, entity_id, actor_id, payload, priority)
            VALUES (v_event_type, NEW.id, v_actor_id, jsonb_build_object(
                'old_ticket', to_jsonb(OLD),
                'new_ticket', to_jsonb(NEW)
            ), 'NORMAL');
        END IF;
    END IF;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_ticket_lifecycle"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_department_access"("p_department_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_has BOOLEAN;
BEGIN
    SELECT true
    INTO v_has
    FROM user_department_access
    WHERE user_id = auth.uid() AND department_id = p_department_id;
    
    RETURN COALESCE(v_has, false);
END;
$$;


ALTER FUNCTION "public"."has_department_access"("p_department_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_permission_snapshot"("p_permission_code" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT (
    -- Super Admin bypass: check snapshot for the system-level marker
    EXISTS (
      SELECT 1 FROM public.user_master um
      JOIN public.roles r ON um.role_id = r.id
      WHERE um.id = auth.uid()
        AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN')
        AND NOT um.is_deleted
    )
  ) OR (
    -- Direct permission match on indexed snapshot table
    EXISTS (
      SELECT 1 FROM public.user_permissions_snapshot
      WHERE user_id = auth.uid()
        AND permission_code = p_permission_code
    )
  );
$$;


ALTER FUNCTION "public"."has_permission_snapshot"("p_permission_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN')
    );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_super_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions_snapshot
    WHERE user_id = auth.uid()
      AND permission_code = 'SUPER_ADMIN_ACCESS'
  ) OR EXISTS (
    SELECT 1 FROM public.user_master um
    JOIN public.roles r ON um.role_id = r.id
    WHERE um.id = auth.uid()
      AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN')
      AND NOT um.is_deleted
  );
$$;


ALTER FUNCTION "public"."is_super_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_super_admin_safe"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM public.admin_check_bypass WHERE id = auth.uid() AND code = 'SUPER_ADMIN') INTO v_exists;
    RETURN v_exists;
END;
$$;


ALTER FUNCTION "public"."is_super_admin_safe"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_task_member"("p_task_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_workspace_id UUID;
BEGIN
    -- Super Admin Bypass
    IF public.has_permission_snapshot('WORKSPACES_MANAGE') THEN
        RETURN true;
    END IF;

    -- Handle both workspaces (legacy tasks linked to workspace_tasks) and public.tasks directly
    SELECT workspace_id INTO v_workspace_id FROM public.tasks WHERE id = p_task_id;
    
    -- Fallback for legacy architecture just in case
    IF v_workspace_id IS NULL THEN
        BEGIN
            SELECT workspace_id INTO v_workspace_id FROM public.workspace_tasks WHERE id = p_task_id;
        EXCEPTION WHEN undefined_table THEN
            v_workspace_id := NULL;
        END;
    END IF;

    IF v_workspace_id IS NULL THEN
        RETURN false;
    END IF;
    
    RETURN public.is_workspace_member(v_workspace_id);
END;
$$;


ALTER FUNCTION "public"."is_task_member"("p_task_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_workspace_member"("p_workspace_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = p_workspace_id
      AND workspace_owner_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_workspace_member"("p_workspace_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_event_updates"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RAISE EXCEPTION 'Updates to system_domain_events are strictly prohibited (Immutable Event Sourcing)';
END;
$$;


ALTER FUNCTION "public"."prevent_event_updates"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rebuild_user_permissions_snapshot"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    INSERT INTO public.user_permissions_snapshot (user_id, permissions, updated_at)
    VALUES (
        p_user_id,
        -- Combine Role Codes (e.g. SUPER_ADMIN) and Permission Codes (e.g. USER_MANAGE)
        ARRAY(
            SELECT code FROM public.roles r 
            JOIN public.user_roles ur ON r.id = ur.role_id 
            WHERE ur.user_id = p_user_id
            UNION
            SELECT p.code FROM public.permissions p
            JOIN public.role_permissions rp ON p.id = rp.permission_id
            JOIN public.user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = p_user_id
        ),
        now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        permissions = EXCLUDED.permissions,
        updated_at = now();
END;
$$;


ALTER FUNCTION "public"."rebuild_user_permissions_snapshot"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_single_user_permissions_snapshot"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_permissions TEXT[];
    v_perm_code TEXT;
BEGIN
    DELETE FROM public.user_permissions_snapshot WHERE user_id = p_user_id;

    -- Fetch permissions from user_roles and role_permissions
    SELECT COALESCE(array_agg(DISTINCT p.code), '{}') INTO v_permissions
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id;

    IF array_length(v_permissions, 1) > 0 THEN
        FOREACH v_perm_code IN ARRAY v_permissions
        LOOP
            INSERT INTO public.user_permissions_snapshot (user_id, permission_code)
            VALUES (p_user_id, v_perm_code) ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- Fetch permissions from user_master's direct role
    SELECT COALESCE(array_agg(DISTINCT p.code), '{}') INTO v_permissions
    FROM public.user_master um
    JOIN public.role_permissions rp ON um.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE um.id = p_user_id;

    IF array_length(v_permissions, 1) > 0 THEN
        FOREACH v_perm_code IN ARRAY v_permissions
        LOOP
            INSERT INTO public.user_permissions_snapshot (user_id, permission_code)
            VALUES (p_user_id, v_perm_code) ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
END;
$$;


ALTER FUNCTION "public"."refresh_single_user_permissions_snapshot"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_ups_on_dept_access_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.refresh_single_user_permissions_snapshot(COALESCE(NEW.user_id, OLD.user_id));
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."refresh_ups_on_dept_access_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_ups_on_role_perm_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT id FROM public.user_master WHERE role_id = COALESCE(NEW.role_id, OLD.role_id)
        UNION
        SELECT user_id FROM public.user_roles WHERE role_id = COALESCE(NEW.role_id, OLD.role_id)
    ) LOOP
        PERFORM public.refresh_single_user_permissions_snapshot(r.id);
    END LOOP;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."refresh_ups_on_role_perm_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_ups_on_team_member_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.refresh_single_user_permissions_snapshot(COALESCE(NEW.user_id, OLD.user_id));
    RETURN NULL;
    EXCEPTION WHEN OTHERS THEN RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."refresh_ups_on_team_member_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_ups_on_user_master_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.refresh_single_user_permissions_snapshot(COALESCE(NEW.id, OLD.id));
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."refresh_ups_on_user_master_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_ups_on_user_role_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.refresh_single_user_permissions_snapshot(COALESCE(NEW.user_id, OLD.user_id));
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."refresh_ups_on_user_role_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_ups_on_workspace_member_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.refresh_single_user_permissions_snapshot(COALESCE(NEW.user_id, OLD.user_id));
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."refresh_ups_on_workspace_member_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_master_role_to_security"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."sync_master_role_to_security"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_user_master_role_to_user_roles"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."sync_user_master_role_to_user_roles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_user_role_to_auth"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_role_code TEXT;
BEGIN
    -- Enforce search path for security definer function safety
    SET search_path = public;

    SELECT code INTO v_role_code FROM public.roles WHERE id = NEW.role_id;
    
    IF v_role_code IS NOT NULL THEN
        UPDATE auth.users 
        SET raw_app_metadata = jsonb_set(COALESCE(raw_app_metadata, '{}'::jsonb), '{role}', to_jsonb(v_role_code))
        WHERE id = NEW.id;
    ELSE
        -- Gracefully strip the 'role' key if it is cleared, preventing metadata from becoming NULL
        UPDATE auth.users 
        SET raw_app_metadata = COALESCE(raw_app_metadata, '{}'::jsonb) - 'role'
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_user_role_to_auth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tr_sync_notification_queue_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Extract values from JSONB payload if they are not directly provided
    IF NEW.payload IS NOT NULL THEN
        NEW.entity_id := COALESCE(NEW.entity_id, NEW.payload ->> 'code', NEW.payload ->> 'ticket_id');
        NEW.action_type := COALESCE(NEW.action_type, NEW.payload ->> 'type');
        NEW.actor := COALESCE(NEW.actor, NEW.payload ->> 'actor', 'System');
        
        -- Infer redirect url if not provided
        IF NEW.redirect_url IS NULL AND NEW.payload ->> 'ticket_id' IS NOT NULL THEN
            NEW.redirect_url := '/tickets?id=' || (NEW.payload ->> 'ticket_id');
        END IF;
    END IF;

    -- Defaults
    NEW.entity_type := COALESCE(NEW.entity_type, 'ticket');
    NEW.module := COALESCE(NEW.module, 'tickets');
    NEW.action_type := COALESCE(NEW.action_type, 'mutate');
    NEW.actor := COALESCE(NEW.actor, 'System');
    NEW.redirect_url := COALESCE(NEW.redirect_url, '/');
    NEW.priority_level := COALESCE(NEW.priority_level, 'MEDIUM');

    -- Sync recipient_id to target_user_id if needed
    IF NEW.target_user_id IS NULL AND NEW.recipient_id IS NOT NULL THEN
        NEW.target_user_id := NEW.recipient_id::text;
    END IF;

    -- Sync target_user_id to recipient_id if it's a valid UUID
    IF NEW.recipient_id IS NULL AND NEW.target_user_id IS NOT NULL THEN
        BEGIN
            NEW.recipient_id := NEW.target_user_id::uuid;
        EXCEPTION WHEN others THEN
            -- If it's a code like 'GLOBAL_OPS', leave recipient_id as NULL
            NEW.recipient_id := NULL;
        END;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."tr_sync_notification_queue_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_modified_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_modified_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_sub_task_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_task_workspace_id UUID;
    v_task_sub_workspace_id UUID;
    v_is_valid BOOLEAN;
BEGIN
    IF NEW.assigned_to IS NOT NULL THEN
        -- Get Task Scopes
        SELECT workspace_id, sub_workspace_id INTO v_task_workspace_id, v_task_sub_workspace_id
        FROM public.tasks
        WHERE id = NEW.task_id;

        IF v_task_sub_workspace_id IS NOT NULL THEN
            -- Must be Sub Workspace Member
            SELECT EXISTS (
                SELECT 1 FROM public.sub_workspace_members
                WHERE sub_workspace_id = v_task_sub_workspace_id AND user_id = NEW.assigned_to
            ) INTO v_is_valid;
        ELSE
            -- Must be Workspace Member
            SELECT EXISTS (
                SELECT 1 FROM public.workspace_members
                WHERE workspace_id = v_task_workspace_id AND user_id = NEW.assigned_to
            ) INTO v_is_valid;
        END IF;

        IF NOT v_is_valid THEN
            RAISE EXCEPTION 'Sub Task assignee must be a valid member of the corresponding workspace scope.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_sub_task_assignment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_sub_workspace_member"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_workspace_id UUID;
    v_is_workspace_member BOOLEAN;
BEGIN
    -- Get the parent workspace ID
    SELECT workspace_id INTO v_workspace_id
    FROM public.sub_workspaces
    WHERE id = NEW.sub_workspace_id;

    -- Check if user is a member of the parent workspace
    SELECT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = v_workspace_id AND user_id = NEW.user_id
    ) INTO v_is_workspace_member;

    IF NOT v_is_workspace_member THEN
        RAISE EXCEPTION 'User must be a member of the parent workspace to be added to the sub workspace.';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_sub_workspace_member"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_task_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_is_valid BOOLEAN;
BEGIN
    IF NEW.assigned_to IS NOT NULL THEN
        IF NEW.sub_workspace_id IS NOT NULL THEN
            -- Must be Sub Workspace Member
            SELECT EXISTS (
                SELECT 1 FROM public.sub_workspace_members
                WHERE sub_workspace_id = NEW.sub_workspace_id AND user_id = NEW.assigned_to
            ) INTO v_is_valid;
        ELSE
            -- Must be Workspace Member
            SELECT EXISTS (
                SELECT 1 FROM public.workspace_members
                WHERE workspace_id = NEW.workspace_id AND user_id = NEW.assigned_to
            ) INTO v_is_valid;
        END IF;

        IF NOT v_is_valid THEN
            RAISE EXCEPTION 'Task assignee must be a valid member of the corresponding workspace scope.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_task_assignment"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activity_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_type" "text" NOT NULL,
    "record_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "old_value" "jsonb",
    "new_value" "jsonb",
    "performed_by" "uuid" NOT NULL,
    "performed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false
);


ALTER TABLE "public"."activity_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_deleted" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true,
    "is_system" boolean DEFAULT false,
    "department_id" "uuid"
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_master" (
    "id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "user_code" "text" NOT NULL,
    "profile_photo" "text",
    "is_active" boolean DEFAULT true,
    "is_deleted" boolean DEFAULT false,
    "manager_id" "uuid",
    "department_id" "uuid",
    "designation_id" "uuid",
    "role_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "assigned_assets" "text"[] DEFAULT '{}'::"text"[],
    "last_login_at" timestamp with time zone,
    "last_logout_at" timestamp with time zone,
    "last_active_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."user_master" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_master" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_check_bypass" WITH ("security_invoker"='false') AS
 SELECT "um"."id",
    "r"."code"
   FROM ("public"."user_master" "um"
     JOIN "public"."roles" "r" ON (("um"."role_id" = "r"."id")));


ALTER VIEW "public"."admin_check_bypass" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."approval_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scope_id" integer
);


ALTER TABLE "public"."approval_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "asset_tag" "text" NOT NULL,
    "department_id" "uuid",
    "status" "text" DEFAULT 'OPERATIONAL'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text",
    "assigned_user_id" "uuid",
    "scope_id" "uuid"
);


ALTER TABLE "public"."assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_type" "text" NOT NULL,
    "record_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "original_file_name" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "file_size" bigint NOT NULL,
    "storage_path" "text" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth_session_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_token" "text" NOT NULL,
    "ip_address" "text",
    "user_agent" "text",
    "device_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "login_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_activity" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."auth_session_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."companies_code_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."companies_code_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" DEFAULT ('CO-'::"text" || "lpad"(("nextval"('"public"."companies_code_seq"'::"regclass"))::"text", 6, '0'::"text")) NOT NULL,
    "name" "text" NOT NULL,
    "short_name" "text",
    "email" "text",
    "contact" "text",
    "address" "text",
    "status" "text" DEFAULT 'ACTIVE'::"text",
    "remarks" "text",
    "is_active" boolean DEFAULT true,
    "is_deleted" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_master" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_name" "text" NOT NULL,
    "company_code" "text" NOT NULL,
    "industry" "text",
    "contact_person" "text",
    "email" "text",
    "phone" "text",
    "status" "text" DEFAULT 'ACTIVE'::"text",
    "is_active" boolean DEFAULT true,
    "is_deleted" boolean DEFAULT false,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid"
);


ALTER TABLE "public"."company_master" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."configuration_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "actor_id" "uuid",
    "config_type" "text" NOT NULL,
    "action" "text" NOT NULL,
    "before_state" "jsonb",
    "after_state" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."configuration_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_field_definitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module" "text" NOT NULL,
    "field_key" "text" NOT NULL,
    "field_label" "text" NOT NULL,
    "field_type" "text" NOT NULL,
    "is_required" boolean DEFAULT false NOT NULL,
    "options" "text"[] DEFAULT '{}'::"text"[],
    "is_deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."custom_field_definitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dead_letter_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "original_queue" "text" NOT NULL,
    "queue_item_id" "uuid" NOT NULL,
    "event_id" "uuid",
    "recipient_email" "text",
    "payload" "jsonb" NOT NULL,
    "failure_reason" "text" NOT NULL,
    "failed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dead_letter_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."delivery_queue_critical" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "event_id" "uuid",
    "channel" "text" NOT NULL,
    "recipient_id" "uuid",
    "recipient_email" "text",
    "payload" "jsonb" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text",
    "retry_count" integer DEFAULT 0,
    "last_error" "text",
    "provider_used" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "processed_at" timestamp with time zone
);


ALTER TABLE "public"."delivery_queue_critical" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."delivery_queue_digest" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "event_id" "uuid",
    "channel" "text" NOT NULL,
    "recipient_id" "uuid",
    "recipient_email" "text",
    "payload" "jsonb" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text",
    "retry_count" integer DEFAULT 0,
    "last_error" "text",
    "provider_used" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "processed_at" timestamp with time zone
);


ALTER TABLE "public"."delivery_queue_digest" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."delivery_queue_normal" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "event_id" "uuid",
    "channel" "text" NOT NULL,
    "recipient_id" "uuid",
    "recipient_email" "text",
    "payload" "jsonb" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text",
    "retry_count" integer DEFAULT 0,
    "last_error" "text",
    "provider_used" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "processed_at" timestamp with time zone
);


ALTER TABLE "public"."delivery_queue_normal" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "manager_id" "uuid",
    "is_deleted" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "description" "text",
    "scope_id" integer DEFAULT 1
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."designations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "department_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scope_id" integer
);


ALTER TABLE "public"."designations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "body_template" "text" NOT NULL,
    "is_sent" boolean DEFAULT false NOT NULL,
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."email_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "template_code" "text" NOT NULL,
    "module_code" "text",
    "template_version" integer DEFAULT 1,
    "status" "text" DEFAULT 'DRAFT'::"text",
    "subject_template" "text" NOT NULL,
    "body_template" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_processing_registry" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "processor_name" "text" NOT NULL,
    "processing_hash" "text" NOT NULL,
    "status" "text" NOT NULL,
    "processed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_processing_registry" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "text" NOT NULL,
    "operation" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."issue_subtypes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "issue_type_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scope_id" "uuid"
);


ALTER TABLE "public"."issue_subtypes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."issue_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scope_id" "uuid"
);


ALTER TABLE "public"."issue_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."master_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "master_table" "text" NOT NULL,
    "record_id" "uuid" NOT NULL,
    "operation" "text" NOT NULL,
    "actor_id" "text" DEFAULT 'system_admin'::"text",
    "before_values" "jsonb",
    "after_values" "jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."master_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_event_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "module_code" "text" NOT NULL,
    "event_code" "text" NOT NULL,
    "is_email_enabled" boolean DEFAULT true,
    "is_inapp_enabled" boolean DEFAULT true,
    "allowed_roles" "text"[] DEFAULT '{}'::"text"[],
    "allowed_statuses" "text"[] DEFAULT '{}'::"text"[],
    "cooldown_seconds" integer DEFAULT 0,
    "max_events_per_window" integer DEFAULT 0,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."notification_event_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "original_notification_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "text" NOT NULL,
    "action_type" "text" NOT NULL,
    "actor" "text" NOT NULL,
    "target_user_id" "text" NOT NULL,
    "read_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "user_id" "uuid" NOT NULL,
    "tenant_id" "uuid",
    "muted_modules" "text"[] DEFAULT '{}'::"text"[],
    "email_frequency" "text" DEFAULT 'INSTANT'::"text",
    "digest_interval_hours" integer DEFAULT 24,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_id" "uuid",
    "payload" "jsonb" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "entity_type" "text",
    "entity_id" "text",
    "module" "text" DEFAULT 'tickets'::"text",
    "action_type" "text",
    "actor" "text",
    "target_user_id" "text",
    "redirect_url" "text",
    "priority_level" "text" DEFAULT 'MEDIUM'::"text"
);


ALTER TABLE "public"."notification_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "module" "text" NOT NULL,
    "action" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "submodule" "text",
    "resource_type" "text" DEFAULT 'PAGE'::"text",
    "display_group" "text"
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."priority_master" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "priority_code" "text" NOT NULL,
    "priority_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sla_min_minutes" integer DEFAULT 0,
    "sla_max_minutes" integer DEFAULT 0,
    "sla_standard_minutes" integer DEFAULT 0,
    "scope_id" "uuid",
    "min_sla_hours" integer,
    "max_sla_hours" integer,
    "warning_sla_hours" integer,
    "sla_start_from" "text" DEFAULT 'FROM_CREATION'::"text",
    "scope_type" "text",
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "priority_color" "text"
);


ALTER TABLE "public"."priority_master" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_rate_limits" (
    "provider_type" "text" NOT NULL,
    "per_minute_limit" integer DEFAULT 100,
    "hourly_limit" integer DEFAULT 500,
    "concurrent_connections" integer DEFAULT 10,
    "retry_policy" "jsonb" DEFAULT '{"backoff": "exponential", "max_retries": 5}'::"jsonb"
);


ALTER TABLE "public"."provider_rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."requirement_approvals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requirement_id" "uuid" NOT NULL,
    "approver_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text",
    "comments" "text",
    "requested_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."requirement_approvals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."requirement_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requirement_id" "uuid" NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "operation" "text" NOT NULL,
    "before_values" "jsonb",
    "after_values" "jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."requirement_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."requirement_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requirement_id" "uuid" NOT NULL,
    "task_id" "uuid" NOT NULL,
    "linked_by" "uuid",
    "linked_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."requirement_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."requirement_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requirement_id" "uuid" NOT NULL,
    "version_tag" "text" NOT NULL,
    "snapshot_payload" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."requirement_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."requirement_watchers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requirement_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true,
    "is_deleted" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."requirement_watchers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."requirements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "title" "text" NOT NULL,
    "objective" "text",
    "functional_scope" "text",
    "technical_scope" "text",
    "status_id" "uuid" NOT NULL,
    "department_id" "uuid" NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb",
    "due_date" timestamp with time zone
);


ALTER TABLE "public"."requirements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role_id" "uuid" NOT NULL,
    "permission_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scope_master_mapping" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scope_id" "uuid" NOT NULL,
    "master_key" "text" NOT NULL,
    "is_required" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."scope_master_mapping" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."security_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "operation" "text" NOT NULL,
    "description" "text" NOT NULL,
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."security_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."software_modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "system_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scope_id" "uuid"
);


ALTER TABLE "public"."software_modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."software_submodules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scope_id" "uuid"
);


ALTER TABLE "public"."software_submodules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."software_systems" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scope_id" "uuid"
);


ALTER TABLE "public"."software_systems" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."status_master" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "status_code" "text" NOT NULL,
    "status_name" "text" NOT NULL,
    "module" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scope_id" "uuid",
    "scope_type" "text",
    "status_order" integer DEFAULT 0,
    "is_default" boolean DEFAULT false,
    "is_reopen" boolean DEFAULT false,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "status_color" "text",
    "is_closed" boolean DEFAULT false,
    "is_terminal" boolean DEFAULT false
);


ALTER TABLE "public"."status_master" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sub_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "subject" "text" NOT NULL,
    "description" "text",
    "assigned_to" "uuid",
    "status" "text" DEFAULT 'OPEN'::"text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false
);


ALTER TABLE "public"."sub_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sub_workspace_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sub_workspace_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sub_workspace_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sub_workspaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false
);


ALTER TABLE "public"."sub_workspaces" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_domain_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "event_type" "text" NOT NULL,
    "event_version" "text" DEFAULT 'v1'::"text" NOT NULL,
    "schema_version" "text" DEFAULT 'v1'::"text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "actor_id" "uuid",
    "payload" "jsonb" NOT NULL,
    "priority" "text" DEFAULT 'NORMAL'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."system_domain_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_email_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "provider_type" "text" NOT NULL,
    "smtp_host" "text",
    "smtp_port" integer,
    "smtp_username" "text",
    "smtp_password_encrypted" "text",
    "sender_name" "text" NOT NULL,
    "sender_email" "text" NOT NULL,
    "encryption_type" "text" DEFAULT 'STARTTLS'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_email_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_governance_switches" (
    "tenant_id" "uuid" NOT NULL,
    "disable_all_emails" boolean DEFAULT false,
    "disable_all_realtime" boolean DEFAULT false,
    "disable_digests" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_governance_switches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid",
    "actor_id" "uuid",
    "action" "text" NOT NULL,
    "old_state" "jsonb",
    "new_state" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_activity_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid",
    "file_name" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_type" "text",
    "size" integer,
    "version" integer DEFAULT 1,
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "operation" "text" NOT NULL,
    "before_values" "jsonb",
    "after_values" "jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."task_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid",
    "user_id" "uuid",
    "message" "text" NOT NULL,
    "is_edited" boolean DEFAULT false,
    "reactions" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."task_chat_messages" REPLICA IDENTITY FULL;


ALTER TABLE "public"."task_chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_checklists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "is_completed" boolean DEFAULT false NOT NULL,
    "completed_at" timestamp with time zone,
    "completed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."task_checklists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."task_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_custom_fields_master" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "field_name" "text" NOT NULL,
    "field_key" "text" NOT NULL,
    "field_type" "text" NOT NULL,
    "options" "jsonb",
    "is_required" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "is_deleted" boolean DEFAULT false,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_custom_fields_master" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_dependencies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "predecessor_task_id" "uuid" NOT NULL,
    "successor_task_id" "uuid" NOT NULL,
    "dependency_type" "text" DEFAULT 'FINISH_TO_START'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."task_dependencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_mentions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid",
    "mentioned_user_id" "uuid",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_mentions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_milestones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "target_date" timestamp with time zone NOT NULL,
    "is_reached" boolean DEFAULT false NOT NULL,
    "reached_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."task_milestones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "link" "text",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scope_id" integer
);


ALTER TABLE "public"."task_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_watchers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true,
    "is_deleted" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_watchers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "subject" "text" NOT NULL,
    "description" "text",
    "status_id" "uuid" NOT NULL,
    "priority_id" "uuid" NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "estimated_hours" numeric(6,2),
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb",
    "is_deleted" boolean DEFAULT false,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "sub_workspace_id" "uuid",
    "assigned_to" "uuid"
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid",
    "user_id" "uuid",
    "role" "text" DEFAULT 'member'::"text"
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_delivery_limits" (
    "tenant_id" "uuid" NOT NULL,
    "max_emails_per_hour" integer DEFAULT 500,
    "burst_limit" integer DEFAULT 50,
    "concurrent_jobs" integer DEFAULT 2,
    "max_webhooks" integer DEFAULT 1000
);


ALTER TABLE "public"."tenant_delivery_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_activity_stream" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "text" NOT NULL,
    "actor" "text" NOT NULL,
    "action" "text" NOT NULL,
    "event_type" "text" DEFAULT 'SYSTEM'::"text" NOT NULL,
    "before_values" "jsonb" DEFAULT '{}'::"jsonb",
    "after_values" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ticket_activity_stream" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "uploader_id" "uuid" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ticket_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "actor_id" "uuid",
    "operation" "text" NOT NULL,
    "before_values" "jsonb",
    "after_values" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ticket_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scope_id" "uuid",
    "is_requirement_category" boolean DEFAULT false
);


ALTER TABLE "public"."ticket_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_chats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "text" NOT NULL,
    "author" "text" NOT NULL,
    "content" "text" NOT NULL,
    "is_private" boolean DEFAULT true NOT NULL,
    "mentions" "text"[] DEFAULT '{}'::"text"[],
    "reactions" "jsonb" DEFAULT '{}'::"jsonb",
    "read_by" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ticket_chats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ticket_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_meetings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "agenda" "text" NOT NULL,
    "description" "text",
    "organizer" "text" NOT NULL,
    "participants" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "meeting_mode" "text" DEFAULT 'Microsoft Teams'::"text" NOT NULL,
    "meeting_url" "text" NOT NULL,
    "status" "text" DEFAULT 'SCHEDULED'::"text" NOT NULL,
    "mom_notes" "text",
    "action_items" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ticket_meetings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_requirements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "requirement_id" "uuid" NOT NULL,
    "linked_by" "uuid",
    "linked_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ticket_requirements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_scopes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ticket_scopes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_sla_policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "response_target_minutes" integer NOT NULL,
    "resolution_target_minutes" integer NOT NULL,
    "working_hours_code" "text" DEFAULT '24x7'::"text" NOT NULL,
    "escalation_level" "text" DEFAULT 'STANDARD'::"text" NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ticket_sla_policies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_sla_trackers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "sla_policy_id" "uuid" NOT NULL,
    "response_breached" boolean DEFAULT false NOT NULL,
    "resolution_breached" boolean DEFAULT false NOT NULL,
    "is_paused" boolean DEFAULT false NOT NULL,
    "pause_reason" "text",
    "paused_at" timestamp with time zone,
    "total_paused_minutes" integer DEFAULT 0 NOT NULL,
    "escalation_triggered" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ticket_sla_trackers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_subcategories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scope_id" "uuid"
);


ALTER TABLE "public"."ticket_subcategories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_watchers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "watch_type" "text" DEFAULT 'MANUAL'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ticket_watchers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "status_id" "uuid" NOT NULL,
    "priority_id" "uuid",
    "department_id" "uuid" NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "assignee_id" "uuid",
    "is_deleted" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb",
    "scope_type" "text" DEFAULT 'INFRA'::"text" NOT NULL,
    "asset_id" "uuid",
    "issue_type_id" "uuid",
    "issue_sub_type_id" "uuid",
    "category_id" "uuid",
    "sub_category_id" "uuid",
    "software_system_id" "uuid",
    "module_id" "uuid",
    "sub_module_id" "uuid",
    "queue_owner_id" "uuid",
    "due_date" timestamp with time zone
);


ALTER TABLE "public"."tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_dashboard_preferences" (
    "user_id" "uuid" NOT NULL,
    "selected_theme" "text" DEFAULT 'executive-light'::"text",
    "widget_layout" "jsonb" DEFAULT '{}'::"jsonb",
    "pinned_analytics" "jsonb" DEFAULT '[]'::"jsonb",
    "saved_filters" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_dashboard_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_department_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "department_id" "uuid" NOT NULL,
    "access_level" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_department_access" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_identity_view" WITH ("security_invoker"='false') AS
 SELECT "um"."id",
    "r"."code" AS "role_code"
   FROM ("public"."user_master" "um"
     JOIN "public"."roles" "r" ON (("um"."role_id" = "r"."id")));


ALTER VIEW "public"."user_identity_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_master_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "operation" "text" NOT NULL,
    "performed_by" "text" DEFAULT 'System Operations Admin'::"text" NOT NULL,
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_master_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_notification_summary" (
    "user_id" "uuid" NOT NULL,
    "total_unread" integer DEFAULT 0,
    "critical_unread" integer DEFAULT 0,
    "last_synced_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_notification_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_permissions_snapshot" (
    "user_id" "uuid" NOT NULL,
    "permission_code" "text" NOT NULL,
    "resource_scope" "text" DEFAULT 'global'::"text",
    "workspace_scope" "uuid"[] DEFAULT '{}'::"uuid"[],
    "department_scope" "uuid"[] DEFAULT '{}'::"uuid"[],
    "company_scope" "uuid"[] DEFAULT '{}'::"uuid"[],
    "team_scope" "uuid"[] DEFAULT '{}'::"uuid"[],
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_permissions_snapshot" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "employee_code" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "mobile_number" "text",
    "department_id" "uuid" NOT NULL,
    "designation_id" "uuid",
    "reporting_manager_id" "uuid",
    "role_id" "uuid" NOT NULL,
    "joining_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "employment_status_id" "text" DEFAULT 'ACTIVE'::"text" NOT NULL,
    "profile_photo" "text",
    "timezone" "text" DEFAULT 'UTC'::"text",
    "is_deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_reports_activity_summary" WITH ("security_invoker"='true') AS
 SELECT "a"."id",
    "a"."task_id",
    "a"."actor_id",
    "a"."action",
    "a"."old_state",
    "a"."new_state",
    "a"."created_at"
   FROM ("public"."task_activity_logs" "a"
     JOIN "public"."tasks" "t" ON (("a"."task_id" = "t"."id")));


ALTER VIEW "public"."vw_reports_activity_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_reports_assigned_to_me" WITH ("security_invoker"='true') AS
 SELECT "id",
    "workspace_id",
    "subject",
    "description",
    "status_id",
    "priority_id",
    "start_date",
    "end_date",
    "estimated_hours",
    "custom_fields",
    "is_deleted",
    "created_by",
    "created_at",
    "updated_at",
    "deleted_at",
    "deleted_by",
    "sub_workspace_id",
    "assigned_to"
   FROM "public"."tasks" "t"
  WHERE ("assigned_to" = "auth"."uid"());


ALTER VIEW "public"."vw_reports_assigned_to_me" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_reports_completed_tasks" WITH ("security_invoker"='true') AS
 SELECT "t"."id",
    "t"."workspace_id",
    "t"."subject",
    "t"."description",
    "t"."status_id",
    "t"."priority_id",
    "t"."start_date",
    "t"."end_date",
    "t"."estimated_hours",
    "t"."custom_fields",
    "t"."is_deleted",
    "t"."created_by",
    "t"."created_at",
    "t"."updated_at",
    "t"."deleted_at",
    "t"."deleted_by",
    "t"."sub_workspace_id",
    "t"."assigned_to"
   FROM ("public"."tasks" "t"
     JOIN "public"."status_master" "sm" ON (("t"."status_id" = "sm"."id")))
  WHERE ("sm"."is_closed" = true);


ALTER VIEW "public"."vw_reports_completed_tasks" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_reports_created_by_me" WITH ("security_invoker"='true') AS
 SELECT "id",
    "workspace_id",
    "subject",
    "description",
    "status_id",
    "priority_id",
    "start_date",
    "end_date",
    "estimated_hours",
    "custom_fields",
    "is_deleted",
    "created_by",
    "created_at",
    "updated_at",
    "deleted_at",
    "deleted_by",
    "sub_workspace_id",
    "assigned_to"
   FROM "public"."tasks" "t"
  WHERE ("created_by" = "auth"."uid"());


ALTER VIEW "public"."vw_reports_created_by_me" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_reports_due_this_month" WITH ("security_invoker"='true') AS
 SELECT "id",
    "workspace_id",
    "subject",
    "description",
    "status_id",
    "priority_id",
    "start_date",
    "end_date",
    "estimated_hours",
    "custom_fields",
    "is_deleted",
    "created_by",
    "created_at",
    "updated_at",
    "deleted_at",
    "deleted_by",
    "sub_workspace_id",
    "assigned_to"
   FROM "public"."tasks" "t"
  WHERE ("date_trunc"('month'::"text", ("end_date")::timestamp with time zone) = "date_trunc"('month'::"text", (CURRENT_DATE)::timestamp with time zone));


ALTER VIEW "public"."vw_reports_due_this_month" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_reports_due_this_week" WITH ("security_invoker"='true') AS
 SELECT "id",
    "workspace_id",
    "subject",
    "description",
    "status_id",
    "priority_id",
    "start_date",
    "end_date",
    "estimated_hours",
    "custom_fields",
    "is_deleted",
    "created_by",
    "created_at",
    "updated_at",
    "deleted_at",
    "deleted_by",
    "sub_workspace_id",
    "assigned_to"
   FROM "public"."tasks" "t"
  WHERE ("date_trunc"('week'::"text", ("end_date")::timestamp with time zone) = "date_trunc"('week'::"text", (CURRENT_DATE)::timestamp with time zone));


ALTER VIEW "public"."vw_reports_due_this_week" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_reports_due_today" WITH ("security_invoker"='true') AS
 SELECT "id",
    "workspace_id",
    "subject",
    "description",
    "status_id",
    "priority_id",
    "start_date",
    "end_date",
    "estimated_hours",
    "custom_fields",
    "is_deleted",
    "created_by",
    "created_at",
    "updated_at",
    "deleted_at",
    "deleted_by",
    "sub_workspace_id",
    "assigned_to"
   FROM "public"."tasks" "t"
  WHERE (("end_date" = CURRENT_DATE) OR ("start_date" = CURRENT_DATE));


ALTER VIEW "public"."vw_reports_due_today" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_reports_in_progress_tasks" WITH ("security_invoker"='true') AS
 SELECT "t"."id",
    "t"."workspace_id",
    "t"."subject",
    "t"."description",
    "t"."status_id",
    "t"."priority_id",
    "t"."start_date",
    "t"."end_date",
    "t"."estimated_hours",
    "t"."custom_fields",
    "t"."is_deleted",
    "t"."created_by",
    "t"."created_at",
    "t"."updated_at",
    "t"."deleted_at",
    "t"."deleted_by",
    "t"."sub_workspace_id",
    "t"."assigned_to"
   FROM ("public"."tasks" "t"
     JOIN "public"."status_master" "sm" ON (("t"."status_id" = "sm"."id")))
  WHERE (("sm"."status_code" = 'ST_IN_PROGRESS'::"text") OR ("sm"."status_name" ~~* '%In Progress%'::"text"));


ALTER VIEW "public"."vw_reports_in_progress_tasks" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_reports_open_tasks" WITH ("security_invoker"='true') AS
 SELECT "t"."id",
    "t"."workspace_id",
    "t"."subject",
    "t"."description",
    "t"."status_id",
    "t"."priority_id",
    "t"."start_date",
    "t"."end_date",
    "t"."estimated_hours",
    "t"."custom_fields",
    "t"."is_deleted",
    "t"."created_by",
    "t"."created_at",
    "t"."updated_at",
    "t"."deleted_at",
    "t"."deleted_by",
    "t"."sub_workspace_id",
    "t"."assigned_to"
   FROM ("public"."tasks" "t"
     JOIN "public"."status_master" "sm" ON (("t"."status_id" = "sm"."id")))
  WHERE (("sm"."status_code" = 'ST_OPEN'::"text") OR ("sm"."status_name" ~~* '%Open%'::"text"));


ALTER VIEW "public"."vw_reports_open_tasks" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_reports_overdue_tasks" WITH ("security_invoker"='true') AS
 SELECT "t"."id",
    "t"."workspace_id",
    "t"."subject",
    "t"."description",
    "t"."status_id",
    "t"."priority_id",
    "t"."start_date",
    "t"."end_date",
    "t"."estimated_hours",
    "t"."custom_fields",
    "t"."is_deleted",
    "t"."created_by",
    "t"."created_at",
    "t"."updated_at",
    "t"."deleted_at",
    "t"."deleted_by",
    "t"."sub_workspace_id",
    "t"."assigned_to"
   FROM ("public"."tasks" "t"
     JOIN "public"."status_master" "sm" ON (("t"."status_id" = "sm"."id")))
  WHERE (("sm"."is_closed" = false) AND ("t"."end_date" < CURRENT_DATE));


ALTER VIEW "public"."vw_reports_overdue_tasks" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_reports_sla_breached" WITH ("security_invoker"='true') AS
 SELECT "t"."id",
    "t"."workspace_id",
    "t"."subject",
    "t"."description",
    "t"."status_id",
    "t"."priority_id",
    "t"."start_date",
    "t"."end_date",
    "t"."estimated_hours",
    "t"."custom_fields",
    "t"."is_deleted",
    "t"."created_by",
    "t"."created_at",
    "t"."updated_at",
    "t"."deleted_at",
    "t"."deleted_by",
    "t"."sub_workspace_id",
    "t"."assigned_to"
   FROM ("public"."tasks" "t"
     JOIN "public"."status_master" "sm" ON (("t"."status_id" = "sm"."id")))
  WHERE (("sm"."is_closed" = false) AND ("t"."end_date" < CURRENT_DATE));


ALTER VIEW "public"."vw_reports_sla_breached" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_reports_sub_task_owner_wise" WITH ("security_invoker"='true') AS
 SELECT "u"."full_name" AS "owner_name",
    "st"."id",
    "st"."task_id",
    "st"."subject",
    "st"."description",
    "st"."assigned_to",
    "st"."status",
    "st"."created_by",
    "st"."created_at",
    "st"."updated_at",
    "st"."deleted_at",
    "st"."is_deleted"
   FROM ("public"."sub_tasks" "st"
     JOIN "public"."user_master" "u" ON (("st"."assigned_to" = "u"."id")));


ALTER VIEW "public"."vw_reports_sub_task_owner_wise" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_reports_sub_workspace_productivity" WITH ("security_invoker"='true') AS
 SELECT "sw"."id" AS "sub_workspace_id",
    "sw"."name" AS "sub_workspace_name",
    "count"("t"."id") FILTER (WHERE ("sm"."is_closed" = true)) AS "completed_tasks",
    "count"("t"."id") FILTER (WHERE (("sm"."is_closed" = false) AND ("t"."end_date" < CURRENT_DATE))) AS "overdue_tasks",
    "count"("t"."id") AS "total_tasks"
   FROM (("public"."sub_workspaces" "sw"
     LEFT JOIN "public"."tasks" "t" ON (("t"."sub_workspace_id" = "sw"."id")))
     LEFT JOIN "public"."status_master" "sm" ON (("t"."status_id" = "sm"."id")))
  GROUP BY "sw"."id", "sw"."name";


ALTER VIEW "public"."vw_reports_sub_workspace_productivity" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_reports_sub_workspace_wise" WITH ("security_invoker"='true') AS
 SELECT "sw"."name" AS "sub_workspace_name",
    "t"."id",
    "t"."workspace_id",
    "t"."subject",
    "t"."description",
    "t"."status_id",
    "t"."priority_id",
    "t"."start_date",
    "t"."end_date",
    "t"."estimated_hours",
    "t"."custom_fields",
    "t"."is_deleted",
    "t"."created_by",
    "t"."created_at",
    "t"."updated_at",
    "t"."deleted_at",
    "t"."deleted_by",
    "t"."sub_workspace_id",
    "t"."assigned_to"
   FROM ("public"."tasks" "t"
     JOIN "public"."sub_workspaces" "sw" ON (("t"."sub_workspace_id" = "sw"."id")));


ALTER VIEW "public"."vw_reports_sub_workspace_wise" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_reports_task_owner_wise" WITH ("security_invoker"='true') AS
 SELECT "u"."full_name" AS "owner_name",
    "t"."id",
    "t"."workspace_id",
    "t"."subject",
    "t"."description",
    "t"."status_id",
    "t"."priority_id",
    "t"."start_date",
    "t"."end_date",
    "t"."estimated_hours",
    "t"."custom_fields",
    "t"."is_deleted",
    "t"."created_by",
    "t"."created_at",
    "t"."updated_at",
    "t"."deleted_at",
    "t"."deleted_by",
    "t"."sub_workspace_id",
    "t"."assigned_to"
   FROM ("public"."tasks" "t"
     JOIN "public"."user_master" "u" ON (("t"."assigned_to" = "u"."id")));


ALTER VIEW "public"."vw_reports_task_owner_wise" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_reports_user_productivity" WITH ("security_invoker"='true') AS
 SELECT "u"."id" AS "user_id",
    "u"."full_name",
    "count"("t"."id") FILTER (WHERE ("sm"."is_closed" = true)) AS "completed_tasks",
    "count"("t"."id") FILTER (WHERE (("sm"."is_closed" = false) AND ("t"."end_date" < CURRENT_DATE))) AS "overdue_tasks",
    "count"("t"."id") AS "total_assigned_tasks"
   FROM (("public"."user_master" "u"
     LEFT JOIN "public"."tasks" "t" ON (("t"."assigned_to" = "u"."id")))
     LEFT JOIN "public"."status_master" "sm" ON (("t"."status_id" = "sm"."id")))
  GROUP BY "u"."id", "u"."full_name";


ALTER VIEW "public"."vw_reports_user_productivity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid",
    "workspace_name" "text" NOT NULL,
    "workspace_code" "text" NOT NULL,
    "description" "text",
    "workspace_owner_id" "uuid" NOT NULL,
    "status_id" "uuid",
    "start_date" "date",
    "end_date" "date",
    "is_active" boolean DEFAULT true,
    "is_deleted" boolean DEFAULT false,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "parent_workspace_id" "uuid"
);


ALTER TABLE "public"."workspaces" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_reports_workspace_productivity" WITH ("security_invoker"='true') AS
 SELECT "w"."id" AS "workspace_id",
    "w"."workspace_name",
    "count"("t"."id") FILTER (WHERE ("sm"."is_closed" = true)) AS "completed_tasks",
    "count"("t"."id") FILTER (WHERE (("sm"."is_closed" = false) AND ("t"."end_date" < CURRENT_DATE))) AS "overdue_tasks",
    "count"("t"."id") AS "total_tasks"
   FROM (("public"."workspaces" "w"
     LEFT JOIN "public"."tasks" "t" ON (("t"."workspace_id" = "w"."id")))
     LEFT JOIN "public"."status_master" "sm" ON (("t"."status_id" = "sm"."id")))
  GROUP BY "w"."id", "w"."workspace_name";


ALTER VIEW "public"."vw_reports_workspace_productivity" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_reports_workspace_wise" WITH ("security_invoker"='true') AS
 SELECT "w"."workspace_name",
    "t"."id",
    "t"."workspace_id",
    "t"."subject",
    "t"."description",
    "t"."status_id",
    "t"."priority_id",
    "t"."start_date",
    "t"."end_date",
    "t"."estimated_hours",
    "t"."custom_fields",
    "t"."is_deleted",
    "t"."created_by",
    "t"."created_at",
    "t"."updated_at",
    "t"."deleted_at",
    "t"."deleted_by",
    "t"."sub_workspace_id",
    "t"."assigned_to"
   FROM ("public"."tasks" "t"
     JOIN "public"."workspaces" "w" ON (("t"."workspace_id" = "w"."id")));


ALTER VIEW "public"."vw_reports_workspace_wise" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_user_roles" AS
 SELECT "um"."id" AS "user_id",
    "r"."code" AS "role_code"
   FROM ("public"."user_master" "um"
     JOIN "public"."roles" "r" ON (("um"."role_id" = "r"."id")));


ALTER VIEW "public"."vw_user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."websocket_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "channel_scope" "text" NOT NULL,
    "event_name" "text" NOT NULL,
    "broadcast_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'BROADCASTED'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."websocket_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_states" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "module" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workflow_states" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_transition_departments" (
    "transition_id" "uuid" NOT NULL,
    "department_id" "uuid" NOT NULL
);


ALTER TABLE "public"."workflow_transition_departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_transition_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "from_state_id" "uuid",
    "to_state_id" "uuid",
    "actor_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workflow_transition_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_transition_master" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_status_id" "uuid",
    "to_status_id" "uuid" NOT NULL,
    "scope_type" "text" NOT NULL,
    "allowed_role_id" "uuid",
    "requires_approval" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "is_deleted" boolean DEFAULT false,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid"
);


ALTER TABLE "public"."workflow_transition_master" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_transition_roles" (
    "transition_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL
);


ALTER TABLE "public"."workflow_transition_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_transitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_state_id" "uuid" NOT NULL,
    "to_state_id" "uuid" NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workflow_transitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workload_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "snapshot_date" "date" NOT NULL,
    "active_tasks" integer DEFAULT 0,
    "overdue_tasks" integer DEFAULT 0,
    "estimated_hours" numeric DEFAULT 0,
    "capacity_percentage" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."workload_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspace_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'MEMBER'::"text",
    "is_active" boolean DEFAULT true,
    "is_deleted" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."workspace_members" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."workspace_tasks_code_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."workspace_tasks_code_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspace_teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true,
    "is_deleted" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."workspace_teams" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."workspaces_code_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."workspaces_code_seq" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activity_events"
    ADD CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."approval_types"
    ADD CONSTRAINT "approval_types_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."approval_types"
    ADD CONSTRAINT "approval_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_asset_tag_key" UNIQUE ("asset_tag");



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auth_session_logs"
    ADD CONSTRAINT "auth_session_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_master"
    ADD CONSTRAINT "company_master_company_code_key" UNIQUE ("company_code");



ALTER TABLE ONLY "public"."company_master"
    ADD CONSTRAINT "company_master_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."configuration_audit_logs"
    ADD CONSTRAINT "configuration_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_field_definitions"
    ADD CONSTRAINT "custom_field_definitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dead_letter_queue"
    ADD CONSTRAINT "dead_letter_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."delivery_queue_critical"
    ADD CONSTRAINT "delivery_queue_critical_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."delivery_queue_digest"
    ADD CONSTRAINT "delivery_queue_digest_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."delivery_queue_normal"
    ADD CONSTRAINT "delivery_queue_normal_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."designations"
    ADD CONSTRAINT "designations_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."designations"
    ADD CONSTRAINT "designations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_queue"
    ADD CONSTRAINT "email_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_tenant_id_template_code_template_version_key" UNIQUE ("tenant_id", "template_code", "template_version");



ALTER TABLE ONLY "public"."event_processing_registry"
    ADD CONSTRAINT "event_processing_registry_event_id_processor_name_key" UNIQUE ("event_id", "processor_name");



ALTER TABLE ONLY "public"."event_processing_registry"
    ADD CONSTRAINT "event_processing_registry_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_processing_registry"
    ADD CONSTRAINT "event_processing_registry_processing_hash_key" UNIQUE ("processing_hash");



ALTER TABLE ONLY "public"."event_queue"
    ADD CONSTRAINT "event_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."issue_subtypes"
    ADD CONSTRAINT "issue_subtypes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."issue_types"
    ADD CONSTRAINT "issue_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."master_audit_logs"
    ADD CONSTRAINT "master_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."priority_master"
    ADD CONSTRAINT "master_priorities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_event_config"
    ADD CONSTRAINT "notification_event_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_event_config"
    ADD CONSTRAINT "notification_event_config_tenant_id_module_code_event_code_key" UNIQUE ("tenant_id", "module_code", "event_code");



ALTER TABLE ONLY "public"."notification_history"
    ADD CONSTRAINT "notification_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."notification_queue"
    ADD CONSTRAINT "notification_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_rate_limits"
    ADD CONSTRAINT "provider_rate_limits_pkey" PRIMARY KEY ("provider_type");



ALTER TABLE ONLY "public"."requirement_approvals"
    ADD CONSTRAINT "requirement_approvals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."requirement_audit_logs"
    ADD CONSTRAINT "requirement_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."requirement_tasks"
    ADD CONSTRAINT "requirement_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."requirement_tasks"
    ADD CONSTRAINT "requirement_tasks_requirement_id_task_id_key" UNIQUE ("requirement_id", "task_id");



ALTER TABLE ONLY "public"."requirement_versions"
    ADD CONSTRAINT "requirement_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."requirement_watchers"
    ADD CONSTRAINT "requirement_watchers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."requirement_watchers"
    ADD CONSTRAINT "requirement_watchers_requirement_id_user_id_key" UNIQUE ("requirement_id", "user_id");



ALTER TABLE ONLY "public"."requirements"
    ADD CONSTRAINT "requirements_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."requirements"
    ADD CONSTRAINT "requirements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scope_master_mapping"
    ADD CONSTRAINT "scope_master_mapping_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scope_master_mapping"
    ADD CONSTRAINT "scope_master_mapping_scope_id_master_key_key" UNIQUE ("scope_id", "master_key");



ALTER TABLE ONLY "public"."security_audit_logs"
    ADD CONSTRAINT "security_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."software_modules"
    ADD CONSTRAINT "software_modules_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."software_modules"
    ADD CONSTRAINT "software_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."software_submodules"
    ADD CONSTRAINT "software_submodules_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."software_submodules"
    ADD CONSTRAINT "software_submodules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."software_systems"
    ADD CONSTRAINT "software_systems_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."software_systems"
    ADD CONSTRAINT "software_systems_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sub_tasks"
    ADD CONSTRAINT "sub_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sub_workspace_members"
    ADD CONSTRAINT "sub_workspace_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sub_workspace_members"
    ADD CONSTRAINT "sub_workspace_members_sub_workspace_id_user_id_key" UNIQUE ("sub_workspace_id", "user_id");



ALTER TABLE ONLY "public"."sub_workspaces"
    ADD CONSTRAINT "sub_workspaces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_domain_events"
    ADD CONSTRAINT "system_domain_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_email_config"
    ADD CONSTRAINT "system_email_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_governance_switches"
    ADD CONSTRAINT "system_governance_switches_pkey" PRIMARY KEY ("tenant_id");



ALTER TABLE ONLY "public"."task_activity_logs"
    ADD CONSTRAINT "task_activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_attachments"
    ADD CONSTRAINT "task_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_audit_logs"
    ADD CONSTRAINT "task_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_chat_messages"
    ADD CONSTRAINT "task_chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_checklists"
    ADD CONSTRAINT "task_checklists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_custom_fields_master"
    ADD CONSTRAINT "task_custom_fields_master_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_custom_fields_master"
    ADD CONSTRAINT "task_custom_fields_master_workspace_id_field_key_key" UNIQUE ("workspace_id", "field_key");



ALTER TABLE ONLY "public"."task_dependencies"
    ADD CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_mentions"
    ADD CONSTRAINT "task_mentions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_milestones"
    ADD CONSTRAINT "task_milestones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_notifications"
    ADD CONSTRAINT "task_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_types"
    ADD CONSTRAINT "task_types_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."task_types"
    ADD CONSTRAINT "task_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_watchers"
    ADD CONSTRAINT "task_watchers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_watchers"
    ADD CONSTRAINT "task_watchers_task_id_user_id_key" UNIQUE ("task_id", "user_id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_user_id_key" UNIQUE ("team_id", "user_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_delivery_limits"
    ADD CONSTRAINT "tenant_delivery_limits_pkey" PRIMARY KEY ("tenant_id");



ALTER TABLE ONLY "public"."ticket_activity_stream"
    ADD CONSTRAINT "ticket_activity_stream_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_attachments"
    ADD CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_audit_logs"
    ADD CONSTRAINT "ticket_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_categories"
    ADD CONSTRAINT "ticket_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_chats"
    ADD CONSTRAINT "ticket_chats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_comments"
    ADD CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_meetings"
    ADD CONSTRAINT "ticket_meetings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_requirements"
    ADD CONSTRAINT "ticket_requirements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_requirements"
    ADD CONSTRAINT "ticket_requirements_ticket_id_requirement_id_key" UNIQUE ("ticket_id", "requirement_id");



ALTER TABLE ONLY "public"."ticket_scopes"
    ADD CONSTRAINT "ticket_scopes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."ticket_scopes"
    ADD CONSTRAINT "ticket_scopes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_sla_policies"
    ADD CONSTRAINT "ticket_sla_policies_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."ticket_sla_policies"
    ADD CONSTRAINT "ticket_sla_policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_sla_trackers"
    ADD CONSTRAINT "ticket_sla_trackers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_subcategories"
    ADD CONSTRAINT "ticket_subcategories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_watchers"
    ADD CONSTRAINT "ticket_watchers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "uq_role_permission" UNIQUE ("role_id", "permission_id");



ALTER TABLE ONLY "public"."task_dependencies"
    ADD CONSTRAINT "uq_task_dependency" UNIQUE ("predecessor_task_id", "successor_task_id");



ALTER TABLE ONLY "public"."ticket_sla_trackers"
    ADD CONSTRAINT "uq_ticket_sla" UNIQUE ("ticket_id");



ALTER TABLE ONLY "public"."ticket_watchers"
    ADD CONSTRAINT "uq_ticket_watcher" UNIQUE ("ticket_id", "user_id");



ALTER TABLE ONLY "public"."user_department_access"
    ADD CONSTRAINT "uq_user_department" UNIQUE ("user_id", "department_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "uq_user_role" UNIQUE ("user_id", "role_id");



ALTER TABLE ONLY "public"."workflow_transitions"
    ADD CONSTRAINT "uq_workflow_transition" UNIQUE ("from_state_id", "to_state_id");



ALTER TABLE ONLY "public"."user_dashboard_preferences"
    ADD CONSTRAINT "user_dashboard_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_department_access"
    ADD CONSTRAINT "user_department_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_master_audit_logs"
    ADD CONSTRAINT "user_master_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_master"
    ADD CONSTRAINT "user_master_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."user_master"
    ADD CONSTRAINT "user_master_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_master"
    ADD CONSTRAINT "user_master_user_code_key" UNIQUE ("user_code");



ALTER TABLE ONLY "public"."user_notification_summary"
    ADD CONSTRAINT "user_notification_summary_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_permissions_snapshot"
    ADD CONSTRAINT "user_permissions_snapshot_pkey" PRIMARY KEY ("user_id", "permission_code");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_employee_code_key" UNIQUE ("employee_code");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."websocket_queue"
    ADD CONSTRAINT "websocket_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_states"
    ADD CONSTRAINT "workflow_states_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."status_master"
    ADD CONSTRAINT "workflow_states_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_states"
    ADD CONSTRAINT "workflow_states_pkey1" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_transition_departments"
    ADD CONSTRAINT "workflow_transition_departments_pkey" PRIMARY KEY ("transition_id", "department_id");



ALTER TABLE ONLY "public"."workflow_transition_logs"
    ADD CONSTRAINT "workflow_transition_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_transition_master"
    ADD CONSTRAINT "workflow_transition_master_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_transition_roles"
    ADD CONSTRAINT "workflow_transition_roles_pkey" PRIMARY KEY ("transition_id", "role_id");



ALTER TABLE ONLY "public"."workflow_transitions"
    ADD CONSTRAINT "workflow_transitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workload_snapshots"
    ADD CONSTRAINT "workload_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workload_snapshots"
    ADD CONSTRAINT "workload_snapshots_user_id_snapshot_date_key" UNIQUE ("user_id", "snapshot_date");



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_workspace_id_user_id_key" UNIQUE ("workspace_id", "user_id");



ALTER TABLE ONLY "public"."workspace_teams"
    ADD CONSTRAINT "workspace_teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspace_teams"
    ADD CONSTRAINT "workspace_teams_workspace_id_team_id_key" UNIQUE ("workspace_id", "team_id");



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_workspace_code_key" UNIQUE ("workspace_code");



CREATE INDEX "idx_assets_dept" ON "public"."assets" USING "btree" ("department_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_attachments_record" ON "public"."attachments" USING "btree" ("record_id", "module_type") WHERE (NOT "is_deleted");



CREATE INDEX "idx_custom_fields_lookup" ON "public"."custom_field_definitions" USING "btree" ("module") WHERE (NOT "is_deleted");



CREATE INDEX "idx_delivery_queue_critical_status" ON "public"."delivery_queue_critical" USING "btree" ("status") WHERE ("status" = 'PENDING'::"text");



CREATE INDEX "idx_delivery_queue_digest_status" ON "public"."delivery_queue_digest" USING "btree" ("status") WHERE ("status" = 'PENDING'::"text");



CREATE INDEX "idx_delivery_queue_normal_status" ON "public"."delivery_queue_normal" USING "btree" ("status") WHERE ("status" = 'PENDING'::"text");



CREATE INDEX "idx_designations_dept" ON "public"."designations" USING "btree" ("department_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_domain_events_entity_created" ON "public"."system_domain_events" USING "btree" ("entity_id", "created_at" DESC);



CREATE INDEX "idx_domain_events_type_created" ON "public"."system_domain_events" USING "btree" ("event_type", "created_at" DESC);



CREATE INDEX "idx_email_queue_is_sent" ON "public"."email_queue" USING "btree" ("is_sent");



CREATE INDEX "idx_issue_subtypes_type" ON "public"."issue_subtypes" USING "btree" ("issue_type_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_master_audit_lookup" ON "public"."master_audit_logs" USING "btree" ("master_table", "record_id");



CREATE INDEX "idx_notif_queue_is_read" ON "public"."notification_queue" USING "btree" ("is_read", "recipient_id");



CREATE INDEX "idx_notif_recipient_read_created" ON "public"."notification_queue" USING "btree" ("recipient_id", "is_read", "created_at" DESC) WHERE ("recipient_id" IS NOT NULL);



CREATE INDEX "idx_req_approvers_user" ON "public"."requirement_approvals" USING "btree" ("approver_id");



CREATE INDEX "idx_req_watchers_user" ON "public"."requirement_watchers" USING "btree" ("user_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_reqs_created_desc" ON "public"."requirements" USING "btree" ("created_at" DESC, "id" DESC) WHERE (NOT "is_deleted");



CREATE INDEX "idx_reqs_creator" ON "public"."requirements" USING "btree" ("creator_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_reqs_dept_status" ON "public"."requirements" USING "btree" ("department_id", "status_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_reqs_status" ON "public"."requirements" USING "btree" ("status_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_requirements_dept" ON "public"."requirements" USING "btree" ("department_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_requirements_pagination" ON "public"."requirements" USING "btree" ("created_at" DESC, "id" DESC);



CREATE INDEX "idx_session_logs_lookup" ON "public"."auth_session_logs" USING "btree" ("user_id", "is_active");



CREATE INDEX "idx_sla_trackers_breach" ON "public"."ticket_sla_trackers" USING "btree" ("response_breached", "resolution_breached");



CREATE INDEX "idx_software_modules_sys" ON "public"."software_modules" USING "btree" ("system_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_software_submodules_mod" ON "public"."software_submodules" USING "btree" ("module_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_system_events_created" ON "public"."system_domain_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_task_activity_task_created" ON "public"."task_activity_logs" USING "btree" ("task_id", "created_at" DESC);



CREATE INDEX "idx_task_audit_task_created" ON "public"."task_audit_logs" USING "btree" ("task_id", "created_at" DESC);



CREATE INDEX "idx_task_deps_succ" ON "public"."task_dependencies" USING "btree" ("successor_task_id");



CREATE INDEX "idx_task_milestones_tsk" ON "public"."task_milestones" USING "btree" ("task_id");



CREATE INDEX "idx_task_watchers_user" ON "public"."task_watchers" USING "btree" ("user_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_tasks_created_by_deleted" ON "public"."tasks" USING "btree" ("created_by", "is_deleted");



CREATE INDEX "idx_tasks_creator" ON "public"."tasks" USING "btree" ("created_by") WHERE (NOT "is_deleted");



CREATE INDEX "idx_tasks_custom_fields" ON "public"."tasks" USING "gin" ("custom_fields");



CREATE INDEX "idx_tasks_priority" ON "public"."tasks" USING "btree" ("priority_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_tasks_status" ON "public"."tasks" USING "btree" ("status_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_tasks_workspace" ON "public"."tasks" USING "btree" ("workspace_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_tasks_workspace_created" ON "public"."tasks" USING "btree" ("workspace_id", "created_at" DESC) WHERE (NOT "is_deleted");



CREATE INDEX "idx_tasks_workspace_deleted" ON "public"."tasks" USING "btree" ("workspace_id", "is_deleted");



CREATE INDEX "idx_tasks_workspace_id" ON "public"."tasks" USING "btree" ("workspace_id");



CREATE INDEX "idx_tasks_workspace_id_deleted" ON "public"."tasks" USING "btree" ("workspace_id") WHERE ("is_deleted" = false);



CREATE INDEX "idx_tasks_workspace_status" ON "public"."tasks" USING "btree" ("workspace_id", "status_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_team_members_user_id" ON "public"."team_members" USING "btree" ("user_id");



CREATE INDEX "idx_ticket_audit_ticket_created" ON "public"."ticket_audit_logs" USING "btree" ("ticket_id", "created_at" DESC);



CREATE INDEX "idx_ticket_subcategories_cat" ON "public"."ticket_subcategories" USING "btree" ("category_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_tickets_asset" ON "public"."tickets" USING "btree" ("asset_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_tickets_assignee" ON "public"."tickets" USING "btree" ("assignee_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_tickets_assignee_deleted" ON "public"."tickets" USING "btree" ("assignee_id", "is_deleted");



CREATE INDEX "idx_tickets_created_id_desc" ON "public"."tickets" USING "btree" ("created_at" DESC, "id" DESC) WHERE (NOT "is_deleted");



CREATE INDEX "idx_tickets_creator" ON "public"."tickets" USING "btree" ("creator_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_tickets_creator_deleted" ON "public"."tickets" USING "btree" ("creator_id", "is_deleted");



CREATE INDEX "idx_tickets_dept" ON "public"."tickets" USING "btree" ("department_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_tickets_dept_status" ON "public"."tickets" USING "btree" ("department_id", "status_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_tickets_issue_type" ON "public"."tickets" USING "btree" ("issue_type_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_tickets_pagination" ON "public"."tickets" USING "btree" ("created_at" DESC, "id" DESC);



CREATE INDEX "idx_tickets_priority" ON "public"."tickets" USING "btree" ("priority_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_tickets_queue_owner" ON "public"."tickets" USING "btree" ("queue_owner_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_tickets_software" ON "public"."tickets" USING "btree" ("software_system_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_tickets_status" ON "public"."tickets" USING "btree" ("status_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_ups_user_perm" ON "public"."user_permissions_snapshot" USING "btree" ("user_id", "permission_code");



CREATE INDEX "idx_user_dept_access" ON "public"."user_department_access" USING "btree" ("user_id", "department_id");



CREATE INDEX "idx_user_master_last_active_at" ON "public"."user_master" USING "btree" ("last_active_at" DESC);



CREATE INDEX "idx_user_profiles_manager" ON "public"."user_profiles" USING "btree" ("reporting_manager_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_user_profiles_routing" ON "public"."user_profiles" USING "btree" ("department_id", "role_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_users_active_deleted" ON "public"."user_master" USING "btree" ("is_active", "is_deleted");



CREATE INDEX "idx_users_dept_deleted" ON "public"."user_master" USING "btree" ("department_id", "is_deleted");



CREATE INDEX "idx_users_manager" ON "public"."user_master" USING "btree" ("manager_id") WHERE (NOT "is_deleted");



CREATE INDEX "idx_users_role_deleted" ON "public"."user_master" USING "btree" ("role_id", "is_deleted");



CREATE INDEX "idx_workspace_members_user_id" ON "public"."workspace_members" USING "btree" ("user_id");



CREATE INDEX "idx_workspace_members_user_workspace" ON "public"."workspace_members" USING "btree" ("user_id", "workspace_id");



CREATE INDEX "idx_workspace_members_workspace_id" ON "public"."workspace_members" USING "btree" ("workspace_id") WHERE ("is_deleted" = false);



CREATE INDEX "idx_workspace_teams_team_id" ON "public"."workspace_teams" USING "btree" ("team_id");



CREATE INDEX "idx_workspaces_company_deleted" ON "public"."workspaces" USING "btree" ("company_id", "is_deleted");



CREATE INDEX "idx_workspaces_created_by" ON "public"."workspaces" USING "btree" ("created_by", "is_deleted");



CREATE INDEX "idx_workspaces_deleted_created" ON "public"."workspaces" USING "btree" ("is_deleted", "created_at" DESC);



CREATE INDEX "idx_workspaces_owner_deleted" ON "public"."workspaces" USING "btree" ("workspace_owner_id", "is_deleted");



CREATE OR REPLACE TRIGGER "tr_notification_queue_sync" BEFORE INSERT ON "public"."notification_queue" FOR EACH ROW EXECUTE FUNCTION "public"."tr_sync_notification_queue_fields"();



CREATE OR REPLACE TRIGGER "tr_on_ticket_lifecycle" AFTER INSERT OR DELETE OR UPDATE ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."handle_ticket_lifecycle"();



CREATE OR REPLACE TRIGGER "tr_prevent_event_updates" BEFORE UPDATE ON "public"."system_domain_events" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_event_updates"();



CREATE OR REPLACE TRIGGER "tr_refresh_ups_on_dept_access" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_department_access" FOR EACH ROW EXECUTE FUNCTION "public"."refresh_ups_on_dept_access_change"();



CREATE OR REPLACE TRIGGER "tr_sync_master_role" AFTER UPDATE OF "role_id" ON "public"."user_master" FOR EACH ROW EXECUTE FUNCTION "public"."sync_master_role_to_security"();



CREATE OR REPLACE TRIGGER "tr_sync_user_master_role_to_user_roles" AFTER INSERT OR UPDATE OF "role_id" ON "public"."user_master" FOR EACH ROW EXECUTE FUNCTION "public"."sync_user_master_role_to_user_roles"();



CREATE OR REPLACE TRIGGER "tr_task_audit_notification" AFTER INSERT OR DELETE OR UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."handle_task_audit_and_notification"();



CREATE OR REPLACE TRIGGER "trigger_validate_sub_task_assignment" BEFORE INSERT OR UPDATE ON "public"."sub_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."validate_sub_task_assignment"();



CREATE OR REPLACE TRIGGER "trigger_validate_sub_workspace_member" BEFORE INSERT OR UPDATE ON "public"."sub_workspace_members" FOR EACH ROW EXECUTE FUNCTION "public"."validate_sub_workspace_member"();



CREATE OR REPLACE TRIGGER "trigger_validate_task_assignment" BEFORE INSERT OR UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."validate_task_assignment"();



CREATE OR REPLACE TRIGGER "update_approval_types_modtime" BEFORE UPDATE ON "public"."approval_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_assets_modtime" BEFORE UPDATE ON "public"."assets" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_departments_modtime" BEFORE UPDATE ON "public"."departments" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_designations_modtime" BEFORE UPDATE ON "public"."designations" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_issue_subtypes_modtime" BEFORE UPDATE ON "public"."issue_subtypes" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_issue_types_modtime" BEFORE UPDATE ON "public"."issue_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_priorities_modtime" BEFORE UPDATE ON "public"."priority_master" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_requirements_modtime" BEFORE UPDATE ON "public"."requirements" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_roles_modtime" BEFORE UPDATE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_sla_trackers_modtime" BEFORE UPDATE ON "public"."ticket_sla_trackers" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_software_modules_modtime" BEFORE UPDATE ON "public"."software_modules" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_software_submodules_modtime" BEFORE UPDATE ON "public"."software_submodules" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_software_systems_modtime" BEFORE UPDATE ON "public"."software_systems" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_task_types_modtime" BEFORE UPDATE ON "public"."task_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_ticket_categories_modtime" BEFORE UPDATE ON "public"."ticket_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_ticket_meetings_modtime" BEFORE UPDATE ON "public"."ticket_meetings" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_ticket_subcategories_modtime" BEFORE UPDATE ON "public"."ticket_subcategories" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_tickets_modtime" BEFORE UPDATE ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_user_profiles_modtime" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_workflow_states_modtime" BEFORE UPDATE ON "public"."status_master" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



ALTER TABLE ONLY "public"."activity_events"
    ADD CONSTRAINT "activity_events_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_scope_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."ticket_scopes"("id");



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."auth_session_logs"
    ADD CONSTRAINT "auth_session_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_master"("id");



ALTER TABLE ONLY "public"."company_master"
    ADD CONSTRAINT "company_master_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."company_master"
    ADD CONSTRAINT "company_master_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."configuration_audit_logs"
    ADD CONSTRAINT "configuration_audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."user_master"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."delivery_queue_critical"
    ADD CONSTRAINT "delivery_queue_critical_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."system_domain_events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."delivery_queue_digest"
    ADD CONSTRAINT "delivery_queue_digest_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."system_domain_events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."delivery_queue_normal"
    ADD CONSTRAINT "delivery_queue_normal_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."system_domain_events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."designations"
    ADD CONSTRAINT "designations_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."event_processing_registry"
    ADD CONSTRAINT "event_processing_registry_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."system_domain_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "fk_tickets_assignee" FOREIGN KEY ("assignee_id") REFERENCES "public"."user_master"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "fk_tickets_creator" FOREIGN KEY ("creator_id") REFERENCES "public"."user_master"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."user_master"
    ADD CONSTRAINT "fk_user_master_department" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_master"
    ADD CONSTRAINT "fk_user_master_designation" FOREIGN KEY ("designation_id") REFERENCES "public"."designations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_master"
    ADD CONSTRAINT "fk_user_master_role" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."issue_subtypes"
    ADD CONSTRAINT "issue_subtypes_issue_type_id_fkey" FOREIGN KEY ("issue_type_id") REFERENCES "public"."issue_types"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."issue_subtypes"
    ADD CONSTRAINT "issue_subtypes_scope_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."ticket_scopes"("id");



ALTER TABLE ONLY "public"."issue_types"
    ADD CONSTRAINT "issue_types_scope_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."ticket_scopes"("id");



ALTER TABLE ONLY "public"."priority_master"
    ADD CONSTRAINT "master_priorities_scope_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."ticket_scopes"("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_master"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_queue"
    ADD CONSTRAINT "notification_queue_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."user_master"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."priority_master"
    ADD CONSTRAINT "priority_master_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."requirement_approvals"
    ADD CONSTRAINT "requirement_approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."requirement_approvals"
    ADD CONSTRAINT "requirement_approvals_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."requirement_approvals"
    ADD CONSTRAINT "requirement_approvals_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."requirement_tasks"
    ADD CONSTRAINT "requirement_tasks_linked_by_fkey" FOREIGN KEY ("linked_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."requirement_tasks"
    ADD CONSTRAINT "requirement_tasks_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."requirement_tasks"
    ADD CONSTRAINT "requirement_tasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."requirement_versions"
    ADD CONSTRAINT "requirement_versions_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."requirement_watchers"
    ADD CONSTRAINT "requirement_watchers_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."requirement_watchers"
    ADD CONSTRAINT "requirement_watchers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."requirements"
    ADD CONSTRAINT "requirements_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."requirements"
    ADD CONSTRAINT "requirements_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "public"."status_master"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scope_master_mapping"
    ADD CONSTRAINT "scope_master_mapping_scope_id_fkey" FOREIGN KEY ("scope_id") REFERENCES "public"."ticket_scopes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."software_modules"
    ADD CONSTRAINT "software_modules_scope_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."ticket_scopes"("id");



ALTER TABLE ONLY "public"."software_modules"
    ADD CONSTRAINT "software_modules_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "public"."software_systems"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."software_submodules"
    ADD CONSTRAINT "software_submodules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."software_modules"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."software_submodules"
    ADD CONSTRAINT "software_submodules_scope_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."ticket_scopes"("id");



ALTER TABLE ONLY "public"."software_systems"
    ADD CONSTRAINT "software_systems_scope_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."ticket_scopes"("id");



ALTER TABLE ONLY "public"."status_master"
    ADD CONSTRAINT "status_master_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sub_tasks"
    ADD CONSTRAINT "sub_tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sub_tasks"
    ADD CONSTRAINT "sub_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sub_tasks"
    ADD CONSTRAINT "sub_tasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sub_workspace_members"
    ADD CONSTRAINT "sub_workspace_members_sub_workspace_id_fkey" FOREIGN KEY ("sub_workspace_id") REFERENCES "public"."sub_workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sub_workspace_members"
    ADD CONSTRAINT "sub_workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sub_workspaces"
    ADD CONSTRAINT "sub_workspaces_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sub_workspaces"
    ADD CONSTRAINT "sub_workspaces_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_domain_events"
    ADD CONSTRAINT "system_domain_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."user_master"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."task_activity_logs"
    ADD CONSTRAINT "task_activity_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."user_master"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."task_attachments"
    ADD CONSTRAINT "task_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user_master"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."task_chat_messages"
    ADD CONSTRAINT "task_chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_master"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."user_master"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_custom_fields_master"
    ADD CONSTRAINT "task_custom_fields_master_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."task_mentions"
    ADD CONSTRAINT "task_mentions_mentioned_user_id_fkey" FOREIGN KEY ("mentioned_user_id") REFERENCES "public"."user_master"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_mentions"
    ADD CONSTRAINT "task_mentions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."task_chat_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_notifications"
    ADD CONSTRAINT "task_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_master"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_watchers"
    ADD CONSTRAINT "task_watchers_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_watchers"
    ADD CONSTRAINT "task_watchers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_priority_id_fkey" FOREIGN KEY ("priority_id") REFERENCES "public"."priority_master"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "public"."status_master"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_sub_workspace_id_fkey" FOREIGN KEY ("sub_workspace_id") REFERENCES "public"."sub_workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_master"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_attachments"
    ADD CONSTRAINT "ticket_attachments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ticket_audit_logs"
    ADD CONSTRAINT "ticket_audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."user_master"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ticket_categories"
    ADD CONSTRAINT "ticket_categories_scope_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."ticket_scopes"("id");



ALTER TABLE ONLY "public"."ticket_comments"
    ADD CONSTRAINT "ticket_comments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ticket_requirements"
    ADD CONSTRAINT "ticket_requirements_linked_by_fkey" FOREIGN KEY ("linked_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ticket_requirements"
    ADD CONSTRAINT "ticket_requirements_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_requirements"
    ADD CONSTRAINT "ticket_requirements_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_sla_trackers"
    ADD CONSTRAINT "ticket_sla_trackers_sla_policy_id_fkey" FOREIGN KEY ("sla_policy_id") REFERENCES "public"."ticket_sla_policies"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ticket_sla_trackers"
    ADD CONSTRAINT "ticket_sla_trackers_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_subcategories"
    ADD CONSTRAINT "ticket_subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."ticket_categories"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ticket_subcategories"
    ADD CONSTRAINT "ticket_subcategories_scope_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."ticket_scopes"("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."ticket_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_issue_sub_type_id_fkey" FOREIGN KEY ("issue_sub_type_id") REFERENCES "public"."issue_subtypes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_issue_type_id_fkey" FOREIGN KEY ("issue_type_id") REFERENCES "public"."issue_types"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."software_modules"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_priority_id_fkey" FOREIGN KEY ("priority_id") REFERENCES "public"."priority_master"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_queue_owner_id_fkey" FOREIGN KEY ("queue_owner_id") REFERENCES "public"."user_master"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_software_system_id_fkey" FOREIGN KEY ("software_system_id") REFERENCES "public"."software_systems"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "public"."status_master"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_sub_category_id_fkey" FOREIGN KEY ("sub_category_id") REFERENCES "public"."ticket_subcategories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_sub_module_id_fkey" FOREIGN KEY ("sub_module_id") REFERENCES "public"."software_submodules"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_dashboard_preferences"
    ADD CONSTRAINT "user_dashboard_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_department_access"
    ADD CONSTRAINT "user_department_access_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."user_master"
    ADD CONSTRAINT "user_master_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_master"
    ADD CONSTRAINT "user_master_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."user_master"("id");



ALTER TABLE ONLY "public"."user_notification_summary"
    ADD CONSTRAINT "user_notification_summary_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_master"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_permissions_snapshot"
    ADD CONSTRAINT "user_permissions_snapshot_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_master"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "public"."designations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_reporting_manager_id_fkey" FOREIGN KEY ("reporting_manager_id") REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."status_master"
    ADD CONSTRAINT "workflow_states_scope_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."ticket_scopes"("id");



ALTER TABLE ONLY "public"."workflow_transition_departments"
    ADD CONSTRAINT "workflow_transition_departments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_transition_departments"
    ADD CONSTRAINT "workflow_transition_departments_transition_id_fkey" FOREIGN KEY ("transition_id") REFERENCES "public"."workflow_transitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_transition_logs"
    ADD CONSTRAINT "workflow_transition_logs_from_state_id_fkey" FOREIGN KEY ("from_state_id") REFERENCES "public"."status_master"("id");



ALTER TABLE ONLY "public"."workflow_transition_logs"
    ADD CONSTRAINT "workflow_transition_logs_to_state_id_fkey" FOREIGN KEY ("to_state_id") REFERENCES "public"."status_master"("id");



ALTER TABLE ONLY "public"."workflow_transition_master"
    ADD CONSTRAINT "workflow_transition_master_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."workflow_transition_master"
    ADD CONSTRAINT "workflow_transition_master_from_status_id_fkey" FOREIGN KEY ("from_status_id") REFERENCES "public"."status_master"("id");



ALTER TABLE ONLY "public"."workflow_transition_master"
    ADD CONSTRAINT "workflow_transition_master_to_status_id_fkey" FOREIGN KEY ("to_status_id") REFERENCES "public"."status_master"("id");



ALTER TABLE ONLY "public"."workflow_transition_roles"
    ADD CONSTRAINT "workflow_transition_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_transition_roles"
    ADD CONSTRAINT "workflow_transition_roles_transition_id_fkey" FOREIGN KEY ("transition_id") REFERENCES "public"."workflow_transitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_transitions"
    ADD CONSTRAINT "workflow_transitions_from_state_id_fkey" FOREIGN KEY ("from_state_id") REFERENCES "public"."status_master"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."workflow_transitions"
    ADD CONSTRAINT "workflow_transitions_to_state_id_fkey" FOREIGN KEY ("to_state_id") REFERENCES "public"."status_master"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."workload_snapshots"
    ADD CONSTRAINT "workload_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_master"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_teams"
    ADD CONSTRAINT "workspace_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_teams"
    ADD CONSTRAINT "workspace_teams_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company_master"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_parent_workspace_id_fkey" FOREIGN KEY ("parent_workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "public"."status_master"("id");



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_workspace_owner_id_fkey" FOREIGN KEY ("workspace_owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE "public"."configuration_audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dead_letter_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."delivery_queue_critical" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."delivery_queue_digest" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."delivery_queue_normal" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_processing_registry" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_event_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."provider_rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sub_tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sub_tasks_select" ON "public"."sub_tasks" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM ("public"."tasks" "t"
     JOIN "public"."workspace_members" "wm" ON (("t"."workspace_id" = "wm"."workspace_id")))
  WHERE (("t"."id" = "sub_tasks"."task_id") AND ("wm"."user_id" = "auth"."uid"())))) OR "public"."has_permission_snapshot"('SUPER_ADMIN'::"text")));



ALTER TABLE "public"."sub_workspace_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sub_workspace_members_visibility" ON "public"."sub_workspace_members" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM ("public"."sub_workspaces" "sw"
     JOIN "public"."workspace_members" "wm" ON (("sw"."workspace_id" = "wm"."workspace_id")))
  WHERE (("sw"."id" = "sub_workspace_members"."sub_workspace_id") AND ("wm"."user_id" = "auth"."uid"())))) OR "public"."has_permission_snapshot"('SUPER_ADMIN'::"text")));



ALTER TABLE "public"."sub_workspaces" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sub_workspaces_visibility" ON "public"."sub_workspaces" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."workspace_id" = "sub_workspaces"."workspace_id") AND ("workspace_members"."user_id" = "auth"."uid"())))) OR "public"."has_permission_snapshot"('SUPER_ADMIN'::"text")));



ALTER TABLE "public"."system_domain_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_email_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_governance_switches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tasks_select" ON "public"."tasks" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."workspace_id" = "tasks"."workspace_id") AND ("workspace_members"."user_id" = "auth"."uid"())))) OR "public"."has_permission_snapshot"('SUPER_ADMIN'::"text")));



ALTER TABLE "public"."tenant_delivery_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_notification_summary" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notification_queue";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."task_chat_messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."task_comments";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."task_notifications";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."user_master";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";






















































































































































GRANT ALL ON FUNCTION "public"."allow_self_profile_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."allow_self_profile_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."allow_self_profile_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access_record"("p_creator_id" "uuid", "p_assignee_id" "uuid", "p_department_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_record"("p_creator_id" "uuid", "p_assignee_id" "uuid", "p_department_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_record"("p_creator_id" "uuid", "p_assignee_id" "uuid", "p_department_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access_ticket"("p_creator_id" "uuid", "p_assignee_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_ticket"("p_creator_id" "uuid", "p_assignee_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_ticket"("p_creator_id" "uuid", "p_assignee_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_see_record"("p_creator_id" "uuid", "p_assignee_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_see_record"("p_creator_id" "uuid", "p_assignee_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_see_record"("p_creator_id" "uuid", "p_assignee_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_see_task"("p_task_id" "uuid", "p_creator_id" "uuid", "p_assignee_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_see_task"("p_task_id" "uuid", "p_creator_id" "uuid", "p_assignee_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_see_task"("p_task_id" "uuid", "p_creator_id" "uuid", "p_assignee_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_see_workspace"("p_workspace_id" "uuid", "p_owner_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_see_workspace"("p_workspace_id" "uuid", "p_owner_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_see_workspace"("p_workspace_id" "uuid", "p_owner_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_permission"("p_permission_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_permission"("p_permission_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_permission"("p_permission_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_user_permissions_snapshot"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_user_permissions_snapshot"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_user_permissions_snapshot"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_role_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_role_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_role_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."handle_new_user_deep_sync_v2"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_deep_sync_v2"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_deep_sync_v2"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_sync_v4"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_sync_v4"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_sync_v4"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_task_audit_and_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_task_audit_and_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_task_audit_and_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_ticket_lifecycle"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_ticket_lifecycle"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_ticket_lifecycle"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_department_access"("p_department_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_department_access"("p_department_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_department_access"("p_department_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_permission_snapshot"("p_permission_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_permission_snapshot"("p_permission_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_permission_snapshot"("p_permission_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_super_admin_safe"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_super_admin_safe"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_super_admin_safe"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_task_member"("p_task_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_task_member"("p_task_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_task_member"("p_task_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_workspace_member"("p_workspace_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_workspace_member"("p_workspace_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_workspace_member"("p_workspace_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_event_updates"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_event_updates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_event_updates"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rebuild_user_permissions_snapshot"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rebuild_user_permissions_snapshot"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rebuild_user_permissions_snapshot"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_single_user_permissions_snapshot"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_single_user_permissions_snapshot"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_single_user_permissions_snapshot"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_ups_on_dept_access_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_ups_on_dept_access_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_ups_on_dept_access_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_ups_on_role_perm_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_ups_on_role_perm_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_ups_on_role_perm_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_ups_on_team_member_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_ups_on_team_member_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_ups_on_team_member_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_ups_on_user_master_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_ups_on_user_master_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_ups_on_user_master_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_ups_on_user_role_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_ups_on_user_role_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_ups_on_user_role_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_ups_on_workspace_member_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_ups_on_workspace_member_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_ups_on_workspace_member_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_master_role_to_security"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_master_role_to_security"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_master_role_to_security"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_user_master_role_to_user_roles"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_master_role_to_user_roles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_master_role_to_user_roles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_user_role_to_auth"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_role_to_auth"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_role_to_auth"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tr_sync_notification_queue_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."tr_sync_notification_queue_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tr_sync_notification_queue_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_sub_task_assignment"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_sub_task_assignment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_sub_task_assignment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_sub_workspace_member"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_sub_workspace_member"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_sub_workspace_member"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_task_assignment"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_task_assignment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_task_assignment"() TO "service_role";


















GRANT ALL ON TABLE "public"."activity_events" TO "anon";
GRANT ALL ON TABLE "public"."activity_events" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_events" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_master" TO "anon";
GRANT ALL ON TABLE "public"."user_master" TO "authenticated";
GRANT ALL ON TABLE "public"."user_master" TO "service_role";



GRANT ALL ON TABLE "public"."admin_check_bypass" TO "anon";
GRANT ALL ON TABLE "public"."admin_check_bypass" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_check_bypass" TO "service_role";



GRANT ALL ON TABLE "public"."approval_types" TO "anon";
GRANT ALL ON TABLE "public"."approval_types" TO "authenticated";
GRANT ALL ON TABLE "public"."approval_types" TO "service_role";



GRANT ALL ON TABLE "public"."assets" TO "anon";
GRANT ALL ON TABLE "public"."assets" TO "authenticated";
GRANT ALL ON TABLE "public"."assets" TO "service_role";



GRANT ALL ON TABLE "public"."attachments" TO "anon";
GRANT ALL ON TABLE "public"."attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."attachments" TO "service_role";



GRANT ALL ON TABLE "public"."auth_session_logs" TO "anon";
GRANT ALL ON TABLE "public"."auth_session_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_session_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."companies_code_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."companies_code_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."companies_code_seq" TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."company_master" TO "anon";
GRANT ALL ON TABLE "public"."company_master" TO "authenticated";
GRANT ALL ON TABLE "public"."company_master" TO "service_role";



GRANT ALL ON TABLE "public"."configuration_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."configuration_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."configuration_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."custom_field_definitions" TO "anon";
GRANT ALL ON TABLE "public"."custom_field_definitions" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_field_definitions" TO "service_role";



GRANT ALL ON TABLE "public"."dead_letter_queue" TO "anon";
GRANT ALL ON TABLE "public"."dead_letter_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."dead_letter_queue" TO "service_role";



GRANT ALL ON TABLE "public"."delivery_queue_critical" TO "anon";
GRANT ALL ON TABLE "public"."delivery_queue_critical" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_queue_critical" TO "service_role";



GRANT ALL ON TABLE "public"."delivery_queue_digest" TO "anon";
GRANT ALL ON TABLE "public"."delivery_queue_digest" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_queue_digest" TO "service_role";



GRANT ALL ON TABLE "public"."delivery_queue_normal" TO "anon";
GRANT ALL ON TABLE "public"."delivery_queue_normal" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_queue_normal" TO "service_role";



GRANT ALL ON TABLE "public"."departments" TO "anon";
GRANT ALL ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";



GRANT ALL ON TABLE "public"."designations" TO "anon";
GRANT ALL ON TABLE "public"."designations" TO "authenticated";
GRANT ALL ON TABLE "public"."designations" TO "service_role";



GRANT ALL ON TABLE "public"."email_queue" TO "anon";
GRANT ALL ON TABLE "public"."email_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."email_queue" TO "service_role";



GRANT ALL ON TABLE "public"."email_templates" TO "anon";
GRANT ALL ON TABLE "public"."email_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."email_templates" TO "service_role";



GRANT ALL ON TABLE "public"."event_processing_registry" TO "anon";
GRANT ALL ON TABLE "public"."event_processing_registry" TO "authenticated";
GRANT ALL ON TABLE "public"."event_processing_registry" TO "service_role";



GRANT ALL ON TABLE "public"."event_queue" TO "anon";
GRANT ALL ON TABLE "public"."event_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."event_queue" TO "service_role";



GRANT ALL ON TABLE "public"."issue_subtypes" TO "anon";
GRANT ALL ON TABLE "public"."issue_subtypes" TO "authenticated";
GRANT ALL ON TABLE "public"."issue_subtypes" TO "service_role";



GRANT ALL ON TABLE "public"."issue_types" TO "anon";
GRANT ALL ON TABLE "public"."issue_types" TO "authenticated";
GRANT ALL ON TABLE "public"."issue_types" TO "service_role";



GRANT ALL ON TABLE "public"."master_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."master_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."master_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."notification_event_config" TO "anon";
GRANT ALL ON TABLE "public"."notification_event_config" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_event_config" TO "service_role";



GRANT ALL ON TABLE "public"."notification_history" TO "anon";
GRANT ALL ON TABLE "public"."notification_history" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_history" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."notification_queue" TO "anon";
GRANT ALL ON TABLE "public"."notification_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_queue" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."priority_master" TO "anon";
GRANT ALL ON TABLE "public"."priority_master" TO "authenticated";
GRANT ALL ON TABLE "public"."priority_master" TO "service_role";



GRANT ALL ON TABLE "public"."provider_rate_limits" TO "anon";
GRANT ALL ON TABLE "public"."provider_rate_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."provider_rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."requirement_approvals" TO "anon";
GRANT ALL ON TABLE "public"."requirement_approvals" TO "authenticated";
GRANT ALL ON TABLE "public"."requirement_approvals" TO "service_role";



GRANT ALL ON TABLE "public"."requirement_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."requirement_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."requirement_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."requirement_tasks" TO "anon";
GRANT ALL ON TABLE "public"."requirement_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."requirement_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."requirement_versions" TO "anon";
GRANT ALL ON TABLE "public"."requirement_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."requirement_versions" TO "service_role";



GRANT ALL ON TABLE "public"."requirement_watchers" TO "anon";
GRANT ALL ON TABLE "public"."requirement_watchers" TO "authenticated";
GRANT ALL ON TABLE "public"."requirement_watchers" TO "service_role";



GRANT ALL ON TABLE "public"."requirements" TO "anon";
GRANT ALL ON TABLE "public"."requirements" TO "authenticated";
GRANT ALL ON TABLE "public"."requirements" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."scope_master_mapping" TO "anon";
GRANT ALL ON TABLE "public"."scope_master_mapping" TO "authenticated";
GRANT ALL ON TABLE "public"."scope_master_mapping" TO "service_role";



GRANT ALL ON TABLE "public"."security_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."security_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."security_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."software_modules" TO "anon";
GRANT ALL ON TABLE "public"."software_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."software_modules" TO "service_role";



GRANT ALL ON TABLE "public"."software_submodules" TO "anon";
GRANT ALL ON TABLE "public"."software_submodules" TO "authenticated";
GRANT ALL ON TABLE "public"."software_submodules" TO "service_role";



GRANT ALL ON TABLE "public"."software_systems" TO "anon";
GRANT ALL ON TABLE "public"."software_systems" TO "authenticated";
GRANT ALL ON TABLE "public"."software_systems" TO "service_role";



GRANT ALL ON TABLE "public"."status_master" TO "anon";
GRANT ALL ON TABLE "public"."status_master" TO "authenticated";
GRANT ALL ON TABLE "public"."status_master" TO "service_role";



GRANT ALL ON TABLE "public"."sub_tasks" TO "anon";
GRANT ALL ON TABLE "public"."sub_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."sub_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."sub_workspace_members" TO "anon";
GRANT ALL ON TABLE "public"."sub_workspace_members" TO "authenticated";
GRANT ALL ON TABLE "public"."sub_workspace_members" TO "service_role";



GRANT ALL ON TABLE "public"."sub_workspaces" TO "anon";
GRANT ALL ON TABLE "public"."sub_workspaces" TO "authenticated";
GRANT ALL ON TABLE "public"."sub_workspaces" TO "service_role";



GRANT ALL ON TABLE "public"."system_domain_events" TO "anon";
GRANT ALL ON TABLE "public"."system_domain_events" TO "authenticated";
GRANT ALL ON TABLE "public"."system_domain_events" TO "service_role";



GRANT ALL ON TABLE "public"."system_email_config" TO "anon";
GRANT ALL ON TABLE "public"."system_email_config" TO "authenticated";
GRANT ALL ON TABLE "public"."system_email_config" TO "service_role";



GRANT ALL ON TABLE "public"."system_governance_switches" TO "anon";
GRANT ALL ON TABLE "public"."system_governance_switches" TO "authenticated";
GRANT ALL ON TABLE "public"."system_governance_switches" TO "service_role";



GRANT ALL ON TABLE "public"."task_activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."task_activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."task_activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."task_attachments" TO "anon";
GRANT ALL ON TABLE "public"."task_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."task_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."task_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."task_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."task_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."task_chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."task_chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."task_chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."task_checklists" TO "anon";
GRANT ALL ON TABLE "public"."task_checklists" TO "authenticated";
GRANT ALL ON TABLE "public"."task_checklists" TO "service_role";



GRANT ALL ON TABLE "public"."task_comments" TO "anon";
GRANT ALL ON TABLE "public"."task_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."task_comments" TO "service_role";



GRANT ALL ON TABLE "public"."task_custom_fields_master" TO "anon";
GRANT ALL ON TABLE "public"."task_custom_fields_master" TO "authenticated";
GRANT ALL ON TABLE "public"."task_custom_fields_master" TO "service_role";



GRANT ALL ON TABLE "public"."task_dependencies" TO "anon";
GRANT ALL ON TABLE "public"."task_dependencies" TO "authenticated";
GRANT ALL ON TABLE "public"."task_dependencies" TO "service_role";



GRANT ALL ON TABLE "public"."task_mentions" TO "anon";
GRANT ALL ON TABLE "public"."task_mentions" TO "authenticated";
GRANT ALL ON TABLE "public"."task_mentions" TO "service_role";



GRANT ALL ON TABLE "public"."task_milestones" TO "anon";
GRANT ALL ON TABLE "public"."task_milestones" TO "authenticated";
GRANT ALL ON TABLE "public"."task_milestones" TO "service_role";



GRANT ALL ON TABLE "public"."task_notifications" TO "anon";
GRANT ALL ON TABLE "public"."task_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."task_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."task_types" TO "anon";
GRANT ALL ON TABLE "public"."task_types" TO "authenticated";
GRANT ALL ON TABLE "public"."task_types" TO "service_role";



GRANT ALL ON TABLE "public"."task_watchers" TO "anon";
GRANT ALL ON TABLE "public"."task_watchers" TO "authenticated";
GRANT ALL ON TABLE "public"."task_watchers" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_delivery_limits" TO "anon";
GRANT ALL ON TABLE "public"."tenant_delivery_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_delivery_limits" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_activity_stream" TO "anon";
GRANT ALL ON TABLE "public"."ticket_activity_stream" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_activity_stream" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_attachments" TO "anon";
GRANT ALL ON TABLE "public"."ticket_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."ticket_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_categories" TO "anon";
GRANT ALL ON TABLE "public"."ticket_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_categories" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_chats" TO "anon";
GRANT ALL ON TABLE "public"."ticket_chats" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_chats" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_comments" TO "anon";
GRANT ALL ON TABLE "public"."ticket_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_comments" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_meetings" TO "anon";
GRANT ALL ON TABLE "public"."ticket_meetings" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_meetings" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_requirements" TO "anon";
GRANT ALL ON TABLE "public"."ticket_requirements" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_requirements" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_scopes" TO "anon";
GRANT ALL ON TABLE "public"."ticket_scopes" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_scopes" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_sla_policies" TO "anon";
GRANT ALL ON TABLE "public"."ticket_sla_policies" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_sla_policies" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_sla_trackers" TO "anon";
GRANT ALL ON TABLE "public"."ticket_sla_trackers" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_sla_trackers" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_subcategories" TO "anon";
GRANT ALL ON TABLE "public"."ticket_subcategories" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_subcategories" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_watchers" TO "anon";
GRANT ALL ON TABLE "public"."ticket_watchers" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_watchers" TO "service_role";



GRANT ALL ON TABLE "public"."tickets" TO "anon";
GRANT ALL ON TABLE "public"."tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets" TO "service_role";



GRANT ALL ON TABLE "public"."user_dashboard_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_dashboard_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_dashboard_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_department_access" TO "anon";
GRANT ALL ON TABLE "public"."user_department_access" TO "authenticated";
GRANT ALL ON TABLE "public"."user_department_access" TO "service_role";



GRANT ALL ON TABLE "public"."user_identity_view" TO "anon";
GRANT ALL ON TABLE "public"."user_identity_view" TO "authenticated";
GRANT ALL ON TABLE "public"."user_identity_view" TO "service_role";



GRANT ALL ON TABLE "public"."user_master_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."user_master_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."user_master_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."user_notification_summary" TO "anon";
GRANT ALL ON TABLE "public"."user_notification_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notification_summary" TO "service_role";



GRANT ALL ON TABLE "public"."user_permissions_snapshot" TO "anon";
GRANT ALL ON TABLE "public"."user_permissions_snapshot" TO "authenticated";
GRANT ALL ON TABLE "public"."user_permissions_snapshot" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."vw_reports_activity_summary" TO "anon";
GRANT ALL ON TABLE "public"."vw_reports_activity_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_reports_activity_summary" TO "service_role";



GRANT ALL ON TABLE "public"."vw_reports_assigned_to_me" TO "anon";
GRANT ALL ON TABLE "public"."vw_reports_assigned_to_me" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_reports_assigned_to_me" TO "service_role";



GRANT ALL ON TABLE "public"."vw_reports_completed_tasks" TO "anon";
GRANT ALL ON TABLE "public"."vw_reports_completed_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_reports_completed_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."vw_reports_created_by_me" TO "anon";
GRANT ALL ON TABLE "public"."vw_reports_created_by_me" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_reports_created_by_me" TO "service_role";



GRANT ALL ON TABLE "public"."vw_reports_due_this_month" TO "anon";
GRANT ALL ON TABLE "public"."vw_reports_due_this_month" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_reports_due_this_month" TO "service_role";



GRANT ALL ON TABLE "public"."vw_reports_due_this_week" TO "anon";
GRANT ALL ON TABLE "public"."vw_reports_due_this_week" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_reports_due_this_week" TO "service_role";



GRANT ALL ON TABLE "public"."vw_reports_due_today" TO "anon";
GRANT ALL ON TABLE "public"."vw_reports_due_today" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_reports_due_today" TO "service_role";



GRANT ALL ON TABLE "public"."vw_reports_in_progress_tasks" TO "anon";
GRANT ALL ON TABLE "public"."vw_reports_in_progress_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_reports_in_progress_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."vw_reports_open_tasks" TO "anon";
GRANT ALL ON TABLE "public"."vw_reports_open_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_reports_open_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."vw_reports_overdue_tasks" TO "anon";
GRANT ALL ON TABLE "public"."vw_reports_overdue_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_reports_overdue_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."vw_reports_sla_breached" TO "anon";
GRANT ALL ON TABLE "public"."vw_reports_sla_breached" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_reports_sla_breached" TO "service_role";



GRANT ALL ON TABLE "public"."vw_reports_sub_task_owner_wise" TO "anon";
GRANT ALL ON TABLE "public"."vw_reports_sub_task_owner_wise" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_reports_sub_task_owner_wise" TO "service_role";



GRANT ALL ON TABLE "public"."vw_reports_sub_workspace_productivity" TO "anon";
GRANT ALL ON TABLE "public"."vw_reports_sub_workspace_productivity" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_reports_sub_workspace_productivity" TO "service_role";



GRANT ALL ON TABLE "public"."vw_reports_sub_workspace_wise" TO "anon";
GRANT ALL ON TABLE "public"."vw_reports_sub_workspace_wise" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_reports_sub_workspace_wise" TO "service_role";



GRANT ALL ON TABLE "public"."vw_reports_task_owner_wise" TO "anon";
GRANT ALL ON TABLE "public"."vw_reports_task_owner_wise" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_reports_task_owner_wise" TO "service_role";



GRANT ALL ON TABLE "public"."vw_reports_user_productivity" TO "anon";
GRANT ALL ON TABLE "public"."vw_reports_user_productivity" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_reports_user_productivity" TO "service_role";



GRANT ALL ON TABLE "public"."workspaces" TO "anon";
GRANT ALL ON TABLE "public"."workspaces" TO "authenticated";
GRANT ALL ON TABLE "public"."workspaces" TO "service_role";



GRANT ALL ON TABLE "public"."vw_reports_workspace_productivity" TO "anon";
GRANT ALL ON TABLE "public"."vw_reports_workspace_productivity" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_reports_workspace_productivity" TO "service_role";



GRANT ALL ON TABLE "public"."vw_reports_workspace_wise" TO "anon";
GRANT ALL ON TABLE "public"."vw_reports_workspace_wise" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_reports_workspace_wise" TO "service_role";



GRANT ALL ON TABLE "public"."vw_user_roles" TO "anon";
GRANT ALL ON TABLE "public"."vw_user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."websocket_queue" TO "anon";
GRANT ALL ON TABLE "public"."websocket_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."websocket_queue" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_states" TO "anon";
GRANT ALL ON TABLE "public"."workflow_states" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_states" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_transition_departments" TO "anon";
GRANT ALL ON TABLE "public"."workflow_transition_departments" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_transition_departments" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_transition_logs" TO "anon";
GRANT ALL ON TABLE "public"."workflow_transition_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_transition_logs" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_transition_master" TO "anon";
GRANT ALL ON TABLE "public"."workflow_transition_master" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_transition_master" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_transition_roles" TO "anon";
GRANT ALL ON TABLE "public"."workflow_transition_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_transition_roles" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_transitions" TO "anon";
GRANT ALL ON TABLE "public"."workflow_transitions" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_transitions" TO "service_role";



GRANT ALL ON TABLE "public"."workload_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."workload_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."workload_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."workspace_members" TO "anon";
GRANT ALL ON TABLE "public"."workspace_members" TO "authenticated";
GRANT ALL ON TABLE "public"."workspace_members" TO "service_role";



GRANT ALL ON SEQUENCE "public"."workspace_tasks_code_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."workspace_tasks_code_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."workspace_tasks_code_seq" TO "service_role";



GRANT ALL ON TABLE "public"."workspace_teams" TO "anon";
GRANT ALL ON TABLE "public"."workspace_teams" TO "authenticated";
GRANT ALL ON TABLE "public"."workspace_teams" TO "service_role";



GRANT ALL ON SEQUENCE "public"."workspaces_code_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."workspaces_code_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."workspaces_code_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































