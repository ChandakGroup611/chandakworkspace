"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Check, Edit2, Plus, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import {
  deleteCoordinationMasterAction,
  fetchAllCoordinationMastersAction,
  saveCoordinationStatusMasterAction,
  saveReviewOutcomeMasterAction,
  saveScheduleIntervalMasterAction,
  saveSlaStatusMasterAction,
  type AllCoordinationMasters,
} from "@/lib/actions/drawing-coordination-masters";

type MasterTab = "INTERVALS" | "STATUSES" | "OUTCOMES" | "SLA";

const inputCls = "w-full text-xs rounded-lg bg-surface border border-border px-2.5 py-1.5 text-foreground";

export function DrawingCoordinationMastersView() {
  const [tab, setTab] = useState<MasterTab>("INTERVALS");
  const [data, setData] = useState<AllCoordinationMasters | null>(null);
  const [loading, setLoading] = useState(true);

  // Shared inline form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [intervalType, setIntervalType] = useState<"WEEKLY" | "MONTHLY" | "CUSTOM">("WEEKLY");
  const [intervalDays, setIntervalDays] = useState(7);
  const [taskStatusCode, setTaskStatusCode] = useState("WORK INPROGRESS");
  const [targetCoordStatus, setTargetCoordStatus] = useState("DRAWING_COORDINATION_COMPLETED");
  const [requiresComment, setRequiresComment] = useState(false);
  const [isTerminal, setIsTerminal] = useState(false);
  const [color, setColor] = useState("#3B82F6");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchAllCoordinationMastersAction(true);
    setLoading(false);
    if (!res.success) {
      toast.error(res.error || "Could not load coordination masters.");
      return;
    }
    setData(res.data || null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setCode("");
    setName("");
    setIntervalType("WEEKLY");
    setIntervalDays(7);
    setTaskStatusCode("WORK INPROGRESS");
    setTargetCoordStatus("DRAWING_COORDINATION_COMPLETED");
    setRequiresComment(false);
    setIsTerminal(false);
    setColor("#3B82F6");
    setIsActive(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let res: { success: boolean; error?: string } = { success: false };
    if (tab === "INTERVALS") {
      res = await saveScheduleIntervalMasterAction({
        id: editingId || undefined,
        code,
        name,
        intervalType,
        intervalDays,
        isActive,
      });
    } else if (tab === "STATUSES") {
      res = await saveCoordinationStatusMasterAction({
        id: editingId || undefined,
        code,
        name,
        taskStatusCode,
        color,
        isTerminal,
        isActive,
      });
    } else if (tab === "OUTCOMES") {
      res = await saveReviewOutcomeMasterAction({
        id: editingId || undefined,
        code,
        name,
        targetCoordinationStatus: targetCoordStatus,
        requiresComment,
        isActive,
      });
    } else {
      res = await saveSlaStatusMasterAction({
        id: editingId || undefined,
        code,
        name,
        color,
        isActive,
      });
    }
    setSaving(false);
    if (!res.success) return toast.error(res.error || "Save failed.");
    toast.success("Master record saved.");
    resetForm();
    load();
  };

  const handleDelete = async (
    table: "drawing_schedule_intervals" | "drawing_coordination_statuses" | "drawing_review_outcomes" | "drawing_sla_statuses",
    id: string
  ) => {
    if (!confirm("Delete this master record?")) return;
    const res = await deleteCoordinationMasterAction(table, id);
    if (!res.success) return toast.error(res.error || "Delete failed.");
    toast.success("Master record deleted.");
    load();
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="flex flex-wrap items-center gap-1 bg-sunken p-1 rounded-lg border border-border w-fit">
        {(
          [
            ["INTERVALS", "Schedule Intervals"],
            ["STATUSES", "Coordination Statuses"],
            ["OUTCOMES", "Review Outcomes"],
            ["SLA", "SLA Statuses"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              resetForm();
            }}
            className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
              tab === id ? "bg-surface text-primary shadow-xs border border-border" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="bg-surface border border-border rounded-xl p-4 space-y-3">
        <div className="font-semibold text-sm text-foreground">
          {editingId ? "Edit Master Record" : "Add Master Record"}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="space-y-1 block">
            <span className="font-semibold text-muted-foreground">Code *</span>
            <input required value={code} onChange={(e) => setCode(e.target.value)} className={`${inputCls} font-mono`} placeholder="e.g. WEEKLY" />
          </label>
          <label className="space-y-1 block">
            <span className="font-semibold text-muted-foreground">Name *</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Display label" />
          </label>

          {tab === "INTERVALS" && (
            <>
              <label className="space-y-1 block">
                <span className="font-semibold text-muted-foreground">Interval Type</span>
                <select value={intervalType} onChange={(e) => setIntervalType(e.target.value as any)} className={inputCls}>
                  <option value="WEEKLY">WEEKLY</option>
                  <option value="MONTHLY">MONTHLY</option>
                  <option value="CUSTOM">CUSTOM</option>
                </select>
              </label>
              <label className="space-y-1 block">
                <span className="font-semibold text-muted-foreground">Days</span>
                <input type="number" min={0} value={intervalDays} onChange={(e) => setIntervalDays(Number(e.target.value) || 0)} className={inputCls} />
              </label>
            </>
          )}

          {tab === "STATUSES" && (
            <>
              <label className="space-y-1 block">
                <span className="font-semibold text-muted-foreground">Mapped Task Status</span>
                <select value={taskStatusCode} onChange={(e) => setTaskStatusCode(e.target.value)} className={inputCls}>
                  {(data?.taskStatusCodes || []).map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 pt-5">
                <input type="checkbox" checked={isTerminal} onChange={(e) => setIsTerminal(e.target.checked)} />
                <span>Terminal / Closed</span>
              </label>
            </>
          )}

          {tab === "OUTCOMES" && (
            <>
              <label className="space-y-1 block">
                <span className="font-semibold text-muted-foreground">Target Status Code</span>
                <input required value={targetCoordStatus} onChange={(e) => setTargetCoordStatus(e.target.value)} className={`${inputCls} font-mono`} />
              </label>
              <label className="flex items-center gap-2 pt-5">
                <input type="checkbox" checked={requiresComment} onChange={(e) => setRequiresComment(e.target.checked)} />
                <span>Requires Comment</span>
              </label>
            </>
          )}

          {tab === "SLA" && (
            <label className="space-y-1 block">
              <span className="font-semibold text-muted-foreground">Badge Color</span>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-20 rounded border border-border bg-surface" />
            </label>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span>Active</span>
          </label>
          <div className="flex items-center gap-2">
            {editingId && (
              <button type="button" onClick={resetForm} className="px-3 py-1.5 rounded-lg border border-border cursor-pointer">
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold cursor-pointer"
            >
              {editingId ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              <span>{editingId ? "Update" : "Add"}</span>
            </button>
          </div>
        </div>
      </form>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {loading ? (
          <p className="py-8 text-center text-muted-foreground">Loading…</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-sunken border-b border-border text-[11px] text-muted-foreground uppercase">
              <tr>
                <th className="py-2 px-3">Code</th>
                <th className="py-2 px-3">Name</th>
                <th className="py-2 px-3">Configuration</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tab === "INTERVALS" &&
                (data?.intervals || []).map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 px-3 font-mono font-semibold">{r.code}</td>
                    <td className="py-2 px-3">{r.name}</td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {r.intervalType} ({r.intervalDays} days)
                    </td>
                    <td className="py-2 px-3">{r.isActive ? "Active" : "Inactive"}</td>
                    <td className="py-2 px-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(r.id);
                          setCode(r.code);
                          setName(r.name);
                          setIntervalType(r.intervalType);
                          setIntervalDays(r.intervalDays);
                          setIsActive(r.isActive);
                        }}
                        className="p-1 rounded border border-border hover:bg-sunken cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete("drawing_schedule_intervals", r.id)}
                        className="p-1 rounded border border-border text-danger-text hover:bg-danger-soft cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}

              {tab === "STATUSES" &&
                (data?.statuses || []).map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 px-3 font-mono font-semibold">{r.code}</td>
                    <td className="py-2 px-3">{r.name}</td>
                    <td className="py-2 px-3 text-muted-foreground">
                      Task: {r.taskStatusCode} {r.isTerminal ? "• Terminal" : ""}
                    </td>
                    <td className="py-2 px-3">{r.isActive ? "Active" : "Inactive"}</td>
                    <td className="py-2 px-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(r.id);
                          setCode(r.code);
                          setName(r.name);
                          setTaskStatusCode(r.taskStatusCode);
                          setIsTerminal(r.isTerminal);
                          setColor(r.color);
                          setIsActive(r.isActive);
                        }}
                        className="p-1 rounded border border-border hover:bg-sunken cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete("drawing_coordination_statuses", r.id)}
                        className="p-1 rounded border border-border text-danger-text hover:bg-danger-soft cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}

              {tab === "OUTCOMES" &&
                (data?.outcomes || []).map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 px-3 font-mono font-semibold">{r.code}</td>
                    <td className="py-2 px-3">{r.name}</td>
                    <td className="py-2 px-3 text-muted-foreground">
                      Target: {r.targetCoordinationStatus} {r.requiresComment ? "• Comment required" : ""}
                    </td>
                    <td className="py-2 px-3">{r.isActive ? "Active" : "Inactive"}</td>
                    <td className="py-2 px-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(r.id);
                          setCode(r.code);
                          setName(r.name);
                          setTargetCoordStatus(r.targetCoordinationStatus);
                          setRequiresComment(r.requiresComment);
                          setIsActive(r.isActive);
                        }}
                        className="p-1 rounded border border-border hover:bg-sunken cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete("drawing_review_outcomes", r.id)}
                        className="p-1 rounded border border-border text-danger-text hover:bg-danger-soft cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}

              {tab === "SLA" &&
                (data?.slaStatuses || []).map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 px-3 font-mono font-semibold">{r.code}</td>
                    <td className="py-2 px-3">{r.name}</td>
                    <td className="py-2 px-3 text-muted-foreground">{r.color}</td>
                    <td className="py-2 px-3">{r.isActive ? "Active" : "Inactive"}</td>
                    <td className="py-2 px-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(r.id);
                          setCode(r.code);
                          setName(r.name);
                          setColor(r.color);
                          setIsActive(r.isActive);
                        }}
                        className="p-1 rounded border border-border hover:bg-sunken cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete("drawing_sla_statuses", r.id)}
                        className="p-1 rounded border border-border text-danger-text hover:bg-danger-soft cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
