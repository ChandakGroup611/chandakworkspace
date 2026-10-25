import React from "react";
import { notFound } from "next/navigation";
import { getSessionById } from "@/lib/actions/meet/sessions";
import { getMeetingMasters } from "@/lib/actions/meet/masters";
import { getSessionInvitations } from "@/lib/actions/meet/invitations";
import { getAIMinutes } from "@/lib/actions/meet/ai-minutes";
import SessionWorkspaceClient from "./SessionWorkspaceClient";

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
