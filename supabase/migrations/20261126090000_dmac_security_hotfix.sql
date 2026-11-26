-- DMAC / Design Tracking / DMS security hotfix
--
-- 20261010200000_ensure_dms_tables.sql and 20261010204500_dms_folder_permissions.sql added
-- "FOR ALL USING (true)" policies and GRANT ALL to anon on DMS tables. Policies are OR'd, so those
-- cancelled the deny-by-default policies from 20261008000000_dmac_enterprise_core.sql and let anyone
-- holding the public anon key read, change or delete DMS records and the audit log.
-- 20261010190000_design_tracking_full_crud_schema.sql gave every signed-in user full write access to
-- the design_* tables, bypassing the Design access checks in the server actions.
--
-- After this migration the browser keys (anon, authenticated) cannot touch dms_*, dmac_* or the
-- design_* data tables at all. All access goes through server actions, which run requireDesign()
-- (lib/permissions/design-guard.ts) and then use the service-role client.

-- 1. Remove the open policies
DROP POLICY IF EXISTS "dms_workspaces_public_read" ON public.dms_workspaces;
DROP POLICY IF EXISTS "dms_folders_public_all" ON public.dms_folders;
DROP POLICY IF EXISTS "dms_doc_types_public_all" ON public.dms_doc_types;
DROP POLICY IF EXISTS "dms_documents_public_all" ON public.dms_documents;
DROP POLICY IF EXISTS "dms_audit_logs_public_all" ON public.dms_audit_logs;
DROP POLICY IF EXISTS "dms_folder_permissions_public_all" ON public.dms_folder_permissions;

DO $$
DECLARE
    tbl text;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'design_projects', 'design_towers', 'design_packages', 'design_sub_packages',
        'design_consultants', 'design_statutory_authorities', 'design_statutory_clearances',
        'design_matrix_entries', 'design_look_aheads', 'design_drawings',
        'design_drawing_revisions', 'design_transmittals', 'design_rfis', 'design_matrix_audit_logs'
    ]
    LOOP
        IF to_regclass('public.' || tbl) IS NOT NULL THEN
            EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated full access to %I" ON public.%I', tbl, tbl);
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
            EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', tbl);
            EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl);
        END IF;
    END LOOP;
END $$;

-- 2. Lock every dms_* and dmac_* table (including audit partitions) to the service role
DO $$
DECLARE
    t record;
BEGIN
    FOR t IN
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind IN ('r', 'p')
          AND (c.relname LIKE 'dms\_%' OR c.relname LIKE 'dmac\_%')
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.relname);
        EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t.relname);
        EXECUTE format('GRANT ALL ON public.%I TO service_role', t.relname);
    END LOOP;

    -- Views over these tables (e.g. v_dmac_drawings_live_status) must not be readable either
    FOR t IN
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind IN ('v', 'm')
          AND (c.relname LIKE 'v\_dmac\_%' OR c.relname LIKE 'v\_dms\_%')
    LOOP
        EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t.relname);
    END LOOP;
END $$;

-- 3. Audit logs are append-only, even for the service role: no TRUNCATE
REVOKE TRUNCATE ON public.dms_audit_logs FROM service_role;
DO $$
DECLARE
    t record;
BEGIN
    FOR t IN
        SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relname LIKE 'dms\_audit\_logs\_%'
    LOOP
        EXECUTE format('REVOKE UPDATE, DELETE, TRUNCATE ON public.%I FROM service_role', t.relname);
    END LOOP;
END $$;

-- design_matrix_audit_logs: block edits and deletes the same way as dms_audit_logs
CREATE OR REPLACE FUNCTION public.trg_design_audit_immutable()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Audit log entries cannot be changed or deleted.';
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF to_regclass('public.design_matrix_audit_logs') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trg_design_matrix_audit_immutable ON public.design_matrix_audit_logs;
        CREATE TRIGGER trg_design_matrix_audit_immutable
            BEFORE UPDATE OR DELETE ON public.design_matrix_audit_logs
            FOR EACH ROW EXECUTE FUNCTION public.trg_design_audit_immutable();
        REVOKE TRUNCATE ON public.design_matrix_audit_logs FROM service_role;
    END IF;
END $$;
