-- DMS Groups Management + Group-Wise & Department-Wise Folder/Document Sharing
-- Additive migration: preserves all existing groups, members, and user-wise permissions.

ALTER TABLE public.dms_groups
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_by UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.dms_group_members
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_dms_groups_ws_code
  ON public.dms_groups (workspace_id, upper(code))
  WHERE code IS NOT NULL AND deleted_at IS NULL;

-- Department-wise sharing on folders
ALTER TABLE public.dms_folder_permissions
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dms_folder_perms_dept
  ON public.dms_folder_permissions (folder_id, department_id)
  WHERE department_id IS NOT NULL;

-- Group-wise & Department-wise sharing on documents
ALTER TABLE public.dms_document_permissions
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.dms_groups(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dms_doc_perms_group
  ON public.dms_document_permissions (document_id, group_id)
  WHERE group_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dms_doc_perms_dept
  ON public.dms_document_permissions (document_id, department_id)
  WHERE department_id IS NOT NULL;

-- Active user departments helper (evaluates user_master.department_id + user_department_access)
CREATE OR REPLACE FUNCTION public.fn_dms_user_departments(p_user UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT coalesce(array_agg(DISTINCT dept_id), '{}')
    FROM (
        SELECT um.department_id AS dept_id
        FROM public.user_master um
        JOIN public.departments d ON d.id = um.department_id
        WHERE um.id = p_user
          AND coalesce(um.is_active, true) = true
          AND coalesce(d.is_deleted, false) = false
          AND um.department_id IS NOT NULL
        UNION
        SELECT uda.department_id AS dept_id
        FROM public.user_department_access uda
        JOIN public.departments d ON d.id = uda.department_id
        LEFT JOIN public.user_master um ON um.id = uda.user_id
        WHERE uda.user_id = p_user
          AND (um.id IS NULL OR coalesce(um.is_active, true) = true)
          AND coalesce(d.is_deleted, false) = false
    ) s
$$;

-- Active user groups helper (only active groups for active users)
CREATE OR REPLACE FUNCTION public.fn_dms_user_groups(p_user UUID, p_workspace UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT coalesce(array_agg(m.group_id), '{}')
    FROM public.dms_group_members m
    JOIN public.dms_groups g ON g.id = m.group_id AND g.deleted_at IS NULL AND coalesce(g.is_active, true) = true
    LEFT JOIN public.user_master um ON um.id = m.user_id
    WHERE m.user_id = p_user
      AND (um.id IS NULL OR coalesce(um.is_active, true) = true)
      AND (p_workspace IS NULL OR g.workspace_id = p_workspace)
$$;

-- Layer 3: folder grants with inheritance (supports users, groups, departments, roles)
CREATE OR REPLACE FUNCTION public.fn_dms_folder_rights(p_user UUID, p_folder UUID, p_base JSONB)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    f RECORD;
    ws jsonb;
    v_chain UUID[];
    v_restricted boolean;
    v_groups UUID[];
    v_depts UUID[];
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
        v_depts := public.fn_dms_user_departments(p_user);
        SELECT upper(design_role) INTO v_role FROM public.design_user_access WHERE user_id = p_user;
        SELECT lower(email) INTO v_email FROM auth.users WHERE id = p_user;
        SELECT coalesce(bool_or(can_view), false), coalesce(bool_or(can_upload), false), coalesce(bool_or(can_download), false),
               coalesce(bool_or(can_delete), false), coalesce(bool_or(can_manage), false)
        INTO g_v, g_u, g_d, g_x, g_m
        FROM public.dms_folder_permissions
        WHERE folder_id = ANY (v_chain)
          AND (user_id = p_user
               OR group_id = ANY (v_groups)
               OR department_id = ANY (v_depts)
               OR (user_id IS NULL AND group_id IS NULL AND department_id IS NULL AND user_email IS NOT NULL AND lower(user_email) = v_email)
               OR (user_id IS NULL AND group_id IS NULL AND department_id IS NULL AND user_email IS NULL AND role_code IS NOT NULL AND upper(role_code) = v_role));
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

-- Document rights (supports users, groups, departments, roles; restricts folder rights)
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
    SELECT id, folder_id, workspace_id, doc_type_id, created_by, approval_status, deleted_at, purged_at
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

-- Update folder permissions setter to accept department_id
CREATE OR REPLACE FUNCTION public.fn_dms_set_folder_permissions(p_actor UUID, p_base JSONB, p_folder UUID, p_inherit BOOLEAN, p_grants JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    g jsonb;
BEGIN
    PERFORM public.fn_dms_raise_unless(EXISTS (SELECT 1 FROM public.dms_folders WHERE id = p_folder AND deleted_at IS NULL), 'That folder no longer exists.');
    PERFORM public.fn_dms_raise_unless(
        public.fn_dms_flag(p_base, 'admin') OR public.fn_dms_flag(public.fn_dms_folder_rights(p_actor, p_folder, p_base), 'manage'),
        'You cannot manage access to this folder.');
    PERFORM public.fn_dms_raise_unless(coalesce(p_inherit, true) OR jsonb_array_length(coalesce(p_grants, '[]'::jsonb)) > 0,
        'A folder that does not inherit access needs at least one user, group, department, or role.');

    UPDATE public.dms_folders SET inherit_permissions = coalesce(p_inherit, true), updated_at = now() WHERE id = p_folder;
    DELETE FROM public.dms_folder_permissions WHERE folder_id = p_folder;
    FOR g IN SELECT * FROM jsonb_array_elements(coalesce(p_grants, '[]'::jsonb)) LOOP
        PERFORM public.fn_dms_raise_unless(
            nullif(g ->> 'user_id', '') IS NOT NULL
            OR nullif(g ->> 'group_id', '') IS NOT NULL
            OR nullif(g ->> 'department_id', '') IS NOT NULL
            OR nullif(g ->> 'user_email', '') IS NOT NULL
            OR nullif(g ->> 'role_code', '') IS NOT NULL,
            'Each access row needs a user, group, department, or role.');
        INSERT INTO public.dms_folder_permissions (
            folder_id, user_id, group_id, department_id, user_email, user_name, role_code,
            can_view, can_upload, can_download, can_delete, can_manage
        )
        VALUES (
            p_folder,
            nullif(g ->> 'user_id', '')::uuid,
            nullif(g ->> 'group_id', '')::uuid,
            nullif(g ->> 'department_id', '')::uuid,
            nullif(g ->> 'user_email', ''),
            nullif(g ->> 'user_name', ''),
            nullif(g ->> 'role_code', ''),
            coalesce((g ->> 'can_view')::boolean, true),
            coalesce((g ->> 'can_upload')::boolean, false),
            coalesce((g ->> 'can_download')::boolean, true),
            coalesce((g ->> 'can_delete')::boolean, false),
            coalesce((g ->> 'can_manage')::boolean, false)
        );
    END LOOP;
    PERFORM public.fn_dms_audit(p_actor, 'FOLDER_PERMISSIONS_UPDATED', 'FOLDER', p_folder,
        jsonb_build_object('inherit', p_inherit, 'grants', jsonb_array_length(coalesce(p_grants, '[]'::jsonb))));
END $$;

-- Update document permissions setter to accept group_id and department_id
CREATE OR REPLACE FUNCTION public.fn_dms_set_document_permissions(
    p_actor UUID,
    p_base JSONB,
    p_document UUID,
    p_grants JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    r jsonb;
    g jsonb;
BEGIN
    r := public.fn_dms_document_rights(p_actor, p_document, p_base);
    PERFORM public.fn_dms_raise_unless(
        public.fn_dms_flag(r, 'admin') OR public.fn_dms_flag(r, 'manage') OR public.fn_dms_flag(r, 'own'),
        'Only document managers, the uploader, or Design administrators can manage document permissions.'
    );

    DELETE FROM public.dms_document_permissions WHERE document_id = p_document;

    IF jsonb_typeof(coalesce(p_grants, '[]'::jsonb)) = 'array' THEN
        FOR g IN SELECT * FROM jsonb_array_elements(p_grants) LOOP
            IF nullif(g->>'user_id', '') IS NOT NULL
               OR nullif(g->>'group_id', '') IS NOT NULL
               OR nullif(g->>'department_id', '') IS NOT NULL
               OR nullif(trim(coalesce(g->>'role_code', '')), '') IS NOT NULL THEN
                INSERT INTO public.dms_document_permissions (
                    document_id, user_id, group_id, department_id, role_code,
                    can_view, can_edit, can_download, can_manage, can_delete
                ) VALUES (
                    p_document,
                    nullif(g->>'user_id', '')::uuid,
                    nullif(g->>'group_id', '')::uuid,
                    nullif(g->>'department_id', '')::uuid,
                    nullif(upper(trim(coalesce(g->>'role_code', ''))), ''),
                    coalesce((g->>'can_view')::boolean, true),
                    coalesce((g->>'can_edit')::boolean, false),
                    coalesce((g->>'can_download')::boolean, false),
                    coalesce((g->>'can_manage')::boolean, false),
                    coalesce((g->>'can_delete')::boolean, false)
                );
            END IF;
        END LOOP;
    END IF;

    PERFORM public.fn_dms_audit(p_actor, 'DOCUMENT_PERMISSIONS_UPDATED', 'DOCUMENT', p_document, jsonb_build_object('count', jsonb_array_length(coalesce(p_grants, '[]'::jsonb))));
END $$;

-- Re-lock all fn_dms_* functions to service_role only
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
