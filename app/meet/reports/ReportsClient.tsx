"use client";

import React, { useState } from "react";
import {
  MailCheck,
  BarChart3,
  FileText,
  Calendar,
  AlertTriangle,
  Clock,
  UserCheck,
  Download,
  Printer,
  Search,
  ExternalLink,
  ChevronRight,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { StatusBadge } from "@/components/meet/StatusBadge";
import type { MeetingMoMVersion } from "@/types/meet";

interface ReportsClientProps {
  initialReportData: {
    r1MoMs: any[];
    r2Meetings: any[];
    r3PendingPoints: any[];
    r4CarryForward: any[];
    r5TatCompliance: any[];
    r6OwnerPerformance: any[];
    r7Invites: any[];
  };
}

type ReportTab = "r1" | "r2" | "r3" | "r4" | "r5" | "r6" | "r7";

const REPLY_LABEL: Record<string, string> = { accepted: "Accepted", tentative: "Maybe", declined: "Can't attend", invited: "No reply" };
const REPLY_CLS: Record<string, string> = {
  accepted: "bg-success-soft text-success-text",
  tentative: "bg-warning-soft text-warning-text",
  declined: "bg-danger-soft text-danger-text",
  invited: "bg-sunken text-subtle",
};
const ATT_LABEL: Record<string, string> = { present: "Present", late: "Late", absent: "Absent", excused: "Excused", left_early: "Left early" };
const dt = (x: string | null) => (x ? new Date(x).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—");

export default function ReportsClient({ initialReportData }: ReportsClientProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>("r1");
  const [search, setSearch] = useState("");
  const [selectedMoM, setSelectedMoM] = useState<any | null>(null);

  const reportTabs = [
    { id: "r1" as ReportTab, code: "R1", label: "Minutes of Meeting (MoM)", icon: FileText, count: initialReportData.r1MoMs.length },
    { id: "r2" as ReportTab, code: "R2", label: "Meeting Summary", icon: Calendar, count: initialReportData.r2Meetings.length },
    { id: "r3" as ReportTab, code: "R3", label: "Pending Points Register", icon: Clock, count: initialReportData.r3PendingPoints.length },
    { id: "r4" as ReportTab, code: "R4", label: "Carry-Forward Analysis", icon: AlertTriangle, count: initialReportData.r4CarryForward.length },
    { id: "r5" as ReportTab, code: "R5", label: "TAT Compliance", icon: BarChart3, count: initialReportData.r5TatCompliance.length },
    { id: "r6" as ReportTab, code: "R6", label: "Owner Performance", icon: UserCheck, count: initialReportData.r6OwnerPerformance.length },
    { id: "r7" as ReportTab, code: "R7", label: "Invites & Attendance", icon: MailCheck, count: initialReportData.r7Invites.length },
  ];

  // CSV Export utility
  const handleExportCSV = () => {
    let filename = `report_${activeTab}_${new Date().toISOString().split("T")[0]}.csv`;
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    switch (activeTab) {
      case "r1":
        headers = ["Session Code", "Meeting Title", "Version", "Status", "Generated Date"];
        rows = initialReportData.r1MoMs.map((m) => [
          m.session?.code || "",
          `"${(m.session?.meeting?.title || "").replace(/"/g, '""')}"`,
          m.version,
          m.status,
          m.created_at?.split("T")[0] || "",
        ]);
        break;
      case "r2":
        headers = ["Code", "Title", "Department", "Organizer", "Recurrence", "Sessions Held", "Avg Effectiveness"];
        rows = initialReportData.r2Meetings.map((m) => [
          m.code,
          `"${m.title.replace(/"/g, '""')}"`,
          m.department,
          m.organizer,
          m.recurrence,
          m.sessions_held,
          `${m.avg_score}%`,
        ]);
        break;
      case "r3":
        headers = ["Point Code", "Title", "Meeting", "Owner", "Type", "Priority", "Status", "TAT Days", "Due Date", "Carry Count", "Progress %"];
        rows = initialReportData.r3PendingPoints.map((p) => [
          p.code,
          `"${p.title.replace(/"/g, '""')}"`,
          `"${(p.meeting || "").replace(/"/g, '""')}"`,
          p.owner,
          p.type,
          p.priority,
          p.status,
          p.tat_days,
          p.due_date,
          p.carry_count,
          `${p.progress}%`,
        ]);
        break;
      case "r4":
        headers = ["Point Code", "Title", "Meeting", "Owner", "Carry Count", "Escalated (3+)", "Status", "Due Date"];
        rows = initialReportData.r4CarryForward.map((p) => [
          p.code,
          `"${p.title.replace(/"/g, '""')}"`,
          `"${(p.meeting || "").replace(/"/g, '""')}"`,
          p.owner,
          p.carry_count,
          p.is_escalated ? "YES (3+)" : "No",
          p.status,
          p.due_date,
        ]);
        break;
      case "r5":
        headers = ["Task Code", "Title", "Meeting", "Owner", "Priority", "Status", "TAT Days", "Due Date", "TAT Result", "Delay Days"];
        rows = initialReportData.r5TatCompliance.map((t) => [
          t.code,
          `"${t.title.replace(/"/g, '""')}"`,
          `"${t.meeting.replace(/"/g, '""')}"`,
          t.owner,
          t.priority,
          t.status,
          t.tat_days,
          t.due_date,
          t.tat_result,
          t.delay_days,
        ]);
        break;
      case "r6":
        headers = ["Owner", "Total Assigned", "Completed", "Within TAT", "Breached", "Open", "TAT Compliance %", "Avg Delay (Days)"];
        rows = initialReportData.r6OwnerPerformance.map((o) => [
          `"${o.owner.replace(/"/g, '""')}"`,
          o.total_assigned,
          o.completed,
          o.within_tat,
          o.breached,
          o.open,
          `${o.tat_compliance}%`,
          o.avg_delay,
        ]);
        break;
      case "r7":
        headers = ["Meeting", "Date", "Person", "Reply", "Reason", "Replied at", "Joined at", "Attendance", "Late (min)", "Marked by hand"];
        rows = initialReportData.r7Invites.map((r) => [
          `"${String(r.meeting).replace(/"/g, '""')}"`,
          r.date ? new Date(r.date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "",
          `"${String(r.person).replace(/"/g, '""')}"`,
          REPLY_LABEL[r.reply] || r.reply,
          `"${String(r.reason || "").replace(/"/g, '""')}"`,
          r.replied_at ? new Date(r.replied_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "",
          r.joined_at ? new Date(r.joined_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "",
          r.attendance,
          r.late_minutes,
          r.marked_by_hand ? "Yes" : "No",
        ]);
        break;
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Report Selection Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearch("");
              }}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                isActive
                  ? "bg-theme-btn-primary/10 border-theme-btn-primary text-theme-btn-primary shadow-sm"
                  : "bg-surface border-border text-foreground hover:bg-elevated"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    isActive
                      ? "bg-theme-btn-primary text-theme-btn-primary-text"
                      : "bg-elevated text-subtle"
                  }`}
                >
                  {tab.code}
                </span>
                <Icon className={`w-4 h-4 ${isActive ? "text-theme-btn-primary" : "text-subtle"}`} />
              </div>
              <div>
                <p className="text-xs font-semibold leading-tight line-clamp-2">{tab.label}</p>
                <p className="text-[11px] text-subtle mt-1 font-mono">{tab.count} records</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Control Bar: Search & Export */}
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            type="text"
            placeholder="Search report records..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-elevated border border-border rounded-lg text-xs text-foreground placeholder:text-subtle focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <AppButton
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export to CSV</span>
          </AppButton>
        </div>
      </div>

      {/* Active Report Table Content */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        {/* R1: Minutes of Meeting (MoM) */}
        {activeTab === "r1" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-elevated border-b border-border text-subtle font-medium uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Session Code</th>
                  <th className="py-3 px-4">Meeting Series</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Generated Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {initialReportData.r1MoMs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-subtle">
                      No published or drafted MoM versions generated yet.
                    </td>
                  </tr>
                ) : (
                  initialReportData.r1MoMs
                    .filter((m) =>
                      search
                        ? (m.session?.code || "").toLowerCase().includes(search.toLowerCase()) ||
                          (m.session?.meeting?.title || "").toLowerCase().includes(search.toLowerCase())
                        : true
                    )
                    .map((mom) => (
                      <tr key={mom.id} className="hover:bg-elevated/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-heading">
                          {mom.session?.code}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-foreground">
                          {mom.session?.meeting?.title}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-subtle">v{mom.version}</td>
                        <td className="py-3.5 px-4 text-subtle">
                          {mom.created_at ? new Date(mom.created_at).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={mom.status} />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedMoM(mom)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-elevated hover:bg-surface border border-border text-xs text-foreground font-medium transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-subtle" />
                            <span>View MoM</span>
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* R2: Meeting Summary */}
        {activeTab === "r2" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-elevated border-b border-border text-subtle font-medium uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Series Code</th>
                  <th className="py-3 px-4">Meeting Title</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Organizer</th>
                  <th className="py-3 px-4">Cadence</th>
                  <th className="py-3 px-4">Sessions Held</th>
                  <th className="py-3 px-4">Avg Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {initialReportData.r2Meetings
                  .filter((m) =>
                    search
                      ? m.title.toLowerCase().includes(search.toLowerCase()) ||
                        m.code.toLowerCase().includes(search.toLowerCase()) ||
                        m.department.toLowerCase().includes(search.toLowerCase())
                      : true
                  )
                  .map((m, idx) => (
                    <tr key={idx} className="hover:bg-elevated/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-heading">{m.code}</td>
                      <td className="py-3.5 px-4 font-medium text-foreground">{m.title}</td>
                      <td className="py-3.5 px-4 text-subtle">{m.department}</td>
                      <td className="py-3.5 px-4 text-foreground">{m.organizer}</td>
                      <td className="py-3.5 px-4 capitalize text-subtle">{m.recurrence}</td>
                      <td className="py-3.5 px-4 font-mono text-foreground">{m.sessions_held}</td>
                      <td className="py-3.5 px-4 font-semibold text-success-text">{m.avg_score}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* R3: Pending Points Register */}
        {activeTab === "r3" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-elevated border-b border-border text-subtle font-medium uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Point Code</th>
                  <th className="py-3 px-4">Point Title</th>
                  <th className="py-3 px-4">Meeting</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">TAT Due</th>
                  <th className="py-3 px-4">Carries</th>
                  <th className="py-3 px-4">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {initialReportData.r3PendingPoints
                  .filter((p) =>
                    search
                      ? p.title.toLowerCase().includes(search.toLowerCase()) ||
                        p.code.toLowerCase().includes(search.toLowerCase()) ||
                        p.owner.toLowerCase().includes(search.toLowerCase())
                      : true
                  )
                  .map((p, idx) => (
                    <tr key={idx} className="hover:bg-elevated/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-heading">{p.code}</td>
                      <td className="py-3.5 px-4 font-medium text-foreground max-w-xs truncate">{p.title}</td>
                      <td className="py-3.5 px-4 text-subtle">{p.meeting}</td>
                      <td className="py-3.5 px-4 text-foreground">{p.owner}</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge priority={p.priority} />
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={p.overdue ? "text-danger-text font-semibold" : "text-subtle"}>
                          {p.due_date} {p.overdue && "(Overdue)"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {p.carry_count > 0 ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              p.carry_count >= 3
                                ? "bg-danger-soft text-danger-text border border-danger-border"
                                : "bg-warning-soft text-warning-text"
                            }`}
                          >
                            {p.carry_count}x Carried
                          </span>
                        ) : (
                          <span className="text-subtle">New</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-foreground">{p.progress}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* R4: Carry-Forward Analysis */}
        {activeTab === "r4" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-elevated border-b border-border text-subtle font-medium uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Carried Point Title</th>
                  <th className="py-3 px-4">Meeting Series</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Times Carried</th>
                  <th className="py-3 px-4">Escalation Status</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4">Target Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {initialReportData.r4CarryForward
                  .filter((p) =>
                    search
                      ? p.title.toLowerCase().includes(search.toLowerCase()) ||
                        p.code.toLowerCase().includes(search.toLowerCase()) ||
                        p.owner.toLowerCase().includes(search.toLowerCase())
                      : true
                  )
                  .map((p, idx) => (
                    <tr key={idx} className="hover:bg-elevated/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-heading">{p.code}</td>
                      <td className="py-3.5 px-4 font-medium text-foreground max-w-sm truncate">{p.title}</td>
                      <td className="py-3.5 px-4 text-subtle">{p.meeting}</td>
                      <td className="py-3.5 px-4 text-foreground">{p.owner}</td>
                      <td className="py-3.5 px-4 font-bold text-warning-text">{p.carry_count} Sessions</td>
                      <td className="py-3.5 px-4">
                        {p.is_escalated ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-danger-soft text-danger-text border border-danger-border">
                            <AlertCircle className="w-3 h-3" />
                            CRITICAL (3+ CARRIES)
                          </span>
                        ) : (
                          <span className="text-[10px] text-warning-text font-medium">Standard Carry</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-3.5 px-4 text-subtle">{p.due_date}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* R5: TAT Compliance */}
        {activeTab === "r5" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-elevated border-b border-border text-subtle font-medium uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Task Code</th>
                  <th className="py-3 px-4">Action Item</th>
                  <th className="py-3 px-4">Origin Meeting</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">TAT Working Days</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">TAT Result</th>
                  <th className="py-3 px-4">Delay Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {initialReportData.r5TatCompliance
                  .filter((t) =>
                    search
                      ? t.title.toLowerCase().includes(search.toLowerCase()) ||
                        t.code.toLowerCase().includes(search.toLowerCase()) ||
                        t.owner.toLowerCase().includes(search.toLowerCase())
                      : true
                  )
                  .map((t, idx) => (
                    <tr key={idx} className="hover:bg-elevated/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-heading">{t.code}</td>
                      <td className="py-3.5 px-4 font-medium text-foreground max-w-xs truncate">{t.title}</td>
                      <td className="py-3.5 px-4 text-subtle">{t.meeting}</td>
                      <td className="py-3.5 px-4 text-foreground">{t.owner}</td>
                      <td className="py-3.5 px-4 font-mono text-subtle">{t.tat_days} days</td>
                      <td className="py-3.5 px-4 text-subtle">{t.due_date}</td>
                      <td className="py-3.5 px-4">
                        {t.tat_result === "within_tat" ? (
                          <span className="inline-flex items-center gap-1 text-success-text font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Within TAT
                          </span>
                        ) : t.tat_result === "breached" ? (
                          <span className="inline-flex items-center gap-1 text-danger-text font-semibold text-[11px]">
                            <AlertCircle className="w-3.5 h-3.5" /> Breached
                          </span>
                        ) : (
                          <span className="text-subtle text-[11px]">In Progress</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-foreground">{t.delay_days}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* R6: Owner Performance Scorecard */}
        {activeTab === "r6" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-elevated border-b border-border text-subtle font-medium uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Action Item Owner</th>
                  <th className="py-3 px-4">Total Assigned</th>
                  <th className="py-3 px-4">Completed</th>
                  <th className="py-3 px-4">Within TAT</th>
                  <th className="py-3 px-4">Breached</th>
                  <th className="py-3 px-4">Open Items</th>
                  <th className="py-3 px-4">TAT Compliance Rate</th>
                  <th className="py-3 px-4">Avg Delay (Days)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {initialReportData.r6OwnerPerformance
                  .filter((o) => (search ? o.owner.toLowerCase().includes(search.toLowerCase()) : true))
                  .map((o, idx) => (
                    <tr key={idx} className="hover:bg-elevated/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-heading">{o.owner}</td>
                      <td className="py-3.5 px-4 font-mono text-foreground">{o.total_assigned}</td>
                      <td className="py-3.5 px-4 font-mono text-success-text font-semibold">{o.completed}</td>
                      <td className="py-3.5 px-4 font-mono text-success-text">{o.within_tat}</td>
                      <td className="py-3.5 px-4 font-mono text-danger-text">{o.breached}</td>
                      <td className="py-3.5 px-4 font-mono text-warning-text">{o.open}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-elevated rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                o.tat_compliance >= 80 ? "bg-emerald-500" : o.tat_compliance >= 60 ? "bg-amber-500" : "bg-rose-500"
                              }`}
                              style={{ width: `${o.tat_compliance}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-foreground">{o.tat_compliance}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-subtle">{o.avg_delay}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeTab === "r7" && (
        <div className="theme-card-structural mt-4 overflow-x-auto p-0">
          <p className="border-b border-border px-4 py-3 text-[13px] text-subtle">
            Everyone invited to each meeting date in the last 6 months: their reply to the invite (with the reason if they can't attend), when they joined, and whether they were present or late.
          </p>
          <table className="w-full min-w-[1000px] text-left text-[13px]">
            <thead className="bg-sunken text-[12px] font-semibold text-subtle">
              <tr>
                <th className="px-4 py-2.5">Meeting</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Person</th>
                <th className="px-4 py-2.5">Reply</th>
                <th className="px-4 py-2.5">Reason</th>
                <th className="px-4 py-2.5">Replied</th>
                <th className="px-4 py-2.5">Joined</th>
                <th className="px-4 py-2.5">Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initialReportData.r7Invites
                .filter((r) => (search ? `${r.meeting} ${r.person} ${r.session_code}`.toLowerCase().includes(search.toLowerCase()) : true))
                .map((r, i) => (
                  <tr key={i} className="hover:bg-surface-hover">
                    <td className="px-4 py-3"><a href={`/meet/sessions/${r.session_id}`} className="font-medium text-foreground hover:text-primary hover:underline">{r.meeting}</a></td>
                    <td className="whitespace-nowrap px-4 py-3 text-subtle">{dt(r.date)}</td>
                    <td className="px-4 py-3 text-foreground">{r.person}</td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${REPLY_CLS[r.reply] || REPLY_CLS.invited}`}>{REPLY_LABEL[r.reply] || r.reply}</span></td>
                    <td className="max-w-[220px] px-4 py-3 text-subtle">{r.reason || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-subtle">{dt(r.replied_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-subtle">{dt(r.joined_at)}</td>
                    <td className="px-4 py-3 text-foreground">
                      {ATT_LABEL[r.attendance] || r.attendance}
                      {r.attendance === "late" && r.late_minutes ? ` · ${r.late_minutes} min` : ""}
                      {r.marked_by_hand && <span className="block text-[11.5px] text-muted">marked by hand</span>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MoM Preview & Print Modal */}
      {selectedMoM && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-elevated">
              <div>
                <h3 className="text-base font-bold text-heading">
                  Minutes of Meeting (MoM) — {selectedMoM.session?.code}
                </h3>
                <p className="text-xs text-subtle">{selectedMoM.session?.meeting?.title} · Version {selectedMoM.version}</p>
              </div>
              <div className="flex items-center gap-2">
                <AppButton
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="flex items-center gap-1 text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print MoM</span>
                </AppButton>
                <button
                  onClick={() => setSelectedMoM(null)}
                  className="text-subtle hover:text-foreground p-1.5 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-foreground">
              {/* MoM Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-elevated rounded-lg border border-border">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-subtle block">Meeting Title</span>
                  <span className="font-semibold">{selectedMoM.snapshot?.meeting_title || selectedMoM.session?.meeting?.title}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-subtle block">Session #</span>
                  <span>{selectedMoM.snapshot?.session_code || selectedMoM.session?.code}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-subtle block">Chair</span>
                  <span>{selectedMoM.snapshot?.chair || "Executive Chair"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-subtle block">Minute Taker</span>
                  <span>{selectedMoM.snapshot?.minute_taker || "Assigned"}</span>
                </div>
              </div>

              {/* Attendance */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-heading mb-2">1. Attendance Roster</h4>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-elevated text-subtle uppercase">
                      <tr>
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Role</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(selectedMoM.snapshot?.attendees || []).map((att: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-medium">{att.name}</td>
                          <td className="py-2 px-3 capitalize text-subtle">{att.role}</td>
                          <td className="py-2 px-3 capitalize">{att.attendance}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Backup Points Discussed */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-heading mb-2">
                  2. Backup Points Carried Forward
                </h4>
                {(selectedMoM.snapshot?.backup_points || []).length === 0 ? (
                  <p className="text-subtle italic">No backup points carried to this session.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedMoM.snapshot.backup_points.map((pt: any, idx: number) => (
                      <div key={idx} className="p-3 bg-elevated border border-border rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-heading">{pt.code}: {pt.title}</span>
                          <span className="text-warning-text font-bold">{pt.carry_count}x Carried</span>
                        </div>
                        <p className="text-subtle mt-1">{pt.discussion_notes || "No discussion notes recorded."}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Standing Decisions */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-heading mb-2">3. Ratified Decisions</h4>
                {(selectedMoM.snapshot?.decisions || []).length === 0 ? (
                  <p className="text-subtle italic">No new decisions ratified during this session.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedMoM.snapshot.decisions.map((dec: any, idx: number) => (
                      <div key={idx} className="p-3 bg-elevated border border-border rounded-lg">
                        <span className="font-mono font-bold text-heading">{dec.code}</span>
                        <p className="mt-1 font-medium">{dec.text}</p>
                        <span className="text-[10px] text-subtle block mt-1">Decided by: {dec.decided_by}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
