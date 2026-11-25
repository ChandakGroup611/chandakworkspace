"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";
import { getMyMeetScope, getHiddenConfidentialMeetingIds } from "@/lib/utils/meet-scope";

/**
 * Points & tasks (redesign, Zoho task-list style) and the point detail page.
 */

export type PointsView = "mine" | "meetings" | "overdue" | "carried" | "closed";

export interface PointRow {
  id: string;
  code: string;
  title: string;
  status: string;
  priority: string;
  progress: number;
  due_date: string | null;
  carry_forward_count: number;
  owner_id: string | null;
  owner_name: string | null;
  meeting_id: string;
  meeting_title: string;
  meeting_code: string | null;
}

const IST = "Asia/Kolkata";
const todayIST = () => new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);

const POINT_SELECT = `
  id, code, title, status, priority, progress_percent, due_date, carry_forward_count, owner_id, meeting_id,
  owner:user_master!meet_points_owner_id_fkey(id, full_name),
  meeting:meet_meetings(id, title, code, is_deleted)
`;

function toRow(p: any): PointRow {
  const o = one(p.owner);
  const m = one(p.meeting);
  return {
    id: p.id,
    code: p.code,
    title: p.title,
    status: p.status,
    priority: p.priority,
    progress: Number(p.progress_percent) || 0,
    due_date: p.due_date || null,
    carry_forward_count: Number(p.carry_forward_count) || 0,
    owner_id: p.owner_id || null,
    owner_name: o?.full_name || null,
    meeting_id: p.meeting_id,
    meeting_title: m?.title || "Meeting",
    meeting_code: m?.code || null,
  };
}

export async function getPointsTable(view: PointsView = "mine", search?: string): Promise<{ rows: PointRow[]; error?: string }> {
  const auth = await requireMeet("MEET_VIEW");
  const userId = auth.userId;
  try {
    const { meetingIds } = await getMyMeetScope(userId);
    let q = supabaseAdmin.from("meet_points").select(POINT_SELECT).eq("is_deleted", false);

    if (view === "mine") {
      q = q.eq("owner_id", userId).not("status", "in", '("closed","dropped")');
    } else {
      if (!meetingIds.size) return { rows: [] };
      q = q.in("meeting_id", Array.from(meetingIds));
      if (view === "meetings") q = q.not("status", "in", '("closed","dropped")');
      if (view === "overdue") q = q.not("status", "in", '("closed","dropped")').lt("due_date", todayIST());
      if (view === "carried") q = q.not("status", "in", '("closed","dropped")').gte("carry_forward_count", 3);
      if (view === "closed") q = q.in("status", ["closed", "dropped"]);
    }
    if (search && search.trim()) {
      const s = search.trim().replace(/[%,()]/g, " ");
      q = q.or(`title.ilike.%${s}%,code.ilike.%${s}%`);
    }
    q = q.order("due_date", { ascending: view !== "closed", nullsFirst: false }).limit(500);

    const { data, error } = await q;
    if (error) return { rows: [], error: error.message };

    // Confidential meetings the viewer isn't part of never show (owner of the point still sees their own)
    const hidden = await getHiddenConfidentialMeetingIds(userId, auth.isSuperAdmin || auth.isMeetAdmin);
    const rows = (data || []).filter((p: any) => !one(p.meeting)?.is_deleted && (p.owner_id === userId || !hidden.has(p.meeting_id))).map(toRow);
    return { rows };
  } catch (err: any) {
    console.error("[getPointsTable]", err);
    return { rows: [], error: err?.message || "Could not load points." };
  }
}

export interface PointDetail {
  point: any;
  meeting: { id: string; title: string; code: string | null } | null;
  siblings: PointRow[];
  tasks: any[];
  history: { session_id: string; date: string; code: string | null; entry_type: string; status_at_start: string | null; status_at_end: string | null; notes: string | null }[];
  updates: { id: string; at: string; by: string | null; progress: number | null; text: string | null }[];
  activity: { id: string; at: string; by: string | null; action: string; field: string | null; old_value: string | null; new_value: string | null }[];
  canEdit: boolean;
}

export async function getPointDetail(pointId: string): Promise<PointDetail | null> {
  const auth = await requireMeet("MEET_VIEW", { pointId });
  const userId = auth.userId;
  try {
    const { data: p } = await supabaseAdmin
      .from("meet_points")
      .select(`
        *,
        owner:user_master!meet_points_owner_id_fkey(id, full_name, email),
        meeting:meet_meetings(id, title, code, organizer_id, chair_id, is_deleted),
        category:meet_point_categories(id, name)
      `)
      .eq("id", pointId)
      .eq("is_deleted", false)
      .maybeSingle();
    if (!p) return null;

    const meeting = one(p.meeting);
    const [siblingsRes, tasksRes, histRes, updRes, actRes, raisedByRes] = await Promise.all([
      supabaseAdmin
        .from("meet_points")
        .select(POINT_SELECT)
        .eq("meeting_id", p.meeting_id)
        .eq("is_deleted", false)
        .not("status", "in", '("closed","dropped")')
        .order("due_date", { ascending: true })
        .limit(60),
      supabaseAdmin
        .from("meet_tasks")
        .select("id, code, title, status, due_date, revised_due_date, progress_percent, owner:user_master!meet_tasks_owner_id_fkey(full_name)")
        .eq("point_id", pointId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("meet_session_points")
        .select("session_id, entry_type, status_at_start, status_at_end, discussion_notes, session:meet_sessions(id, code, scheduled_start)")
        .eq("point_id", pointId),
      supabaseAdmin
        .from("meet_pre_updates")
        .select("id, created_at, progress_proposed, text, user:user_master(full_name)")
        .eq("point_id", pointId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("meet_activity_log")
        .select("id, created_at, action, field, old_value, new_value, user:user_master(full_name)")
        .eq("entity_type", "point")
        .eq("entity_id", pointId)
        .order("created_at", { ascending: false })
        .limit(100),
      p.raised_by_id
        ? supabaseAdmin.from("user_master").select("full_name").eq("id", p.raised_by_id).maybeSingle()
        : Promise.resolve({ data: null } as any),
    ]);

    const history = (histRes.data || [])
      .map((h: any) => {
        const s = one(h.session);
        return {
          session_id: h.session_id,
          date: s?.scheduled_start || "",
          code: s?.code || null,
          entry_type: h.entry_type,
          status_at_start: h.status_at_start || null,
          status_at_end: h.status_at_end || null,
          notes: h.discussion_notes || null,
        };
      })
      .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));

    const isOrgOrChair = meeting?.organizer_id === userId || meeting?.chair_id === userId;
    const canEdit = !!(auth.isSuperAdmin || auth.isMeetAdmin || isOrgOrChair || p.owner_id === userId);

    return {
      point: { ...p, raised_by_name: (raisedByRes as any)?.data?.full_name || null },
      meeting: meeting && !meeting.is_deleted ? { id: meeting.id, title: meeting.title, code: meeting.code || null } : null,
      siblings: (siblingsRes.data || []).map(toRow),
      tasks: tasksRes.data || [],
      history,
      updates: (updRes.data || []).map((u: any) => ({ id: u.id, at: u.created_at, by: one(u.user)?.full_name || null, progress: u.progress_proposed ?? null, text: u.text || null })),
      activity: (actRes.data || []).map((a: any) => ({ id: a.id, at: a.created_at, by: one(a.user)?.full_name || null, action: a.action, field: a.field || null, old_value: a.old_value ?? null, new_value: a.new_value ?? null })),
      canEdit,
    };
  } catch (err) {
    console.error("[getPointDetail]", err);
    return null;
  }
}

/**
 * Move a point's due date. A reason is required every time (Zoho-style "Reason for update");
 * it is kept in the activity log and shows on the point's timeline.
 */
export async function changePointDueDate(input: { pointId: string; newDueDate: string; reason: string }): Promise<{ success: boolean; error?: string }> {
  const reason = String(input.reason || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.newDueDate || ""))) return { success: false, error: "Pick a valid date." };
  if (reason.length < 3) return { success: false, error: "Please give a reason for the new date." };

  const auth = await requireMeet("MEET_POINT_MANAGE", { pointId: input.pointId });
  const userId = auth.userId;
  try {
    const { data: p } = await supabaseAdmin
      .from("meet_points")
      .select("id, due_date, owner_id, meeting:meet_meetings(organizer_id, chair_id)")
      .eq("id", input.pointId)
      .maybeSingle();
    if (!p) return { success: false, error: "Point not found." };
    const m = one((p as any).meeting);
    const allowed = auth.isSuperAdmin || auth.isMeetAdmin || p.owner_id === userId || m?.organizer_id === userId || m?.chair_id === userId;
    if (!allowed) return { success: false, error: "Only the owner, organiser or chair can change the due date." };

    const old = p.due_date ? String(p.due_date).slice(0, 10) : null;
    if (old === input.newDueDate) return { success: false, error: "That is already the due date." };

    const { error } = await supabaseAdmin
      .from("meet_points")
      .update({ due_date: input.newDueDate, updated_at: new Date().toISOString() })
      .eq("id", input.pointId);
    if (error) return { success: false, error: error.message };

    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "point",
      entity_id: input.pointId,
      action: "due_date_changed",
      field: "due_date",
      old_value: old,
      new_value: `${input.newDueDate} · Reason: ${reason.slice(0, 500)}`,
      user_id: userId,
      channel: "web",
    });

    revalidatePath(`/meet/points/${input.pointId}`);
    return { success: true };
  } catch (err: any) {
    console.error("[changePointDueDate]", err);
    return { success: false, error: err?.message || "Could not change the date." };
  }
}

/**
 * Owner sends a short update for the next meeting (the link in the "update needed" email).
 * Saved as a pre-meeting update on the point's next scheduled session; it shows in the point's
 * history and on the meeting dashboard.
 */
export async function sendPointUpdate(input: { pointId: string; text: string; progress?: number }): Promise<{ success: boolean; error?: string }> {
  const auth = await requireMeet("MEET_VIEW", { pointId: input.pointId });
  const text = String(input.text || "").trim().slice(0, 2000);
  if (!text) return { success: false, error: "Write a short update first." };
  try {
    const { data: p } = await supabaseAdmin.from("meet_points").select("id, meeting_id, status").eq("id", input.pointId).eq("is_deleted", false).maybeSingle();
    if (!p) return { success: false, error: "Point not found." };
    const { data: next } = await supabaseAdmin
      .from("meet_sessions")
      .select("id")
      .eq("meeting_id", p.meeting_id)
      .eq("is_deleted", false)
      .in("status", ["scheduled", "in_progress"])
      .gte("scheduled_start", new Date(Date.now() - 6 * 3600000).toISOString())
      .order("scheduled_start", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!next) return { success: false, error: "This meeting has nothing scheduled, so there's no next meeting to send the update to." };

    const progress = input.progress === undefined ? null : Math.min(Math.max(Math.round(Number(input.progress) || 0), 0), 100);
    const { error } = await supabaseAdmin.from("meet_pre_updates").insert({
      session_id: next.id,
      point_id: p.id,
      user_id: auth.userId,
      progress_proposed: progress,
      status_proposed: p.status,
      text,
      channel: "web",
    });
    if (error) return { success: false, error: error.message };
    revalidatePath(`/meet/points/${p.id}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Couldn't send the update." };
  }
}
