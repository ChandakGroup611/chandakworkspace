"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Send,
  Plus,
  CheckCircle2,
  Clock,
  Printer,
  Search,
  FileText,
  X,
  RefreshCw,
} from "lucide-react";
import {
  fetchLiveTransmittalsAction,
  createLiveTransmittalAction,
  acknowledgeLiveTransmittalAction,
  type LiveTransmittalRow,
  type TransmittalDrawingOption,
} from "@/lib/actions/design-operations";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/feedback/States";

const PURPOSE_LABELS: Record<string, string> = {
  FOR_REVIEW: "For Review & Comments",
  GFC_HANDOVER: "Good for Construction (GFC)",
  FOR_TENDER: "For Tender / Pricing",
  FOR_INFO: "For Information Only",
  AS_BUILT: "As-Built Record",
};

export function LiveTransmittalHandoverView() {
  const [loading, setLoading] = useState(true);
  const [transmittals, setTransmittals] = useState<LiveTransmittalRow[]>([]);
  const [drawingOptions, setDrawingOptions] = useState<TransmittalDrawingOption[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formProjectId, setFormProjectId] = useState("");
  const [direction, setDirection] = useState<"OUTBOUND" | "INBOUND">("OUTBOUND");
  const [purpose, setPurpose] = useState("FOR_REVIEW");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientDepartmentId, setRecipientDepartmentId] = useState("");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [copiesCount, setCopiesCount] = useState(1);
  const [selectedDrawingIds, setSelectedDrawingIds] = useState<string[]>([]);

  // Acknowledge / Slip modal
  const [activeSlip, setActiveSlip] = useState<LiveTransmittalRow | null>(null);
  const [ackTarget, setAckTarget] = useState<LiveTransmittalRow | null>(null);
  const [ackNotes, setAckNotes] = useState("");
  const [ackSubmitting, setAckSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchLiveTransmittalsAction(projectFilter || undefined);
    if (!res.success) {
      setError(res.error || "Failed to load transmittals");
    } else {
      setTransmittals(res.transmittals);
      setDrawingOptions(res.drawingOptions);
      setProjects(res.projects);
      setDepartments(res.departments);
      if (!formProjectId && res.projects.length > 0) {
        setFormProjectId(res.projects[0].id);
      }
    }
    setLoading(false);
  }, [projectFilter, formProjectId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transmittals.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (!q) return true;
      return (
        t.transmittalNumber.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.projectName.toLowerCase().includes(q) ||
        t.recipientEmail.toLowerCase().includes(q) ||
        (t.recipientName || "").toLowerCase().includes(q)
      );
    });
  }, [transmittals, statusFilter, search]);

  const projectDrawings = useMemo(() => {
    return drawingOptions.filter((d) => !formProjectId || d.projectId === formProjectId);
  }, [drawingOptions, formProjectId]);

  const toggleDrawing = (id: string) => {
    setSelectedDrawingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await createLiveTransmittalAction({
      projectId: formProjectId,
      direction,
      purpose,
      recipientName,
      recipientEmail,
      recipientDepartmentId: recipientDepartmentId || null,
      subject,
      notes,
      copiesCount,
      drawingIds: selectedDrawingIds,
    });
    setSubmitting(false);
    if (!res.success) {
      setError(res.error || "Failed to issue transmittal");
      return;
    }
    setShowCreate(false);
    setSubject("");
    setNotes("");
    setRecipientName("");
    setRecipientEmail("");
    setSelectedDrawingIds([]);
    await loadData();
  };

  const handleAcknowledge = async () => {
    if (!ackTarget) return;
    setAckSubmitting(true);
    const res = await acknowledgeLiveTransmittalAction(ackTarget.id, ackNotes);
    setAckSubmitting(false);
    if (!res.success) {
      setError(res.error || "Failed to acknowledge transmittal");
      return;
    }
    setAckTarget(null);
    setAckNotes("");
    await loadData();
  };

  const issuedCount = transmittals.filter((t) => t.status === "ISSUED").length;
  const ackCount = transmittals.filter((t) => t.status === "ACKNOWLEDGED").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transmittal, subject, recipient..."
              className="pl-9 pr-3 py-2 min-h-11 rounded-md border border-border bg-surface text-sm w-64 max-w-full"
            />
          </div>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 min-h-11 rounded-md border border-border bg-surface text-sm"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 min-h-11 rounded-md border border-border bg-surface text-sm"
          >
            <option value="">All Statuses</option>
            <option value="ISSUED">Issued</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-11 rounded-md border border-border bg-surface text-sm hover:bg-elevated"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 min-h-11 rounded-md bg-theme-btn-primary text-theme-btn-primary-text text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Issue Drawing Transmittal
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AppCard>
          <AppCardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Transmittals</p>
            <p className="text-2xl font-semibold tabular-nums mt-1">{transmittals.length}</p>
          </AppCardContent>
        </AppCard>
        <AppCard>
          <AppCardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Issued / Pending Receipt</p>
            <p className="text-2xl font-semibold tabular-nums mt-1 text-amber-600 dark:text-amber-400">{issuedCount}</p>
          </AppCardContent>
        </AppCard>
        <AppCard>
          <AppCardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Acknowledged Handovers</p>
            <p className="text-2xl font-semibold tabular-nums mt-1 text-emerald-600 dark:text-emerald-400">{ackCount}</p>
          </AppCardContent>
        </AppCard>
      </div>

      <AppCard>
        <AppCardHeader>
          <AppCardTitle className="text-base">Live Drawing Transmittals & Handovers</AppCardTitle>
        </AppCardHeader>
        <AppCardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading transmittals...</p>
          ) : filtered.length === 0 ? (
            <EmptyState
              kind="empty"
              title="No drawing transmittals"
              description="Issue a transmittal to track formal drawing handovers and acknowledgments."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2.5 pr-3">Transmittal #</th>
                    <th className="py-2.5 pr-3">Project</th>
                    <th className="py-2.5 pr-3">Subject & Purpose</th>
                    <th className="py-2.5 pr-3">Recipient</th>
                    <th className="py-2.5 pr-3">Drawings</th>
                    <th className="py-2.5 pr-3">Status</th>
                    <th className="py-2.5 pr-3">Issued</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((t) => (
                    <tr key={t.id} className="hover:bg-elevated/50">
                      <td className="py-2.5 pr-3 font-medium whitespace-nowrap">
                        <div>{t.transmittalNumber}</div>
                        <span className="text-[11px] text-muted-foreground">{t.direction}</span>
                      </td>
                      <td className="py-2.5 pr-3">{t.projectName}</td>
                      <td className="py-2.5 pr-3">
                        <div className="font-medium">{t.subject}</div>
                        <div className="text-xs text-muted-foreground">
                          {PURPOSE_LABELS[t.purpose] || t.purpose} · {t.copiesCount} copy/copies
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <div>{t.recipientName || t.recipientEmail}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.recipientName ? t.recipientEmail : ""}
                          {t.recipientDepartmentName ? ` · ${t.recipientDepartmentName}` : ""}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="inline-flex items-center gap-1 text-xs font-medium">
                          <FileText className="w-3.5 h-3.5" />
                          {t.items.length} sheet(s)
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        {t.status === "ACKNOWLEDGED" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-xs font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Acknowledged
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-xs font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            Issued
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(t.issuedAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex flex-wrap gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => setActiveSlip(t)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-9 rounded border border-border text-xs hover:bg-elevated"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Slip
                          </button>
                          {t.status !== "ACKNOWLEDGED" && (
                            <button
                              type="button"
                              onClick={() => {
                                setAckTarget(t);
                                setAckNotes("");
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-9 rounded bg-theme-btn-primary text-theme-btn-primary-text text-xs font-medium"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Acknowledge
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AppCardContent>
      </AppCard>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Issue Live Drawing Transmittal</h3>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="p-2 rounded hover:bg-elevated"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Project *</label>
                  <select
                    required
                    value={formProjectId}
                    onChange={(e) => {
                      setFormProjectId(e.target.value);
                      setSelectedDrawingIds([]);
                    }}
                    className="w-full px-3 py-2 min-h-11 rounded-md border border-border bg-surface text-sm"
                  >
                    <option value="">Select project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Direction *</label>
                  <select
                    value={direction}
                    onChange={(e) => setDirection(e.target.value as "OUTBOUND" | "INBOUND")}
                    className="w-full px-3 py-2 min-h-11 rounded-md border border-border bg-surface text-sm"
                  >
                    <option value="OUTBOUND">Outbound (Issue to Site / Consultant)</option>
                    <option value="INBOUND">Inbound (Received from Consultant)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Purpose *</label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3 py-2 min-h-11 rounded-md border border-border bg-surface text-sm"
                  >
                    {Object.entries(PURPOSE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Copies</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={copiesCount}
                    onChange={(e) => setCopiesCount(Number(e.target.value || 1))}
                    className="w-full px-3 py-2 min-h-11 rounded-md border border-border bg-surface text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Recipient Name</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Site Engineer / Consultant Lead"
                    className="w-full px-3 py-2 min-h-11 rounded-md border border-border bg-surface text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Recipient Email *</label>
                  <input
                    type="email"
                    required
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="recipient@company.com"
                    className="w-full px-3 py-2 min-h-11 rounded-md border border-border bg-surface text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Receiving Department</label>
                  <select
                    value={recipientDepartmentId}
                    onChange={(e) => setRecipientDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 min-h-11 rounded-md border border-border bg-surface text-sm"
                  >
                    <option value="">Optional</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Subject *</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="GFC Structural Package — Tower A"
                    className="w-full px-3 py-2 min-h-11 rounded-md border border-border bg-surface text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Select Drawings ({selectedDrawingIds.length} selected) *
                </label>
                <div className="border border-border rounded-md max-h-44 overflow-y-auto divide-y divide-border">
                  {projectDrawings.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3">No drawings with revisions found for this project.</p>
                  ) : (
                    projectDrawings.map((d) => {
                      const checked = selectedDrawingIds.includes(d.drawingId);
                      return (
                        <label
                          key={d.drawingId}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer hover:bg-elevated/50"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleDrawing(d.drawingId)}
                          />
                          <span className="font-medium">{d.drawingNumber}</span>
                          <span className="text-muted-foreground truncate flex-1">{d.title}</span>
                          <span className="text-[11px] text-muted-foreground">Rev {d.currentRevNo}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 min-h-11 rounded-md border border-border text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || selectedDrawingIds.length === 0}
                  className="px-4 py-2 min-h-11 rounded-md bg-theme-btn-primary text-theme-btn-primary-text text-sm font-medium disabled:opacity-50"
                >
                  {submitting ? "Issuing..." : "Issue Transmittal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Acknowledge Modal */}
      {ackTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg w-full max-w-md p-5 space-y-4">
            <h3 className="text-base font-semibold">Acknowledge {ackTarget.transmittalNumber}</h3>
            <p className="text-xs text-muted-foreground">
              Confirm receipt of {ackTarget.items.length} drawing(s) for {ackTarget.projectName}.
            </p>
            <textarea
              rows={3}
              value={ackNotes}
              onChange={(e) => setAckNotes(e.target.value)}
              placeholder="Optional acknowledgment remarks..."
              className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm"
            />
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setAckTarget(null)}
                className="px-4 py-2 min-h-11 rounded-md border border-border text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={ackSubmitting}
                onClick={() => void handleAcknowledge()}
                className="px-4 py-2 min-h-11 rounded-md bg-theme-btn-primary text-theme-btn-primary-text text-sm font-medium"
              >
                {ackSubmitting ? "Saving..." : "Confirm Receipt"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Slip Modal */}
      {activeSlip && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Drawing Transmittal Slip</p>
                <h3 className="text-lg font-semibold">{activeSlip.transmittalNumber}</h3>
              </div>
              <div className="flex gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-border text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSlip(null)}
                  className="p-1.5 rounded hover:bg-elevated"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs border-y border-border py-3">
              <div><span className="text-muted-foreground">Project:</span> {activeSlip.projectName}</div>
              <div><span className="text-muted-foreground">Date:</span> {new Date(activeSlip.issuedAt).toLocaleString("en-IN")}</div>
              <div><span className="text-muted-foreground">Recipient:</span> {activeSlip.recipientName || activeSlip.recipientEmail}</div>
              <div><span className="text-muted-foreground">Purpose:</span> {PURPOSE_LABELS[activeSlip.purpose] || activeSlip.purpose}</div>
              <div><span className="text-muted-foreground">Status:</span> {activeSlip.status}</div>
              <div><span className="text-muted-foreground">Copies:</span> {activeSlip.copiesCount}</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-2">Drawing #</th>
                    <th className="py-2 pr-2">Title</th>
                    <th className="py-2 pr-2">Rev</th>
                    <th className="py-2">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activeSlip.items.map((it) => (
                    <tr key={it.id}>
                      <td className="py-2 pr-2 font-medium">{it.drawingNumber}</td>
                      <td className="py-2 pr-2">{it.drawingTitle}</td>
                      <td className="py-2 pr-2">Rev {it.revNo}</td>
                      <td className="py-2">{PURPOSE_LABELS[it.purpose] || it.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {activeSlip.notes && (
              <p className="text-xs text-muted-foreground">Notes: {activeSlip.notes}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
