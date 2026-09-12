"use client";

import React, { useState, useEffect } from "react";
import { DesignMasterStore, MasterStoreState } from "../services/designMasterStore";
import { 
  Plus, 
  X, 
  Layers, 
  Clock, 
  ShieldCheck, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  FileText
} from "lucide-react";

interface DataEntryFormsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "PACKAGE" | "LOOK_AHEAD" | "LIAISON";
}

export const DataEntryFormsModal: React.FC<DataEntryFormsModalProps> = ({
  isOpen,
  onClose,
  defaultTab = "PACKAGE"
}) => {
  const [storeState, setStoreState] = useState<MasterStoreState>(DesignMasterStore.getState());
  const [activeTab, setActiveTab] = useState<"PACKAGE" | "LOOK_AHEAD" | "LIAISON">(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    const unsub = DesignMasterStore.subscribe(() => {
      setStoreState({ ...DesignMasterStore.getState() });
    });
    return () => unsub();
  }, []);

  // Form 1: Package Status Entry
  const [pkgProjectId, setPkgProjectId] = useState("");
  const [pkgTowerId, setPkgTowerId] = useState("");
  const [pkgId, setPkgId] = useState("");
  const [pkgStatus, setPkgStatus] = useState<"Received" | "In progress" | "Pending" | "Target Date" | "NA">("Received");
  const [pkgTargetDate, setPkgTargetDate] = useState("");
  const [pkgRemarks, setPkgRemarks] = useState("");

  // Form 2: Look-Ahead Milestone Entry
  const [laProjectId, setLaProjectId] = useState("");
  const [laTowerId, setLaTowerId] = useState("");
  const [laDescription, setLaDescription] = useState("");
  const [laTimeframe, setLaTimeframe] = useState<"30_DAYS" | "60_DAYS">("30_DAYS");
  const [laTargetDate, setLaTargetDate] = useState("");
  const [laPriority, setLaPriority] = useState<"CRITICAL" | "HIGH" | "NORMAL">("CRITICAL");

  // Form 3: Statutory Liaisoning Entry
  const [liaisonProjectId, setLiaisonProjectId] = useState("");
  const [liaisonTowerId, setLiaisonTowerId] = useState("");
  const [liaisonAuthorityId, setLiaisonAuthorityId] = useState("");
  const [liaisonStatus, setLiaisonStatus] = useState<"Onboard" | "Fixed consultant" | "Not Onboard" | "Compliance Pending">("Onboard");
  const [liaisonRemarks, setLiaisonRemarks] = useState("");

  // Auto-select first project if available
  useEffect(() => {
    if (storeState.projects.length > 0 && !pkgProjectId) {
      const p = storeState.projects[0].id;
      setPkgProjectId(p);
      setLaProjectId(p);
      setLiaisonProjectId(p);
    }
  }, [storeState.projects, pkgProjectId]);

  // Available towers for selected projects
  const pkgAvailableTowers = storeState.towers.filter(t => t.projectId === pkgProjectId);
  const laAvailableTowers = storeState.towers.filter(t => t.projectId === laProjectId);
  const liaisonAvailableTowers = storeState.towers.filter(t => t.projectId === liaisonProjectId);

  if (!isOpen) return null;

  const handleSavePackageStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgProjectId || !pkgTowerId || !pkgId) {
      alert("Please select Project, Tower Wing, and Work Package.");
      return;
    }

    DesignMasterStore.recordPackageStatus(
      pkgProjectId,
      pkgTowerId,
      pkgId,
      pkgStatus,
      pkgTargetDate || undefined,
      undefined,
      pkgRemarks || undefined
    );

    alert("Tender Package Status updated! Matrix output updated.");
    onClose();
  };

  const handleSaveLookAhead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!laProjectId || !laTowerId || !laDescription.trim()) {
      alert("Please fill in Project, Tower Wing, and Deliverable Description.");
      return;
    }

    DesignMasterStore.addLookAhead({
      projectId: laProjectId,
      towerId: laTowerId,
      deliverableDescription: laDescription.trim(),
      timeframe: laTimeframe,
      targetDate: laTargetDate || (laTimeframe === "30_DAYS" ? "30 Days Window" : "60 Days Window"),
      priority: laPriority,
      status: "PENDING"
    });

    alert("Look-Ahead execution milestone logged!");
    onClose();
  };

  const handleSaveLiaison = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liaisonProjectId || !liaisonTowerId || !liaisonAuthorityId) {
      alert("Please select Project, Tower Wing, and Statutory Authority.");
      return;
    }

    DesignMasterStore.recordStatutoryClearance(
      liaisonProjectId,
      liaisonTowerId,
      liaisonAuthorityId,
      liaisonStatus,
      undefined,
      liaisonRemarks || undefined
    );

    alert("Statutory Authority onboarding updated!");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-surface border border-border w-full max-w-lg rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span>Live Data Fill Entry</span>
            </span>
            <h4 className="text-base font-black text-foreground">
              Record Execution Data
            </h4>
            <p className="text-xs text-muted-foreground">
              Fill project tender packages, milestones, and statutory clearances. Output dashboards calculate automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-border flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("PACKAGE")}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "PACKAGE" ? "bg-surface text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Tender Status</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("LOOK_AHEAD")}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "LOOK_AHEAD" ? "bg-surface text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Look-Ahead</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("LIAISON")}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "LIAISON" ? "bg-surface text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Authority NOC</span>
          </button>
        </div>

        {/* Form 1: Tender Package Status */}
        {activeTab === "PACKAGE" && (
          <form onSubmit={handleSavePackageStatus} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Project *</label>
                <select
                  required
                  value={pkgProjectId}
                  onChange={e => {
                    setPkgProjectId(e.target.value);
                    setPkgTowerId("");
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-foreground font-semibold"
                >
                  <option value="">Select Project</option>
                  {storeState.projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Tower / Wing *</label>
                <select
                  required
                  value={pkgTowerId}
                  onChange={e => setPkgTowerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-foreground font-semibold"
                >
                  <option value="">Select Wing</option>
                  {pkgAvailableTowers.map(t => (
                    <option key={t.id} value={t.id}>{t.towerName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Work Package *</label>
              <select
                required
                value={pkgId}
                onChange={e => setPkgId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-foreground font-semibold"
              >
                <option value="">Select Package</option>
                {storeState.packages.map(p => (
                  <option key={p.id} value={p.id}>[{p.disciplineName}] {p.packageName}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Status *</label>
                <select
                  value={pkgStatus}
                  onChange={e => setPkgStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-foreground font-semibold"
                >
                  <option value="Received">✅ Received (Tender / GFC)</option>
                  <option value="In progress">⏳ In Progress / Onboard</option>
                  <option value="Pending">⚠️ Pending / Bottleneck</option>
                  <option value="Target Date">📅 Target Date Forecast</option>
                  <option value="NA">⚪ Not Applicable (NA)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Target Date / Milestone</label>
                <input
                  type="text"
                  placeholder="e.g. 30-Oct, 2026-11-15"
                  value={pkgTargetDate}
                  onChange={e => setPkgTargetDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50 text-foreground"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Remarks / Action Item</label>
              <input
                type="text"
                placeholder="e.g. Consultant drafting BOQ; Pending structural approval"
                value={pkgRemarks}
                onChange={e => setPkgRemarks(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50 text-foreground"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-border text-muted-foreground cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-md">
                Record Status
              </button>
            </div>
          </form>
        )}

        {/* Form 2: Look-Ahead Milestone */}
        {activeTab === "LOOK_AHEAD" && (
          <form onSubmit={handleSaveLookAhead} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Project *</label>
                <select
                  required
                  value={laProjectId}
                  onChange={e => {
                    setLaProjectId(e.target.value);
                    setLaTowerId("");
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-foreground font-semibold"
                >
                  <option value="">Select Project</option>
                  {storeState.projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Tower / Wing *</label>
                <select
                  required
                  value={laTowerId}
                  onChange={e => setLaTowerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-foreground font-semibold"
                >
                  <option value="">Select Wing</option>
                  {laAvailableTowers.map(t => (
                    <option key={t.id} value={t.id}>{t.towerName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Deliverable Milestone Description *</label>
              <textarea
                required
                rows={2}
                placeholder="e.g. Civil & Structural Tender Release with BOQ"
                value={laDescription}
                onChange={e => setLaDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50 text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Timeframe Window *</label>
                <select
                  value={laTimeframe}
                  onChange={e => setLaTimeframe(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-foreground font-semibold"
                >
                  <option value="30_DAYS">🚨 In 30 Days (Immediate Action)</option>
                  <option value="60_DAYS">⏳ In 60 Days (Mid-Term Forecast)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Priority Level</label>
                <select
                  value={laPriority}
                  onChange={e => setLaPriority(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-foreground font-semibold"
                >
                  <option value="CRITICAL">Critical (High Urgency)</option>
                  <option value="HIGH">High Priority</option>
                  <option value="NORMAL">Normal Schedule</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-border text-muted-foreground cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer shadow-md">
                Add Look-Ahead
              </button>
            </div>
          </form>
        )}

        {/* Form 3: Statutory Authority NOC */}
        {activeTab === "LIAISON" && (
          <form onSubmit={handleSaveLiaison} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Project *</label>
                <select
                  required
                  value={liaisonProjectId}
                  onChange={e => {
                    setLiaisonProjectId(e.target.value);
                    setLiaisonTowerId("");
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-foreground font-semibold"
                >
                  <option value="">Select Project</option>
                  {storeState.projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Tower / Wing *</label>
                <select
                  required
                  value={liaisonTowerId}
                  onChange={e => setLiaisonTowerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-foreground font-semibold"
                >
                  <option value="">Select Wing</option>
                  {liaisonAvailableTowers.map(t => (
                    <option key={t.id} value={t.id}>{t.towerName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Statutory Authority *</label>
              <select
                required
                value={liaisonAuthorityId}
                onChange={e => setLiaisonAuthorityId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-foreground font-semibold"
              >
                <option value="">Select Authority</option>
                {storeState.authorities.map(a => (
                  <option key={a.id} value={a.id}>{a.authorityName} ({a.category})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Onboarding / NOC Status *</label>
              <select
                value={liaisonStatus}
                onChange={e => setLiaisonStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-foreground font-semibold"
              >
                <option value="Onboard">✅ Onboard (Clearance Active)</option>
                <option value="Fixed consultant">🔷 Fixed Corporate Partner</option>
                <option value="Not Onboard">⚠️ Not Onboard (Action Needed)</option>
                <option value="Compliance Pending">⏳ Compliance Pending</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Consultant Name / File Ref</label>
              <input
                type="text"
                placeholder="e.g. Architect firm name, BMC File #2026/894"
                value={liaisonRemarks}
                onChange={e => setLiaisonRemarks(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50 text-foreground"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-border text-muted-foreground cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer shadow-md">
                Update Authority
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
