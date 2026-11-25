import React from "react";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import MeetCalendarClient from "./MeetCalendarClient";
import { requireMeet } from "@/lib/permissions/meet";
import { getHiddenConfidentialMeetingIds, getMyMeetScope } from "@/lib/utils/meet-scope";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Calendar · Chandak Meet",
  description: "Your meetings by month, week or as a list",
};

export default async function MeetCalendarPage() {
  const auth = await requireMeet("MEET_VIEW");
  const [hidden, mine] = await Promise.all([
    getHiddenConfidentialMeetingIds(auth.userId, auth.isSuperAdmin || auth.isMeetAdmin),
    getMyMeetScope(auth.userId),
  ]);
  const from = new Date(Date.now() - 120 * 86400000).toISOString();
  const to = new Date(Date.now() + 240 * 86400000).toISOString();
  const { data: allSessions } = await supabaseAdmin
    .from("meet_sessions")
    .select(`
      id, code, scheduled_start, scheduled_end, status, video_link,
      meeting:meet_meetings(id, title, code, mode, meeting_type:meet_meeting_types(name, color)),
      room:meet_rooms(name, location)
    `)
    .eq("is_deleted", false)
    .gte("scheduled_start", from)
    .lte("scheduled_start", to)
    .order("scheduled_start", { ascending: true })
    .limit(3000);

  const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);
  const sessions = (allSessions || [])
    .filter((s: any) => {
      const m = one(s.meeting);
      return !m?.id || !hidden.has(m.id);
    })
    .map((s: any) => {
      const m = one(s.meeting);
      const t = one(m?.meeting_type);
      const r = one(s.room);
      return {
        id: s.id,
        code: s.code,
        start: s.scheduled_start,
        end: s.scheduled_end,
        status: s.status,
        title: m?.title || "Meeting",
        meetingId: m?.id || null,
        meetingCode: m?.code || null,
        type: t?.name || null,
        color: t?.color || null,
        room: r?.name || null,
        online: !!s.video_link || m?.mode !== "in_person",
        mine: mine.sessionIds.has(s.id) || (m?.id ? mine.meetingIds.has(m.id) : false),
      };
    });

  return (
    <div className="space-y-5 pb-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] text-heading">Calendar</h1>
        <p className="mt-1 text-[14px] text-subtle">Meetings by month, week or as a list. Times are in IST.</p>
      </div>
      <MeetCalendarClient sessions={sessions} />
    </div>
  );
}
