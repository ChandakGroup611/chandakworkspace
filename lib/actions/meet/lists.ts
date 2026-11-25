"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";
import { getMyMeetScope, getHiddenConfidentialMeetingIds } from "@/lib/utils/meet-scope";

/**
 * Dedicated list pages (Points, Tasks, Minutes) with filters. Each row opens its own detail page.
 * "show" decides whose records: mine (I own them), meetings (meetings I'm part of), all (admins).
 */

export type ShowScope = "mine" | "meetings" | "all";
export interface Opt { id: string; label: string }

const IST = "Asia/Kolkata";
const ymd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const addDays = (n: number) => ymd(new Date(Date.now() + n * 86400000));
const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const clean = (s?: string) => String(s || "").trim().replace(/[%,()]/g, " ").slice(0, 80);
const isUuid = (s?: string) => !!s && /^[0-9a-f-]{36}$/i.test(s);

async function scopeFor(show: ShowScope | undefined) {
  const auth = await requireMeet("MEET_VIEW");
  const isAdmin = auth.isSuperAdmin || auth.isMeetAdmin;
  const eff: ShowScope = show === "all" && isAdmin ? "all" : show === "mine" ? "mine" : show === "all" ? "meetings" : show || (isAdmin ? "all" : "meetings");
  const [{ meetingIds }, hidden] = await Promise.all([getMyMeetScope(auth.userId), getHiddenConfidentialMeetingIds(auth.userId, isAdmin)]);
  return { auth, isAdmin, show: eff, meetingIds, hidden };
}

async function meetingOptions(ids: string[] | null): Promise<Opt[]> {
  let q = supabaseAdmin.from("meet_meetings").select("id, code, title").eq("is_deleted", false).order("title").limit(400);
  if (ids) {
    if (!ids.length) return [];
    q = q.in("id", ids.slice(0, 400));
  }
  const { data } = await q;
  return (data || []).map((m: any) => ({ id: m.id, label: `${m.code ? m.code + " · " : ""}${m.title}` }));
}

async function userOptions(): Promise<Opt[]> {
  const { data } = await supabaseAdmin.from("user_master").select("id, full_name").eq("is_deleted", false).eq("is_active", true).order("full_name").limit(1000);
  return (data || []).map((u: any) => ({ id: u.id, label: u.full_name || "—" }));
}

/* ------------------------------------------------------------------ Points */

export interface PointListFilters {
  show?: ShowScope;
  status?: string; // open_any | open | in_progress | on_hold | closed | dropped | all
  meeting?: string;
  owner?: string;
  priority?: string;
  due?: string; // overdue | week | month | none
  carried?: string; // 1 | 3
  q?: string;
}

export interface PointListRow {
  id: string;
  code: string;
  title: string;
  status: string;
  priority: string;
  progress: number;
  due_date: string | null;
  carry_forward_count: number;
  owner_name: string | null;
  meeting_id: string;
  meeting_title: string;
  meeting_code: string | null;
  open_tasks: number;
  point_type: string | null;
}

export async function listPoints(f: PointListFilters) {
  const { auth, isAdmin, show, meetingIds, hidden } = await scopeFor(f.show);
  const userId = auth.userId;
  const empty = { rows: [] as PointListRow[], show, isAdmin, meetings: [] as Opt[], owners: [] as Opt[], total: 0, summary: { open: 0, overdue: 0, carried: 0, closed: 0 } };
  try {
    let q = supabaseAdmin
      .from("meet_points")
      .select(
        `id, code, title, status, priority, progress_percent, due_date, carry_forward_count, owner_id, meeting_id, point_type,
         owner:user_master!meet_points_owner_id_fkey(id, full_name),
         meeting:meet_meetings(id, title, code, is_deleted)`,
        { count: "exact" }
      )
      .eq("is_deleted", false);

    if (show === "mine") q = q.eq("owner_id", userId);
    else if (show === "meetings") {
      if (!meetingIds.size) return empty;
      q = q.in("meeting_id", Array.from(meetingIds));
    }

    const st = f.status || "open_any";
    if (st === "open_any") q = q.not("status", "in", '("closed","dropped")');
    else if (st !== "all") q = q.eq("status", st);
    if (isUuid(f.meeting)) q = q.eq("meeting_id", f.meeting!);
    if (f.owner === "none") q = q.is("owner_id", null);
    else if (isUuid(f.owner)) q = q.eq("owner_id", f.owner!);
    if (f.priority && ["low", "medium", "high", "critical"].includes(f.priority)) q = q.eq("priority", f.priority);
    const today = ymd(new Date());
    if (f.due === "overdue") q = q.lt("due_date", today).not("status", "in", '("closed","dropped")');
    else if (f.due === "week") q = q.gte("due_date", today).lte("due_date", addDays(7));
    else if (f.due === "month") q = q.gte("due_date", today).lte("due_date", addDays(30));
    else if (f.due === "none") q = q.is("due_date", null);
    if (f.carried === "1") q = q.gte("carry_forward_count", 1);
    if (f.carried === "3") q = q.gte("carry_forward_count", 3);
    const s = clean(f.q);
    if (s) q = q.or(`title.ilike.%${s}%,code.ilike.%${s}%`);

    q = q.order("due_date", { ascending: st !== "closed", nullsFirst: false }).limit(500);
    const { data, count, error } = await q;
    if (error) return { ...empty, error: error.message };

    const visible = (data || []).filter((p: any) => {
      const m = one(p.meeting);
      if (m?.is_deleted) return false;
      return p.owner_id === userId || !hidden.has(p.meeting_id);
    });
    const ids = visible.map((p: any) => p.id);
    const openTasks = new Map<string, number>();
    if (ids.length) {
      const { data: t } = await supabaseAdmin
        .from("meet_tasks")
        .select("point_id")
        .in("point_id", ids.slice(0, 500))
        .eq("is_deleted", false)
        .not("status", "in", '("completed","cancelled")');
      for (const r of t || []) openTasks.set((r as any).point_id, (openTasks.get((r as any).point_id) || 0) + 1);
    }

    const rows: PointListRow[] = visible.map((p: any) => {
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
        owner_name: o?.full_name || null,
        meeting_id: p.meeting_id,
        meeting_title: m?.title || "Meeting",
        meeting_code: m?.code || null,
        open_tasks: openTasks.get(p.id) || 0,
        point_type: p.point_type || null,
      };
    });

    const summary = {
      open: rows.filter((r) => r.status !== "closed" && r.status !== "dropped").length,
      overdue: rows.filter((r) => r.status !== "closed" && r.status !== "dropped" && r.due_date && r.due_date < today).length,
      carried: rows.filter((r) => r.carry_forward_count >= 3 && r.status !== "closed" && r.status !== "dropped").length,
      closed: rows.filter((r) => r.status === "closed" || r.status === "dropped").length,
    };

    const [meetings, owners] = await Promise.all([meetingOptions(show === "all" ? null : Array.from(meetingIds)), userOptions()]);
    return { rows, show, isAdmin, meetings, owners, total: count ?? rows.length, summary };
  } catch (err: any) {
    console.error("[listPoints]", err);
    return { ...empty, error: err?.message || "Couldn't load points." };
  }
}

/* ------------------------------------------------------------------- Tasks */

export interface TaskListFilters {
  show?: ShowScope;
  status?: string; // open_any | not_started | in_progress | on_hold | completed | cancelled | all
  meeting?: string;
  owner?: string;
  priority?: string;
  due?: string; // overdue | soon | week | month
  q?: string;
}

export async function listTasks(f: TaskListFilters) {
  const { auth, isAdmin, show, meetingIds, hidden } = await scopeFor(f.show);
  const userId = auth.userId;
  const empty = { tasks: [] as any[], show, isAdmin, meetings: [] as Opt[], owners: [] as Opt[] };
  try {
    let q = supabaseAdmin
      .from("meet_tasks")
      .select(`
        *,
        owner:user_master!meet_tasks_owner_id_fkey(id, full_name, email, profile_photo),
        checklist:meet_task_checklist(*),
        point:meet_points(id, code, title, is_deleted, meeting_id, meeting:meet_meetings(id, code, title, is_deleted))
      `)
      .eq("is_deleted", false);

    if (show === "mine") q = q.eq("owner_id", userId);
    else if (show === "meetings") {
      if (!meetingIds.size) return empty;
      const { data: pts } = await supabaseAdmin.from("meet_points").select("id").in("meeting_id", Array.from(meetingIds)).eq("is_deleted", false).limit(5000);
      const pids = (pts || []).map((p: any) => p.id);
      if (!pids.length) q = q.eq("owner_id", userId);
      else q = q.or(`owner_id.eq.${userId},point_id.in.(${pids.slice(0, 1500).join(",")})`);
    }
    if (isUuid(f.meeting)) {
      const { data: pts } = await supabaseAdmin.from("meet_points").select("id").eq("meeting_id", f.meeting!).eq("is_deleted", false);
      const pids = (pts || []).map((p: any) => p.id);
      if (!pids.length) return { ...empty, meetings: await meetingOptions(show === "all" ? null : Array.from(meetingIds)), owners: await userOptions() };
      q = q.in("point_id", pids);
    }
    const st = f.status || "open_any";
    if (st === "open_any") q = q.not("status", "in", '("completed","cancelled")');
    else if (st !== "all") q = q.eq("status", st);
    if (f.owner === "none") q = q.is("owner_id", null);
    else if (isUuid(f.owner)) q = q.eq("owner_id", f.owner!);
    if (f.priority && ["low", "medium", "high", "critical"].includes(f.priority)) q = q.eq("priority", f.priority);
    const s = clean(f.q);
    if (s) q = q.or(`title.ilike.%${s}%,code.ilike.%${s}%`);
    q = q.order("due_date", { ascending: true }).limit(500);

    const { data, error } = await q;
    if (error) return { ...empty, error: error.message };

    const today = ymd(new Date());
    let tasks = (data || []).filter((t: any) => {
      const pt = one(t.point);
      const m = one(pt?.meeting);
      if (pt?.is_deleted || m?.is_deleted) return false;
      return t.owner_id === userId || !hidden.has(pt?.meeting_id);
    });
    const eff = (t: any) => String(t.revised_due_date || t.due_date || "");
    const open = (t: any) => t.status !== "completed" && t.status !== "cancelled";
    if (f.due === "overdue") tasks = tasks.filter((t: any) => open(t) && eff(t) && eff(t) < today);
    if (f.due === "soon") tasks = tasks.filter((t: any) => open(t) && eff(t) >= today && eff(t) <= addDays(2));
    if (f.due === "week") tasks = tasks.filter((t: any) => eff(t) >= today && eff(t) <= addDays(7));
    if (f.due === "month") tasks = tasks.filter((t: any) => eff(t) >= today && eff(t) <= addDays(30));

    const [meetings, owners] = await Promise.all([meetingOptions(show === "all" ? null : Array.from(meetingIds)), userOptions()]);
    return { tasks, show, isAdmin, meetings, owners };
  } catch (err: any) {
    console.error("[listTasks]", err);
    return { ...empty, error: err?.message || "Couldn't load tasks." };
  }
}

/* ----------------------------------------------------------------- Minutes */

export interface MinutesListFilters {
  show?: ShowScope;
  state?: string; // all | draft | sent | missing
  meeting?: string;
  from?: string;
  to?: string;
  q?: string;
}

export interface MinutesRow {
  session_id: string;
  session_code: string | null;
  meeting_id: string;
  meeting_title: string;
  meeting_code: string | null;
  organiser: string | null;
  date: string;
  status: string;
  state: "draft" | "sent" | "missing";
  points: number;
  tasks: number;
  decisions: number;
  overview: string | null;
  sent_at: string | null;
}

const ENDED = ["completed", "mom_draft", "mom_pending_approval", "mom_published", "published"];

export async function listMinutes(f: MinutesListFilters) {
  const { auth, isAdmin, show, meetingIds, hidden } = await scopeFor(f.show === "mine" ? "meetings" : f.show);
  const empty = { rows: [] as MinutesRow[], show, isAdmin, meetings: [] as Opt[], counts: { draft: 0, sent: 0, missing: 0 } };
  try {
    let q = supabaseAdmin
      .from("meet_sessions")
      .select("id, code, scheduled_start, status, actual_end, updated_at, mom_published_at, meeting_id, meeting:meet_meetings(id, title, code, is_deleted, organizer:user_master!meet_meetings_organizer_id_fkey(full_name))")
      .eq("is_deleted", false)
      .in("status", ENDED);
    if (show !== "all") {
      const { sessionIds } = await getMyMeetScope(auth.userId);
      const parts: string[] = [];
      if (meetingIds.size) parts.push(`meeting_id.in.(${Array.from(meetingIds).join(",")})`);
      if (sessionIds.size) parts.push(`id.in.(${Array.from(sessionIds).slice(0, 800).join(",")})`);
      if (!parts.length) return empty;
      q = q.or(parts.join(","));
    }
    if (isUuid(f.meeting)) q = q.eq("meeting_id", f.meeting!);
    if (f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from)) q = q.gte("scheduled_start", `${f.from}T00:00:00+05:30`);
    if (f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to)) q = q.lte("scheduled_start", `${f.to}T23:59:59+05:30`);
    const s = clean(f.q);
    if (s) {
      const { data: hits } = await supabaseAdmin.from("meet_meetings").select("id").eq("is_deleted", false).or(`title.ilike.%${s}%,code.ilike.%${s}%`).limit(200);
      const ids = (hits || []).map((h: any) => h.id);
      if (!ids.length) return { ...empty, meetings: await meetingOptions(show === "all" ? null : Array.from(meetingIds)) };
      q = q.in("meeting_id", ids);
    }
    q = q.order("scheduled_start", { ascending: false }).limit(300);
    const { data, error } = await q;
    if (error) return { ...empty, error: error.message };

    const sessions = (data || []).filter((x: any) => !one(x.meeting)?.is_deleted && !hidden.has(x.meeting_id));
    const ids = sessions.map((x: any) => x.id);
    const [ptsRes, tasksRes, decRes, aiRes] = ids.length
      ? await Promise.all([
          supabaseAdmin.from("meet_session_points").select("session_id").in("session_id", ids),
          supabaseAdmin.from("meet_tasks").select("session_id").in("session_id", ids).eq("is_deleted", false),
          supabaseAdmin.from("meet_decisions").select("session_id").in("session_id", ids),
          supabaseAdmin.from("meet_ai_minutes").select("session_id, overview, created_at").in("session_id", ids).order("created_at", { ascending: false }),
        ])
      : ([{ data: [] }, { data: [] }, { data: [] }, { data: [] }] as any[]);
    const tally = (rows: any[] | null) => {
      const m = new Map<string, number>();
      for (const r of rows || []) m.set(r.session_id, (m.get(r.session_id) || 0) + 1);
      return m;
    };
    const pts = tally(ptsRes.data), tks = tally(tasksRes.data), decs = tally(decRes.data);
    const ai = new Map<string, string>();
    for (const r of (aiRes.data || []) as any[]) if (!ai.has(r.session_id)) ai.set(r.session_id, r.overview || "");

    let rows: MinutesRow[] = sessions.map((x: any) => {
      const m = one(x.meeting);
      const published = x.status === "mom_published" || x.status === "published";
      const state: MinutesRow["state"] = published ? "sent" : ai.has(x.id) || x.status === "mom_draft" || x.status === "mom_pending_approval" ? "draft" : "missing";
      return {
        session_id: x.id,
        session_code: x.code || null,
        meeting_id: x.meeting_id,
        meeting_title: m?.title || "Meeting",
        meeting_code: m?.code || null,
        organiser: one(m?.organizer)?.full_name || null,
        date: x.scheduled_start,
        status: x.status,
        state,
        points: pts.get(x.id) || 0,
        tasks: tks.get(x.id) || 0,
        decisions: decs.get(x.id) || 0,
        overview: ai.get(x.id) || null,
        sent_at: published ? x.mom_published_at || x.updated_at || null : null,
      };
    });
    const counts = {
      draft: rows.filter((r) => r.state === "draft").length,
      sent: rows.filter((r) => r.state === "sent").length,
      missing: rows.filter((r) => r.state === "missing").length,
    };
    if (f.state === "draft" || f.state === "sent" || f.state === "missing") rows = rows.filter((r) => r.state === f.state);

    return { rows, show, isAdmin, meetings: await meetingOptions(show === "all" ? null : Array.from(meetingIds)), counts };
  } catch (err: any) {
    console.error("[listMinutes]", err);
    return { ...empty, error: err?.message || "Couldn't load minutes." };
  }
}
