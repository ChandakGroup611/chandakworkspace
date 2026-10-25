import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getMeetingById, getMeetingAllPoints } from "@/lib/actions/meet/meetings";
import { getSessionsForMeeting } from "@/lib/actions/meet/sessions";
import { getMeetingMasters } from "@/lib/actions/meet/masters";
import { MeetHeader } from "@/components/meet/MeetHeader";
import { StatusBadge } from "@/components/meet/StatusBadge";
import { AppButton } from "@/components/ui/AppButton";
import {
  Calendar,
  Clock,
  Video,
  Users,
  MapPin,
  CheckCircle2,
  RotateCcw,
  Plus,
  ArrowRight,
  FileText,
} from "lucide-react";
import MeetingDetailTabs from "./MeetingDetailTabs";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = await getMeetingById(id);
  return {
    title: meeting ? `${meeting.title} · Chandak Meet` : "Meeting Series · Chandak Meet",
  };
}

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [meeting, sessions, masters, allPoints] = await Promise.all([
    getMeetingById(id),
    getSessionsForMeeting(id),
    getMeetingMasters(),
    getMeetingAllPoints(id),
  ]);

  if (!meeting) {
    notFound();
  }

  const latestSession = sessions[0];

  return (
    <div className="space-y-6">
      <MeetHeader
        title={meeting.title}
        description={meeting.description || "Recurring review series"}
        breadcrumbs={[
          { label: "Meeting Series", href: "/meet/meetings" },
          { label: meeting.code },
        ]}
        badge={
          <span className="font-mono text-[12px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
            {meeting.code}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            {latestSession && (
              <Link href={`/meet/live/${latestSession.id}`}>
                <AppButton variant="secondary" size="md" leftIcon={<Video className="h-4 w-4" />}>
                  Live Session ({latestSession.code.split("/")[1] || "Current"})
                </AppButton>
              </Link>
            )}
            {latestSession && (
              <Link href={`/meet/sessions/${latestSession.id}`}>
                <AppButton variant="primary" size="md" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Workspace
                </AppButton>
              </Link>
            )}
          </div>
        }
      />

      {/* Series Metadata Card */}
      <div className="theme-card-structural p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-[12.5px]">
          <div>
            <span className="text-muted block text-[11px] uppercase tracking-wider font-medium">Recurrence</span>
            <p className="mt-1 font-semibold text-foreground capitalize">
              {meeting.recurrence} ({meeting.default_duration_minutes} min)
            </p>
          </div>

          <div>
            <span className="text-muted block text-[11px] uppercase tracking-wider font-medium">Organizer</span>
            <p className="mt-1 font-semibold text-foreground">
              {meeting.organizer?.full_name || "Unassigned"}
            </p>
          </div>

          <div>
            <span className="text-muted block text-[11px] uppercase tracking-wider font-medium">Mode & Venue</span>
            <p className="mt-1 font-semibold text-foreground capitalize">
              {meeting.mode.replace("_", " ")} {meeting.room ? `· ${meeting.room.name}` : ""}
            </p>
          </div>

          <div>
            <span className="text-muted block text-[11px] uppercase tracking-wider font-medium">Type</span>
            <div className="mt-1">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium text-white"
                style={{ backgroundColor: meeting.meeting_type?.color || "#3b82f6" }}
              >
                {meeting.meeting_type?.name}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Tabs */}
      <MeetingDetailTabs
        meeting={meeting}
        sessions={sessions}
        masters={masters}
        initialPoints={allPoints}
      />
    </div>
  );
}
