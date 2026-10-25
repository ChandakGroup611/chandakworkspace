"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Calendar,
  Users,
  Video,
  Clock,
  ArrowRight,
  Shield,
  CheckCircle2,
  FileText,
  RotateCcw,
  Plus,
  Edit,
  Trash2,
  X,
  AlertTriangle,
  Filter,
  Search,
} from "lucide-react";
import { StatusBadge } from "@/components/meet/StatusBadge";
import { AppButton } from "@/components/ui/AppButton";
import { createSessionForMeeting } from "@/lib/actions/meet/sessions";
import { updateMeeting, addMeetingMember, removeMeetingMember } from "@/lib/actions/meet/meetings";
import { toast } from "react-toastify";
import type { MeetingSeries, MeetingSession } from "@/types/meet";

interface MeetingDetailTabsProps {
  meeting: MeetingSeries;
  sessions: MeetingSession[];
  masters?: {
    users?: any[];
    rooms?: any[];
    categories?: any[];
  };
  initialPoints?: any[];
}

export default function MeetingDetailTabs({
  meeting,
  sessions: initialSessions,
  masters,
  initialPoints = [],
}: MeetingDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<"sessions" | "members" | "points" | "settings">("sessions");
  const [sessions, setSessions] = useState<MeetingSession[]>(initialSessions);
  const [members, setMembers] = useState<any[]>(meeting.members || []);
  const [points, setPoints] = useState<any[]>(initialPoints);
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [isScheduleSessionOpen, setIsScheduleSessionOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isEditSeriesOpen, setIsEditSeriesOpen] = useState(false);

  // Schedule Session Form
  const [sessionStartDate, setSessionStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [sessionStartTime, setSessionStartTime] = useState(meeting.default_start_time?.slice(0, 5) || "10:00");
  const [sessionDuration, setSessionDuration] = useState(meeting.default_duration_minutes || 60);
  const [sessionRoomId, setSessionRoomId] = useState(meeting.room_id || "");
  const [sessionVideoLink, setSessionVideoLink] = useState(meeting.video_link || "");

  // Add Member Form
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("attendee");

  // Edit Series Form
  const [editTitle, setEditTitle] = useState(meeting.title);
  const [editDesc, setEditDesc] = useState(meeting.description || "");
  const [editRecurrence, setEditRecurrence] = useState(meeting.recurrence);
  const [editOrganizerId, setEditOrganizerId] = useState(meeting.organizer_id);
  const [editRoomId, setEditRoomId] = useState(meeting.room_id || "");
  const [editDuration, setEditDuration] = useState(meeting.default_duration_minutes || 60);

  // Points filter
  const [pointSearch, setPointSearch] = useState("");
  const [pointStatusFilter, setPointStatusFilter] = useState("all");

  const filteredPoints = points.filter((pt) => {
    if (pointStatusFilter !== "all") {
      if (pointStatusFilter === "carried") {
        if (!pt.carry_forward_count || pt.carry_forward_count < 3) return false;
      } else if (pt.status !== pointStatusFilter) {
        return false;
      }
    }
    if (pointSearch) {
      const q = pointSearch.toLowerCase();
      const matchTitle = pt.title?.toLowerCase().includes(q);
      const matchCode = pt.code?.toLowerCase().includes(q);
      const matchOwner = pt.owner?.full_name?.toLowerCase().includes(q);
      if (!matchTitle && !matchCode && !matchOwner) return false;
    }
    return true;
  });

  const handleScheduleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const scheduledStart = `${sessionStartDate}T${sessionStartTime}:00`;
        const res = await createSessionForMeeting({
          meetingId: meeting.id,
          scheduledStart,
          durationMinutes: Number(sessionDuration),
          roomId: sessionRoomId || undefined,
          videoLink: sessionVideoLink || undefined,
        });

        if (res.success && res.session) {
          toast.success("Session scheduled successfully!");
          setSessions((prev) => [res.session, ...prev]);
          setIsScheduleSessionOpen(false);
        } else {
          toast.error(res.error || "Failed to schedule session");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to schedule session");
      }
    });
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.warn("Please select a team member");
      return;
    }

    startTransition(async () => {
      try {
        const res = await addMeetingMember({
          meetingId: meeting.id,
          userId: selectedUserId,
          role: selectedRole,
        });

        if (res.success && res.member) {
          toast.success("Standing member added");
          setMembers((prev) => [...prev, res.member]);
          setIsAddMemberOpen(false);
          setSelectedUserId("");
        } else {
          toast.error(res.error || "Failed to add member");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to add member");
      }
    });
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member from the standing roster?")) return;

    startTransition(async () => {
      try {
        const res = await removeMeetingMember(memberId, meeting.id);
        if (res.success) {
          toast.success("Member removed");
          setMembers((prev) => prev.filter((m) => m.id !== memberId));
        } else {
          toast.error(res.error || "Failed to remove member");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to remove member");
      }
    });
  };

  const handleEditSeriesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await updateMeeting({
          meetingId: meeting.id,
          title: editTitle,
          description: editDesc,
          recurrence: editRecurrence,
          organizerId: editOrganizerId,
          roomId: editRoomId || undefined,
          defaultDurationMinutes: Number(editDuration),
        });

        if (res.success) {
          toast.success("Meeting series details updated");
          setIsEditSeriesOpen(false);
          window.location.reload();
        } else {
          toast.error(res.error || "Failed to update series");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to update series");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Tab bar with Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border gap-2">
        <div className="flex items-center gap-1 text-[13px] font-medium overflow-x-auto">
          <button
            onClick={() => setActiveTab("sessions")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors whitespace-nowrap ${
              activeTab === "sessions"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Calendar className="h-4 w-4" />
            Sessions ({sessions.length})
          </button>

          <button
            onClick={() => setActiveTab("members")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors whitespace-nowrap ${
              activeTab === "members"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            Standing Members ({members.length})
          </button>

          <button
            onClick={() => setActiveTab("points")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors whitespace-nowrap ${
              activeTab === "points"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <FileText className="h-4 w-4" />
            All Points ({points.length})
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors whitespace-nowrap ${
              activeTab === "settings"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Shield className="h-4 w-4" />
            Rules & Governance
          </button>
        </div>

        {/* Tab-specific contextual Action buttons */}
        <div className="flex items-center gap-2 pb-2 sm:pb-0">
          {activeTab === "sessions" && (
            <AppButton
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setIsScheduleSessionOpen(true)}
            >
              Schedule Session
            </AppButton>
          )}

          {activeTab === "members" && (
            <AppButton
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setIsAddMemberOpen(true)}
            >
              Add Member
            </AppButton>
          )}

          {activeTab === "settings" && (
            <AppButton
              variant="outline"
              size="sm"
              leftIcon={<Edit className="h-3.5 w-3.5" />}
              onClick={() => setIsEditSeriesOpen(true)}
            >
              Edit Series
            </AppButton>
          )}
        </div>
      </div>

      {/* Tab 1: Sessions */}
      {activeTab === "sessions" && (
        <div className="theme-card-structural overflow-hidden">
          {sessions.length === 0 ? (
            <div className="p-8 text-center text-muted">
              <Calendar className="mx-auto h-7 w-7 text-muted mb-2" />
              <p className="text-[13.5px] font-medium text-foreground">No sessions scheduled yet</p>
              <div className="mt-3">
                <AppButton
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => setIsScheduleSessionOpen(true)}
                >
                  Schedule First Session
                </AppButton>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-border bg-sunken/40 text-[11.5px] uppercase font-semibold text-muted">
                  <tr>
                    <th className="py-2.5 px-4">Session Code</th>
                    <th className="py-2.5 px-4">Scheduled Start</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Points Summary</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sessions.map((session) => {
                    const startFormatted = new Date(session.scheduled_start).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <tr key={session.id} className="hover:bg-sunken/20 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-primary">
                          <Link href={`/meet/sessions/${session.id}`} className="hover:underline">
                            {session.code}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-foreground">{startFormatted}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={session.status} type="session" />
                        </td>
                        <td className="py-3 px-4 text-muted">
                          <span className="text-foreground font-medium">{session.closed_points_count || 0}</span> closed /{" "}
                          <span className="text-foreground font-medium">{session.points_count || 0}</span> discussed
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <Link href={`/meet/live/${session.id}`}>
                              <AppButton variant="secondary" size="sm" leftIcon={<Video className="h-3 w-3" />}>
                                Live
                              </AppButton>
                            </Link>
                            <Link href={`/meet/sessions/${session.id}`}>
                              <AppButton variant="outline" size="sm" rightIcon={<ArrowRight className="h-3 w-3" />}>
                                Workspace
                              </AppButton>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Members */}
      {activeTab === "members" && (
        <div className="theme-card-structural p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-semibold text-heading">Roster of Standing Attendees</h3>
            <AppButton
              variant="outline"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setIsAddMemberOpen(true)}
            >
              Add Member
            </AppButton>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-[12px]">
                    {(m.user?.full_name || m.guest_name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-[13px] font-medium text-foreground">
                      {m.user?.full_name || m.guest_name}
                    </h4>
                    <span className="text-[11.5px] text-muted capitalize">
                      {m.role?.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveMember(m.id)}
                  title="Remove from roster"
                  className="p-1 text-muted hover:text-danger-text transition-colors rounded"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: All Points of Meeting Series (Spec P10) */}
      {activeTab === "points" && (
        <div className="space-y-3">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
              {(["all", "open", "in_progress", "on_hold", "closed", "carried"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setPointStatusFilter(st)}
                  className={`rounded-md px-2.5 py-1 font-medium border capitalize transition-colors ${
                    pointStatusFilter === st
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-surface text-subtle border-border hover:bg-sunken"
                  }`}
                >
                  {st === "carried" ? "Carried 3x+" : st.replace("_", " ")}
                </button>
              ))}
            </div>

            <div className="relative max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
              <input
                type="text"
                value={pointSearch}
                onChange={(e) => setPointSearch(e.target.value)}
                placeholder="Search points..."
                className="w-full rounded-md border border-border bg-surface pl-8 pr-2.5 py-1.5 text-[12.5px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {filteredPoints.length === 0 ? (
            <div className="theme-card-structural p-8 text-center text-muted">
              <FileText className="mx-auto h-7 w-7 text-muted mb-2" />
              <p className="text-[13.5px] font-medium text-foreground">No points matching criteria</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPoints.map((pt) => (
                <div key={pt.id} className="theme-card-structural p-3.5 hover:border-border-active transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          {pt.code}
                        </span>
                        {pt.carry_forward_count > 0 && (
                          <span className="inline-flex items-center gap-1 rounded bg-warning-soft px-1.5 py-0.5 text-[10.5px] font-medium text-warning-text border border-warning-border">
                            <RotateCcw className="h-2.5 w-2.5" /> {pt.carry_forward_count}x carried
                          </span>
                        )}
                        <StatusBadge status={pt.status} />
                        <StatusBadge status={pt.priority} type="priority" />
                      </div>
                      <h4 className="text-[13.5px] font-semibold text-heading">{pt.title}</h4>
                      {pt.description && (
                        <p className="text-[12px] text-muted line-clamp-1">{pt.description}</p>
                      )}
                    </div>

                    <div className="text-right text-[11.5px] text-muted shrink-0">
                      <div>Owner: <strong className="text-foreground">{pt.owner?.full_name || "Unassigned"}</strong></div>
                      <div>Due: <span className="font-medium text-foreground">{pt.due_date || "—"}</span></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Governance Settings */}
      {activeTab === "settings" && (
        <div className="theme-card-structural p-5 space-y-4 text-[13px] text-foreground">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-heading">Meeting Policies & Governance</h3>
            <AppButton
              variant="outline"
              size="sm"
              leftIcon={<Edit className="h-3.5 w-3.5" />}
              onClick={() => setIsEditSeriesOpen(true)}
            >
              Edit Series Details
            </AppButton>
          </div>

          <ul className="space-y-2 text-subtle">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success-text shrink-0" />
              <span>
                <strong>Pre-update reminders:</strong> {meeting.pre_update_enabled ? "Enabled (sent 24h prior to review)" : "Disabled"}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success-text shrink-0" />
              <span>
                <strong>Attendee point creation:</strong> {meeting.allow_attendees_add_points ? "Permitted" : "Restricted to organizer/chair"}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success-text shrink-0" />
              <span>
                <strong>Chair MoM approval:</strong> {meeting.requires_mom_approval ? "Required prior to publishing" : "Auto-publish by organizer permitted"}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success-text shrink-0" />
              <span>
                <strong>Confidentiality:</strong> {meeting.is_confidential ? "Restricted (Strict RLS)" : "Public within Department"}
              </span>
            </li>
          </ul>
        </div>
      )}

      {/* Schedule Session Modal */}
      {isScheduleSessionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-[15px] font-semibold text-heading">Schedule Session</h3>
              <button
                onClick={() => setIsScheduleSessionOpen(false)}
                className="text-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleSessionSubmit} className="mt-4 space-y-3 text-[13px]">
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={sessionStartDate}
                  onChange={(e) => setSessionStartDate(e.target.value)}
                  required
                  className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={sessionStartTime}
                    onChange={(e) => setSessionStartTime(e.target.value)}
                    required
                    className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">
                    Duration (mins) *
                  </label>
                  <input
                    type="number"
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(Number(e.target.value))}
                    min={15}
                    step={15}
                    required
                    className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  Meeting Room
                </label>
                <select
                  value={sessionRoomId}
                  onChange={(e) => setSessionRoomId(e.target.value)}
                  className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">No Room Selected</option>
                  {masters?.rooms?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  Video Link (Optional)
                </label>
                <input
                  type="url"
                  value={sessionVideoLink}
                  onChange={(e) => setSessionVideoLink(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-border">
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsScheduleSessionOpen(false)}
                >
                  Cancel
                </AppButton>
                <AppButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isPending}
                >
                  Schedule Session
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-[15px] font-semibold text-heading">Add Standing Member</h3>
              <button
                onClick={() => setIsAddMemberOpen(false)}
                className="text-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddMemberSubmit} className="mt-4 space-y-3 text-[13px]">
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  Team Member *
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                  className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">Select team member...</option>
                  {masters?.users?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  Roster Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="attendee">Attendee</option>
                  <option value="chair">Chairperson</option>
                  <option value="minute_taker">Minute Taker</option>
                  <option value="required">Required Attendee</option>
                  <option value="optional">Optional Spectator</option>
                </select>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-border">
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddMemberOpen(false)}
                >
                  Cancel
                </AppButton>
                <AppButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isPending}
                >
                  Add to Roster
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Series Modal */}
      {isEditSeriesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-[15px] font-semibold text-heading">Edit Meeting Series</h3>
              <button
                onClick={() => setIsEditSeriesOpen(false)}
                className="text-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSeriesSubmit} className="mt-4 space-y-3 text-[13px]">
              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  Series Title *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">
                    Recurrence
                  </label>
                  <select
                    value={editRecurrence}
                    onChange={(e) => setEditRecurrence(e.target.value as any)}
                    className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="none">None (Ad-hoc)</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-foreground mb-1">
                    Default Duration (min)
                  </label>
                  <input
                    type="number"
                    value={editDuration}
                    onChange={(e) => setEditDuration(Number(e.target.value))}
                    min={15}
                    step={15}
                    className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  Organizer
                </label>
                <select
                  value={editOrganizerId}
                  onChange={(e) => setEditOrganizerId(e.target.value)}
                  className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                >
                  {masters?.users?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-foreground mb-1">
                  Default Room
                </label>
                <select
                  value={editRoomId}
                  onChange={(e) => setEditRoomId(e.target.value)}
                  className="w-full rounded border border-border bg-background px-3 py-1.5 text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">No Default Room</option>
                  {masters?.rooms?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.location})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-border">
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditSeriesOpen(false)}
                >
                  Cancel
                </AppButton>
                <AppButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isPending}
                >
                  Save Changes
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
