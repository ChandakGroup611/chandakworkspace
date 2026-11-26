-- ==============================================================================
-- DMAC step 1: the drawing review loop runs on dmac_* as the single source of truth
--
-- * Masters stay where people edit them today (design_projects, design_towers,
--   design_packages). Triggers mirror them into dmac_projects, dmac_buildings,
--   dmac_floors and dmac_departments.
-- * Every drawing change goes through four transactional functions:
--     fn_dmac_register_drawing, fn_dmac_submit_revision,
--     fn_dmac_record_review, fn_dmac_release_gfc
--   They are callable by the service role only (server actions check the
--   person's Design access first).
-- * design_drawings / design_drawing_revisions become a read projection kept up
--   to date by triggers, so the existing register, queue, GFC and report screens
--   keep working unchanged.
-- * Existing design_drawings rows are imported once, keeping their ids.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Link columns and small schema additions
-- ------------------------------------------------------------------------------
ALTER TABLE public.dmac_projects    ADD COLUMN IF NOT EXISTS legacy_design_project_id TEXT UNIQUE;
ALTER TABLE public.dmac_buildings   ADD COLUMN IF NOT EXISTS legacy_tower_id TEXT UNIQUE;
ALTER TABLE public.dmac_departments ADD COLUMN IF NOT EXISTS legacy_package_id TEXT UNIQUE;

ALTER TABLE public.dmac_drawings ADD COLUMN IF NOT EXISTS legacy_drawing_id TEXT UNIQUE;
ALTER TABLE public.dmac_drawings ADD COLUMN IF NOT EXISTS consultant_name VARCHAR(200);
ALTER TABLE public.dmac_drawings ADD COLUMN IF NOT EXISTS sub_package VARCHAR(200);
ALTER TABLE public.dmac_drawings ADD COLUMN IF NOT EXISTS created_by UUID;

ALTER TABLE public.dmac_drawing_revisions ADD COLUMN IF NOT EXISTS change_summary TEXT;
ALTER TABLE public.dmac_drawing_revisions ADD COLUMN IF NOT EXISTS submitted_by_name VARCHAR(200);
ALTER TABLE public.dmac_drawing_revisions ADD COLUMN IF NOT EXISTS imported_from_legacy BOOLEAN DEFAULT false;

-- Files imported from the old register have no recorded checksum. New files must have a real one.
ALTER TABLE public.dmac_revision_files ALTER COLUMN checksum_sha256 DROP NOT NULL;
ALTER TABLE public.dmac_revision_files DROP CONSTRAINT IF EXISTS chk_dmac_revision_file_checksum;
ALTER TABLE public.dmac_revision_files ADD CONSTRAINT chk_dmac_revision_file_checksum
    CHECK (checksum_sha256 IS NULL OR checksum_sha256 ~ '^[0-9a-f]{64}$');

ALTER TABLE public.dmac_review_steps DROP CONSTRAINT IF EXISTS chk_dmac_review_code;
ALTER TABLE public.dmac_review_steps ADD CONSTRAINT chk_dmac_review_code
    CHECK (decision_code IS NULL OR decision_code IN ('A', 'B', 'C', 'D'));

ALTER TABLE public.dmac_drawings DROP CONSTRAINT IF EXISTS chk_dmac_drawing_status;
ALTER TABLE public.dmac_drawings ADD CONSTRAINT chk_dmac_drawing_status
    CHECK (current_status IN ('NOT_SUBMITTED', 'UNDER_REVIEW', 'RETURNED', 'APPROVED', 'GFC'));

-- One default workspace for drawings (created by the core migration; ensure it exists)
INSERT INTO public.dms_workspaces (code, name) VALUES ('CHANDAK_CORP', 'Chandak Group Corporate')
ON CONFLICT (code) DO NOTHING;

-- Department codes the old register used as discipline names
INSERT INTO public.dmac_departments (code, name) VALUES
    ('MEP', 'MEP'),
    ('LND', 'Landscape'),
    ('INT', 'Interior')
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. Masters mirror: design_projects / design_towers / design_packages -> dmac_*
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_dmac_floor_code(n INT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$ SELECT CASE WHEN n < 10 THEN 'F0' || n ELSE 'F' || n END $$;

-- Floors follow the convention the matrix screen already uses: B1, GF, F01..Fn, TR.
CREATE OR REPLACE FUNCTION public.fn_dmac_ensure_floors(p_building_id UUID, p_total_floors INT)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    n INT := GREATEST(coalesce(p_total_floors, 0), 0);
    i INT;
BEGIN
    INSERT INTO dmac_floors (building_id, code, name, floor_order) VALUES
        (p_building_id, 'B1', 'Basement 1', 0),
        (p_building_id, 'GF', 'Ground Floor', 1)
    ON CONFLICT (building_id, code) DO NOTHING;
    FOR i IN 1..n LOOP
        INSERT INTO dmac_floors (building_id, code, name, floor_order)
        VALUES (p_building_id, fn_dmac_floor_code(i), 'Floor ' || i, i + 1)
        ON CONFLICT (building_id, code) DO UPDATE SET deleted_at = NULL, floor_order = EXCLUDED.floor_order;
    END LOOP;
    -- Terrace sits above the top floor; floors above a reduced count are retired, not deleted
    INSERT INTO dmac_floors (building_id, code, name, floor_order)
    VALUES (p_building_id, 'TR', 'Terrace', n + 2)
    ON CONFLICT (building_id, code) DO UPDATE SET floor_order = EXCLUDED.floor_order, deleted_at = NULL;
    UPDATE dmac_floors SET deleted_at = NOW()
    WHERE building_id = p_building_id AND deleted_at IS NULL
      AND code ~ '^F[0-9]+$' AND substring(code from 2)::INT > n;
END $$;

CREATE OR REPLACE FUNCTION public.fn_dmac_sync_project(p_legacy_id TEXT)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_ws UUID;
    v_id UUID;
    p RECORD;
BEGIN
    SELECT * INTO p FROM design_projects WHERE id = p_legacy_id;
    IF NOT FOUND THEN RETURN NULL; END IF;
    SELECT id INTO v_ws FROM dms_workspaces WHERE code = 'CHANDAK_CORP';

    INSERT INTO dmac_projects (workspace_id, code, name, legacy_design_project_id)
    VALUES (v_ws, p.code, p.name, p.id)
    ON CONFLICT (legacy_design_project_id) DO UPDATE
        SET code = EXCLUDED.code, name = EXCLUDED.name, updated_at = NOW(), deleted_at = NULL
    RETURNING id INTO v_id;

    -- Every project gets a "General" building for drawings that are not tower-specific
    INSERT INTO dmac_buildings (project_id, code, name, sort_order)
    VALUES (v_id, 'GEN', 'General / site-wide', 9999)
    ON CONFLICT (project_id, code) DO NOTHING;
    INSERT INTO dmac_floors (building_id, code, name, floor_order)
    SELECT b.id, 'SITE', 'Whole site', 0 FROM dmac_buildings b WHERE b.project_id = v_id AND b.code = 'GEN'
    ON CONFLICT (building_id, code) DO NOTHING;
    RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.fn_dmac_sync_tower(p_tower_id TEXT)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    t RECORD;
    v_project UUID;
    v_code TEXT;
    v_id UUID;
BEGIN
    SELECT * INTO t FROM design_towers WHERE id = p_tower_id;
    IF NOT FOUND THEN RETURN NULL; END IF;
    SELECT id INTO v_project FROM dmac_projects WHERE legacy_design_project_id = t.project_id;
    IF v_project IS NULL THEN v_project := fn_dmac_sync_project(t.project_id); END IF;
    IF v_project IS NULL THEN RETURN NULL; END IF;

    v_code := upper(left(coalesce(nullif(t.sub_project_code, ''), regexp_replace(t.tower_name, '[^A-Za-z0-9]+', '', 'g'), t.id), 40));
    -- Two towers with the same short code in one project: keep them apart with the tower id
    IF EXISTS (SELECT 1 FROM dmac_buildings WHERE project_id = v_project AND code = v_code
               AND coalesce(legacy_tower_id, '') <> t.id) THEN
        v_code := left(v_code, 30) || '-' || right(t.id, 8);
    END IF;

    INSERT INTO dmac_buildings (project_id, code, name, legacy_tower_id)
    VALUES (v_project, v_code, t.tower_name, t.id)
    ON CONFLICT (legacy_tower_id) DO UPDATE
        SET project_id = EXCLUDED.project_id, name = EXCLUDED.name, deleted_at = NULL
    RETURNING id INTO v_id;

    PERFORM fn_dmac_ensure_floors(v_id, t.total_floors);
    RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.fn_dmac_sync_package(p_package_id TEXT)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    k RECORD;
    v_id UUID;
BEGIN
    SELECT * INTO k FROM design_packages WHERE id = p_package_id;
    IF NOT FOUND THEN RETURN NULL; END IF;
    -- A package whose code already exists as a department is linked to it, not duplicated
    UPDATE dmac_departments SET legacy_package_id = k.id, name = k.name
    WHERE upper(code) = upper(left(k.code, 20)) AND (legacy_package_id IS NULL OR legacy_package_id = k.id)
    RETURNING id INTO v_id;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
    INSERT INTO dmac_departments (code, name, legacy_package_id)
    VALUES (upper(left(k.code, 20)), k.name, k.id)
    ON CONFLICT (legacy_package_id) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_id;
    RETURN v_id;
EXCEPTION WHEN unique_violation THEN
    -- Code taken by another package: leave this package unlinked rather than fail the master save
    RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.trg_dmac_mirror_design_master()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF TG_TABLE_NAME = 'design_projects' THEN
            UPDATE dmac_projects SET deleted_at = NOW() WHERE legacy_design_project_id = OLD.id;
        ELSIF TG_TABLE_NAME = 'design_towers' THEN
            UPDATE dmac_buildings SET deleted_at = NOW() WHERE legacy_tower_id = OLD.id;
        END IF;
        RETURN OLD;
    END IF;
    IF TG_TABLE_NAME = 'design_projects' THEN
        PERFORM fn_dmac_sync_project(NEW.id);
    ELSIF TG_TABLE_NAME = 'design_towers' THEN
        PERFORM fn_dmac_sync_tower(NEW.id);
    ELSIF TG_TABLE_NAME = 'design_packages' THEN
        PERFORM fn_dmac_sync_package(NEW.id);
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dmac_mirror_project ON public.design_projects;
CREATE TRIGGER trg_dmac_mirror_project AFTER INSERT OR UPDATE OR DELETE ON public.design_projects
    FOR EACH ROW EXECUTE FUNCTION public.trg_dmac_mirror_design_master();
DROP TRIGGER IF EXISTS trg_dmac_mirror_tower ON public.design_towers;
CREATE TRIGGER trg_dmac_mirror_tower AFTER INSERT OR UPDATE OR DELETE ON public.design_towers
    FOR EACH ROW EXECUTE FUNCTION public.trg_dmac_mirror_design_master();
DROP TRIGGER IF EXISTS trg_dmac_mirror_package ON public.design_packages;
CREATE TRIGGER trg_dmac_mirror_package AFTER INSERT OR UPDATE ON public.design_packages
    FOR EACH ROW EXECUTE FUNCTION public.trg_dmac_mirror_design_master();

-- History must survive: deleting a drawing no longer cascades to its revisions
ALTER TABLE public.design_drawing_revisions DROP CONSTRAINT IF EXISTS design_drawing_revisions_drawing_id_fkey;

-- ------------------------------------------------------------------------------
-- 3. Projection: dmac_* -> design_drawings / design_drawing_revisions
-- ------------------------------------------------------------------------------
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
    -- Site hand-over is recorded on the projection by the GFC hand-over screen; keep it while still GFC
    IF d.current_status = 'GFC' AND EXISTS (SELECT 1 FROM design_drawings WHERE id = v_ref AND status = 'Site Handed Over') THEN
        v_status := 'Site Handed Over';
    END IF;

    INSERT INTO design_drawings (id, project_id, project, tower_name, code, title, discipline, sub_package,
        current_revision, status, consultant_name, file_url, file_size, submitted_date, approved_date,
        is_gfc, gfc_released_date, updated_at)
    VALUES (v_ref, d.legacy_project_id, d.project_name,
        CASE WHEN d.building_code = 'GEN' THEN NULL ELSE d.building_name END,
        d.drawing_number, d.title, left(d.department_name, 50), d.sub_package,
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
        sub_package = EXCLUDED.sub_package, current_revision = EXCLUDED.current_revision,
        status = EXCLUDED.status, consultant_name = EXCLUDED.consultant_name,
        file_url = coalesce(EXCLUDED.file_url, design_drawings.file_url),
        file_size = coalesce(EXCLUDED.file_size, design_drawings.file_size),
        submitted_date = coalesce(EXCLUDED.submitted_date, design_drawings.submitted_date),
        approved_date = EXCLUDED.approved_date, is_gfc = EXCLUDED.is_gfc,
        gfc_released_date = EXCLUDED.gfc_released_date, updated_at = NOW();
END $$;

CREATE OR REPLACE FUNCTION public.trg_dmac_project_drawing()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_TABLE_NAME = 'dmac_drawings' THEN
        PERFORM fn_dmac_project_drawing(NEW.id);
    ELSE
        PERFORM fn_dmac_project_drawing(NEW.drawing_id);
    END IF;
    RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_dmac_project_drawing ON public.dmac_drawings;
CREATE TRIGGER trg_dmac_project_drawing AFTER INSERT OR UPDATE ON public.dmac_drawings
    FOR EACH ROW EXECUTE FUNCTION public.trg_dmac_project_drawing();
DROP TRIGGER IF EXISTS trg_dmac_project_revision ON public.dmac_drawing_revisions;
CREATE TRIGGER trg_dmac_project_revision AFTER UPDATE ON public.dmac_drawing_revisions
    FOR EACH ROW EXECUTE FUNCTION public.trg_dmac_project_drawing();

-- Renaming a project or tower renames it on every drawing in the register
CREATE OR REPLACE FUNCTION public.trg_dmac_reproject_on_master()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.name IS DISTINCT FROM OLD.name THEN
        IF TG_TABLE_NAME = 'dmac_projects' THEN
            PERFORM fn_dmac_project_drawing(id) FROM dmac_drawings WHERE project_id = NEW.id AND deleted_at IS NULL;
        ELSE
            PERFORM fn_dmac_project_drawing(id) FROM dmac_drawings WHERE building_id = NEW.id AND deleted_at IS NULL;
        END IF;
    END IF;
    RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_dmac_reproject_project ON public.dmac_projects;
CREATE TRIGGER trg_dmac_reproject_project AFTER UPDATE OF name ON public.dmac_projects
    FOR EACH ROW EXECUTE FUNCTION public.trg_dmac_reproject_on_master();
DROP TRIGGER IF EXISTS trg_dmac_reproject_building ON public.dmac_buildings;
CREATE TRIGGER trg_dmac_reproject_building AFTER UPDATE OF name ON public.dmac_buildings
    FOR EACH ROW EXECUTE FUNCTION public.trg_dmac_reproject_on_master();

-- One ledger row per submitted revision, keyed by the revision id
CREATE OR REPLACE FUNCTION public.fn_dmac_project_revision(p_revision_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    r RECORD;
BEGIN
    SELECT rv.*, coalesce(dr.legacy_drawing_id, dr.id::TEXT) AS drawing_ref,
           (SELECT f.storage_key FROM dmac_revision_files f WHERE f.revision_id = rv.id
             ORDER BY (f.file_role = 'PRIMARY_PDF') DESC, f.created_at LIMIT 1) AS file_key,
           (SELECT f.file_size_bytes FROM dmac_revision_files f WHERE f.revision_id = rv.id
             ORDER BY (f.file_role = 'PRIMARY_PDF') DESC, f.created_at LIMIT 1) AS file_bytes,
           (SELECT s.decision_code || coalesce(': ' || s.remarks, '') FROM dmac_review_steps s
             WHERE s.revision_id = rv.id AND s.decided_at IS NOT NULL ORDER BY s.decided_at DESC LIMIT 1) AS decision
    INTO r
    FROM dmac_drawing_revisions rv JOIN dmac_drawings dr ON dr.id = rv.drawing_id
    WHERE rv.id = p_revision_id;
    IF NOT FOUND OR r.imported_from_legacy THEN RETURN; END IF;

    INSERT INTO design_drawing_revisions (id, drawing_id, revision_number, file_url, file_size, changes_summary, submitted_by, approved_by, created_at)
    VALUES (r.id::TEXT, r.drawing_ref, 'R' || r.rev_no, r.file_key,
            CASE WHEN r.file_bytes IS NULL THEN NULL ELSE round(r.file_bytes / 1048576.0, 2) || ' MB' END,
            r.change_summary, left(r.submitted_by_name, 150), left(r.decision, 150), r.submitted_at)
    ON CONFLICT (id) DO UPDATE SET file_url = EXCLUDED.file_url, file_size = EXCLUDED.file_size,
        changes_summary = EXCLUDED.changes_summary, approved_by = EXCLUDED.approved_by;
END $$;

-- ------------------------------------------------------------------------------
-- 4. Import existing design_drawings once (ids kept, so links and history still work)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_dmac_department_for_discipline(p_discipline TEXT)
RETURNS UUID LANGUAGE sql STABLE AS $$
    SELECT id FROM dmac_departments
    WHERE upper(code) = upper(p_discipline) OR lower(name) = lower(p_discipline)
       OR code = CASE lower(coalesce(p_discipline, ''))
            WHEN 'architectural' THEN 'ARC' WHEN 'architecture' THEN 'ARC'
            WHEN 'structural' THEN 'STR' WHEN 'mep' THEN 'MEP'
            WHEN 'landscape' THEN 'LND' WHEN 'interior' THEN 'INT'
            WHEN 'electrical' THEN 'ELE' WHEN 'plumbing' THEN 'PLB'
            WHEN 'hvac' THEN 'HVAC' WHEN 'fire' THEN 'FIRE' ELSE NULL END
    ORDER BY (upper(code) = upper(p_discipline)) DESC
    LIMIT 1
$$;

DO $$
DECLARE
    r RECORD;
    v_project UUID;
    v_building UUID;
    v_dept UUID;
    v_rev INT;
    v_status TEXT;
    v_drawing UUID;
    v_revision UUID;
    v_number TEXT;
BEGIN
    PERFORM fn_dmac_sync_project(id) FROM design_projects;
    PERFORM fn_dmac_sync_tower(id) FROM design_towers;
    PERFORM fn_dmac_sync_package(id) FROM design_packages;

    -- The projection triggers would rewrite the rows being imported; switch them off for the import
    ALTER TABLE dmac_drawings DISABLE TRIGGER trg_dmac_project_drawing;
    ALTER TABLE dmac_drawing_revisions DISABLE TRIGGER trg_dmac_project_revision;

    FOR r IN SELECT * FROM design_drawings dd
             WHERE NOT EXISTS (SELECT 1 FROM dmac_drawings x WHERE x.legacy_drawing_id = dd.id)
               AND NOT EXISTS (SELECT 1 FROM dmac_drawings x WHERE x.id::TEXT = dd.id)
             ORDER BY created_at
    LOOP
        SELECT id INTO v_project FROM dmac_projects WHERE legacy_design_project_id = r.project_id;
        IF v_project IS NULL THEN
            SELECT p.id INTO v_project FROM dmac_projects p WHERE lower(p.name) = lower(r.project) LIMIT 1;
        END IF;
        IF v_project IS NULL THEN
            RAISE NOTICE 'DMAC import: drawing % (%) has no matching project, skipped', r.code, r.id;
            CONTINUE;
        END IF;

        SELECT b.id INTO v_building FROM dmac_buildings b
        JOIN design_towers t ON t.id = b.legacy_tower_id
        WHERE b.project_id = v_project AND r.tower_name IS NOT NULL AND lower(t.tower_name) = lower(r.tower_name)
        LIMIT 1;
        IF v_building IS NULL THEN
            SELECT id INTO v_building FROM dmac_buildings WHERE project_id = v_project AND code = 'GEN';
        END IF;

        v_dept := fn_dmac_department_for_discipline(r.discipline);
        IF v_dept IS NULL THEN
            INSERT INTO dmac_departments (code, name)
            VALUES (upper(left(regexp_replace(r.discipline, '[^A-Za-z0-9]+', '', 'g'), 20)), left(r.discipline, 100))
            ON CONFLICT (code) DO UPDATE SET name = dmac_departments.name
            RETURNING id INTO v_dept;
        END IF;

        v_rev := coalesce(nullif(regexp_replace(coalesce(r.current_revision, ''), '[^0-9]', '', 'g'), '')::INT, 0);
        v_status := CASE
            WHEN r.is_gfc OR r.status IN ('Approved (GFC)', 'Site Handed Over') THEN 'GFC'
            WHEN r.status = 'Revision Requested' THEN 'RETURNED'
            WHEN r.status = 'Approved' THEN 'APPROVED'
            ELSE 'UNDER_REVIEW' END;

        v_number := r.code;
        IF EXISTS (SELECT 1 FROM dmac_drawings WHERE project_id = v_project AND drawing_number = v_number) THEN
            v_number := left(r.code, 90) || '-' || right(r.id, 6);
        END IF;

        INSERT INTO dmac_drawings (project_id, building_id, department_id, drawing_number, title,
            current_status, current_holder, latest_rev_no, status_changed_at, legacy_drawing_id,
            consultant_name, sub_package, created_at)
        VALUES (v_project, v_building, v_dept, v_number, r.title, v_status,
            CASE v_status WHEN 'UNDER_REVIEW' THEN 'ENGINEERING' WHEN 'RETURNED' THEN 'DESIGN' ELSE 'NONE' END,
            v_rev, coalesce(r.updated_at, r.created_at, NOW()), r.id, r.consultant_name, r.sub_package,
            coalesce(r.created_at, NOW()))
        RETURNING id INTO v_drawing;

        INSERT INTO dmac_drawing_revisions (drawing_id, rev_no, submitted_at, is_gfc, gfc_released_at,
            qr_code_token, imported_from_legacy, change_summary)
        VALUES (v_drawing, v_rev, coalesce(r.submitted_date::TIMESTAMPTZ, r.created_at, NOW()),
            v_status = 'GFC',
            CASE WHEN v_status = 'GFC' THEN coalesce(r.gfc_released_date::TIMESTAMPTZ, r.approved_date::TIMESTAMPTZ, r.updated_at) END,
            CASE WHEN v_status = 'GFC' THEN translate(encode(gen_random_bytes(24), 'base64'), '+/=', '-_') END,
            true, 'Imported from the previous drawing register')
        RETURNING id INTO v_revision;

        IF r.file_url IS NOT NULL AND r.file_url <> '' THEN
            INSERT INTO dmac_revision_files (revision_id, file_role, storage_key, file_name, file_size_bytes, checksum_sha256)
            VALUES (v_revision, 'PRIMARY_PDF', r.file_url, coalesce(nullif(regexp_replace(r.file_url, '^.*[/:]', ''), ''), r.code), 0, NULL);
        END IF;
    END LOOP;

    ALTER TABLE dmac_drawings ENABLE TRIGGER trg_dmac_project_drawing;
    ALTER TABLE dmac_drawing_revisions ENABLE TRIGGER trg_dmac_project_revision;
END $$;

-- ------------------------------------------------------------------------------
-- 5. Numbering: <PROJECT>-<BUILDING>-<DEPT>-<NNN>, one counter per project x department
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_dmac_next_drawing_number(p_project_id UUID, p_building_id UUID, p_department_id UUID)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    v_seq INT;
    v_number TEXT;
BEGIN
    LOOP
        INSERT INTO dmac_number_sequences (project_id, department_id, current_seq)
        VALUES (p_project_id, p_department_id, 1)
        ON CONFLICT (project_id, department_id)
        DO UPDATE SET current_seq = dmac_number_sequences.current_seq + 1, updated_at = NOW()
        RETURNING current_seq INTO v_seq;

        SELECT upper(p.code) || '-' || upper(b.code) || '-' || upper(dep.code) || '-' || lpad(v_seq::TEXT, 3, '0')
        INTO v_number
        FROM dmac_projects p, dmac_buildings b, dmac_departments dep
        WHERE p.id = p_project_id AND b.id = p_building_id AND dep.id = p_department_id;

        -- Skip numbers already taken by hand or by the old register
        EXIT WHEN NOT EXISTS (SELECT 1 FROM dmac_drawings WHERE project_id = p_project_id AND drawing_number = v_number)
              AND NOT EXISTS (SELECT 1 FROM design_drawings WHERE code = v_number);
    END LOOP;
    RETURN v_number;
END $$;

-- ------------------------------------------------------------------------------
-- 6. The loop: register, submit, review, release
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_dmac_audit(p_actor UUID, p_email TEXT, p_action TEXT, p_entity TEXT, p_id UUID, p_details JSONB)
RETURNS void LANGUAGE sql AS $$
    INSERT INTO dms_audit_logs (actor_id, actor_email, action, entity_type, entity_id, details)
    VALUES (p_actor, p_email, p_action, p_entity, p_id, p_details)
$$;

CREATE OR REPLACE FUNCTION public.fn_dmac_register_drawing(
    p_actor UUID, p_actor_email TEXT,
    p_project_id UUID, p_building_id UUID, p_department_id UUID,
    p_title TEXT, p_drawing_number TEXT DEFAULT NULL,
    p_floor_ids UUID[] DEFAULT '{}', p_primary_floor_id UUID DEFAULT NULL,
    p_planned_submission DATE DEFAULT NULL, p_planned_approval DATE DEFAULT NULL,
    p_design_owner UUID DEFAULT NULL, p_reviewer UUID DEFAULT NULL,
    p_consultant_name TEXT DEFAULT NULL, p_sub_package TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_id UUID;
    v_number TEXT := upper(btrim(coalesce(p_drawing_number, '')));
    v_floor UUID;
    v_primary UUID := coalesce(p_primary_floor_id, p_floor_ids[1]);
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
        consultant_name, sub_package, current_status, current_holder, created_by)
    VALUES (p_project_id, p_building_id, p_department_id, v_number, btrim(p_title),
        p_planned_submission, p_planned_approval, p_design_owner, p_reviewer,
        nullif(btrim(coalesce(p_consultant_name, '')), ''), nullif(btrim(coalesce(p_sub_package, '')), ''),
        'NOT_SUBMITTED', 'DESIGN', p_actor)
    RETURNING id INTO v_id;

    FOREACH v_floor IN ARRAY coalesce(p_floor_ids, '{}') LOOP
        INSERT INTO dmac_drawing_floors (drawing_id, floor_id, is_primary)
        VALUES (v_id, v_floor, v_floor = v_primary) ON CONFLICT DO NOTHING;
    END LOOP;

    PERFORM fn_dmac_audit(p_actor, p_actor_email, 'CREATE', 'DRAWING', v_id,
        jsonb_build_object('drawingNumber', v_number, 'title', p_title));
    RETURN v_id;
END $$;

-- p_files: [{fileRole, storageKey, fileName, fileSizeBytes, checksumSha256}]
-- p_responses: [{commentId, message}] - every open comment on the current revision needs one
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

    -- Comment gate (FR-12): every open comment on the current revision must be answered
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
        INSERT INTO dmac_revision_files (revision_id, file_role, storage_key, file_name, file_size_bytes, checksum_sha256)
        VALUES (v_rev, v_file->>'fileRole', v_file->>'storageKey', v_file->>'fileName',
                (v_file->>'fileSizeBytes')::BIGINT, lower(v_file->>'checksumSha256'));
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

    -- Ledger row for the revision history screen, now that files are attached
    PERFORM fn_dmac_project_revision(v_rev);

    PERFORM fn_dmac_audit(p_actor, p_actor_email, 'UPLOAD', 'REVISION', v_rev,
        jsonb_build_object('drawingId', d.id, 'drawingNumber', d.drawing_number, 'revision', 'R' || v_next,
                           'files', jsonb_array_length(p_files)));
    RETURN jsonb_build_object('revisionId', v_rev, 'revNo', v_next, 'revision', 'R' || v_next);
END $$;

-- Codes: A approved, B approved with comments, C revise and resubmit, D rejected.
-- p_comments: [{category, severity, text, markupGeometry}]
CREATE OR REPLACE FUNCTION public.fn_dmac_record_review(
    p_actor UUID, p_actor_email TEXT,
    p_revision_id UUID, p_code TEXT, p_remarks TEXT, p_comments JSONB DEFAULT '[]',
    p_allow_own_submission BOOLEAN DEFAULT false
) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    rv RECORD;
    d RECORD;
    v_status TEXT;
    v_holder TEXT;
    v_next_no INT;
    v_c JSONB;
    v_open INT;
BEGIN
    IF p_code NOT IN ('A', 'B', 'C', 'D') THEN RAISE EXCEPTION 'DMAC: the review code must be A, B, C or D'; END IF;
    IF p_code <> 'A' AND btrim(coalesce(p_remarks, '')) = '' THEN
        RAISE EXCEPTION 'DMAC: remarks are required for code %', p_code;
    END IF;

    SELECT * INTO rv FROM dmac_drawing_revisions WHERE id = p_revision_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'DMAC: revision not found'; END IF;
    SELECT * INTO d FROM dmac_drawings WHERE id = rv.drawing_id AND deleted_at IS NULL FOR UPDATE;
    IF rv.is_superseded THEN RAISE EXCEPTION 'DMAC: R% has been superseded; review the current revision', rv.rev_no; END IF;
    IF d.current_status <> 'UNDER_REVIEW' THEN RAISE EXCEPTION 'DMAC: this drawing is not waiting for review'; END IF;
    IF rv.submitted_by = p_actor AND NOT p_allow_own_submission THEN
        RAISE EXCEPTION 'DMAC: you submitted this revision, so someone else has to review it';
    END IF;

    SELECT coalesce(max(comment_number), 0) INTO v_next_no FROM dmac_drawing_comments WHERE revision_id = rv.id;
    FOR v_c IN SELECT * FROM jsonb_array_elements(coalesce(p_comments, '[]')) LOOP
        CONTINUE WHEN btrim(coalesce(v_c->>'text', '')) = '';
        v_next_no := v_next_no + 1;
        INSERT INTO dmac_drawing_comments (revision_id, comment_number, category, severity, comment_text,
            markup_geometry, status, created_by, author_email, author_role)
        VALUES (rv.id, v_next_no, upper(coalesce(nullif(v_c->>'category', ''), 'DESIGN')),
            upper(coalesce(nullif(v_c->>'severity', ''), 'MEDIUM')), btrim(v_c->>'text'),
            v_c->'markupGeometry', 'OPEN', p_actor, p_actor_email, 'ENGINEERING');
    END LOOP;

    SELECT count(*) INTO v_open FROM dmac_drawing_comments WHERE revision_id = rv.id AND status = 'OPEN';
    IF p_code IN ('C', 'D') AND v_open = 0 THEN
        RAISE EXCEPTION 'DMAC: add at least one comment so the designer knows what to change';
    END IF;

    INSERT INTO dmac_review_steps (revision_id, reviewer_id, role_type, status, decision_code, remarks, decided_at)
    VALUES (rv.id, p_actor, 'ENGINEERING_REVIEWER', 'DECIDED', p_code, nullif(btrim(coalesce(p_remarks, '')), ''), NOW());

    IF p_code IN ('A', 'B') THEN
        v_status := 'APPROVED'; v_holder := 'NONE';
    ELSE
        v_status := 'RETURNED'; v_holder := 'DESIGN';
    END IF;

    UPDATE dmac_drawings SET current_status = v_status, current_holder = v_holder,
        status_changed_at = NOW(), updated_at = NOW()
    WHERE id = d.id;

    PERFORM fn_dmac_project_revision(rv.id);
    PERFORM fn_dmac_audit(p_actor, p_actor_email, 'REVIEW', 'REVISION', rv.id,
        jsonb_build_object('drawingId', d.id, 'drawingNumber', d.drawing_number, 'revision', 'R' || rv.rev_no,
                           'code', p_code, 'remarks', p_remarks, 'openComments', v_open));
    RETURN jsonb_build_object('status', v_status, 'holder', v_holder, 'openComments', v_open);
END $$;

CREATE OR REPLACE FUNCTION public.fn_dmac_release_gfc(p_actor UUID, p_actor_email TEXT, p_drawing_id UUID)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    d RECORD;
    rv RECORD;
    v_token TEXT := translate(encode(gen_random_bytes(24), 'base64'), '+/=', '-_');
BEGIN
    SELECT * INTO d FROM dmac_drawings WHERE id = p_drawing_id AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'DMAC: drawing not found'; END IF;
    IF d.current_status <> 'APPROVED' THEN
        RAISE EXCEPTION 'DMAC: only an approved revision (code A or B) can be released for construction';
    END IF;
    SELECT * INTO rv FROM dmac_drawing_revisions WHERE drawing_id = d.id AND is_superseded = false;

    -- Older GFC sheets keep is_gfc = true but are superseded, so the site QR check reports them as replaced
    UPDATE dmac_drawing_revisions SET is_gfc = true, gfc_released_at = NOW(), gfc_released_by = p_actor,
        qr_code_token = coalesce(qr_code_token, v_token)
    WHERE id = rv.id RETURNING qr_code_token INTO v_token;

    UPDATE dmac_drawings SET current_status = 'GFC', current_holder = 'NONE', status_changed_at = NOW(), updated_at = NOW()
    WHERE id = d.id;

    PERFORM fn_dmac_audit(p_actor, p_actor_email, 'GFC_RELEASE', 'REVISION', rv.id,
        jsonb_build_object('drawingId', d.id, 'drawingNumber', d.drawing_number, 'revision', 'R' || rv.rev_no));
    RETURN jsonb_build_object('revisionId', rv.id, 'revision', 'R' || rv.rev_no, 'qrToken', v_token);
END $$;

-- ------------------------------------------------------------------------------
-- 7. Server-only access to the new functions
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    f TEXT;
BEGIN
    FOREACH f IN ARRAY ARRAY[
        'fn_dmac_floor_code(integer)', 'fn_dmac_ensure_floors(uuid, integer)',
        'fn_dmac_sync_project(text)', 'fn_dmac_sync_tower(text)', 'fn_dmac_sync_package(text)',
        'fn_dmac_project_drawing(uuid)', 'fn_dmac_project_revision(uuid)',
        'fn_dmac_department_for_discipline(text)',
        'fn_dmac_next_drawing_number(uuid, uuid, uuid)',
        'fn_dmac_audit(uuid, text, text, text, uuid, jsonb)',
        'fn_dmac_register_drawing(uuid, text, uuid, uuid, uuid, text, text, uuid[], uuid, date, date, uuid, uuid, text, text)',
        'fn_dmac_submit_revision(uuid, text, text, uuid, jsonb, jsonb, text)',
        'fn_dmac_record_review(uuid, text, uuid, text, text, jsonb, boolean)',
        'fn_dmac_release_gfc(uuid, text, uuid)'
    ] LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', f);
        EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', f);
    END LOOP;
END $$;

-- New tables or columns stay closed to the browser (same rule as the hotfix)
REVOKE ALL ON public.v_dmac_drawings_live_status FROM anon, authenticated;
