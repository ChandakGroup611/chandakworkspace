-- Document-level RBAC (users & roles) gated by folder-level access.
CREATE TABLE IF NOT EXISTS public.dms_document_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.dms_documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_code TEXT,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_download BOOLEAN NOT NULL DEFAULT false,
  can_manage BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dms_doc_perms_user
  ON public.dms_document_permissions (document_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dms_doc_perms_role
  ON public.dms_document_permissions (document_id, upper(role_code))
  WHERE role_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dms_doc_perms_doc
  ON public.dms_document_permissions (document_id);

ALTER TABLE public.dms_document_permissions ENABLE ROW LEVEL SECURITY;

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

    -- Document-level RBAC (if configured on this document)
    SELECT EXISTS (SELECT 1 FROM public.dms_document_permissions WHERE document_id = p_document) INTO v_has_doc_perms;
    IF v_has_doc_perms AND NOT v_own THEN
        SELECT upper(design_role) INTO v_role FROM public.design_user_access WHERE user_id = p_user;
        SELECT coalesce(bool_or(can_view), false) AS dv,
               coalesce(bool_or(can_edit), false) AS de,
               coalesce(bool_or(can_download), false) AS dl,
               coalesce(bool_or(can_manage), false) AS dm,
               coalesce(bool_or(can_delete), false) AS dx
        INTO dp
        FROM public.dms_document_permissions
        WHERE document_id = p_document
          AND (user_id = p_user OR (user_id IS NULL AND role_code IS NOT NULL AND upper(role_code) = v_role));

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

    -- Layer 6: until QC approves it, a document is for its uploader and the QC approvers only
    IF d.approval_status <> 'APPROVED' AND NOT v_own AND NOT public.fn_dms_flag(fr, 'qc') THEN
        RETURN public.fn_dms_no_rights();
    END IF;

    RETURN fr || jsonb_build_object('deleted', false, 'own', v_own, 'manage', public.fn_dms_flag(fr, 'manage') OR v_own);
END $$;

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
            IF (g->>'user_id') IS NOT NULL OR nullif(trim(coalesce(g->>'role_code', '')), '') IS NOT NULL THEN
                INSERT INTO public.dms_document_permissions (
                    document_id, user_id, role_code, can_view, can_edit, can_download, can_manage, can_delete
                ) VALUES (
                    p_document,
                    nullif(g->>'user_id', '')::uuid,
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
