import React from "react";
import OutlookStatusLine from "@/components/meet/OutlookStatusLine";
import { notFound } from "next/navigation";
import { getSessionById } from "@/lib/actions/meet/sessions";
import { getMeetingMasters } from "@/lib/actions/meet/masters";
import { getSessionInvitations } from "@/lib/actions/meet/invitations";
import { getAIMinutes } from "@/lib/actions/meet/ai-minutes";
import SessionWorkspaceClient from "./SessionWorkspaceClient";
import JoinRequestsPanel from "@/components/meet/JoinRequestsPanel";
import FilesPanel from "@/components/meet/FilesPanel";
import SessionRoomCard from "@/components/meet/SessionRoomCard";
import MyBriefPanel from "@/components/meet/MyBriefPanel";
import { getMyBrief } from "@/lib/actions/meet/my-brief";

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
  const brief = ["scheduled", "in_progress"].includes((session as any).status) ? await getMyBrief(sessionId).catch(() => null) : null;

  return (
    <div className="space-y-6">
      <JoinRequestsPanel sessionId={sessionId} />
      {brief && (brief.points.length > 0 || brief.tasks.length > 0 || brief.lastDecisions.length > 0) && <MyBriefPanel brief={brief} />}
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
      {["scheduled", "in_progress"].includes((session as any).status) && <SessionRoomCard sessionId={sessionId} />}
      <FilesPanel entityType="session" entityId={sessionId} title="Pre-reads and files" />
    </div>
  );
}
