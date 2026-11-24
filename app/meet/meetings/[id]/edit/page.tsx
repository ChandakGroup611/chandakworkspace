import React from "react";
import { notFound } from "next/navigation";
import { getMeetingById } from "@/lib/actions/meet/meetings";
import { getMeetingMasters } from "@/lib/actions/meet/masters";
import { requireMeet } from "@/lib/permissions/meet";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import ScheduleMeetingForm from "../../new/ScheduleMeetingForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = await getMeetingById(id);
  return { title: meeting ? `Edit · ${meeting.title} · Chandak Meet` : "Edit meeting · Chandak Meet" };
}

// Edit uses the same page as scheduling, pre-filled; date, time and room change the next meeting.
export default async function EditMeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [meeting, masters, auth] = await Promise.all([getMeetingById(id), getMeetingMasters(), requireMeet("MEET_VIEW")]);
  if (!meeting) notFound();

  const { data: next } = await supabaseAdmin
    .from("meet_sessions")
    .select("id, scheduled_start, scheduled_end, room_id")
    .eq("meeting_id", id)
    .eq("is_deleted", false)
    .eq("status", "scheduled")
    .gte("scheduled_start", new Date(Date.now() - 2 * 3600000).toISOString())
    .order("scheduled_start", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-6xl">
      <ScheduleMeetingForm masters={masters} currentUserId={auth.userId} meeting={meeting} nextSession={(next as any) || null} />
    </div>
  );
}
