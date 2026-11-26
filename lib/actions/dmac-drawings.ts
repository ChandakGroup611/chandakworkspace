"use server";

import { requireDesign } from "@/lib/permissions/design-guard";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

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

/**
 * Fetch Building Section (Floor x Discipline) Matrix Data
 */
export async function fetchBuildingSectionMatrixAction(
  projectId: string,
  buildingId?: string
): Promise<{ success: boolean; data?: BuildingSectionMatrixResult; error?: string }> {
  try {
    await requireDesign("any");
    const supabase = await getSupabase();

    // 1. Fetch Floors
    let floorsQuery = supabase
      .from("dmac_floors")
      .select("id, code, name, floor_order")
      .order("floor_order", { ascending: false });

    if (buildingId) {
      floorsQuery = floorsQuery.eq("building_id", buildingId);
    }
    const { data: floorsData, error: floorsErr } = await floorsQuery;
    if (floorsErr) throw floorsErr;

    // 2. Fetch Departments
    const { data: deptsData, error: deptsErr } = await supabase
      .from("dmac_departments")
      .select("code, name")
      .order("code", { ascending: true });
    if (deptsErr) throw deptsErr;

    // 3. Fetch Live Status View
    const { data: liveStatusData, error: statusErr } = await supabase
      .from("v_dmac_drawings_live_status")
      .select("*")
      .eq("project_id", projectId);

    if (statusErr) throw statusErr;

    const rows = liveStatusData || [];
    const floors = floorsData || [];
    const disciplines = deptsData || [];

    // Map cells expanding multi-floor drawings
    const cells: BuildingSectionCell[] = [];

    rows.forEach((row) => {
      const floorIds: string[] = row.floor_ids || [row.floor_id];
      floorIds.forEach((fId) => {
        const matchingFloor = floors.find((f) => f.id === fId);
        if (matchingFloor) {
          cells.push({
            drawingId: row.drawing_id,
            drawingNumber: row.drawing_number,
            title: row.title,
            disciplineCode: row.department_code,
            departmentName: row.department_name,
            floorId: matchingFloor.id,
            floorCode: matchingFloor.code,
            floorName: matchingFloor.name,
            floorOrder: matchingFloor.floor_order,
            currentStatus: row.current_status,
            currentHolder: row.current_holder,
            latestRevNo: row.latest_rev_no,
            displayRev: row.display_rev,
            daysInCurrentState: row.days_in_current_state || 0,
            isOverdue: !!row.is_overdue,
            designOwnerId: row.design_owner_id,
            engineeringReviewerId: row.engineering_reviewer_id,
          });
        }
      });
    });

    const totalDrawings = rows.length;
    const underReview = rows.filter((r) => r.current_status === "UNDER_REVIEW");
    const returned = rows.filter((r) => r.current_status === "RETURNED");
    const approved = rows.filter((r) => r.current_status === "APPROVED");
    const gfc = rows.filter((r) => r.current_status === "GFC");
    const notSubmitted = rows.filter((r) => r.current_status === "NOT_SUBMITTED");

    const approvedTotal = approved.length + gfc.length;
    const avgRounds =
      approvedTotal > 0
        ? Number(
            (
              rows
                .filter((r) => r.current_status === "APPROVED" || r.current_status === "GFC")
                .reduce((acc, curr) => acc + (curr.latest_rev_no !== null ? curr.latest_rev_no + 1 : 1), 0) /
              approvedTotal
            ).toFixed(1)
          )
        : 1.0;

    return {
      success: true,
      data: {
        floors: floors.map((f: any) => ({
          id: f.id,
          code: f.code,
          name: f.name,
          floorOrder: f.floor_order || f.floorOrder || 0,
        })),
        disciplines,
        cells,
        summary: {
          totalDrawings,
          underReview: underReview.length,
          underReviewOverdue: underReview.filter((r) => r.is_overdue).length,
          returnedForRevision: returned.length,
          returnedOverdue: returned.filter((r) => r.is_overdue).length,
          approved: approved.length,
          gfc: gfc.length,
          notSubmitted: notSubmitted.length,
          avgRoundsToApproval: avgRounds,
        },
      },
    };
  } catch (err: any) {
    console.error("[fetchBuildingSectionMatrixAction] Error:", err);
    return { success: false, error: err.message || "Failed to fetch building section matrix" };
  }
}

/**
 * Fetch Drawing Full Detail including Multi-File Revision Stack & Comment Threads
 */
export async function fetchDrawingDetailAction(drawingId: string) {
  try {
    await requireDesign("any");
    const supabase = await getSupabase();

    // 1. Drawing Core Record
    const { data: drawing, error: drawingErr } = await supabase
      .from("v_dmac_drawings_live_status")
      .select("*")
      .eq("drawing_id", drawingId)
      .single();

    if (drawingErr) throw drawingErr;

    // 2. Revisions & Multi-Files
    const { data: revisions, error: revErr } = await supabase
      .from("dmac_drawing_revisions")
      .select(`
        id,
        rev_no,
        submitted_by,
        submitted_at,
        is_superseded,
        is_gfc,
        gfc_released_at,
        qr_code_token,
        dmac_revision_files (
          id,
          file_role,
          storage_key,
          file_name,
          file_size_bytes,
          checksum_sha256,
          converted_view_path
        ),
        dmac_review_steps (
          id,
          step_order,
          reviewer_id,
          role_type,
          decision_code,
          remarks,
          decided_at
        )
      `)
      .eq("drawing_id", drawingId)
      .order("rev_no", { ascending: true });

    if (revErr) throw revErr;

    // 3. Comments & Threads
    const revisionIds = (revisions || []).map((r) => r.id);
    let comments: any[] = [];
    if (revisionIds.length > 0) {
      const { data: commentsData, error: commErr } = await supabase
        .from("dmac_drawing_comments")
        .select(`
          id,
          revision_id,
          comment_number,
          category,
          severity,
          comment_text,
          markup_geometry,
          status,
          created_at,
          dmac_comment_threads (
            id,
            author_id,
            author_role,
            message,
            created_at
          )
        `)
        .in("revision_id", revisionIds)
        .order("comment_number", { ascending: true });

      if (commErr) throw commErr;
      comments = commentsData || [];
    }

    return {
      success: true,
      data: {
        drawing,
        revisions: revisions || [],
        comments,
      },
    };
  } catch (err: any) {
    console.error("[fetchDrawingDetailAction] Error:", err);
    return { success: false, error: err.message || "Failed to fetch drawing details" };
  }
}

/**
 * Submit Drawing Revision (With Mandatory Open Comment Clearance Gate)
 */
export async function submitDrawingRevisionAction(params: {
  drawingId: string;
  files: {
    fileRole: "PRIMARY_PDF" | "CAD_DWG" | "ATTACHMENT";
    storageKey: string;
    fileName: string;
    fileSizeBytes: number;
    checksumSha256: string;
  }[];
  commentResponses?: { commentId: string; responseMessage: string }[];
}) {
  try {
    await requireDesign("drawings");
    const supabase = await getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Authentication required to submit drawing revisions" };
    }

    // 1. Fetch Drawing & Latest Revision
    const { data: drawing, error: dErr } = await supabase
      .from("dmac_drawings")
      .select("id, latest_rev_no, current_status")
      .eq("id", params.drawingId)
      .single();

    if (dErr || !drawing) throw new Error("Drawing not found");

    // 2. Gate Check: If previous revision exists, ensure all previous comments are answered
    if (drawing.latest_rev_no !== null) {
      const { data: latestRev } = await supabase
        .from("dmac_drawing_revisions")
        .select("id")
        .eq("drawing_id", params.drawingId)
        .eq("rev_no", drawing.latest_rev_no)
        .single();

      if (latestRev) {
        const { data: openComments } = await supabase
          .from("dmac_drawing_comments")
          .select("id, comment_number")
          .eq("revision_id", latestRev.id)
          .eq("status", "OPEN");

        if (openComments && openComments.length > 0) {
          const providedResponseIds = new Set(
            (params.commentResponses || []).map((r) => r.commentId)
          );
          const unanswered = openComments.filter((c) => !providedResponseIds.has(c.id));
          if (unanswered.length > 0) {
            return {
              success: false,
              error: `Mandatory Comment Clearance Gate: Comment #${unanswered[0].comment_number} must be answered before resubmitting.`,
            };
          }
        }
      }
    }

    const nextRevNo = drawing.latest_rev_no !== null ? drawing.latest_rev_no + 1 : 0;

    // 3. Mark previous revisions as superseded
    if (drawing.latest_rev_no !== null) {
      await supabase
        .from("dmac_drawing_revisions")
        .update({ is_superseded: true })
        .eq("drawing_id", params.drawingId);
    }

    // 4. Create New Revision
    const { data: newRev, error: revErr } = await supabase
      .from("dmac_drawing_revisions")
      .insert({
        drawing_id: params.drawingId,
        rev_no: nextRevNo,
        submitted_by: user?.id,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (revErr || !newRev) throw revErr;

    // 5. Insert Files
    if (params.files && params.files.length > 0) {
      const filesToInsert = params.files.map((f) => ({
        revision_id: newRev.id,
        file_role: f.fileRole,
        storage_key: f.storageKey,
        file_name: f.fileName,
        file_size_bytes: f.fileSizeBytes,
        checksum_sha256: f.checksumSha256,
      }));
      await supabase.from("dmac_revision_files").insert(filesToInsert);
    }

    // 6. Record Comment Thread Responses & Resolve
    if (params.commentResponses && params.commentResponses.length > 0) {
      for (const cr of params.commentResponses) {
        await supabase.from("dmac_comment_threads").insert({
          comment_id: cr.commentId,
          author_id: user?.id,
          author_role: "DESIGN_LEAD",
          message: cr.responseMessage,
          revision_id: newRev.id,
        });

        await supabase
          .from("dmac_drawing_comments")
          .update({
            status: "RESOLVED",
            resolved_in_revision_id: newRev.id,
          })
          .eq("id", cr.commentId);
      }
    }

    // 7. Update Drawing State
    await supabase
      .from("dmac_drawings")
      .update({
        latest_rev_no: nextRevNo,
        current_status: "UNDER_REVIEW",
        current_holder: "ENGINEERING",
        status_changed_at: new Date().toISOString(),
      })
      .eq("id", params.drawingId);

    // 8. Audit Log
    await supabase.from("dms_audit_logs").insert({
      actor_id: user?.id,
      actor_email: user?.email,
      action: "UPLOAD",
      entity_type: "REVISION",
      entity_id: newRev.id,
      details: {
        drawingId: params.drawingId,
        revisionNumber: `R${nextRevNo}`,
      },
    });

    return { success: true, data: { revisionId: newRev.id, revisionNumber: `R${nextRevNo}` } };
  } catch (err: any) {
    console.error("[submitDrawingRevisionAction] Error:", err);
    return { success: false, error: err.message || "Failed to submit revision" };
  }
}

/**
 * Record Review Decision (Code A, B, C, D with comments)
 */
export async function reviewDrawingRevisionAction(params: {
  drawingId: string;
  revisionId: string;
  decisionCode: "A" | "B" | "C" | "D";
  remarks: string;
  comments?: {
    commentNumber: number;
    category: "DESIGN" | "COORDINATION" | "COMPLIANCE" | "DRAFTING";
    severity: "LOW" | "MEDIUM" | "HIGH" | "BLOCKER";
    commentText: string;
    markupGeometry?: any;
  }[];
}) {
  try {
    await requireDesign("gfc");
    const supabase = await getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Authentication required to review drawing revisions" };
    }

    // 1. Insert Review Step
    await supabase.from("dmac_review_steps").insert({
      revision_id: params.revisionId,
      reviewer_id: user?.id,
      role_type: "ENGINEERING_REVIEWER",
      decision_code: params.decisionCode,
      remarks: params.remarks,
      decided_at: new Date().toISOString(),
    });

    // 2. Insert Comments (for Code B, C, D)
    if (params.comments && params.comments.length > 0) {
      const commentsToInsert = params.comments.map((c) => ({
        revision_id: params.revisionId,
        comment_number: c.commentNumber,
        category: c.category,
        severity: c.severity,
        comment_text: c.commentText,
        markup_geometry: c.markupGeometry || null,
        status: "OPEN",
        created_by: user?.id,
      }));
      await supabase.from("dmac_drawing_comments").insert(commentsToInsert);
    }

    // 3. Update Drawing Status & Ball-in-Court Holder
    let newStatus: "APPROVED" | "RETURNED" | "UNDER_REVIEW" = "UNDER_REVIEW";
    let newHolder: "DESIGN" | "ENGINEERING" | "NONE" = "NONE";

    if (params.decisionCode === "A" || params.decisionCode === "B") {
      newStatus = "APPROVED";
      newHolder = "NONE";
    } else if (params.decisionCode === "C" || params.decisionCode === "D") {
      newStatus = "RETURNED";
      newHolder = "DESIGN";
    }

    await supabase
      .from("dmac_drawings")
      .update({
        current_status: newStatus,
        current_holder: newHolder,
        status_changed_at: new Date().toISOString(),
      })
      .eq("id", params.drawingId);

    // 4. Audit Log
    await supabase.from("dms_audit_logs").insert({
      actor_id: user?.id,
      actor_email: user?.email,
      action: "APPROVE",
      entity_type: "REVISION",
      entity_id: params.revisionId,
      details: {
        decisionCode: params.decisionCode,
        remarks: params.remarks,
        commentCount: params.comments?.length || 0,
      },
    });

    return { success: true, data: { status: newStatus, holder: newHolder } };
  } catch (err: any) {
    console.error("[reviewDrawingRevisionAction] Error:", err);
    return { success: false, error: err.message || "Failed to record review decision" };
  }
}

/**
 * Fetch Waiting Longest SLA Work Queue
 */
export async function fetchWaitingLongestQueueAction(projectId: string) {
  try {
    await requireDesign("any");
    const supabase = await getSupabase();

    const { data, error } = await supabase
      .from("v_dmac_drawings_live_status")
      .select("*")
      .eq("project_id", projectId)
      .in("current_status", ["UNDER_REVIEW", "RETURNED"])
      .order("days_in_current_state", { ascending: false })
      .limit(15);

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err: any) {
    console.error("[fetchWaitingLongestQueueAction] Error:", err);
    return { success: false, error: err.message || "Failed to fetch waiting queue" };
  }
}

/**
 * Save / Create Individual Markup Comment
 */
export async function createMarkupCommentAction(params: {
  revisionId: string;
  category: "DESIGN" | "COORDINATION" | "COMPLIANCE" | "DRAFTING";
  severity: "LOW" | "MEDIUM" | "HIGH" | "BLOCKER";
  commentText: string;
  markupGeometry: {
    tool: "cloud" | "arrow" | "callout" | "rect" | "freehand" | "measure";
    x: number;
    y: number;
    width?: number;
    height?: number;
    points?: { x: number; y: number }[];
    arrowEnd?: { x: number; y: number };
    text?: string;
    measurementValue?: string;
    color?: string;
    strokeWidth?: number;
  };
}) {
  try {
    await requireDesign("any");
    const supabase = await getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Authentication required to create markup comments" };
    }

    // Compute next comment number for this revision
    const { data: existingComments } = await supabase
      .from("dmac_drawing_comments")
      .select("comment_number")
      .eq("revision_id", params.revisionId)
      .order("comment_number", { ascending: false })
      .limit(1);

    const nextNo = (existingComments && existingComments.length > 0)
      ? existingComments[0].comment_number + 1
      : 1;

    const { data: newComment, error: insertErr } = await supabase
      .from("dmac_drawing_comments")
      .insert({
        revision_id: params.revisionId,
        comment_number: nextNo,
        category: params.category,
        severity: params.severity,
        comment_text: params.commentText,
        markup_geometry: params.markupGeometry,
        status: "OPEN",
        created_by: user?.id || null,
        author_role: "ENGINEERING_REVIEWER",
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return { success: true, comment: newComment };
  } catch (err: any) {
    console.error("[createMarkupCommentAction] Error:", err);
    return { success: false, error: err.message || "Failed to create markup comment" };
  }
}

/**
 * Update Individual Markup Comment
 */
export async function updateMarkupCommentAction(params: {
  commentId: string;
  commentText?: string;
  category?: "DESIGN" | "COORDINATION" | "COMPLIANCE" | "DRAFTING";
  severity?: "LOW" | "MEDIUM" | "HIGH" | "BLOCKER";
  markupGeometry?: any;
  status?: "OPEN" | "RESOLVED" | "CLOSED";
}) {
  try {
    await requireDesign("any");
    const supabase = await getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Authentication required to update markup comment" };
    }
    const updatePayload: Record<string, any> = {};
    if (params.commentText !== undefined) updatePayload.comment_text = params.commentText;
    if (params.category !== undefined) updatePayload.category = params.category;
    if (params.severity !== undefined) updatePayload.severity = params.severity;
    if (params.markupGeometry !== undefined) updatePayload.markup_geometry = params.markupGeometry;
    if (params.status !== undefined) updatePayload.status = params.status;

    const { data: updated, error } = await supabase
      .from("dmac_drawing_comments")
      .update(updatePayload)
      .eq("id", params.commentId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, comment: updated };
  } catch (err: any) {
    console.error("[updateMarkupCommentAction] Error:", err);
    return { success: false, error: err.message || "Failed to update markup comment" };
  }
}

/**
 * Delete Markup Comment
 */
export async function deleteMarkupCommentAction(commentId: string) {
  try {
    await requireDesign("any");
    const supabase = await getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Authentication required to delete markup comment" };
    }
    // Delete associated thread messages first
    await supabase.from("dmac_comment_threads").delete().eq("comment_id", commentId);
    const { error } = await supabase.from("dmac_drawing_comments").delete().eq("id", commentId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("[deleteMarkupCommentAction] Error:", err);
    return { success: false, error: err.message || "Failed to delete markup comment" };
  }
}

/**
 * Add Comment Thread Reply
 */
export async function addCommentThreadReplyAction(params: {
  commentId: string;
  message: string;
  authorRole?: string;
  authorEmail?: string;
}) {
  try {
    await requireDesign("any");
    const supabase = await getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Authentication required to post thread reply" };
    }

    const { data: reply, error } = await supabase
      .from("dmac_comment_threads")
      .insert({
        comment_id: params.commentId,
        author_id: user?.id || null,
        author_role: params.authorRole || (user ? "ENGINEERING_REVIEWER" : "EXTERNAL_CONSULTANT"),
        author_email: params.authorEmail || user?.email || null,
        message: params.message,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, reply };
  } catch (err: any) {
    console.error("[addCommentThreadReplyAction] Error:", err);
    return { success: false, error: err.message || "Failed to post thread reply" };
  }
}

