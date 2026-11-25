import React from "react";
import { notFound } from "next/navigation";
import { getSessionById } from "@/lib/actions/meet/sessions";
import { getMeetingMasters } from "@/lib/actions/meet/masters";
import LiveMeetingClient from "./LiveMeetingClient";
import JoinRequestsPanel from "@/components/meet/JoinRequestsPanel";
import { getMyMeetingRole } from "@/lib/actions/meet/join";
import { getSessionReplies } from "@/lib/actions/meet/rsvp";
import { getMyBrief } from "@/lib/actions/meet/my-brief";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const { session } = await getSessionById(sessionId);
  return {
    title: session ? `Live: ${session.code} · Chandak Meet` : "Live Mode · Chandak Meet",
  };
}

export default async function LiveMeetingSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const [{ session, points, agenda, attendees }, masters, role, replies, brief] = await Promise.all([
    getSessionById(sessionId),
    getMeetingMasters(),
    getMyMeetingRole(sessionId).catch(() => ({ isHost: false })),
    getSessionReplies(sessionId).catch(() => null),
    getMyBrief(sessionId).catch(() => null),
  ]);

  if (!session) {
    notFound();
  }

  return (
    <div className="h-[calc(100dvh-120px)] flex flex-col">
      <JoinRequestsPanel sessionId={sessionId} />
      <LiveMeetingClient
        session={session}
        points={points}
        agenda={agenda}
        attendees={attendees}
        masters={masters}
        canRun={role.isHost}
        replies={replies?.people || []}
        brief={brief}
      />
    </div>
  );
}
