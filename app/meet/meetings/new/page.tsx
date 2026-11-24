import React from "react";
import { getMeetingMasters } from "@/lib/actions/meet/masters";
import { requireMeet } from "@/lib/permissions/meet";
import ScheduleMeetingForm from "./ScheduleMeetingForm";

export const metadata = {
  title: "Schedule a meeting · Chandak Meet",
  description: "Pick a time everyone is free, add people, a room and the agenda, and send invites",
};

export const dynamic = "force-dynamic";

export default async function NewMeetingPage() {
  const auth = await requireMeet("MEET_VIEW");
  const masters = await getMeetingMasters();

  return (
    <div className="mx-auto max-w-6xl">
      <ScheduleMeetingForm masters={masters} currentUserId={auth.userId} />
    </div>
  );
}
