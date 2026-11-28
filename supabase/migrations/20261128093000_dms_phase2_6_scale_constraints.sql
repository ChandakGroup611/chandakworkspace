-- ============================================================================
-- Phase 2 & 6: DB Integrity Constraints & Search Scalability Optimization
-- ============================================================================

-- 1. Prevent duplicate active filenames in the same folder (POT-01)
CREATE UNIQUE INDEX IF NOT EXISTS uq_dms_documents_folder_filename
  ON public.dms_documents (folder_id, lower(original_file_name))
  WHERE deleted_at IS NULL;

-- 2. Prevent self-parenting cycle on dms_folders (POT-04)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_dms_folders_not_self_parent'
  ) THEN
    ALTER TABLE public.dms_folders
      ADD CONSTRAINT chk_dms_folders_not_self_parent CHECK (parent_id IS DISTINCT FROM id);
  END IF;
END $$;

-- 3. Optimize fn_dms_search: push text & is_private predicates into cand CTE before per-row RBAC
DROP FUNCTION IF EXISTS public.fn_dms_search(UUID, JSONB, UUID, JSONB, INT, INT);
CREATE OR REPLACE FUNCTION public.fn_dms_search(
    p_user UUID,
    p_base JSONB,
    p_workspace UUID,
    p_filters JSONB,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (document_id UUID, rank REAL, match_source TEXT, total_count BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_text TEXT := nullif(trim(coalesce(p_filters ->> 'q', '')), '');
    v_tq tsquery := CASE WHEN v_text IS NOT NULL THEN websearch_to_tsquery('english', v_text) END;
    v_like TEXT := CASE WHEN v_text IS NOT NULL THEN '%' || replace(replace(v_text, '%', '\%'), '_', '\_') || '%' END;
    v_folder UUID := nullif(p_filters ->> 'folder_id', '')::uuid;
    v_sub BOOLEAN := coalesce((p_filters ->> 'include_subfolders')::boolean, true);
    v_type UUID := nullif(p_filters ->> 'doc_type_id', '')::uuid;
    v_status TEXT := nullif(p_filters ->> 'approval_status', '');
    v_from DATE := nullif(p_filters ->> 'updated_from', '')::date;
    v_to DATE := nullif(p_filters ->> 'updated_to', '')::date;
    v_master UUID := nullif(p_filters ->> 'master_record_id', '')::uuid;
    v_checked_out BOOLEAN := coalesce((p_filters ->> 'checked_out')::boolean, false);
    v_fields JSONB := coalesce(p_filters -> 'fields', '[]'::jsonb);
    v_path ltree;
    v_blocked UUID[];
    v_hidden UUID[];
    v_is_admin BOOLEAN := public.fn_dms_flag(p_base, 'admin');
    f JSONB;
BEGIN
    IF v_folder IS NOT NULL THEN
        SELECT path INTO v_path FROM public.dms_folders WHERE id = v_folder AND workspace_id = p_workspace AND deleted_at IS NULL;
        PERFORM public.fn_dms_raise_unless(v_path IS NOT NULL, 'That folder no longer exists.');
    END IF;

    v_blocked := public.fn_dms_unsearchable_fields(p_user, p_workspace, p_base);
    v_hidden := public.fn_dms_hidden_fields(p_user, p_workspace, p_base);
    PERFORM public.fn_dms_raise_unless(jsonb_typeof(v_fields) = 'array' AND jsonb_array_length(v_fields) <= 10, 'Use up to 10 field filters.');
    FOR f IN SELECT * FROM jsonb_array_elements(v_fields) LOOP
        PERFORM public.fn_dms_raise_unless(nullif(f ->> 'field_id', '') IS NOT NULL AND nullif(trim(coalesce(f ->> 'value', '')), '') IS NOT NULL,
            'Each field filter needs a field and a value.');
        PERFORM public.fn_dms_raise_unless(NOT ((f ->> 'field_id')::uuid = ANY (v_blocked || v_hidden)),
            'You cannot search on one of the chosen fields.');
    END LOOP;

    RETURN QUERY
    WITH cand AS (
        SELECT d.id, d.updated_at, d.search_vector AS dv,
               (SELECT v.search_vector FROM public.dms_document_versions v
                 WHERE v.document_id = d.id AND v.version_no = d.current_version_no) AS vv
        FROM public.dms_documents d
        WHERE d.workspace_id = p_workspace
          AND d.deleted_at IS NULL
          AND (NOT coalesce(d.is_private, false)
               OR d.created_by IS NOT DISTINCT FROM p_user
               OR v_is_admin
               OR EXISTS (SELECT 1 FROM public.dms_document_permissions dp WHERE dp.document_id = d.id))
          AND (v_folder IS NULL OR d.folder_id = v_folder
               OR (v_sub AND d.folder_id IN (SELECT c.id FROM public.dms_folders c WHERE c.path <@ v_path AND c.deleted_at IS NULL)))
          AND (v_type IS NULL OR d.doc_type_id = v_type)
          AND (v_status IS NULL OR d.approval_status = v_status)
          AND (v_from IS NULL OR d.updated_at >= v_from)
          AND (v_to IS NULL OR d.updated_at < v_to + 1)
          AND (v_master IS NULL OR EXISTS (SELECT 1 FROM public.dms_document_master_tags t WHERE t.document_id = d.id AND t.master_record_id = v_master))
          AND (NOT v_checked_out OR EXISTS (SELECT 1 FROM public.dms_document_locks l WHERE l.document_id = d.id AND l.expires_at > now()))
          AND (v_text IS NULL
               OR d.search_vector @@ v_tq
               OR d.title ILIKE v_like
               OR d.original_file_name ILIKE v_like
               OR EXISTS (SELECT 1 FROM public.dms_document_versions v2
                           WHERE v2.document_id = d.id AND v2.version_no = d.current_version_no AND v2.search_vector @@ v_tq)
               OR EXISTS (SELECT 1 FROM public.dms_field_values fv
                           WHERE fv.document_id = d.id AND NOT (fv.field_definition_id = ANY (v_blocked || v_hidden))
                             AND coalesce(fv.text_value, fv.number_value::text, fv.date_value::text) ILIKE v_like))
          AND NOT EXISTS (
              SELECT 1 FROM jsonb_array_elements(v_fields) ff
              WHERE NOT public.fn_dms_field_match(d.id, (ff ->> 'field_id')::uuid, ff ->> 'op', ff ->> 'value', ff ->> 'value2'))
    ), scored AS (
        SELECT c.id, c.updated_at,
               CASE
                   WHEN v_text IS NULL THEN NULL
                   WHEN c.dv @@ v_tq OR EXISTS (SELECT 1 FROM public.dms_documents x WHERE x.id = c.id AND (x.title ILIKE v_like OR x.original_file_name ILIKE v_like)) THEN 'title'
                   WHEN c.vv @@ v_tq THEN 'content'
                   WHEN EXISTS (SELECT 1 FROM public.dms_field_values fv
                                WHERE fv.document_id = c.id AND NOT (fv.field_definition_id = ANY (v_blocked || v_hidden))
                                  AND coalesce(fv.text_value, fv.number_value::text, fv.date_value::text) ILIKE v_like) THEN 'field'
               END AS hit,
               CASE WHEN v_text IS NULL THEN 0::real
                    ELSE greatest(coalesce(ts_rank(c.dv, v_tq), 0) * 2, coalesce(ts_rank(c.vv, v_tq), 0)) END AS score
        FROM cand c
    ), allowed AS (
        SELECT s.id, s.updated_at, s.hit, s.score
        FROM scored s
        WHERE (v_text IS NULL OR s.hit IS NOT NULL)
          AND public.fn_dms_flag(public.fn_dms_document_rights(p_user, s.id, p_base), 'view')
    )
    SELECT a.id, (a.score + CASE a.hit WHEN 'title' THEN 1 WHEN 'field' THEN 0.5 ELSE 0 END)::real,
           a.hit, count(*) OVER ()
    FROM allowed a
    ORDER BY 2 DESC, a.updated_at DESC
    LIMIT least(greatest(coalesce(p_limit, 50), 1), 200) OFFSET greatest(coalesce(p_offset, 0), 0);
END $$;

REVOKE ALL ON FUNCTION public.fn_dms_search(UUID, JSONB, UUID, JSONB, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_dms_search(UUID, JSONB, UUID, JSONB, INT, INT) TO service_role;
