-- Drawing Upload Metadata Enhancement (additive, preserves all existing records)
ALTER TABLE public.dmac_drawings
  ADD COLUMN IF NOT EXISTS reference_number TEXT,
  ADD COLUMN IF NOT EXISTS drawing_date DATE,
  ADD COLUMN IF NOT EXISTS drawing_type TEXT;

ALTER TABLE public.design_drawings
  ADD COLUMN IF NOT EXISTS reference_number TEXT,
  ADD COLUMN IF NOT EXISTS drawing_date DATE,
  ADD COLUMN IF NOT EXISTS drawing_type TEXT;

ALTER TABLE public.dmac_revision_files
  ADD COLUMN IF NOT EXISTS mime_type TEXT;

CREATE INDEX IF NOT EXISTS idx_dmac_drawings_ref_no
  ON public.dmac_drawings (project_id, reference_number)
  WHERE reference_number IS NOT NULL AND deleted_at IS NULL;

-- Update projection function to sync reference_number, drawing_date, drawing_type
CREATE OR REPLACE FUNCTION public.fn_dmac_project_drawing(p_drawing_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    d RECORD;
    v_ref TEXT;
    v_status TEXT;
    v_file RECORD;
    v_rev RECORD;
BEGIN
    SELECT dr.*, p.legacy_design_project_id AS legacy_project_id, p.name AS project_name,
           b.name AS building_name, b.code AS building_code, dep.name AS department_name
    INTO d
    FROM dmac_drawings dr
    JOIN dmac_projects p ON p.id = dr.project_id
    JOIN dmac_buildings b ON b.id = dr.building_id
    JOIN dmac_departments dep ON dep.id = dr.department_id
    WHERE dr.id = p_drawing_id;
    IF NOT FOUND THEN RETURN; END IF;

    v_ref := coalesce(d.legacy_drawing_id, d.id::TEXT);

    IF d.deleted_at IS NOT NULL THEN
        DELETE FROM design_drawings WHERE id = v_ref;
        RETURN;
    END IF;

    SELECT * INTO v_rev FROM dmac_drawing_revisions
    WHERE drawing_id = d.id AND is_superseded = false LIMIT 1;

    SELECT f.* INTO v_file FROM dmac_revision_files f
    WHERE f.revision_id = v_rev.id
    ORDER BY (f.file_role = 'PRIMARY_PDF') DESC, f.created_at LIMIT 1;

    v_status := CASE d.current_status
        WHEN 'UNDER_REVIEW' THEN 'Under Review'
        WHEN 'RETURNED' THEN 'Revision Requested'
        WHEN 'APPROVED' THEN 'Approved'
        WHEN 'GFC' THEN 'Approved (GFC)'
        ELSE 'Not Submitted' END;
    IF d.current_status = 'GFC' AND EXISTS (SELECT 1 FROM design_drawings WHERE id = v_ref AND status = 'Site Handed Over') THEN
        v_status := 'Site Handed Over';
    END IF;

    INSERT INTO design_drawings (id, project_id, project, tower_name, code, title, discipline, sub_package,
        reference_number, drawing_date, drawing_type,
        current_revision, status, consultant_name, file_url, file_size, submitted_date, approved_date,
        is_gfc, gfc_released_date, updated_at)
    VALUES (v_ref, d.legacy_project_id, d.project_name,
        CASE WHEN d.building_code = 'GEN' THEN NULL ELSE d.building_name END,
        d.drawing_number, d.title, left(d.department_name, 50), d.sub_package,
        d.reference_number, d.drawing_date, d.drawing_type,
        CASE WHEN d.latest_rev_no IS NULL THEN '–' ELSE 'R' || d.latest_rev_no END,
        v_status, d.consultant_name, v_file.storage_key,
        CASE WHEN v_file.file_size_bytes IS NULL THEN NULL
             WHEN v_file.file_size_bytes >= 1048576 THEN round(v_file.file_size_bytes / 1048576.0, 1) || ' MB'
             WHEN v_file.file_size_bytes >= 1024 THEN round(v_file.file_size_bytes / 1024.0, 1) || ' KB'
             ELSE v_file.file_size_bytes || ' B' END,
        (v_rev.submitted_at AT TIME ZONE 'Asia/Kolkata')::DATE,
        CASE WHEN d.current_status IN ('APPROVED', 'GFC') THEN (
            SELECT (max(s.decided_at) AT TIME ZONE 'Asia/Kolkata')::DATE FROM dmac_review_steps s
            WHERE s.revision_id = v_rev.id AND s.decision_code IN ('A', 'B')) END,
        coalesce(v_rev.is_gfc, false),
        (v_rev.gfc_released_at AT TIME ZONE 'Asia/Kolkata')::DATE,
        NOW())
    ON CONFLICT (id) DO UPDATE SET
        project_id = EXCLUDED.project_id, project = EXCLUDED.project, tower_name = EXCLUDED.tower_name,
        code = EXCLUDED.code, title = EXCLUDED.title, discipline = EXCLUDED.discipline,
        sub_package = EXCLUDED.sub_package,
        reference_number = EXCLUDED.reference_number,
        drawing_date = EXCLUDED.drawing_date,
        drawing_type = EXCLUDED.drawing_type,
        current_revision = EXCLUDED.current_revision,
        status = EXCLUDED.status, consultant_name = EXCLUDED.consultant_name,
        file_url = EXCLUDED.file_url, file_size = EXCLUDED.file_size,
        submitted_date = EXCLUDED.submitted_date, approved_date = EXCLUDED.approved_date,
        is_gfc = EXCLUDED.is_gfc, gfc_released_date = EXCLUDED.gfc_released_date, updated_at = NOW();
END $$;

-- Update registration function with optional reference_number, drawing_date, drawing_type
CREATE OR REPLACE FUNCTION public.fn_dmac_register_drawing(
    p_actor UUID, p_actor_email TEXT,
    p_project_id UUID, p_building_id UUID, p_department_id UUID,
    p_title TEXT, p_drawing_number TEXT DEFAULT NULL,
    p_floor_ids UUID[] DEFAULT '{}', p_primary_floor_id UUID DEFAULT NULL,
    p_planned_submission DATE DEFAULT NULL, p_planned_approval DATE DEFAULT NULL,
    p_design_owner UUID DEFAULT NULL, p_reviewer UUID DEFAULT NULL,
    p_consultant_name TEXT DEFAULT NULL, p_sub_package TEXT DEFAULT NULL,
    p_reference_number TEXT DEFAULT NULL, p_drawing_date DATE DEFAULT NULL,
    p_drawing_type TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_id UUID;
    v_number TEXT := upper(btrim(coalesce(p_drawing_number, '')));
    v_floor UUID;
    v_primary UUID := coalesce(p_primary_floor_id, p_floor_ids[1]);
    v_ref_no TEXT := nullif(btrim(coalesce(p_reference_number, '')), '');
    v_dtype TEXT := nullif(btrim(coalesce(p_drawing_type, '')), '');
BEGIN
    IF btrim(coalesce(p_title, '')) = '' THEN RAISE EXCEPTION 'DMAC: a drawing title is required'; END IF;
    IF NOT EXISTS (SELECT 1 FROM dmac_buildings WHERE id = p_building_id AND project_id = p_project_id AND deleted_at IS NULL) THEN
        RAISE EXCEPTION 'DMAC: that building is not part of this project';
    END IF;
    IF EXISTS (SELECT 1 FROM unnest(coalesce(p_floor_ids, '{}')) f
               WHERE NOT EXISTS (SELECT 1 FROM dmac_floors x WHERE x.id = f AND x.building_id = p_building_id AND x.deleted_at IS NULL)) THEN
        RAISE EXCEPTION 'DMAC: one of the floors is not in this building';
    END IF;
    IF p_planned_submission IS NOT NULL AND p_planned_approval IS NOT NULL AND p_planned_approval < p_planned_submission THEN
        RAISE EXCEPTION 'DMAC: the planned approval date is before the planned submission date';
    END IF;

    IF v_number = '' THEN
        v_number := fn_dmac_next_drawing_number(p_project_id, p_building_id, p_department_id);
    ELSIF EXISTS (SELECT 1 FROM dmac_drawings WHERE project_id = p_project_id AND drawing_number = v_number)
       OR EXISTS (SELECT 1 FROM design_drawings WHERE code = v_number) THEN
        RAISE EXCEPTION 'DMAC: drawing number % is already in the register', v_number;
    END IF;

    INSERT INTO dmac_drawings (project_id, building_id, department_id, drawing_number, title,
        planned_submission_date, planned_approval_date, design_owner_id, engineering_reviewer_id,
        consultant_name, sub_package, reference_number, drawing_date, drawing_type,
        current_status, current_holder, created_by)
    VALUES (p_project_id, p_building_id, p_department_id, v_number, btrim(p_title),
        p_planned_submission, p_planned_approval, p_design_owner, p_reviewer,
        nullif(btrim(coalesce(p_consultant_name, '')), ''), nullif(btrim(coalesce(p_sub_package, '')), ''),
        v_ref_no, p_drawing_date, v_dtype,
        'NOT_SUBMITTED', 'DESIGN', p_actor)
    RETURNING id INTO v_id;

    FOREACH v_floor IN ARRAY coalesce(p_floor_ids, '{}') LOOP
        INSERT INTO dmac_drawing_floors (drawing_id, floor_id, is_primary)
        VALUES (v_id, v_floor, v_floor = v_primary) ON CONFLICT DO NOTHING;
    END LOOP;

    PERFORM fn_dmac_audit(p_actor, p_actor_email, 'CREATE', 'DRAWING', v_id,
        jsonb_build_object('drawingNumber', v_number, 'title', p_title, 'referenceNumber', v_ref_no, 'drawingType', v_dtype));
    RETURN v_id;
END $$;

-- Update submit_revision to also store mime_type on dmac_revision_files
CREATE OR REPLACE FUNCTION public.fn_dmac_submit_revision(
    p_actor UUID, p_actor_email TEXT, p_actor_name TEXT,
    p_drawing_id UUID, p_files JSONB, p_responses JSONB DEFAULT '[]', p_change_summary TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    d RECORD;
    v_current RECORD;
    v_next INT;
    v_rev UUID;
    v_missing INT;
    v_file JSONB;
    v_resp JSONB;
BEGIN
    SELECT * INTO d FROM dmac_drawings WHERE id = p_drawing_id AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'DMAC: drawing not found'; END IF;
    IF d.current_status = 'UNDER_REVIEW' THEN
        RAISE EXCEPTION 'DMAC: R% is still under review. Wait for the review decision before submitting a new revision', d.latest_rev_no;
    END IF;
    IF jsonb_typeof(p_files) <> 'array' OR jsonb_array_length(p_files) = 0 THEN
        RAISE EXCEPTION 'DMAC: attach the drawing file for this revision';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_files) f WHERE f->>'fileRole' = 'PRIMARY_PDF') THEN
        RAISE EXCEPTION 'DMAC: one file must be the primary sheet';
    END IF;

    SELECT * INTO v_current FROM dmac_drawing_revisions WHERE drawing_id = d.id AND is_superseded = false;

    IF v_current.id IS NOT NULL THEN
        SELECT count(*) INTO v_missing
        FROM dmac_drawing_comments c
        WHERE c.revision_id = v_current.id AND c.status = 'OPEN'
          AND NOT EXISTS (
              SELECT 1 FROM jsonb_array_elements(coalesce(p_responses, '[]')) r
              WHERE (r->>'commentId')::UUID = c.id AND btrim(coalesce(r->>'message', '')) <> '');
        IF v_missing > 0 THEN
            RAISE EXCEPTION 'DMAC: % open comment(s) on R% still need a response before resubmitting', v_missing, v_current.rev_no;
        END IF;
        UPDATE dmac_drawing_revisions SET is_superseded = true WHERE id = v_current.id;
    END IF;

    v_next := CASE WHEN d.latest_rev_no IS NULL THEN 0 ELSE d.latest_rev_no + 1 END;

    INSERT INTO dmac_drawing_revisions (drawing_id, rev_no, submitted_by, submitted_by_name, submitted_at, change_summary)
    VALUES (d.id, v_next, p_actor, p_actor_name, NOW(), nullif(btrim(coalesce(p_change_summary, '')), ''))
    RETURNING id INTO v_rev;

    FOR v_file IN SELECT * FROM jsonb_array_elements(p_files) LOOP
        INSERT INTO dmac_revision_files (revision_id, file_role, storage_key, file_name, file_size_bytes, checksum_sha256, mime_type)
        VALUES (v_rev, v_file->>'fileRole', v_file->>'storageKey', v_file->>'fileName',
                (v_file->>'fileSizeBytes')::BIGINT, lower(v_file->>'checksumSha256'),
                nullif(btrim(coalesce(v_file->>'mimeType', '')), ''));
    END LOOP;

    IF v_current.id IS NOT NULL THEN
        FOR v_resp IN SELECT * FROM jsonb_array_elements(coalesce(p_responses, '[]')) LOOP
            INSERT INTO dmac_comment_threads (comment_id, author_id, author_role, message, revision_id, author_email)
            SELECT c.id, p_actor, 'DESIGN', btrim(v_resp->>'message'), v_rev, p_actor_email
            FROM dmac_drawing_comments c
            WHERE c.id = (v_resp->>'commentId')::UUID AND c.revision_id = v_current.id AND c.status = 'OPEN';
            UPDATE dmac_drawing_comments SET status = 'RESOLVED', resolved_in_revision_id = v_rev
            WHERE id = (v_resp->>'commentId')::UUID AND revision_id = v_current.id AND status = 'OPEN';
        END LOOP;
    END IF;

    UPDATE dmac_drawings SET latest_rev_no = v_next, current_status = 'UNDER_REVIEW',
        current_holder = 'ENGINEERING', status_changed_at = NOW(), updated_at = NOW()
    WHERE id = d.id;

    PERFORM fn_dmac_project_revision(v_rev);

    PERFORM fn_dmac_audit(p_actor, p_actor_email, 'UPLOAD', 'REVISION', v_rev,
        jsonb_build_object('drawingId', d.id, 'drawingNumber', d.drawing_number, 'revision', 'R' || v_next,
                           'files', jsonb_array_length(p_files)));
    RETURN jsonb_build_object('revisionId', v_rev, 'revNo', v_next, 'status', 'UNDER_REVIEW');
END $$;
