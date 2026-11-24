"use client";

import React, { useState, useTransition } from "react";
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
  Edit,
  Trash2,
  X,
  CalendarDays,
  Ban,
  Download,
} from "lucide-react";
import { MeetHeader } from "@/components/meet/MeetHeader";
import { StatusBadge } from "@/components/meet/StatusBadge";
import { QuickPointCapture } from "@/components/meet/QuickPointCapture";
import { sanitizeTeamsUrl } from "@/lib/integrations/microsoft-teams";
import { CreateTaskModal } from "@/components/meet/CreateTaskModal";
import InvitationsCard from "@/components/meet/InvitationsCard";
import AttendanceCard from "@/components/meet/AttendanceCard";
import MeetingNotesCard from "@/components/meet/MeetingNotesCard";
import AIMinutesCard from "@/components/meet/AIMinutesCard";
import DraggableLiveNotesWidget from "@/components/meet/DraggableLiveNotesWidget";
import { AppButton } from "@/components/ui/AppButton";
import { generateMoMPDF } from "@/lib/utils/mom-pdf";
import { updatePointStatus, updatePoint, deletePoint } from "@/lib/actions/meet/points";
import {
  rescheduleSession,
  cancelSession,
  addAgendaItem,
  deleteAgendaItem,
  updateSessionVideoLink,
} from "@/lib/actions/meet/sessions";
import { generateMoMSnapshot, publishMoM } from "@/lib/actions/meet/mom";
import { toast } from "react-toastify";
import type {
  MeetingSession,
  MeetingPoint,
  AgendaItem,
  SessionAttendee,
  PointStatus,
  PointPriority,
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
  agenda: initialAgenda,
  attendees,
  masters,
  invitationsData,
  initialAIMinutes,
}: SessionWorkspaceClientProps) {
  const [points, setPoints] = useState<MeetingPoint[]>(initialPoints);
  const [agenda, setAgenda] = useState<AgendaItem[]>(initialAgenda);
  const [taskModalPoint, setTaskModalPoint] = useState<MeetingPoint | null>(null);
  const [generatingMoM, setGeneratingMoM] = useState(false);
  const [publishingMoM, setPublishingMoM] = useState(false);
  const [momSnapshot, setMomSnapshot] = useState<any>(null);
  const [isPending, startTransition] = useTransition();
  const [currentVideoLink, setCurrentVideoLink] = useState(
    session.video_link || session.meeting?.video_link || ""
  );
  const [generatingTeamsLink, setGeneratingTeamsLink] = useState(false);

  const handleGenerateTeamsLink = async () => {
    setGeneratingTeamsLink(true);
    try {
      const { generateTeamsMeetingLink } = await import("@/lib/integrations/microsoft-teams");
      const attendeeEmails = (attendees || [])
        .map((a: any) => a.user?.email || a.guest_email)
        .filter(Boolean) as string[];

      const scheduledStart = session.scheduled_start;
      const scheduledEnd = session.scheduled_end;

      const link = await generateTeamsMeetingLink({
        title: session.meeting?.title || "Meeting Session",
        meetingCode: session.code,
        scheduledStart,
        scheduledEnd,
        organizerId: session.meeting?.organizer_id,
        organizerEmail: (session.meeting?.organizer as any)?.email,
        attendeeEmails,
        callType: "meeting",
      });

      await updateSessionVideoLink({ sessionId: session.id, videoLink: link });
      setCurrentVideoLink(link);
      toast.success("Microsoft Teams meeting link generated with all parameters!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate Teams link");
    } finally {
      setGeneratingTeamsLink(false);
    }
  };

  // Modals state
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(
    new Date(session.scheduled_start).toISOString().split("T")[0]
  );
  const [rescheduleTime, setRescheduleTime] = useState(
    new Date(session.scheduled_start).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
  const [rescheduleReason, setRescheduleReason] = useState("");

  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [isAddAgendaOpen, setIsAddAgendaOpen] = useState(false);
  const [agendaTitle, setAgendaTitle] = useState("");
  const [agendaMins, setAgendaMins] = useState(15);
  const [agendaPresenterId, setAgendaPresenterId] = useState("");

  const [editingPoint, setEditingPoint] = useState<MeetingPoint | null>(null);
  const [editPointTitle, setEditPointTitle] = useState("");
  const [editPointDesc, setEditPointDesc] = useState("");
  const [editPointPriority, setEditPointPriority] = useState<PointPriority>("medium");
  const [editPointOwnerId, setEditPointOwnerId] = useState("");
  const [editPointCategory, setEditPointCategory] = useState("");
  const [editPointTat, setEditPointTat] = useState(3);

  // Closure Remarks Modal (Spec P6)
  const [closingPoint, setClosingPoint] = useState<MeetingPoint | null>(null);
  const [closureRemarks, setClosureRemarks] = useState("");

  const backupPoints = points.filter((p) => p.is_backup || p.carry_forward_count > 0);
  const newPoints = points.filter((p) => !p.is_backup && p.carry_forward_count === 0);

  const handlePointCreated = (newPt: MeetingPoint) => {
    setPoints((prev) => [...prev, newPt]);
  };

  const handleStatusChange = async (pointId: string, status: PointStatus) => {
    const targetPt = points.find((p) => p.id === pointId);
    if (status === "closed") {
      setClosingPoint(targetPt || null);
      setClosureRemarks("");
      return;
    }

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

  const handleConfirmClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingPoint) return;
    if (!closureRemarks.trim()) {
      toast.warn("Closure remarks are required to close this point");
      return;
    }

    startTransition(async () => {
      try {
        const res = await updatePointStatus({
          pointId: closingPoint.id,
          sessionId: session.id,
          status: "closed",
          closureRemarks: closureRemarks.trim(),
        });

        if (res.success) {
          toast.success("Point closed with closure remarks logged");
          setPoints((prev) =>
            prev.map((p) =>
              p.id === closingPoint.id
                ? { ...p, status: "closed", closure_remarks: closureRemarks.trim() }
                : p
            )
          );
          setClosingPoint(null);
        } else {
          toast.error(res.error || "Failed to close point");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to close point");
      }
    });
  };

  const handleOpenEditPoint = (pt: MeetingPoint) => {
    setEditingPoint(pt);
    setEditPointTitle(pt.title);
    setEditPointDesc(pt.description || "");
    setEditPointPriority(pt.priority);
    setEditPointOwnerId(pt.owner_id || "");
    setEditPointCategory(pt.category_id || "");
    setEditPointTat(pt.tat_days || 3);
  };

  const handleSaveEditPoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPoint) return;

    startTransition(async () => {
      try {
        const res = await updatePoint({
          pointId: editingPoint.id,
          sessionId: session.id,
          title: editPointTitle,
          description: editPointDesc,
          priority: editPointPriority,
          ownerId: editPointOwnerId || undefined,
          categoryId: editPointCategory || undefined,
          tatDays: Number(editPointTat),
        });

        if (res.success && res.point) {
          toast.success("Point updated");
          setPoints((prev) =>
            prev.map((p) => (p.id === editingPoint.id ? { ...p, ...res.point } : p))
          );
          setEditingPoint(null);
        } else {
          toast.error(res.error || "Failed to update point");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to update point");
      }
    });
  };

  const handleDeletePoint = async (pointId: string) => {
    if (!confirm("Are you sure you want to delete this point?")) return;

    startTransition(async () => {
      try {
        const res = await deletePoint(pointId, session.id);
        if (res.success) {
          toast.success("Point deleted");
          setPoints((prev) => prev.filter((p) => p.id !== pointId));
        } else {
          toast.error(res.error || "Failed to delete point");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to delete point");
      }
    });
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const scheduledStart = `${rescheduleDate}T${rescheduleTime}:00`;
        const res = await rescheduleSession({
          sessionId: session.id,
          scheduledStart,
          reason: rescheduleReason,
        });

        if (res.success) {
          toast.success("Session rescheduled");
          setIsRescheduleOpen(false);
          window.location.reload();
        } else {
          toast.error(res.error || "Failed to reschedule session");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to reschedule session");
      }
    });
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await cancelSession({
          sessionId: session.id,
          reason: cancelReason,
        });

        if (res.success) {
          toast.success("Session cancelled");
          setIsCancelOpen(false);
          window.location.reload();
        } else {
          toast.error(res.error || "Failed to cancel session");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to cancel session");
      }
    });
  };

  const handleAddAgendaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agendaTitle.trim()) return;

    startTransition(async () => {
      try {
        const res = await addAgendaItem({
          sessionId: session.id,
          title: agendaTitle.trim(),
          plannedMinutes: Number(agendaMins),
          presenterId: agendaPresenterId || undefined,
        });

        if (res.success && res.agendaItem) {
          toast.success("Agenda item added");
          setAgenda((prev) => [...prev, res.agendaItem]);
          setIsAddAgendaOpen(false);
          setAgendaTitle("");
        } else {
          toast.error(res.error || "Failed to add agenda item");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to add agenda item");
      }
    });
  };

  const handleDeleteAgenda = async (agendaItemId: string) => {
    if (!confirm("Are you sure you want to remove this agenda item?")) return;

    startTransition(async () => {
      try {
        const res = await deleteAgendaItem({
          agendaItemId,
          sessionId: session.id,
        });

        if (res.success) {
          toast.success("Agenda item removed");
          setAgenda((prev) => prev.filter((a) => a.id !== agendaItemId));
        } else {
          toast.error(res.error || "Failed to remove agenda item");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to remove agenda item");
      }
    });
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

  const handleExportPDF = () => {
    try {
      const allTasks = points.flatMap((p) => p.tasks || []);
      const meeting = session.meeting as any;
      generateMoMPDF({
        meetingTitle: meeting?.title || "Meeting Minutes",
        meetingCode: meeting?.code || "MTG",
        sessionCode: session.code,
        sessionNo: session.session_no,
        scheduledStart: session.scheduled_start,
        scheduledEnd: session.scheduled_end || undefined,
        meetingType: meeting?.meeting_type?.name,
        departmentName: meeting?.department?.name,
        projectName: meeting?.project?.name,
        projectCode: meeting?.project?.code,
        roomName: session.room?.name,
        chairName: (meeting?.chair as any)?.full_name,
        organizerName: meeting?.organizer?.full_name,
        minuteTakerName: (session.minute_taker as any)?.full_name,
        overview: session.summary_notes || initialAIMinutes?.overview || undefined,
        status: session.status,
        momVersion: session.mom_version,
        attendees: attendees.map((a) => ({
          name: (a.user as any)?.full_name || a.guest_name || "Delegate",
          role: a.role,
          attendance: a.attendance,
          time: a.check_in_at ? new Date(a.check_in_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : undefined,
        })),
        points: points.map((p) => ({
          code: p.code,
          title: p.title,
          priority: p.priority,
          owner: (p.owner as any)?.full_name || "Unassigned",
          dueDate: p.due_date,
          status: p.status,
          notes: (p as any).discussion_notes,
        })),
        tasks: allTasks.map((t) => ({
          code: t.code,
          title: t.title,
          owner: (t.owner as any)?.full_name || "Unassigned",
          priority: t.priority,
          dueDate: t.revised_due_date || t.due_date,
          status: t.status,
        })),
        decisions: [],
      });
      toast.success("Executive MoM PDF generated successfully!");
    } catch (err: any) {
      console.error("Error generating MoM PDF:", err);
      toast.error("Failed to generate PDF: " + (err.message || err));
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

  const isOpen = session.status === "scheduled" || session.status === "in_progress";
  const isEnded = !isOpen && session.status !== "cancelled";

  return (
    <div className="space-y-6">
      <MeetHeader
        title={session.meeting?.title || "Meeting Workspace"}
        description={`${session.code} · Scheduled for ${dateFormatted}`}
        breadcrumbs={[
          { label: "Meetings", href: "/meet/meetings" },
          { label: session.meeting?.title || session.meeting?.code || "Meeting", href: `/meet/meetings/${session.meeting_id}` },
          { label: dateFormatted },
        ]}
        badge={<StatusBadge status={session.status} type="session" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {session.status === "scheduled" && (
              <>
                <AppButton
                  variant="outline"
                  size="md"
                  leftIcon={<CalendarDays className="h-4 w-4" />}
                  onClick={() => setIsRescheduleOpen(true)}
                >
                  Reschedule
                </AppButton>
                <AppButton
                  variant="outline"
                  size="md"
                  leftIcon={<Ban className="h-4 w-4 text-danger-text" />}
                  onClick={() => setIsCancelOpen(true)}
                >
                  Cancel
                </AppButton>
              </>
            )}

            {isEnded && (
              <>
                <AppButton
                  variant="outline"
                  size="md"
                  leftIcon={<Download className="h-4 w-4" />}
                  onClick={handleExportPDF}
                >
                  Export PDF
                </AppButton>
                <Link href={`/meet/sessions/${session.id}/review`}>
                  <AppButton variant="primary" size="md" leftIcon={<FileText className="h-4 w-4" />}>
                    Minutes
                  </AppButton>
                </Link>
              </>
            )}
            {isOpen && (
              <Link href={`/meet/live/${session.id}`}>
                <AppButton variant="primary" size="md" leftIcon={<Video className="h-4 w-4" />}>
                  {session.status === "in_progress" ? "Open live meeting" : "Start meeting"}
                </AppButton>
              </Link>
            )}
          </div>
        }
      />

      {session.status === "cancelled" && (
        <div role="status" className="rounded-lg border border-danger-border bg-danger-soft p-4 text-[14px] text-danger-text">
          <strong>This meeting was cancelled.</strong>
          {(session as any).cancel_reason ? ` Reason: ${(session as any).cancel_reason}` : ""}
        </div>
      )}

      {/* Readiness & Session Quick Bar */}
      <div className={`${isOpen ? "" : "hidden"} theme-card-structural p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-primary/5 border-primary/20`}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[12px] font-semibold text-primary">
              This meeting
            </span>
            <p className="text-[13px] font-medium text-foreground">
              {attendees.length} invited · {backupPoints.length} open point{backupPoints.length === 1 ? "" : "s"} from earlier meetings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[12px]">
          {currentVideoLink ? (
            <div className="flex items-center gap-1.5">
              <a
                href={sanitizeTeamsUrl(currentVideoLink, (attendees || []).map((a) => (a as any).user?.email || a.guest_email).filter(Boolean), session.meeting?.title) || currentVideoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-[#4B53BC]/40 bg-[#4B53BC]/10 px-3 py-1.5 font-semibold text-[#4B53BC] dark:text-[#8B93FF] hover:bg-[#4B53BC]/20 transition-colors"
                title="Join Microsoft Teams Meeting"
              >
                <Video className="h-3.5 w-3.5" /> Join Teams Meeting <ExternalLink className="h-3 w-3" />
              </a>
              <button
                type="button"
                onClick={handleGenerateTeamsLink}
                disabled={generatingTeamsLink}
                className="p-1.5 rounded-md border border-border bg-surface hover:bg-surface-hover text-muted hover:text-foreground transition-colors shrink-0 cursor-pointer"
                title="Regenerate Microsoft Teams Link with all parameters"
              >
                {generatingTeamsLink ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-primary" />}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGenerateTeamsLink}
              disabled={generatingTeamsLink}
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 font-semibold text-[12px] transition-colors cursor-pointer disabled:opacity-50"
              title="Generate Microsoft Teams Meeting Link"
            >
              {generatingTeamsLink ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              <span>+ Generate Teams Link</span>
            </button>
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
      <div className="theme-card-structural p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-semibold text-heading flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Time-Boxed Agenda Run Sheet
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-muted">
              Total Planned: {agenda.reduce((acc, a) => acc + (a.planned_minutes || 0), 0)} min
            </span>
            <AppButton
              variant="outline"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setIsAddAgendaOpen(true)}
            >
              Add Agenda Item
            </AppButton>
          </div>
        </div>

        {agenda.length === 0 ? (
          <p className="text-[12.5px] text-muted py-2 text-center">No agenda items configured for this review session.</p>
        ) : (
          <div className="divide-y divide-border">
            {agenda.map((item, idx) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between text-[13px] group">
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
                  <button
                    onClick={() => handleDeleteAgenda(item.id)}
                    title="Remove agenda item"
                    className="p-1 text-muted hover:text-danger-text transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
                      leftIcon={<Edit className="h-3 w-3" />}
                      onClick={() => handleOpenEditPoint(pt)}
                    >
                      Edit
                    </AppButton>

                    <AppButton
                      variant="outline"
                      size="sm"
                      leftIcon={<Plus className="h-3 w-3" />}
                      onClick={() => setTaskModalPoint(pt)}
                    >
                      Action Item
                    </AppButton>

                    <button
                      onClick={() => handleDeletePoint(pt.id)}
                      title="Delete point"
                      className="p-1.5 text-muted hover:text-danger-text transition-colors rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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
                        <span className="font-medium text-foreground">{tsk.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted">{tsk.owner?.full_name || "Unassigned"}</span>
                          <StatusBadge status={tsk.status} />
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

      {/* New Points Raised In This Session */}
      <div className="space-y-3">
        <h3 className="text-[14px] font-semibold text-heading flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          New Points Raised in This Session ({newPoints.length})
        </h3>

        {newPoints.length === 0 ? (
          <div className="theme-card-structural p-5 text-center text-muted text-[13px]">
            No new points recorded yet. Use the capture bar above to log items.
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
                      leftIcon={<Edit className="h-3 w-3" />}
                      onClick={() => handleOpenEditPoint(pt)}
                    >
                      Edit
                    </AppButton>

                    <AppButton
                      variant="outline"
                      size="sm"
                      leftIcon={<Plus className="h-3 w-3" />}
                      onClick={() => setTaskModalPoint(pt)}
                    >
                      Action Item
                    </AppButton>

                    <button
                      onClick={() => handleDeletePoint(pt.id)}
                      title="Delete point"
                      className="p-1.5 text-muted hover:text-danger-text transition-colors rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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

      {/* Reschedule Modal */}
      {isRescheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-[15px] font-semibold text-heading">Reschedule Session</h3>
              <button
                onClick={() => setIsRescheduleOpen(false)}
                className="text-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="mt-4 space-y-3 text-[13px]">
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  New Date *
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  required
                  className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  New Start Time *
                </label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  required
                  className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  Reason for Rescheduling
                </label>
                <textarea
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  rows={2}
                  placeholder="e.g. Key stakeholders unavailable..."
                  className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-border">
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRescheduleOpen(false)}
                >
                  Cancel
                </AppButton>
                <AppButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isPending}
                >
                  Confirm Reschedule
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Session Modal */}
      {isCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-[15px] font-semibold text-danger-text flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Cancel Review Session
              </h3>
              <button
                onClick={() => setIsCancelOpen(false)}
                className="text-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCancelSubmit} className="mt-4 space-y-3 text-[13px]">
              <p className="text-[12px] text-muted">
                Are you sure you want to cancel session <strong>{session.code}</strong>? All invited attendees will be notified.
              </p>

              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  Cancellation Reason *
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                  rows={2}
                  placeholder="Reason for cancelling..."
                  className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-border">
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCancelOpen(false)}
                >
                  Back
                </AppButton>
                <AppButton
                  type="submit"
                  variant="destructive"
                  size="sm"
                  isLoading={isPending}
                >
                  Confirm Cancellation
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Agenda Item Modal */}
      {isAddAgendaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-[15px] font-semibold text-heading">Add Agenda Item</h3>
              <button
                onClick={() => setIsAddAgendaOpen(false)}
                className="text-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddAgendaSubmit} className="mt-4 space-y-3 text-[13px]">
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  Agenda Topic *
                </label>
                <input
                  type="text"
                  value={agendaTitle}
                  onChange={(e) => setAgendaTitle(e.target.value)}
                  required
                  placeholder="e.g. Budget variance review..."
                  className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">
                    Planned Mins
                  </label>
                  <input
                    type="number"
                    value={agendaMins}
                    onChange={(e) => setAgendaMins(Number(e.target.value))}
                    min={5}
                    step={5}
                    className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">
                    Presenter
                  </label>
                  <select
                    value={agendaPresenterId}
                    onChange={(e) => setAgendaPresenterId(e.target.value)}
                    className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="">None / Open</option>
                    {masters.users?.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-border">
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddAgendaOpen(false)}
                >
                  Cancel
                </AppButton>
                <AppButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isPending}
                >
                  Add Agenda Item
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Point Modal */}
      {editingPoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-[15px] font-semibold text-heading">
                Edit Point ({editingPoint.code})
              </h3>
              <button
                onClick={() => setEditingPoint(null)}
                className="text-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPoint} className="mt-4 space-y-3 text-[13px]">
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  Point Title *
                </label>
                <input
                  type="text"
                  value={editPointTitle}
                  onChange={(e) => setEditPointTitle(e.target.value)}
                  required
                  className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  value={editPointDesc}
                  onChange={(e) => setEditPointDesc(e.target.value)}
                  rows={2}
                  className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">
                    Priority
                  </label>
                  <select
                    value={editPointPriority}
                    onChange={(e) => setEditPointPriority(e.target.value as PointPriority)}
                    className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">
                    Owner
                  </label>
                  <select
                    value={editPointOwnerId}
                    onChange={(e) => setEditPointOwnerId(e.target.value)}
                    className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {masters.users?.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-border">
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingPoint(null)}
                >
                  Cancel
                </AppButton>
                <AppButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isPending}
                >
                  Save Point
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Closure Remarks Modal (Spec P6) */}
      {closingPoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-[15px] font-semibold text-heading flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success-text" /> Close Point ({closingPoint.code})
              </h3>
              <button
                onClick={() => setClosingPoint(null)}
                className="text-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmClosure} className="mt-4 space-y-3 text-[13px]">
              <p className="text-[12px] text-muted">
                Per governance policy (Spec P6), closing a point requires official closure remarks and automatically completes any child tasks within TAT.
              </p>

              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  Closure Remarks / Outcome *
                </label>
                <textarea
                  value={closureRemarks}
                  onChange={(e) => setClosureRemarks(e.target.value)}
                  required
                  rows={3}
                  placeholder="State the resolution, committee decision, or outcome..."
                  className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-border">
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setClosingPoint(null)}
                >
                  Cancel
                </AppButton>
                <AppButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isPending}
                >
                  Confirm & Close Point
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Draggable High-Visibility Floating Live Notes Action Widget */}
      {isOpen && <DraggableLiveNotesWidget sessionId={session.id} />}
    </div>
  );
}
