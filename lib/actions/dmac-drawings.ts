"use server";

/**
 * DMAC drawing review loop (register → submit → review A–D → GFC release).
 *
 * The dmac_* tables are the single source of truth. Every write goes through a Postgres
 * function (see supabase/migrations/20261126100000_dmac_drawing_loop.sql) so each step is one
 * transaction; triggers keep the old design_drawings register in step for the other screens.
 * Actions run as the service role and check the person's Design access first.
 */

import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireDesign, safeStorageSegment } from "@/lib/permissions/design-guard";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_FILE_BYTES = 28 * 1024 * 1024; // the server action body limit is 30 MB
const ALLOWED_FILE = /\.(pdf|dwg|dxf|png|jpe?g|tiff?|zip)$/i;

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

function fail(err: unknown, fallback: string): { success: false; error: string } {
  const message = (err as { message?: string })?.message || fallback;
  console.error(`[dmac-drawings] ${fallback}:`, err);
  return { success: false, error: message.replace(/^DMAC:\s*/, "") };
}

function displayName(user: { email?: string | null; user_metadata?: Record<string, unknown> }) {
  return String(user.user_metadata?.full_name || user.email || "Design user");
}

async function isSuperAdmin(userId: string) {
  const { hasPermission } = await import("@/lib/permissions");
  return hasPermission(userId, "SUPER_ADMIN");
}

// ---------- lookups (accept a DMAC uuid or the old register / masters id) ----------

async function resolveProject(ref: string) {
  if (!ref) throw new Error("Pick a project first.");
  let q = supabaseAdmin.from("dmac_projects").select("id, code, name, legacy_design_project_id").is("deleted_at", null);
  q = UUID_RE.test(ref) ? q.eq("id", ref) : q.eq("legacy_design_project_id", ref);
  let { data } = await q.maybeSingle();
  if (!data && !UUID_RE.test(ref)) {
    // Project saved before the mirror trigger existed: mirror it now
    await supabaseAdmin.rpc("fn_dmac_sync_project", { p_legacy_id: ref });
    ({ data } = await supabaseAdmin
      .from("dmac_projects")
      .select("id, code, name, legacy_design_project_id")
      .eq("legacy_design_project_id", ref)
      .maybeSingle());
  }
  if (!data) throw new Error("This project isn't set up for drawing review yet.");
  return data as { id: string; code: string; name: string; legacy_design_project_id: string | null };
}

async function resolveBuilding(projectId: string, ref?: string | null) {
  if (!ref) return null;
  let q = supabaseAdmin.from("dmac_buildings").select("id, code, name").eq("project_id", projectId).is("deleted_at", null);
  q = UUID_RE.test(ref) ? q.eq("id", ref) : q.eq("legacy_tower_id", ref);
  let { data } = await q.maybeSingle();
  if (!data && !UUID_RE.test(ref)) {
    await supabaseAdmin.rpc("fn_dmac_sync_tower", { p_tower_id: ref });
    ({ data } = await supabaseAdmin
      .from("dmac_buildings")
      .select("id, code, name")
      .eq("project_id", projectId)
      .eq("legacy_tower_id", ref)
      .maybeSingle());
  }
  return (data as { id: string; code: string; name: string } | null) || null;
}

async function resolveDrawing(ref: string) {
  if (!ref) throw new Error("Drawing not found.");
  let q = supabaseAdmin
    .from("dmac_drawings")
    .select("id, project_id, drawing_number, title, current_status, latest_rev_no, legacy_drawing_id, dmac_projects!inner(legacy_design_project_id)")
    .is("deleted_at", null);
  q = UUID_RE.test(ref) ? q.or(`id.eq.${ref},legacy_drawing_id.eq.${ref}`) : q.eq("legacy_drawing_id", ref);
  const { data } = await q.maybeSingle();
  if (!data) throw new Error("This drawing isn't in the review register. It may have been imported without a project.");
  const project = (data as any).dmac_projects;
  return {
    ...(data as any),
    legacyProjectId: (Array.isArray(project) ? project[0] : project)?.legacy_design_project_id as string | null,
  } as {
    id: string;
    project_id: string;
    drawing_number: string;
    title: string;
    current_status: string;
    latest_rev_no: number | null;
    legacy_drawing_id: string | null;
    legacyProjectId: string | null;
  };
}

/** Access is granted on the masters project id (what Design → Access stores). */
function scopeOf(project: { id: string; legacy_design_project_id?: string | null } | { legacyProjectId: string | null; project_id: string }) {
  if ("legacyProjectId" in project) return project.legacyProjectId || project.project_id;
  return project.legacy_design_project_id || project.id;
}

// ---------- files ----------

async function storeRevisionFile(file: File, projectCode: string, drawingNumber: string, role: "PRIMARY_PDF" | "CAD_DWG" | "ATTACHMENT") {
  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) throw new Error("The file is empty.");
  if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is larger than 28 MB.`);
  if (!ALLOWED_FILE.test(file.name)) throw new Error(`${file.name}: only PDF, DWG, DXF, image or ZIP files are accepted.`);

  const buffer = Buffer.from(await file.arrayBuffer());
  const checksum = createHash("sha256").update(buffer).digest("hex");
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
  const path = `drawings/${safeStorageSegment(projectCode, "project")}/${safeStorageSegment(drawingNumber, "drawing")}/${Date.now()}_${checksum.slice(0, 12)}_${cleanName}`;

  const { error } = await supabaseAdmin.storage
    .from("design-drawings")
    .upload(path, buffer, { contentType: file.type || "application/octet-stream", upsert: false });
  if (error) throw new Error(`Couldn't store ${file.name}: ${error.message}`);

  return {
    fileRole: role,
    storageKey: `storage:design-drawings:${path}`,
    fileName: file.name,
    fileSizeBytes: file.size,
    checksumSha256: checksum,
  };
}

async function filesFromForm(formData: FormData, projectCode: string, drawingNumber: string) {
  const primary = formData.get("file") as File | null;
  if (!primary || !primary.size) throw new Error("Attach the drawing sheet (PDF) for this revision.");
  const files = [await storeRevisionFile(primary, projectCode, drawingNumber, "PRIMARY_PDF")];
  const cad = formData.get("cadFile") as File | null;
  if (cad && cad.size) files.push(await storeRevisionFile(cad, projectCode, drawingNumber, "CAD_DWG"));
  return files;
}

// ---------- setup data for the upload form and the matrix ----------

export interface DmacSetup {
  project: { id: string; legacyId: string | null; code: string; name: string };
  buildings: { id: string; legacyId: string | null; code: string; name: string; floors: { id: string; code: string; name: string; floorOrder: number }[] }[];
  departments: { id: string; code: string; name: string }[];
}

export async function fetchDmacSetupAction(projectRef: string): Promise<ActionResult<DmacSetup>> {
  try {
    const project = await resolveProject(projectRef);
    await requireDesign("any", [scopeOf(project)]);

    const [{ data: buildings, error: bErr }, { data: departments, error: dErr }] = await Promise.all([
      supabaseAdmin
        .from("dmac_buildings")
        .select("id, code, name, sort_order, legacy_tower_id, dmac_floors(id, code, name, floor_order, deleted_at)")
        .eq("project_id", project.id)
        .is("deleted_at", null)
        .order("sort_order")
        .order("name"),
      supabaseAdmin.from("dmac_departments").select("id, code, name").order("name"),
    ]);
    if (bErr) throw bErr;
    if (dErr) throw dErr;

    return {
      success: true,
      data: {
        project: { id: project.id, legacyId: project.legacy_design_project_id, code: project.code, name: project.name },
        buildings: (buildings || []).map((b: any) => ({
          id: b.id,
          legacyId: b.legacy_tower_id,
          code: b.code,
          name: b.name,
          floors: (b.dmac_floors || [])
            .filter((f: any) => !f.deleted_at)
            .sort((x: any, y: any) => y.floor_order - x.floor_order)
            .map((f: any) => ({ id: f.id, code: f.code, name: f.name, floorOrder: f.floor_order })),
        })),
        departments: departments || [],
      },
    };
  } catch (err) {
    return fail(err, "Failed to load project setup");
  }
}

// ---------- matrix ----------

export interface BuildingSectionCell {
  drawingId: string;
  drawingNumber: string;
  title: string;
  disciplineCode: string;
  departmentName: string;
  floorId: string;
  floorCode: string;
  floorName: string;
  floorOrder: number;
  currentStatus: "NOT_SUBMITTED" | "UNDER_REVIEW" | "RETURNED" | "APPROVED" | "GFC";
  currentHolder: "DESIGN" | "ENGINEERING" | "NONE";
  latestRevNo: number | null;
  displayRev: string;
  daysInCurrentState: number;
  isOverdue: boolean;
  designOwnerId?: string;
  engineeringReviewerId?: string;
}

export interface BuildingSectionMatrixResult {
  floors: { id: string; code: string; name: string; floorOrder: number }[];
  disciplines: { code: string; name: string }[];
  cells: BuildingSectionCell[];
  summary: {
    totalDrawings: number;
    underReview: number;
    underReviewOverdue: number;
    returnedForRevision: number;
    returnedOverdue: number;
    approved: number;
    gfc: number;
    notSubmitted: number;
    avgRoundsToApproval: number;
  };
}

/** Floor × discipline matrix for one building. Days are working days (Sundays and holidays excluded). */
export async function fetchBuildingSectionMatrixAction(
  projectRef: string,
  buildingRef?: string
): Promise<{ success: boolean; data?: BuildingSectionMatrixResult; error?: string }> {
  try {
    const project = await resolveProject(projectRef);
    await requireDesign("any", [scopeOf(project)]);
    const building = await resolveBuilding(project.id, buildingRef);

    let floorsQuery = supabaseAdmin
      .from("dmac_floors")
      .select("id, code, name, floor_order, dmac_buildings!inner(project_id)")
      .eq("dmac_buildings.project_id", project.id)
      .is("deleted_at", null)
      .order("floor_order", { ascending: false });
    if (building) floorsQuery = floorsQuery.eq("building_id", building.id);

    let statusQuery = supabaseAdmin.from("v_dmac_drawings_live_status").select("*").eq("project_id", project.id);
    if (building) statusQuery = statusQuery.eq("building_id", building.id);

    const [{ data: floors, error: fErr }, { data: departments, error: dErr }, { data: rows, error: sErr }] = await Promise.all([
      floorsQuery,
      supabaseAdmin.from("dmac_departments").select("code, name").order("code"),
      statusQuery,
    ]);
    if (fErr) throw fErr;
    if (dErr) throw dErr;
    if (sErr) throw sErr;

    const floorList = floors || [];
    const drawings = rows || [];
    const cells: BuildingSectionCell[] = [];
    for (const row of drawings as any[]) {
      for (const fId of (row.floor_ids as string[]) || []) {
        const floor = floorList.find((f: any) => f.id === fId);
        if (!floor) continue;
        cells.push({
          drawingId: row.drawing_id,
          drawingNumber: row.drawing_number,
          title: row.title,
          disciplineCode: row.department_code,
          departmentName: row.department_name,
          floorId: floor.id,
          floorCode: floor.code,
          floorName: floor.name,
          floorOrder: floor.floor_order,
          currentStatus: row.current_status,
          currentHolder: row.current_holder,
          latestRevNo: row.latest_rev_no,
          displayRev: row.display_rev,
          daysInCurrentState: row.days_in_current_state || 0,
          isOverdue: !!row.is_overdue,
          designOwnerId: row.design_owner_id || undefined,
          engineeringReviewerId: row.engineering_reviewer_id || undefined,
        });
      }
    }

    const by = (s: string) => drawings.filter((r: any) => r.current_status === s);
    const approvedOrGfc = drawings.filter((r: any) => r.current_status === "APPROVED" || r.current_status === "GFC");
    const avgRounds = approvedOrGfc.length
      ? Number((approvedOrGfc.reduce((acc: number, r: any) => acc + (r.latest_rev_no ?? 0) + 1, 0) / approvedOrGfc.length).toFixed(1))
      : 0;

    return {
      success: true,
      data: {
        floors: floorList.map((f: any) => ({ id: f.id, code: f.code, name: f.name, floorOrder: f.floor_order })),
        disciplines: departments || [],
        cells,
        summary: {
          totalDrawings: drawings.length,
          underReview: by("UNDER_REVIEW").length,
          underReviewOverdue: by("UNDER_REVIEW").filter((r: any) => r.is_overdue).length,
          returnedForRevision: by("RETURNED").length,
          returnedOverdue: by("RETURNED").filter((r: any) => r.is_overdue).length,
          approved: by("APPROVED").length,
          gfc: by("GFC").length,
          notSubmitted: by("NOT_SUBMITTED").length,
          avgRoundsToApproval: avgRounds,
        },
      },
    };
  } catch (err) {
    return fail(err, "Failed to fetch building section matrix");
  }
}

/** Drawings waiting longest (under review or returned), most working days first. */
export async function fetchWaitingLongestQueueAction(projectRef: string) {
  try {
    const project = await resolveProject(projectRef);
    await requireDesign("any", [scopeOf(project)]);
    const { data, error } = await supabaseAdmin
      .from("v_dmac_drawings_live_status")
      .select("*")
      .eq("project_id", project.id)
      .in("current_status", ["UNDER_REVIEW", "RETURNED"])
      .order("days_in_current_state", { ascending: false })
      .limit(15);
    if (error) throw error;
    return { success: true as const, data: data || [] };
  } catch (err) {
    return fail(err, "Failed to fetch waiting queue");
  }
}

// ---------- drawing detail ----------

export async function fetchDrawingDetailAction(drawingRef: string) {
  try {
    const d = await resolveDrawing(drawingRef);
    await requireDesign("any", [scopeOf(d)]);

    const [{ data: drawing, error: dErr }, { data: revisions, error: rErr }] = await Promise.all([
      supabaseAdmin.from("v_dmac_drawings_live_status").select("*").eq("drawing_id", d.id).single(),
      supabaseAdmin
        .from("dmac_drawing_revisions")
        .select(`id, rev_no, submitted_by, submitted_by_name, submitted_at, change_summary, is_superseded, is_gfc,
          gfc_released_at, qr_code_token, imported_from_legacy,
          dmac_revision_files (id, file_role, file_name, file_size_bytes, checksum_sha256, converted_view_path),
          dmac_review_steps (id, step_order, reviewer_id, role_type, decision_code, remarks, decided_at)`)
        .eq("drawing_id", d.id)
        .order("rev_no", { ascending: true }),
    ]);
    if (dErr) throw dErr;
    if (rErr) throw rErr;

    const revisionIds = (revisions || []).map((r: any) => r.id);
    let comments: any[] = [];
    if (revisionIds.length) {
      const { data, error } = await supabaseAdmin
        .from("dmac_drawing_comments")
        .select(`id, revision_id, comment_number, category, severity, comment_text, markup_geometry, status,
          resolved_in_revision_id, created_by, author_email, author_role, created_at,
          dmac_comment_threads (id, author_id, author_role, author_email, message, revision_id, created_at)`)
        .in("revision_id", revisionIds)
        .order("comment_number", { ascending: true });
      if (error) throw error;
      comments = data || [];
    }

    // The storage key never leaves the server; files open through /api/proxy-attachment/<file id>
    return { success: true as const, data: { drawing, revisions: revisions || [], comments } };
  } catch (err) {
    return fail(err, "Failed to fetch drawing details");
  }
}

// ---------- register + first submission ----------

/**
 * New drawing: stores the file(s), registers the drawing (auto-numbered when no number is given)
 * and submits R0 for review.
 * Form fields: projectId, buildingId, departmentId, floorIds (JSON array), primaryFloorId, title,
 * drawingNumber, plannedSubmissionDate, plannedApprovalDate, consultantName, subPackage,
 * changeSummary, file (primary sheet), cadFile (optional).
 */
export async function submitNewDrawingAction(formData: FormData): Promise<
  ActionResult<{ drawingId: string; drawingRef: string; drawingNumber: string; revision: string; submitted: boolean; submitError?: string }>
> {
  try {
    const project = await resolveProject(String(formData.get("projectId") || ""));
    const user = await requireDesign("drawings", [scopeOf(project)]);

    const building =
      (await resolveBuilding(project.id, String(formData.get("buildingId") || ""))) ||
      (await resolveBuilding(project.id, undefined));
    let buildingId = building?.id;
    if (!buildingId) {
      const { data: gen } = await supabaseAdmin
        .from("dmac_buildings").select("id").eq("project_id", project.id).eq("code", "GEN").maybeSingle();
      buildingId = gen?.id;
    }
    if (!buildingId) throw new Error("Pick the building (tower) for this drawing.");

    const departmentId = String(formData.get("departmentId") || "");
    if (!UUID_RE.test(departmentId)) throw new Error("Pick the discipline for this drawing.");

    let floorIds: string[] = [];
    try {
      floorIds = JSON.parse(String(formData.get("floorIds") || "[]")).filter((x: unknown) => typeof x === "string" && UUID_RE.test(x));
    } catch {
      floorIds = [];
    }
    const primaryFloorId = String(formData.get("primaryFloorId") || "") || floorIds[0] || null;
    const dateOrNull = (k: string) => {
      const v = String(formData.get(k) || "");
      return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
    };

    // Make sure the file is acceptable before anything is written
    const primary = formData.get("file") as File | null;
    if (!primary || !primary.size) throw new Error("Attach the drawing sheet (PDF) for R0.");

    const { data: drawingId, error: regErr } = await supabaseAdmin.rpc("fn_dmac_register_drawing", {
      p_actor: user.id,
      p_actor_email: user.email || null,
      p_project_id: project.id,
      p_building_id: buildingId,
      p_department_id: departmentId,
      p_title: String(formData.get("title") || ""),
      p_drawing_number: String(formData.get("drawingNumber") || "") || null,
      p_floor_ids: floorIds,
      p_primary_floor_id: primaryFloorId && UUID_RE.test(primaryFloorId) ? primaryFloorId : null,
      p_planned_submission: dateOrNull("plannedSubmissionDate"),
      p_planned_approval: dateOrNull("plannedApprovalDate"),
      p_design_owner: user.id,
      p_reviewer: null,
      p_consultant_name: String(formData.get("consultantName") || "") || null,
      p_sub_package: String(formData.get("subPackage") || "") || null,
    });
    if (regErr) throw regErr;

    const { data: created } = await supabaseAdmin
      .from("dmac_drawings").select("drawing_number").eq("id", drawingId as string).single();
    const drawingNumber = created?.drawing_number as string;

    // The drawing is registered; a failed upload leaves it as "not submitted" so it can be retried
    try {
      const files = await filesFromForm(formData, project.code, drawingNumber);
      const { data: rev, error: subErr } = await supabaseAdmin.rpc("fn_dmac_submit_revision", {
        p_actor: user.id,
        p_actor_email: user.email || null,
        p_actor_name: displayName(user),
        p_drawing_id: drawingId as string,
        p_files: files,
        p_responses: [],
        p_change_summary: String(formData.get("changeSummary") || "") || "First issue",
      });
      if (subErr) throw subErr;
      return {
        success: true,
        data: { drawingId: drawingId as string, drawingRef: drawingId as string, drawingNumber, revision: (rev as any)?.revision || "R0", submitted: true },
      };
    } catch (subErr: any) {
      return {
        success: true,
        data: {
          drawingId: drawingId as string,
          drawingRef: drawingId as string,
          drawingNumber,
          revision: "–",
          submitted: false,
          submitError: String(subErr?.message || "The file couldn't be submitted").replace(/^DMAC:\s*/, ""),
        },
      };
    }
  } catch (err) {
    return fail(err, "Failed to register drawing");
  }
}

// ---------- resubmission ----------

/**
 * Next revision of an existing drawing. Every open comment on the current revision needs a response.
 * Form fields: drawingId, responses (JSON [{commentId, message}]), changeSummary, file, cadFile.
 */
export async function submitDrawingRevisionAction(formData: FormData): Promise<ActionResult<{ revisionId: string; revision: string }>> {
  try {
    const d = await resolveDrawing(String(formData.get("drawingId") || ""));
    const user = await requireDesign("drawings", [scopeOf(d)]);
    if (d.current_status === "UNDER_REVIEW") throw new Error(`R${d.latest_rev_no} is still under review.`);

    let responses: { commentId: string; message: string }[] = [];
    try {
      responses = JSON.parse(String(formData.get("responses") || "[]"))
        .filter((r: any) => r && UUID_RE.test(String(r.commentId)) && String(r.message || "").trim())
        .map((r: any) => ({ commentId: String(r.commentId), message: String(r.message).trim().slice(0, 4000) }));
    } catch {
      responses = [];
    }

    // Check the comment gate before uploading anything
    const { data: current } = await supabaseAdmin
      .from("dmac_drawing_revisions").select("id, rev_no").eq("drawing_id", d.id).eq("is_superseded", false).maybeSingle();
    if (current) {
      const { data: open } = await supabaseAdmin
        .from("dmac_drawing_comments").select("id, comment_number").eq("revision_id", current.id).eq("status", "OPEN");
      const answered = new Set(responses.map((r) => r.commentId));
      const missing = (open || []).filter((c: any) => !answered.has(c.id));
      if (missing.length) {
        throw new Error(
          `Answer every open comment on R${current.rev_no} first (missing: #${missing.map((c: any) => c.comment_number).join(", #")}).`
        );
      }
    }

    const { data: proj } = await supabaseAdmin.from("dmac_projects").select("code").eq("id", d.project_id).single();
    const files = await filesFromForm(formData, proj?.code || "project", d.drawing_number);

    const { data, error } = await supabaseAdmin.rpc("fn_dmac_submit_revision", {
      p_actor: user.id,
      p_actor_email: user.email || null,
      p_actor_name: displayName(user),
      p_drawing_id: d.id,
      p_files: files,
      p_responses: responses,
      p_change_summary: String(formData.get("changeSummary") || "") || null,
    });
    if (error) throw error;
    return { success: true, data: { revisionId: (data as any).revisionId, revision: (data as any).revision } };
  } catch (err) {
    return fail(err, "Failed to submit revision");
  }
}

// ---------- review and release ----------

export type ReviewCode = "A" | "B" | "C" | "D";

/** Record the review decision on the current revision. B, C and D need remarks; C and D need at least one comment. */
export async function reviewDrawingRevisionAction(params: {
  drawingId: string;
  revisionId?: string;
  decisionCode: ReviewCode;
  remarks: string;
  comments?: {
    category?: "DESIGN" | "COORDINATION" | "COMPLIANCE" | "DRAFTING";
    severity?: "LOW" | "MEDIUM" | "HIGH" | "BLOCKER";
    commentText: string;
    markupGeometry?: unknown;
  }[];
}): Promise<ActionResult<{ status: string; holder: string; openComments: number }>> {
  try {
    const d = await resolveDrawing(params.drawingId);
    const user = await requireDesign("gfc", [scopeOf(d)]);

    let revisionId = params.revisionId && UUID_RE.test(params.revisionId) ? params.revisionId : null;
    if (!revisionId) {
      const { data: cur } = await supabaseAdmin
        .from("dmac_drawing_revisions").select("id").eq("drawing_id", d.id).eq("is_superseded", false).maybeSingle();
      revisionId = cur?.id || null;
    }
    if (!revisionId) throw new Error("Nothing has been submitted for this drawing yet.");

    const { data, error } = await supabaseAdmin.rpc("fn_dmac_record_review", {
      p_actor: user.id,
      p_actor_email: user.email || null,
      p_revision_id: revisionId,
      p_code: params.decisionCode,
      p_remarks: params.remarks || "",
      p_comments: (params.comments || []).map((c) => ({
        category: c.category || "DESIGN",
        severity: c.severity || "MEDIUM",
        text: String(c.commentText || "").slice(0, 4000),
        markupGeometry: c.markupGeometry ?? null,
      })),
      p_allow_own_submission: await isSuperAdmin(user.id),
    });
    if (error) throw error;
    return { success: true, data: data as any };
  } catch (err) {
    return fail(err, "Failed to record review decision");
  }
}

/** Release the approved revision for construction; it gets a QR token for the site verify page. */
export async function releaseDrawingGfcAction(drawingRef: string): Promise<ActionResult<{ revision: string; verifyPath: string }>> {
  try {
    const d = await resolveDrawing(drawingRef);
    const user = await requireDesign("gfc", [scopeOf(d)]);
    const { data, error } = await supabaseAdmin.rpc("fn_dmac_release_gfc", {
      p_actor: user.id,
      p_actor_email: user.email || null,
      p_drawing_id: d.id,
    });
    if (error) throw error;
    return { success: true, data: { revision: (data as any).revision, verifyPath: `/verify-drawing/${(data as any).qrToken}` } };
  } catch (err) {
    return fail(err, "Failed to release drawing for construction");
  }
}

/** Remove a drawing from the register. History stays (soft delete); Design admins only. */
export async function deleteDmacDrawingAction(drawingRef: string, reason: string): Promise<ActionResult> {
  try {
    const d = await resolveDrawing(drawingRef);
    const user = await requireDesign("admin", [scopeOf(d)]);
    if (!String(reason || "").trim()) throw new Error("Give a reason for removing this drawing.");
    if (d.current_status === "GFC") throw new Error("A drawing released for construction can't be removed.");
    const { error } = await supabaseAdmin
      .from("dmac_drawings").update({ deleted_at: new Date().toISOString() }).eq("id", d.id);
    if (error) throw error;
    await supabaseAdmin.rpc("fn_dmac_audit", {
      p_actor: user.id,
      p_email: user.email || null,
      p_action: "DELETE",
      p_entity: "DRAWING",
      p_id: d.id,
      p_details: { drawingNumber: d.drawing_number, reason: String(reason).trim() },
    });
    return { success: true, data: undefined };
  } catch (err) {
    return fail(err, "Failed to remove drawing");
  }
}

// ---------- markups and comment threads ----------

/** The revision a markup belongs to must be the current one and still under review. */
async function loadReviewableRevision(revisionId: string) {
  if (!UUID_RE.test(revisionId)) throw new Error("This revision isn't in the review register.");
  const { data: rev } = await supabaseAdmin
    .from("dmac_drawing_revisions")
    .select("id, rev_no, is_superseded, submitted_by, drawing_id")
    .eq("id", revisionId)
    .maybeSingle();
  if (!rev) throw new Error("Revision not found.");
  const d = await resolveDrawing(rev.drawing_id);
  return { rev, d };
}

export async function createMarkupCommentAction(params: {
  revisionId: string;
  category: "DESIGN" | "COORDINATION" | "COMPLIANCE" | "DRAFTING";
  severity: "LOW" | "MEDIUM" | "HIGH" | "BLOCKER";
  commentText: string;
  markupGeometry: Record<string, unknown>;
}) {
  try {
    const { rev, d } = await loadReviewableRevision(params.revisionId);
    const user = await requireDesign("gfc", [scopeOf(d)]);
    if (rev.is_superseded || d.current_status !== "UNDER_REVIEW") {
      throw new Error("Comments can only be added while the current revision is under review.");
    }
    const text = String(params.commentText || "").trim();
    if (!text) throw new Error("Write the comment first.");

    // Two reviewers adding at once: retry on the comment-number clash
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: last } = await supabaseAdmin
        .from("dmac_drawing_comments")
        .select("comment_number")
        .eq("revision_id", rev.id)
        .order("comment_number", { ascending: false })
        .limit(1);
      const nextNo = (last?.[0]?.comment_number || 0) + 1;
      const { data, error } = await supabaseAdmin
        .from("dmac_drawing_comments")
        .insert({
          revision_id: rev.id,
          comment_number: nextNo,
          category: params.category || "DESIGN",
          severity: params.severity || "MEDIUM",
          comment_text: text.slice(0, 4000),
          markup_geometry: params.markupGeometry || null,
          status: "OPEN",
          created_by: user.id,
          author_email: user.email || null,
          author_role: "ENGINEERING",
        })
        .select()
        .single();
      if (!error) return { success: true as const, comment: data };
      if (error.code !== "23505") throw error;
    }
    throw new Error("Couldn't number the comment, try again.");
  } catch (err) {
    return fail(err, "Failed to create markup comment");
  }
}

export async function updateMarkupCommentAction(params: {
  commentId: string;
  commentText?: string;
  category?: "DESIGN" | "COORDINATION" | "COMPLIANCE" | "DRAFTING";
  severity?: "LOW" | "MEDIUM" | "HIGH" | "BLOCKER";
  markupGeometry?: unknown;
}) {
  try {
    if (!UUID_RE.test(params.commentId)) throw new Error("Comment not found.");
    const { data: c } = await supabaseAdmin
      .from("dmac_drawing_comments").select("id, revision_id, created_by, status").eq("id", params.commentId).maybeSingle();
    if (!c) throw new Error("Comment not found.");
    const { rev, d } = await loadReviewableRevision(c.revision_id);
    const user = await requireDesign("gfc", [scopeOf(d)]);
    if (c.created_by !== user.id) throw new Error("Only the reviewer who wrote this comment can change it.");
    if (rev.is_superseded || d.current_status !== "UNDER_REVIEW") throw new Error("This review is closed; the comment can't be changed.");

    const patch: Record<string, unknown> = {};
    if (params.commentText !== undefined) patch.comment_text = String(params.commentText).trim().slice(0, 4000);
    if (params.category !== undefined) patch.category = params.category;
    if (params.severity !== undefined) patch.severity = params.severity;
    if (params.markupGeometry !== undefined) patch.markup_geometry = params.markupGeometry;
    const { data, error } = await supabaseAdmin.from("dmac_drawing_comments").update(patch).eq("id", c.id).select().single();
    if (error) throw error;
    return { success: true as const, comment: data };
  } catch (err) {
    return fail(err, "Failed to update markup comment");
  }
}

export async function deleteMarkupCommentAction(commentId: string) {
  try {
    if (!UUID_RE.test(commentId)) throw new Error("Comment not found.");
    const { data: c } = await supabaseAdmin
      .from("dmac_drawing_comments").select("id, revision_id, created_by").eq("id", commentId).maybeSingle();
    if (!c) throw new Error("Comment not found.");
    const { rev, d } = await loadReviewableRevision(c.revision_id);
    const user = await requireDesign("gfc", [scopeOf(d)]);
    if (c.created_by !== user.id) throw new Error("Only the reviewer who wrote this comment can delete it.");
    if (rev.is_superseded || d.current_status !== "UNDER_REVIEW") {
      throw new Error("The review decision has been recorded, so its comments are part of the record.");
    }
    const { count } = await supabaseAdmin
      .from("dmac_comment_threads").select("id", { count: "exact", head: true }).eq("comment_id", c.id);
    if (count) throw new Error("This comment already has replies; edit it instead.");
    const { error } = await supabaseAdmin.from("dmac_drawing_comments").delete().eq("id", c.id);
    if (error) throw error;
    return { success: true as const };
  } catch (err) {
    return fail(err, "Failed to delete markup comment");
  }
}

export async function addCommentThreadReplyAction(params: { commentId: string; message: string; authorRole?: string }) {
  try {
    if (!UUID_RE.test(params.commentId)) throw new Error("Comment not found.");
    const message = String(params.message || "").trim();
    if (!message) throw new Error("Write a reply first.");
    const { data: c } = await supabaseAdmin
      .from("dmac_drawing_comments").select("id, revision_id").eq("id", params.commentId).maybeSingle();
    if (!c) throw new Error("Comment not found.");
    const { d } = await loadReviewableRevision(c.revision_id);
    const user = await requireDesign("any", [scopeOf(d)]);
    const role = ["DESIGN", "ENGINEERING", "DESIGN_LEAD", "ENGINEERING_REVIEWER"].includes(String(params.authorRole || "").toUpperCase())
      ? String(params.authorRole).toUpperCase()
      : "INTERNAL";

    const { data, error } = await supabaseAdmin
      .from("dmac_comment_threads")
      .insert({ comment_id: c.id, author_id: user.id, author_email: user.email || null, author_role: role, message: message.slice(0, 4000) })
      .select()
      .single();
    if (error) throw error;
    return { success: true as const, reply: data };
  } catch (err) {
    return fail(err, "Failed to post thread reply");
  }
}
