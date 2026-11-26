-- ==============================================================================
-- DMAC step 3a: DMS core. Six-layer permissions, versions, check-out, recycle bin,
-- purge and the QC gate, enforced in the database.
--
-- The six layers, checked in this order for every folder and document:
--   1. Workspace     if a workspace lists members, only active members inside their
--                    access window get in (no members listed = everyone with Design access)
--   2. Module rights dms_group_rights (module_code 'DMS') for the person's groups;
--                    with no group rights the person's Design capabilities apply
--   3. Folder        grants in dms_folder_permissions (user, group or Design role),
--                    inherited down the tree until a folder stops inheriting
--   4. Document type dms_doc_type_permissions for the person's groups, including
--                    "private view" (see only the documents you added)
--   5. Field         dms_field_visibility hides fields from groups
--   6. Document      a document waiting for QC (or rejected) is seen only by the person
--                    who added it and by QC approvers; deleted documents only in the bin
-- Design administrators (and Super Admin) pass every layer.
--
-- The app passes the person's Design capabilities as p_base jsonb:
--   {"admin": bool, "view": bool, "create": bool, "modify": bool, "delete": bool,
--    "purge": bool, "export": bool, "qc": bool}
-- All write functions run as the service role only; they re-check rights themselves.
-- ==============================================================================

-- ---------- schema additions ----------
ALTER TABLE public.dms_folder_permissions
    ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.dms_groups(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_dms_folder_perms_group ON public.dms_folder_permissions (group_id);

-- Grants made in the older dms_folder_access table carry over once
INSERT INTO public.dms_folder_permissions (folder_id, user_id, group_id, can_view, can_upload, can_download, can_delete, can_manage)
SELECT a.folder_id, a.user_id, a.group_id, NOT coalesce(a.is_hidden, false),
       coalesce(a.can_upload, false) OR coalesce(a.can_edit, false), coalesce(a.can_download, false),
       coalesce(a.can_delete, false), false
FROM public.dms_folder_access a
WHERE NOT EXISTS (
    SELECT 1 FROM public.dms_folder_permissions p
    WHERE p.folder_id = a.folder_id
      AND p.user_id IS NOT DISTINCT FROM a.user_id
      AND p.group_id IS NOT DISTINCT FROM a.group_id
);

ALTER TABLE public.dms_documents ADD COLUMN IF NOT EXISTS deleted_by UUID;
ALTER TABLE public.dms_documents ADD COLUMN IF NOT EXISTS purged_at TIMESTAMPTZ;
ALTER TABLE public.dms_document_versions ADD COLUMN IF NOT EXISTS change_note TEXT;
ALTER TABLE public.dms_recycle_bin ADD COLUMN IF NOT EXISTS restored_at TIMESTAMPTZ;
ALTER TABLE public.dms_recycle_bin ADD COLUMN IF NOT EXISTS restored_by UUID;

CREATE INDEX IF NOT EXISTS idx_dms_documents_deleted ON public.dms_documents (deleted_at);
CREATE INDEX IF NOT EXISTS idx_dms_recycle_open ON public.dms_recycle_bin (workspace_id, deleted_at DESC)
    WHERE is_purged = false AND restored_at IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_dms_doc_approval_status') THEN
        UPDATE public.dms_documents SET approval_status = 'PENDING'
        WHERE approval_status IS NULL OR approval_status NOT IN ('PENDING', 'APPROVED', 'REJECTED');
        ALTER TABLE public.dms_documents
            ADD CONSTRAINT chk_dms_doc_approval_status CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED'));
    END IF;
END $$;

-- Private bucket for DMS files (path dms/<workspace>/<folder>/<document>/...)
DO $$
BEGIN
    IF to_regclass('storage.buckets') IS NOT NULL THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit)
        VALUES ('dms-documents', 'dms-documents', false, 52428800)
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- ---------- helpers ----------
CREATE OR REPLACE FUNCTION public.fn_dms_no_rights()
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
    SELECT jsonb_build_object('admin', false, 'view', false, 'upload', false, 'edit', false, 'download', false,
                              'print', false, 'email', false, 'delete', false, 'manage', false, 'purge', false,
                              'export', false, 'qc', false)
$$;

CREATE OR REPLACE FUNCTION public.fn_dms_all_rights()
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
    SELECT jsonb_build_object('admin', true, 'view', true, 'upload', true, 'edit', true, 'download', true,
                              'print', true, 'email', true, 'delete', true, 'manage', true, 'purge', true,
                              'export', true, 'qc', true, 'create_folder', true)
$$;

CREATE OR REPLACE FUNCTION public.fn_dms_flag(p jsonb, k text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT coalesce((p ->> k)::boolean, false) $$;

CREATE OR REPLACE FUNCTION public.fn_dms_user_groups(p_user UUID, p_workspace UUID)
RETURNS UUID[] LANGUAGE sql STABLE AS $$
    SELECT coalesce(array_agg(m.group_id), '{}')
    FROM public.dms_group_members m
    JOIN public.dms_groups g ON g.id = m.group_id AND g.deleted_at IS NULL
    WHERE m.user_id = p_user AND (p_workspace IS NULL OR g.workspace_id = p_workspace)
$$;

CREATE OR REPLACE FUNCTION public.fn_dms_audit(p_actor UUID, p_action TEXT, p_entity_type TEXT, p_entity_id UUID, p_details JSONB)
RETURNS void LANGUAGE sql AS $$
    INSERT INTO public.dms_audit_logs (actor_id, actor_email, action, entity_type, entity_id, details)
    VALUES (p_actor, (SELECT email FROM auth.users WHERE id = p_actor), p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'::jsonb))
$$;

-- ---------- layers 1 and 2: workspace and module rights ----------
CREATE OR REPLACE FUNCTION public.fn_dms_workspace_rights(p_user UUID, p_workspace UUID, p_base JSONB)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_groups UUID[];
    r RECORD;
BEGIN
    IF public.fn_dms_flag(p_base, 'admin') THEN RETURN public.fn_dms_all_rights(); END IF;
    IF NOT EXISTS (SELECT 1 FROM public.dms_workspaces w WHERE w.id = p_workspace AND coalesce(w.is_active, true) AND w.deleted_at IS NULL) THEN
        RETURN public.fn_dms_no_rights();
    END IF;

    IF EXISTS (SELECT 1 FROM public.dms_workspace_members WHERE workspace_id = p_workspace)
       AND NOT EXISTS (
           SELECT 1 FROM public.dms_workspace_members
           WHERE workspace_id = p_workspace AND user_id = p_user AND coalesce(is_active, true)
             AND (access_start_at IS NULL OR access_start_at <= now())
             AND (access_end_at IS NULL OR access_end_at > now())
       ) THEN
        RETURN public.fn_dms_no_rights();
    END IF;

    v_groups := public.fn_dms_user_groups(p_user, p_workspace);
    SELECT count(*) AS n, bool_or(can_view) AS v, bool_or(can_create) AS c, bool_or(can_modify) AS m,
           bool_or(can_delete) AS d, bool_or(can_purge) AS p, bool_or(can_export) AS e
    INTO r
    FROM public.dms_group_rights
    WHERE group_id = ANY (v_groups) AND upper(module_code) = 'DMS';

    IF r.n = 0 THEN
        RETURN public.fn_dms_no_rights() || jsonb_build_object(
            'view', public.fn_dms_flag(p_base, 'view'), 'upload', public.fn_dms_flag(p_base, 'create'),
            'edit', public.fn_dms_flag(p_base, 'modify'), 'download', public.fn_dms_flag(p_base, 'view'),
            'print', public.fn_dms_flag(p_base, 'view'), 'email', public.fn_dms_flag(p_base, 'export'),
            'delete', public.fn_dms_flag(p_base, 'delete'), 'purge', public.fn_dms_flag(p_base, 'purge'),
            'export', public.fn_dms_flag(p_base, 'export'), 'qc', public.fn_dms_flag(p_base, 'qc'));
    END IF;

    RETURN public.fn_dms_no_rights() || jsonb_build_object(
        'view', coalesce(r.v, false), 'upload', coalesce(r.v and r.c, false), 'edit', coalesce(r.v and r.m, false),
        'download', coalesce(r.v, false), 'print', coalesce(r.v, false), 'email', coalesce(r.v and r.e, false),
        'delete', coalesce(r.v and r.d, false), 'purge', coalesce(r.v and r.p, false),
        'export', coalesce(r.v and r.e, false), 'qc', public.fn_dms_flag(p_base, 'qc'));
END $$;

-- ---------- layer 3: folder grants with inheritance ----------
CREATE OR REPLACE FUNCTION public.fn_dms_folder_rights(p_user UUID, p_folder UUID, p_base JSONB)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE
    f RECORD;
    ws jsonb;
    v_chain UUID[];
    v_restricted boolean;
    v_groups UUID[];
    v_role TEXT;
    v_email TEXT;
    g_v boolean := false;
    g_u boolean := false;
    g_d boolean := false;
    g_x boolean := false;
    g_m boolean := false;
    v_open boolean;
BEGIN
    SELECT id, workspace_id, path, deleted_at INTO f FROM public.dms_folders WHERE id = p_folder;
    IF NOT FOUND OR f.deleted_at IS NOT NULL THEN RETURN public.fn_dms_no_rights(); END IF;

    ws := public.fn_dms_workspace_rights(p_user, f.workspace_id, p_base);
    IF public.fn_dms_flag(ws, 'admin') THEN RETURN ws; END IF;
    IF NOT public.fn_dms_flag(ws, 'view') THEN RETURN public.fn_dms_no_rights(); END IF;

    -- This folder and its ancestors, nearest first, up to and including the first that stops inheriting
    WITH anc AS (
        SELECT a.id, a.inherit_permissions, nlevel(a.path) AS lvl
        FROM public.dms_folders a
        WHERE a.workspace_id = f.workspace_id AND a.path @> f.path AND a.deleted_at IS NULL
    ), cut AS (
        SELECT max(lvl) AS lvl FROM anc WHERE inherit_permissions = false
    )
    SELECT array_agg(anc.id), bool_or(anc.inherit_permissions = false)
    INTO v_chain, v_restricted
    FROM anc, cut
    WHERE cut.lvl IS NULL OR anc.lvl >= cut.lvl;

    v_restricted := coalesce(v_restricted, false)
        OR EXISTS (SELECT 1 FROM public.dms_folder_permissions WHERE folder_id = ANY (v_chain));

    IF NOT v_restricted THEN
        v_open := true;
    ELSE
        v_open := false;
        v_groups := public.fn_dms_user_groups(p_user, f.workspace_id);
        SELECT upper(design_role) INTO v_role FROM public.design_user_access WHERE user_id = p_user;
        SELECT lower(email) INTO v_email FROM auth.users WHERE id = p_user;
        SELECT coalesce(bool_or(can_view), false), coalesce(bool_or(can_upload), false), coalesce(bool_or(can_download), false),
               coalesce(bool_or(can_delete), false), coalesce(bool_or(can_manage), false)
        INTO g_v, g_u, g_d, g_x, g_m
        FROM public.dms_folder_permissions
        WHERE folder_id = ANY (v_chain)
          AND (user_id = p_user
               OR group_id = ANY (v_groups)
               OR (user_id IS NULL AND group_id IS NULL AND user_email IS NOT NULL AND lower(user_email) = v_email)
               OR (user_id IS NULL AND group_id IS NULL AND user_email IS NULL AND role_code IS NOT NULL AND upper(role_code) = v_role));
        IF NOT g_v THEN RETURN public.fn_dms_no_rights(); END IF;
    END IF;

    RETURN ws || jsonb_build_object(
        'upload',   public.fn_dms_flag(ws, 'upload')   AND (v_open OR g_u OR g_m),
        'edit',     public.fn_dms_flag(ws, 'edit')     AND (v_open OR g_u OR g_m),
        'download', public.fn_dms_flag(ws, 'download') AND (v_open OR g_d),
        'print',    public.fn_dms_flag(ws, 'print')    AND (v_open OR g_d),
        'email',    public.fn_dms_flag(ws, 'email')    AND (v_open OR g_d),
        'delete',   public.fn_dms_flag(ws, 'delete')   AND (v_open OR g_x OR g_m),
        'manage',   NOT v_open AND g_m,
        'create_folder', (NOT v_open AND g_m) OR public.fn_dms_flag(p_base, 'masters'),
        'restricted', v_restricted);
END $$;

-- Rights on every folder of a workspace in one call (for the tree)
CREATE OR REPLACE FUNCTION public.fn_dms_folder_rights_all(p_user UUID, p_workspace UUID, p_base JSONB)
RETURNS TABLE (folder_id UUID, rights JSONB) LANGUAGE sql STABLE AS $$
    SELECT f.id, public.fn_dms_folder_rights(p_user, f.id, p_base)
    FROM public.dms_folders f
    WHERE f.deleted_at IS NULL AND (p_workspace IS NULL OR f.workspace_id = p_workspace)
$$;

-- ---------- layers 4 and 6: document type and the document itself ----------
CREATE OR REPLACE FUNCTION public.fn_dms_document_rights(p_user UUID, p_document UUID, p_base JSONB)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE
    d RECORD;
    fr jsonb;
    t RECORD;
    v_own boolean;
BEGIN
    SELECT id, folder_id, workspace_id, doc_type_id, created_by, approval_status, deleted_at, purged_at
    INTO d FROM public.dms_documents WHERE id = p_document;
    IF NOT FOUND OR d.purged_at IS NOT NULL THEN RETURN public.fn_dms_no_rights(); END IF;

    fr := public.fn_dms_folder_rights(p_user, d.folder_id, p_base);
    IF d.deleted_at IS NOT NULL THEN
        -- Deleted: only the recycle bin actions, for people who could delete here (or purge)
        RETURN public.fn_dms_no_rights() || jsonb_build_object(
            'deleted', true,
            'restore', public.fn_dms_flag(fr, 'delete') OR public.fn_dms_flag(fr, 'admin'),
            'purge', public.fn_dms_flag(fr, 'purge'));
    END IF;
    IF public.fn_dms_flag(fr, 'admin') THEN RETURN fr || jsonb_build_object('deleted', false); END IF;
    IF NOT public.fn_dms_flag(fr, 'view') THEN RETURN public.fn_dms_no_rights(); END IF;

    v_own := d.created_by IS NOT DISTINCT FROM p_user;

    SELECT count(*) AS n, bool_or(can_view) AS v, bool_or(can_add) AS a, bool_or(can_edit_fields) AS e,
           bool_or(can_download) AS dl, bool_or(can_print) AS pr, bool_or(can_email) AS em,
           bool_or(can_delete) AS x, bool_and(coalesce(is_private_view, false)) AS priv
    INTO t
    FROM public.dms_doc_type_permissions
    WHERE doc_type_id = d.doc_type_id AND group_id = ANY (public.fn_dms_user_groups(p_user, d.workspace_id));

    IF t.n > 0 THEN
        IF NOT coalesce(t.v, false) THEN RETURN public.fn_dms_no_rights(); END IF;
        IF coalesce(t.priv, false) AND NOT v_own THEN RETURN public.fn_dms_no_rights(); END IF;
        fr := fr || jsonb_build_object(
            'upload',   public.fn_dms_flag(fr, 'upload')   AND coalesce(t.a, false),
            'edit',     public.fn_dms_flag(fr, 'edit')     AND coalesce(t.e, false),
            'download', public.fn_dms_flag(fr, 'download') AND coalesce(t.dl, false),
            'print',    public.fn_dms_flag(fr, 'print')    AND coalesce(t.pr, false),
            'email',    public.fn_dms_flag(fr, 'email')    AND coalesce(t.em, false),
            'delete',   public.fn_dms_flag(fr, 'delete')   AND coalesce(t.x, false));
    END IF;

    -- Layer 6: until QC approves it, a document is for its uploader and the QC approvers only
    IF d.approval_status <> 'APPROVED' AND NOT v_own AND NOT public.fn_dms_flag(fr, 'qc') THEN
        RETURN public.fn_dms_no_rights();
    END IF;

    RETURN fr || jsonb_build_object('deleted', false, 'own', v_own);
END $$;

-- Rights for a page of documents in one call (for lists and search)
CREATE OR REPLACE FUNCTION public.fn_dms_document_rights_many(p_user UUID, p_documents UUID[], p_base JSONB)
RETURNS TABLE (document_id UUID, rights JSONB) LANGUAGE sql STABLE AS $$
    SELECT x, public.fn_dms_document_rights(p_user, x, p_base) FROM unnest(p_documents) AS x
$$;

-- ---------- layer 5: fields hidden from the person's groups ----------
CREATE OR REPLACE FUNCTION public.fn_dms_hidden_fields(p_user UUID, p_workspace UUID, p_base JSONB)
RETURNS UUID[] LANGUAGE sql STABLE AS $$
    SELECT CASE WHEN public.fn_dms_flag(p_base, 'admin') THEN '{}'::UUID[] ELSE coalesce((
        SELECT array_agg(field_definition_id)
        FROM (
            SELECT field_definition_id
            FROM public.dms_field_visibility
            WHERE group_id = ANY (public.fn_dms_user_groups(p_user, p_workspace))
            GROUP BY field_definition_id
            HAVING NOT bool_or(coalesce(show_in_list, true))
        ) h
    ), '{}'::UUID[]) END
$$;

-- ---------- writes ----------
CREATE OR REPLACE FUNCTION public.fn_dms_raise_unless(p_ok boolean, p_message TEXT)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    IF NOT coalesce(p_ok, false) THEN RAISE EXCEPTION '%', p_message USING ERRCODE = 'P0001'; END IF;
END $$;

-- Values for one document's custom fields, keyed by field definition id. Checks each value's type;
-- required fields are enforced for folders that have field groups linked to them.
CREATE OR REPLACE FUNCTION public.fn_dms_write_field_values(p_document UUID, p_folder UUID, p_values JSONB)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    fd RECORD;
    v jsonb;
    v_txt TEXT;
    v_linked boolean;
BEGIN
    v_linked := EXISTS (SELECT 1 FROM public.dms_folder_field_groups WHERE folder_id = p_folder);
    FOR fd IN
        SELECT d.* FROM public.dms_field_definitions d
        WHERE d.deleted_at IS NULL
          AND (NOT v_linked OR d.field_group_id IN (SELECT field_group_id FROM public.dms_folder_field_groups WHERE folder_id = p_folder))
    LOOP
        v := p_values -> fd.id::text;
        v_txt := nullif(trim(coalesce(v #>> '{}', '')), '');
        IF v_txt IS NULL THEN
            IF fd.is_required AND v_linked THEN RAISE EXCEPTION '"%" is required.', fd.field_label USING ERRCODE = 'P0001'; END IF;
            DELETE FROM public.dms_field_values WHERE document_id = p_document AND field_definition_id = fd.id;
            CONTINUE;
        END IF;
        IF upper(fd.data_type) = 'NUMBER' AND v_txt !~ '^-?[0-9]+(\.[0-9]+)?$' THEN
            RAISE EXCEPTION '"%" must be a number.', fd.field_label USING ERRCODE = 'P0001';
        ELSIF upper(fd.data_type) = 'DATE' AND v_txt !~ '^\d{4}-\d{2}-\d{2}$' THEN
            RAISE EXCEPTION '"%" must be a date.', fd.field_label USING ERRCODE = 'P0001';
        ELSIF upper(fd.data_type) = 'DROPDOWN' AND jsonb_array_length(coalesce(fd.dropdown_options, '[]'::jsonb)) > 0
              AND NOT (fd.dropdown_options ? v_txt) THEN
            RAISE EXCEPTION '"%" must be one of the listed options.', fd.field_label USING ERRCODE = 'P0001';
        END IF;
        INSERT INTO public.dms_field_values (document_id, field_definition_id, text_value, number_value, date_value, json_value)
        VALUES (p_document, fd.id,
                CASE WHEN upper(fd.data_type) IN ('TEXT', 'DROPDOWN') THEN v_txt END,
                CASE WHEN upper(fd.data_type) = 'NUMBER' THEN v_txt::numeric END,
                CASE WHEN upper(fd.data_type) = 'DATE' THEN v_txt::date END,
                CASE WHEN upper(fd.data_type) = 'BOOLEAN' THEN to_jsonb(v_txt IN ('true', '1', 'yes', 'Yes')) END)
        ON CONFLICT (document_id, field_definition_id) DO UPDATE
            SET text_value = EXCLUDED.text_value, number_value = EXCLUDED.number_value,
                date_value = EXCLUDED.date_value, json_value = EXCLUDED.json_value;
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.fn_dms_create_document(
    p_actor UUID, p_base JSONB, p_folder UUID, p_doc_type UUID, p_title TEXT,
    p_storage_key TEXT, p_file_name TEXT, p_size BIGINT, p_checksum TEXT, p_mime TEXT,
    p_ocr_text TEXT, p_field_values JSONB, p_master_record_ids UUID[])
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    f RECORD;
    fr jsonb;
    v_doc UUID;
    v_status TEXT;
    t RECORD;
BEGIN
    SELECT id, workspace_id, approval_required INTO f FROM public.dms_folders WHERE id = p_folder AND deleted_at IS NULL;
    PERFORM public.fn_dms_raise_unless(FOUND, 'That folder no longer exists.');
    fr := public.fn_dms_folder_rights(p_actor, p_folder, p_base);
    PERFORM public.fn_dms_raise_unless(public.fn_dms_flag(fr, 'upload'), 'You cannot add documents to this folder.');

    PERFORM public.fn_dms_raise_unless(
        EXISTS (SELECT 1 FROM public.dms_doc_types WHERE id = p_doc_type AND coalesce(is_active, true) AND deleted_at IS NULL),
        'Choose a document type.');
    PERFORM public.fn_dms_raise_unless(
        NOT EXISTS (SELECT 1 FROM public.dms_folder_doc_types WHERE folder_id = p_folder)
        OR EXISTS (SELECT 1 FROM public.dms_folder_doc_types WHERE folder_id = p_folder AND doc_type_id = p_doc_type),
        'This document type is not allowed in this folder.');
    IF NOT public.fn_dms_flag(fr, 'admin') THEN
        SELECT count(*) AS n, bool_or(can_add) AS a INTO t FROM public.dms_doc_type_permissions
        WHERE doc_type_id = p_doc_type AND group_id = ANY (public.fn_dms_user_groups(p_actor, f.workspace_id));
        PERFORM public.fn_dms_raise_unless(t.n = 0 OR coalesce(t.a, false), 'You cannot add documents of this type.');
    END IF;

    PERFORM public.fn_dms_raise_unless(p_storage_key IS NOT NULL AND p_storage_key LIKE 'storage:%', 'The file was not stored.');
    PERFORM public.fn_dms_raise_unless(p_checksum ~ '^[0-9a-f]{64}$', 'The file checksum is missing.');

    v_status := CASE WHEN coalesce(f.approval_required, true) THEN 'PENDING' ELSE 'APPROVED' END;

    INSERT INTO public.dms_documents (workspace_id, folder_id, doc_type_id, title, original_file_name, current_version_no, approval_status, created_by)
    VALUES (f.workspace_id, p_folder, p_doc_type, coalesce(nullif(trim(p_title), ''), p_file_name), p_file_name, 1, v_status, p_actor)
    RETURNING id INTO v_doc;

    INSERT INTO public.dms_document_versions (document_id, version_no, storage_key, file_name, file_size_bytes, checksum_sha256, mime_type, ocr_extracted_text, uploaded_by)
    VALUES (v_doc, 1, p_storage_key, p_file_name, p_size, p_checksum, coalesce(p_mime, 'application/octet-stream'), nullif(p_ocr_text, ''), p_actor);

    PERFORM public.fn_dms_write_field_values(v_doc, p_folder, coalesce(p_field_values, '{}'::jsonb));

    IF p_master_record_ids IS NOT NULL AND array_length(p_master_record_ids, 1) > 0 THEN
        INSERT INTO public.dms_document_master_tags (document_id, master_table_id, master_record_id)
        SELECT v_doc, r.master_table_id, r.id FROM public.dms_master_records r
        WHERE r.id = ANY (p_master_record_ids) AND r.deleted_at IS NULL
        ON CONFLICT DO NOTHING;
    END IF;

    IF v_status = 'PENDING' THEN
        INSERT INTO public.dms_qc_approvals (document_id, version_no, status) VALUES (v_doc, 1, 'UNAPPROVED');
    END IF;

    PERFORM public.fn_dms_audit(p_actor, 'DOCUMENT_ADDED', 'DOCUMENT', v_doc,
        jsonb_build_object('folder_id', p_folder, 'file_name', p_file_name, 'qc', v_status = 'PENDING'));
    RETURN v_doc;
END $$;

-- Edit title and custom fields (not allowed while someone else has it checked out)
CREATE OR REPLACE FUNCTION public.fn_dms_update_document(p_actor UUID, p_base JSONB, p_document UUID, p_title TEXT, p_field_values JSONB)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    d RECORD;
    r jsonb;
BEGIN
    SELECT * INTO d FROM public.dms_documents WHERE id = p_document AND deleted_at IS NULL FOR UPDATE;
    PERFORM public.fn_dms_raise_unless(FOUND, 'That document no longer exists.');
    r := public.fn_dms_document_rights(p_actor, p_document, p_base);
    PERFORM public.fn_dms_raise_unless(public.fn_dms_flag(r, 'edit'), 'You cannot edit this document.');
    PERFORM public.fn_dms_raise_unless(NOT EXISTS (
        SELECT 1 FROM public.dms_document_locks WHERE document_id = p_document AND expires_at > now() AND locked_by IS DISTINCT FROM p_actor
    ), 'Someone else has this document checked out.');
    UPDATE public.dms_documents SET title = coalesce(nullif(trim(p_title), ''), title), updated_at = now() WHERE id = p_document;
    IF p_field_values IS NOT NULL THEN
        PERFORM public.fn_dms_write_field_values(p_document, d.folder_id, p_field_values);
    END IF;
    PERFORM public.fn_dms_audit(p_actor, 'DOCUMENT_EDITED', 'DOCUMENT', p_document, jsonb_build_object('title', p_title));
END $$;

-- Check out (lock) a document. p_force lets an administrator take over an active lock.
CREATE OR REPLACE FUNCTION public.fn_dms_checkout(p_actor UUID, p_base JSONB, p_document UUID, p_hours INT)
RETURNS TIMESTAMPTZ LANGUAGE plpgsql AS $$
DECLARE
    r jsonb;
    v_until TIMESTAMPTZ := now() + make_interval(hours => greatest(1, least(coalesce(p_hours, 8), 72)));
    v_holder UUID;
BEGIN
    r := public.fn_dms_document_rights(p_actor, p_document, p_base);
    PERFORM public.fn_dms_raise_unless(public.fn_dms_flag(r, 'edit') OR public.fn_dms_flag(r, 'upload'),
        'You cannot check out this document.');

    INSERT INTO public.dms_document_locks (document_id, locked_by, locked_at, expires_at)
    VALUES (p_document, p_actor, now(), v_until)
    ON CONFLICT (document_id) DO UPDATE
        SET locked_by = EXCLUDED.locked_by, locked_at = EXCLUDED.locked_at, expires_at = EXCLUDED.expires_at
        WHERE dms_document_locks.expires_at <= now()
           OR dms_document_locks.locked_by IS NULL
           OR dms_document_locks.locked_by = EXCLUDED.locked_by;
    IF NOT FOUND THEN
        SELECT locked_by INTO v_holder FROM public.dms_document_locks WHERE document_id = p_document;
        RAISE EXCEPTION 'Already checked out by %.', coalesce((SELECT email FROM auth.users WHERE id = v_holder), 'someone else')
            USING ERRCODE = 'P0001';
    END IF;
    PERFORM public.fn_dms_audit(p_actor, 'DOCUMENT_CHECKED_OUT', 'DOCUMENT', p_document, jsonb_build_object('until', v_until));
    RETURN v_until;
END $$;

-- Release a check-out without a new version. The holder, or an administrator, can release it.
CREATE OR REPLACE FUNCTION public.fn_dms_release_lock(p_actor UUID, p_base JSONB, p_document UUID)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    l RECORD;
BEGIN
    SELECT * INTO l FROM public.dms_document_locks WHERE document_id = p_document FOR UPDATE;
    IF NOT FOUND THEN RETURN; END IF;
    PERFORM public.fn_dms_raise_unless(
        l.expires_at <= now() OR l.locked_by IS NULL OR l.locked_by = p_actor OR public.fn_dms_flag(p_base, 'admin'),
        'Only the person who checked it out, or an administrator, can release it.');
    DELETE FROM public.dms_document_locks WHERE document_id = p_document;
    PERFORM public.fn_dms_audit(p_actor, 'DOCUMENT_LOCK_RELEASED', 'DOCUMENT', p_document,
        jsonb_build_object('holder', l.locked_by, 'forced', l.locked_by IS DISTINCT FROM p_actor AND l.expires_at > now()));
END $$;

-- Check in a new version. Needs edit rights and either no active lock or your own (which is released).
CREATE OR REPLACE FUNCTION public.fn_dms_add_version(
    p_actor UUID, p_base JSONB, p_document UUID, p_storage_key TEXT, p_file_name TEXT, p_size BIGINT,
    p_checksum TEXT, p_mime TEXT, p_change_note TEXT, p_ocr_text TEXT)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
    d RECORD;
    r jsonb;
    v_no INT;
    v_qc boolean;
BEGIN
    SELECT * INTO d FROM public.dms_documents WHERE id = p_document AND deleted_at IS NULL FOR UPDATE;
    PERFORM public.fn_dms_raise_unless(FOUND, 'That document no longer exists.');
    r := public.fn_dms_document_rights(p_actor, p_document, p_base);
    PERFORM public.fn_dms_raise_unless(public.fn_dms_flag(r, 'edit') OR public.fn_dms_flag(r, 'upload'),
        'You cannot add a version to this document.');
    PERFORM public.fn_dms_raise_unless(NOT EXISTS (
        SELECT 1 FROM public.dms_document_locks WHERE document_id = p_document AND expires_at > now() AND locked_by IS DISTINCT FROM p_actor
    ), 'Someone else has this document checked out.');
    PERFORM public.fn_dms_raise_unless(p_storage_key IS NOT NULL AND p_storage_key LIKE 'storage:%', 'The file was not stored.');
    PERFORM public.fn_dms_raise_unless(p_checksum ~ '^[0-9a-f]{64}$', 'The file checksum is missing.');
    PERFORM public.fn_dms_raise_unless(nullif(trim(coalesce(p_change_note, '')), '') IS NOT NULL, 'Say what changed in this version.');

    SELECT coalesce(max(version_no), 0) + 1 INTO v_no FROM public.dms_document_versions WHERE document_id = p_document;
    INSERT INTO public.dms_document_versions (document_id, version_no, storage_key, file_name, file_size_bytes, checksum_sha256, mime_type, ocr_extracted_text, uploaded_by, change_note)
    VALUES (p_document, v_no, p_storage_key, p_file_name, p_size, p_checksum, coalesce(p_mime, 'application/octet-stream'), nullif(p_ocr_text, ''), p_actor, trim(p_change_note));

    v_qc := coalesce((SELECT approval_required FROM public.dms_folders WHERE id = d.folder_id), true);
    UPDATE public.dms_documents
    SET current_version_no = v_no, original_file_name = p_file_name, updated_at = now(),
        approval_status = CASE WHEN v_qc THEN 'PENDING' ELSE 'APPROVED' END
    WHERE id = p_document;
    IF v_qc THEN
        INSERT INTO public.dms_qc_approvals (document_id, version_no, status) VALUES (p_document, v_no, 'UNAPPROVED')
        ON CONFLICT (document_id, version_no) DO NOTHING;
    END IF;

    DELETE FROM public.dms_document_locks WHERE document_id = p_document;
    PERFORM public.fn_dms_audit(p_actor, 'DOCUMENT_VERSION_ADDED', 'DOCUMENT', p_document,
        jsonb_build_object('version_no', v_no, 'file_name', p_file_name, 'note', p_change_note));
    RETURN v_no;
END $$;

-- QC decision on the current version. Not on your own upload; rejecting needs a reason.
CREATE OR REPLACE FUNCTION public.fn_dms_qc_decide(p_actor UUID, p_base JSONB, p_document UUID, p_version INT, p_status TEXT, p_comment TEXT)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    d RECORD;
    q RECORD;
    v_uploader UUID;
BEGIN
    PERFORM public.fn_dms_raise_unless(p_status IN ('APPROVED', 'REJECTED'), 'Choose approve or reject.');
    SELECT * INTO d FROM public.dms_documents WHERE id = p_document AND deleted_at IS NULL FOR UPDATE;
    PERFORM public.fn_dms_raise_unless(FOUND, 'That document no longer exists.');
    PERFORM public.fn_dms_raise_unless(public.fn_dms_flag(public.fn_dms_document_rights(p_actor, p_document, p_base), 'qc'),
        'You are not a QC approver for this document.');
    PERFORM public.fn_dms_raise_unless(p_version = d.current_version_no, 'A newer version has been uploaded. Refresh and review that one.');

    SELECT * INTO q FROM public.dms_qc_approvals WHERE document_id = p_document AND version_no = p_version FOR UPDATE;
    PERFORM public.fn_dms_raise_unless(FOUND AND q.status = 'UNAPPROVED', 'This version is not waiting for QC.');
    SELECT uploaded_by INTO v_uploader FROM public.dms_document_versions WHERE document_id = p_document AND version_no = p_version;
    PERFORM public.fn_dms_raise_unless(v_uploader IS DISTINCT FROM p_actor OR public.fn_dms_flag(p_base, 'admin'),
        'You cannot approve your own upload.');
    PERFORM public.fn_dms_raise_unless(p_status = 'APPROVED' OR length(trim(coalesce(p_comment, ''))) >= 5,
        'Give a reason when rejecting (at least 5 characters).');

    UPDATE public.dms_qc_approvals SET status = p_status, decided_by = p_actor, decided_at = now(), decision_comment = nullif(trim(p_comment), '')
    WHERE id = q.id;
    INSERT INTO public.dms_qc_events (qc_approval_id, action, actor_id, remarks)
    VALUES (q.id, p_status, p_actor, coalesce(nullif(trim(p_comment), ''), 'Approved'));
    UPDATE public.dms_documents SET approval_status = p_status, updated_at = now() WHERE id = p_document;
    PERFORM public.fn_dms_audit(p_actor, 'DOCUMENT_QC_' || p_status, 'DOCUMENT', p_document,
        jsonb_build_object('version_no', p_version, 'comment', p_comment));
END $$;

-- Move to the recycle bin
CREATE OR REPLACE FUNCTION public.fn_dms_delete_document(p_actor UUID, p_base JSONB, p_document UUID)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    d RECORD;
BEGIN
    SELECT * INTO d FROM public.dms_documents WHERE id = p_document AND deleted_at IS NULL FOR UPDATE;
    PERFORM public.fn_dms_raise_unless(FOUND, 'That document is already deleted.');
    PERFORM public.fn_dms_raise_unless(public.fn_dms_flag(public.fn_dms_document_rights(p_actor, p_document, p_base), 'delete'),
        'You cannot delete this document.');
    PERFORM public.fn_dms_raise_unless(NOT EXISTS (
        SELECT 1 FROM public.dms_document_locks WHERE document_id = p_document AND expires_at > now() AND locked_by IS DISTINCT FROM p_actor
    ), 'Someone else has this document checked out.');
    UPDATE public.dms_documents SET deleted_at = now(), deleted_by = p_actor WHERE id = p_document;
    DELETE FROM public.dms_document_locks WHERE document_id = p_document;
    INSERT INTO public.dms_recycle_bin (workspace_id, entity_type, entity_id, deleted_by) VALUES (d.workspace_id, 'DOCUMENT', p_document, p_actor);
    PERFORM public.fn_dms_audit(p_actor, 'DOCUMENT_DELETED', 'DOCUMENT', p_document, jsonb_build_object('title', d.title));
END $$;

CREATE OR REPLACE FUNCTION public.fn_dms_restore_document(p_actor UUID, p_base JSONB, p_document UUID)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    d RECORD;
BEGIN
    SELECT * INTO d FROM public.dms_documents WHERE id = p_document AND deleted_at IS NOT NULL AND purged_at IS NULL FOR UPDATE;
    PERFORM public.fn_dms_raise_unless(FOUND, 'That document is not in the recycle bin.');
    PERFORM public.fn_dms_raise_unless(public.fn_dms_flag(public.fn_dms_document_rights(p_actor, p_document, p_base), 'restore'),
        'You cannot restore this document.');
    PERFORM public.fn_dms_raise_unless(EXISTS (SELECT 1 FROM public.dms_folders WHERE id = d.folder_id AND deleted_at IS NULL),
        'Its folder was deleted. Restore the folder first.');
    UPDATE public.dms_documents SET deleted_at = NULL, deleted_by = NULL, updated_at = now() WHERE id = p_document;
    UPDATE public.dms_recycle_bin SET restored_at = now(), restored_by = p_actor
    WHERE entity_type = 'DOCUMENT' AND entity_id = p_document AND is_purged = false AND restored_at IS NULL;
    PERFORM public.fn_dms_audit(p_actor, 'DOCUMENT_RESTORED', 'DOCUMENT', p_document, '{}'::jsonb);
END $$;

-- Purge for good: needs the purge right and a reason. Returns the stored files for the app to remove.
CREATE OR REPLACE FUNCTION public.fn_dms_purge_document(p_actor UUID, p_base JSONB, p_document UUID, p_reason TEXT)
RETURNS TEXT[] LANGUAGE plpgsql AS $$
DECLARE
    d RECORD;
    v_keys TEXT[];
BEGIN
    SELECT * INTO d FROM public.dms_documents WHERE id = p_document AND deleted_at IS NOT NULL AND purged_at IS NULL FOR UPDATE;
    PERFORM public.fn_dms_raise_unless(FOUND, 'Only documents in the recycle bin can be purged.');
    PERFORM public.fn_dms_raise_unless(public.fn_dms_flag(public.fn_dms_document_rights(p_actor, p_document, p_base), 'purge'),
        'You do not have the right to purge documents.');
    PERFORM public.fn_dms_raise_unless(length(trim(coalesce(p_reason, ''))) >= 5, 'Give a reason for purging (at least 5 characters).');

    SELECT array_agg(storage_key) INTO v_keys FROM public.dms_document_versions WHERE document_id = p_document;
    UPDATE public.dms_documents SET purged_at = now() WHERE id = p_document;
    UPDATE public.dms_document_versions SET storage_key = 'purged:', ocr_extracted_text = NULL WHERE document_id = p_document;
    UPDATE public.dms_recycle_bin SET is_purged = true, purge_reason = trim(p_reason), purged_by = p_actor, purged_at = now()
    WHERE entity_type = 'DOCUMENT' AND entity_id = p_document AND restored_at IS NULL;
    PERFORM public.fn_dms_audit(p_actor, 'DOCUMENT_PURGED', 'DOCUMENT', p_document,
        jsonb_build_object('title', d.title, 'reason', trim(p_reason), 'files', coalesce(array_length(v_keys, 1), 0)));
    RETURN coalesce(v_keys, '{}');
END $$;

-- Folders: create, rename, and delete only when empty
CREATE OR REPLACE FUNCTION public.fn_dms_create_folder(p_actor UUID, p_base JSONB, p_parent UUID, p_name TEXT, p_approval_required BOOLEAN)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    p RECORD;
    v_label TEXT;
    v_path ltree;
    v_id UUID;
BEGIN
    PERFORM public.fn_dms_raise_unless(length(trim(coalesce(p_name, ''))) BETWEEN 1 AND 255, 'Give the folder a name.');
    SELECT id, workspace_id, path INTO p FROM public.dms_folders WHERE id = p_parent AND deleted_at IS NULL;
    PERFORM public.fn_dms_raise_unless(FOUND, 'Choose the parent folder.');
    PERFORM public.fn_dms_raise_unless(
        public.fn_dms_flag(public.fn_dms_folder_rights(p_actor, p_parent, p_base), 'admin')
        OR public.fn_dms_flag(public.fn_dms_folder_rights(p_actor, p_parent, p_base), 'create_folder'),
        'You cannot create folders here.');
    PERFORM public.fn_dms_raise_unless(NOT EXISTS (
        SELECT 1 FROM public.dms_folders WHERE parent_id = p_parent AND deleted_at IS NULL AND lower(name) = lower(trim(p_name))
    ), 'A folder with that name already exists here.');

    v_label := left(coalesce(nullif(trim(both '_' from regexp_replace(lower(trim(p_name)), '[^a-z0-9_]+', '_', 'g')), ''), 'folder'), 40)
               || '_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
    v_path := p.path || text2ltree(v_label);
    INSERT INTO public.dms_folders (workspace_id, parent_id, name, path, approval_required, inherit_permissions, created_by)
    VALUES (p.workspace_id, p_parent, trim(p_name), v_path, coalesce(p_approval_required, true), true, p_actor)
    RETURNING id INTO v_id;
    PERFORM public.fn_dms_audit(p_actor, 'FOLDER_CREATED', 'FOLDER', v_id, jsonb_build_object('name', trim(p_name), 'parent', p_parent));
    RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.fn_dms_update_folder(p_actor UUID, p_base JSONB, p_folder UUID, p_name TEXT, p_approval_required BOOLEAN)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    f RECORD;
BEGIN
    SELECT * INTO f FROM public.dms_folders WHERE id = p_folder AND deleted_at IS NULL FOR UPDATE;
    PERFORM public.fn_dms_raise_unless(FOUND, 'That folder no longer exists.');
    PERFORM public.fn_dms_raise_unless(
        public.fn_dms_flag(p_base, 'admin') OR public.fn_dms_flag(public.fn_dms_folder_rights(p_actor, p_folder, p_base), 'manage'),
        'You cannot change this folder.');
    IF nullif(trim(coalesce(p_name, '')), '') IS NOT NULL AND lower(trim(p_name)) <> lower(f.name) THEN
        PERFORM public.fn_dms_raise_unless(NOT EXISTS (
            SELECT 1 FROM public.dms_folders WHERE parent_id IS NOT DISTINCT FROM f.parent_id AND id <> p_folder
              AND deleted_at IS NULL AND lower(name) = lower(trim(p_name))
        ), 'A folder with that name already exists here.');
    END IF;
    UPDATE public.dms_folders
    SET name = coalesce(nullif(trim(p_name), ''), name),
        approval_required = coalesce(p_approval_required, approval_required),
        updated_at = now()
    WHERE id = p_folder;
    PERFORM public.fn_dms_audit(p_actor, 'FOLDER_UPDATED', 'FOLDER', p_folder,
        jsonb_build_object('name', p_name, 'approval_required', p_approval_required));
END $$;

CREATE OR REPLACE FUNCTION public.fn_dms_delete_folder(p_actor UUID, p_base JSONB, p_folder UUID)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    f RECORD;
BEGIN
    SELECT * INTO f FROM public.dms_folders WHERE id = p_folder AND deleted_at IS NULL FOR UPDATE;
    PERFORM public.fn_dms_raise_unless(FOUND, 'That folder no longer exists.');
    PERFORM public.fn_dms_raise_unless(f.parent_id IS NOT NULL, 'The top folder cannot be deleted.');
    PERFORM public.fn_dms_raise_unless(
        public.fn_dms_flag(p_base, 'admin') OR public.fn_dms_flag(public.fn_dms_folder_rights(p_actor, p_folder, p_base), 'manage'),
        'You cannot delete this folder.');
    PERFORM public.fn_dms_raise_unless(NOT EXISTS (
        SELECT 1 FROM public.dms_folders c WHERE c.path <@ f.path AND c.id <> f.id AND c.deleted_at IS NULL
    ), 'Delete or move its subfolders first.');
    PERFORM public.fn_dms_raise_unless(NOT EXISTS (
        SELECT 1 FROM public.dms_documents WHERE folder_id = p_folder AND purged_at IS NULL
    ), 'This folder still has documents (including ones in the recycle bin).');
    UPDATE public.dms_folders SET deleted_at = now(), updated_at = now() WHERE id = p_folder;
    PERFORM public.fn_dms_audit(p_actor, 'FOLDER_DELETED', 'FOLDER', p_folder, jsonb_build_object('name', f.name));
END $$;

-- Replace one folder's grants (and its inherit switch) in one step
CREATE OR REPLACE FUNCTION public.fn_dms_set_folder_permissions(p_actor UUID, p_base JSONB, p_folder UUID, p_inherit BOOLEAN, p_grants JSONB)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    g jsonb;
BEGIN
    PERFORM public.fn_dms_raise_unless(EXISTS (SELECT 1 FROM public.dms_folders WHERE id = p_folder AND deleted_at IS NULL), 'That folder no longer exists.');
    PERFORM public.fn_dms_raise_unless(
        public.fn_dms_flag(p_base, 'admin') OR public.fn_dms_flag(public.fn_dms_folder_rights(p_actor, p_folder, p_base), 'manage'),
        'You cannot manage access to this folder.');
    PERFORM public.fn_dms_raise_unless(coalesce(p_inherit, true) OR jsonb_array_length(coalesce(p_grants, '[]'::jsonb)) > 0,
        'A folder that does not inherit access needs at least one person or group, or nobody but administrators can open it.');

    UPDATE public.dms_folders SET inherit_permissions = coalesce(p_inherit, true), updated_at = now() WHERE id = p_folder;
    DELETE FROM public.dms_folder_permissions WHERE folder_id = p_folder;
    FOR g IN SELECT * FROM jsonb_array_elements(coalesce(p_grants, '[]'::jsonb)) LOOP
        PERFORM public.fn_dms_raise_unless(
            nullif(g ->> 'user_id', '') IS NOT NULL OR nullif(g ->> 'group_id', '') IS NOT NULL
            OR nullif(g ->> 'user_email', '') IS NOT NULL OR nullif(g ->> 'role_code', '') IS NOT NULL,
            'Each access row needs a person, group or role.');
        INSERT INTO public.dms_folder_permissions (folder_id, user_id, group_id, user_email, user_name, role_code,
                                                   can_view, can_upload, can_download, can_delete, can_manage)
        VALUES (p_folder, nullif(g ->> 'user_id', '')::uuid, nullif(g ->> 'group_id', '')::uuid,
                nullif(g ->> 'user_email', ''), nullif(g ->> 'user_name', ''), nullif(g ->> 'role_code', ''),
                coalesce((g ->> 'can_view')::boolean, true), coalesce((g ->> 'can_upload')::boolean, false),
                coalesce((g ->> 'can_download')::boolean, true), coalesce((g ->> 'can_delete')::boolean, false),
                coalesce((g ->> 'can_manage')::boolean, false));
    END LOOP;
    PERFORM public.fn_dms_audit(p_actor, 'FOLDER_PERMISSIONS_UPDATED', 'FOLDER', p_folder,
        jsonb_build_object('inherit', p_inherit, 'grants', jsonb_array_length(coalesce(p_grants, '[]'::jsonb))));
END $$;

-- ---------- only the server (service role) may call these ----------
DO $$
DECLARE
    fn TEXT;
BEGIN
    FOR fn IN
        SELECT p.oid::regprocedure::text FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname LIKE 'fn\_dms\_%'
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    END LOOP;
END $$;
