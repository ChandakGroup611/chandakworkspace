"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileCheck2,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Download,
  AlertCircle,
  Tag,
  CheckCircle2,
  Calendar,
  Layers,
  History,
  X,
} from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { StatusBadge } from "@/components/meet/StatusBadge";
import { recordDecision, supersedeDecision, updateDecisionStatus } from "@/lib/actions/meet/decisions";
import { toast } from "react-toastify";
import type { MeetingDecision, DecisionStatus } from "@/types/meet";

interface DecisionsClientProps {
  initialDecisions: MeetingDecision[];
  sessions: {
    id: string;
    code: string;
    session_no: number;
    scheduled_date: string;
    meeting?: {
      id: string;
      code: string;
      title: string;
    } | null;
  }[];
}

export default function DecisionsClient({ initialDecisions, sessions }: DecisionsClientProps) {
  const [decisions, setDecisions] = useState<MeetingDecision[]>(initialDecisions);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | DecisionStatus>("all");
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>("all");

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [supersedeModalTarget, setSupersedeModalTarget] = useState<MeetingDecision | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New decision form
  const [selectedSessionId, setSelectedSessionId] = useState(sessions[0]?.id || "");
  const [decisionText, setDecisionText] = useState("");
  const [decidedBy, setDecidedBy] = useState("Meeting Committee");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split("T")[0]);
  const [reviewDate, setReviewDate] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  // Supersede form
  const [supersedeText, setSupersedeText] = useState("");
  const [supersedeDecidedBy, setSupersedeDecidedBy] = useState("Meeting Committee");
  const [supersedeSessionId, setSupersedeSessionId] = useState(sessions[0]?.id || "");

  // Unique meetings for dropdown
  const meetingOptions = Array.from(
    new Map(
      sessions
        .filter((s) => s.meeting)
        .map((s) => [s.meeting!.id, { id: s.meeting!.id, title: s.meeting!.title, code: s.meeting!.code }])
    ).values()
  );

  // Filtering
  const filteredDecisions = decisions.filter((d) => {
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (selectedMeetingId !== "all" && d.session?.meeting_id !== selectedMeetingId) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchText = d.text.toLowerCase().includes(q);
      const matchCode = d.code?.toLowerCase().includes(q);
      const matchDecidedBy = d.decided_by?.toLowerCase().includes(q);
      const matchTag = d.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchText && !matchCode && !matchDecidedBy && !matchTag) return false;
    }
    return true;
  });

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionText.trim() || !selectedSessionId) {
      toast.warn("Please provide decision text and select a session");
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedTags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await recordDecision({
        sessionId: selectedSessionId,
        text: decisionText.trim(),
        decidedBy: decidedBy.trim(),
        effectiveFrom: effectiveFrom || undefined,
        reviewDate: reviewDate || undefined,
        tags: parsedTags,
      });

      if (res.success && res.decision) {
        toast.success("Decision recorded successfully");
        // Enrich local record
        const chosenSession = sessions.find((s) => s.id === selectedSessionId);
        const newDec: MeetingDecision = {
          ...res.decision,
          session: chosenSession
            ? {
                id: chosenSession.id,
                code: chosenSession.code,
                meeting_id: chosenSession.meeting?.id || "",
                meeting: chosenSession.meeting ? { id: chosenSession.meeting.id, title: chosenSession.meeting.title } : null,
              }
            : null,
        };
        setDecisions((prev) => [newDec, ...prev]);
        setIsRecordModalOpen(false);
        setDecisionText("");
        setTagsInput("");
        setReviewDate("");
      } else {
        toast.error(res.error || "Failed to record decision");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to record decision");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSupersedeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supersedeModalTarget || !supersedeText.trim() || !supersedeSessionId) {
      toast.warn("Please complete all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await supersedeDecision({
        oldDecisionId: supersedeModalTarget.id,
        sessionId: supersedeSessionId,
        text: supersedeText.trim(),
        decidedBy: supersedeDecidedBy.trim(),
      });

      if (res.success && res.decision) {
        toast.success("Decision superseded successfully");
        setDecisions((prev) =>
          prev.map((d) => {
            if (d.id === supersedeModalTarget.id) {
              return { ...d, status: "superseded" as DecisionStatus, superseded_by_id: res.decision.id };
            }
            return d;
          })
        );
        const chosenSession = sessions.find((s) => s.id === supersedeSessionId);
        const newDec: MeetingDecision = {
          ...res.decision,
          session: chosenSession
            ? {
                id: chosenSession.id,
                code: chosenSession.code,
                meeting_id: chosenSession.meeting?.id || "",
                meeting: chosenSession.meeting ? { id: chosenSession.meeting.id, title: chosenSession.meeting.title } : null,
              }
            : null,
        };
        setDecisions((prev) => [newDec, ...prev]);
        setSupersedeModalTarget(null);
        setSupersedeText("");
      } else {
        toast.error(res.error || "Failed to supersede decision");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to supersede decision");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (decisionId: string) => {
    if (!confirm("Are you sure you want to revoke this decision?")) return;
    try {
      const res = await updateDecisionStatus(decisionId, "revoked", "Revoked via Decisions Register");
      if (res.success) {
        toast.success("Decision status updated to Revoked");
        setDecisions((prev) =>
          prev.map((d) => (d.id === decisionId ? { ...d, status: "revoked" as DecisionStatus } : d))
        );
      } else {
        toast.error(res.error || "Failed to revoke decision");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke decision");
    }
  };

  const exportCSV = () => {
    const headers = [
      "Code",
      "Meeting Series",
      "Session Code",
      "Decision Text",
      "Decided By",
      "Effective From",
      "Review Date",
      "Status",
      "Tags",
    ];

    const rows = filteredDecisions.map((d) => [
      d.code || "",
      `"${(d.session?.meeting?.title || "").replace(/"/g, '""')}"`,
      d.session?.code || "",
      `"${(d.text || "").replace(/"/g, '""')}"`,
      `"${(d.decided_by || "").replace(/"/g, '""')}"`,
      d.effective_from || "",
      d.review_date || "",
      d.status || "",
      `"${(d.tags || []).join(", ")}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `decisions_register_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeCount = decisions.filter((d) => d.status === "active").length;
  const supersededCount = decisions.filter((d) => d.status === "superseded").length;
  const revokedCount = decisions.filter((d) => d.status === "revoked").length;

  return (
    <div className="space-y-6">
      {/* Top Stats / Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-subtle">Total Decisions</p>
            <p className="text-2xl font-bold text-heading mt-1">{decisions.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-elevated flex items-center justify-center text-foreground">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-subtle">Active & Binding</p>
            <p className="text-2xl font-bold text-success-text mt-1">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-success-soft flex items-center justify-center text-success-text">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-subtle">Superseded</p>
            <p className="text-2xl font-bold text-warning-text mt-1">{supersededCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-warning-soft flex items-center justify-center text-warning-text">
            <History className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-subtle">Revoked</p>
            <p className="text-2xl font-bold text-danger-text mt-1">{revokedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-danger-soft flex items-center justify-center text-danger-text">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar: Filters, Search & Actions */}
      <div className="bg-surface border border-border rounded-xl p-4 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-elevated p-1 rounded-lg border border-border overflow-x-auto">
          {(
            [
              { key: "all", label: "All Decisions", count: decisions.length },
              { key: "active", label: "Active", count: activeCount },
              { key: "superseded", label: "Superseded", count: supersededCount },
              { key: "revoked", label: "Revoked", count: revokedCount },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                statusFilter === tab.key
                  ? "bg-theme-btn-primary text-theme-btn-primary-text shadow-sm"
                  : "text-subtle hover:text-foreground"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[12px] px-1.5 py-0.2 rounded-full ${
                  statusFilter === tab.key
                    ? "bg-black/20 text-theme-btn-primary-text"
                    : "bg-surface text-subtle"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search, Meeting Filter & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              type="text"
              placeholder="Search decision, code, tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-elevated border border-border rounded-lg text-xs text-foreground placeholder:text-subtle focus:outline-none focus:border-border-active"
            />
          </div>

          {/* Meeting Series Filter */}
          <select
            value={selectedMeetingId}
            onChange={(e) => setSelectedMeetingId(e.target.value)}
            className="px-2.5 py-1.5 bg-elevated border border-border rounded-lg text-xs text-foreground focus:outline-none"
          >
            <option value="all">All Meeting Series</option>
            {meetingOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} - {m.title}
              </option>
            ))}
          </select>

          {/* Export CSV */}
          <AppButton
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="flex items-center gap-1.5 text-xs"
            title="Export to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </AppButton>

          {/* Record Decision */}
          <AppButton
            variant="primary"
            size="sm"
            onClick={() => setIsRecordModalOpen(true)}
            className="flex items-center gap-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Decision</span>
          </AppButton>
        </div>
      </div>

      {/* Decisions List Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-elevated border-b border-border text-subtle font-medium uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Decision & Policy Details</th>
                <th className="py-3 px-4">Origin / Session</th>
                <th className="py-3 px-4">Decided By</th>
                <th className="py-3 px-4">Effective Date</th>
                <th className="py-3 px-4">Review Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredDecisions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-subtle">
                    <FileCheck2 className="w-8 h-8 mx-auto text-subtle/50 mb-2" />
                    <p className="text-sm font-medium text-foreground">No decisions found</p>
                    <p className="text-xs text-subtle mt-1">
                      {search || statusFilter !== "all"
                        ? "Try adjusting your filters or search keywords"
                        : "Decisions recorded in live meetings or registered here will appear in this registry."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDecisions.map((decision) => {
                  const isReviewDue =
                    decision.review_date &&
                    new Date(decision.review_date) <= new Date() &&
                    decision.status === "active";

                  return (
                    <tr key={decision.id} className="hover:bg-elevated/40 transition-colors">
                      {/* Code */}
                      <td className="py-3.5 px-4 font-mono font-semibold whitespace-nowrap">
                        <Link href={`/meet/decisions/${decision.id}`} className="text-primary hover:underline">{decision.code}</Link>
                      </td>

                      {/* Text & Tags */}
                      <td className="py-3.5 px-4 max-w-md">
                        <Link href={`/meet/decisions/${decision.id}`} className="text-sm font-medium text-foreground leading-snug hover:underline">{decision.text}</Link>
                        {decision.tags && decision.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {decision.tags.map((t, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[12px] bg-elevated border border-border text-subtle font-medium"
                              >
                                <Tag className="w-2.5 h-2.5 text-subtle/70" />
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        {decision.point && (
                          <div className="mt-1 text-[12.5px] text-subtle flex items-center gap-1">
                            <span className="font-mono text-foreground font-medium">{decision.point.code}:</span>
                            <span className="truncate max-w-xs">{decision.point.title}</span>
                          </div>
                        )}
                      </td>

                      {/* Origin / Meeting */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-foreground">
                          {decision.session?.meeting?.id ? (
                            <Link href={`/meet/meetings/${decision.session.meeting.id}`} className="hover:text-primary hover:underline">{decision.session.meeting.title}</Link>
                          ) : (
                            decision.session?.meeting?.title || "Meeting"
                          )}
                        </div>
                        <div className="text-[12.5px] text-subtle font-mono">
                          {decision.session?.code || "Session"}
                        </div>
                      </td>

                      {/* Decided By */}
                      <td className="py-3.5 px-4 text-foreground whitespace-nowrap">
                        {decision.decided_by || "Committee"}
                      </td>

                      {/* Effective Date */}
                      <td className="py-3.5 px-4 text-subtle whitespace-nowrap">
                        {decision.effective_from || decision.created_at?.split("T")[0]}
                      </td>

                      {/* Review Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {decision.review_date ? (
                          <span
                            className={`inline-flex items-center gap-1 ${
                              isReviewDue ? "text-warning-text font-semibold" : "text-subtle"
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            {decision.review_date}
                            {isReviewDue && <span className="text-[12px] bg-warning-soft px-1 rounded">Due</span>}
                          </span>
                        ) : (
                          <span className="text-subtle/50">None</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={decision.status} />
                        {decision.superseded_by_id && (
                          <span className="block text-[12px] text-subtle mt-0.5 font-mono">
                            Replaced
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {decision.status === "active" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSupersedeModalTarget(decision);
                                setSupersedeText("");
                                setSupersedeSessionId(decision.session_id || sessions[0]?.id || "");
                              }}
                              className="px-2 py-1 text-[12.5px] font-medium text-theme-btn-primary-text bg-theme-btn-primary hover:opacity-90 rounded border border-transparent transition-opacity"
                              title="Replace with a new decision"
                            >
                              Supersede
                            </button>
                            <button
                              onClick={() => handleRevoke(decision.id)}
                              className="px-2 py-1 text-[12.5px] font-medium text-danger-text hover:bg-danger-soft rounded transition-colors"
                              title="Withdraw this decision"
                            >
                              Revoke
                            </button>
                          </div>
                        ) : (
                          <span className="text-[12.5px] text-subtle/60 italic">Archived</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Decision Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-theme-btn-primary-text bg-theme-btn-primary p-1 rounded-md" />
                <h3 className="text-base font-semibold text-heading">Record Standing Decision</h3>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="text-subtle hover:text-foreground p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-subtle mb-1">
                  Target Session & Meeting <span className="text-danger-text">*</span>
                </label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full px-3 py-2 bg-elevated border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-border-active"
                  required
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.meeting?.title} ({s.code} - {s.scheduled_date})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-subtle mb-1">
                  Decision Text <span className="text-danger-text">*</span>
                </label>
                <textarea
                  rows={3}
                  value={decisionText}
                  onChange={(e) => setDecisionText(e.target.value)}
                  placeholder="State the agreed decision, policy resolution, or ratified mandate..."
                  className="w-full px-3 py-2 bg-elevated border border-border rounded-lg text-xs text-foreground placeholder:text-subtle focus:outline-none focus:border-border-active"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-subtle mb-1">Decided By</label>
                  <input
                    type="text"
                    value={decidedBy}
                    onChange={(e) => setDecidedBy(e.target.value)}
                    placeholder="e.g. Sales Committee"
                    className="w-full px-3 py-1.5 bg-elevated border border-border rounded-lg text-xs text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-subtle mb-1">Effective From</label>
                  <input
                    type="date"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    className="w-full px-3 py-1.5 bg-elevated border border-border rounded-lg text-xs text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-subtle mb-1">Review Date (Optional)</label>
                  <input
                    type="date"
                    value={reviewDate}
                    onChange={(e) => setReviewDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-elevated border border-border rounded-lg text-xs text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-subtle mb-1">Tags (Comma-separated)</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="Commercial, Policy, Q3"
                    className="w-full px-3 py-1.5 bg-elevated border border-border rounded-lg text-xs text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRecordModalOpen(false)}
                >
                  Cancel
                </AppButton>
                <AppButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Recording..." : "Record Decision"}
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supersede Decision Modal */}
      {supersedeModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-warning-text" />
                <h3 className="text-base font-semibold text-heading">Supersede Decision</h3>
              </div>
              <button
                onClick={() => setSupersedeModalTarget(null)}
                className="text-subtle hover:text-foreground p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 p-3 bg-elevated border border-border rounded-lg">
              <span className="text-[12px] font-mono uppercase text-subtle font-semibold">
                Current Decision ({supersedeModalTarget.code})
              </span>
              <p className="text-xs text-foreground mt-1">{supersedeModalTarget.text}</p>
            </div>

            <form onSubmit={handleSupersedeSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-subtle mb-1">
                  Session Ratifying the Change <span className="text-danger-text">*</span>
                </label>
                <select
                  value={supersedeSessionId}
                  onChange={(e) => setSupersedeSessionId(e.target.value)}
                  className="w-full px-3 py-2 bg-elevated border border-border rounded-lg text-xs text-foreground focus:outline-none"
                  required
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.meeting?.title} ({s.code} - {s.scheduled_date})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-subtle mb-1">
                  Replacement Decision Text <span className="text-danger-text">*</span>
                </label>
                <textarea
                  rows={3}
                  value={supersedeText}
                  onChange={(e) => setSupersedeText(e.target.value)}
                  placeholder="State the updated resolution replacing the previous one..."
                  className="w-full px-3 py-2 bg-elevated border border-border rounded-lg text-xs text-foreground placeholder:text-subtle focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-subtle mb-1">Decided By</label>
                <input
                  type="text"
                  value={supersedeDecidedBy}
                  onChange={(e) => setSupersedeDecidedBy(e.target.value)}
                  placeholder="e.g. Sales Committee"
                  className="w-full px-3 py-1.5 bg-elevated border border-border rounded-lg text-xs text-foreground focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSupersedeModalTarget(null)}
                >
                  Cancel
                </AppButton>
                <AppButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Superseding..." : "Supersede & Publish New"}
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
