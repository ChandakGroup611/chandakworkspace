"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppButton } from "@/components/ui/AppButton";
import { createMeeting } from "@/lib/actions/meet/meetings";
import { toast } from "react-toastify";
import {
  Calendar,
  Clock,
  Video,
  Users,
  MapPin,
  CheckCircle2,
  Layers,
  ArrowRight,
  Shield,
  FileCheck2,
} from "lucide-react";
import type { MeetingType, MeetingRoom, MeetingTemplate } from "@/types/meet";

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
}

export default function CreateMeetingClientForm({ masters }: CreateMeetingClientFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [meetingTypeId, setMeetingTypeId] = useState(masters.types[0]?.id || "");
  const [departmentId, setDepartmentId] = useState("");
  const [organizerId, setOrganizerId] = useState(masters.users[0]?.id || "");
  const [chairId, setChairId] = useState("");
  const [minuteTakerId, setMinuteTakerId] = useState("");
  const [mode, setMode] = useState<"in_person" | "online" | "hybrid">("hybrid");
  const [roomId, setRoomId] = useState("");
  const [videoProvider, setVideoProvider] = useState<"none" | "google_meet" | "teams" | "zoom">("google_meet");
  const [videoLink, setVideoLink] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("10:00:00");
  const [duration, setDuration] = useState(60);
  const [recurrence, setRecurrence] = useState<"none" | "daily" | "weekly" | "biweekly" | "monthly">("weekly");
  const [allowAddPoints, setAllowAddPoints] = useState(true);
  const [isConfidential, setIsConfidential] = useState(false);
  const [requiresMomApproval, setRequiresMomApproval] = useState(false);
  const [preUpdateEnabled, setPreUpdateEnabled] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

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

    try {
      setSubmitting(true);

      const members = selectedUserIds.map((uid) => ({
        user_id: uid,
        role: "required",
      }));

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
        video_link: videoLink.trim() || undefined,
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

      if (res.success && res.sessionId) {
        toast.success("Meeting series scheduled and Session S-001 created!");
        router.push(`/meet/sessions/${res.sessionId}`);
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Template Selection Quick Cards */}
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
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
              <span className="text-[11px] text-emerald-400 font-medium mt-1 inline-flex items-center gap-1">
                ✓ Available for this time slot (M365 Free)
              </span>
            )}
          </div>

          <div>
            <label className="block text-[12.5px] font-medium text-foreground mb-1">
              Video Call Link (Google Meet / Teams)
            </label>
            <input
              type="url"
              value={videoLink}
              onChange={(e) => setVideoLink(e.target.value)}
              placeholder="https://meet.google.com/xyz-abc"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
            />
          </div>
        </div>
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

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <AppButton
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.back()}
          disabled={submitting}
        >
          Cancel
        </AppButton>
        <AppButton
          type="submit"
          variant="primary"
          size="lg"
          isLoading={submitting}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          {submitting ? "Scheduling…" : "Schedule Meeting Series"}
        </AppButton>
      </div>
    </form>
  );
}
