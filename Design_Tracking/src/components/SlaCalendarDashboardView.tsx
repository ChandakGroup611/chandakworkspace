"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  PauseCircle,
  PlayCircle,
  Plus,
  Trash2,
  RefreshCw,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  fetchSlaCalendarDashboardAction,
  pauseTrackerSlaAction,
  resumeTrackerSlaAction,
  saveHolidayAction,
  deleteHolidayAction,
  type SlaTrackerItem,
  type SlaPauseLogRow,
  type HolidayRow,
} from "@/lib/actions/design-operations";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/feedback/States";

export function SlaCalendarDashboardView() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [projectFilter, setProjectFilter] = useState("");
  const [trackers, setTrackers] = useState<SlaTrackerItem[]>([]);
  const [pauseLogs, setPauseLogs] = useState<SlaPauseLogRow[]>([]);
  const [holidays, setHolidays] = useState<HolidayRow[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [summary, setSummary] = useState({
    totalActive: 0,
    withinSla: 0,
    dueSoon: 0,
    breached: 0,
    paused: 0,
    holidayCount: 0,
  });
  const [error, setError] = useState<string | null>(null);

  // Pause modal
  const [pauseTarget, setPauseTarget] = useState<SlaTrackerItem | null>(null);
  const [pauseReason, setPauseReason] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  // Add holiday form
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [holidayProjectId, setHolidayProjectId] = useState("");
  const [isStatutory, setIsStatutory] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchSlaCalendarDashboardAction(year, projectFilter || undefined);
    if (!res.success) {
      setError(res.error || "Failed to load SLA calendar");
    } else {
      setTrackers(res.trackers);
      setPauseLogs(res.pauseLogs);
      setHolidays(res.holidays);
      setProjects(res.projects);
      setSummary(res.summary);
    }
    setLoading(false);
  }, [year, projectFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handlePause = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pauseTarget || !pauseReason.trim()) return;
    setActionBusy(true);
    const res = await pauseTrackerSlaAction(pauseTarget.trackerId, pauseReason);
    setActionBusy(false);
    if (!res.success) {
      setError(res.error || "Failed to pause SLA");
      return;
    }
    setPauseTarget(null);
    setPauseReason("");
    await loadData();
  };

  const handleResume = async (t: SlaTrackerItem) => {
    setActionBusy(true);
    const res = await resumeTrackerSlaAction(t.trackerId);
    setActionBusy(false);
    if (!res.success) {
      setError(res.error || "Failed to resume SLA");
      return;
    }
    await loadData();
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionBusy(true);
    const res = await saveHolidayAction({
      projectId: holidayProjectId || null,
      holidayDate,
      holidayName,
      isStatutory,
    });
    setActionBusy(false);
    if (!res.success) {
      setError(res.error || "Failed to save holiday");
      return;
    }
    setHolidayDate("");
    setHolidayName("");
    await loadData();
  };

  const handleDeleteHoliday = async (id: string) => {
    setActionBusy(true);
    const res = await deleteHolidayAction(id);
    setActionBusy(false);
    if (!res.success) {
      setError(res.error || "Failed to delete holiday");
      return;
    }
    await loadData();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
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
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 min-h-11 rounded-md border border-border bg-surface text-sm"
          >
            <option value={2026}>2026 Calendar</option>
            <option value={2027}>2027 Calendar</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-11 rounded-md border border-border bg-surface text-sm hover:bg-elevated"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <AppCard><AppCardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Trackers</p><p className="text-xl font-semibold tabular-nums mt-1">{summary.totalActive}</p></AppCardContent></AppCard>
        <AppCard><AppCardContent className="pt-4"><p className="text-xs text-muted-foreground">Within SLA</p><p className="text-xl font-semibold tabular-nums mt-1 text-emerald-600 dark:text-emerald-400">{summary.withinSla}</p></AppCardContent></AppCard>
        <AppCard><AppCardContent className="pt-4"><p className="text-xs text-muted-foreground">Due Soon</p><p className="text-xl font-semibold tabular-nums mt-1 text-amber-600 dark:text-amber-400">{summary.dueSoon}</p></AppCardContent></AppCard>
        <AppCard><AppCardContent className="pt-4"><p className="text-xs text-muted-foreground">Breached</p><p className="text-xl font-semibold tabular-nums mt-1 text-rose-600 dark:text-rose-400">{summary.breached}</p></AppCardContent></AppCard>
        <AppCard><AppCardContent className="pt-4"><p className="text-xs text-muted-foreground">SLA Paused</p><p className="text-xl font-semibold tabular-nums mt-1 text-sky-600 dark:text-sky-400">{summary.paused}</p></AppCardContent></AppCard>
        <AppCard><AppCardContent className="pt-4"><p className="text-xs text-muted-foreground">Holidays ({year})</p><p className="text-xl font-semibold tabular-nums mt-1">{summary.holidayCount}</p></AppCardContent></AppCard>
      </div>

      <AppCard>
        <AppCardHeader>
          <AppCardTitle className="text-base">Active Drawing SLA Controls (Pause / Resume)</AppCardTitle>
        </AppCardHeader>
        <AppCardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading SLA trackers...</p>
          ) : trackers.length === 0 ? (
            <EmptyState kind="empty" title="No active drawing trackers" description="Approved drawings in coordination appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3">Drawing</th>
                    <th className="py-2 pr-3">Project</th>
                    <th className="py-2 pr-3">SLA Status</th>
                    <th className="py-2 pr-3">Due Date</th>
                    <th className="py-2 pr-3">Total Paused</th>
                    <th className="py-2 pr-3">Pause Reason</th>
                    <th className="py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {trackers.map((t) => (
                    <tr key={t.trackerId} className="hover:bg-elevated/50">
                      <td className="py-2.5 pr-3">
                        <div className="font-medium">{t.drawingNumber}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[220px]">{t.drawingTitle}</div>
                      </td>
                      <td className="py-2.5 pr-3">{t.projectName}</td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        {t.slaPaused ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 px-2 py-0.5 text-xs font-medium">
                            <PauseCircle className="w-3.5 h-3.5" />
                            Paused
                          </span>
                        ) : t.slaStatusCode === "SLA_BREACHED" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 px-2 py-0.5 text-xs font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Breached
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-xs font-medium">
                            {t.slaStatusCode.replace(/_/g, " ")}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-xs whitespace-nowrap">
                        {t.slaDueAt ? new Date(t.slaDueAt).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="py-2.5 pr-3 text-xs tabular-nums">
                        {t.slaTotalPausedMinutes > 0 ? `${Math.round(t.slaTotalPausedMinutes / 60)}h` : "0h"}
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-muted-foreground max-w-[200px] truncate">
                        {t.slaPauseReason || "—"}
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        {t.slaPaused ? (
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() => void handleResume(t)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-9 rounded bg-theme-btn-primary text-theme-btn-primary-text text-xs font-medium"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            Resume SLA
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() => {
                              setPauseTarget(t);
                              setPauseReason("");
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-9 rounded border border-border text-xs hover:bg-elevated"
                          >
                            <PauseCircle className="w-3.5 h-3.5" />
                            Pause SLA
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AppCardContent>
      </AppCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AppCard>
          <AppCardHeader>
            <AppCardTitle className="text-base">Holiday Calendar ({year})</AppCardTitle>
          </AppCardHeader>
          <AppCardContent className="space-y-3">
            <form onSubmit={handleAddHoliday} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="date"
                required
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
                className="px-2.5 py-2 min-h-10 rounded-md border border-border bg-surface text-xs"
              />
              <input
                type="text"
                required
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                placeholder="Holiday name"
                className="px-2.5 py-2 min-h-10 rounded-md border border-border bg-surface text-xs"
              />
              <select
                value={holidayProjectId}
                onChange={(e) => setHolidayProjectId(e.target.value)}
                className="px-2.5 py-2 min-h-10 rounded-md border border-border bg-surface text-xs"
              >
                <option value="">Global (All)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={actionBusy}
                className="inline-flex items-center justify-center gap-1 px-3 py-2 min-h-10 rounded-md bg-theme-btn-primary text-theme-btn-primary-text text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </form>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                id="stat-hol"
                type="checkbox"
                checked={isStatutory}
                onChange={(e) => setIsStatutory(e.target.checked)}
              />
              <label htmlFor="stat-hol">Statutory holiday</label>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-border border border-border rounded-md">
              {holidays.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3">No holidays configured for {year}.</p>
              ) : (
                holidays.map((h) => (
                  <div key={h.id} className="flex items-center justify-between px-3 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium tabular-nums">{h.holidayDate}</span>
                      <span>{h.holidayName}</span>
                      <span className="text-muted-foreground">({h.projectName})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteHoliday(h.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-500/10 rounded"
                      aria-label="Delete holiday"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </AppCardContent>
        </AppCard>

        <AppCard>
          <AppCardHeader>
            <AppCardTitle className="text-base">Recent SLA Pause / Resume Audit</AppCardTitle>
          </AppCardHeader>
          <AppCardContent>
            {pauseLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No SLA pause or resume events recorded yet.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-border">
                {pauseLogs.map((l) => (
                  <div key={l.id} className="py-2.5 text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {l.drawingNumber} · {l.action}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(l.createdAt).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      {l.reason}
                      {l.action === "RESUME" && l.pausedMinutes > 0 ? ` · Extended by ${l.pausedMinutes} min` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </AppCardContent>
        </AppCard>
      </div>

      {pauseTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg w-full max-w-md p-5 space-y-4">
            <h3 className="text-base font-semibold">Pause SLA — {pauseTarget.drawingNumber}</h3>
            <p className="text-xs text-muted-foreground">
              SLA breach checks are suspended while paused. Resuming automatically extends the due date by the paused duration.
            </p>
            <form onSubmit={handlePause} className="space-y-3">
              <textarea
                required
                rows={3}
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="Reason (e.g., Awaiting client brief clarification / statutory hold)..."
                className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm"
              />
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPauseTarget(null)}
                  className="px-4 py-2 min-h-11 rounded-md border border-border text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionBusy}
                  className="px-4 py-2 min-h-11 rounded-md bg-theme-btn-primary text-theme-btn-primary-text text-sm font-medium"
                >
                  {actionBusy ? "Pausing..." : "Confirm Pause"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
