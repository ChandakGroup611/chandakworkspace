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
import RsvpPanel from "@/components/meet/RsvpPanel";
import { getSessionReplies } from "@/lib/actions/meet/rsvp";
import { requireMeet } from "@/lib/permissions/meet";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const { session } = await getSessionById(sessionId);
  return {
    title: session ? `${(session as any).meeting?.title || session.code} · Agenda and points · Chandak Meet` : "Meeting date · Chandak Meet",
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
  const upcoming = ["scheduled", "in_progress"].includes((session as any).status);
  const [brief, replies, auth] = await Promise.all([
    upcoming ? getMyBrief(sessionId).catch(() => null) : Promise.resolve(null),
    getSessionReplies(sessionId).catch(() => null),
    requireMeet("MEET_VIEW", { sessionId }),
  ]);
  const when = new Date((session as any).scheduled_start).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

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
      {replies && (
        <RsvpPanel
          sessionId={sessionId}
          dateLabel={when}
          people={replies.people}
          mine={replies.mine}
          canReply={upcoming && !!replies.mine && (session as any).meeting?.organizer_id !== auth.userId}
          canChase={upcoming && (auth.isSuperAdmin || auth.isMeetAdmin || [(session as any).meeting?.organizer_id, (session as any).meeting?.chair_id, (session as any).minute_taker_id].includes(auth.userId))}
          users={(masters.users || []) as any}
        />
      )}
      {brief && <MyBriefPanel brief={brief} />}
      {["scheduled", "in_progress"].includes((session as any).status) && <SessionRoomCard sessionId={sessionId} />}
      <FilesPanel entityType="session" entityId={sessionId} title="Pre-reads and files" />
    </div>
  );
}
