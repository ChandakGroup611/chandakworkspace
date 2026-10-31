import React from "react";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import Link from "next/link";
import { Video } from "lucide-react";
import { MeetHeader } from "@/components/meet/MeetHeader";
import { StatusBadge } from "@/components/meet/StatusBadge";
import { AppButton } from "@/components/ui/AppButton";
import InstantCallRoomClient from "@/components/meet/InstantCallRoomClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Live Meeting Mode · Chandak Meet",
  description: "Real-time agenda timer, video war room, quick point capture and inline carry-forward management",
};

interface LiveModeIndexPageProps {
  searchParams?: Promise<{ room?: string }>;
}

export default async function LiveModeIndexPage({ searchParams }: LiveModeIndexPageProps) {
  const params = searchParams ? await searchParams : {};

  // If entering an ad-hoc instant video room (e.g. from Chandak Messenger or direct room invite)
  if (params.room) {
    return <InstantCallRoomClient roomId={params.room} />;
  }

  // Find current in-progress or next scheduled session
  const { data: activeSession } = await supabaseAdmin
    .from("meet_sessions")
    .select("id")
    .eq("status", "in_progress")
    .eq("is_deleted", false)
    .order("scheduled_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeSession?.id) {
    redirect(`/meet/live/${activeSession.id}`);
  }

  // Find next scheduled session today
  const { data: upcomingSession } = await supabaseAdmin
    .from("meet_sessions")
    .select("id")
    .eq("status", "scheduled")
    .eq("is_deleted", false)
    .order("scheduled_start", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (upcomingSession?.id) {
    redirect(`/meet/live/${upcomingSession.id}`);
  }

  // Fallback: list of recent sessions to launch
  const { data: sessions } = await supabaseAdmin
    .from("meet_sessions")
    .select(`
      id, code, scheduled_start, status,
      meeting:meet_meetings(title, code)
    `)
    .eq("is_deleted", false)
    .order("scheduled_start", { ascending: false })
    .limit(8);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <MeetHeader
        title="Live Meeting Mode"
        description="Select a session to enter real-time run sheet, agenda timer, and quick point capture"
        breadcrumbs={[{ label: "Live Mode" }]}
      />

      <div className="theme-card-structural p-6 space-y-4">
        <h2 className="text-[14px] font-semibold text-heading">Select Session to Launch</h2>

        <div className="divide-y divide-border">
          {(sessions || []).map((s: any) => (
            <div key={s.id} className="py-3 flex items-center justify-between">
              <div>
                <span className="font-mono text-[11px] font-semibold text-primary">{s.code}</span>
                <h4 className="text-[13.5px] font-semibold text-heading">{s.meeting?.title}</h4>
                <p className="text-[12px] text-muted">
                  {new Date(s.scheduled_start).toLocaleString("en-IN")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge status={s.status} type="session" />
                <Link href={`/meet/live/${s.id}`}>
                  <AppButton variant="primary" size="sm" leftIcon={<Video className="h-3 w-3" />}>
                    Enter Live Mode
                  </AppButton>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
