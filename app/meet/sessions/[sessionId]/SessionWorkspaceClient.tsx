"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Video,
  Users,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plus,
  FileText,
  MapPin,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Send,
  Loader2,
} from "lucide-react";
import { MeetHeader } from "@/components/meet/MeetHeader";
import { StatusBadge } from "@/components/meet/StatusBadge";
import { QuickPointCapture } from "@/components/meet/QuickPointCapture";
import { CreateTaskModal } from "@/components/meet/CreateTaskModal";
import InvitationsCard from "@/components/meet/InvitationsCard";
import AttendanceCard from "@/components/meet/AttendanceCard";
import MeetingNotesCard from "@/components/meet/MeetingNotesCard";
import AIMinutesCard from "@/components/meet/AIMinutesCard";
import { AppButton } from "@/components/ui/AppButton";
import { updatePointStatus } from "@/lib/actions/meet/points";
import { generateMoMSnapshot, publishMoM } from "@/lib/actions/meet/mom";
import { toast } from "react-toastify";
import type {
  MeetingSession,
  MeetingPoint,
  AgendaItem,
  SessionAttendee,
  PointStatus,
} from "@/types/meet";

interface SessionWorkspaceClientProps {
  session: MeetingSession;
  points: MeetingPoint[];
  agenda: AgendaItem[];
  attendees: SessionAttendee[];
  masters: {
    users: any[];
    categories: any[];
  };
  invitationsData?: any;
  initialAIMinutes?: any;
}

export default function SessionWorkspaceClient({
  session,
  points: initialPoints,
  agenda,
  attendees,
  masters,
  invitationsData,
  initialAIMinutes,
}: SessionWorkspaceClientProps) {
  const [points, setPoints] = useState<MeetingPoint[]>(initialPoints);
  const [taskModalPoint, setTaskModalPoint] = useState<MeetingPoint | null>(null);
  const [generatingMoM, setGeneratingMoM] = useState(false);
  const [publishingMoM, setPublishingMoM] = useState(false);
  const [momSnapshot, setMomSnapshot] = useState<any>(null);

  const backupPoints = points.filter((p) => p.is_backup || p.carry_forward_count > 0);
  const newPoints = points.filter((p) => !p.is_backup && p.carry_forward_count === 0);

  const handlePointCreated = (newPt: MeetingPoint) => {
    setPoints((prev) => [...prev, newPt]);
  };

  const handleStatusChange = async (pointId: string, status: PointStatus) => {
    try {
      const res = await updatePointStatus({
        pointId,
        sessionId: session.id,
        status,
      });
      if (res.success && res.point) {
        setPoints((prev) =>
          prev.map((p) => (p.id === pointId ? { ...p, status: res.point.status } : p))
        );
        toast.success(`Point status updated to ${status}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleGenerateMoM = async () => {
    try {
      setGeneratingMoM(true);
      const res = await generateMoMSnapshot(session.id);
      if (res.success) {
        setMomSnapshot(res.snapshot);
        toast.success("MoM Draft generated from session points & decisions!");
      } else {
        toast.error(res.error || "Failed to generate MoM");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate MoM");
    } finally {
      setGeneratingMoM(false);
    }
  };

  const handlePublishMoM = async () => {
    try {
      setPublishingMoM(true);
      const res = await publishMoM(session.id, 1);
      if (res.success) {
        toast.success("Minutes of Meeting successfully published to all attendees!");
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to publish MoM");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to publish MoM");
    } finally {
      setPublishingMoM(false);
    }
  };

  const dateFormatted = new Date(session.scheduled_start).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      <MeetHeader
        title={session.meeting?.title || "Meeting Workspace"}
        description={`${session.code} · Scheduled for ${dateFormatted}`}
        breadcrumbs={[
          { label: "Meeting Series", href: "/meet/meetings" },
          { label: session.meeting?.code || "Series", href: `/meet/meetings/${session.meeting_id}` },
          { label: session.code },
        ]}
        badge={<StatusBadge status={session.status} type="session" />}
        actions={
          <div className="flex items-center gap-2">
            <AppButton
              variant="outline"
              size="md"
              leftIcon={<FileText className="h-4 w-4" />}
              isLoading={generatingMoM}
              onClick={handleGenerateMoM}
            >
              Generate MoM
            </AppButton>
            <Link href={`/meet/live/${session.id}`}>
              <AppButton variant="primary" size="md" leftIcon={<Video className="h-4 w-4" />}>
                Launch Live Mode
              </AppButton>
            </Link>
          </div>
        }
      />

      {/* Readiness & Session Quick Bar */}
      <div className="theme-card-structural p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[12px] font-semibold text-primary uppercase tracking-wider">
              Session Execution
            </span>
            <p className="text-[13px] font-medium text-foreground">
              {attendees.length} Attendees Invited · {backupPoints.length} Carried Points to Review
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[12px]">
          {session.video_link && (
            <a
              href={session.video_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 font-medium text-primary hover:bg-sunken transition-colors"
            >
              <Video className="h-3.5 w-3.5" /> Join Video Call <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {session.meeting?.room && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-subtle font-medium">
              <MapPin className="h-3.5 w-3.5" /> {session.meeting.room.name}
            </span>
          )}
        </div>
      </div>

      {/* Invitations & RSVP (Section E4) */}
      {invitationsData && (
        <InvitationsCard
          sessionId={session.id}
          isOrganizer={true}
          initialData={invitationsData}
          usersList={masters.users}
        />
      )}

      {/* Attendance & QR Check-in (Section E5) */}
      {session.status !== "scheduled" && (
        <AttendanceCard
          sessionId={session.id}
          initialAttendees={attendees}
          canManage={true}
        />
      )}

      {/* Agenda & Time Breakdown */}
      {agenda.length > 0 && (
        <div className="theme-card-structural p-5">
          <h3 className="text-[14px] font-semibold text-heading mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Time-Boxed Agenda Run Sheet
            </span>
            <span className="text-[12px] font-normal text-muted">
              Total Planned: {agenda.reduce((acc, a) => acc + (a.planned_minutes || 0), 0)} min
            </span>
          </h3>

          <div className="divide-y divide-border">
            {agenda.map((item, idx) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between text-[13px]">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] font-semibold text-muted w-5">
                    0{idx + 1}
                  </span>
                  <div>
                    <span className="font-medium text-foreground">{item.title}</span>
                    {item.presenter && (
                      <span className="ml-2 text-[11.5px] text-muted">({item.presenter.full_name})</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-sunken px-2 py-0.5 text-[11px] font-medium text-subtle">
                    {item.planned_minutes} min
                  </span>
                  <StatusBadge status={item.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Point Capture Bar */}
      <div>
        <h3 className="text-[13px] font-semibold text-subtle mb-2">Capture Discussion Item / Point</h3>
        <QuickPointCapture
          meetingId={session.meeting_id}
          sessionId={session.id}
          users={masters.users}
          categories={masters.categories}
          onPointCreated={handlePointCreated}
        />
      </div>

      {/* Backup Points First (Automated Carry-Forward Points) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-heading flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-warning-text" />
            Backup Points Carried From Previous Sessions ({backupPoints.length})
          </h3>
          <span className="text-[11.5px] text-muted">Mandatory resolution order</span>
        </div>

        {backupPoints.length === 0 ? (
          <div className="theme-card-structural p-5 text-center text-muted text-[13px]">
            No open points were carried forward to this session.
          </div>
        ) : (
          <div className="space-y-2.5">
            {backupPoints.map((pt) => (
              <div
                key={pt.id}
                className="theme-card-structural p-4 hover:border-border-active transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {pt.code}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning-text border border-warning-border">
                        <RotateCcw className="h-2.5 w-2.5" /> {pt.carry_forward_count}x carried
                      </span>
                      {pt.carry_forward_count >= 3 && (
                        <span className="inline-flex items-center gap-1 rounded bg-danger-soft px-1.5 py-0.5 text-[10.5px] font-medium text-danger-text">
                          <AlertTriangle className="h-3 w-3" /> Repeatedly Carried
                        </span>
                      )}
                      <StatusBadge status={pt.status} />
                      <StatusBadge status={pt.priority} type="priority" />
                    </div>

                    <h4 className="text-[14px] font-semibold text-heading">{pt.title}</h4>
                    {pt.description && (
                      <p className="text-[12.5px] text-muted line-clamp-2">{pt.description}</p>
                    )}
                  </div>

                  {/* Actions / Status Picker */}
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={pt.status}
                      onChange={(e) => handleStatusChange(pt.id, e.target.value as PointStatus)}
                      className="rounded border border-border bg-surface px-2.5 py-1 text-[12px] font-medium text-foreground focus:border-primary focus:outline-none"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="on_hold">On Hold</option>
                      <option value="closed">Close Point</option>
                      <option value="dropped">Drop Point</option>
                    </select>

                    <AppButton
                      variant="outline"
                      size="sm"
                      leftIcon={<Plus className="h-3 w-3" />}
                      onClick={() => setTaskModalPoint(pt)}
                    >
                      Action Item
                    </AppButton>
                  </div>
                </div>

                {/* Footer info: Owner, TAT Due Date, Pre-update */}
                <div className="mt-3 pt-2.5 border-t border-border flex flex-wrap items-center justify-between text-[11.5px] text-muted gap-2">
                  <div className="flex items-center gap-3">
                    <span>
                      Owner: <strong className="text-foreground">{pt.owner?.full_name || "Unassigned"}</strong>
                    </span>
                    <span>
                      TAT Due: <strong className="text-foreground">{pt.due_date}</strong> ({pt.tat_days} days)
                    </span>
                    {pt.category && (
                      <span className="rounded bg-sunken px-1.5 py-0.5">{pt.category.name}</span>
                    )}
                  </div>

                  {pt.latest_pre_update && (
                    <div className="text-info-text font-medium flex items-center gap-1">
                      <span>Update:</span> {pt.latest_pre_update.text} ({pt.latest_pre_update.progress_proposed}%)
                    </div>
                  )}
                </div>

                {/* Child Tasks */}
                {pt.tasks && pt.tasks.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-border/60 pl-3 border-l-2 border-primary/40 space-y-1.5">
                    <span className="text-[11px] font-semibold text-muted uppercase">Action Items:</span>
                    {pt.tasks.map((tsk) => (
                      <div key={tsk.id} className="flex items-center justify-between text-[12px]">
                        <span className="flex items-center gap-2 text-foreground">
                          <span className="font-mono text-[10.5px] text-muted">{tsk.code}</span>
                          {tsk.title} ({tsk.owner?.full_name || "Unassigned"})
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted text-[11px]">Due: {tsk.due_date}</span>
                          <StatusBadge status={tsk.status} type="task" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Points Raised in this Session */}
      <div className="space-y-3 pt-2">
        <h3 className="text-[14px] font-semibold text-heading flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          New Discussion Points Raised in this Session ({newPoints.length})
        </h3>

        {newPoints.length === 0 ? (
          <div className="theme-card-structural p-5 text-center text-muted text-[13px]">
            No new points recorded yet. Use the quick capture bar above to add items.
          </div>
        ) : (
          <div className="space-y-2.5">
            {newPoints.map((pt) => (
              <div
                key={pt.id}
                className="theme-card-structural p-4 hover:border-border-active transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {pt.code}
                      </span>
                      <StatusBadge status={pt.status} />
                      <StatusBadge status={pt.priority} type="priority" />
                    </div>

                    <h4 className="text-[14px] font-semibold text-heading">{pt.title}</h4>
                    {pt.description && (
                      <p className="text-[12.5px] text-muted line-clamp-2">{pt.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={pt.status}
                      onChange={(e) => handleStatusChange(pt.id, e.target.value as PointStatus)}
                      className="rounded border border-border bg-surface px-2.5 py-1 text-[12px] font-medium text-foreground focus:border-primary focus:outline-none"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="closed">Close Point</option>
                      <option value="dropped">Drop Point</option>
                    </select>

                    <AppButton
                      variant="outline"
                      size="sm"
                      leftIcon={<Plus className="h-3 w-3" />}
                      onClick={() => setTaskModalPoint(pt)}
                    >
                      Action Item
                    </AppButton>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-[11.5px] text-muted">
                  <div className="flex items-center gap-3">
                    <span>
                      Owner: <strong className="text-foreground">{pt.owner?.full_name || "Unassigned"}</strong>
                    </span>
                    <span>
                      TAT Due: <strong className="text-foreground">{pt.due_date}</strong> ({pt.tat_days} days)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Meeting Notes (Section D7.3) */}
      <MeetingNotesCard sessionId={session.id} />

      {/* AI Minutes & MoM Distribution Card (Section E6) */}
      <AIMinutesCard
        sessionId={session.id}
        initialAIMinutes={initialAIMinutes}
        totalAttendeesCount={attendees.length}
      />

      {/* Generated MoM Snapshot Preview */}
      {momSnapshot && (
        <div className="theme-card-structural p-5 border-success-border/60 bg-success-soft/20 space-y-4 animate-in fade-in-0">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <span className="text-[11px] font-bold text-success-text uppercase tracking-wider">
                Minutes of Meeting (MoM) Generated
              </span>
              <h4 className="text-[15px] font-semibold text-heading mt-0.5">
                {momSnapshot.meeting_title} · {momSnapshot.session_code}
              </h4>
            </div>
            <AppButton
              variant="primary"
              size="sm"
              isLoading={publishingMoM}
              leftIcon={<Send className="h-3.5 w-3.5" />}
              onClick={handlePublishMoM}
            >
              Publish & Notify Attendees
            </AppButton>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
            <div>
              <span className="text-muted block">Organizer</span>
              <p className="font-semibold text-foreground">{momSnapshot.organizer || "Unassigned"}</p>
            </div>
            <div>
              <span className="text-muted block">Attendees</span>
              <p className="font-semibold text-foreground">{momSnapshot.attendees?.length || 0} participants</p>
            </div>
            <div>
              <span className="text-muted block">Backup Points</span>
              <p className="font-semibold text-foreground">{momSnapshot.backup_points?.length || 0} carried</p>
            </div>
            <div>
              <span className="text-muted block">New Points</span>
              <p className="font-semibold text-foreground">{momSnapshot.new_points?.length || 0} raised</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Item Creation Modal */}
      {taskModalPoint && (
        <CreateTaskModal
          open={!!taskModalPoint}
          onOpenChange={(op) => !op && setTaskModalPoint(null)}
          pointId={taskModalPoint.id}
          pointCode={taskModalPoint.code}
          sessionId={session.id}
          users={masters.users}
          onTaskCreated={(newTask) => {
            setPoints((prev) =>
              prev.map((p) =>
                p.id === taskModalPoint.id
                  ? { ...p, tasks: [...(p.tasks || []), newTask] }
                  : p
              )
            );
          }}
        />
      )}
    </div>
  );
}
