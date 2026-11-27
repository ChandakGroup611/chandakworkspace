"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireDesign } from "@/lib/permissions/design-guard";
import { hasPermission } from "@/lib/permissions";
import { notifyDrawingEvent } from "@/lib/dmac/notify";
import { processDueDrawingCoordinationTasksAndSlaAction } from "@/lib/actions/drawing-coordination";

async function getUserScope(userId: string): Promise<{ unrestricted: boolean; projectIds: string[] }> {
  if (await hasPermission(userId, "SUPER_ADMIN")) return { unrestricted: true, projectIds: [] };
  const { data: access } = await supabaseAdmin.from("design_user_access").select("*").eq("user_id", userId).maybeSingle();
  if (!access) return { unrestricted: true, projectIds: [] };
  const isAdmin = String(access.design_role || "").toUpperCase() === "DESIGN_ADMIN";
  if (isAdmin || String(access.project_access_type || "ALL").toUpperCase() !== "SPECIFIC") {
    return { unrestricted: true, projectIds: [] };
  }
  return { unrestricted: false, projectIds: access.assigned_project_ids || [] };
}

// ============================================================================
// 1. LIVE DRAWING TRANSMITTAL & HANDOVER
// ============================================================================

export interface LiveTransmittalItemRow {
  id: string;
  drawingId: string | null;
  revisionId: string;
  drawingNumber: string;
  drawingTitle: string;
  revNo: number;
  purpose: string;
  trackerId: string | null;
}

export interface LiveTransmittalRow {
  id: string;
  transmittalNumber: string;
  projectId: string;
  projectName: string;
  direction: string;
  purpose: string;
  status: "ISSUED" | "ACKNOWLEDGED" | "RETURNED" | "CANCELLED";
  recipientName: string | null;
  recipientEmail: string;
  recipientDepartmentId: string | null;
  recipientDepartmentName: string | null;
  subject: string;
  notes: string | null;
  copiesCount: number;
  issuedAt: string;
  acknowledgedAt: string | null;
  acknowledgedByEmail: string | null;
  acknowledgmentNotes: string | null;
  items: LiveTransmittalItemRow[];
}

export interface TransmittalDrawingOption {
  drawingId: string;
  drawingNumber: string;
  title: string;
  projectId: string;
  projectName: string;
  currentRevNo: number;
  latestRevisionId: string | null;
  trackerId: string | null;
  status: string;
}

export async function fetchLiveTransmittalsAction(projectIdFilter?: string): Promise<{
  success: boolean;
  transmittals: LiveTransmittalRow[];
  drawingOptions: TransmittalDrawingOption[];
  projects: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  error?: string;
}> {
  try {
    const user = await requireDesign("any", projectIdFilter || undefined);
    const scope = await getUserScope(user.id);

    const [trmRes, itemRes, projRes, deptRes, drawRes, revRes, trackerRes] = await Promise.all([
      supabaseAdmin.from("dmac_transmittals").select("*").order("issued_at", { ascending: false }).limit(200),
      supabaseAdmin.from("dmac_transmittal_items").select("*"),
      supabaseAdmin.from("dmac_projects").select("id, name"),
      supabaseAdmin.from("departments").select("id, name").order("name"),
      supabaseAdmin.from("dmac_drawings").select("id, drawing_number, title, project_id, latest_rev_no, current_status").order("created_at", { ascending: false }).limit(400),
      supabaseAdmin.from("dmac_drawing_revisions").select("id, drawing_id, rev_no").order("rev_no", { ascending: false }),
      supabaseAdmin.from("drawing_coordination_tracker").select("id, drawing_id"),
    ]);

    if (trmRes.error) throw trmRes.error;

    const projMap = new Map((projRes.data || []).map((p: any) => [p.id, p.name]));
    const deptMap = new Map((deptRes.data || []).map((d: any) => [d.id, d.name]));
    const drawMap = new Map((drawRes.data || []).map((d: any) => [d.id, d]));
    const trackerByDrawing = new Map((trackerRes.data || []).map((t: any) => [t.drawing_id, t.id]));

    const latestRevByDrawing = new Map<string, { id: string; rev_no: number }>();
    const revById = new Map<string, any>();
    for (const r of revRes.data || []) {
      revById.set(r.id, r);
      if (!latestRevByDrawing.has(r.drawing_id)) {
        latestRevByDrawing.set(r.drawing_id, { id: r.id, rev_no: r.rev_no ?? 0 });
      }
    }

    const itemsByTrm = new Map<string, LiveTransmittalItemRow[]>();
    for (const it of itemRes.data || []) {
      const rev = revById.get(it.revision_id);
      const drawId = it.drawing_id || rev?.drawing_id || null;
      const draw = drawId ? drawMap.get(drawId) : null;
      const list = itemsByTrm.get(it.transmittal_id) || [];
      list.push({
        id: it.id,
        drawingId: drawId,
        revisionId: it.revision_id,
        drawingNumber: draw?.drawing_number || "—",
        drawingTitle: draw?.title || "Drawing",
        revNo: it.rev_no ?? rev?.rev_no ?? 0,
        purpose: it.purpose || "FOR_REVIEW",
        trackerId: it.tracker_id || (drawId ? trackerByDrawing.get(drawId) || null : null),
      });
      itemsByTrm.set(it.transmittal_id, list);
    }

    const scopeSet = new Set(scope.projectIds);

    const transmittals: LiveTransmittalRow[] = (trmRes.data || [])
      .filter((t: any) => (scope.unrestricted || scopeSet.has(t.project_id)) && (!projectIdFilter || t.project_id === projectIdFilter))
      .map((t: any) => ({
        id: t.id,
        transmittalNumber: t.transmittal_number,
        projectId: t.project_id,
        projectName: projMap.get(t.project_id) || "Project",
        direction: t.direction || "OUTBOUND",
        purpose: t.purpose || "FOR_REVIEW",
        status: (t.status || "ISSUED") as LiveTransmittalRow["status"],
        recipientName: t.recipient_name || null,
        recipientEmail: t.recipient_email,
        recipientDepartmentId: t.recipient_department_id || null,
        recipientDepartmentName: t.recipient_department_id ? deptMap.get(t.recipient_department_id) || null : null,
        subject: t.subject,
        notes: t.notes || null,
        copiesCount: Number(t.copies_count || 1),
        issuedAt: t.issued_at,
        acknowledgedAt: t.acknowledged_at || null,
        acknowledgedByEmail: t.acknowledged_by_email || null,
        acknowledgmentNotes: t.acknowledgment_notes || null,
        items: itemsByTrm.get(t.id) || [],
      }));

    const drawingOptions: TransmittalDrawingOption[] = (drawRes.data || [])
      .filter((d: any) => scope.unrestricted || scopeSet.has(d.project_id))
      .map((d: any) => {
        const latestRev = latestRevByDrawing.get(d.id);
        return {
          drawingId: d.id,
          drawingNumber: d.drawing_number,
          title: d.title,
          projectId: d.project_id,
          projectName: projMap.get(d.project_id) || "Project",
          currentRevNo: Number(d.latest_rev_no ?? latestRev?.rev_no ?? 0),
          latestRevisionId: latestRev?.id || null,
          trackerId: trackerByDrawing.get(d.id) || null,
          status: d.current_status || "DRAFT",
        };
      })
      .filter((d: TransmittalDrawingOption) => Boolean(d.latestRevisionId));

    const projects = (projRes.data || [])
      .filter((p: any) => scope.unrestricted || scopeSet.has(p.id))
      .map((p: any) => ({ id: p.id, name: p.name }));

    const departments = (deptRes.data || []).map((d: any) => ({ id: d.id, name: d.name }));

    return { success: true, transmittals, drawingOptions, projects, departments };
  } catch (err: any) {
    return { success: false, transmittals: [], drawingOptions: [], projects: [], departments: [], error: err?.message || "Failed to load transmittals" };
  }
}

export async function createLiveTransmittalAction(payload: {
  projectId: string;
  direction: "OUTBOUND" | "INBOUND";
  purpose: string;
  recipientName?: string;
  recipientEmail: string;
  recipientDepartmentId?: string | null;
  subject: string;
  notes?: string;
  copiesCount?: number;
  drawingIds: string[];
}): Promise<{ success: boolean; transmittalNumber?: string; error?: string }> {
  try {
    const user = await requireDesign("transmittals", payload.projectId);
    if (!payload.projectId || !payload.recipientEmail.trim() || !payload.subject.trim() || !payload.drawingIds.length) {
      return { success: false, error: "Project, recipient email, subject, and at least one drawing are required." };
    }

    const { data: ws } = await supabaseAdmin.from("dms_workspaces").select("id").limit(1).maybeSingle();
    if (!ws?.id) return { success: false, error: "No active DMS workspace found" };

    const year = new Date().getFullYear();
    const { count } = await supabaseAdmin.from("dmac_transmittals").select("id", { count: "exact", head: true });
    const seq = String((count || 0) + 1).padStart(4, "0");
    const transmittalNumber = `TRM-${year}-${seq}`;

    const { data: created, error: insErr } = await supabaseAdmin
      .from("dmac_transmittals")
      .insert({
        workspace_id: ws.id,
        project_id: payload.projectId,
        transmittal_number: transmittalNumber,
        direction: payload.direction || "OUTBOUND",
        sender_id: user.id,
        recipient_name: payload.recipientName?.trim() || null,
        recipient_email: payload.recipientEmail.trim(),
        recipient_department_id: payload.recipientDepartmentId || null,
        purpose: payload.purpose || "FOR_REVIEW",
        status: "ISSUED",
        subject: payload.subject.trim(),
        notes: payload.notes?.trim() || null,
        copies_count: Math.max(1, Number(payload.copiesCount || 1)),
      })
      .select("id")
      .single();

    if (insErr) throw insErr;

    const { data: revs } = await supabaseAdmin
      .from("dmac_drawing_revisions")
      .select("id, drawing_id, rev_no")
      .in("drawing_id", payload.drawingIds)
      .order("rev_no", { ascending: false });

    const { data: trackers } = await supabaseAdmin
      .from("drawing_coordination_tracker")
      .select("id, drawing_id, drawing_number, current_rev_no, active_task_id, coordination_status_code")
      .in("drawing_id", payload.drawingIds);

    const trackerMap = new Map((trackers || []).map((t: any) => [t.drawing_id, t]));
    const latestRevMap = new Map<string, { id: string; rev_no: number }>();
    for (const r of revs || []) {
      if (!latestRevMap.has(r.drawing_id)) {
        latestRevMap.set(r.drawing_id, { id: r.id, rev_no: r.rev_no ?? 0 });
      }
    }

    const itemsToInsert = payload.drawingIds
      .map((did) => {
        const rev = latestRevMap.get(did);
        if (!rev) return null;
        return {
          transmittal_id: created.id,
          revision_id: rev.id,
          drawing_id: did,
          rev_no: rev.rev_no,
          tracker_id: trackerMap.get(did)?.id || null,
          purpose: payload.purpose || "FOR_REVIEW",
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (itemsToInsert.length > 0) {
      const { error: itemErr } = await supabaseAdmin.from("dmac_transmittal_items").insert(itemsToInsert);
      if (itemErr) throw itemErr;
    }

    const nowIso = new Date().toISOString();
    for (const did of payload.drawingIds) {
      const tr = trackerMap.get(did);
      if (tr) {
        await supabaseAdmin
          .from("drawing_coordination_tracker")
          .update({ last_handover_at: nowIso, updated_at: nowIso })
          .eq("id", tr.id);

        await supabaseAdmin.from("drawing_coordination_audit_logs").insert({
          tracker_id: tr.id,
          drawing_id: did,
          drawing_number: tr.drawing_number,
          rev_no: tr.current_rev_no,
          task_id: tr.active_task_id,
          previous_status: tr.coordination_status_code,
          new_status: tr.coordination_status_code,
          action: "TRANSMITTAL_ISSUED",
          actor_id: user.id,
          actor_email: user.email,
          details: { transmittalNumber, purpose: payload.purpose, recipientEmail: payload.recipientEmail },
        });
      }
      await notifyDrawingEvent("Drawing Transmittal Issued", did, user.id, {
        transmittal_number: transmittalNumber,
        recipient_email: payload.recipientEmail,
      }).catch(() => {});
    }

    return { success: true, transmittalNumber };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to issue transmittal" };
  }
}

export async function acknowledgeLiveTransmittalAction(transmittalId: string, notes?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await requireDesign("any");
    const nowIso = new Date().toISOString();

    const { data: trm, error: fetchErr } = await supabaseAdmin
      .from("dmac_transmittals")
      .select("id, transmittal_number, status")
      .eq("id", transmittalId)
      .single();

    if (fetchErr || !trm) return { success: false, error: "Transmittal not found" };
    if (trm.status === "ACKNOWLEDGED") return { success: true };

    const { error: updErr } = await supabaseAdmin
      .from("dmac_transmittals")
      .update({
        status: "ACKNOWLEDGED",
        acknowledged_at: nowIso,
        acknowledged_by: user.id,
        acknowledged_by_email: user.email,
        acknowledgment_notes: notes?.trim() || null,
      })
      .eq("id", transmittalId);

    if (updErr) throw updErr;

    const { data: items } = await supabaseAdmin
      .from("dmac_transmittal_items")
      .select("drawing_id, tracker_id")
      .eq("transmittal_id", transmittalId);

    for (const it of items || []) {
      if (it.tracker_id && it.drawing_id) {
        const { data: tr } = await supabaseAdmin
          .from("drawing_coordination_tracker")
          .select("id, drawing_number, current_rev_no, active_task_id, coordination_status_code")
          .eq("id", it.tracker_id)
          .maybeSingle();

        if (tr) {
          await supabaseAdmin.from("drawing_coordination_audit_logs").insert({
            tracker_id: tr.id,
            drawing_id: it.drawing_id,
            drawing_number: tr.drawing_number,
            rev_no: tr.current_rev_no,
            task_id: tr.active_task_id,
            previous_status: tr.coordination_status_code,
            new_status: tr.coordination_status_code,
            action: "TRANSMITTAL_ACKNOWLEDGED",
            actor_id: user.id,
            actor_email: user.email,
            details: { transmittalNumber: trm.transmittal_number, notes: notes || null },
          });
        }
      }
      if (it.drawing_id) {
        await notifyDrawingEvent("Drawing Transmittal Acknowledged", it.drawing_id, user.id, {
          transmittal_number: trm.transmittal_number,
        }).catch(() => {});
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to acknowledge transmittal" };
  }
}

// ============================================================================
// 2. SLA PAUSE / RESUME & HOLIDAY CALENDAR
// ============================================================================

export interface SlaTrackerItem {
  trackerId: string;
  drawingId: string;
  drawingNumber: string;
  drawingTitle: string;
  projectId: string;
  projectName: string;
  coordinationStatusCode: string;
  slaStatusCode: string;
  slaDueAt: string | null;
  slaPaused: boolean;
  slaPausedAt: string | null;
  slaPauseReason: string | null;
  slaTotalPausedMinutes: number;
}

export interface SlaPauseLogRow {
  id: string;
  trackerId: string;
  drawingNumber: string;
  action: "PAUSE" | "RESUME";
  reason: string;
  pausedAt: string;
  resumedAt: string | null;
  pausedMinutes: number;
  previousSlaDueAt: string | null;
  newSlaDueAt: string | null;
  actorEmail: string | null;
  createdAt: string;
}

export interface HolidayRow {
  id: string;
  projectId: string | null;
  projectName: string;
  holidayDate: string;
  holidayName: string;
  isStatutory: boolean;
}

export async function fetchSlaCalendarDashboardAction(year?: number, projectIdFilter?: string): Promise<{
  success: boolean;
  trackers: SlaTrackerItem[];
  pauseLogs: SlaPauseLogRow[];
  holidays: HolidayRow[];
  projects: Array<{ id: string; name: string }>;
  summary: {
    totalActive: number;
    withinSla: number;
    dueSoon: number;
    breached: number;
    paused: number;
    holidayCount: number;
  };
  error?: string;
}> {
  try {
    const user = await requireDesign("any", projectIdFilter || undefined);
    const scope = await getUserScope(user.id);

    const [trRes, projRes, logRes, holRes] = await Promise.all([
      supabaseAdmin
        .from("drawing_coordination_tracker")
        .select("id, drawing_id, drawing_number, drawing_title, project_id, coordination_status_code, sla_status_code, sla_due_at, sla_paused, sla_paused_at, sla_pause_reason, sla_total_paused_minutes")
        .eq("is_closed", false)
        .order("sla_due_at", { ascending: true, nullsFirst: false }),
      supabaseAdmin.from("dmac_projects").select("id, name"),
      supabaseAdmin
        .from("drawing_sla_pause_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60),
      supabaseAdmin
        .from("dmac_holiday_calendar")
        .select("*")
        .order("holiday_date", { ascending: true }),
    ]);

    if (trRes.error) throw trRes.error;

    const projMap = new Map((projRes.data || []).map((p: any) => [p.id, p.name]));
    const scopeSet = new Set(scope.projectIds);

    const trackers: SlaTrackerItem[] = (trRes.data || [])
      .filter((t: any) => (scope.unrestricted || scopeSet.has(t.project_id)) && (!projectIdFilter || t.project_id === projectIdFilter))
      .map((t: any) => ({
        trackerId: t.id,
        drawingId: t.drawing_id,
        drawingNumber: t.drawing_number,
        drawingTitle: t.drawing_title,
        projectId: t.project_id,
        projectName: projMap.get(t.project_id) || "Project",
        coordinationStatusCode: t.coordination_status_code,
        slaStatusCode: t.sla_status_code || "WITHIN_SLA",
        slaDueAt: t.sla_due_at || null,
        slaPaused: Boolean(t.sla_paused),
        slaPausedAt: t.sla_paused_at || null,
        slaPauseReason: t.sla_pause_reason || null,
        slaTotalPausedMinutes: Number(t.sla_total_paused_minutes || 0),
      }));

    const trackerNumberMap = new Map((trRes.data || []).map((t: any) => [t.id, t.drawing_number]));

    const pauseLogs: SlaPauseLogRow[] = (logRes.data || []).map((l: any) => ({
      id: l.id,
      trackerId: l.tracker_id,
      drawingNumber: trackerNumberMap.get(l.tracker_id) || "Drawing",
      action: l.action,
      reason: l.reason,
      pausedAt: l.paused_at,
      resumedAt: l.resumed_at || null,
      pausedMinutes: Number(l.paused_minutes || 0),
      previousSlaDueAt: l.previous_sla_due_at || null,
      newSlaDueAt: l.new_sla_due_at || null,
      actorEmail: l.actor_email || null,
      createdAt: l.created_at,
    }));

    const targetYear = year ? String(year) : null;
    const holidays: HolidayRow[] = (holRes.data || [])
      .filter((h: any) => (!targetYear || String(h.holiday_date).startsWith(targetYear)))
      .filter((h: any) => !projectIdFilter || !h.project_id || h.project_id === projectIdFilter)
      .map((h: any) => ({
        id: h.id,
        projectId: h.project_id || null,
        projectName: h.project_id ? projMap.get(h.project_id) || "Project" : "Global (All Projects)",
        holidayDate: h.holiday_date,
        holidayName: h.holiday_name,
        isStatutory: Boolean(h.is_statutory),
      }));

    const summary = {
      totalActive: trackers.length,
      withinSla: trackers.filter((t) => !t.slaPaused && t.slaStatusCode === "WITHIN_SLA").length,
      dueSoon: trackers.filter((t) => !t.slaPaused && t.slaStatusCode === "DUE_SOON").length,
      breached: trackers.filter((t) => !t.slaPaused && (t.slaStatusCode === "SLA_BREACHED" || t.slaStatusCode === "OVERDUE")).length,
      paused: trackers.filter((t) => t.slaPaused).length,
      holidayCount: holidays.length,
    };

    const projects = (projRes.data || [])
      .filter((p: any) => scope.unrestricted || scopeSet.has(p.id))
      .map((p: any) => ({ id: p.id, name: p.name }));

    return { success: true, trackers, pauseLogs, holidays, projects, summary };
  } catch (err: any) {
    return {
      success: false,
      trackers: [],
      pauseLogs: [],
      holidays: [],
      projects: [],
      summary: { totalActive: 0, withinSla: 0, dueSoon: 0, breached: 0, paused: 0, holidayCount: 0 },
      error: err?.message || "Failed to load SLA calendar",
    };
  }
}

export async function pauseTrackerSlaAction(trackerId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireDesign("drawings");
    if (!reason.trim()) return { success: false, error: "Pause reason is required" };

    const { data: tr, error: fErr } = await supabaseAdmin
      .from("drawing_coordination_tracker")
      .select("*")
      .eq("id", trackerId)
      .single();

    if (fErr || !tr) return { success: false, error: "Tracker not found" };
    if (tr.sla_paused) return { success: false, error: "SLA is already paused" };

    const nowIso = new Date().toISOString();
    const { error: uErr } = await supabaseAdmin
      .from("drawing_coordination_tracker")
      .update({
        sla_paused: true,
        sla_paused_at: nowIso,
        sla_pause_reason: reason.trim(),
        sla_paused_by: user.id,
        updated_at: nowIso,
      })
      .eq("id", trackerId);

    if (uErr) throw uErr;

    await supabaseAdmin.from("drawing_sla_pause_logs").insert({
      tracker_id: trackerId,
      drawing_id: tr.drawing_id,
      action: "PAUSE",
      reason: reason.trim(),
      paused_at: nowIso,
      previous_sla_due_at: tr.sla_due_at || null,
      actor_id: user.id,
      actor_email: user.email,
    });

    await supabaseAdmin.from("drawing_coordination_audit_logs").insert({
      tracker_id: trackerId,
      drawing_id: tr.drawing_id,
      drawing_number: tr.drawing_number,
      rev_no: tr.current_rev_no,
      task_id: tr.active_task_id,
      previous_status: tr.coordination_status_code,
      new_status: tr.coordination_status_code,
      action: "SLA_PAUSED",
      actor_id: user.id,
      actor_email: user.email,
      details: { reason: reason.trim() },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to pause SLA" };
  }
}

export async function resumeTrackerSlaAction(trackerId: string, notes?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireDesign("drawings");

    const { data: tr, error: fErr } = await supabaseAdmin
      .from("drawing_coordination_tracker")
      .select("*")
      .eq("id", trackerId)
      .single();

    if (fErr || !tr) return { success: false, error: "Tracker not found" };
    if (!tr.sla_paused) return { success: false, error: "SLA is not paused" };

    const now = new Date();
    const nowIso = now.toISOString();
    const pausedAt = tr.sla_paused_at ? new Date(tr.sla_paused_at) : now;
    const pausedMinutes = Math.max(0, Math.round((now.getTime() - pausedAt.getTime()) / 60000));

    let newSlaDueAt: string | null = tr.sla_due_at || null;
    let nextSlaStatus = tr.sla_status_code || "WITHIN_SLA";

    if (tr.sla_due_at) {
      const extended = new Date(new Date(tr.sla_due_at).getTime() + pausedMinutes * 60000);
      newSlaDueAt = extended.toISOString();
      const hoursLeft = (extended.getTime() - now.getTime()) / 3600000;
      if (hoursLeft < 0) nextSlaStatus = "SLA_BREACHED";
      else if (hoursLeft <= 24) nextSlaStatus = "DUE_SOON";
      else nextSlaStatus = "WITHIN_SLA";
    }

    const { error: uErr } = await supabaseAdmin
      .from("drawing_coordination_tracker")
      .update({
        sla_paused: false,
        sla_paused_at: null,
        sla_pause_reason: null,
        sla_paused_by: null,
        sla_total_paused_minutes: Number(tr.sla_total_paused_minutes || 0) + pausedMinutes,
        sla_due_at: newSlaDueAt,
        sla_status_code: nextSlaStatus,
        updated_at: nowIso,
      })
      .eq("id", trackerId);

    if (uErr) throw uErr;

    await supabaseAdmin.from("drawing_sla_pause_logs").insert({
      tracker_id: trackerId,
      drawing_id: tr.drawing_id,
      action: "RESUME",
      reason: notes?.trim() || tr.sla_pause_reason || "SLA Resumed",
      paused_at: pausedAt.toISOString(),
      resumed_at: nowIso,
      paused_minutes: pausedMinutes,
      previous_sla_due_at: tr.sla_due_at || null,
      new_sla_due_at: newSlaDueAt,
      actor_id: user.id,
      actor_email: user.email,
    });

    await supabaseAdmin.from("drawing_coordination_audit_logs").insert({
      tracker_id: trackerId,
      drawing_id: tr.drawing_id,
      drawing_number: tr.drawing_number,
      rev_no: tr.current_rev_no,
      task_id: tr.active_task_id,
      previous_status: tr.coordination_status_code,
      new_status: tr.coordination_status_code,
      action: "SLA_RESUMED",
      actor_id: user.id,
      actor_email: user.email,
      details: { pausedMinutes, previousSlaDueAt: tr.sla_due_at, newSlaDueAt },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to resume SLA" };
  }
}

export async function saveHolidayAction(payload: {
  projectId: string | null;
  holidayDate: string;
  holidayName: string;
  isStatutory?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireDesign("masters", payload.projectId || undefined);
    if (!payload.holidayDate || !payload.holidayName.trim()) {
      return { success: false, error: "Date and holiday name are required" };
    }

    const { error } = await supabaseAdmin.from("dmac_holiday_calendar").insert({
      project_id: payload.projectId || null,
      holiday_date: payload.holidayDate,
      holiday_name: payload.holidayName.trim(),
      is_statutory: Boolean(payload.isStatutory),
    });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save holiday" };
  }
}

export async function deleteHolidayAction(holidayId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireDesign("masters");
    const { error } = await supabaseAdmin.from("dmac_holiday_calendar").delete().eq("id", holidayId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete holiday" };
  }
}

// ============================================================================
// 3. DESIGN NOTIFICATION CENTER
// ============================================================================

export interface DesignNotificationItem {
  id: string;
  source: "QUEUE" | "DMAC";
  title: string;
  message: string;
  eventType: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface SlaEscalationRuleView {
  id: string;
  projectName: string;
  departmentName: string;
  escalateToName: string;
  escalateToEmail: string;
  thresholdHours: number;
}

export async function fetchDesignNotificationsAction(filter: "ALL" | "UNREAD" = "ALL"): Promise<{
  success: boolean;
  notifications: DesignNotificationItem[];
  unreadCount: number;
  escalationRules: SlaEscalationRuleView[];
  canRunSweep: boolean;
  error?: string;
}> {
  try {
    const user = await requireDesign("any");

    const [qRes, dmacRes, escRes, projRes, deptRes, usrRes] = await Promise.all([
      supabaseAdmin
        .from("notification_queue")
        .select("*")
        .or(`target_user_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(120),
      supabaseAdmin
        .from("dmac_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(120),
      supabaseAdmin.from("dmac_sla_escalation_rules").select("*").limit(50),
      supabaseAdmin.from("dmac_projects").select("id, name"),
      supabaseAdmin.from("departments").select("id, name"),
      supabaseAdmin.from("users").select("id, full_name, email"),
    ]);

    const items: DesignNotificationItem[] = [];

    for (const q of qRes.data || []) {
      const mod = String(q.module || "").toLowerCase();
      const url = String(q.link_url || q.action_url || "");
      const title = String(q.title || q.subject || "Design Update");
      const msg = String(q.message || q.body || "");
      const isDesign =
        mod.includes("design") ||
        url.startsWith("/design") ||
        /drawing|sla|transmittal|gfc|tender/i.test(title + " " + msg);
      if (!isDesign) continue;

      items.push({
        id: q.id,
        source: "QUEUE",
        title,
        message: msg,
        eventType: q.event || q.event_type || "DESIGN_EVENT",
        linkUrl: url || "/design/tracker",
        isRead: Boolean(q.is_read),
        createdAt: q.created_at,
      });
    }

    for (const n of dmacRes.data || []) {
      items.push({
        id: n.id,
        source: "DMAC",
        title: n.title,
        message: n.message,
        eventType: n.event_type || "DESIGN_EVENT",
        linkUrl: n.link_url || "/design/tracker",
        isRead: Boolean(n.is_read),
        createdAt: n.created_at,
      });
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const unreadCount = items.filter((i) => !i.isRead).length;
    const filtered = filter === "UNREAD" ? items.filter((i) => !i.isRead) : items;

    const projMap = new Map((projRes.data || []).map((p: any) => [p.id, p.name]));
    const deptMap = new Map((deptRes.data || []).map((d: any) => [d.id, d.name]));
    const usrMap = new Map((usrRes.data || []).map((u: any) => [u.id, u]));

    const escalationRules: SlaEscalationRuleView[] = (escRes.data || []).map((r: any) => {
      const target = usrMap.get(r.escalate_to_user_id);
      return {
        id: r.id,
        projectName: r.project_id ? projMap.get(r.project_id) || "Project" : "All Projects",
        departmentName: r.department_id ? deptMap.get(r.department_id) || "Department" : "All Departments",
        escalateToName: target?.full_name || "User",
        escalateToEmail: target?.email || "—",
        thresholdHours: Number(r.threshold_hours || 24),
      };
    });

    const canRunSweep = (await hasPermission(user.id, "SUPER_ADMIN")) || (await hasPermission(user.id, "DESIGN_ADMIN"));

    return { success: true, notifications: filtered, unreadCount, escalationRules, canRunSweep };
  } catch (err: any) {
    return {
      success: false,
      notifications: [],
      unreadCount: 0,
      escalationRules: [],
      canRunSweep: false,
      error: err?.message || "Failed to load notifications",
    };
  }
}

export async function markDesignNotificationsReadAction(ids?: Array<{ id: string; source: "QUEUE" | "DMAC" }>): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await requireDesign("any");

    if (!ids || ids.length === 0) {
      await Promise.all([
        supabaseAdmin
          .from("notification_queue")
          .update({ is_read: true })
          .or(`target_user_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .eq("is_read", false),
        supabaseAdmin
          .from("dmac_notifications")
          .update({ is_read: true })
          .eq("user_id", user.id)
          .eq("is_read", false),
      ]);
      return { success: true };
    }

    const qIds = ids.filter((x) => x.source === "QUEUE").map((x) => x.id);
    const dIds = ids.filter((x) => x.source === "DMAC").map((x) => x.id);

    if (qIds.length > 0) {
      await supabaseAdmin.from("notification_queue").update({ is_read: true }).in("id", qIds);
    }
    if (dIds.length > 0) {
      await supabaseAdmin.from("dmac_notifications").update({ is_read: true }).in("id", dIds).eq("user_id", user.id);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to mark read" };
  }
}

export async function runSlaAndTaskSweepAction(): Promise<{
  success: boolean;
  slaUpdated: number;
  tasksGenerated: number;
  error?: string;
}> {
  try {
    await requireDesign("admin");
    const res = await processDueDrawingCoordinationTasksAndSlaAction();
    return { success: true, slaUpdated: res.slaUpdated, tasksGenerated: res.tasksGenerated };
  } catch (err: any) {
    return { success: false, slaUpdated: 0, tasksGenerated: 0, error: err?.message || "Sweep failed" };
  }
}

// ============================================================================
// 4. CONSULTANT PERFORMANCE ANALYTICS
// ============================================================================

export interface ConsultantScorecardRow {
  consultantId: string;
  consultantName: string;
  specialty: string | null;
  email: string | null;
  expectedCount: number;
  submittedCount: number;
  onTimeRatePct: number;
  approvedCount: number;
  firstTimeApprovalPct: number;
  avgRevisionsPerDrawing: number;
  avgTurnaroundDays: number;
  slaBreachedCount: number;
  openRfisCount: number;
  performanceScore: number;
  tier: "EXEMPLARY" | "ON_TRACK" | "NEEDS_ATTENTION" | "CRITICAL";
}

export async function fetchConsultantPerformanceAction(projectIdFilter?: string): Promise<{
  success: boolean;
  scorecards: ConsultantScorecardRow[];
  projects: Array<{ id: string; name: string }>;
  summary: {
    totalConsultants: number;
    avgScore: number;
    exemplaryCount: number;
    atRiskCount: number;
    avgFirstTimeApprovalPct: number;
  };
  error?: string;
}> {
  try {
    const user = await requireDesign("any", projectIdFilter || undefined);
    const scope = await getUserScope(user.id);

    const [consRes, expRes, drawRes, trkRes, rfiRes, projRes] = await Promise.all([
      supabaseAdmin.from("design_consultants").select("id, firm_name, discipline, email").order("firm_name"),
      supabaseAdmin.from("design_expected_deliverables").select("id, consultant_id, project_id, planned_submission_date, matched_drawing_id"),
      supabaseAdmin.from("dmac_drawings").select("id, project_id, consultant_name, current_status, latest_rev_no, created_at, updated_at"),
      supabaseAdmin.from("drawing_coordination_tracker").select("drawing_id, sla_status_code, sla_breached_at, last_returned_at, closed_at, created_at"),
      supabaseAdmin.from("design_rfis").select("id, assigned_consultant, status"),
      supabaseAdmin.from("dmac_projects").select("id, name"),
    ]);

    const scopeSet = new Set(scope.projectIds);

    const filterProject = (pid: string | null | undefined) => {
      if (projectIdFilter && pid !== projectIdFilter) return false;
      if (!scope.unrestricted && pid && !scopeSet.has(pid)) return false;
      return true;
    };

    const trackerByDrawing = new Map((trkRes.data || []).map((t: any) => [t.drawing_id, t]));
    const drawingsById = new Map((drawRes.data || []).map((d: any) => [d.id, d]));

    const scorecards: ConsultantScorecardRow[] = (consRes.data || []).map((c: any) => {
      const cNameLower = String(c.firm_name || "").trim().toLowerCase();

      const expected = (expRes.data || []).filter(
        (e: any) => e.consultant_id === c.id && filterProject(e.project_id)
      );

      const drawings = (drawRes.data || []).filter(
        (d: any) =>
          filterProject(d.project_id) &&
          String(d.consultant_name || "").trim().toLowerCase() === cNameLower
      );

      const submittedCount = drawings.length;
      const expectedCount = expected.length;

      let onTimeHits = 0;
      let onTimeTotal = 0;
      for (const e of expected) {
        if (e.planned_submission_date) {
          onTimeTotal++;
          const matched = e.matched_drawing_id ? drawingsById.get(e.matched_drawing_id) : null;
          if (matched && new Date(matched.created_at) <= new Date(`${e.planned_submission_date}T23:59:59Z`)) {
            onTimeHits++;
          }
        }
      }
      const onTimeRatePct = onTimeTotal > 0 ? Math.round((onTimeHits / onTimeTotal) * 100) : submittedCount > 0 ? 100 : 0;

      const approvedDrawings = drawings.filter((d: any) =>
        ["APPROVED", "GFC_RELEASED", "GFC", "COMPLETED", "CLOSED"].includes(String(d.current_status || "").toUpperCase())
      );
      const firstTimeApproved = approvedDrawings.filter((d: any) => {
        const tr = trackerByDrawing.get(d.id);
        return Number(d.latest_rev_no || 0) === 0 && !tr?.last_returned_at;
      });
      const firstTimeApprovalPct =
        approvedDrawings.length > 0 ? Math.round((firstTimeApproved.length / approvedDrawings.length) * 100) : 0;

      const avgRevisionsPerDrawing =
        submittedCount > 0
          ? Number(
              (drawings.reduce((acc: number, d: any) => acc + Number(d.latest_rev_no || 0), 0) / submittedCount).toFixed(2)
            )
          : 0;

      let turnaroundSum = 0;
      let turnaroundCount = 0;
      let slaBreachedCount = 0;
      for (const d of drawings) {
        const tr = trackerByDrawing.get(d.id);
        if (tr) {
          if (tr.sla_status_code === "SLA_BREACHED" || tr.sla_breached_at) slaBreachedCount++;
          const endTs = tr.closed_at ? new Date(tr.closed_at).getTime() : Date.now();
          const days = Math.max(0, (endTs - new Date(tr.created_at).getTime()) / 86400000);
          turnaroundSum += days;
          turnaroundCount++;
        }
      }
      const avgTurnaroundDays = turnaroundCount > 0 ? Number((turnaroundSum / turnaroundCount).toFixed(1)) : 0;

      const openRfisCount = (rfiRes.data || []).filter(
        (r: any) =>
          String(r.assigned_consultant || "").trim().toLowerCase() === cNameLower &&
          !["CLOSED", "RESOLVED"].includes(String(r.status || "").toUpperCase())
      ).length;

      const baseScore =
        onTimeRatePct * 0.35 +
        firstTimeApprovalPct * 0.35 +
        Math.max(0, 100 - avgRevisionsPerDrawing * 20) * 0.15 +
        Math.max(0, 100 - slaBreachedCount * 15 - openRfisCount * 5) * 0.15;
      const performanceScore = submittedCount === 0 && expectedCount === 0 ? 0 : Math.min(100, Math.max(0, Math.round(baseScore)));

      const tier: ConsultantScorecardRow["tier"] =
        performanceScore >= 85
          ? "EXEMPLARY"
          : performanceScore >= 65
          ? "ON_TRACK"
          : performanceScore >= 45
          ? "NEEDS_ATTENTION"
          : "CRITICAL";

      return {
        consultantId: c.id,
        consultantName: c.firm_name,
        specialty: c.discipline || null,
        email: c.email || null,
        expectedCount,
        submittedCount,
        onTimeRatePct,
        approvedCount: approvedDrawings.length,
        firstTimeApprovalPct,
        avgRevisionsPerDrawing,
        avgTurnaroundDays,
        slaBreachedCount,
        openRfisCount,
        performanceScore,
        tier,
      };
    });

    const activeScorecards = scorecards.filter((s) => s.submittedCount > 0 || s.expectedCount > 0);
    const avgScore =
      activeScorecards.length > 0
        ? Math.round(activeScorecards.reduce((a, b) => a + b.performanceScore, 0) / activeScorecards.length)
        : 0;
    const avgFirstTimeApprovalPct =
      activeScorecards.length > 0
        ? Math.round(activeScorecards.reduce((a, b) => a + b.firstTimeApprovalPct, 0) / activeScorecards.length)
        : 0;

    const projects = (projRes.data || [])
      .filter((p: any) => scope.unrestricted || scopeSet.has(p.id))
      .map((p: any) => ({ id: p.id, name: p.name }));

    return {
      success: true,
      scorecards,
      projects,
      summary: {
        totalConsultants: scorecards.length,
        avgScore,
        exemplaryCount: activeScorecards.filter((s) => s.tier === "EXEMPLARY").length,
        atRiskCount: activeScorecards.filter((s) => s.tier === "NEEDS_ATTENTION" || s.tier === "CRITICAL").length,
        avgFirstTimeApprovalPct,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      scorecards: [],
      projects: [],
      summary: { totalConsultants: 0, avgScore: 0, exemplaryCount: 0, atRiskCount: 0, avgFirstTimeApprovalPct: 0 },
      error: err?.message || "Failed to compute consultant performance",
    };
  }
}
