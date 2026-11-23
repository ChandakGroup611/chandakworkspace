"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";
import { SESSION_ROW_SELECT, loadSessionCounts, mapSessionRow, type MeetSessionRow } from "@/lib/utils/meet-session-map";

/**
 * Meeting page dashboard (redesign): the occurrence to focus on (live, next, or latest),
 * how ready it is, its agenda, and a digest of the last 4 meetings. Read-only.
 */
export interface MeetingOverview {
  focus: MeetSessionRow | null;
  agenda: { id: string; title: string; minutes: number; presenter: string | null }[];
  plannedMinutes: number;
  updates: { sent: number; expected: number };
  digest: { label: string; raised: number; closed: number; open: number }[];
}

const EMPTY: MeetingOverview = { focus: null, agenda: [], plannedMinutes: 0, updates: { sent: 0, expected: 0 }, digest: [] };

export async function getMeetingOverview(meetingId: string): Promise<MeetingOverview> {
  const auth = await requireMeet("MEET_VIEW", { meetingId });
  const userId = auth.userId;
  try {
    const { data: sessions } = await supabaseAdmin
      .from("meet_sessions")
      .select(SESSION_ROW_SELECT)
      .eq("meeting_id", meetingId)
      .eq("is_deleted", false)
      .neq("status", "cancelled")
      .order("scheduled_start", { ascending: false })
      .limit(60);

    const all: any[] = sessions || [];
    const cutoff = new Date(Date.now() - 3 * 3600000).toISOString();
    const live = all.find((s) => s.status === "in_progress");
    const upcoming = all
      .filter((s) => s.status === "scheduled" && s.scheduled_start >= cutoff)
      .sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start))[0];
    const latest = all[0];
    const focusRow = live || upcoming || latest || null;

    let focus: MeetSessionRow | null = null;
    let agenda: MeetingOverview["agenda"] = [];
    let updates = { sent: 0, expected: 0 };

    if (focusRow) {
      const counts = await loadSessionCounts([focusRow.id]);
      focus = mapSessionRow(focusRow, userId, counts);

      const [agendaRes, carriedRes, preRes] = await Promise.all([
        supabaseAdmin
          .from("meet_agenda_items")
          .select("id, title, planned_minutes, sort_order, presenter:user_master(full_name)")
          .eq("session_id", focusRow.id)
          .order("sort_order", { ascending: true }),
        supabaseAdmin
          .from("meet_session_points")
          .select("point:meet_points(id, owner_id, status)")
          .eq("session_id", focusRow.id)
          .eq("entry_type", "carried_forward"),
        supabaseAdmin.from("meet_pre_updates").select("user_id, point_id").eq("session_id", focusRow.id),
      ]);

      agenda = (agendaRes.data || []).map((a: any) => {
        const p = Array.isArray(a.presenter) ? a.presenter[0] : a.presenter;
        return { id: a.id, title: a.title, minutes: Number(a.planned_minutes) || 0, presenter: p?.full_name || null };
      });

      const owners = new Set<string>();
      (carriedRes.data || []).forEach((r: any) => {
        const p = Array.isArray(r.point) ? r.point[0] : r.point;
        if (p?.owner_id && p.status !== "closed" && p.status !== "dropped") owners.add(p.owner_id);
      });
      const updated = new Set<string>();
      (preRes.data || []).forEach((u: any) => u.user_id && owners.has(u.user_id) && updated.add(u.user_id));
      updates = { sent: updated.size, expected: owners.size };
    }

    // Digest: last 4 meetings that have happened
    const held = all.filter((s) => s.status !== "scheduled" && s.status !== "in_progress").slice(0, 4).reverse();
    let digest: MeetingOverview["digest"] = [];
    if (held.length) {
      const ids = held.map((s) => s.id);
      const [raisedRes, spRes] = await Promise.all([
        supabaseAdmin.from("meet_points").select("origin_session_id").in("origin_session_id", ids).eq("is_deleted", false),
        supabaseAdmin.from("meet_session_points").select("session_id, status_at_end").in("session_id", ids),
      ]);
      digest = held.map((s) => {
        const raised = (raisedRes.data || []).filter((p: any) => p.origin_session_id === s.id).length;
        const rows = (spRes.data || []).filter((r: any) => r.session_id === s.id);
        const closed = rows.filter((r: any) => r.status_at_end === "closed").length;
        const open = rows.filter((r: any) => r.status_at_end && r.status_at_end !== "closed" && r.status_at_end !== "dropped").length;
        const label = new Date(s.scheduled_start).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
        return { label, raised, closed, open };
      });
    }

    return {
      focus,
      agenda,
      plannedMinutes: agenda.reduce((n, a) => n + a.minutes, 0),
      updates,
      digest,
    };
  } catch (err) {
    console.error("[getMeetingOverview]", err);
    return EMPTY;
  }
}
