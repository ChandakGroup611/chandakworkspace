"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { StatusBadge } from "@/components/meet/StatusBadge";
import { AppButton } from "@/components/ui/AppButton";
import type { MeetingSeries, MeetingSession } from "@/types/meet";

interface MeetingDetailTabsProps {
  meeting: MeetingSeries;
  sessions: MeetingSession[];
}

export default function MeetingDetailTabs({ meeting, sessions }: MeetingDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<"sessions" | "members" | "settings">("sessions");

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border text-[13px] font-medium">
        <button
          onClick={() => setActiveTab("sessions")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
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
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
            activeTab === "members"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          Standing Members ({meeting.members?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
            activeTab === "settings"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          <Shield className="h-4 w-4" />
          Rules & Governance
        </button>
      </div>

      {/* Tab 1: Sessions */}
      {activeTab === "sessions" && (
        <div className="theme-card-structural overflow-hidden">
          {sessions.length === 0 ? (
            <div className="p-8 text-center text-muted">
              <Calendar className="mx-auto h-7 w-7 text-muted mb-2" />
              <p className="text-[13.5px] font-medium text-foreground">No sessions generated yet</p>
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
          <h3 className="text-[14px] font-semibold text-heading mb-3">Roster of Standing Attendees</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {meeting.members?.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-[12px]">
                  {(m.user?.full_name || m.guest_name || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-[13px] font-medium text-foreground">
                    {m.user?.full_name || m.guest_name}
                  </h4>
                  <span className="text-[11.5px] text-muted capitalize">
                    {m.role.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Governance Settings */}
      {activeTab === "settings" && (
        <div className="theme-card-structural p-5 space-y-3 text-[13px] text-foreground">
          <h3 className="text-[14px] font-semibold text-heading mb-2">Meeting Policies & Governance</h3>
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
    </div>
  );
}
