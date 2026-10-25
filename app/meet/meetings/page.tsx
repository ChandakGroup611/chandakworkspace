import React from "react";
import Link from "next/link";
import {
  Plus,
  Calendar,
  Clock,
  Video,
  FileText,
  MapPin,
  Users,
  Search,
  ArrowRight,
  Filter,
} from "lucide-react";
import { getMeetings } from "@/lib/actions/meet/meetings";
import { MeetHeader } from "@/components/meet/MeetHeader";
import { StatusBadge } from "@/components/meet/StatusBadge";
import { AppButton } from "@/components/ui/AppButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Meeting Series · Chandak Meet",
  description: "Recurring review series, standing members and agenda templates",
};

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const meetings = await getMeetings({
    search: sp.search,
    status: sp.status,
  });

  return (
    <div className="space-y-6">
      <MeetHeader
        title="Meeting Series"
        description="All standing and recurring review series across Chandak Group entities"
        breadcrumbs={[{ label: "Meeting Series" }]}
        actions={
          <Link href="/meet/meetings/new">
            <AppButton variant="primary" size="md" leftIcon={<Plus className="h-4 w-4" />}>
              Create Meeting Series
            </AppButton>
          </Link>
        }
      />

      {/* Filter / Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            name="search"
            defaultValue={sp.search || ""}
            placeholder="Search series by title or code..."
            className="w-full rounded-md border border-border bg-surface pl-9 pr-3 py-2 text-[13px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
          />
        </form>

        <div className="flex items-center gap-2">
          <Link
            href="/meet/meetings"
            className={`rounded-md px-3 py-1.5 text-[12.5px] font-medium border transition-colors ${
              !sp.status || sp.status === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-surface text-subtle border-border hover:bg-sunken"
            }`}
          >
            All Active ({meetings.length})
          </Link>
          <Link
            href="/meet/meetings?status=archived"
            className={`rounded-md px-3 py-1.5 text-[12.5px] font-medium border transition-colors ${
              sp.status === "archived"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-surface text-subtle border-border hover:bg-sunken"
            }`}
          >
            Archived
          </Link>
        </div>
      </div>

      {/* Series Grid */}
      {meetings.length === 0 ? (
        <div className="theme-card-structural p-12 text-center">
          <Calendar className="mx-auto h-9 w-9 text-muted mb-2" />
          <h3 className="text-[15px] font-semibold text-heading">No meeting series found</h3>
          <p className="mt-1 text-[13px] text-muted max-w-sm mx-auto">
            Get started by creating your first recurring meeting series from a pre-configured template.
          </p>
          <div className="mt-5">
            <Link href="/meet/meetings/new">
              <AppButton variant="primary" size="md" leftIcon={<Plus className="h-4 w-4" />}>
                Create Meeting Series
              </AppButton>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="theme-card-structural p-5 flex flex-col justify-between hover:border-border-active transition-all group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="font-mono text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {meeting.code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-white"
                      style={{ backgroundColor: meeting.meeting_type?.color || "#3b82f6" }}
                    >
                      {meeting.meeting_type?.name || "General"}
                    </span>
                    <StatusBadge status={meeting.status} type="meeting" />
                  </div>
                </div>

                <Link href={`/meet/meetings/${meeting.id}`}>
                  <h3 className="text-[15px] font-semibold text-heading group-hover:text-primary transition-colors line-clamp-1">
                    {meeting.title}
                  </h3>
                </Link>

                {meeting.description && (
                  <p className="mt-1.5 text-[12.5px] text-muted line-clamp-2">
                    {meeting.description}
                  </p>
                )}

                <div className="mt-4 space-y-2 border-t border-border pt-3 text-[12px] text-muted">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-subtle">
                      <Clock className="h-3.5 w-3.5" /> Recurrence:
                    </span>
                    <span className="font-medium text-foreground capitalize">
                      {meeting.recurrence} ({meeting.default_duration_minutes} min)
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-subtle">
                      <Users className="h-3.5 w-3.5" /> Organizer:
                    </span>
                    <span className="font-medium text-foreground">
                      {meeting.organizer?.full_name || "Unassigned"}
                    </span>
                  </div>

                  {meeting.room && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-subtle">
                        <MapPin className="h-3.5 w-3.5" /> Venue:
                      </span>
                      <span className="font-medium text-foreground">{meeting.room.name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-3 text-[12px]">
                  <span className="text-subtle font-medium">
                    <strong className="text-foreground">{meeting.sessions_count || 0}</strong> Sessions
                  </span>
                  <span className="text-subtle font-medium">
                    <strong className="text-warning-text">{meeting.open_points_count || 0}</strong> Open Points
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/meet/meetings/${meeting.id}`}>
                    <AppButton variant="outline" size="sm">
                      Manage
                    </AppButton>
                  </Link>
                  <Link href={`/meet/meetings/${meeting.id}`}>
                    <AppButton variant="primary" size="sm" leftIcon={<Plus className="h-3 w-3" />}>
                      Session
                    </AppButton>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
