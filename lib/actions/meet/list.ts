"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";
import { getMyMeetScope } from "@/lib/utils/meet-scope";
import { SESSION_ROW_SELECT, loadSessionCounts, mapSessionRow, myScopeFilter, type MeetSessionRow } from "@/lib/utils/meet-session-map";

/**
 * Meetings list (redesign): the signed-in user's own meeting occurrences.
 * "upcoming" = not finished yet (from 3 hours ago onwards), soonest first.
 * "past"     = everything else from the last 120 days, newest first: held meetings, cancelled ones,
 *              and ones whose time passed without being started.
 */
export async function getMyMeetingRows(
  kind: "upcoming" | "past",
  search?: string
): Promise<{ rows: MeetSessionRow[]; counts: { upcoming: number; past: number } }> {
  const auth = await requireMeet("MEET_VIEW");
  const userId = auth.userId;
  try {
    const { meetingIds, sessionIds } = await getMyMeetScope(userId);
    const scope = myScopeFilter(meetingIds, sessionIds);
    if (!scope) return { rows: [], counts: { upcoming: 0, past: 0 } };

    const from = new Date(Date.now() - 3 * 3600000).toISOString();
    const pastFrom = new Date(Date.now() - 120 * 86400000).toISOString();

    // Optional title search: resolve matching meeting ids first (title lives on the meeting)
    let searchIds: string[] | null = null;
    if (search && search.trim()) {
      const { data: hits } = await supabaseAdmin
        .from("meet_meetings")
        .select("id")
        .eq("is_deleted", false)
        .or(`title.ilike.%${search.trim().replace(/[%,()]/g, " ")}%,code.ilike.%${search.trim().replace(/[%,()]/g, " ")}%`)
        .limit(200);
      searchIds = (hits || []).map((h: any) => h.id);
      if (!searchIds.length) return { rows: [], counts: { upcoming: 0, past: 0 } };
    }

    const base = () => {
      let q = supabaseAdmin.from("meet_sessions").select(SESSION_ROW_SELECT).eq("is_deleted", false).or(scope);
      if (searchIds) q = q.in("meeting_id", searchIds);
      return q;
    };
    const countBase = () => {
      let q = supabaseAdmin.from("meet_sessions").select("id", { count: "exact", head: true }).eq("is_deleted", false).or(scope);
      if (searchIds) q = q.in("meeting_id", searchIds);
      return q;
    };

    const [listRes, upCount, pastCount] = await Promise.all([
      kind === "upcoming"
        ? base().in("status", ["scheduled", "in_progress"]).gte("scheduled_start", from).order("scheduled_start", { ascending: true }).limit(100)
        : base().or(`scheduled_start.lt.${from},status.not.in.(scheduled,in_progress)`).gte("scheduled_start", pastFrom).order("scheduled_start", { ascending: false }).limit(100),
      countBase().in("status", ["scheduled", "in_progress"]).gte("scheduled_start", from),
      countBase().or(`scheduled_start.lt.${from},status.not.in.(scheduled,in_progress)`).gte("scheduled_start", pastFrom),
    ]);

    const data: any[] = (listRes as any).data || [];
    const counts = await loadSessionCounts(data.map((s) => s.id));
    return {
      rows: data.map((s) => mapSessionRow(s, userId, counts)),
      counts: { upcoming: (upCount as any).count || 0, past: (pastCount as any).count || 0 },
    };
  } catch (err) {
    console.error("[getMyMeetingRows]", err);
    return { rows: [], counts: { upcoming: 0, past: 0 } };
  }
}
