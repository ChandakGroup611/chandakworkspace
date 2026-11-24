"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";
import { isActionLikeText } from "@/lib/utils/meet-notes";
import type { MeetAIMinutes } from "@/types/meet";

/**
 * AI minutes review (Chandak Meet redesign, stage 5).
 * Builds the review screen from what already exists: the drafted minutes (meet_ai_minutes),
 * the session's points / tasks / decisions, and the shared meeting notes. Note lines that look
 * like an action or a decision and aren't linked yet become suggestions the minute taker can
 * Accept (convertBlockToItem), Edit or Discard (marks the note line "not an action").
 */

const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);

const DECISION_RE = /\b(decided|agreed|approved|finali[sz]ed|resolved that|we keep|will remain|no change|tay hua|final hai)\b/i;

export interface ReviewSuggestion {
  blockId: string;
  text: string;
  author: string | null;
  kind: "task" | "decision" | "point";
  pointId: string | null;
  ownerId: string | null;
  ownerName: string | null;
  tatDays: number;
}

export interface MinutesReview {
  session: {
    id: string;
    code: string | null;
    status: string;
    scheduledStart: string;
    meetingId: string | null;
    meetingTitle: string;
    meetingCode: string | null;
  };
  canEdit: boolean;
  canApprove: boolean;
  minutes: MeetAIMinutes | null;
  counts: { points: number; tasks: number; decisions: number; noteLines: number; present: number; invited: number };
  suggestions: ReviewSuggestion[];
  points: { id: string; code: string; title: string; status: string; carried: boolean; owner: string | null }[];
  people: { id: string; name: string }[];
  nextSession: { id: string; scheduledStart: string } | null;
  /** The minutes as a readable document */
  doc: MinutesDoc;
}

export interface MinutesDoc {
  info: {
    date: string;
    start: string;
    end: string | null;
    durationMin: number;
    where: string;
    type: string | null;
    organiser: string | null;
    chair: string | null;
    minuteTaker: string | null;
    project: string | null;
  };
  totals: { durationMin: number; present: number; invited: number; points: number; newPoints: number; carriedIn: number; tasks: number; decisions: number; closed: number };
  attendance: { name: string; status: string; reason: string | null; joinedAt: string | null; note: string | null }[];
  decisions: { id: string; code: string; text: string; by: string | null; point: string | null }[];
  tasks: { id: string; code: string; title: string; owner: string | null; due: string | null; status: string; point: string | null }[];
  byPerson: { name: string; points: { code: string; title: string; status: string; due: string | null }[]; tasks: { code: string; title: string; due: string | null; status: string }[] }[];
  closedRemarks: string | null;
}

export async function getMinutesReview(sessionId: string): Promise<MinutesReview | null> {
  const auth = await requireMeet("MEET_VIEW", { sessionId });
  const userId = auth.userId;

  const { data: s } = await supabaseAdmin
    .from("meet_sessions")
    .select("id, code, status, scheduled_start, scheduled_end, actual_start, actual_end, summary_notes, video_link, minute_taker_id, meeting_id, room:meet_rooms(name), meeting:meet_meetings(id, title, code, organizer_id, chair_id, default_minute_taker_id, mode, video_link, meeting_type:meet_meeting_types(name))")
    .eq("id", sessionId)
    .eq("is_deleted", false)
    .maybeSingle();
  if (!s) return null;
  const m = one((s as any).meeting);

  const [minRes, spRes, taskRes, decRes, notesRes, attRes, nextRes] = await Promise.all([
    supabaseAdmin.from("meet_ai_minutes").select("*").eq("session_id", sessionId).order("version", { ascending: false }).limit(1).maybeSingle(),
    supabaseAdmin
      .from("meet_session_points")
      .select("entry_type, status_at_end, point:meet_points(id, code, title, status, due_date, owner:user_master!meet_points_owner_id_fkey(full_name))")
      .eq("session_id", sessionId),
    supabaseAdmin
      .from("meet_tasks")
      .select("id, code, title, status, due_date, revised_due_date, owner:user_master!meet_tasks_owner_id_fkey(full_name), point:meet_points(code)")
      .eq("session_id", sessionId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true }),
    supabaseAdmin.from("meet_decisions").select("id, code, text, decided_by, point:meet_points(code)").eq("session_id", sessionId).order("decided_at", { ascending: true }),
    supabaseAdmin
      .from("meet_notes")
      .select("blocks:meet_note_blocks(id, position, type, text, done, point_id, linked_id, not_action, deleted_at, author:user_master(full_name))")
      .eq("session_id", sessionId)
      .eq("kind", "session")
      .maybeSingle(),
    supabaseAdmin
      .from("meet_session_attendees")
      .select("user_id, guest_name, attendance, invite_status, check_in_at, late_minutes, marked_by, role, user:user_master!meet_session_attendees_user_id_fkey(id, full_name)")
      .eq("session_id", sessionId)
      .not("role", "in", '("requested","denied")'),
    m?.id
      ? supabaseAdmin
          .from("meet_sessions")
          .select("id, scheduled_start")
          .eq("meeting_id", m.id)
          .eq("is_deleted", false)
          .eq("status", "scheduled")
          .gt("scheduled_start", (s as any).scheduled_start)
          .order("scheduled_start", { ascending: true })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null } as any),
  ]);

  const people = (attRes.data || [])
    .map((a: any) => one(a.user))
    .filter(Boolean)
    .map((u: any) => ({ id: u.id, name: u.full_name || "Someone" }));

  const points = (spRes.data || [])
    .map((r: any) => {
      const p = one(r.point);
      if (!p) return null;
      const status = r.status_at_end || p.status;
      return {
        id: p.id,
        code: p.code,
        title: p.title,
        status,
        carried: status !== "closed" && status !== "dropped",
        owner: one(p.owner)?.full_name || null,
      };
    })
    .filter(Boolean) as MinutesReview["points"];

  const blocks: any[] = ((notesRes.data as any)?.blocks || []).filter((b: any) => !b.deleted_at);

  // "@Rohit" or a full name in the line picks the owner; "3d" / "3 days" picks the TAT
  const findOwner = (text: string) => {
    const lower = text.toLowerCase();
    for (const p of people) {
      const first = p.name.split(/\s+/)[0]?.toLowerCase();
      if (!first) continue;
      if (lower.includes(`@${first}`) || lower.includes(p.name.toLowerCase())) return p;
    }
    return null;
  };

  const suggestions: ReviewSuggestion[] = blocks
    .filter((b) => !b.linked_id && !b.not_action && !b.done && b.type !== "heading")
    .filter((b) => b.type === "todo" || isActionLikeText(b.text) || DECISION_RE.test(b.text))
    .sort((a, b) => a.position - b.position)
    .slice(0, 40)
    .map((b) => {
      const owner = findOwner(b.text);
      const tat = Number((b.text.match(/\b(\d{1,2})\s*(d|days?|din)\b/i) || [])[1]) || 3;
      const kind: ReviewSuggestion["kind"] = DECISION_RE.test(b.text) && b.type !== "todo" ? "decision" : "task";
      return {
        blockId: b.id,
        text: String(b.text).trim(),
        author: one(b.author)?.full_name || null,
        kind,
        pointId: b.point_id || points[0]?.id || null,
        ownerId: owner?.id || null,
        ownerName: owner?.name || null,
        tatDays: Math.min(Math.max(tat, 1), 60),
      };
    });

  const isAdmin = auth.isSuperAdmin || auth.isMeetAdmin;
  const isOrgOrChair = m?.organizer_id === userId || m?.chair_id === userId;
  const isMinuteTaker = (s as any).minute_taker_id === userId || m?.default_minute_taker_id === userId;

  const att = attRes.data || [];
  const doc = await buildDoc(s, m, spRes.data || [], taskRes.data || [], decRes.data || [], att);
  return {
    doc,
    session: {
      id: s.id,
      code: (s as any).code || null,
      status: (s as any).status,
      scheduledStart: (s as any).scheduled_start,
      meetingId: m?.id || null,
      meetingTitle: m?.title || "Meeting",
      meetingCode: m?.code || null,
    },
    canEdit: isAdmin || isOrgOrChair || isMinuteTaker,
    canApprove: isAdmin || isOrgOrChair,
    minutes: (minRes.data as MeetAIMinutes) || null,
    counts: {
      points: points.length,
      tasks: (taskRes.data || []).length,
      decisions: (decRes.data || []).length,
      noteLines: blocks.length,
      present: att.filter((a: any) => a.check_in_at || a.attendance === "present" || a.attendance === "late").length,
      invited: att.length,
    },
    suggestions,
    points,
    people,
    nextSession: (nextRes as any)?.data ? { id: (nextRes as any).data.id, scheduledStart: (nextRes as any).data.scheduled_start } : null,
  };
}

const IST = "Asia/Kolkata";
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit" });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { timeZone: IST, weekday: "long", day: "numeric", month: "long", year: "numeric" });

async function buildDoc(s: any, m: any, sps: any[], tasks: any[], decs: any[], att: any[]): Promise<MinutesDoc> {
  const start = s.actual_start || s.scheduled_start;
  const end = s.actual_end || s.scheduled_end || null;
  const durationMin = end ? Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)) : 0;
  const ids = [m?.organizer_id, m?.chair_id, s.minute_taker_id || m?.default_minute_taker_id].filter(Boolean) as string[];
  const [{ data: users }, { data: inv }, projRow] = await Promise.all([
    ids.length ? supabaseAdmin.from("user_master").select("id, full_name").in("id", ids) : Promise.resolve({ data: [] as any[] }),
    supabaseAdmin.from("meet_invitations").select("user_id, note").eq("session_id", s.id),
    m?.id ? supabaseAdmin.from("core_module_settings").select("value_json").eq("module_key", "meet").eq("key", `meeting_project:${m.id}`).maybeSingle() : Promise.resolve({ data: null } as any),
  ]);
  const name = (id?: string | null) => (id ? (users || []).find((u: any) => u.id === id)?.full_name || null : null);
  let project: string | null = null;
  const pid = (projRow as any)?.data?.value_json?.project_id;
  if (pid) {
    const { data: pl } = await supabaseAdmin.from("core_module_settings").select("value_json").eq("module_key", "meet").eq("key", "projects").maybeSingle();
    project = ((pl?.value_json as any)?.items || []).find((x: any) => x.id === pid)?.name || null;
  }
  const reasons = new Map(((inv || []) as any[]).map((i) => [i.user_id, i.note || null]));
  const room = one(s.room)?.name || null;
  const where = [room, s.video_link || m?.video_link ? "Microsoft Teams" : null].filter(Boolean).join(" + ") || (m?.mode === "in_person" ? "In person" : "Online");

  const attendance = att.map((a: any) => {
    const st = a.attendance === "late" ? "late" : a.invite_status === "declined" && !a.check_in_at ? "declined" : a.check_in_at || (a.marked_by && a.attendance === "present") ? "present" : a.attendance === "excused" ? "excused" : "absent";
    const early = a.check_in_at ? Math.round((new Date(start).getTime() - new Date(a.check_in_at).getTime()) / 60000) : 0;
    const note = st === "late" && a.late_minutes ? `${a.late_minutes} min late` : st === "present" && early > 0 ? `${early} min early` : st === "present" && a.check_in_at ? "on time" : null;
    return { name: one(a.user)?.full_name || a.guest_name || "Guest", status: st, reason: a.user_id ? reasons.get(a.user_id) || null : null, joinedAt: a.check_in_at ? fmtTime(a.check_in_at) : null, note };
  }).sort((a: any, b: any) => (a.status === "present" ? 0 : 1) - (b.status === "present" ? 0 : 1) || a.name.localeCompare(b.name));

  const pts = sps.map((r: any) => ({ r, p: one(r.point) })).filter((x) => x.p);
  const taskRows = tasks.map((t: any) => ({ id: t.id, code: t.code, title: t.title, owner: one(t.owner)?.full_name || null, due: t.revised_due_date || t.due_date || null, status: t.status, point: one(t.point)?.code || null }));

  const people = new Map<string, MinutesDoc["byPerson"][number]>();
  const get = (n: string) => { if (!people.has(n)) people.set(n, { name: n, points: [], tasks: [] }); return people.get(n)!; };
  for (const { r, p } of pts) get(one(p.owner)?.full_name || "No owner yet").points.push({ code: p.code, title: p.title, status: r.status_at_end || p.status, due: p.due_date || null });
  for (const t of taskRows) get(t.owner || "No owner yet").tasks.push({ code: t.code, title: t.title, due: t.due, status: t.status });
  const byPerson = Array.from(people.values()).sort((a, b) => (a.name === "No owner yet" ? 1 : 0) - (b.name === "No owner yet" ? 1 : 0) || b.tasks.length + b.points.length - (a.tasks.length + a.points.length));

  const closed = pts.filter(({ r, p }) => ["closed", "dropped"].includes(r.status_at_end || p.status)).length;
  return {
    info: {
      date: fmtDate(start),
      start: fmtTime(start),
      end: end ? fmtTime(end) : null,
      durationMin,
      where,
      type: one(m?.meeting_type)?.name || null,
      organiser: name(m?.organizer_id),
      chair: name(m?.chair_id),
      minuteTaker: name(s.minute_taker_id || m?.default_minute_taker_id),
      project,
    },
    totals: {
      durationMin,
      present: attendance.filter((a: any) => a.status === "present" || a.status === "late").length,
      invited: attendance.length,
      points: pts.length,
      newPoints: pts.filter(({ r }) => r.entry_type === "new").length,
      carriedIn: pts.filter(({ r }) => r.entry_type === "carried_forward").length,
      tasks: taskRows.length,
      decisions: decs.length,
      closed,
    },
    attendance,
    decisions: decs.map((d: any) => ({ id: d.id, code: d.code, text: d.text, by: d.decided_by || null, point: one(d.point)?.code || null })),
    tasks: taskRows,
    byPerson,
    closedRemarks: s.summary_notes || null,
  };
}
