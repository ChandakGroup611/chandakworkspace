"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";
import { getMyMeetScope } from "@/lib/utils/meet-scope";

/**
 * Data for the redesigned Meet home: only the signed-in user's own meetings and items.
 * Read-only. Uses the same tables as the existing dashboard (meet_sessions, meet_points, meet_tasks).
 */

export interface MeetHomeSession {
  id: string;
  code: string;
  scheduled_start: string;
  scheduled_end: string | null;
  status: string;
  video_link: string | null;
  room_name: string | null;
  meeting_id: string | null;
  meeting_title: string;
  meeting_code: string | null;
  recurrence: string | null;
  mode: string | null;
  invited: number;
  accepted: number;
  carried_points: number;
  i_am_organizer: boolean;
}

export interface MeetHomeNeed {
  kind: "approve_minutes" | "write_minutes" | "overdue_task" | "overdue_point";
  title: string;
  detail: string;
  href: string;
}

export interface MeetHomeData {
  userFirstName: string;
  todayLabel: string;
  next: MeetHomeSession | null;
  today: MeetHomeSession[];
  tomorrow: MeetHomeSession[];
  needs: MeetHomeNeed[];
  week: { meetings: number; openPoints: number; overdue: number; onTimePercent: number | null };
}

const IST = "Asia/Kolkata";

/** YYYY-MM-DD of a date in IST */
function istDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00+05:30`);
  d.setDate(d.getDate() + n);
  return istDay(d);
}

function daysLate(due: string, today: string): number {
  return Math.max(0, Math.round((new Date(`${today}T00:00:00Z`).getTime() - new Date(`${String(due).slice(0, 10)}T00:00:00Z`).getTime()) / 86400000));
}

function one<T = any>(v: any): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v ?? null;
}

const EMPTY = (name = ""): MeetHomeData => ({
  userFirstName: name,
  todayLabel: new Intl.DateTimeFormat("en-IN", { timeZone: IST, weekday: "long", day: "numeric", month: "long" }).format(new Date()),
  next: null,
  today: [],
  tomorrow: [],
  needs: [],
  week: { meetings: 0, openPoints: 0, overdue: 0, onTimePercent: null },
});

export async function getMeetHomeData(): Promise<MeetHomeData> {
  const auth = await requireMeet("MEET_VIEW");
  const userId = auth.userId;

  try {
    const { data: me } = await supabaseAdmin.from("user_master").select("full_name").eq("id", userId).maybeSingle();
    const firstName = String(me?.full_name || "").trim().split(/\s+/)[0] || "";
    const base = EMPTY(firstName);

    const { meetingIds, sessionIds } = await getMyMeetScope(userId);
    const scopeParts: string[] = [];
    if (meetingIds.size) scopeParts.push(`meeting_id.in.(${Array.from(meetingIds).join(",")})`);
    if (sessionIds.size) scopeParts.push(`id.in.(${Array.from(sessionIds).join(",")})`);
    const scope = scopeParts.join(",");

    const today = istDay(new Date());
    const tomorrow = addDays(today, 1);
    const dayAfter = addDays(today, 2);
    const nowIso = new Date().toISOString();

    // Monday of this week (IST)
    const dow = new Date(`${today}T12:00:00+05:30`).getDay() || 7;
    const monday = addDays(today, 1 - dow);
    const nextMonday = addDays(monday, 7);

    const sessionSelect = `
      id, code, scheduled_start, scheduled_end, status, video_link, minute_taker_id,
      room:meet_rooms(name),
      meeting:meet_meetings(id, title, code, recurrence, mode, video_link, organizer_id, chair_id)
    `;

    const [windowRes, nextRes, weekRes, myTasksRes, myPointsRes, doneTasksRes, momRes] = await Promise.all([
      scope
        ? supabaseAdmin
            .from("meet_sessions")
            .select(sessionSelect)
            .eq("is_deleted", false)
            .neq("status", "cancelled")
            .gte("scheduled_start", `${today}T00:00:00+05:30`)
            .lt("scheduled_start", `${dayAfter}T00:00:00+05:30`)
            .or(scope)
            .order("scheduled_start", { ascending: true })
            .limit(40)
        : Promise.resolve({ data: [] as any[] }),
      scope
        ? supabaseAdmin
            .from("meet_sessions")
            .select(sessionSelect)
            .eq("is_deleted", false)
            .in("status", ["scheduled", "in_progress"])
            .gte("scheduled_start", new Date(Date.now() - 3 * 3600000).toISOString())
            .or(scope)
            .order("scheduled_start", { ascending: true })
            .limit(5)
        : Promise.resolve({ data: [] as any[] }),
      scope
        ? supabaseAdmin
            .from("meet_sessions")
            .select("id", { count: "exact", head: true })
            .eq("is_deleted", false)
            .neq("status", "cancelled")
            .gte("scheduled_start", `${monday}T00:00:00+05:30`)
            .lt("scheduled_start", `${nextMonday}T00:00:00+05:30`)
            .or(scope)
        : Promise.resolve({ count: 0 } as any),
      supabaseAdmin
        .from("meet_tasks")
        .select("id, code, title, due_date, revised_due_date, status")
        .eq("owner_id", userId)
        .eq("is_deleted", false)
        .not("status", "in", '("completed","cancelled")')
        .order("due_date", { ascending: true })
        .limit(200),
      supabaseAdmin
        .from("meet_points")
        .select("id, code, title, due_date, status, meeting_id")
        .eq("owner_id", userId)
        .eq("is_deleted", false)
        .not("status", "in", '("closed","dropped")')
        .order("due_date", { ascending: true })
        .limit(200),
      supabaseAdmin
        .from("meet_tasks")
        .select("tat_result")
        .eq("owner_id", userId)
        .eq("status", "completed")
        .not("tat_result", "is", null)
        .limit(500),
      scope
        ? supabaseAdmin
            .from("meet_sessions")
            .select(sessionSelect)
            .eq("is_deleted", false)
            .in("status", ["completed", "mom_draft", "mom_pending_approval"])
            .gte("scheduled_start", new Date(Date.now() - 30 * 86400000).toISOString())
            .or(scope)
            .order("scheduled_start", { ascending: false })
            .limit(30)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const windowRows: any[] = (windowRes as any).data || [];
    const nextRows: any[] = (nextRes as any).data || [];
    const allIds = Array.from(new Set([...windowRows, ...nextRows].map((s) => s.id)));

    // Invite counts and carried-forward points for the sessions on screen
    const inviteMap = new Map<string, { invited: number; accepted: number }>();
    const carriedMap = new Map<string, number>();
    if (allIds.length) {
      const [attRes, carryRes] = await Promise.all([
        supabaseAdmin.from("meet_session_attendees").select("session_id, invite_status").in("session_id", allIds),
        supabaseAdmin.from("meet_session_points").select("session_id").eq("entry_type", "carried_forward").in("session_id", allIds),
      ]);
      (attRes.data || []).forEach((a: any) => {
        const cur = inviteMap.get(a.session_id) || { invited: 0, accepted: 0 };
        cur.invited += 1;
        if (a.invite_status === "accepted") cur.accepted += 1;
        inviteMap.set(a.session_id, cur);
      });
      (carryRes.data || []).forEach((c: any) => carriedMap.set(c.session_id, (carriedMap.get(c.session_id) || 0) + 1));
    }

    const toSession = (s: any): MeetHomeSession => {
      const m = one<any>(s.meeting);
      const r = one<any>(s.room);
      const inv = inviteMap.get(s.id) || { invited: 0, accepted: 0 };
      return {
        id: s.id,
        code: s.code,
        scheduled_start: s.scheduled_start,
        scheduled_end: s.scheduled_end || null,
        status: s.status,
        video_link: s.video_link || m?.video_link || null,
        room_name: r?.name || null,
        meeting_id: m?.id || null,
        meeting_title: m?.title || "Meeting",
        meeting_code: m?.code || null,
        recurrence: m?.recurrence || null,
        mode: m?.mode || null,
        invited: inv.invited,
        accepted: inv.accepted,
        carried_points: carriedMap.get(s.id) || 0,
        i_am_organizer: m?.organizer_id === userId || m?.chair_id === userId,
      };
    };

    const todayList = windowRows.filter((s) => istDay(new Date(s.scheduled_start)) === today).map(toSession);
    const tomorrowList = windowRows.filter((s) => istDay(new Date(s.scheduled_start)) === tomorrow).map(toSession);

    // Next meeting: in progress first, else the next one that hasn't ended yet
    const nextRow =
      nextRows.find((s) => s.status === "in_progress") ||
      nextRows.find((s) => (s.scheduled_end ? s.scheduled_end >= nowIso : s.scheduled_start >= new Date(Date.now() - 3600000).toISOString()));
    const next = nextRow ? toSession(nextRow) : null;

    // Needs you
    const needs: MeetHomeNeed[] = [];
    for (const s of ((momRes as any).data || []) as any[]) {
      const m = one<any>(s.meeting);
      const isOrgOrChair = m?.organizer_id === userId || m?.chair_id === userId;
      const isMinuteTaker = s.minute_taker_id === userId;
      const when = new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "numeric", month: "short" }).format(new Date(s.scheduled_start));
      if (s.status === "mom_pending_approval" && isOrgOrChair) {
        needs.push({ kind: "approve_minutes", title: "Approve minutes", detail: `${m?.title || "Meeting"} · ${when}`, href: `/meet/sessions/${s.id}` });
      } else if ((s.status === "completed" || s.status === "mom_draft") && (isOrgOrChair || isMinuteTaker)) {
        needs.push({ kind: "write_minutes", title: "Finish and send minutes", detail: `${m?.title || "Meeting"} · ${when}`, href: `/meet/sessions/${s.id}` });
      }
      if (needs.length >= 4) break;
    }

    const myTasks: any[] = myTasksRes.data || [];
    const myPoints: any[] = myPointsRes.data || [];
    const overdueTasks = myTasks.filter((t) => {
      const due = t.revised_due_date || t.due_date;
      return due && String(due).slice(0, 10) < today;
    });
    const overduePoints = myPoints.filter((p) => p.due_date && String(p.due_date).slice(0, 10) < today);

    if (overdueTasks.length) {
      const t = overdueTasks[0];
      const late = daysLate(t.revised_due_date || t.due_date, today);
      needs.push({
        kind: "overdue_task",
        title: overdueTasks.length === 1 ? "1 action item overdue" : `${overdueTasks.length} action items overdue`,
        detail: `${t.title} · ${late} day${late === 1 ? "" : "s"} late`,
        href: "/meet/my-work",
      });
    }
    if (overduePoints.length) {
      const p = overduePoints[0];
      const late = daysLate(p.due_date, today);
      needs.push({
        kind: "overdue_point",
        title: overduePoints.length === 1 ? "1 point overdue" : `${overduePoints.length} points overdue`,
        detail: `${p.title} · ${late} day${late === 1 ? "" : "s"} late`,
        href: "/meet/my-work",
      });
    }

    const done: any[] = doneTasksRes.data || [];
    const onTimePercent = done.length ? Math.round((done.filter((d) => d.tat_result === "within_tat").length / done.length) * 100) : null;

    return {
      ...base,
      next,
      today: todayList,
      tomorrow: tomorrowList,
      needs,
      week: {
        meetings: (weekRes as any).count || 0,
        openPoints: myPoints.length,
        overdue: overdueTasks.length + overduePoints.length,
        onTimePercent,
      },
    };
  } catch (err) {
    console.error("[getMeetHomeData]", err);
    return EMPTY();
  }
}
