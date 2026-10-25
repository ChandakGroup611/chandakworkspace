import React from "react";
import { notFound } from "next/navigation";
import { getSessionById } from "@/lib/actions/meet/sessions";
import { getMeetingMasters } from "@/lib/actions/meet/masters";
import LiveMeetingClient from "./LiveMeetingClient";

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
  const [{ session, points, agenda, attendees }, masters] = await Promise.all([
    getSessionById(sessionId),
    getMeetingMasters(),
  ]);

  if (!session) {
    notFound();
  }

  return (
    <div className="h-[calc(100dvh-120px)] flex flex-col">
      <LiveMeetingClient
        session={session}
        points={points}
        agenda={agenda}
        attendees={attendees}
        masters={masters}
      />
    </div>
  );
}
