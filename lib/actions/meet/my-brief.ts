"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";

/**
 * "Your brief" for a meeting: the signed-in person's own open points and tasks in this meeting,
 * what was decided last time, and a link to the last minutes. Shown when joining, for reference.
 */

const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export interface MyBrief {
  meetingId: string;
  points: { id: string; code: string; title: string; status: string; due: string | null; overdue: boolean; carried: number }[];
  tasks: { id: string; code: string; title: string; status: string; due: string | null; overdue: boolean }[];
  lastDecisions: { id: string; code: string; text: string }[];
  lastMinutes: { sessionId: string; date: string } | null;
  myReply: string | null;
  /** Summary written for the last meeting of this series */
  lastSummary: string | null;
  /** Decisions of this meeting series that are still in force */
  activeDecisions: { id: string; code: string; text: string }[];
  /** All open points in this meeting, anyone's */
  meetingOpenPoints: number;
}

export async function getMyBrief(sessionId: string): Promise<MyBrief | null> {
  const auth = await requireMeet("MEET_VIEW", { sessionId });
  const me = auth.userId;
  const { data: s } = await supabaseAdmin.from("meet_sessions").select("id, meeting_id, scheduled_start").eq("id", sessionId).maybeSingle();
  if (!s) return null;
  const t = today();

  const [ptsRes, prevRes, replyRes] = await Promise.all([
    supabaseAdmin
      .from("meet_points")
      .select("id, code, title, status, due_date, carry_forward_count")
      .eq("meeting_id", s.meeting_id)
      .eq("owner_id", me)
      .eq("is_deleted", false)
      .not("status", "in", '("closed","dropped")')
      .order("due_date", { ascending: true })
      .limit(30),
    supabaseAdmin
      .from("meet_sessions")
      .select("id, scheduled_start, status, summary_notes")
      .eq("meeting_id", s.meeting_id)
      .eq("is_deleted", false)
      .lt("scheduled_start", s.scheduled_start)
      .not("status", "in", "(scheduled,cancelled)")
      .order("scheduled_start", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin.from("meet_session_attendees").select("invite_status").eq("session_id", sessionId).eq("user_id", me).maybeSingle(),
  ]);

  const { data: meetingPoints } = await supabaseAdmin.from("meet_points").select("id").eq("meeting_id", s.meeting_id).eq("is_deleted", false).limit(3000);
  const pids = (meetingPoints || []).map((p: any) => p.id);
  const { data: tasks } = pids.length
    ? await supabaseAdmin
        .from("meet_tasks")
        .select("id, code, title, status, due_date, revised_due_date")
        .eq("owner_id", me)
        .eq("is_deleted", false)
        .in("point_id", pids.slice(0, 1500))
        .not("status", "in", '("completed","cancelled")')
        .order("due_date", { ascending: true })
        .limit(30)
    : { data: [] as any[] };

  const prev = prevRes.data as any;
  const { data: decs } = prev
    ? await supabaseAdmin.from("meet_decisions").select("id, code, text").eq("session_id", prev.id).eq("status", "active").limit(5)
    : { data: [] as any[] };

  const seriesSessionIds = await supabaseAdmin.from("meet_sessions").select("id").eq("meeting_id", s.meeting_id).eq("is_deleted", false).limit(500);
  const sids = ((seriesSessionIds.data || []) as any[]).map((x) => x.id);
  const [{ data: activeDecs }, openCount] = await Promise.all([
    sids.length
      ? supabaseAdmin.from("meet_decisions").select("id, code, text").in("session_id", sids).eq("status", "active").order("decided_at", { ascending: false }).limit(8)
      : Promise.resolve({ data: [] as any[] } as any),
    supabaseAdmin.from("meet_points").select("id", { count: "exact", head: true }).eq("meeting_id", s.meeting_id).eq("is_deleted", false).not("status", "in", '("closed","dropped")'),
  ]);

  return {
    lastSummary: prev?.summary_notes ? String(prev.summary_notes).slice(0, 1200) : null,
    activeDecisions: ((activeDecs || []) as any[]).map((d) => ({ id: d.id, code: d.code, text: d.text })),
    meetingOpenPoints: (openCount as any).count || 0,
    meetingId: s.meeting_id,
    points: ((ptsRes.data || []) as any[]).map((p) => ({ id: p.id, code: p.code, title: p.title, status: p.status, due: p.due_date || null, overdue: !!p.due_date && p.due_date < t, carried: Number(p.carry_forward_count) || 0 })),
    tasks: ((tasks || []) as any[]).map((x) => {
      const due = x.revised_due_date || x.due_date || null;
      return { id: x.id, code: x.code, title: x.title, status: x.status, due, overdue: !!due && due < t };
    }),
    lastDecisions: ((decs || []) as any[]).map((d) => ({ id: d.id, code: d.code, text: d.text })),
    lastMinutes: prev ? { sessionId: prev.id, date: prev.scheduled_start } : null,
    myReply: (replyRes.data as any)?.invite_status || null,
  };
}
