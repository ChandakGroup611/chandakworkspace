"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";
import { getOrCreateSessionNotes } from "@/lib/actions/meet/notes";

/**
 * Checks run before "End meeting": per person (did they get their points and tasks covered?)
 * and for the meeting as a whole. Nothing here blocks ending; the organiser sees what's missing,
 * can go back and fix it, or confirms and ends anyway.
 */

export type CheckLevel = "fix" | "check" | "tip" | "ok";
export interface EndCheckItem {
  level: CheckLevel;
  text: string;
  detail?: string;
}
export interface PersonCheck {
  user_id: string;
  name: string;
  attendance: string;
  open_points: number;
  points_without_update: { code: string; title: string }[];
  tasks_given: number;
  ok: boolean;
}
export interface EndChecklist {
  items: EndCheckItem[];
  people: PersonCheck[];
  isOneOff: boolean;
  openPoints: number;
  defaultFollowUp: string; // yyyy-mm-ddThh:mm (IST) a week later
}

const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export async function getEndChecklist(sessionId: string): Promise<EndChecklist> {
  await requireMeet("MEET_VIEW", { sessionId });
  const { data: s } = await supabaseAdmin
    .from("meet_sessions")
    .select("id, scheduled_start, actual_start, meeting_id, summary_notes, meeting:meet_meetings(id, recurrence, organizer_id)")
    .eq("id", sessionId)
    .maybeSingle();
  const m = one((s as any)?.meeting);
  const isOneOff = !m?.recurrence || m.recurrence === "none";

  const [attRes, spRes, taskRes, decRes, preRes, agendaRes, notes] = await Promise.all([
    supabaseAdmin.from("meet_session_attendees").select("user_id, attendance, role, user:user_master(full_name)").eq("session_id", sessionId).not("role", "in", '("requested","denied")'),
    supabaseAdmin
      .from("meet_session_points")
      .select("entry_type, status_at_start, discussion_notes, point:meet_points(id, code, title, status, owner_id, carry_forward_count, updated_at, is_deleted)")
      .eq("session_id", sessionId),
    supabaseAdmin.from("meet_tasks").select("id, owner_id, point_id").eq("session_id", sessionId).eq("is_deleted", false),
    supabaseAdmin.from("meet_decisions").select("id").eq("session_id", sessionId),
    supabaseAdmin.from("meet_pre_updates").select("point_id, user_id").eq("session_id", sessionId),
    supabaseAdmin.from("meet_agenda_items").select("id").eq("session_id", sessionId),
    getOrCreateSessionNotes(sessionId).catch(() => null),
  ]);

  const startedAt = new Date((s as any)?.actual_start || (s as any)?.scheduled_start || Date.now()).getTime();
  const points = ((spRes.data || []) as any[]).map((r) => ({ ...r, p: one(r.point) })).filter((r) => r.p && !r.p.is_deleted);
  const tasks = (taskRes.data || []) as any[];
  const pre = new Set(((preRes.data || []) as any[]).map((x) => x.point_id));
  const tasksByPoint = new Set(tasks.map((t) => t.point_id));
  const lines = ((notes as any)?.blocks || []) as any[];
  const linesByPoint = new Set(lines.filter((b) => b.point_id).map((b) => b.point_id));

  const open = points.filter((r) => r.p.status !== "closed" && r.p.status !== "dropped");
  // A point counts as "covered" if anything happened to it in this meeting
  const covered = (r: any) =>
    r.entry_type === "new" ||
    (r.status_at_start && r.status_at_start !== r.p.status) ||
    !!String(r.discussion_notes || "").trim() ||
    pre.has(r.p.id) ||
    tasksByPoint.has(r.p.id) ||
    linesByPoint.has(r.p.id) ||
    new Date(r.p.updated_at || 0).getTime() >= startedAt;

  const names = new Map<string, string>();
  for (const a of (attRes.data || []) as any[]) if (a.user_id) names.set(a.user_id, one(a.user)?.full_name || "Someone");
  const ownerIds = Array.from(new Set(points.map((r) => r.p.owner_id).filter(Boolean))) as string[];
  const missingNames = ownerIds.filter((id) => !names.has(id));
  if (missingNames.length) {
    const { data: us } = await supabaseAdmin.from("user_master").select("id, full_name").in("id", missingNames);
    for (const u of us || []) names.set((u as any).id, (u as any).full_name || "Someone");
  }

  const attendance = new Map<string, string>();
  for (const a of (attRes.data || []) as any[]) if (a.user_id) attendance.set(a.user_id, a.attendance || "present");
  const people: PersonCheck[] = Array.from(new Set([...Array.from(attendance.keys()), ...ownerIds])).map((uid) => {
    const mine = open.filter((r) => r.p.owner_id === uid);
    const noUpdate = mine.filter((r) => !covered(r)).map((r) => ({ code: r.p.code, title: r.p.title }));
    return {
      user_id: uid,
      name: names.get(uid) || "Someone",
      attendance: attendance.get(uid) || "not invited",
      open_points: mine.length,
      points_without_update: noUpdate,
      tasks_given: tasks.filter((t) => t.owner_id === uid).length,
      ok: noUpdate.length === 0,
    };
  });
  people.sort((a, b) => Number(a.ok) - Number(b.ok) || a.name.localeCompare(b.name));

  const items: EndCheckItem[] = [];
  const noOwnerPts = open.filter((r) => !r.p.owner_id).length;
  const noOwnerTasks = tasks.filter((t) => !t.owner_id).length;
  if (noOwnerPts) items.push({ level: "fix", text: `${noOwnerPts} open point${noOwnerPts === 1 ? " has" : "s have"} no owner`, detail: "Give each one an owner so it's followed up." });
  if (noOwnerTasks) items.push({ level: "fix", text: `${noOwnerTasks} task${noOwnerTasks === 1 ? " has" : "s have"} no owner` });
  const skipped = open.filter((r) => !covered(r)).length;
  if (skipped) items.push({ level: "check", text: `${skipped} open point${skipped === 1 ? " wasn't" : "s weren't"} discussed`, detail: "No status change, note or task on them in this meeting. They'll come back next time." });
  const loops = Number((notes as any)?.open_loops_count || 0);
  if (loops) items.push({ level: "check", text: `${loops} note line${loops === 1 ? " looks" : "s look"} like an action`, detail: "You can turn them into tasks on the minutes review, or discard them." });
  if (points.length === 0 && lines.length === 0) items.push({ level: "check", text: "Nothing was recorded", detail: "No points and no notes. The minutes will be almost empty." });
  if ((decRes.data || []).length === 0 && points.length > 0) items.push({ level: "tip", text: "No decisions recorded", detail: "If anything was agreed, record it as a decision so it shows in the decision register." });
  const absentOwners = people.filter((p) => p.open_points > 0 && (p.attendance === "absent" || p.attendance === "excused")).length;
  if (absentOwners) items.push({ level: "tip", text: `${absentOwners} point owner${absentOwners === 1 ? " was" : "s were"} absent`, detail: "They'll get the minutes; consider asking them for an update before the next meeting." });
  const carried = open.filter((r) => (r.p.carry_forward_count || 0) + 1 >= 3).length;
  if (carried) items.push({ level: "tip", text: `${carried} point${carried === 1 ? " will be" : "s will be"} carried for the 3rd time or more`, detail: "Consider closing, dropping or escalating them instead of carrying again." });
  if ((agendaRes.data || []).length === 0 && points.length === 0) items.push({ level: "tip", text: "No agenda was set", detail: "Next time, add agenda items on the meeting page so people can prepare." });
  if (!items.length) items.push({ level: "ok", text: "Everything looks covered" });

  // Default follow-up: same time a week later (IST)
  const next = new Date(new Date((s as any)?.scheduled_start || Date.now()).getTime() + 7 * 86400000);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(next);
  const g = (t: string) => parts.find((p) => p.type === t)?.value || "00";
  const defaultFollowUp = `${g("year")}-${g("month")}-${g("day")}T${g("hour") === "24" ? "00" : g("hour")}:${g("minute")}`;

  return { items, people, isOneOff, openPoints: open.length, defaultFollowUp };
}
