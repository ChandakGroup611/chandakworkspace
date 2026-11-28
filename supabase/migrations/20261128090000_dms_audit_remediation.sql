-- ============================================================================
-- DMS Audit Remediation Migration (Security, Private View, Inheritance & Indexes)
-- ============================================================================

-- 1. Drop legacy overly-permissive USING(true) RLS policies & revoke direct client grants
DROP POLICY IF EXISTS "dms_workspaces_public_read" ON public.dms_workspaces;
DROP POLICY IF EXISTS "dms_folders_public_all" ON public.dms_folders;
DROP POLICY IF EXISTS "dms_doc_types_public_all" ON public.dms_doc_types;
DROP POLICY IF EXISTS "dms_documents_public_all" ON public.dms_documents;
DROP POLICY IF EXISTS "dms_audit_logs_public_all" ON public.dms_audit_logs;
DROP POLICY IF EXISTS "dms_folder_permissions_public_all" ON public.dms_folder_permissions;

REVOKE ALL ON public.dms_workspaces FROM anon, authenticated;
REVOKE ALL ON public.dms_folders FROM anon, authenticated;
REVOKE ALL ON public.dms_doc_types FROM anon, authenticated;
REVOKE ALL ON public.dms_documents FROM anon, authenticated;
REVOKE ALL ON public.dms_audit_logs FROM anon, authenticated;
REVOKE ALL ON public.dms_folder_permissions FROM anon, authenticated;

GRANT ALL ON public.dms_workspaces TO service_role;
GRANT ALL ON public.dms_folders TO service_role;
GRANT ALL ON public.dms_doc_types TO service_role;
GRANT ALL ON public.dms_documents TO service_role;
GRANT ALL ON public.dms_audit_logs TO service_role;
GRANT ALL ON public.dms_folder_permissions TO service_role;

-- 2. Schema drift fix on dms_document_links (columns from 20261127100000 skipped by IF NOT EXISTS)
ALTER TABLE public.dms_document_links
  ADD COLUMN IF NOT EXISTS link_note TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- 3. Enforce dms_documents.is_private inside fn_dms_document_rights
CREATE OR REPLACE FUNCTION public.fn_dms_document_rights(p_user UUID, p_document UUID, p_base JSONB)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    d RECORD;
    fr jsonb;
    t RECORD;
    dp RECORD;
    v_own boolean;
    v_role text;
    v_groups UUID[];
    v_depts UUID[];
    v_has_doc_perms boolean;
BEGIN
    SELECT id, folder_id, workspace_id, doc_type_id, created_by, approval_status, deleted_at, purged_at, is_private
    INTO d FROM public.dms_documents WHERE id = p_document;
    IF NOT FOUND OR d.purged_at IS NOT NULL THEN RETURN public.fn_dms_no_rights(); END IF;

    fr := public.fn_dms_folder_rights(p_user, d.folder_id, p_base);
    IF d.deleted_at IS NOT NULL THEN
        RETURN public.fn_dms_no_rights() || jsonb_build_object(
            'deleted', true,
            'restore', public.fn_dms_flag(fr, 'delete') OR public.fn_dms_flag(fr, 'admin'),
            'purge', public.fn_dms_flag(fr, 'purge'));
    END IF;
    IF public.fn_dms_flag(fr, 'admin') THEN RETURN fr || jsonb_build_object('deleted', false, 'manage', true); END IF;
    IF NOT public.fn_dms_flag(fr, 'view') THEN RETURN public.fn_dms_no_rights(); END IF;

    v_own := d.created_by IS NOT DISTINCT FROM p_user;

    -- Private document restriction: only owner, explicit document-permission grantee, or admin may access
    IF coalesce(d.is_private, false) AND NOT v_own THEN
        SELECT EXISTS (SELECT 1 FROM public.dms_document_permissions WHERE document_id = p_document) INTO v_has_doc_perms;
        IF NOT v_has_doc_perms THEN
            RETURN public.fn_dms_no_rights();
        END IF;
    END IF;

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

    SELECT EXISTS (SELECT 1 FROM public.dms_document_permissions WHERE document_id = p_document) INTO v_has_doc_perms;
    IF v_has_doc_perms AND NOT v_own THEN
        SELECT upper(design_role) INTO v_role FROM public.design_user_access WHERE user_id = p_user;
        v_groups := public.fn_dms_user_groups(p_user, d.workspace_id);
        v_depts := public.fn_dms_user_departments(p_user);

        SELECT coalesce(bool_or(can_view), false) AS dv,
               coalesce(bool_or(can_edit), false) AS de,
               coalesce(bool_or(can_download), false) AS dl,
               coalesce(bool_or(can_manage), false) AS dm,
               coalesce(bool_or(can_delete), false) AS dx
        INTO dp
        FROM public.dms_document_permissions
        WHERE document_id = p_document
          AND (user_id = p_user
               OR group_id = ANY (v_groups)
               OR department_id = ANY (v_depts)
               OR (user_id IS NULL AND group_id IS NULL AND department_id IS NULL AND role_code IS NOT NULL AND upper(role_code) = v_role));

        IF NOT coalesce(dp.dv, false) AND NOT coalesce(dp.dm, false) THEN
            RETURN public.fn_dms_no_rights();
        END IF;

        fr := fr || jsonb_build_object(
            'edit',     public.fn_dms_flag(fr, 'edit')     AND (coalesce(dp.de, false) OR coalesce(dp.dm, false)),
            'download', public.fn_dms_flag(fr, 'download') AND (coalesce(dp.dl, false) OR coalesce(dp.dm, false)),
            'print',    public.fn_dms_flag(fr, 'print')    AND (coalesce(dp.dl, false) OR coalesce(dp.dm, false)),
            'email',    public.fn_dms_flag(fr, 'email')    AND (coalesce(dp.dl, false) OR coalesce(dp.dm, false)),
            'delete',   public.fn_dms_flag(fr, 'delete')   AND (coalesce(dp.dx, false) OR coalesce(dp.dm, false)),
            'manage',   public.fn_dms_flag(fr, 'manage')   OR coalesce(dp.dm, false));
    END IF;

    IF d.approval_status <> 'APPROVED' AND NOT v_own AND NOT public.fn_dms_flag(fr, 'qc') THEN
        RETURN public.fn_dms_no_rights();
    END IF;

    RETURN fr || jsonb_build_object('deleted', false, 'own', v_own, 'manage', public.fn_dms_flag(fr, 'manage') OR v_own);
END $$;

REVOKE ALL ON FUNCTION public.fn_dms_document_rights(UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_dms_document_rights(UUID, UUID, JSONB) TO service_role;

-- 4. Support inheritByDefault in fn_dms_create_folder (backward-compatible default = true)
DROP FUNCTION IF EXISTS public.fn_dms_create_folder(UUID, JSONB, UUID, TEXT, BOOLEAN);
CREATE OR REPLACE FUNCTION public.fn_dms_create_folder(
    p_actor UUID,
    p_base JSONB,
    p_parent UUID,
    p_name TEXT,
    p_approval_required BOOLEAN,
    p_inherit_permissions BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
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
    VALUES (p.workspace_id, p_parent, trim(p_name), v_path, coalesce(p_approval_required, true), coalesce(p_inherit_permissions, true), p_actor)
    RETURNING id INTO v_id;
    PERFORM public.fn_dms_audit(p_actor, 'FOLDER_CREATED', 'FOLDER', v_id, jsonb_build_object('name', trim(p_name), 'parent', p_parent, 'inherit_permissions', coalesce(p_inherit_permissions, true)));
    RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.fn_dms_create_folder(UUID, JSONB, UUID, TEXT, BOOLEAN, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_dms_create_folder(UUID, JSONB, UUID, TEXT, BOOLEAN, BOOLEAN) TO service_role;

-- 5. Performance indexes for search, folder listing, links & recycle bin
CREATE INDEX IF NOT EXISTS idx_dms_documents_orig_name_trgm
  ON public.dms_documents USING gin (original_file_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_dms_documents_folder_live_qc
  ON public.dms_documents (folder_id, approval_status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_dms_doc_links_target
  ON public.dms_document_links (target_document_id);

CREATE INDEX IF NOT EXISTS idx_dms_recycle_entity
  ON public.dms_recycle_bin (entity_type, entity_id)
  WHERE is_purged = false AND restored_at IS NULL;
