import React from "react";
import OutlookStatusLine from "@/components/meet/OutlookStatusLine";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getMeetingById, getMeetingAllPoints } from "@/lib/actions/meet/meetings";
import { getSessionsForMeeting } from "@/lib/actions/meet/sessions";
import { getMeetingMasters } from "@/lib/actions/meet/masters";
import { getMeetingOverview } from "@/lib/actions/meet/overview";
import MeetingDashboard from "@/components/meet/MeetingDashboard";
import MeetingAnalysisPanel from "@/components/meet/MeetingAnalysisPanel";
import { Building2, Check, Video } from "lucide-react";
import BackLink from "@/components/meet/BackLink";
import MeetingActions from "@/components/meet/MeetingActions";
import RsvpPanel from "@/components/meet/RsvpPanel";
import SessionRoomCard from "@/components/meet/SessionRoomCard";
import { getSessionReplies } from "@/lib/actions/meet/rsvp";
import { requireMeet } from "@/lib/permissions/meet";
import MeetingDetailTabs, { type DetailTab } from "./MeetingDetailTabs";
import {
  btnPrimary,
  btnSecondary,
  actionFor,
  StatusChip,
  recurrenceLabel,
  relativeDay,
  timeOf,
} from "@/components/meet/session-ui";

const TABS: DetailTab[] = ["dashboard", "details", "sessions", "members", "points", "settings"];

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = await getMeetingById(id);
  return {
    title: meeting ? `${meeting.title} · Chandak Meet` : "Meeting · Chandak Meet",
  };
}

const STEPS = ["Scheduled", "Prepare", "In meeting", "Minutes", "Follow up"];

/** Which of the 5 steps the focus meeting is on (0-based). */
function stepOf(status?: string | null) {
  switch (status) {
    case "in_progress": return 2;
    case "completed":
    case "mom_draft":
    case "mom_pending_approval": return 3;
    case "published":
    case "mom_published": return 4;
    default: return 1;
  }
}

export default async function MeetingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const initialTab = TABS.includes(tab as DetailTab) ? (tab as DetailTab) : "dashboard";
  const [meeting, sessions, masters, allPoints, overview] = await Promise.all([
    getMeetingById(id),
    getSessionsForMeeting(id),
    getMeetingMasters(),
    getMeetingAllPoints(id),
    getMeetingOverview(id),
  ]);

  if (!meeting) {
    notFound();
  }

  const auth = await requireMeet("MEET_VIEW", { meetingId: id });
  const canDelete = auth.isSuperAdmin || auth.isMeetAdmin || (meeting as any).organizer_id === auth.userId;
  const focus = overview.focus;
  const replies = focus && (focus.status === "scheduled" || focus.status === "in_progress") ? await getSessionReplies(focus.id) : null;
  const action = focus ? actionFor(focus) : null;
  const step = stepOf(focus?.status);

  return (
    <div className="space-y-5 pb-6">
      {/* Header — like a Zoho project: code + name, one line of facts, one main button */}
      <div className="space-y-4 border-b border-border pb-4">
        <BackLink href="/meet/meetings" label="Meetings" />
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-[1_1_420px]">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[15px] font-semibold text-muted">{meeting.code}</span>
              <h1 className="text-[22px] font-bold tracking-[-0.01em] text-heading">{meeting.title}</h1>
              {focus && <StatusChip s={focus} />}
              {meeting.project && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[12px] font-medium text-success-text">
                  <Building2 className="h-3 w-3" aria-hidden /> {meeting.project.name}
                </span>
              )}
            </div>
            <p className="mt-1 text-[13.5px] text-subtle">
              {recurrenceLabel(meeting.recurrence)} · {meeting.default_duration_minutes} min
              {meeting.room ? ` · ${meeting.room.name}` : ""}
              {meeting.organizer?.full_name ? ` · Organiser ${meeting.organizer.full_name}` : ""}
              {meeting.meeting_type?.name ? ` · ${meeting.meeting_type.name}` : ""}
            </p>
            {focus && (
              <p className="mt-0.5 text-[13px] text-muted">
                {focus.status === "scheduled" || focus.status === "in_progress" ? "Next" : "Latest"}: {relativeDay(focus.scheduled_start)}, {timeOf(focus.scheduled_start)}
              </p>
            )}
            {focus && (
              <div className="mt-2">
                <OutlookStatusLine sessionId={focus.id} status={focus.status} editHref={`/meet/meetings/${meeting.id}/edit`} />
              </div>
            )}
          </div>
          <div className="flex shrink-0 gap-2.5">
            {meeting.status === "archived" && <span className="inline-flex h-10 items-center rounded-md bg-sunken px-3 text-[13px] font-semibold text-subtle">Archived</span>}
            <Link href={`/meet/meetings/${meeting.id}/edit`} className={btnSecondary}>Edit</Link>
            {focus && action && (
              action.external ? (
                <a href={action.href} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
                  <Video className="h-4 w-4" aria-hidden /> Join meeting
                </a>
              ) : (
                <Link href={action.href} className={btnPrimary}>
                  {action.label === "Start" ? <><Video className="h-4 w-4" aria-hidden /> Start meeting</> : action.label}
                </Link>
              )
            )}
            <MeetingActions meetingId={meeting.id} title={meeting.title} archived={meeting.status === "archived"} canDelete={canDelete} />
          </div>
        </div>

        {/* Progress of the focus meeting */}
        {focus && (
          <ol aria-label="Progress of this meeting" className="flex flex-wrap items-center gap-2">
            {STEPS.map((label, i) => {
              const done = i < step || (i === 4 && step === 4);
              const current = i === step && step !== 4;
              return (
                <React.Fragment key={label}>
                  {i > 0 && <li aria-hidden className={`h-0.5 w-8 rounded ${i <= step ? "bg-success" : "bg-border"}`} />}
                  <li aria-current={current ? "step" : undefined} className={`flex items-center gap-2 text-[13px] ${done ? "font-semibold text-success-text" : current ? "font-semibold text-heading" : "font-medium text-muted"}`}>
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${
                        done ? "bg-success text-white" : current ? "bg-primary text-primary-foreground" : "border-2 border-border text-muted"
                      }`}
                    >
                      {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
                    </span>
                    {label}
                  </li>
                </React.Fragment>
              );
            })}
          </ol>
        )}
      </div>

      {focus && replies && <SessionRoomCard sessionId={focus.id} dateLabel={`${relativeDay(focus.scheduled_start)}, ${timeOf(focus.scheduled_start)}`} />}

      {focus && replies && (
        <RsvpPanel
          sessionId={focus.id}
          dateLabel={`${relativeDay(focus.scheduled_start)}, ${timeOf(focus.scheduled_start)}`}
          people={replies.people}
          mine={replies.mine}
          canReply={!!replies.mine && meeting.organizer_id !== auth.userId}
          users={(masters.users || []) as any}
        />
      )}

      <MeetingDetailTabs
        meeting={meeting}
        sessions={sessions}
        masters={masters}
        initialPoints={allPoints}
        initialTab={initialTab}
        dashboard={<div className="space-y-5"><MeetingDashboard overview={overview} points={allPoints} /><MeetingAnalysisPanel meetingId={meeting.id} /></div>}
      />
    </div>
  );
}
