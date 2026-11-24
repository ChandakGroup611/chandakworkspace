import React from "react";
import OutlookStatusLine from "@/components/meet/OutlookStatusLine";
import { notFound } from "next/navigation";
import { getSessionById } from "@/lib/actions/meet/sessions";
import { getMeetingMasters } from "@/lib/actions/meet/masters";
import { getSessionInvitations } from "@/lib/actions/meet/invitations";
import { getAIMinutes } from "@/lib/actions/meet/ai-minutes";
import SessionWorkspaceClient from "./SessionWorkspaceClient";
import JoinRequestsPanel from "@/components/meet/JoinRequestsPanel";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const { session } = await getSessionById(sessionId);
  return {
    title: session ? `${session.code} · Chandak Meet Workspace` : "Session Workspace · Chandak Meet",
  };
}

export default async function SessionWorkspacePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const [{ session, points, agenda, attendees }, masters, invitationsData, aiMinutes] = await Promise.all([
    getSessionById(sessionId),
    getMeetingMasters(),
    getSessionInvitations(sessionId),
    getAIMinutes(sessionId),
  ]);

  if (!session) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <JoinRequestsPanel sessionId={sessionId} />
      <OutlookStatusLine sessionId={sessionId} status={(session as any).status} editHref={(session as any).meeting_id ? `/meet/meetings/${(session as any).meeting_id}/edit` : undefined} />
      <SessionWorkspaceClient
        session={session}
        points={points}
        agenda={agenda}
        attendees={attendees}
        masters={masters}
        invitationsData={invitationsData}
        initialAIMinutes={aiMinutes}
      />
    </div>
  );
}
