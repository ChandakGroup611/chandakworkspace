
import React from "react";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import Link from "next/link";
import { Video, Calendar } from "lucide-react";
import { MeetHeader } from "@/components/meet/MeetHeader";
import { StatusBadge } from "@/components/meet/StatusBadge";
import { AppButton } from "@/components/ui/AppButton";
import InstantCallRoomClient from "@/components/meet/InstantCallRoomClient";
import { getCachedUser } from "@/lib/auth/cached-user";
import { getMyMeetScope } from "@/lib/utils/meet-scope";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Live Meeting Mode · Chandak Meet",
  description: "Real-time agenda timer, video war room, quick point capture and inline carry-forward management",
};

interface LiveModeIndexPageProps {
  searchParams?: Promise<{ room?: string }>;
}

/**
 * Builds the PostgREST filter for "sessions I take part in": sessions of meetings I organise / chair /
 * take minutes for / am a member of, plus sessions where I'm on the attendee list.
 * Returns null when the user is in no meeting at all.
 */
function mySessionsFilter(meetingIds: Set<string>, sessionIds: Set<string>): string | null {
  const parts: string[] = [];
  if (meetingIds.size > 0) parts.push(`meeting_id.in.(${Array.from(meetingIds).join(",")})`);
  if (sessionIds.size > 0) parts.push(`id.in.(${Array.from(sessionIds).join(",")})`);
  return parts.length ? parts.join(",") : null;
}

export default async function LiveModeIndexPage({ searchParams }: LiveModeIndexPageProps) {
  const params = searchParams ? await searchParams : {};

  // If entering an ad-hoc instant video room (e.g. from Chandak Messenger or direct room invite)
  if (params.room) {
    return <InstantCallRoomClient roomId={params.room} />;
  }

  const { user } = await getCachedUser();
  if (!user) redirect("/login?next=/meet/live");

  // Only ever open the user's OWN meetings. Previously this jumped into whichever meeting in the
  // company was in progress, even one the user was not part of.
  const { meetingIds, sessionIds } = await getMyMeetScope(user.id);
  const filter = mySessionsFilter(meetingIds, sessionIds);

  let sessions: any[] = [];
  if (filter) {
    const { data: activeSession } = await supabaseAdmin
      .from("meet_sessions")
      .select("id")
      .eq("status", "in_progress")
      .eq("is_deleted", false)
      .or(filter)
      .order("scheduled_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeSession?.id) {
      redirect(`/meet/live/${activeSession.id}`);
    }

    // My meetings from 2 hours ago onwards, soonest first, then the most recent past ones.
    const { data: upcoming } = await supabaseAdmin
      .from("meet_sessions")
      .select(`
        id, code, scheduled_start, status,
        meeting:meet_meetings(title, code)
      `)
      .eq("is_deleted", false)
      .eq("status", "scheduled")
      .gte("scheduled_start", new Date(Date.now() - 2 * 3600000).toISOString())
      .or(filter)
      .order("scheduled_start", { ascending: true })
      .limit(8);
    sessions = upcoming || [];
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <MeetHeader
        title="Start or join a meeting"
        description="Your meetings that are about to start. Pick one to open it."
        breadcrumbs={[{ label: "Live" }]}
      />

      <div className="theme-card-structural p-6 space-y-4">
        {sessions.length === 0 ? (
          <div className="py-8 text-center">
            <Calendar className="mx-auto mb-2 h-8 w-8 text-muted" aria-hidden />
            <p className="text-[14px] font-medium text-foreground">You have no meetings coming up</p>
            <p className="mt-0.5 text-[13px] text-muted">Meetings you organise or are invited to will show here.</p>
            <div className="mt-4">
              <Link href="/meet/meetings/new">
                <AppButton variant="primary" size="sm">Schedule a meeting</AppButton>
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sessions.map((s: any) => (
              <div key={s.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-mono text-[11px] font-semibold text-primary">{s.code}</span>
                  <h4 className="text-[13.5px] font-semibold text-heading truncate">{s.meeting?.title}</h4>
                  <p className="text-[12px] text-muted">
                    {new Date(s.scheduled_start).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={s.status} type="session" />
                  <Link href={`/meet/live/${s.id}`}>
                    <AppButton variant="primary" size="sm" leftIcon={<Video className="h-3 w-3" />}>
                      Open
                    </AppButton>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
