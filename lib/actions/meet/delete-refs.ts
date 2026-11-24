"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";

/**
 * Delete with reference check. Before a meeting (or a point) is deleted, everything that hangs
 * off it is listed in order: tasks → points → decisions → meeting dates → the meeting itself.
 * Each item can be removed on that page; the meeting/point can only be deleted once nothing
 * open is left under it (or with "remove everything in order").
 * Nothing is erased: tasks, points, dates and meetings are soft-deleted (is_deleted), decisions
 * are withdrawn, upcoming dates are cancelled. Every step is in the activity log with the reason.
 */

const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const now = () => new Date().toISOString();

async function canManageMeeting(meetingId: string) {
  const auth = await requireMeet("MEET_VIEW", { meetingId });
  const { data: m } = await supabaseAdmin.from("meet_meetings").select("id, code, title, organizer_id, is_deleted, status").eq("id", meetingId).maybeSingle();
  const ok = !!m && !m.is_deleted && (auth.isSuperAdmin || auth.isMeetAdmin || m.organizer_id === auth.userId);
  return { auth, m, ok };
}

export interface RefItem { id: string; code: string | null; title: string; detail: string; status: string }
export interface MeetingRefs {
  meeting: { id: string; code: string | null; title: string } | null;
  canDelete: boolean;
  tasks: RefItem[];
  points: RefItem[];
  decisions: RefItem[];
  sessions: RefItem[];
  files: number;
  comments: number;
}

export async function getMeetingRefs(meetingId: string): Promise<MeetingRefs> {
  const { m, ok } = await canManageMeeting(meetingId);
  const empty: MeetingRefs = { meeting: null, canDelete: false, tasks: [], points: [], decisions: [], sessions: [], files: 0, comments: 0 };
  if (!m || m.is_deleted) return empty;
  const [{ data: pts }, { data: sess }] = await Promise.all([
    supabaseAdmin.from("meet_points").select("id, code, title, status, owner:user_master!meet_points_owner_id_fkey(full_name)").eq("meeting_id", meetingId).eq("is_deleted", false).order("created_at"),
    supabaseAdmin.from("meet_sessions").select("id, code, scheduled_start, status").eq("meeting_id", meetingId).eq("is_deleted", false).order("scheduled_start"),
  ]);
  const pids = (pts || []).map((p: any) => p.id);
  const sids = (sess || []).map((s: any) => s.id);
  const [{ data: tasks }, { data: decs }, fileRes, comRes] = await Promise.all([
    pids.length
      ? supabaseAdmin.from("meet_tasks").select("id, code, title, status, owner:user_master!meet_tasks_owner_id_fkey(full_name)").in("point_id", pids).eq("is_deleted", false).order("created_at")
      : Promise.resolve({ data: [] as any[] }),
    sids.length ? supabaseAdmin.from("meet_decisions").select("id, code, text, status").in("session_id", sids).neq("status", "revoked") : Promise.resolve({ data: [] as any[] }),
    supabaseAdmin.from("meet_attachments").select("id", { count: "exact", head: true }).in("entity_id", [...pids, ...sids].length ? [...pids, ...sids] : ["00000000-0000-0000-0000-000000000000"]),
    supabaseAdmin.from("meet_comments").select("id", { count: "exact", head: true }).in("entity_id", pids.length ? pids : ["00000000-0000-0000-0000-000000000000"]),
  ]);
  const day = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
  return {
    meeting: { id: m.id, code: m.code || null, title: m.title },
    canDelete: ok,
    tasks: ((tasks || []) as any[]).map((t) => ({ id: t.id, code: t.code, title: t.title, detail: one(t.owner)?.full_name || "No owner", status: t.status })),
    points: ((pts || []) as any[]).map((p) => ({ id: p.id, code: p.code, title: p.title, detail: one(p.owner)?.full_name || "No owner", status: p.status })),
    decisions: ((decs || []) as any[]).map((d) => ({ id: d.id, code: d.code, title: d.text, detail: "", status: d.status })),
    sessions: ((sess || []) as any[]).map((s) => ({ id: s.id, code: s.code, title: day(s.scheduled_start), detail: "", status: s.status })),
    files: (fileRes as any).count || 0,
    comments: (comRes as any).count || 0,
  };
}

/** Remove one item listed on the delete page. */
export async function removeRef(input: { meetingId: string; kind: "task" | "point" | "decision" | "session"; id: string; reason: string }): Promise<{ success: boolean; error?: string }> {
  const { auth, ok } = await canManageMeeting(input.meetingId);
  if (!ok) return { success: false, error: "Only the organiser or a Meet admin can delete here." };
  const reason = String(input.reason || "").trim().slice(0, 300);
  if (reason.length < 3) return { success: false, error: "Give a reason first." };
  const log = (entity: string, action: string, value: string) =>
    supabaseAdmin.from("meet_activity_log").insert({ entity_type: entity, entity_id: input.id, action, field: "status", new_value: `${value} · ${reason}`, user_id: auth.userId, channel: "web" });

  if (input.kind === "task") {
    const { count } = await supabaseAdmin.from("meet_tasks").select("id", { count: "exact", head: true }).eq("parent_task_id", input.id).eq("is_deleted", false);
    if (count) await supabaseAdmin.from("meet_tasks").update({ is_deleted: true, updated_at: now() }).eq("parent_task_id", input.id);
    await supabaseAdmin.from("meet_tasks").update({ is_deleted: true, updated_at: now() }).eq("id", input.id);
    await log("task", "deleted", "deleted");
  } else if (input.kind === "point") {
    const { count } = await supabaseAdmin.from("meet_tasks").select("id", { count: "exact", head: true }).eq("point_id", input.id).eq("is_deleted", false);
    if (count) return { success: false, error: `This point still has ${count} task${count === 1 ? "" : "s"}. Remove them first.` };
    await supabaseAdmin.from("meet_points").update({ is_deleted: true, updated_at: now() }).eq("id", input.id);
    await log("point", "deleted", "deleted");
  } else if (input.kind === "decision") {
    await supabaseAdmin.from("meet_decisions").update({ status: "revoked", updated_at: now() }).eq("id", input.id);
    await log("decision", "withdrawn", "withdrawn");
  } else {
    const { data: s } = await supabaseAdmin.from("meet_sessions").select("status").eq("id", input.id).maybeSingle();
    if (s?.status === "in_progress") return { success: false, error: "This meeting date is running now. End it first." };
    if (s?.status === "scheduled") {
      const { cancelSession } = await import("@/lib/actions/meet/sessions");
      await cancelSession({ sessionId: input.id, reason });
    }
    await supabaseAdmin.from("meet_sessions").update({ is_deleted: true, updated_at: now() }).eq("id", input.id);
    await supabaseAdmin.from("meet_room_bookings").update({ status: "cancelled", updated_at: now() }).eq("session_id", input.id).neq("status", "cancelled");
    await log("session", "deleted", "deleted");
  }
  revalidatePath(`/meet/meetings/${input.meetingId}/delete`);
  return { success: true };
}

/** Delete the meeting: either after everything under it is removed, or everything in order now. */
export async function deleteMeetingWithRefs(input: { meetingId: string; reason: string; removeAll: boolean }): Promise<{ success: boolean; error?: string }> {
  const { auth, ok } = await canManageMeeting(input.meetingId);
  if (!ok) return { success: false, error: "Only the organiser or a Meet admin can delete this meeting." };
  const reason = String(input.reason || "").trim().slice(0, 300);
  if (reason.length < 3) return { success: false, error: "Give a reason first." };
  const refs = await getMeetingRefs(input.meetingId);
  if (refs.sessions.some((s) => s.status === "in_progress")) return { success: false, error: "A date of this meeting is running now. End it first." };
  const left = refs.tasks.length + refs.points.length;
  if (left && !input.removeAll) return { success: false, error: `Remove the ${left} task(s) and point(s) listed first, or use "Remove everything in order".` };

  if (input.removeAll) {
    for (const t of refs.tasks) await removeRef({ meetingId: input.meetingId, kind: "task", id: t.id, reason });
    for (const p of refs.points) await removeRef({ meetingId: input.meetingId, kind: "point", id: p.id, reason });
    for (const d of refs.decisions) await removeRef({ meetingId: input.meetingId, kind: "decision", id: d.id, reason });
  }
  for (const s of refs.sessions.filter((x) => x.status === "scheduled")) await removeRef({ meetingId: input.meetingId, kind: "session", id: s.id, reason });

  await supabaseAdmin.from("meet_meetings").update({ is_deleted: true, status: "archived", updated_at: now() }).eq("id", input.meetingId);
  await supabaseAdmin.from("meet_activity_log").insert({ entity_type: "meeting", entity_id: input.meetingId, action: "deleted", field: "is_deleted", new_value: `deleted · ${reason}`, user_id: auth.userId, channel: "web" });
  revalidatePath("/meet");
  revalidatePath("/meet/meetings");
  return { success: true };
}

/* ------------------------------------------------------------- Point delete */

export interface PointRefs {
  point: { id: string; code: string; title: string; meetingId: string } | null;
  canDelete: boolean;
  tasks: RefItem[];
  decisions: RefItem[];
  sessions: number;
}

export async function getPointRefs(pointId: string): Promise<PointRefs> {
  const auth = await requireMeet("MEET_VIEW", { pointId });
  const { data: p } = await supabaseAdmin.from("meet_points").select("id, code, title, meeting_id, owner_id, is_deleted, meeting:meet_meetings(organizer_id, chair_id)").eq("id", pointId).maybeSingle();
  if (!p || p.is_deleted) return { point: null, canDelete: false, tasks: [], decisions: [], sessions: 0 };
  const m = one((p as any).meeting);
  const [{ data: tasks }, { data: decs }, { count }] = await Promise.all([
    supabaseAdmin.from("meet_tasks").select("id, code, title, status, owner:user_master!meet_tasks_owner_id_fkey(full_name)").eq("point_id", pointId).eq("is_deleted", false),
    supabaseAdmin.from("meet_decisions").select("id, code, text, status").eq("point_id", pointId).neq("status", "revoked"),
    supabaseAdmin.from("meet_session_points").select("session_id", { count: "exact", head: true }).eq("point_id", pointId),
  ]);
  return {
    point: { id: p.id, code: p.code, title: p.title, meetingId: p.meeting_id },
    canDelete: auth.isSuperAdmin || auth.isMeetAdmin || m?.organizer_id === auth.userId || m?.chair_id === auth.userId,
    tasks: ((tasks || []) as any[]).map((t) => ({ id: t.id, code: t.code, title: t.title, detail: one(t.owner)?.full_name || "No owner", status: t.status })),
    decisions: ((decs || []) as any[]).map((d) => ({ id: d.id, code: d.code, title: d.text, detail: "", status: d.status })),
    sessions: count || 0,
  };
}

export async function deletePointWithRefs(input: { pointId: string; reason: string; removeAll: boolean; only?: { kind: "task" | "decision"; id: string } }): Promise<{ success: boolean; error?: string }> {
  const refs = await getPointRefs(input.pointId);
  if (!refs.point || !refs.canDelete) return { success: false, error: "Only the organiser, chair or a Meet admin can delete this point." };
  const auth = await requireMeet("MEET_VIEW", { pointId: input.pointId });
  const reason = String(input.reason || "").trim().slice(0, 300);
  if (reason.length < 3) return { success: false, error: "Give a reason first." };
  const logIt = (entity: string, id: string, action: string) =>
    supabaseAdmin.from("meet_activity_log").insert({ entity_type: entity, entity_id: id, action, field: "status", new_value: `${action} · ${reason}`, user_id: auth.userId, channel: "web" });

  if (input.only) {
    if (input.only.kind === "task") {
      await supabaseAdmin.from("meet_tasks").update({ is_deleted: true, updated_at: now() }).or(`id.eq.${input.only.id},parent_task_id.eq.${input.only.id}`);
      await logIt("task", input.only.id, "deleted");
    } else {
      await supabaseAdmin.from("meet_decisions").update({ status: "revoked", updated_at: now() }).eq("id", input.only.id);
      await logIt("decision", input.only.id, "withdrawn");
    }
    revalidatePath(`/meet/points/${input.pointId}/delete`);
    return { success: true };
  }
  if (refs.tasks.length && !input.removeAll) return { success: false, error: `Remove the ${refs.tasks.length} task(s) first, or use "Remove everything in order".` };
  for (const t of refs.tasks) {
    await supabaseAdmin.from("meet_tasks").update({ is_deleted: true, updated_at: now() }).or(`id.eq.${t.id},parent_task_id.eq.${t.id}`);
    await logIt("task", t.id, "deleted");
  }
  if (input.removeAll) for (const d of refs.decisions) {
    await supabaseAdmin.from("meet_decisions").update({ status: "revoked", updated_at: now() }).eq("id", d.id);
    await logIt("decision", d.id, "withdrawn");
  }
  await supabaseAdmin.from("meet_points").update({ is_deleted: true, updated_at: now() }).eq("id", input.pointId);
  await logIt("point", input.pointId, "deleted");
  revalidatePath("/meet/points");
  revalidatePath(`/meet/meetings/${refs.point.meetingId}`);
  return { success: true };
}
