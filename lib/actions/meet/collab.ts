"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";
import { createMeeting } from "@/lib/actions/meet/meetings";
import { addPeopleToMeeting } from "@/lib/utils/meet-people";

/**
 * Smaller Zoho-parity pieces:
 *  - comments on points, tasks and decisions
 *  - "I've read the minutes" acknowledgement
 *  - subtasks
 *  - bring an open point back into a meeting / send it to another meeting
 *  - Meet now (instant meeting)
 */

const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);
type Entity = "point" | "task" | "decision" | "session";
const PATH: Record<Entity, string> = { point: "/meet/points/", task: "/meet/tasks/", decision: "/meet/decisions/", session: "/meet/sessions/" };

/* ------------------------------------------------------------- Comments */

export interface MeetComment { id: string; body: string; at: string; by: string; mine: boolean }

export async function getComments(entityType: Entity, entityId: string): Promise<MeetComment[]> {
  const auth = await requireMeet("MEET_VIEW");
  const { data } = await supabaseAdmin
    .from("meet_comments")
    .select("id, body, created_at, user_id, user:user_master(full_name)")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: true })
    .limit(200);
  return ((data || []) as any[]).map((c) => ({ id: c.id, body: c.body, at: c.created_at, by: one(c.user)?.full_name || "Someone", mine: c.user_id === auth.userId }));
}

export async function addComment(entityType: Entity, entityId: string, body: string): Promise<{ success: boolean; error?: string }> {
  const auth = await requireMeet("MEET_VIEW");
  const text = String(body || "").trim().slice(0, 4000);
  if (!text) return { success: false, error: "Write a comment first." };
  const { error } = await supabaseAdmin.from("meet_comments").insert({ entity_type: entityType, entity_id: entityId, user_id: auth.userId, body: text });
  if (error) return { success: false, error: error.message };
  revalidatePath(`${PATH[entityType]}${entityId}`);
  return { success: true };
}

/* ------------------------------------------------- Minutes acknowledgement */

export async function getMinutesAcks(sessionId: string): Promise<{ version: number; acked: { name: string; at: string }[]; invited: number; mine: boolean; canAck: boolean }> {
  const auth = await requireMeet("MEET_VIEW", { sessionId });
  const { data: s } = await supabaseAdmin.from("meet_sessions").select("mom_version, status").eq("id", sessionId).maybeSingle();
  const version = Number(s?.mom_version) || 1;
  const [ackRes, attRes] = await Promise.all([
    supabaseAdmin.from("meet_mom_acknowledgements").select("user_id, acknowledged_at, user:user_master(full_name)").eq("session_id", sessionId).eq("mom_version", version),
    supabaseAdmin.from("meet_session_attendees").select("user_id").eq("session_id", sessionId).not("user_id", "is", null).not("role", "in", '("requested","denied")'),
  ]);
  const acked = ((ackRes.data || []) as any[]).map((a) => ({ id: a.user_id, name: one(a.user)?.full_name || "Someone", at: a.acknowledged_at }));
  const invitedIds = new Set(((attRes.data || []) as any[]).map((a) => a.user_id));
  const sent = s?.status === "published" || s?.status === "mom_published";
  return {
    version,
    acked: acked.map(({ name, at }) => ({ name, at })),
    invited: invitedIds.size,
    mine: acked.some((a) => a.id === auth.userId),
    canAck: sent && invitedIds.has(auth.userId),
  };
}

export async function acknowledgeMinutes(sessionId: string): Promise<{ success: boolean; error?: string }> {
  const auth = await requireMeet("MEET_VIEW", { sessionId });
  const { data: s } = await supabaseAdmin.from("meet_sessions").select("mom_version, status").eq("id", sessionId).maybeSingle();
  if (!s || !(s.status === "published" || s.status === "mom_published")) return { success: false, error: "The minutes haven't been sent yet." };
  const { error } = await supabaseAdmin
    .from("meet_mom_acknowledgements")
    .upsert({ session_id: sessionId, mom_version: Number(s.mom_version) || 1, user_id: auth.userId, acknowledged_at: new Date().toISOString(), channel: "web" }, { onConflict: "session_id,mom_version,user_id" });
  if (error) return { success: false, error: error.message };
  revalidatePath(`/meet/sessions/${sessionId}/review`);
  return { success: true };
}

/* ------------------------------------------------------------- Subtasks */

export async function getSubtasks(taskId: string) {
  await requireMeet("MEET_VIEW", { taskId });
  const { data } = await supabaseAdmin
    .from("meet_tasks")
    .select("id, code, title, status, due_date, owner:user_master!meet_tasks_owner_id_fkey(full_name)")
    .eq("parent_task_id", taskId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });
  return ((data || []) as any[]).map((t) => ({ id: t.id, code: t.code, title: t.title, status: t.status, due: t.due_date, owner: one(t.owner)?.full_name || null }));
}

export async function addSubtask(input: { parentId: string; title: string; ownerId?: string; days?: number }): Promise<{ success: boolean; error?: string }> {
  const auth = await requireMeet("MEET_VIEW", { taskId: input.parentId });
  const title = String(input.title || "").trim().slice(0, 300);
  if (title.length < 2) return { success: false, error: "Give the subtask a title." };
  const { data: p } = await supabaseAdmin.from("meet_tasks").select("id, point_id, session_id, priority, parent_task_id, point:meet_points(meeting_id)").eq("id", input.parentId).maybeSingle();
  if (!p) return { success: false, error: "Task not found." };
  if (p.parent_task_id) return { success: false, error: "Subtasks can't have their own subtasks." };
  const days = Math.min(60, Math.max(1, Math.round(Number(input.days) || 2)));
  const start = new Date().toISOString().slice(0, 10);
  const { data: due } = await supabaseAdmin.rpc("fn_meet_calculate_due_date", { p_start_date: start, p_tat_days: days });
  const { data: t, error } = await supabaseAdmin
    .from("meet_tasks")
    .insert({
      parent_task_id: p.id, point_id: p.point_id, session_id: p.session_id, title, owner_id: input.ownerId || null, priority: p.priority || "medium",
      tat_days: days, start_date: start, due_date: due || new Date(Date.now() + days * 86400000).toISOString().slice(0, 10), status: "not_started", progress_percent: 0, created_by: auth.userId,
    })
    .select("id, code")
    .single();
  if (error || !t) return { success: false, error: error?.message || "Couldn't add the subtask." };
  const mid = one((p as any).point)?.meeting_id;
  if (input.ownerId && mid) await addPeopleToMeeting(mid, [input.ownerId]).catch(() => 0);
  await supabaseAdmin.from("meet_activity_log").insert({ entity_type: "task", entity_id: p.id, action: "subtask_added", field: "subtask", new_value: `${t.code} ${title}`, user_id: auth.userId, channel: "web" });
  revalidatePath(`/meet/tasks/${p.id}`);
  return { success: true };
}

/* --------------------------------------- Bring a point back / send elsewhere */

/** Upcoming or running dates of meetings I can add points to (for the pickers). */
export async function getTargetSessions(excludeMeetingId?: string) {
  const auth = await requireMeet("MEET_VIEW");
  const isAdmin = auth.isSuperAdmin || auth.isMeetAdmin;
  const { data } = await supabaseAdmin
    .from("meet_sessions")
    .select("id, code, scheduled_start, status, meeting_id, meeting:meet_meetings(id, title, organizer_id, chair_id, is_deleted)")
    .in("status", ["scheduled", "in_progress"])
    .eq("is_deleted", false)
    .gte("scheduled_start", new Date(Date.now() - 12 * 3600000).toISOString())
    .order("scheduled_start", { ascending: true })
    .limit(200);
  return ((data || []) as any[])
    .map((s) => ({ s, m: one(s.meeting) }))
    .filter(({ m }) => m && !m.is_deleted && (isAdmin || m.organizer_id === auth.userId || m.chair_id === auth.userId))
    .map(({ s, m }) => ({ id: s.id, meetingId: m.id, label: `${m.title} · ${new Date(s.scheduled_start).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`, sameMeeting: m.id === excludeMeetingId }));
}

/** Put an open point on the agenda of a (later or running) date of its own meeting. */
export async function bringPointBack(input: { pointId: string; sessionId: string }): Promise<{ success: boolean; error?: string }> {
  const auth = await requireMeet("MEET_POINT_MANAGE", { pointId: input.pointId });
  const { data: p } = await supabaseAdmin.from("meet_points").select("id, meeting_id, status").eq("id", input.pointId).maybeSingle();
  const { data: s } = await supabaseAdmin.from("meet_sessions").select("id, meeting_id").eq("id", input.sessionId).maybeSingle();
  if (!p || !s) return { success: false, error: "Not found." };
  if (p.meeting_id !== s.meeting_id) return { success: false, error: "Pick a date of the same meeting, or use 'Send to another meeting'." };
  await supabaseAdmin.from("meet_session_points").upsert({ session_id: s.id, point_id: p.id, entry_type: "pulled", status_at_start: p.status, sort_order: 50 }, { onConflict: "session_id,point_id" });
  await supabaseAdmin.from("meet_points").update({ current_session_id: s.id, status: p.status === "closed" || p.status === "dropped" ? "reopened" : p.status, updated_at: new Date().toISOString() }).eq("id", p.id);
  await supabaseAdmin.from("meet_activity_log").insert({ entity_type: "point", entity_id: p.id, action: "pulled_into_meeting", field: "session", new_value: s.id, user_id: auth.userId, channel: "web" });
  revalidatePath(`/meet/points/${p.id}`);
  return { success: true };
}

/** Raise the point in a different meeting: a linked copy is created there; both keep their history. */
export async function sendPointToMeeting(input: { pointId: string; sessionId: string; note?: string }): Promise<{ success: boolean; error?: string; newPointId?: string }> {
  const auth = await requireMeet("MEET_POINT_MANAGE", { pointId: input.pointId });
  const { data: p } = await supabaseAdmin.from("meet_points").select("*, meeting:meet_meetings(title, code)").eq("id", input.pointId).maybeSingle();
  const { data: s } = await supabaseAdmin.from("meet_sessions").select("id, meeting_id").eq("id", input.sessionId).maybeSingle();
  if (!p || !s) return { success: false, error: "Not found." };
  if (s.meeting_id === p.meeting_id) return { success: false, error: "That's the same meeting. Use 'Bring back' instead." };
  const from = one((p as any).meeting);
  const { data: np, error } = await supabaseAdmin
    .from("meet_points")
    .insert({
      meeting_id: s.meeting_id, origin_session_id: s.id, current_session_id: s.id, title: p.title,
      description: `Raised from ${from?.code || ""} ${from?.title || "another meeting"} (${p.code}).${input.note ? `\n${input.note}` : ""}${p.description ? `\n\n${p.description}` : ""}`,
      point_type: p.point_type, category_id: p.category_id, department_id: p.department_id, priority: p.priority, owner_id: p.owner_id, raised_by_id: auth.userId,
      tat_days: p.tat_days, due_date: p.due_date, status: "open", progress_percent: p.progress_percent || 0, carry_forward_count: 0, is_backup: false, created_by: auth.userId,
    })
    .select("id, code")
    .single();
  if (error || !np) return { success: false, error: error?.message || "Couldn't raise it there." };
  await supabaseAdmin.from("meet_session_points").insert({ session_id: s.id, point_id: np.id, entry_type: "escalated_in", status_at_start: "open", sort_order: 40 });
  if (p.owner_id) await addPeopleToMeeting(s.meeting_id, [p.owner_id]).catch(() => 0);
  await supabaseAdmin.from("meet_activity_log").insert([
    { entity_type: "point", entity_id: p.id, action: "escalated_to_meeting", field: "linked_point", new_value: `${np.code} ${np.id}`, user_id: auth.userId, channel: "web" },
    { entity_type: "point", entity_id: np.id, action: "escalated_in", field: "linked_point", new_value: `${p.code} ${p.id}`, user_id: auth.userId, channel: "web" },
  ]);
  revalidatePath(`/meet/points/${p.id}`);
  return { success: true, newPointId: np.id };
}

/* -------------------------------------------------------------- Meet now */

/** A one-off meeting starting now; the organiser lands in the live room. */
export async function meetNow(input?: { title?: string; userIds?: string[] }): Promise<{ success: boolean; error?: string; sessionId?: string }> {
  const auth = await requireMeet("MEET_CREATE");
  const [{ data: me }, { data: types }] = await Promise.all([
    supabaseAdmin.from("user_master").select("full_name").eq("id", auth.userId).maybeSingle(),
    supabaseAdmin.from("meet_meeting_types").select("id").eq("is_active", true).order("sort_order").limit(1),
  ]);
  if (!types?.[0]?.id) return { success: false, error: "No meeting type is set up. Add one in Settings › Meeting types." };
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const g = (t: string) => parts.find((x) => x.type === t)?.value || "00";
  const res: any = await createMeeting({
    title: String(input?.title || "").trim() || `Quick meeting · ${me?.full_name || "Me"}`,
    meeting_type_id: types[0].id,
    organizer_id: auth.userId,
    mode: "online",
    video_provider: "teams",
    start_date: `${g("year")}-${g("month")}-${g("day")}`,
    default_start_time: `${g("hour") === "24" ? "00" : g("hour")}:${g("minute")}:00`,
    default_duration_minutes: 30,
    recurrence: "none",
    allow_attendees_add_points: true,
    is_confidential: false,
    requires_mom_approval: false,
    pre_update_enabled: false,
    members: (input?.userIds || []).filter((id) => id !== auth.userId).map((id) => ({ user_id: id, role: "required" })),
  } as any);
  if (!res?.success || !res.sessionId) return { success: false, error: res?.error || "Couldn't start the meeting." };
  return { success: true, sessionId: res.sessionId };
}
