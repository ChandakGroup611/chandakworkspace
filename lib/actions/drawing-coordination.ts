"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireDesign } from "@/lib/permissions/design-guard";
import { hasPermission } from "@/lib/permissions";
import { notifyDrawingEvent } from "@/lib/dmac/notify";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface DrawingTrackerRow {
  id: string;
  drawingId: string;
  drawingNumber: string;
  referenceNumber: string | null;
  drawingTitle: string;
  projectId: string;
  projectName: string;
  subPackage: string | null;
  departmentId: string;
  disciplineName: string;
  currentRevNo: number;
  approvalStatus: string;
  activeTaskId: string | null;
  taskCode: string | null;
  taskStatusName: string | null;
  taskCreatedAt: string | null;
  taskSyncStatus: "SYNCED" | "PENDING" | "FAILED";
  taskSyncError: string | null;
  designOwnerId: string | null;
  designOwnerName: string | null;
  receivingDepartmentId: string | null;
  receivingDepartmentName: string | null;
  currentResponsibleDepartmentId: string | null;
  currentResponsibleDepartmentName: string | null;
  currentResponsibleUserId: string | null;
  currentResponsibleUserName: string | null;
  coordinationStatusCode: string;
  coordinationStatusName: string;
  pendingAction: string | null;
  lastHandoverAt: string | null;
  lastReceivedAt: string | null;
  lastReceivedRevNo: number | null;
  designReceivedAt: string | null;
  designReceivedRevNo: number | null;
  lastReturnedAt: string | null;
  lastReturnReason: string | null;
  nextCheckIntervalCode: string;
  nextCheckAt: string | null;
  nextCreationIntervalCode: string;
  nextCreationAt: string | null;
  slaStatusCode: string;
  slaStatusName: string;
  slaDueAt: string | null;
  slaBreachedAt: string | null;
  isClosed: boolean;
  closedAt: string | null;
}

export interface DrawingAuditTimelineRow {
  id: string;
  revNo: number;
  taskId: string | null;
  previousStatus: string | null;
  newStatus: string | null;
  action: string;
  actorEmail: string | null;
  details: Record<string, any>;
  createdAt: string;
}

/** Month-end safe schedule calculation anchored to server timestamp in Asia/Kolkata. */
function computeNextDate(
  baseIso: string,
  intervalType: "WEEKLY" | "MONTHLY" | "CUSTOM",
  intervalDays = 7,
  customIso?: string | null
): string {
  if (intervalType === "CUSTOM" && customIso) {
    const parsed = new Date(customIso);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  const base = new Date(baseIso);
  if (intervalType === "MONTHLY") {
    const ist = new Date(base.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const year = ist.getFullYear();
    const month = ist.getMonth();
    const day = ist.getDate();
    const targetMonth = month + 1;
    const daysInTarget = new Date(year, targetMonth + 1, 0).getDate();
    const clampedDay = Math.min(day, daysInTarget);
    const next = new Date(base);
    next.setUTCFullYear(year, targetMonth, clampedDay);
    return next.toISOString();
  }
  const days = Math.max(1, intervalType === "WEEKLY" ? intervalDays || 7 : intervalDays || 1);
  return new Date(base.getTime() + days * 86400000).toISOString();
}

async function resolveScheduleInterval(code: string): Promise<{ code: string; intervalType: "WEEKLY" | "MONTHLY" | "CUSTOM"; intervalDays: number }> {
  const { data } = await supabaseAdmin
    .from("drawing_schedule_intervals")
    .select("code, interval_type, interval_days")
    .eq("code", code)
    .eq("is_deleted", false)
    .maybeSingle();
  if (data) {
    return {
      code: data.code,
      intervalType: data.interval_type,
      intervalDays: Number(data.interval_days || 7),
    };
  }
  if (code === "MONTHLY") return { code: "MONTHLY", intervalType: "MONTHLY", intervalDays: 30 };
  if (code === "CUSTOM") return { code: "CUSTOM", intervalType: "CUSTOM", intervalDays: 1 };
  return { code: "WEEKLY", intervalType: "WEEKLY", intervalDays: 7 };
}

async function resolveTaskStatusId(coordinationStatusCode: string): Promise<string | null> {
  const { data: cs } = await supabaseAdmin
    .from("drawing_coordination_statuses")
    .select("task_status_code")
    .eq("code", coordinationStatusCode)
    .maybeSingle();
  const targetCode = cs?.task_status_code || "WORK INPROGRESS";
  const { data: sm } = await supabaseAdmin
    .from("status_master")
    .select("id")
    .eq("scope_type", "TASK")
    .eq("status_code", targetCode)
    .eq("is_deleted", false)
    .maybeSingle();
  if (sm?.id) return sm.id;
  const { data: fallback } = await supabaseAdmin
    .from("status_master")
    .select("id")
    .eq("scope_type", "TASK")
    .eq("is_deleted", false)
    .order("status_order")
    .limit(1)
    .maybeSingle();
  return fallback?.id || null;
}

async function appendAudit(params: {
  trackerId: string;
  drawingId: string;
  drawingNumber: string;
  revNo: number;
  taskId?: string | null;
  previousStatus?: string | null;
  newStatus?: string | null;
  action: string;
  actorId?: string | null;
  actorEmail?: string | null;
  prevDeptId?: string | null;
  newDeptId?: string | null;
  prevUserId?: string | null;
  newUserId?: string | null;
  details?: Record<string, any>;
}) {
  await supabaseAdmin.from("drawing_coordination_audit_logs").insert({
    tracker_id: params.trackerId,
    drawing_id: params.drawingId,
    drawing_number: params.drawingNumber,
    rev_no: params.revNo,
    task_id: params.taskId || null,
    previous_status: params.previousStatus || null,
    new_status: params.newStatus || null,
    action: params.action,
    actor_id: params.actorId || null,
    actor_email: params.actorEmail || null,
    previous_responsible_department_id: params.prevDeptId || null,
    new_responsible_department_id: params.newDeptId || null,
    previous_responsible_user_id: params.prevUserId || null,
    new_responsible_user_id: params.newUserId || null,
    details: params.details || {},
  });
}

async function createLinkedDrawingTask(params: {
  trackerId: string;
  drawingId: string;
  drawingNumber: string;
  referenceNumber: string | null;
  drawingTitle: string;
  revNo: number;
  projectId: string;
  subPackage: string | null;
  departmentId: string;
  approvalStepId: string | null;
  approvedFileId: string | null;
  actorId: string;
  assigneeId: string | null;
  receivingDepartmentId: string | null;
  coordinationStatusCode: string;
  generationNo: number;
  previousTaskId?: string | null;
  dueDateIso: string;
}): Promise<{ taskId: string; createdAt: string }> {
  const { data: ws } = await supabaseAdmin
    .from("workspaces")
    .select("id")
    .eq("is_deleted", false)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!ws?.id) throw new Error("No active workspace found for Task Management.");

  const statusId = await resolveTaskStatusId(params.coordinationStatusCode);
  if (!statusId) throw new Error("No active TASK status found in status_master.");

  const nowIso = new Date().toISOString();
  const subject = `[Drawing ${params.drawingNumber} R${params.revNo}] ${params.drawingTitle}`.slice(0, 200);
  const description = `Automated Drawing Submission & Coordination Task for ${params.drawingNumber} (Rev R${params.revNo}).`;

  const { data: task, error } = await supabaseAdmin
    .from("tasks")
    .insert({
      workspace_id: ws.id,
      subject,
      description,
      status_id: statusId,
      department_id: params.receivingDepartmentId || null,
      start_date: nowIso,
      end_date: params.dueDateIso,
      created_by: params.actorId,
      owner_id: params.assigneeId || params.actorId,
      assigned_to: params.assigneeId || params.actorId,
      tat_status: "Within SLA",
      custom_fields: {
        drawing_id: params.drawingId,
        drawing_number: params.drawingNumber,
        reference_number: params.referenceNumber,
        revision: `R${params.revNo}`,
        project_id: params.projectId,
        sub_package: params.subPackage,
        discipline_id: params.departmentId,
        approval_step_id: params.approvalStepId,
        approved_file_id: params.approvedFileId,
        tracker_id: params.trackerId,
        generation_no: params.generationNo,
      },
    })
    .select("id, created_at")
    .single();
  if (error) throw error;

  await supabaseAdmin.from("drawing_task_generations").insert({
    tracker_id: params.trackerId,
    generation_no: params.generationNo,
    task_id: task.id,
    previous_task_id: params.previousTaskId || null,
    scheduled_for: params.dueDateIso,
    rev_no: params.revNo,
    created_by: params.actorId,
  });

  return { taskId: task.id, createdAt: task.created_at };
}

/**
 * Idempotent trigger called after final drawing approval (Decision A or B).
 * Never throws to break approval; records task_sync_status = 'FAILED' on error for safe retry.
 */
export async function initiateDrawingCoordinationOnApproval(params: {
  drawingId: string;
  approvalStepId?: string | null;
  actorId: string;
  actorEmail?: string | null;
  receivingDepartmentId?: string | null;
  nextCheckCode?: string;
  nextCreationCode?: string;
}): Promise<{ trackerId?: string; taskSyncStatus: "SYNCED" | "FAILED"; error?: string }> {
  try {
    const { data: dr } = await supabaseAdmin
      .from("dmac_drawings")
      .select("id, drawing_number, reference_number, title, project_id, sub_package, department_id, latest_rev_no, design_owner_id, created_by")
      .eq("id", params.drawingId)
      .single();
    if (!dr) return { taskSyncStatus: "FAILED", error: "Drawing not found." };

    const { data: rev } = await supabaseAdmin
      .from("dmac_drawing_revisions")
      .select("id, rev_no, dmac_revision_files(id, file_role)")
      .eq("drawing_id", dr.id)
      .eq("is_superseded", false)
      .maybeSingle();
    const primaryFile = (rev?.dmac_revision_files || []).find((f: any) => f.file_role === "PRIMARY_PDF") || (rev?.dmac_revision_files || [])[0];
    const revNo = rev?.rev_no ?? dr.latest_rev_no ?? 0;

    let receivingDeptId = params.receivingDepartmentId || null;
    if (!receivingDeptId) {
      const { data: engDept } = await supabaseAdmin
        .from("departments")
        .select("id")
        .or("is_deleted.is.null,is_deleted.eq.false")
        .ilike("name", "%Engineering%")
        .limit(1)
        .maybeSingle();
      receivingDeptId = engDept?.id || null;
    }

    const { data: existing } = await supabaseAdmin
      .from("drawing_coordination_tracker")
      .select("*")
      .eq("drawing_id", dr.id)
      .maybeSingle();

    const nowIso = new Date().toISOString();
    const checkCfg = await resolveScheduleInterval(params.nextCheckCode || existing?.next_check_interval_code || "WEEKLY");
    const creationCfg = await resolveScheduleInterval(params.nextCreationCode || existing?.next_creation_interval_code || "MONTHLY");
    const nextCheckAt = computeNextDate(nowIso, checkCfg.intervalType, checkCfg.intervalDays);
    const nextCreationAt = computeNextDate(nowIso, creationCfg.intervalType, creationCfg.intervalDays);

    if (existing) {
      await supabaseAdmin
        .from("drawing_coordination_tracker")
        .update({
          current_rev_no: revNo,
          approval_status: "APPROVED",
          approval_step_id: params.approvalStepId || existing.approval_step_id,
          approved_file_id: primaryFile?.id || existing.approved_file_id,
          approved_at: nowIso,
          approved_by: params.actorId,
          coordination_status_code: existing.is_closed ? existing.coordination_status_code : "AWAITING_DRAWING_RECEIPT",
          pending_action: existing.is_closed ? null : "Confirm Drawing Received",
          last_handover_at: nowIso,
          current_responsible_department_id: receivingDeptId || existing.current_responsible_department_id,
          updated_at: nowIso,
        })
        .eq("id", existing.id);

      await appendAudit({
        trackerId: existing.id,
        drawingId: dr.id,
        drawingNumber: dr.drawing_number,
        revNo,
        taskId: existing.active_task_id,
        previousStatus: existing.coordination_status_code,
        newStatus: "AWAITING_DRAWING_RECEIPT",
        action: "DRAWING_APPROVED",
        actorId: params.actorId,
        actorEmail: params.actorEmail,
        details: { approvalStepId: params.approvalStepId, fileId: primaryFile?.id },
      });

      if (existing.active_task_id) {
        return { trackerId: existing.id, taskSyncStatus: "SYNCED" };
      }
    }

    const { data: tracker, error: trErr } = existing
      ? { data: existing, error: null }
      : await supabaseAdmin
          .from("drawing_coordination_tracker")
          .insert({
            drawing_id: dr.id,
            drawing_number: dr.drawing_number,
            reference_number: dr.reference_number || null,
            drawing_title: dr.title,
            project_id: dr.project_id,
            sub_package: dr.sub_package || null,
            department_id: dr.department_id,
            current_rev_no: revNo,
            approval_status: "APPROVED",
            approval_step_id: params.approvalStepId || null,
            approved_file_id: primaryFile?.id || null,
            approved_at: nowIso,
            approved_by: params.actorId,
            task_sync_status: "PENDING",
            design_owner_id: dr.design_owner_id || dr.created_by,
            receiving_department_id: receivingDeptId,
            current_responsible_department_id: receivingDeptId,
            current_responsible_user_id: dr.design_owner_id || dr.created_by,
            coordination_status_code: "AWAITING_DRAWING_RECEIPT",
            pending_action: "Confirm Drawing Received",
            last_handover_at: nowIso,
            next_check_interval_code: checkCfg.code,
            next_check_at: nextCheckAt,
            next_creation_interval_code: creationCfg.code,
            next_creation_at: nextCreationAt,
            sla_status_code: "WITHIN_SLA",
            sla_due_at: nextCheckAt,
          })
          .select("*")
          .single();

    if (trErr || !tracker) throw trErr || new Error("Could not create tracker.");

    try {
      const createdTask = await createLinkedDrawingTask({
        trackerId: tracker.id,
        drawingId: dr.id,
        drawingNumber: dr.drawing_number,
        referenceNumber: dr.reference_number || null,
        drawingTitle: dr.title,
        revNo,
        projectId: dr.project_id,
        subPackage: dr.sub_package || null,
        departmentId: dr.department_id,
        approvalStepId: params.approvalStepId || null,
        approvedFileId: primaryFile?.id || null,
        actorId: params.actorId,
        assigneeId: dr.design_owner_id || dr.created_by || params.actorId,
        receivingDepartmentId: receivingDeptId,
        coordinationStatusCode: "AWAITING_DRAWING_RECEIPT",
        generationNo: 1,
        dueDateIso: nextCheckAt,
      });

      const computedCheckAt = computeNextDate(createdTask.createdAt, checkCfg.intervalType, checkCfg.intervalDays);
      const computedCreationAt = computeNextDate(createdTask.createdAt, creationCfg.intervalType, creationCfg.intervalDays);

      await supabaseAdmin
        .from("drawing_coordination_tracker")
        .update({
          active_task_id: createdTask.taskId,
          task_created_at: createdTask.createdAt,
          task_sync_status: "SYNCED",
          task_sync_error: null,
          next_check_at: computedCheckAt,
          next_creation_at: computedCreationAt,
          sla_due_at: computedCheckAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tracker.id);

      await appendAudit({
        trackerId: tracker.id,
        drawingId: dr.id,
        drawingNumber: dr.drawing_number,
        revNo,
        taskId: createdTask.taskId,
        previousStatus: "APPROVED",
        newStatus: "AWAITING_DRAWING_RECEIPT",
        action: "TASK_CREATED_AND_HANDED_OVER",
        actorId: params.actorId,
        actorEmail: params.actorEmail,
        newDeptId: receivingDeptId,
        details: { nextCheckAt: computedCheckAt, nextCreationAt: computedCreationAt },
      });

      await notifyDrawingEvent("Drawing Coordination Started", dr.id, params.actorId, {
        next_check_date: computedCheckAt,
      }).catch(() => {});

      return { trackerId: tracker.id, taskSyncStatus: "SYNCED" };
    } catch (taskErr: any) {
      await supabaseAdmin
        .from("drawing_coordination_tracker")
        .update({
          task_sync_status: "FAILED",
          task_sync_error: String(taskErr?.message || "Task creation failed").slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq("id", tracker.id);
      return { trackerId: tracker.id, taskSyncStatus: "FAILED", error: taskErr?.message };
    }
  } catch (err: any) {
    return { taskSyncStatus: "FAILED", error: err?.message || "Coordination init failed" };
  }
}

export async function retryDrawingTaskSyncAction(trackerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireDesign("any");
    if (!UUID_RE.test(trackerId)) throw new Error("Invalid tracker ID.");
    const { data: t } = await supabaseAdmin.from("drawing_coordination_tracker").select("*").eq("id", trackerId).single();
    if (!t) throw new Error("Tracker not found.");
    if (t.active_task_id) return { success: true };

    const res = await initiateDrawingCoordinationOnApproval({
      drawingId: t.drawing_id,
      approvalStepId: t.approval_step_id,
      actorId: user.id,
      actorEmail: user.email,
      receivingDepartmentId: t.receiving_department_id,
      nextCheckCode: t.next_check_interval_code,
      nextCreationCode: t.next_creation_interval_code,
    });
    if (res.taskSyncStatus !== "SYNCED") throw new Error(res.error || "Task retry failed.");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not retry task sync." };
  }
}

async function syncTaskStatusFromCoordination(taskId: string | null, coordinationStatusCode: string) {
  if (!taskId) return;
  const statusId = await resolveTaskStatusId(coordinationStatusCode);
  if (!statusId) return;
  await supabaseAdmin
    .from("tasks")
    .update({ status_id: statusId, updated_at: new Date().toISOString() })
    .eq("id", taskId);
}

async function assertDepartmentOrAdmin(userId: string, departmentId: string | null) {
  if (await hasPermission(userId, "SUPER_ADMIN")) return;
  const { data: da } = await supabaseAdmin.from("design_user_access").select("design_role").eq("user_id", userId).maybeSingle();
  if (da?.design_role === "DESIGN_ADMIN") return;
  if (!departmentId) return;
  const { data: um } = await supabaseAdmin.from("user_master").select("department_id").eq("id", userId).maybeSingle();
  if (um?.department_id === departmentId) return;
  const { data: uda } = await supabaseAdmin
    .from("user_department_access")
    .select("department_id")
    .eq("user_id", userId)
    .eq("department_id", departmentId)
    .maybeSingle();
  if (uda) return;
  throw new Error("Only members of the receiving department or Design Administrators can confirm this action.");
}

export async function confirmDrawingReceivedAction(params: {
  trackerId: string;
  revNo: number;
  remarks?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireDesign("any");
    const { data: t } = await supabaseAdmin.from("drawing_coordination_tracker").select("*").eq("id", params.trackerId).single();
    if (!t) throw new Error("Tracker not found.");
    if (t.is_closed) throw new Error("Drawing coordination is already closed.");
    if (params.revNo !== t.current_rev_no) {
      throw new Error(`Outdated revision: current revision is R${t.current_rev_no}.`);
    }
    await assertDepartmentOrAdmin(user.id, t.receiving_department_id);

    const nowIso = new Date().toISOString();
    const prev = t.coordination_status_code;
    await supabaseAdmin
      .from("drawing_coordination_tracker")
      .update({
        coordination_status_code: "DRAWING_RECEIVED",
        pending_action: "Confirm Design Received",
        last_received_at: nowIso,
        last_received_by: user.id,
        last_received_rev_no: t.current_rev_no,
        current_responsible_user_id: user.id,
        updated_at: nowIso,
      })
      .eq("id", t.id);

    await syncTaskStatusFromCoordination(t.active_task_id, "DRAWING_RECEIVED");
    await appendAudit({
      trackerId: t.id,
      drawingId: t.drawing_id,
      drawingNumber: t.drawing_number,
      revNo: t.current_rev_no,
      taskId: t.active_task_id,
      previousStatus: prev,
      newStatus: "DRAWING_RECEIVED",
      action: "DRAWING_RECEIVED_CONFIRMED",
      actorId: user.id,
      actorEmail: user.email,
      newDeptId: t.receiving_department_id,
      newUserId: user.id,
      details: { remarks: params.remarks || null },
    });

    await notifyDrawingEvent("Drawing Receipt Confirmed", t.drawing_id, user.id, {}).catch(() => {});
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not confirm drawing receipt." };
  }
}

export async function confirmDesignReceivedAction(params: {
  trackerId: string;
  revNo: number;
  remarks?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireDesign("any");
    const { data: t } = await supabaseAdmin.from("drawing_coordination_tracker").select("*").eq("id", params.trackerId).single();
    if (!t) throw new Error("Tracker not found.");
    if (t.is_closed) throw new Error("Drawing coordination is already closed.");
    if (params.revNo !== t.current_rev_no) {
      throw new Error(`Outdated revision: current revision is R${t.current_rev_no}.`);
    }
    await assertDepartmentOrAdmin(user.id, t.receiving_department_id);

    const nowIso = new Date().toISOString();
    const prev = t.coordination_status_code;
    await supabaseAdmin
      .from("drawing_coordination_tracker")
      .update({
        coordination_status_code: "DESIGN_RECEIVED",
        pending_action: "Submit Review Outcome",
        design_received_at: nowIso,
        design_received_by: user.id,
        design_received_rev_no: t.current_rev_no,
        current_responsible_user_id: user.id,
        updated_at: nowIso,
      })
      .eq("id", t.id);

    await syncTaskStatusFromCoordination(t.active_task_id, "DESIGN_RECEIVED");
    await appendAudit({
      trackerId: t.id,
      drawingId: t.drawing_id,
      drawingNumber: t.drawing_number,
      revNo: t.current_rev_no,
      taskId: t.active_task_id,
      previousStatus: prev,
      newStatus: "DESIGN_RECEIVED",
      action: "DESIGN_RECEIVED_CONFIRMED",
      actorId: user.id,
      actorEmail: user.email,
      newDeptId: t.receiving_department_id,
      newUserId: user.id,
      details: { remarks: params.remarks || null },
    });

    await notifyDrawingEvent("Design Received", t.drawing_id, user.id, {}).catch(() => {});
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not confirm design received." };
  }
}

export async function submitCoordinationReviewOutcomeAction(params: {
  trackerId: string;
  outcomeCode: string;
  revNo: number;
  remarks?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireDesign("any");
    const { data: t } = await supabaseAdmin.from("drawing_coordination_tracker").select("*").eq("id", params.trackerId).single();
    if (!t) throw new Error("Tracker not found.");
    if (t.is_closed) throw new Error("Drawing coordination is already closed.");
    if (params.revNo !== t.current_rev_no) {
      throw new Error(`Outdated revision: current revision is R${t.current_rev_no}.`);
    }
    await assertDepartmentOrAdmin(user.id, t.receiving_department_id);

    const { data: outcome } = await supabaseAdmin
      .from("drawing_review_outcomes")
      .select("*")
      .eq("code", params.outcomeCode)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .maybeSingle();
    if (!outcome) throw new Error("Invalid review outcome.");

    const remarks = String(params.remarks || "").trim();
    if (outcome.requires_comment && remarks.length < 3) {
      throw new Error("Please enter review comments / return reason.");
    }

    const nowIso = new Date().toISOString();
    const prev = t.coordination_status_code;
    const nextStatus = outcome.target_coordination_status;
    const isReturn = params.outcomeCode === "RETURN_FOR_REVISION";
    const isAccept = params.outcomeCode === "ACCEPT";

    await supabaseAdmin
      .from("drawing_coordination_tracker")
      .update({
        coordination_status_code: nextStatus,
        pending_action: isReturn
          ? "Upload Revised Drawing"
          : isAccept
          ? "Close Drawing Coordination"
          : "Complete Pending Review",
        last_returned_at: isReturn ? nowIso : t.last_returned_at,
        last_returned_by: isReturn ? user.id : t.last_returned_by,
        last_return_reason: isReturn ? remarks : t.last_return_reason,
        current_responsible_user_id: isReturn ? t.design_owner_id : user.id,
        updated_at: nowIso,
      })
      .eq("id", t.id);

    await syncTaskStatusFromCoordination(t.active_task_id, nextStatus);
    await appendAudit({
      trackerId: t.id,
      drawingId: t.drawing_id,
      drawingNumber: t.drawing_number,
      revNo: t.current_rev_no,
      taskId: t.active_task_id,
      previousStatus: prev,
      newStatus: nextStatus,
      action: `REVIEW_OUTCOME_${params.outcomeCode}`,
      actorId: user.id,
      actorEmail: user.email,
      prevUserId: t.current_responsible_user_id,
      newUserId: isReturn ? t.design_owner_id : user.id,
      details: { outcomeCode: params.outcomeCode, outcomeName: outcome.name, remarks },
    });

    if (isReturn) {
      await notifyDrawingEvent("Drawing Returned for Revision", t.drawing_id, user.id, { remarks }).catch(() => {});
    } else if (isAccept) {
      await notifyDrawingEvent("Drawing Coordination Completed", t.drawing_id, user.id, { remarks }).catch(() => {});
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not submit review outcome." };
  }
}

export async function closeDrawingCoordinationAction(params: {
  trackerId: string;
  remarks?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireDesign("gfc");
    const { data: t } = await supabaseAdmin.from("drawing_coordination_tracker").select("*").eq("id", params.trackerId).single();
    if (!t) throw new Error("Tracker not found.");
    if (t.is_closed) return { success: true };

    const nowIso = new Date().toISOString();
    const prev = t.coordination_status_code;
    await supabaseAdmin
      .from("drawing_coordination_tracker")
      .update({
        coordination_status_code: "CLOSED",
        pending_action: null,
        sla_status_code: "RESOLVED",
        is_closed: true,
        closed_at: nowIso,
        closed_by: user.id,
        updated_at: nowIso,
      })
      .eq("id", t.id);

    await syncTaskStatusFromCoordination(t.active_task_id, "CLOSED");
    await appendAudit({
      trackerId: t.id,
      drawingId: t.drawing_id,
      drawingNumber: t.drawing_number,
      revNo: t.current_rev_no,
      taskId: t.active_task_id,
      previousStatus: prev,
      newStatus: "CLOSED",
      action: "COORDINATION_CLOSED",
      actorId: user.id,
      actorEmail: user.email,
      details: { remarks: params.remarks || null },
    });
    await notifyDrawingEvent("Drawing Task Closed", t.drawing_id, user.id, {
      remarks: params.remarks || undefined,
    }).catch(() => {});
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not close coordination." };
  }
}

export async function updateCoordinationScheduleAction(params: {
  trackerId: string;
  receivingDepartmentId?: string | null;
  nextCheckCode: string;
  nextCheckCustomDate?: string | null;
  nextCreationCode: string;
  nextCreationCustomDate?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireDesign("any");
    const { data: t } = await supabaseAdmin.from("drawing_coordination_tracker").select("*").eq("id", params.trackerId).single();
    if (!t) throw new Error("Tracker not found.");
    if (t.is_closed) throw new Error("Cannot edit schedule on a closed tracker.");

    const baseIso = t.task_created_at || t.created_at || new Date().toISOString();
    const checkCfg = await resolveScheduleInterval(params.nextCheckCode);
    const creationCfg = await resolveScheduleInterval(params.nextCreationCode);
    const nextCheckAt = computeNextDate(baseIso, checkCfg.intervalType, checkCfg.intervalDays, params.nextCheckCustomDate);
    const nextCreationAt = computeNextDate(baseIso, creationCfg.intervalType, creationCfg.intervalDays, params.nextCreationCustomDate);

    const nextDept = UUID_RE.test(params.receivingDepartmentId || "") ? params.receivingDepartmentId! : t.receiving_department_id;

    await supabaseAdmin
      .from("drawing_coordination_tracker")
      .update({
        receiving_department_id: nextDept,
        current_responsible_department_id: nextDept,
        next_check_interval_code: checkCfg.code,
        next_check_at: nextCheckAt,
        next_creation_interval_code: creationCfg.code,
        next_creation_at: nextCreationAt,
        sla_due_at: nextCheckAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", t.id);

    await appendAudit({
      trackerId: t.id,
      drawingId: t.drawing_id,
      drawingNumber: t.drawing_number,
      revNo: t.current_rev_no,
      taskId: t.active_task_id,
      previousStatus: t.coordination_status_code,
      newStatus: t.coordination_status_code,
      action: "SCHEDULE_AND_HANDOVER_UPDATED",
      actorId: user.id,
      actorEmail: user.email,
      prevDeptId: t.receiving_department_id,
      newDeptId: nextDept,
      details: { nextCheckCode: checkCfg.code, nextCheckAt, nextCreationCode: creationCfg.code, nextCreationAt },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not update schedule." };
  }
}

/** Called when Design uploads a new revision so the same active task and tracker continue seamlessly. */
export async function syncTrackerOnRevisionResubmitted(params: {
  drawingId: string;
  revNo: number;
  actorId: string;
  actorEmail?: string | null;
}) {
  const { data: t } = await supabaseAdmin
    .from("drawing_coordination_tracker")
    .select("*")
    .eq("drawing_id", params.drawingId)
    .maybeSingle();
  if (!t || t.is_closed) return;

  const nowIso = new Date().toISOString();
  const prev = t.coordination_status_code;
  await supabaseAdmin
    .from("drawing_coordination_tracker")
    .update({
      current_rev_no: params.revNo,
      coordination_status_code: "AWAITING_RE_RECEIPT",
      pending_action: "Confirm Drawing Received (Revised)",
      last_handover_at: nowIso,
      current_responsible_department_id: t.receiving_department_id,
      updated_at: nowIso,
    })
    .eq("id", t.id);

  await syncTaskStatusFromCoordination(t.active_task_id, "AWAITING_RE_RECEIPT");
  await appendAudit({
    trackerId: t.id,
    drawingId: t.drawing_id,
    drawingNumber: t.drawing_number,
    revNo: params.revNo,
    taskId: t.active_task_id,
    previousStatus: prev,
    newStatus: "AWAITING_RE_RECEIPT",
    action: "REVISED_DRAWING_RESUBMITTED",
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    newDeptId: t.receiving_department_id,
    details: { revNo: params.revNo },
  });

  await notifyDrawingEvent("Revised Drawing Resubmitted", t.drawing_id, params.actorId, {}).catch(() => {});
}

export async function fetchDrawingCoordinationTrackersAction(): Promise<{
  success: boolean;
  trackers?: DrawingTrackerRow[];
  departments?: { id: string; code: string; name: string }[];
  error?: string;
}> {
  try {
    await requireDesign("any");
    const [trRes, projRes, depRes, deptRes, stRes, slaRes, usersRes] = await Promise.all([
      supabaseAdmin.from("drawing_coordination_tracker").select("*").order("updated_at", { ascending: false }),
      supabaseAdmin.from("dmac_projects").select("id, name"),
      supabaseAdmin.from("dmac_departments").select("id, name"),
      supabaseAdmin.from("departments").select("id, code, name").or("is_deleted.is.null,is_deleted.eq.false").order("name"),
      supabaseAdmin.from("drawing_coordination_statuses").select("code, name"),
      supabaseAdmin.from("drawing_sla_statuses").select("code, name"),
      supabaseAdmin.from("user_master").select("id, full_name, email"),
    ]);
    if (trRes.error) throw trRes.error;

    const projMap = new Map((projRes.data || []).map((p: any) => [p.id, p.name]));
    const discMap = new Map((depRes.data || []).map((d: any) => [d.id, d.name]));
    const deptMap = new Map((deptRes.data || []).map((d: any) => [d.id, d.name]));
    const stMap = new Map((stRes.data || []).map((s: any) => [s.code, s.name]));
    const slaMap = new Map((slaRes.data || []).map((s: any) => [s.code, s.name]));
    const uMap = new Map((usersRes.data || []).map((u: any) => [u.id, u.full_name || u.email]));

    const taskIds = Array.from(new Set((trRes.data || []).map((r: any) => r.active_task_id).filter(Boolean)));
    const { data: taskRows } = taskIds.length
      ? await supabaseAdmin.from("tasks").select("id, task_code, status_id").in("id", taskIds)
      : { data: [] as any[] };
    const { data: taskStatuses } = await supabaseAdmin.from("status_master").select("id, status_name").eq("scope_type", "TASK");
    const tsMap = new Map((taskStatuses || []).map((s: any) => [s.id, s.status_name]));
    const taskMap = new Map((taskRows || []).map((t: any) => [t.id, t]));

    return {
      success: true,
      departments: (deptRes.data || []).map((d: any) => ({ id: d.id, code: d.code || "", name: d.name })),
      trackers: (trRes.data || []).map((r: any) => {
        const tk = r.active_task_id ? taskMap.get(r.active_task_id) : null;
        return {
          id: r.id,
          drawingId: r.drawing_id,
          drawingNumber: r.drawing_number,
          referenceNumber: r.reference_number || null,
          drawingTitle: r.drawing_title,
          projectId: r.project_id,
          projectName: projMap.get(r.project_id) || "—",
          subPackage: r.sub_package || null,
          departmentId: r.department_id,
          disciplineName: discMap.get(r.department_id) || "—",
          currentRevNo: r.current_rev_no ?? 0,
          approvalStatus: r.approval_status,
          activeTaskId: r.active_task_id || null,
          taskCode: tk?.task_code || null,
          taskStatusName: tk?.status_id ? tsMap.get(tk.status_id) || null : null,
          taskCreatedAt: r.task_created_at || null,
          taskSyncStatus: r.task_sync_status || "SYNCED",
          taskSyncError: r.task_sync_error || null,
          designOwnerId: r.design_owner_id || null,
          designOwnerName: r.design_owner_id ? uMap.get(r.design_owner_id) || null : null,
          receivingDepartmentId: r.receiving_department_id || null,
          receivingDepartmentName: r.receiving_department_id ? deptMap.get(r.receiving_department_id) || null : null,
          currentResponsibleDepartmentId: r.current_responsible_department_id || null,
          currentResponsibleDepartmentName: r.current_responsible_department_id ? deptMap.get(r.current_responsible_department_id) || null : null,
          currentResponsibleUserId: r.current_responsible_user_id || null,
          currentResponsibleUserName: r.current_responsible_user_id ? uMap.get(r.current_responsible_user_id) || null : null,
          coordinationStatusCode: r.coordination_status_code,
          coordinationStatusName: stMap.get(r.coordination_status_code) || r.coordination_status_code,
          pendingAction: r.pending_action || null,
          lastHandoverAt: r.last_handover_at || null,
          lastReceivedAt: r.last_received_at || null,
          lastReceivedRevNo: r.last_received_rev_no ?? null,
          designReceivedAt: r.design_received_at || null,
          designReceivedRevNo: r.design_received_rev_no ?? null,
          lastReturnedAt: r.last_returned_at || null,
          lastReturnReason: r.last_return_reason || null,
          nextCheckIntervalCode: r.next_check_interval_code || "WEEKLY",
          nextCheckAt: r.next_check_at || null,
          nextCreationIntervalCode: r.next_creation_interval_code || "MONTHLY",
          nextCreationAt: r.next_creation_at || null,
          slaStatusCode: r.sla_status_code || "WITHIN_SLA",
          slaStatusName: slaMap.get(r.sla_status_code) || r.sla_status_code,
          slaDueAt: r.sla_due_at || null,
          slaBreachedAt: r.sla_breached_at || null,
          isClosed: !!r.is_closed,
          closedAt: r.closed_at || null,
        };
      }),
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load Drawing Coordination Tracker." };
  }
}

export async function fetchDrawingCoordinationDetailAction(trackerId: string): Promise<{
  success: boolean;
  auditLogs?: DrawingAuditTimelineRow[];
  generations?: { generationNo: number; taskId: string; scheduledFor: string | null; revNo: number; createdAt: string }[];
  error?: string;
}> {
  try {
    await requireDesign("any");
    const [auditRes, genRes] = await Promise.all([
      supabaseAdmin
        .from("drawing_coordination_audit_logs")
        .select("*")
        .eq("tracker_id", trackerId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("drawing_task_generations")
        .select("generation_no, task_id, scheduled_for, rev_no, created_at")
        .eq("tracker_id", trackerId)
        .order("generation_no", { ascending: false }),
    ]);
    if (auditRes.error) throw auditRes.error;
    if (genRes.error) throw genRes.error;

    return {
      success: true,
      auditLogs: (auditRes.data || []).map((a: any) => ({
        id: a.id,
        revNo: a.rev_no,
        taskId: a.task_id || null,
        previousStatus: a.previous_status || null,
        newStatus: a.new_status || null,
        action: a.action,
        actorEmail: a.actor_email || null,
        details: a.details || {},
        createdAt: a.created_at,
      })),
      generations: (genRes.data || []).map((g: any) => ({
        generationNo: g.generation_no,
        taskId: g.task_id,
        scheduledFor: g.scheduled_for || null,
        revNo: g.rev_no,
        createdAt: g.created_at,
      })),
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load coordination timeline." };
  }
}

/** Cron-callable idempotent processor for Next Creation tasks & SLA breaches. */
export async function processDueDrawingCoordinationTasksAndSlaAction(): Promise<{
  slaUpdated: number;
  tasksGenerated: number;
}> {
  const now = new Date();
  const nowIso = now.toISOString();
  let slaUpdated = 0;
  let tasksGenerated = 0;

  const { data: active } = await supabaseAdmin
    .from("drawing_coordination_tracker")
    .select("*")
    .eq("is_closed", false);

  for (const t of active || []) {
    // 1. SLA Check (skip while SLA is paused)
    if (t.sla_due_at && !t.sla_paused) {
      const due = new Date(t.sla_due_at);
      const hoursLeft = (due.getTime() - now.getTime()) / 3600000;
      let nextSla = t.sla_status_code;
      if (hoursLeft < 0 && t.sla_status_code !== "SLA_BREACHED") {
        nextSla = "SLA_BREACHED";
      } else if (hoursLeft >= 0 && hoursLeft <= 24 && t.sla_status_code === "WITHIN_SLA") {
        nextSla = "DUE_SOON";
      }

      if (nextSla !== t.sla_status_code) {
        await supabaseAdmin
          .from("drawing_coordination_tracker")
          .update({
            sla_status_code: nextSla,
            sla_breached_at: nextSla === "SLA_BREACHED" ? t.sla_breached_at || nowIso : t.sla_breached_at,
            sla_last_notified_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", t.id);
        slaUpdated++;
        if (nextSla === "SLA_BREACHED") {
          await appendAudit({
            trackerId: t.id,
            drawingId: t.drawing_id,
            drawingNumber: t.drawing_number,
            revNo: t.current_rev_no,
            taskId: t.active_task_id,
            previousStatus: t.coordination_status_code,
            newStatus: t.coordination_status_code,
            action: "SLA_BREACHED",
            details: { slaDueAt: t.sla_due_at },
          });
          await notifyDrawingEvent("Drawing SLA Breached", t.drawing_id, t.design_owner_id || t.approved_by, {
            sla_due_date: t.sla_due_at,
          }).catch(() => {});
        } else if (nextSla === "DUE_SOON") {
          await notifyDrawingEvent("Drawing SLA Due Soon", t.drawing_id, t.design_owner_id || t.approved_by, {
            sla_due_date: t.sla_due_at,
          }).catch(() => {});
        }
      }
    }

    // 1b. Next Check Due Reminder (idempotent 12h window)
    if (
      t.next_check_at &&
      new Date(t.next_check_at) <= now &&
      (!t.sla_last_notified_at || new Date(t.sla_last_notified_at).getTime() < now.getTime() - 12 * 3600 * 1000)
    ) {
      await supabaseAdmin
        .from("drawing_coordination_tracker")
        .update({ sla_last_notified_at: nowIso, updated_at: nowIso })
        .eq("id", t.id);
      await appendAudit({
        trackerId: t.id,
        drawingId: t.drawing_id,
        drawingNumber: t.drawing_number,
        revNo: t.current_rev_no,
        taskId: t.active_task_id,
        previousStatus: t.coordination_status_code,
        newStatus: t.coordination_status_code,
        action: "NEXT_CHECK_DUE_NOTIFIED",
        details: { nextCheckAt: t.next_check_at },
      });
      await notifyDrawingEvent("Drawing Next Check Due", t.drawing_id, t.design_owner_id || t.approved_by, {
        next_check_date: t.next_check_at,
      }).catch(() => {});
    }

    // 2. Next Creation Task Generation (preserves existing SLA breach)
    if (t.next_creation_at && new Date(t.next_creation_at) <= now && t.approved_by) {
      const { data: gens } = await supabaseAdmin
        .from("drawing_task_generations")
        .select("generation_no")
        .eq("tracker_id", t.id)
        .order("generation_no", { ascending: false })
        .limit(1);
      const nextGenNo = (gens?.[0]?.generation_no || 1) + 1;

      const creationCfg = await resolveScheduleInterval(t.next_creation_interval_code || "MONTHLY");
      const nextCreationAt = computeNextDate(t.next_creation_at, creationCfg.intervalType, creationCfg.intervalDays);

      try {
        const created = await createLinkedDrawingTask({
          trackerId: t.id,
          drawingId: t.drawing_id,
          drawingNumber: t.drawing_number,
          referenceNumber: t.reference_number,
          drawingTitle: t.drawing_title,
          revNo: t.current_rev_no,
          projectId: t.project_id,
          subPackage: t.sub_package,
          departmentId: t.department_id,
          approvalStepId: t.approval_step_id,
          approvedFileId: t.approved_file_id,
          actorId: t.approved_by,
          assigneeId: t.current_responsible_user_id || t.design_owner_id,
          receivingDepartmentId: t.receiving_department_id,
          coordinationStatusCode: t.coordination_status_code,
          generationNo: nextGenNo,
          previousTaskId: t.active_task_id,
          dueDateIso: nextCreationAt,
        });

        await supabaseAdmin
          .from("drawing_coordination_tracker")
          .update({
            active_task_id: created.taskId,
            next_creation_at: nextCreationAt,
            updated_at: nowIso,
          })
          .eq("id", t.id);

        await appendAudit({
          trackerId: t.id,
          drawingId: t.drawing_id,
          drawingNumber: t.drawing_number,
          revNo: t.current_rev_no,
          taskId: created.taskId,
          previousStatus: t.coordination_status_code,
          newStatus: t.coordination_status_code,
          action: "NEXT_SCHEDULED_TASK_CREATED",
          details: { generationNo: nextGenNo, previousTaskId: t.active_task_id, nextCreationAt },
        });
        await notifyDrawingEvent("Drawing Next Task Created", t.drawing_id, t.approved_by, {}).catch(() => {});
        tasksGenerated++;
      } catch {
        // Safe retry on next cron run
      }
    }
  }

  return { slaUpdated, tasksGenerated };
}

export interface LiveMatrixDrawingRow {
  drawingId: string;
  drawingNumber: string;
  referenceNumber: string | null;
  title: string;
  projectId: string;
  projectName: string;
  towerName: string | null;
  packageId: string | null;
  packageName: string;
  subPackageName: string | null;
  consultantName: string | null;
  revNo: number;
  /** Exact status from Drawing Register (design_drawings.status) — single source of truth. */
  drawingRegisterStatus: string;
  trackerId: string | null;
  coordinationStatusCode: string | null;
  coordinationStatusName: string | null;
  taskId: string | null;
  taskCode: string | null;
  taskStatusName: string | null;
  responsibleDepartmentName: string | null;
  responsibleUserName: string | null;
  nextCheckAt: string | null;
  nextCreationAt: string | null;
  slaStatusCode: string | null;
  slaStatusName: string | null;
  lastReturnReason: string | null;
  isClosed: boolean;
}

export interface LiveTenderMatrixData {
  projects: { id: string; code: string; name: string; taggedConsultants: string[]; taggedPackages: string[] }[];
  towers: { id: string; projectId: string; name: string; taggedConsultants: string[]; taggedPackages: string[] }[];
  packages: { id: string; code: string; name: string }[];
  subPackages: { id: string; disciplineId: string; disciplineName: string; packageName: string; subPackageName: string; defaultConsultant: string | null }[];
  consultants: { id: string; firmName: string; discipline: string; categories: string[]; packages: string[]; subPackages: string[]; activeProjects: string[] }[];
  drawings: LiveMatrixDrawingRow[];
  summary: {
    totalDeliverables: number;
    submitted: number;
    approved: number;
    received: number;
    underReview: number;
    returnedForRevision: number;
    completed: number;
    slaBreached: number;
  };
}

const DMAC_STATUS_TO_REGISTER: Record<string, string> = {
  NOT_SUBMITTED: "Not Submitted",
  UNDER_REVIEW: "Under Review",
  RETURNED: "Revision Requested",
  APPROVED: "Approved",
  GFC: "Approved (GFC)",
};

export async function fetchDrawingRevisionHistoryForMatrixAction(drawingId: string): Promise<{
  success: boolean;
  revisions?: {
    id: string;
    revNo: number;
    submittedByName: string;
    submittedAt: string;
    changeSummary: string | null;
    isGfc: boolean;
    files: { id: string; fileName: string; fileRole: string; fileSizeBytes: number; storageKey: string }[];
  }[];
  expectedDeliverable?: {
    id: string;
    expectedDrawingRef: string | null;
    title: string;
    plannedSubmissionDate: string | null;
    milestoneName: string | null;
    priority: string;
  } | null;
  error?: string;
}> {
  try {
    await requireDesign("any");
    const [revRes, expRes] = await Promise.all([
      supabaseAdmin
        .from("dmac_drawing_revisions")
        .select("id, rev_no, submitted_by_name, submitted_at, change_summary, is_gfc, dmac_revision_files(id, file_name, file_role, file_size_bytes, storage_key)")
        .eq("drawing_id", drawingId)
        .order("rev_no", { ascending: false }),
      supabaseAdmin
        .from("design_expected_deliverables")
        .select("id, expected_drawing_ref, title, planned_submission_date, milestone_name, priority")
        .eq("matched_drawing_id", drawingId)
        .eq("is_deleted", false)
        .maybeSingle(),
    ]);
    if (revRes.error) throw revRes.error;
    return {
      success: true,
      revisions: (revRes.data || []).map((r: any) => ({
        id: r.id,
        revNo: r.rev_no,
        submittedByName: r.submitted_by_name || "Design",
        submittedAt: r.submitted_at,
        changeSummary: r.change_summary || null,
        isGfc: !!r.is_gfc,
        files: (r.dmac_revision_files || []).map((f: any) => ({
          id: f.id,
          fileName: f.file_name,
          fileRole: f.file_role,
          fileSizeBytes: Number(f.file_size_bytes || 0),
          storageKey: f.storage_key,
        })),
      })),
      expectedDeliverable: expRes.data
        ? {
            id: expRes.data.id,
            expectedDrawingRef: expRes.data.expected_drawing_ref || null,
            title: expRes.data.title,
            plannedSubmissionDate: expRes.data.planned_submission_date || null,
            milestoneName: expRes.data.milestone_name || null,
            priority: expRes.data.priority || "MEDIUM",
          }
        : null,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load drawing revisions." };
  }
}

export async function fetchLiveTenderMatrixAction(): Promise<{
  success: boolean;
  data?: LiveTenderMatrixData;
  error?: string;
}> {
  try {
    await requireDesign("any");
    const [
      projRes,
      towerRes,
      pkgRes,
      subPkgRes,
      consRes,
      dmacDeptRes,
      dmacProjRes,
      dmacBldRes,
      dmacDrwRes,
      designDrwRes,
      trackerRes,
      coordStRes,
      slaStRes,
      deptRes,
      userRes,
    ] = await Promise.all([
      supabaseAdmin.from("design_projects").select("id, code, name, tagged_consultants, tagged_packages").order("name"),
      supabaseAdmin.from("design_towers").select("id, project_id, tower_name, tagged_consultants, tagged_packages").order("tower_name"),
      supabaseAdmin.from("design_packages").select("id, code, name").order("name"),
      supabaseAdmin.from("design_sub_packages").select("id, discipline_id, discipline_name, package_name, sub_package_name, default_consultant").order("package_name"),
      supabaseAdmin.from("design_consultants").select("id, firm_name, discipline, categories, packages, sub_packages, active_projects").order("firm_name"),
      supabaseAdmin.from("dmac_departments").select("id, code, name, legacy_package_id"),
      supabaseAdmin.from("dmac_projects").select("id, name, legacy_design_project_id"),
      supabaseAdmin.from("dmac_buildings").select("id, code, name"),
      supabaseAdmin.from("dmac_drawings").select("id, project_id, building_id, department_id, drawing_number, reference_number, title, sub_package, consultant_name, current_status, latest_rev_no, legacy_drawing_id").is("deleted_at", null),
      supabaseAdmin.from("design_drawings").select("id, status, code"),
      supabaseAdmin.from("drawing_coordination_tracker").select("*"),
      supabaseAdmin.from("drawing_coordination_statuses").select("code, name"),
      supabaseAdmin.from("drawing_sla_statuses").select("code, name"),
      supabaseAdmin.from("departments").select("id, name"),
      supabaseAdmin.from("user_master").select("id, full_name, email"),
    ]);

    if (dmacDrwRes.error) throw dmacDrwRes.error;

    const dmacDeptMap = new Map((dmacDeptRes.data || []).map((d: any) => [d.id, d]));
    const dmacProjMap = new Map((dmacProjRes.data || []).map((p: any) => [p.id, p]));
    const dmacBldMap = new Map((dmacBldRes.data || []).map((b: any) => [b.id, b]));
    const designDrwById = new Map((designDrwRes.data || []).map((r: any) => [r.id, r]));
    const trackerByDrawingId = new Map((trackerRes.data || []).map((t: any) => [t.drawing_id, t]));
    const coordStMap = new Map((coordStRes.data || []).map((s: any) => [s.code, s.name]));
    const slaStMap = new Map((slaStRes.data || []).map((s: any) => [s.code, s.name]));
    const deptMap = new Map((deptRes.data || []).map((d: any) => [d.id, d.name]));
    const userMap = new Map((userRes.data || []).map((u: any) => [u.id, u.full_name || u.email]));

    const taskIds = Array.from(new Set((trackerRes.data || []).map((t: any) => t.active_task_id).filter(Boolean)));
    const { data: taskRows } = taskIds.length
      ? await supabaseAdmin.from("tasks").select("id, task_code, status_id").in("id", taskIds)
      : { data: [] as any[] };
    const { data: taskStRows } = await supabaseAdmin.from("status_master").select("id, status_name").eq("scope_type", "TASK");
    const tsMap = new Map((taskStRows || []).map((s: any) => [s.id, s.status_name]));
    const taskMap = new Map((taskRows || []).map((t: any) => [t.id, t]));

    const drawings: LiveMatrixDrawingRow[] = (dmacDrwRes.data || []).map((dr: any) => {
      const dp = dmacProjMap.get(dr.project_id);
      const dd = dmacDeptMap.get(dr.department_id);
      const db = dmacBldMap.get(dr.building_id);
      const refId = dr.legacy_drawing_id || dr.id;
      const legacyRow = designDrwById.get(refId);
      const tr = trackerByDrawingId.get(dr.id);
      const tk = tr?.active_task_id ? taskMap.get(tr.active_task_id) : null;

      // Single source of truth: exact Drawing Register status
      const drawingRegisterStatus =
        legacyRow?.status || DMAC_STATUS_TO_REGISTER[dr.current_status] || dr.current_status;

      return {
        drawingId: dr.id,
        drawingNumber: dr.drawing_number,
        referenceNumber: dr.reference_number || null,
        title: dr.title,
        projectId: dp?.legacy_design_project_id || dr.project_id,
        projectName: dp?.name || "—",
        towerName: db && db.code !== "GEN" ? db.name : null,
        packageId: dd?.legacy_package_id || dr.department_id,
        packageName: dd?.name || "—",
        subPackageName: dr.sub_package || null,
        consultantName: dr.consultant_name || null,
        revNo: dr.latest_rev_no ?? 0,
        drawingRegisterStatus,
        trackerId: tr?.id || null,
        coordinationStatusCode: tr?.coordination_status_code || null,
        coordinationStatusName: tr?.coordination_status_code
          ? coordStMap.get(tr.coordination_status_code) || tr.coordination_status_code
          : null,
        taskId: tr?.active_task_id || null,
        taskCode: tk?.task_code || null,
        taskStatusName: tk?.status_id ? tsMap.get(tk.status_id) || null : null,
        responsibleDepartmentName: tr?.current_responsible_department_id
          ? deptMap.get(tr.current_responsible_department_id) || null
          : null,
        responsibleUserName: tr?.current_responsible_user_id
          ? userMap.get(tr.current_responsible_user_id) || null
          : null,
        nextCheckAt: tr?.next_check_at || null,
        nextCreationAt: tr?.next_creation_at || null,
        slaStatusCode: tr?.sla_status_code || null,
        slaStatusName: tr?.sla_status_code ? slaStMap.get(tr.sla_status_code) || tr.sla_status_code : null,
        lastReturnReason: tr?.last_return_reason || null,
        isClosed: !!tr?.is_closed,
      };
    });

    const summary = {
      totalDeliverables: Math.max((subPkgRes.data || []).length, drawings.length),
      submitted: drawings.filter((d) => d.drawingRegisterStatus !== "Not Submitted").length,
      approved: drawings.filter(
        (d) =>
          d.drawingRegisterStatus === "Approved" ||
          d.drawingRegisterStatus === "Approved (GFC)" ||
          d.drawingRegisterStatus === "Site Handed Over"
      ).length,
      received: drawings.filter(
        (d) =>
          d.coordinationStatusCode === "DRAWING_RECEIVED" ||
          d.coordinationStatusCode === "DESIGN_RECEIVED"
      ).length,
      underReview: drawings.filter(
        (d) =>
          d.drawingRegisterStatus === "Under Review" ||
          d.coordinationStatusCode === "UNDER_REVIEW"
      ).length,
      returnedForRevision: drawings.filter(
        (d) =>
          d.drawingRegisterStatus === "Revision Requested" ||
          d.coordinationStatusCode === "RETURNED_FOR_REVISION"
      ).length,
      completed: drawings.filter(
        (d) =>
          d.isClosed ||
          d.coordinationStatusCode === "DRAWING_COORDINATION_COMPLETED" ||
          d.coordinationStatusCode === "CLOSED"
      ).length,
      slaBreached: drawings.filter((d) => d.slaStatusCode === "SLA_BREACHED").length,
    };

    return {
      success: true,
      data: {
        projects: (projRes.data || []).map((p: any) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          taggedConsultants: p.tagged_consultants || [],
          taggedPackages: p.tagged_packages || [],
        })),
        towers: (towerRes.data || []).map((t: any) => ({
          id: t.id,
          projectId: t.project_id,
          name: t.tower_name,
          taggedConsultants: t.tagged_consultants || [],
          taggedPackages: t.tagged_packages || [],
        })),
        packages: (pkgRes.data || []).map((p: any) => ({ id: p.id, code: p.code, name: p.name })),
        subPackages: (subPkgRes.data || []).map((sp: any) => ({
          id: sp.id,
          disciplineId: sp.discipline_id,
          disciplineName: sp.discipline_name,
          packageName: sp.package_name,
          subPackageName: sp.sub_package_name || sp.package_name,
          defaultConsultant: sp.default_consultant || null,
        })),
        consultants: (consRes.data || []).map((c: any) => ({
          id: c.id,
          firmName: c.firm_name,
          discipline: c.discipline || "",
          categories: c.categories || [],
          packages: c.packages || [],
          subPackages: c.sub_packages || [],
          activeProjects: c.active_projects || [],
        })),
        drawings,
        summary,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load live Tender Design Matrix." };
  }
}
