"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";
import { getMyMeetScope, getHiddenConfidentialMeetingIds } from "@/lib/utils/meet-scope";
import { SESSION_ROW_SELECT, loadSessionCounts, mapSessionRow, myScopeFilter, type MeetSessionRow } from "@/lib/utils/meet-session-map";

/**
 * Meetings list: one row per meeting date.
 *  "upcoming" = not over yet: running now, or scheduled and its end time hasn't passed.
 *               (A meeting stays "upcoming" right up to its end time, then moves to Past.)
 *  "past"     = everything else from the last 120 days: held, cancelled, or missed
 *               (scheduled but the end time passed without it being started).
 * Admins can switch "Whose" to every meeting; everyone else sees meetings they're part of.
 */

export interface MeetingListFilters {
  search?: string;
  show?: "mine" | "all";
  type?: string;
  department?: string;
  organiser?: string;
  from?: string;
  to?: string;
  status?: string; // scheduled | in_progress | ended | cancelled | missed
}

export interface MyMeetingRow extends MeetSessionRow {
  my_reply: string | null; // invited | accepted | tentative | declined | null (not invited)
  organiser_name: string | null;
  type_name: string | null;
}

const isUuid = (s?: string) => !!s && /^[0-9a-f-]{36}$/i.test(s);
const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export async function getMyMeetingRows(
  kind: "upcoming" | "past",
  filtersOrSearch?: string | MeetingListFilters
): Promise<{ rows: MyMeetingRow[]; counts: { upcoming: number; past: number }; isAdmin: boolean; show: "mine" | "all" }> {
  const auth = await requireMeet("MEET_VIEW");
  const userId = auth.userId;
  const isAdmin = auth.isSuperAdmin || auth.isMeetAdmin;
  const f: MeetingListFilters = typeof filtersOrSearch === "string" ? { search: filtersOrSearch } : filtersOrSearch || {};
  const show: "mine" | "all" = isAdmin && f.show === "all" ? "all" : "mine";
  const none = { rows: [], counts: { upcoming: 0, past: 0 }, isAdmin, show };
  try {
    let scope: string | null = null;
    if (show === "mine") {
      const { meetingIds, sessionIds } = await getMyMeetScope(userId);
      scope = myScopeFilter(meetingIds, sessionIds);
      if (!scope) return none;
    }
    const hidden = await getHiddenConfidentialMeetingIds(userId, isAdmin);

    const now = new Date().toISOString();
    const hourAgo = new Date(Date.now() - 3600000).toISOString();
    const pastFrom = new Date(Date.now() - 120 * 86400000).toISOString();

    // Meeting-level filters (title/code search, type, department, organiser) resolve to meeting ids
    let meetingFilterIds: string[] | null = null;
    const s = String(f.search || "").trim().replace(/[%,()]/g, " ");
    if (s || isUuid(f.type) || isUuid(f.department) || isUuid(f.organiser)) {
      let mq = supabaseAdmin.from("meet_meetings").select("id").eq("is_deleted", false).limit(500);
      if (s) mq = mq.or(`title.ilike.%${s}%,code.ilike.%${s}%`);
      if (isUuid(f.type)) mq = mq.eq("meeting_type_id", f.type!);
      if (isUuid(f.department)) mq = mq.eq("department_id", f.department!);
      if (isUuid(f.organiser)) mq = mq.eq("organizer_id", f.organiser!);
      const { data: hits } = await mq;
      meetingFilterIds = (hits || []).map((h: any) => h.id);
      if (!meetingFilterIds.length) return none;
    }

    const UPCOMING = `status.eq.in_progress,and(status.eq.scheduled,scheduled_end.gte.${now}),and(status.eq.scheduled,scheduled_end.is.null,scheduled_start.gte.${hourAgo})`;
    const PAST = `status.not.in.(scheduled,in_progress),and(status.eq.scheduled,scheduled_end.lt.${now}),and(status.eq.scheduled,scheduled_end.is.null,scheduled_start.lt.${hourAgo})`;

    const apply = (q: any, which: "upcoming" | "past") => {
      q = q.eq("is_deleted", false);
      if (scope) q = q.or(scope);
      if (meetingFilterIds) q = q.in("meeting_id", meetingFilterIds);
      if (hidden.size) q = q.not("meeting_id", "in", `(${Array.from(hidden).join(",")})`);
      if (f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from)) q = q.gte("scheduled_start", `${f.from}T00:00:00+05:30`);
      if (f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to)) q = q.lte("scheduled_start", `${f.to}T23:59:59+05:30`);
      if (which === "upcoming") q = q.or(UPCOMING);
      else q = q.or(PAST).gte("scheduled_start", f.from ? "1970-01-01" : pastFrom);
      if (f.status === "scheduled") q = q.eq("status", "scheduled");
      if (f.status === "in_progress") q = q.eq("status", "in_progress");
      if (f.status === "cancelled") q = q.eq("status", "cancelled");
      if (f.status === "ended") q = q.not("status", "in", "(scheduled,in_progress,cancelled)");
      if (f.status === "missed") q = q.eq("status", "scheduled");
      return q;
    };

    const [listRes, upCount, pastCount] = await Promise.all([
      apply(supabaseAdmin.from("meet_sessions").select(`${SESSION_ROW_SELECT}, meeting_extra:meet_meetings(organizer:user_master!meet_meetings_organizer_id_fkey(full_name), meeting_type:meet_meeting_types(name))`), kind)
        .order("scheduled_start", { ascending: kind === "upcoming" })
        .limit(150),
      apply(supabaseAdmin.from("meet_sessions").select("id", { count: "exact", head: true }), "upcoming"),
      apply(supabaseAdmin.from("meet_sessions").select("id", { count: "exact", head: true }), "past"),
    ]);

    const data: any[] = (listRes as any).data || [];
    if ((listRes as any).error) console.error("[getMyMeetingRows]", (listRes as any).error);
    const ids = data.map((x) => x.id);
    const [counts, mineRes] = await Promise.all([
      loadSessionCounts(ids),
      ids.length
        ? supabaseAdmin.from("meet_session_attendees").select("session_id, invite_status").eq("user_id", userId).in("session_id", ids)
        : Promise.resolve({ data: [] } as any),
    ]);
    const myReply = new Map<string, string>();
    for (const r of (mineRes.data || []) as any[]) myReply.set(r.session_id, r.invite_status || "invited");

    return {
      rows: data.map((x) => {
        const extra = one(x.meeting_extra);
        return {
          ...mapSessionRow(x, userId, counts),
          my_reply: myReply.get(x.id) || null,
          organiser_name: one(extra?.organizer)?.full_name || null,
          type_name: one(extra?.meeting_type)?.name || null,
        };
      }),
      counts: { upcoming: (upCount as any).count || 0, past: (pastCount as any).count || 0 },
      isAdmin,
      show,
    };
  } catch (err) {
    console.error("[getMyMeetingRows]", err);
    return none;
  }
}
