import { supabaseAdmin } from "@/lib/supabase/service_role";
import { queueBusinessEvent } from "@/lib/actions/notification-engine";

/**
 * Notifications for the DMAC drawing review loop. Sent through the company notification engine
 * (module "Design"), so email wording lives in Settings > Communication and in-app alerts appear
 * in the bell. Recipients are worked out here and passed per role (see the rules seeded in
 * supabase/migrations/20261126110000_dmac_notifications.sql).
 */

export type DesignEvent =
  | "Drawing Submitted"
  | "Drawing Approved"
  | "Drawing Returned"
  | "GFC Released"
  | "Review Overdue"
  | "Revision Overdue"
  | "Daily Digest"
  | "Drawing Coordination Started"
  | "Drawing Handed Over"
  | "Drawing Receipt Confirmed"
  | "Design Received"
  | "Drawing Returned for Revision"
  | "Revised Drawing Resubmitted"
  | "Drawing Coordination Completed"
  | "Drawing Next Check Due"
  | "Drawing Next Task Created"
  | "Drawing SLA Due Soon"
  | "Drawing SLA Breached"
  | "Drawing Task Closed"
  | "Drawing Transmittal Issued"
  | "Drawing Transmittal Acknowledged";

interface DrawingContext {
  id: string;
  drawing_number: string;
  title: string;
  project_id: string;
  department_id: string;
  design_owner_id: string | null;
  engineering_reviewer_id: string | null;
  latest_rev_no: number | null;
  legacy_drawing_id: string | null;
  projectName: string;
  legacyProjectId: string | null;
  lastSubmitter: string | null;
}

export async function loadDrawingContext(drawingId: string): Promise<DrawingContext | null> {
  const { data } = await supabaseAdmin
    .from("dmac_drawings")
    .select(
      "id, drawing_number, title, project_id, department_id, design_owner_id, engineering_reviewer_id, latest_rev_no, legacy_drawing_id, dmac_projects!inner(name, legacy_design_project_id)"
    )
    .eq("id", drawingId)
    .maybeSingle();
  if (!data) return null;
  const p = (data as any).dmac_projects;
  const project = Array.isArray(p) ? p[0] : p;
  const { data: rev } = await supabaseAdmin
    .from("dmac_drawing_revisions")
    .select("submitted_by")
    .eq("drawing_id", drawingId)
    .eq("is_superseded", false)
    .maybeSingle();
  return {
    ...(data as any),
    projectName: project?.name || "",
    legacyProjectId: project?.legacy_design_project_id || null,
    lastSubmitter: rev?.submitted_by || null,
  };
}

/** People who can review drawings on this project (Design access with the GFC capability, or Design admins). */
export async function projectReviewers(legacyProjectId: string | null, namedReviewer?: string | null): Promise<string[]> {
  const ids = new Set<string>();
  if (namedReviewer) ids.add(namedReviewer);
  const { data } = await supabaseAdmin
    .from("design_user_access")
    .select("user_id, design_role, project_access_type, assigned_project_ids, can_drawings_approve_gfc");
  for (const row of data || []) {
    const canReview = row.can_drawings_approve_gfc || String(row.design_role).toUpperCase() === "DESIGN_ADMIN";
    if (!canReview) continue;
    const scoped = String(row.project_access_type || "ALL").toUpperCase() === "SPECIFIC";
    if (scoped && (!legacyProjectId || !(row.assigned_project_ids || []).includes(legacyProjectId))) continue;
    ids.add(row.user_id);
  }
  return [...ids];
}

export async function escalationContacts(projectId: string, departmentId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("dmac_sla_escalation_rules")
    .select("escalate_to_user_id, project_id, department_id")
    .eq("is_active", true);
  return [
    ...new Set(
      (data || [])
        .filter((r) => (!r.project_id || r.project_id === projectId) && (!r.department_id || r.department_id === departmentId))
        .map((r) => r.escalate_to_user_id as string)
    ),
  ];
}

function drawingLink(event: DesignEvent) {
  if (
    event === "Drawing Coordination Started" ||
    event === "Drawing Handed Over" ||
    event === "Drawing Receipt Confirmed" ||
    event === "Design Received" ||
    event === "Drawing Returned for Revision" ||
    event === "Revised Drawing Resubmitted" ||
    event === "Drawing Coordination Completed" ||
    event === "Drawing Next Check Due" ||
    event === "Drawing Next Task Created" ||
    event === "Drawing SLA Due Soon" ||
    event === "Drawing SLA Breached" ||
    event === "Drawing Task Closed"
  ) {
    return "/design/tracker";
  }
  if (
    event === "Drawing Transmittal Issued" ||
    event === "Drawing Transmittal Acknowledged"
  ) {
    return "/design/transmittals";
  }
  // Reviewers act from the approvals queue; designers and site teams from the register
  return event === "Drawing Submitted" || event === "Review Overdue" ? "/design/approvals" : "/design/drawings";
}

/** Queue one loop event. Never throws: a failed notification must not undo a saved review step. */
export async function notifyDrawingEvent(
  event: DesignEvent,
  drawingId: string,
  actorId: string | null,
  extra: { revision?: string; code?: string; remarks?: string; openComments?: number; days?: number; next_check_date?: string | null; sla_due_date?: string | null; transmittal_number?: string; recipient_email?: string } = {}
) {
  try {
    const d = await loadDrawingContext(drawingId);
    if (!d) return;
    const designer = [d.lastSubmitter, d.design_owner_id].filter(Boolean) as string[];
    const recipients: Record<string, string[]> = {
      Designer: [...new Set(designer)],
      Reviewers: await projectReviewers(d.legacyProjectId, d.engineering_reviewer_id),
    };
    if (event === "Review Overdue" || event === "Revision Overdue" || event === "Drawing SLA Breached") {
      recipients.Escalation = await escalationContacts(d.project_id, d.department_id);
    }
    const revision = extra.revision || (d.latest_rev_no === null ? "" : `R${d.latest_rev_no}`);
    const summary: Record<DesignEvent, string> = {
      "Drawing Submitted": `${revision} was submitted for review.`,
      "Drawing Approved": `${revision} was approved with code ${extra.code}.`,
      "Drawing Returned": `${revision} was returned with code ${extra.code} and ${extra.openComments ?? 0} comment(s) to answer.`,
      "GFC Released": `${revision} was released for construction. Earlier sheets are superseded.`,
      "Review Overdue": `${revision} has waited ${extra.days ?? "?"} working days for review.`,
      "Revision Overdue": `${revision} was returned ${extra.days ?? "?"} working days ago and has not been resubmitted.`,
      "Daily Digest": "",
      "Drawing Coordination Started": `${revision} was approved and a Drawing Submission coordination task was created.`,
      "Drawing Handed Over": `${revision} was handed over to the receiving department.`,
      "Drawing Receipt Confirmed": `${revision} receipt was confirmed.`,
      "Design Received": `${revision} was received for design review.`,
      "Drawing Returned for Revision": `${revision} was returned for revision.`,
      "Revised Drawing Resubmitted": `Revised ${revision} was submitted on the active coordination task.`,
      "Drawing Coordination Completed": `${revision} coordination was accepted and completed.`,
      "Drawing Next Check Due": `Next check is due for ${revision}.`,
      "Drawing Next Task Created": `Scheduled follow-up task created for ${revision}.`,
      "Drawing SLA Due Soon": `SLA is due soon for ${revision}.`,
      "Drawing SLA Breached": `SLA breached for ${revision}.`,
      "Drawing Task Closed": `Drawing coordination task for ${revision} was formally closed.`,
      "Drawing Transmittal Issued": `Transmittal ${extra.transmittal_number || ""} issued for ${revision} to ${extra.recipient_email || "recipient"}.`,
      "Drawing Transmittal Acknowledged": `Transmittal ${extra.transmittal_number || ""} was acknowledged for ${revision}.`,
    };

    await queueBusinessEvent("Design", event, {
      entity_id: d.id,
      triggering_user_id: actorId || "",
      suppress_actor: true,
      drawing_label: `${d.drawing_number} ${revision}`.trim(),
      drawing_number: d.drawing_number,
      drawing_title: d.title,
      project_name: d.projectName,
      revision,
      review_code: extra.code,
      remarks: extra.remarks || summary[event],
      description: summary[event],
      link: drawingLink(event),
      priority: event.endsWith("Overdue") ? "CRITICAL" : undefined,
      design_recipients: recipients,
    });
  } catch (err) {
    console.error(`[dmac/notify] ${event} for ${drawingId} not queued:`, err);
  }
}
