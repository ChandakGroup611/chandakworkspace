import React from "react";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { MeetHeader } from "@/components/meet/MeetHeader";
import MeetCalendarClient from "./MeetCalendarClient";

export const metadata = {
  title: "Meeting Calendar · Chandak Meet",
  description: "Schedule, sessions timeline and room availability calendar",
};

export default async function MeetCalendarPage() {
  const { data: sessions } = await supabaseAdmin
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
