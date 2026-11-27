"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Edit2, Link2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import {
  deleteExpectedDeliverableAction,
  fetchExpectedDeliverablesAction,
  matchExpectedDeliverableAction,
  saveExpectedDeliverableAction,
  type ExpectedDeliverableRow,
  type UnmatchedDrawingRow,
} from "@/lib/actions/design-cockpit";

const inputCls = "w-full text-xs rounded-lg bg-surface border border-border px-2.5 py-2 text-foreground";

export const ExpectedDeliverablesView: React.FC = () => {
  const [deliverables, setDeliverables] = useState<ExpectedDeliverableRow[]>([]);
  const [unmatched, setUnmatched] = useState<UnmatchedDrawingRow[]>([]);
  const [summary, setSummary] = useState({ totalExpected: 0, submitted: 0, pending: 0, approved: 0, overdue: 0, unmatched: 0 });
  const [masters, setMasters] = useState<{
    projects: { id: string; name: string }[];
    towers: { id: string; projectId: string; name: string }[];
    packages: { id: string; name: string }[];
    subPackages: { id: string; disciplineId: string; name: string; defaultConsultant: string | null }[];
    consultants: { id: string; name: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"EXPECTED" | "UNMATCHED">("EXPECTED");

  // Add/Edit form
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState("");
  const [towerId, setTowerId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [subPackageId, setSubPackageId] = useState("");
  const [consultantId, setConsultantId] = useState("");
  const [expectedRef, setExpectedRef] = useState("");
  const [title, setTitle] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [responsibleParty, setResponsibleParty] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [milestoneName, setMilestoneName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchExpectedDeliverablesAction();
    setLoading(false);
    if (!res.success) return toast.error(res.error || "Could not load expected deliverables.");
    setDeliverables(res.deliverables || []);
    setUnmatched(res.unmatchedDrawings || []);
    if (res.summary) setSummary(res.summary);
    if (res.masters) {
      setMasters(res.masters);
      if (!projectId && res.masters.projects[0]) setProjectId(res.masters.projects[0].id);
      if (!packageId && res.masters.packages[0]) setPackageId(res.masters.packages[0].id);
    }
  }, [projectId, packageId]);

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return deliverables;
    return deliverables.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        (d.expectedDrawingRef || "").toLowerCase().includes(q) ||
        d.projectName.toLowerCase().includes(q) ||
        d.packageName.toLowerCase().includes(q) ||
        (d.consultantName || "").toLowerCase().includes(q)
    );
  }, [deliverables, query]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const sp = masters?.subPackages.find((s) => s.id === subPackageId);
    const cons = masters?.consultants.find((c) => c.id === consultantId);
    const res = await saveExpectedDeliverableAction({
      id: editingId || undefined,
      projectId,
      towerId: towerId || null,
      packageId,
      subPackageId: subPackageId || null,
      subPackageName: sp?.name || null,
      consultantId: consultantId || null,
      consultantName: cons?.name || null,
      expectedDrawingRef: expectedRef || null,
      title,
      plannedSubmissionDate: plannedDate || null,
      responsibleParty: responsibleParty || null,
      priority,
      milestoneName: milestoneName || null,
    });
    setSaving(false);
    if (!res.success) return toast.error(res.error || "Save failed.");
    toast.success("Expected deliverable saved.");
    setFormOpen(false);
    setEditingId(null);
    setTitle("");
    setExpectedRef("");
    load();
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          ["Total Expected", summary.totalExpected, "text-foreground"],
          ["Submitted", summary.submitted, "text-primary"],
          ["Pending", summary.pending, "text-warning-text"],
          ["Approved", summary.approved, "text-success-text"],
          ["Overdue", summary.overdue, "text-danger-text"],
          ["Unmatched Drawings", summary.unmatched, "text-info-text"],
        ].map(([label, val, cls]) => (
          <div key={String(label)} className="bg-surface border border-border rounded-lg p-3">
            <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
            <div className={`text-xl font-bold ${cls}`}>{val}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-surface border border-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-sunken p-1 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setTab("EXPECTED")}
              className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${tab === "EXPECTED" ? "bg-surface text-primary shadow-xs border border-border" : "text-muted-foreground"}`}
            >
              Expected Schedule ({deliverables.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("UNMATCHED")}
              className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${tab === "UNMATCHED" ? "bg-surface text-primary shadow-xs border border-border" : "text-muted-foreground"}`}
            >
              Unmatched Drawings ({unmatched.length})
            </button>
          </div>
          <div className="relative min-w-52">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search expected deliverables…"
              className={`${inputCls} pl-8 py-1.5`}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-sunken font-semibold cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setTitle("");
              setExpectedRef("");
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Expected Deliverable</span>
          </button>
        </div>
      </div>

      {formOpen && masters && (
        <form onSubmit={handleSave} className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <div className="font-semibold text-sm">{editingId ? "Edit Expected Deliverable" : "New Expected Deliverable"}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="space-y-1 block">
              <span className="font-semibold text-muted-foreground">Project *</span>
              <select required value={projectId} onChange={(e) => { setProjectId(e.target.value); setTowerId(""); }} className={inputCls}>
                {masters.projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="font-semibold text-muted-foreground">Sub-project / Tower</span>
              <select value={towerId} onChange={(e) => setTowerId(e.target.value)} className={inputCls}>
                <option value="">All / Site-wide</option>
                {masters.towers.filter((t) => t.projectId === projectId).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="font-semibold text-muted-foreground">Package (Discipline) *</span>
              <select required value={packageId} onChange={(e) => { setPackageId(e.target.value); setSubPackageId(""); }} className={inputCls}>
                {masters.packages.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="font-semibold text-muted-foreground">Sub-package</span>
              <select
                value={subPackageId}
                onChange={(e) => {
                  const sid = e.target.value;
                  setSubPackageId(sid);
                  const sp = masters.subPackages.find((x) => x.id === sid);
                  if (sp?.defaultConsultant && !consultantId) {
                    const c = masters.consultants.find((x) => x.name === sp.defaultConsultant);
                    if (c) setConsultantId(c.id);
                  }
                }}
                className={inputCls}
              >
                <option value="">Select sub-package…</option>
                {masters.subPackages.filter((s) => s.disciplineId === packageId).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="font-semibold text-muted-foreground">Consultant</span>
              <select value={consultantId} onChange={(e) => setConsultantId(e.target.value)} className={inputCls}>
                <option value="">Select consultant…</option>
                {masters.consultants.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="font-semibold text-muted-foreground">Expected Drawing Ref</span>
              <input value={expectedRef} onChange={(e) => setExpectedRef(e.target.value)} className={`${inputCls} font-mono`} placeholder="e.g. EXP-STR-001" />
            </label>
            <label className="space-y-1 block sm:col-span-2">
              <span className="font-semibold text-muted-foreground">Drawing Title / Description *</span>
              <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Podium Slab Reinforcement Plan" />
            </label>
            <label className="space-y-1 block">
              <span className="font-semibold text-muted-foreground">Planned Submission Date</span>
              <input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} className={inputCls} />
            </label>
            <label className="space-y-1 block">
              <span className="font-semibold text-muted-foreground">Responsible Party</span>
              <input value={responsibleParty} onChange={(e) => setResponsibleParty(e.target.value)} className={inputCls} placeholder="Team or contact" />
            </label>
            <label className="space-y-1 block">
              <span className="font-semibold text-muted-foreground">Priority</span>
              <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className={inputCls}>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="font-semibold text-muted-foreground">Milestone</span>
              <input value={milestoneName} onChange={(e) => setMilestoneName(e.target.value)} className={inputCls} placeholder="e.g. Tender / GFC Stage" />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setFormOpen(false)} className="px-3 py-1.5 rounded-lg border border-border cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold cursor-pointer">
              <Check className="h-3.5 w-3.5" />
              <span>{saving ? "Saving…" : "Save Deliverable"}</span>
            </button>
          </div>
        </form>
      )}

      {tab === "EXPECTED" ? (
        <div className="bg-surface border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-sunken border-b border-border text-[11px] text-muted-foreground uppercase">
              <tr>
                <th className="py-2.5 px-3">Ref &amp; Title</th>
                <th className="py-2.5 px-3">Project / Package</th>
                <th className="py-2.5 px-3">Consultant</th>
                <th className="py-2.5 px-3">Planned Date</th>
                <th className="py-2.5 px-3">Matched Drawing</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No expected deliverables configured yet.</td></tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-sunken/30">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-foreground">{d.title}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{d.expectedDrawingRef || "—"} • {d.priority}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div>{d.projectName}{d.towerName ? ` / ${d.towerName}` : ""}</div>
                      <div className="text-[11px] text-muted-foreground">{d.packageName}{d.subPackageName ? ` / ${d.subPackageName}` : ""}</div>
                    </td>
                    <td className="py-2.5 px-3">{d.consultantName || "—"}</td>
                    <td className="py-2.5 px-3">
                      <span className={d.isOverdue ? "text-danger-text font-semibold" : ""}>{d.plannedSubmissionDate || "—"}</span>
                      {d.isOverdue && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-danger-soft text-danger-text">Overdue</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      {d.matchedDrawingId ? (
                        <div>
                          <span className="font-mono font-semibold text-primary">{d.matchedDrawingNumber} (R{d.matchedRevNo ?? 0})</span>
                          <div className="text-[11px] text-muted-foreground">{d.matchedDrawingStatus}</div>
                        </div>
                      ) : (
                        <span className="text-warning-text font-semibold">Pending Submission</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(d.id);
                          setProjectId(d.projectId);
                          setTowerId(d.towerId || "");
                          setPackageId(d.packageId);
                          setSubPackageId(d.subPackageId || "");
                          setConsultantId(d.consultantId || "");
                          setExpectedRef(d.expectedDrawingRef || "");
                          setTitle(d.title);
                          setPlannedDate(d.plannedSubmissionDate || "");
                          setResponsibleParty(d.responsibleParty || "");
                          setPriority(d.priority);
                          setMilestoneName(d.milestoneName || "");
                          setFormOpen(true);
                        }}
                        className="p-1 rounded border border-border hover:bg-sunken cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm("Delete expected deliverable?")) return;
                          const res = await deleteExpectedDeliverableAction(d.id);
                          if (res.success) { toast.success("Deleted."); load(); }
                          else toast.error(res.error || "Delete failed.");
                        }}
                        className="p-1 rounded border border-border text-danger-text hover:bg-danger-soft cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-sunken border-b border-border text-[11px] text-muted-foreground uppercase">
              <tr>
                <th className="py-2.5 px-3">Drawing</th>
                <th className="py-2.5 px-3">Project / Package</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Match to Expected Deliverable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {unmatched.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">All uploaded drawings are matched.</td></tr>
              ) : (
                unmatched.map((u) => (
                  <tr key={u.drawingId}>
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-semibold">{u.drawingNumber}</div>
                      <div className="text-[11px] text-muted-foreground">{u.title}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div>{u.projectName}</div>
                      <div className="text-[11px] text-muted-foreground">{u.packageName}</div>
                    </td>
                    <td className="py-2.5 px-3">{u.drawingRegisterStatus}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <select
                          defaultValue=""
                          onChange={async (e) => {
                            const eid = e.target.value;
                            if (!eid) return;
                            const res = await matchExpectedDeliverableAction({ expectedId: eid, drawingId: u.drawingId });
                            if (res.success) { toast.success("Drawing matched."); load(); }
                            else toast.error(res.error || "Match failed.");
                          }}
                          className="rounded border border-border bg-background px-2 py-1 text-xs"
                        >
                          <option value="">Link to pending expected deliverable…</option>
                          {deliverables
                            .filter((d) => !d.matchedDrawingId && d.projectId === u.projectId)
                            .map((d) => (
                              <option key={d.id} value={d.id}>{d.expectedDrawingRef ? `[${d.expectedDrawingRef}] ` : ""}{d.title}</option>
                            ))}
                        </select>
                        <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
