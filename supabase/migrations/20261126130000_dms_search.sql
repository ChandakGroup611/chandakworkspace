-- ==============================================================================
-- DMAC step 3b: DMS search
--
-- One search across a workspace (or one folder and everything under it) that matches
-- the title, file name, text inside the current version (OCR), and custom field values,
-- with filters by document type, QC status, dates, master record and fields.
-- Results go through the same six-layer rights as everything else
-- (fn_dms_document_rights), so a search never reveals a document you can't open.
-- Service role only, like the other fn_dms_* functions.
-- ==============================================================================

-- Title and file name, searchable by words; trigram indexes for partial matches
ALTER TABLE public.dms_documents
    ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(original_file_name, ''))) STORED;
CREATE INDEX IF NOT EXISTS idx_dms_documents_search ON public.dms_documents USING gin (search_vector);
CREATE INDEX IF NOT EXISTS idx_dms_documents_title_trgm ON public.dms_documents USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_dms_documents_ws_live ON public.dms_documents (workspace_id, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dms_saved_views_owner ON public.dms_saved_views (owner_id, workspace_id);

-- Fields the person's groups may not search on (dms_field_visibility.allow_in_search = false)
CREATE OR REPLACE FUNCTION public.fn_dms_unsearchable_fields(p_user UUID, p_workspace UUID, p_base JSONB)
RETURNS UUID[] LANGUAGE sql STABLE AS $$
    SELECT CASE WHEN public.fn_dms_flag(p_base, 'admin') THEN '{}'::UUID[] ELSE coalesce((
        SELECT array_agg(field_definition_id)
        FROM (
            SELECT field_definition_id
            FROM public.dms_field_visibility
            WHERE group_id = ANY (public.fn_dms_user_groups(p_user, p_workspace))
            GROUP BY field_definition_id
            HAVING NOT bool_or(coalesce(allow_in_search, true))
        ) h
    ), '{}'::UUID[]) END
$$;

-- One field filter: op is eq, contains, gte, lte or between
CREATE OR REPLACE FUNCTION public.fn_dms_field_match(p_document UUID, p_field UUID, p_op TEXT, p_value TEXT, p_value2 TEXT)
RETURNS boolean LANGUAGE plpgsql STABLE AS $$
DECLARE
    fv RECORD;
    v_num boolean := coalesce(p_value, '') ~ '^-?[0-9]+(\.[0-9]+)?$';
    v_date boolean := coalesce(p_value, '') ~ '^\d{4}-\d{2}-\d{2}$';
BEGIN
    SELECT * INTO fv FROM public.dms_field_values WHERE document_id = p_document AND field_definition_id = p_field;
    IF NOT FOUND THEN RETURN false; END IF;
    CASE lower(coalesce(p_op, 'eq'))
        WHEN 'contains' THEN
            RETURN coalesce(fv.text_value, fv.number_value::text, fv.date_value::text, '') ILIKE
                   '%' || replace(replace(replace(p_value, '\', '\\'), '%', '\%'), '_', '\_') || '%';
        WHEN 'gte' THEN
            RETURN CASE WHEN v_num THEN fv.number_value >= p_value::numeric
                        WHEN v_date THEN fv.date_value >= p_value::date
                        ELSE fv.text_value >= p_value END;
        WHEN 'lte' THEN
            RETURN CASE WHEN v_num THEN fv.number_value <= p_value::numeric
                        WHEN v_date THEN fv.date_value <= p_value::date
                        ELSE fv.text_value <= p_value END;
        WHEN 'between' THEN
            RETURN CASE WHEN v_num AND p_value2 ~ '^-?[0-9]+(\.[0-9]+)?$' THEN fv.number_value BETWEEN p_value::numeric AND p_value2::numeric
                        WHEN v_date AND p_value2 ~ '^\d{4}-\d{2}-\d{2}$' THEN fv.date_value BETWEEN p_value::date AND p_value2::date
                        ELSE false END;
        ELSE
            RETURN lower(coalesce(fv.text_value, fv.number_value::text, fv.date_value::text,
                                  CASE WHEN fv.json_value = 'true'::jsonb THEN 'yes' WHEN fv.json_value = 'false'::jsonb THEN 'no' END, ''))
                   = lower(trim(p_value))
                OR (fv.json_value IS NOT NULL AND lower(trim(p_value)) IN ('true', 'yes', '1') AND fv.json_value = 'true'::jsonb)
                OR (fv.json_value IS NOT NULL AND lower(trim(p_value)) IN ('false', 'no', '0') AND fv.json_value = 'false'::jsonb)
                OR (v_num AND fv.number_value = p_value::numeric)
                OR (v_date AND fv.date_value = p_value::date);
    END CASE;
END $$;

/*
 p_filters (all optional):
   {"text": "...", "folder_id": uuid, "subfolders": true, "doc_type_id": uuid,
    "status": "PENDING|APPROVED|REJECTED", "from": "YYYY-MM-DD", "to": "YYYY-MM-DD",
    "master_record_id": uuid, "checked_out": true,
    "fields": [{"field_id": uuid, "op": "eq|contains|gte|lte|between", "value": "...", "value2": "..."}]}
 Returns one page of matches the person can open, best match first, plus the total.
*/
CREATE OR REPLACE FUNCTION public.fn_dms_search(p_user UUID, p_base JSONB, p_workspace UUID, p_filters JSONB, p_limit INT, p_offset INT)
RETURNS TABLE (document_id UUID, rank REAL, matched_in TEXT, total BIGINT)
LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_text TEXT := nullif(trim(coalesce(p_filters ->> 'text', '')), '');
    v_like TEXT;
    v_tq tsquery;
    v_folder UUID := nullif(p_filters ->> 'folder_id', '')::uuid;
    v_path ltree;
    v_sub boolean := coalesce((p_filters ->> 'subfolders')::boolean, true);
    v_type UUID := nullif(p_filters ->> 'doc_type_id', '')::uuid;
    v_status TEXT := nullif(p_filters ->> 'status', '');
    v_from DATE := nullif(p_filters ->> 'from', '')::date;
    v_to DATE := nullif(p_filters ->> 'to', '')::date;
    v_master UUID := nullif(p_filters ->> 'master_record_id', '')::uuid;
    v_checked_out boolean := coalesce((p_filters ->> 'checked_out')::boolean, false);
    v_fields JSONB := coalesce(p_filters -> 'fields', '[]'::jsonb);
    v_blocked UUID[];
    v_hidden UUID[];
    f jsonb;
BEGIN
    IF v_text IS NOT NULL THEN
        PERFORM public.fn_dms_raise_unless(length(v_text) <= 200, 'Search text is too long.');
        v_tq := websearch_to_tsquery('simple', v_text);
        v_like := '%' || replace(replace(replace(v_text, '\', '\\'), '%', '\%'), '_', '\_') || '%';
    END IF;
    IF v_status IS NOT NULL THEN
        PERFORM public.fn_dms_raise_unless(v_status IN ('PENDING', 'APPROVED', 'REJECTED'), 'Unknown QC status.');
    END IF;
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
          AND (v_folder IS NULL OR d.folder_id = v_folder
               OR (v_sub AND d.folder_id IN (SELECT c.id FROM public.dms_folders c WHERE c.path <@ v_path AND c.deleted_at IS NULL)))
          AND (v_type IS NULL OR d.doc_type_id = v_type)
          AND (v_status IS NULL OR d.approval_status = v_status)
          AND (v_from IS NULL OR d.updated_at >= v_from)
          AND (v_to IS NULL OR d.updated_at < v_to + 1)
          AND (v_master IS NULL OR EXISTS (SELECT 1 FROM public.dms_document_master_tags t WHERE t.document_id = d.id AND t.master_record_id = v_master))
          AND (NOT v_checked_out OR EXISTS (SELECT 1 FROM public.dms_document_locks l WHERE l.document_id = d.id AND l.expires_at > now()))
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

DO $$
DECLARE
    fn TEXT;
BEGIN
    FOR fn IN
        SELECT p.oid::regprocedure::text FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname IN ('fn_dms_unsearchable_fields', 'fn_dms_field_match', 'fn_dms_search')
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    END LOOP;
END $$;
