import React from "react";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { MeetHeader } from "@/components/meet/MeetHeader";
import MeetCalendarClient from "./MeetCalendarClient";
import { requireMeet } from "@/lib/permissions/meet";
import { getHiddenConfidentialMeetingIds } from "@/lib/utils/meet-scope";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Meeting Calendar · Chandak Meet",
  description: "Schedule, sessions timeline and room availability calendar",
};

export default async function MeetCalendarPage() {
  const auth = await requireMeet("MEET_VIEW");
  const hidden = await getHiddenConfidentialMeetingIds(auth.userId, auth.isSuperAdmin || auth.isMeetAdmin);
  const { data: allSessions } = await supabaseAdmin
    .from("meet_sessions")
    .select(`
      id, code, scheduled_start, scheduled_end, status,
      meeting:meet_meetings(
        id, title, code, mode,
        meeting_type:meet_meeting_types(name, color)
      ),
      room:meet_rooms(name, location)
    `)
    .eq("is_deleted", false)
    .order("scheduled_start", { ascending: true });
  const sessions = (allSessions || []).filter((s: any) => !s.meeting?.id || !hidden.has(s.meeting.id));

  return (
    <div className="space-y-6">
      <MeetHeader
        title="Meeting Calendar"
        description="Comprehensive review schedule, room allocations and timings"
        breadcrumbs={[{ label: "Calendar" }]}
      />

      <MeetCalendarClient sessions={(sessions || []) as any[]} />
    </div>
  );
}
