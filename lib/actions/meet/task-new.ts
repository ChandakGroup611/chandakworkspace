"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";
import { getMyMeetScope, getHiddenConfidentialMeetingIds } from "@/lib/utils/meet-scope";
import { createTask } from "@/lib/actions/meet/tasks";

/** "New task" page: a Chandak Meet task (meet_tasks), separate from Workspace tasks. */

const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export async function getNewTaskFormData(pointId?: string) {
  const auth = await requireMeet("MEET_VIEW");
  const isAdmin = auth.isSuperAdmin || auth.isMeetAdmin;
  const [{ meetingIds }, hidden] = await Promise.all([getMyMeetScope(auth.userId), getHiddenConfidentialMeetingIds(auth.userId, isAdmin)]);
  let mq = supabaseAdmin.from("meet_meetings").select("id, code, title").eq("is_deleted", false).neq("status", "archived").order("title").limit(400);
  if (!isAdmin) mq = meetingIds.size ? mq.in("id", Array.from(meetingIds)) : mq.eq("id", "00000000-0000-0000-0000-000000000000");
  const [{ data: meetings }, { data: people }, pointRes] = await Promise.all([
    mq,
    supabaseAdmin.from("user_master").select("id, full_name, email").eq("is_deleted", false).eq("is_active", true).order("full_name").limit(2000),
    pointId ? supabaseAdmin.from("meet_points").select("id, code, title, meeting_id, category:meet_point_categories(default_tat_days)").eq("id", pointId).maybeSingle() : Promise.resolve({ data: null } as any),
  ]);
  const p = (pointRes as any).data;
  return {
    meetings: ((meetings || []) as any[]).filter((m) => !hidden.has(m.id)).map((m) => ({ id: m.id, label: `${m.code ? m.code + " · " : ""}${m.title}` })),
    people: ((people || []) as any[]).map((u) => ({ id: u.id, full_name: u.full_name || u.email || "—", email: u.email || null })),
    point: p ? { id: p.id, code: p.code, title: p.title, meetingId: p.meeting_id, defaultDays: one(p.category)?.default_tat_days || 3 } : null,
  };
}

export async function getOpenPointsForMeeting(meetingId: string) {
  await requireMeet("MEET_VIEW", { meetingId });
  const { data } = await supabaseAdmin
    .from("meet_points")
    .select("id, code, title")
    .eq("meeting_id", meetingId)
    .eq("is_deleted", false)
    .not("status", "in", '("closed","dropped")')
    .order("created_at", { ascending: false })
    .limit(200);
  return (data || []).map((p: any) => ({ id: p.id, label: `${p.code} ${p.title}` }));
}

export async function createMeetTask(input: {
  title: string;
  description?: string;
  meetingId?: string;
  pointId?: string;
  sessionId?: string;
  ownerId?: string;
  priority?: string;
  startDate?: string;
  days?: number;
  dueDate?: string;
  requiresVerification?: boolean;
  checklist?: string[];
}): Promise<{ success: boolean; error?: string; id?: string; code?: string }> {
  await requireMeet("MEET_VIEW");
  const title = String(input.title || "").trim().slice(0, 300);
  if (title.length < 3) return { success: false, error: "Write what has to be done." };
  // Use the point's current meeting date when the page wasn't opened from one
  let sessionId = input.sessionId;
  if (!sessionId && input.pointId) {
    const { data: p } = await supabaseAdmin.from("meet_points").select("current_session_id, origin_session_id").eq("id", input.pointId).maybeSingle();
    sessionId = (p as any)?.current_session_id || (p as any)?.origin_session_id || undefined;
  }
  const r: any = await createTask({
    point_id: input.pointId || null,
    session_id: sessionId,
    title,
    description: input.description?.trim() || undefined,
    owner_id: input.ownerId || undefined,
    priority: (["low", "medium", "high", "critical"].includes(String(input.priority)) ? input.priority : "medium") as any,
    tat_days: Math.min(90, Math.max(1, Math.round(Number(input.days) || 3))),
    start_date: input.startDate || undefined,
    due_date: input.dueDate || undefined,
    requires_verification: !!input.requiresVerification,
    checklist: (input.checklist || []).map((c) => c.trim()).filter(Boolean).slice(0, 50),
  });
  if (!r?.success) return { success: false, error: r?.error || "Couldn't create the task." };
  return { success: true, id: r.task?.id, code: r.task?.code };
}
