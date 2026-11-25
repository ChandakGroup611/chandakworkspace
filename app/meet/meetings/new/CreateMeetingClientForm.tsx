"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createMeeting, updateMeeting } from "@/lib/actions/meet/meetings";
import {
  RecordModeProvider,
  RecordFieldset,
  RecordFormActions,
  CreateOnly,
  EditOnly,
  recordCreatedHref,
  type RecordMode,
} from "@/components/ui/record";
import { toast } from "react-toastify";
import {
  Calendar,
  Clock,
  Video,
  Users,
  MapPin,
  CheckCircle2,
  Layers,
  Shield,
  FileCheck2,
  Sparkles,
  ExternalLink,
  Copy,
  Loader2,
} from "lucide-react";
import type { MeetingType, MeetingRoom, MeetingTemplate, MeetingSeries } from "@/types/meet";

interface CreateMeetingClientFormProps {
  masters: {
    types: MeetingType[];
    categories: any[];
    rooms: MeetingRoom[];
    templates: MeetingTemplate[];
    departments: any[];
    users: any[];
    projects?: any[];
  };
  /** create (default) · view (same form, read-only) · edit (same form, pre-filled) */
  recordMode?: RecordMode;
  /** The saved series, required for view / edit. */
  meeting?: MeetingSeries;
  /** Whether the viewer may edit (shows the Edit button in view mode). */
  canEdit?: boolean;
}

const SYNCED_MEMBER_ROLES = ["required", "attendee"];

/**
 * Meeting series form. The same component creates, shows and edits a series so the
 * user sees a saved series exactly the way they filled it in.
 */
export default function CreateMeetingClientForm({ masters, recordMode = "create", meeting, canEdit = true }: CreateMeetingClientFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const m = recordMode === "create" ? undefined : meeting;

  // Form states (seeded from the saved series in view / edit)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(m?.template_id || "");
  const [title, setTitle] = useState(m?.title || "");
  const [description, setDescription] = useState(m?.description || "");
  const [projectId, setProjectId] = useState(m?.project_id || "");
  const [meetingTypeId, setMeetingTypeId] = useState(m?.meeting_type_id || masters.types[0]?.id || "");
  const [departmentId, setDepartmentId] = useState(m?.department_id || "");
  const [organizerId, setOrganizerId] = useState(m?.organizer_id || masters.users[0]?.id || "");
  const [chairId, setChairId] = useState(m?.chair_id || "");
  const [minuteTakerId, setMinuteTakerId] = useState(m?.default_minute_taker_id || "");
  const [mode, setMode] = useState<"in_person" | "online" | "hybrid">((m?.mode as any) || "hybrid");
  const [roomId, setRoomId] = useState(m?.room_id || "");
  const [videoProvider, setVideoProvider] = useState<"none" | "google_meet" | "teams" | "zoom">((m?.video_provider as any) || "google_meet");
  const [videoLink, setVideoLink] = useState(m?.video_link || "");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState(m?.default_start_time || "10:00:00");
  const [duration, setDuration] = useState(m?.default_duration_minutes || 60);
  const [recurrence, setRecurrence] = useState<"none" | "daily" | "weekly" | "biweekly" | "monthly">((m?.recurrence as any) || "weekly");
  const [allowAddPoints, setAllowAddPoints] = useState(m?.allow_attendees_add_points ?? true);
  const [isConfidential, setIsConfidential] = useState(m?.is_confidential ?? false);
  const [requiresMomApproval, setRequiresMomApproval] = useState(m?.requires_mom_approval ?? false);
  const [preUpdateEnabled, setPreUpdateEnabled] = useState(m?.pre_update_enabled ?? true);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    () =>
      (m?.members || [])
        .filter((mb: any) => mb.user?.id && SYNCED_MEMBER_ROLES.includes(mb.role))
        .map((mb: any) => mb.user.id as string)
  );
  const [generatingLink, setGeneratingLink] = useState(false);

  const handleGenerateTeamsLink = async () => {
    setGeneratingLink(true);
    try {
      const { generateTeamsMeetingLink } = await import("@/lib/integrations/microsoft-teams");

      const attendeeEmails: string[] = [];
      const org = masters.users.find((u) => u.id === organizerId);
      if (org?.email) attendeeEmails.push(org.email);
      const ch = masters.users.find((u) => u.id === chairId);
      if (ch?.email && !attendeeEmails.includes(ch.email)) attendeeEmails.push(ch.email);

      for (const uid of selectedUserIds) {
        const u = masters.users.find((usr) => usr.id === uid);
        if (u?.email && !attendeeEmails.includes(u.email)) attendeeEmails.push(u.email);
      }

      const scheduledStart = `${startDate}T${startTime}`;
      const endDt = new Date(new Date(scheduledStart).getTime() + duration * 60 * 1000);
      const scheduledEnd = endDt.toISOString().replace(/\.\d{3}Z$/, "");

      const link = await generateTeamsMeetingLink({
        title: title.trim() || "Team Review",
        description: description.trim(),
        scheduledStart,
        scheduledEnd,
        organizerId,
        organizerEmail: org?.email,
        attendeeEmails,
        callType: "meeting",
      });

      setVideoLink(link);
      toast.success("Microsoft Teams meeting link generated with all parameters!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate Teams link");
    } finally {
      setGeneratingLink(false);
    }
  };

  // Apply template pre-fill
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const tpl = masters.templates.find((t) => t.id === templateId);
    if (tpl) {
      setTitle(tpl.name.replace(" Template", ""));
      setDescription(tpl.description || "");
      if (tpl.meeting_type_id) setMeetingTypeId(tpl.meeting_type_id);
      if (tpl.default_duration) setDuration(tpl.default_duration);
      toast.info(`Pre-filled from ${tpl.name}`);
    }
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.warn("Please enter a meeting title");
      return;
    }
    if (!organizerId) {
      toast.warn("Please select a meeting organizer");
      return;
    }

    if (recordMode === "view") return;

    if (recordMode === "edit" && meeting) {
      try {
        setSubmitting(true);
        const res = await updateMeeting({
          meetingId: meeting.id,
          title: title.trim(),
          description: description.trim(),
          projectId,
          meetingTypeId,
          departmentId,
          organizerId,
          chairId,
          minuteTakerId,
          mode,
          roomId,
          videoProvider,
          videoLink: videoLink.trim(),
          defaultStartTime: startTime,
          defaultDurationMinutes: duration,
          recurrence,
          allowAttendeesAddPoints: allowAddPoints,
          isConfidential,
          requiresMomApproval,
          preUpdateEnabled,
          attendeeUserIds: selectedUserIds,
        });
        if (res.success) {
          toast.success(`${meeting.code} updated`);
          router.push(`/meet/meetings/${meeting.id}?tab=details`);
          router.refresh();
        } else {
          toast.error(res.error || "Failed to update meeting series");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to update meeting series");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      setSubmitting(true);

      const members = selectedUserIds.map((uid) => ({
        user_id: uid,
        role: "required",
      }));

      let effectiveLink = videoLink.trim();
      if (!effectiveLink && mode !== "in_person") {
        try {
          const { generateTeamsMeetingLink } = await import("@/lib/integrations/microsoft-teams");
          const attendeeEmails: string[] = [];
          const org = masters.users.find((u) => u.id === organizerId);
          if (org?.email) attendeeEmails.push(org.email);
          const ch = masters.users.find((u) => u.id === chairId);
          if (ch?.email && !attendeeEmails.includes(ch.email)) attendeeEmails.push(ch.email);

          for (const uid of selectedUserIds) {
            const u = masters.users.find((usr) => usr.id === uid);
            if (u?.email && !attendeeEmails.includes(u.email)) attendeeEmails.push(u.email);
          }

          const scheduledStart = `${startDate}T${startTime}`;
          const endDt = new Date(new Date(scheduledStart).getTime() + duration * 60 * 1000);
          const scheduledEnd = endDt.toISOString().replace(/\.\d{3}Z$/, "");

          effectiveLink = await generateTeamsMeetingLink({
            title: title.trim() || "Team Review",
            description: description.trim(),
            scheduledStart,
            scheduledEnd,
            organizerId,
            organizerEmail: org?.email,
            attendeeEmails,
            callType: "meeting",
          });
        } catch {
          // ignore fallback
        }
      }

      const res = await createMeeting({
        title: title.trim(),
        description: description.trim() || undefined,
        project_id: projectId || undefined,
        meeting_type_id: meetingTypeId,
        department_id: departmentId || undefined,
        template_id: selectedTemplateId || undefined,
        organizer_id: organizerId,
        chair_id: chairId || undefined,
        default_minute_taker_id: minuteTakerId || undefined,
        mode,
        room_id: roomId || undefined,
        video_provider: videoProvider,
        video_link: effectiveLink || undefined,
        start_date: startDate,
        default_start_time: startTime,
        default_duration_minutes: duration,
        recurrence,
        allow_attendees_add_points: allowAddPoints,
        is_confidential: isConfidential,
        requires_mom_approval: requiresMomApproval,
        pre_update_enabled: preUpdateEnabled,
        members,
      });

      if (res.success && res.meetingId) {
        // Record standard: land on the list with the new series highlighted.
        toast.success("Meeting series scheduled and first session created");
        router.push(recordCreatedHref("/meet/meetings", res.meetingId));
      } else {
        toast.error(res.error || "Failed to schedule meeting");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create meeting");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RecordModeProvider mode={recordMode}>
    <form onSubmit={handleSubmit} className="space-y-6">
      <RecordFieldset className="space-y-6">
      {/* Template Selection Quick Cards (only while creating) */}
      <CreateOnly>
      <div className="theme-card-structural p-5">
        <label className="block text-[13.5px] font-semibold text-heading mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          Choose a Pre-configured Template (Optional)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => handleTemplateSelect("")}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              !selectedTemplateId
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border bg-surface hover:border-border-active"
            }`}
          >
            <span className="font-semibold text-[13px] text-foreground">Blank Custom Meeting</span>
            <p className="mt-1 text-[11.5px] text-muted">Configure agenda and rules from scratch</p>
          </button>

          {masters.templates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleTemplateSelect(tpl.id)}
              className={`p-3.5 rounded-lg border text-left transition-all ${
                selectedTemplateId === tpl.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-surface hover:border-border-active"
              }`}
            >
              <span className="font-semibold text-[13px] text-foreground line-clamp-1">{tpl.name}</span>
              <p className="mt-1 text-[11.5px] text-muted line-clamp-2">{tpl.description || "Standard agenda items pre-loaded"}</p>
            </button>
          ))}
        </div>
      </div>
      </CreateOnly>

      {/* Basic Meeting Information */}
      <div className="theme-card-structural p-5 space-y-4">
        <h2 className="text-[14px] font-semibold text-heading border-b border-border pb-2">
          Series Information
        </h2>

        <div>
          <label className="block text-[12.5px] font-medium text-foreground mb-1">
            Meeting Series Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Weekly Operations & Maintenance Review"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[12.5px] font-medium text-foreground mb-1">
              Meeting Type *
            </label>
            <select
              value={meetingTypeId}
              onChange={(e) => setMeetingTypeId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-primary focus:outline-none"
            >
              {masters.types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[12.5px] font-medium text-foreground mb-1">
              Project / Site (Optional)
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">None / Corporate Portfolio</option>
              {(masters.projects || []).map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.code ? `[${p.code}] ` : ""}{p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[12.5px] font-medium text-foreground mb-1">
              Department (Scope)
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">General / Cross-Departmental</option>
              {masters.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[12.5px] font-medium text-foreground mb-1">
            Description & Purpose
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Review scope, expected deliverables and objective of this series..."
            className="w-full rounded-md border border-border bg-background p-2.5 text-[13px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Recurrence & Schedule */}
      <div className="theme-card-structural p-5 space-y-4">
        <h2 className="text-[14px] font-semibold text-heading border-b border-border pb-2 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Schedule & Recurrence
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-[12.5px] font-medium text-foreground mb-1">
              Recurrence
            </label>
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as any)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-primary focus:outline-none"
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every 2 Weeks</option>
              <option value="monthly">Monthly</option>
              <option value="daily">Daily</option>
              <option value="none">One-off / None</option>
            </select>
          </div>

          <CreateOnly>
          <div>
            <label className="block text-[12.5px] font-medium text-foreground mb-1">
              First Session Date
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          </CreateOnly>

          <div>
            <label className="block text-[12.5px] font-medium text-foreground mb-1">
              Start Time
            </label>
            <input
              type="time"
              required
              value={startTime.slice(0, 5)}
              onChange={(e) => setStartTime(`${e.target.value}:00`)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[12.5px] font-medium text-foreground mb-1">
              Duration (Minutes)
            </label>
            <input
              type="number"
              min={15}
              max={240}
              step={15}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10) || 60)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Venue & Video Link */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-[12.5px] font-medium text-foreground mb-1">
              Meeting Mode
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-primary focus:outline-none"
            >
              <option value="hybrid">Hybrid (Room + Video)</option>
              <option value="in_person">In-Person Only</option>
              <option value="online">Online / Video Only</option>
            </select>
          </div>

          <div>
            <label className="block text-[12.5px] font-medium text-foreground mb-1">
              Room / Location (Live Availability)
            </label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">No room assigned</option>
              {masters.rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.capacity} pax) · Free
                </option>
              ))}
            </select>
            {roomId && (
              <span className="text-[11px] text-success-text font-medium mt-1 inline-flex items-center gap-1">
                ✓ Available for this time slot (M365 Free)
              </span>
            )}
          </div>
        </div>

        {mode !== "in_person" && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-primary shrink-0" />
                <span className="text-[13px] font-semibold text-foreground">Microsoft Teams Meeting Link</span>
                <span className="text-[11px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                  Direct Teams Parameters
                </span>
              </div>
              <EditOnly>
              <button
                type="button"
                onClick={handleGenerateTeamsLink}
                disabled={generatingLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white text-[12px] font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {generatingLink ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                <span>{videoLink ? "Regenerate Teams Link" : "Generate Teams Meeting Link"}</span>
              </button>
              </EditOnly>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="url"
                value={videoLink}
                onChange={(e) => setVideoLink(e.target.value)}
                placeholder="Click 'Generate Teams Meeting Link' or it will auto-generate upon saving..."
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-[12px] font-mono text-foreground focus:border-primary focus:outline-none"
              />
              {videoLink && (
                <>
                  <a
                    href={videoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#4B53BC]/40 bg-[#4B53BC]/10 hover:bg-[#4B53BC]/20 text-[#4B53BC] dark:text-[#8B93FF] text-[12px] font-semibold transition-colors shrink-0"
                    title="Test opening in Microsoft Teams with meeting parameters"
                  >
                    <span>Test Link</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(videoLink);
                      toast.success("Meeting link copied to clipboard!");
                    }}
                    className="p-2 rounded-md border border-border bg-surface hover:bg-surface-hover text-muted hover:text-foreground transition-colors shrink-0 cursor-pointer"
                    title="Copy link"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              Pre-populates Microsoft Teams with subject, attendees, scheduled start/end times, and description. Clicking opens Teams directly with all meeting parameters ready.
            </p>
          </div>
        )}
      </div>

      {/* Roles & Standing Members */}
      <div className="theme-card-structural p-5 space-y-4">
        <h2 className="text-[14px] font-semibold text-heading border-b border-border pb-2 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Roles & Standing Attendees
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[12.5px] font-medium text-foreground mb-1">
              Organizer (Series Owner) *
            </label>
            <select
              required
              value={organizerId}
              onChange={(e) => setOrganizerId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-primary focus:outline-none"
            >
              {masters.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.user_code || "Staff"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[12.5px] font-medium text-foreground mb-1">
              Chairperson (Optional)
            </label>
            <select
              value={chairId}
              onChange={(e) => setChairId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">No chair assigned</option>
              {masters.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[12.5px] font-medium text-foreground mb-1">
              Minute Taker (Optional)
            </label>
            <select
              value={minuteTakerId}
              onChange={(e) => setMinuteTakerId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">Organizer handles minutes</option>
              {masters.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Attendees selection */}
        <div>
          <label className="block text-[12.5px] font-medium text-foreground mb-1.5">
            Standing Attendees ({selectedUserIds.length} selected)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto rounded-lg border border-border bg-background p-3">
            {masters.users.map((u) => {
              const checked = selectedUserIds.includes(u.id);
              return (
                <label
                  key={u.id}
                  className={`flex items-center gap-2 rounded px-2.5 py-1.5 text-[12.5px] cursor-pointer transition-colors ${
                    checked ? "bg-primary/10 text-primary font-medium" : "text-subtle hover:bg-sunken"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggleUser(u.id)}
                    className="h-3.5 w-3.5 rounded border-border"
                  />
                  <span className="line-clamp-1">{u.full_name}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Governance & Policies */}
      <div className="theme-card-structural p-5 space-y-3">
        <h2 className="text-[14px] font-semibold text-heading border-b border-border pb-2 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Governance & Permissions
        </h2>

        <div className="space-y-2.5 pt-1">
          <label className="flex items-center gap-2.5 text-[13px] text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={preUpdateEnabled}
              onChange={(e) => setPreUpdateEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <span>Send pre-meeting update requests to point owners 24h before sessions</span>
          </label>

          <label className="flex items-center gap-2.5 text-[13px] text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={allowAddPoints}
              onChange={(e) => setAllowAddPoints(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <span>Allow regular attendees to raise discussion points during meetings</span>
          </label>

          <label className="flex items-center gap-2.5 text-[13px] text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={requiresMomApproval}
              onChange={(e) => setRequiresMomApproval(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <span>Require Chairperson approval before MoM can be published</span>
          </label>

          <label className="flex items-center gap-2.5 text-[13px] text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={isConfidential}
              onChange={(e) => setIsConfidential(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <span>Mark series as confidential (restricted to named roster only)</span>
          </label>
        </div>
      </div>

      </RecordFieldset>

      {/* Standard record actions: create → Cancel / Create · view → Back / Edit · edit → Cancel / Save */}
      <RecordFormActions
        entity="meeting series"
        submitLabel={recordMode === "create" ? (submitting ? "Scheduling…" : "Schedule meeting series") : undefined}
        submitting={submitting}
        canEdit={canEdit}
        listHref="/meet/meetings"
        cancelHref={meeting && recordMode === "edit" ? `/meet/meetings/${meeting.id}?tab=details` : "/meet/meetings"}
        editHref={meeting ? `/meet/meetings/${meeting.id}/edit` : undefined}
        className="theme-card-structural"
      />
    </form>
    </RecordModeProvider>
  );
}
