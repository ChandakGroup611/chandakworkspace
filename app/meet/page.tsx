import React from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Video,
  Plus,
  ArrowRight,
  TrendingUp,
  FileText,
  MapPin,
  Users,
} from "lucide-react";
import { getMeetDashboardKPIs } from "@/lib/actions/meet/analytics";
import { MeetHeader } from "@/components/meet/MeetHeader";
import { StatusBadge } from "@/components/meet/StatusBadge";
import { AppButton } from "@/components/ui/AppButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Meet Dashboard · Chandak Workspace",
  description: "Executive meeting review, backup points carry-forward & TAT compliance",
};

export default async function MeetDashboardPage() {
  const kpis = await getMeetDashboardKPIs();

  return (
    <div className="space-y-6">
      <MeetHeader
        title="Chandak Meet"
        description="Unified meeting lifecycle, time-boxed agendas, backup points carry-forward & TAT tracking"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/meet/live">
              <AppButton variant="secondary" size="md" leftIcon={<Video className="h-4 w-4" />}>
                Live Mode
              </AppButton>
            </Link>
            <Link href="/meet/meetings/new">
              <AppButton variant="primary" size="md" leftIcon={<Plus className="h-4 w-4" />}>
                Schedule Meeting
              </AppButton>
            </Link>
          </div>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="theme-card-structural p-3.5">
          <div className="flex items-center justify-between text-muted mb-1">
            <span className="text-[11.5px] font-medium uppercase tracking-wider">This Week</span>
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div className="text-[22px] font-bold text-heading">{kpis.meetingsThisWeek}</div>
          <span className="text-[11.5px] text-subtle">Sessions scheduled</span>
        </div>

        <div className="theme-card-structural p-3.5">
          <div className="flex items-center justify-between text-muted mb-1">
            <span className="text-[11.5px] font-medium uppercase tracking-wider">Open Points</span>
            <FileText className="h-4 w-4 text-info-text" />
          </div>
          <div className="text-[22px] font-bold text-heading">{kpis.openPoints}</div>
          <span className="text-[11.5px] text-subtle">Across all reviews</span>
        </div>

        <div className="theme-card-structural p-3.5">
          <div className="flex items-center justify-between text-muted mb-1">
            <span className="text-[11.5px] font-medium uppercase tracking-wider">Active Tasks</span>
            <CheckCircle2 className="h-4 w-4 text-warning-text" />
          </div>
          <div className="text-[22px] font-bold text-heading">{kpis.openTasks}</div>
          <span className="text-[11.5px] text-subtle">Action items in play</span>
        </div>

        <div className="theme-card-structural p-3.5">
          <div className="flex items-center justify-between text-muted mb-1">
            <span className="text-[11.5px] font-medium uppercase tracking-wider">Overdue</span>
            <AlertTriangle className="h-4 w-4 text-danger-text" />
          </div>
          <div className="text-[22px] font-bold text-danger-text">{kpis.overdueTasks}</div>
          <span className="text-[11.5px] text-danger-text/80">Breached TAT due dates</span>
        </div>

        <div className="theme-card-structural p-3.5">
          <div className="flex items-center justify-between text-muted mb-1">
            <span className="text-[11.5px] font-medium uppercase tracking-wider">TAT Score</span>
            <TrendingUp className="h-4 w-4 text-success-text" />
          </div>
          <div className="text-[22px] font-bold text-success-text">{kpis.tatCompliancePercent}%</div>
          <span className="text-[11.5px] text-subtle">On-time completion</span>
        </div>

        <div className="theme-card-structural p-3.5">
          <div className="flex items-center justify-between text-muted mb-1">
            <span className="text-[11.5px] font-medium uppercase tracking-wider">Repeated Carries</span>
            <RotateCcw className="h-4 w-4 text-accent-soft-text" />
          </div>
          <div className="text-[22px] font-bold text-heading">{kpis.repeatedlyCarriedPoints}</div>
          <span className="text-[11.5px] text-subtle">Carried 3+ times</span>
        </div>
      </div>

      {/* Main Grid: Upcoming Sessions & My Open Items */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Upcoming Sessions */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-heading flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Upcoming Review Sessions
            </h2>
            <Link href="/meet/meetings" className="text-[12.5px] font-medium text-primary hover:underline flex items-center gap-1">
              View all series <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {kpis.upcomingSessions.length === 0 ? (
            <div className="theme-card-structural p-8 text-center">
              <Calendar className="mx-auto h-8 w-8 text-muted mb-2" />
              <p className="text-[13.5px] font-medium text-foreground">No upcoming sessions scheduled</p>
              <p className="text-[12.5px] text-muted mt-0.5">Create a meeting series to begin running reviews</p>
              <div className="mt-4">
                <Link href="/meet/meetings/new">
                  <AppButton variant="primary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                    Schedule Meeting
                  </AppButton>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {kpis.upcomingSessions.map((session) => {
                const dateObj = new Date(session.scheduled_start);
                const dateFormatted = dateObj.toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                });
                const timeFormatted = dateObj.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div key={session.id} className="theme-card-structural p-4 flex flex-col justify-between hover:border-border-active transition-all">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-[11px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          {session.code}
                        </span>
                        <StatusBadge status={session.status} type="session" />
                      </div>

                      <h3 className="text-[14px] font-semibold text-heading line-clamp-1">
                        {session.meeting?.title || "Meeting Session"}
                      </h3>

                      <div className="mt-2.5 space-y-1.5 text-[12px] text-muted">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 shrink-0 text-subtle" />
                          <span>{dateFormatted} · {timeFormatted}</span>
                        </div>
                        {session.room && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-subtle" />
                            <span>{session.room.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                      <Link href={`/meet/sessions/${session.id}`} className="text-[12px] font-medium text-muted hover:text-foreground">
                        Workspace
                      </Link>
                      <Link href={`/meet/live/${session.id}`}>
                        <AppButton variant="primary" size="sm" leftIcon={<Video className="h-3 w-3" />}>
                          Live Mode
                        </AppButton>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Visual Breakdowns */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
            {/* Status Breakdown */}
            <div className="theme-card-structural p-4">
              <h3 className="text-[13.5px] font-semibold text-heading mb-3">Points by Status</h3>
              <div className="space-y-2">
                {kpis.pointsByStatus.map((item) => (
                  <div key={item.status} className="flex items-center justify-between text-[12.5px]">
                    <span className="flex items-center gap-2 text-subtle">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.status}
                    </span>
                    <span className="font-semibold text-foreground">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Overdue Ageing */}
            <div className="theme-card-structural p-4">
              <h3 className="text-[13.5px] font-semibold text-heading mb-3">Overdue Ageing Buckets</h3>
              <div className="space-y-2">
                {kpis.overdueAgeing.map((item) => (
                  <div key={item.bucket} className="flex items-center justify-between text-[12.5px]">
                    <span className="text-subtle">{item.bucket}</span>
                    <span className={`font-semibold ${item.count > 0 ? "text-danger-text" : "text-muted"}`}>
                      {item.count} {item.count === 1 ? "item" : "items"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: My Open Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-heading flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              My Action Items & Points
            </h2>
            <Link href="/meet/my-work" className="text-[12.5px] font-medium text-primary hover:underline flex items-center gap-1">
              My Work <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="theme-card-structural p-4 divide-y divide-border">
            {kpis.myOpenItems.length === 0 ? (
              <div className="py-8 text-center text-muted">
                <CheckCircle2 className="mx-auto h-7 w-7 text-success-text/70 mb-1.5" />
                <p className="text-[13px] font-medium text-foreground">You are all caught up!</p>
                <p className="text-[12px] text-muted">No pending points or overdue tasks assigned to you</p>
              </div>
            ) : (
              kpis.myOpenItems.map((item: any) => (
                <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[11px] font-semibold text-subtle">
                      {item.code}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                  <h4 className="mt-1 text-[13px] font-medium text-heading line-clamp-2">
                    {item.title}
                  </h4>
                  <div className="mt-2 flex items-center justify-between text-[11.5px] text-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Due: {item.due_date}
                    </span>
                    {item.carry_forward_count > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-warning-text font-medium">
                        <RotateCcw className="h-3 w-3" /> {item.carry_forward_count}x carried
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick Guidance Box */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-[12.5px] text-subtle space-y-2">
            <h4 className="font-semibold text-foreground flex items-center gap-1.5">
              <RotateCcw className="h-3.5 w-3.5 text-primary" />
              Automated Carry-Forward Rule
            </h4>
            <p>
              Any point left unresolved when a meeting concludes is carried forward as a backup point into the next session with its complete audit trail.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
