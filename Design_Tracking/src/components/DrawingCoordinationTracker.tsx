"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  closeDrawingCoordinationAction,
  confirmDesignReceivedAction,
  confirmDrawingReceivedAction,
  fetchDrawingCoordinationDetailAction,
  fetchDrawingCoordinationTrackersAction,
  retryDrawingTaskSyncAction,
  submitCoordinationReviewOutcomeAction,
  updateCoordinationScheduleAction,
  type DrawingAuditTimelineRow,
  type DrawingTrackerRow,
} from "@/lib/actions/drawing-coordination";
import {
  fetchAllCoordinationMastersAction,
  type AllCoordinationMasters,
} from "@/lib/actions/drawing-coordination-masters";

const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      })
    : "—";

const SLA_BADGE: Record<string, string> = {
  WITHIN_SLA: "bg-success-soft text-success-text border-success-border",
  DUE_SOON: "bg-warning-soft text-warning-text border-warning-border",
  OVERDUE: "bg-warning-soft text-warning-text border-warning-border",
  SLA_BREACHED: "bg-danger-soft text-danger-text border-danger-border",
  RESOLVED: "bg-sunken text-muted-foreground border-border",
};

export const DrawingCoordinationTracker: React.FC = () => {
  const [trackers, setTrackers] = useState<DrawingTrackerRow[]>([]);
  const [departments, setDepartments] = useState<{ id: string; code: string; name: string }[]>([]);
  const [masters, setMasters] = useState<AllCoordinationMasters | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [slaFilter, setSlaFilter] = useState("ALL");

  // Selected tracker detail view (full-width inline)
  const [selected, setSelected] = useState<DrawingTrackerRow | null>(null);
  const [auditLogs, setAuditLogs] = useState<DrawingAuditTimelineRow[]>([]);
  const [generations, setGenerations] = useState<
    { generationNo: number; taskId: string; scheduledFor: string | null; revNo: number; createdAt: string }[]
  >([]);
  const [busy, setBusy] = useState(false);

  // Action form state
  const [remarks, setRemarks] = useState("");
  const [outcomeCode, setOutcomeCode] = useState("ACCEPT");
  const [receivingDeptId, setReceivingDeptId] = useState("");
  const [nextCheckCode, setNextCheckCode] = useState("WEEKLY");
  const [nextCheckCustomDate, setNextCheckCustomDate] = useState("");
  const [nextCreationCode, setNextCreationCode] = useState("MONTHLY");
  const [nextCreationCustomDate, setNextCreationCustomDate] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [trRes, mRes] = await Promise.all([
      fetchDrawingCoordinationTrackersAction(),
      fetchAllCoordinationMastersAction(false),
    ]);
    setLoading(false);
    if (!trRes.success) {
      setError(trRes.error || "Could not load Drawing Register Tracker.");
      return;
    }
    const list = trRes.trackers || [];
    setTrackers(list);
    setDepartments(trRes.departments || []);
    if (mRes.success && mRes.data) {
      setMasters(mRes.data);
      if (mRes.data.outcomes.length > 0) setOutcomeCode(mRes.data.outcomes[0].code);
    }
    if (selected) {
      const updated = list.find((x) => x.id === selected.id) || null;
      setSelected(updated);
    }
  }, [selected?.id]);

  useEffect(() => {
    load();
  }, []);

  const loadDetail = useCallback(async (t: DrawingTrackerRow) => {
    setSelected(t);
    setReceivingDeptId(t.receivingDepartmentId || "");
    setNextCheckCode(t.nextCheckIntervalCode || "WEEKLY");
    setNextCreationCode(t.nextCreationIntervalCode || "MONTHLY");
    setRemarks("");
    const res = await fetchDrawingCoordinationDetailAction(t.id);
    if (res.success) {
      setAuditLogs(res.auditLogs || []);
      setGenerations(res.generations || []);
    }
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return trackers.filter((t) => {
      if (statusFilter !== "ALL" && t.coordinationStatusCode !== statusFilter) return false;
      if (slaFilter !== "ALL" && t.slaStatusCode !== slaFilter) return false;
      if (
        q &&
        !t.drawingNumber.toLowerCase().includes(q) &&
        !(t.referenceNumber || "").toLowerCase().includes(q) &&
        !t.drawingTitle.toLowerCase().includes(q) &&
        !t.projectName.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [trackers, query, statusFilter, slaFilter]);

  const runAction = async (fn: () => Promise<{ success: boolean; error?: string }>, okMsg: string) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (!res.success) return toast.error(res.error || "Action failed.");
    toast.success(okMsg);
    setRemarks("");
    await load();
    if (selected) await loadDetail(selected);
  };

  if (selected) {
    const canConfirmReceipt =
      !selected.isClosed &&
      (selected.coordinationStatusCode === "AWAITING_DRAWING_RECEIPT" ||
        selected.coordinationStatusCode === "AWAITING_RE_RECEIPT" ||
        selected.coordinationStatusCode === "REVISED_DRAWING_SUBMITTED");
    const canConfirmDesignReceived =
      !selected.isClosed && selected.coordinationStatusCode === "DRAWING_RECEIVED";
    const canSubmitOutcome =
      !selected.isClosed &&
      (selected.coordinationStatusCode === "DESIGN_RECEIVED" ||
        selected.coordinationStatusCode === "UNDER_REVIEW");
    const canClose =
      !selected.isClosed &&
      selected.coordinationStatusCode === "DRAWING_COORDINATION_COMPLETED";

    return (
      <div className="space-y-4 text-xs">
        <div className="bg-surface border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-semibold text-sm text-foreground">{selected.drawingNumber}</span>
              <span className="px-2 py-0.5 rounded bg-accent-soft text-primary font-mono font-semibold">
                R{selected.currentRevNo}
              </span>
              <span className="px-2 py-0.5 rounded-full border border-border bg-sunken font-semibold">
                {selected.coordinationStatusName}
              </span>
              <span className={`px-2 py-0.5 rounded-full border font-semibold ${SLA_BADGE[selected.slaStatusCode] || SLA_BADGE.WITHIN_SLA}`}>
                {selected.slaStatusName}
              </span>
            </div>
            <div className="text-muted-foreground">
              {selected.drawingTitle} &bull; {selected.projectName} ({selected.disciplineName})
              {selected.referenceNumber ? ` • Ref: ${selected.referenceNumber}` : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-sunken font-semibold cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Tracker</span>
          </button>
        </div>

        {selected.taskSyncStatus === "FAILED" && (
          <div className="p-3 rounded-lg border border-danger-border bg-danger-soft text-danger-text flex flex-wrap items-center justify-between gap-2">
            <span>Task creation failed: {selected.taskSyncError || "Unknown error"}</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => runAction(() => retryDrawingTaskSyncAction(selected.id), "Task synced successfully.")}
              className="px-3 py-1 rounded bg-primary text-primary-foreground font-semibold cursor-pointer"
            >
              Retry Task Sync
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left: Location, Actions & Schedule */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
              <div className="font-semibold text-sm text-foreground">Current Drawing Location &amp; Status</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <div className="text-[11px] text-muted-foreground">Responsible Dept</div>
                  <div className="font-semibold">{selected.currentResponsibleDepartmentName || "Not assigned"}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Responsible User</div>
                  <div className="font-semibold">{selected.currentResponsibleUserName || "—"}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Pending Action</div>
                  <div className="font-semibold text-primary">{selected.pendingAction || "None"}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Last Handover</div>
                  <div>{fmtDate(selected.lastHandoverAt)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Last Drawing Received</div>
                  <div>{fmtDate(selected.lastReceivedAt)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Design Received</div>
                  <div>{fmtDate(selected.designReceivedAt)}</div>
                </div>
              </div>
            </div>

            {!selected.isClosed && (
              <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
                <div className="font-semibold text-sm text-foreground">Workflow Actions (Rev R{selected.currentRevNo})</div>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter remarks, receipt notes, or return reason…"
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-xs"
                />
                <div className="flex flex-wrap items-center gap-2">
                  {canConfirmReceipt && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        runAction(
                          () => confirmDrawingReceivedAction({ trackerId: selected.id, revNo: selected.currentRevNo, remarks }),
                          "Drawing Received confirmed."
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Confirm Drawing Received</span>
                    </button>
                  )}
                  {canConfirmDesignReceived && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        runAction(
                          () => confirmDesignReceivedAction({ trackerId: selected.id, revNo: selected.currentRevNo, remarks }),
                          "Design Received confirmed."
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold cursor-pointer"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Confirm Design Received</span>
                    </button>
                  )}
                  {canSubmitOutcome && (
                    <div className="flex flex-wrap items-center gap-2 w-full pt-1">
                      <select
                        value={outcomeCode}
                        onChange={(e) => setOutcomeCode(e.target.value)}
                        aria-label="Review outcome"
                        className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium"
                      >
                        {(masters?.outcomes || []).map((o) => (
                          <option key={o.id} value={o.code}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          runAction(
                            () =>
                              submitCoordinationReviewOutcomeAction({
                                trackerId: selected.id,
                                outcomeCode,
                                revNo: selected.currentRevNo,
                                remarks,
                              }),
                            "Review outcome recorded."
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Submit Review Outcome</span>
                      </button>
                    </div>
                  )}
                  {canClose && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        runAction(
                          () => closeDrawingCoordinationAction({ trackerId: selected.id, remarks }),
                          "Drawing coordination formally closed."
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success text-white font-semibold cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Close Drawing Coordination</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {!selected.isClosed && (
              <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
                <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  <span>Handover Department, Next Check &amp; Next Creation</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="block space-y-1">
                    <span className="font-semibold text-muted-foreground">Receiving Department</span>
                    <select
                      value={receivingDeptId}
                      onChange={(e) => setReceivingDeptId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
                    >
                      <option value="">Select department…</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="font-semibold text-muted-foreground">Next Check</span>
                    <select
                      value={nextCheckCode}
                      onChange={(e) => setNextCheckCode(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
                    >
                      {(masters?.intervals || []).map((i) => (
                        <option key={i.id} value={i.code}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                    {nextCheckCode === "CUSTOM" && (
                      <input
                        type="date"
                        value={nextCheckCustomDate}
                        onChange={(e) => setNextCheckCustomDate(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs mt-1"
                      />
                    )}
                  </label>
                  <label className="block space-y-1">
                    <span className="font-semibold text-muted-foreground">Next Creation</span>
                    <select
                      value={nextCreationCode}
                      onChange={(e) => setNextCreationCode(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
                    >
                      {(masters?.intervals || []).map((i) => (
                        <option key={i.id} value={i.code}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                    {nextCreationCode === "CUSTOM" && (
                      <input
                        type="date"
                        value={nextCreationCustomDate}
                        onChange={(e) => setNextCreationCustomDate(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs mt-1"
                      />
                    )}
                  </label>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>
                    Next Check: <strong>{fmtDate(selected.nextCheckAt)}</strong> &bull; Next Creation:{" "}
                    <strong>{fmtDate(selected.nextCreationAt)}</strong>
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      runAction(
                        () =>
                          updateCoordinationScheduleAction({
                            trackerId: selected.id,
                            receivingDepartmentId: receivingDeptId || null,
                            nextCheckCode,
                            nextCheckCustomDate: nextCheckCustomDate || null,
                            nextCreationCode,
                            nextCreationCustomDate: nextCreationCustomDate || null,
                          }),
                        "Schedule & handover updated."
                      )
                    }
                    className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-sunken font-semibold cursor-pointer text-foreground"
                  >
                    Save Schedule
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Audit Timeline & Task Generations */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-surface border border-border rounded-xl p-4 space-y-2.5">
              <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>Chronological Audit Timeline</span>
              </div>
              {auditLogs.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center">No audit events recorded yet.</p>
              ) : (
                <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                  {auditLogs.map((a) => (
                    <div key={a.id} className="p-2.5 rounded-lg border border-border bg-sunken/40 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground">{a.action.replace(/_/g, " ")}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">R{a.revNo}</span>
                      </div>
                      {(a.previousStatus || a.newStatus) && (
                        <div className="text-[11px] text-muted-foreground">
                          {a.previousStatus || "—"} &rarr; <strong className="text-foreground">{a.newStatus || "—"}</strong>
                        </div>
                      )}
                      {a.details?.remarks && (
                        <div className="text-[11px] text-foreground bg-surface p-1.5 rounded border border-border">
                          {a.details.remarks}
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground">
                        {a.actorEmail || "System"} &bull; {fmtDate(a.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {generations.length > 0 && (
              <div className="bg-surface border border-border rounded-xl p-4 space-y-2">
                <div className="font-semibold text-sm text-foreground">Task Generations ({generations.length})</div>
                <div className="space-y-1.5">
                  {generations.map((g) => (
                    <div key={g.generationNo} className="flex items-center justify-between text-[11px] p-2 rounded border border-border bg-sunken/30">
                      <span className="font-semibold">Gen #{g.generationNo} (R{g.revNo})</span>
                      <span className="text-muted-foreground">{fmtDate(g.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-surface border border-border p-3 rounded-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search drawing no, ref, title, project…"
              className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-xs"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by coordination status"
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
          >
            <option value="ALL">All coordination statuses</option>
            {(masters?.statuses || []).map((s) => (
              <option key={s.id} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={slaFilter}
            onChange={(e) => setSlaFilter(e.target.value)}
            aria-label="Filter by SLA status"
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
          >
            <option value="ALL">All SLA statuses</option>
            {(masters?.slaStatuses || []).map((s) => (
              <option key={s.id} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-sunken font-semibold cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <p className="p-3 rounded-lg border border-danger-border bg-danger-soft text-danger-text">{error}</p>
      )}

      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-sunken border-b border-border text-[11px] text-muted-foreground uppercase">
              <tr>
                <th className="py-2.5 px-3">Drawing / Ref</th>
                <th className="py-2.5 px-3">Project &amp; Discipline</th>
                <th className="py-2.5 px-3">Rev</th>
                <th className="py-2.5 px-3">Coordination Status</th>
                <th className="py-2.5 px-3">Current Location</th>
                <th className="py-2.5 px-3">Next Check / Creation</th>
                <th className="py-2.5 px-3">SLA</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-muted-foreground">
                    Loading Drawing Register Tracker…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-muted-foreground">
                    No approved drawings in the coordination tracker yet.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-sunken/40">
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-semibold text-foreground">{t.drawingNumber}</div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-52">{t.drawingTitle}</div>
                      {t.referenceNumber && (
                        <div className="text-[10px] font-mono text-muted-foreground">Ref: {t.referenceNumber}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-foreground">{t.projectName}</div>
                      <div className="text-[11px] text-muted-foreground">{t.disciplineName}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold">R{t.currentRevNo}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-foreground">{t.coordinationStatusName}</div>
                      {t.pendingAction && (
                        <div className="text-[10px] text-primary">{t.pendingAction}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium">{t.currentResponsibleDepartmentName || "—"}</div>
                      <div className="text-[11px] text-muted-foreground">{t.currentResponsibleUserName || ""}</div>
                    </td>
                    <td className="py-2.5 px-3 text-[11px]">
                      <div>Check: {fmtDate(t.nextCheckAt)}</div>
                      <div className="text-muted-foreground">Create: {fmtDate(t.nextCreationAt)}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-semibold ${SLA_BADGE[t.slaStatusCode] || SLA_BADGE.WITHIN_SLA}`}>
                        {t.slaStatusName}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => loadDetail(t)}
                        className="px-2.5 py-1 rounded-lg border border-border bg-surface hover:bg-sunken font-semibold cursor-pointer"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
