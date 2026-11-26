"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { DesignMasterStore, MasterStoreState } from "../services/designMasterStore";
import { ProjectMaster } from "../types/masterTypes";
import { 
  Plus, 
  Layers, 
  Clock, 
  ShieldCheck, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  FileText,
  Save,
  RotateCcw
} from "lucide-react";
import { TransactionFormLayout } from "./DesignTransactionLayout";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";

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
  const [pkgPlannedDate, setPkgPlannedDate] = useState(new Date().toISOString().split("T")[0]);
  const [pkgActualDate, setPkgActualDate] = useState(new Date().toISOString().split("T")[0]);
  const [pkgConsultantId, setPkgConsultantId] = useState("");
  const [pkgTargetDate, setPkgTargetDate] = useState("");
  const [pkgRemarks, setPkgRemarks] = useState("");
  const [pkgError, setPkgError] = useState("");

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

  // Accessible Projects Scoped to Active User
  const accessibleProjects = useMemo(() => {
    return DesignMasterStore.getUserAccessibleProjects();
  }, [storeState.projects, storeState.userAccessList]);

  // Auto-select first project if available
  useEffect(() => {
    if (accessibleProjects.length > 0 && !pkgProjectId) {
      const p = accessibleProjects[0].id;
      setPkgProjectId(p);
      setLaProjectId(p);
      setLiaisonProjectId(p);
    }
  }, [accessibleProjects, pkgProjectId]);

  // Available towers for selected projects including child sub-project wings
  const getAvailableTowersWithSubProjects = (pId: string) => {
    if (!pId) return [];
    const currProj = storeState.projects.find(p => p.id === pId);
    const directTowers = storeState.towers.filter(t => t.projectId === pId).map(t => ({
      ...t,
      displayLabel: currProj?.isSubProject ? `${t.towerName} (${t.towerType}) [${currProj.name}]` : `${t.towerName} (${t.towerType})`
    }));

    const childSubProjects = storeState.projects.filter(p => p.parentProjectId === pId);
    const childTowers = childSubProjects.flatMap(sp => 
      storeState.towers.filter(t => t.projectId === sp.id).map(t => ({
        ...t,
        displayLabel: `${t.towerName} (${t.towerType}) [${sp.name}]`
      }))
    );

    return [...directTowers, ...childTowers];
  };

  const pkgAvailableTowers = useMemo(() => getAvailableTowersWithSubProjects(pkgProjectId), [pkgProjectId, storeState.towers, storeState.projects]);
  const laAvailableTowers = useMemo(() => getAvailableTowersWithSubProjects(laProjectId), [laProjectId, storeState.towers, storeState.projects]);
  const liaisonAvailableTowers = useMemo(() => getAvailableTowersWithSubProjects(liaisonProjectId), [liaisonProjectId, storeState.towers, storeState.projects]);

  if (!isOpen) return null;

  const handleSavePackageStatus = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pkgProjectId || !pkgTowerId || !pkgId) {
      setPkgError("Please select Project, Tower Wing, and Work Package.");
      toast.error("Please select project, tower wing, and work package.");
      return;
    }
    if (!pkgPlannedDate.trim()) {
      setPkgError("Planned Date is mandatory.");
      toast.error("Planned date is mandatory.");
      return;
    }
    if (!pkgActualDate.trim()) {
      setPkgError("Actual Date is mandatory.");
      toast.error("Actual date is mandatory.");
      return;
    }

    const selTower = storeState.towers.find(t => t.id === pkgTowerId);
    const effectiveProjectId = selTower ? selTower.projectId : pkgProjectId;
    const selConsultant = storeState.consultants.find(c => c.id === pkgConsultantId);

    DesignMasterStore.recordPackageStatus(
      effectiveProjectId,
      pkgTowerId,
      pkgId,
      pkgStatus,
      pkgPlannedDate.trim(),
      pkgActualDate.trim(),
      pkgTargetDate || pkgPlannedDate.trim(),
      pkgConsultantId || undefined,
      selConsultant?.name || undefined,
      pkgRemarks || undefined,
      "Senior Design Manager"
    );

    toast.success("Tender Package Status updated with mandatory dates and audit logged!");
    onClose();
  };

  const handleSaveLookAhead = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!laProjectId || !laTowerId || !laDescription.trim()) {
      toast.error("Please fill in Project, Tower Wing, and Deliverable Description.");
      return;
    }

    const selTower = storeState.towers.find(t => t.id === laTowerId);
    const effectiveProjectId = selTower ? selTower.projectId : laProjectId;

    DesignMasterStore.addLookAhead({
      projectId: effectiveProjectId,
      towerId: laTowerId,
      deliverableDescription: laDescription.trim(),
      timeframe: laTimeframe,
      targetDate: laTargetDate || (laTimeframe === "30_DAYS" ? "30 Days Window" : "60 Days Window"),
      priority: laPriority,
      status: "PENDING"
    });

    toast.success("Look-Ahead execution milestone logged successfully!");
    onClose();
  };

  const handleSaveLiaison = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!liaisonProjectId || !liaisonTowerId || !liaisonAuthorityId) {
      toast.error("Please select project, tower wing, and statutory authority.");
      return;
    }

    const selTower = storeState.towers.find(t => t.id === liaisonTowerId);
    const effectiveProjectId = selTower ? selTower.projectId : liaisonProjectId;

    DesignMasterStore.recordStatutoryClearance(
      effectiveProjectId,
      liaisonTowerId,
      liaisonAuthorityId,
      liaisonStatus,
      undefined,
      liaisonRemarks || undefined
    );

    toast.success("Statutory authority onboarding updated successfully!");
    onClose();
  };

  const handleCurrentSave = () => {
    if (activeTab === "PACKAGE") handleSavePackageStatus();
    else if (activeTab === "LOOK_AHEAD") handleSaveLookAhead();
    else handleSaveLiaison();
  };

  const handleCurrentReset = () => {
    if (activeTab === "PACKAGE") {
      setPkgTowerId("");
      setPkgId("");
      setPkgStatus("Received");
      setPkgRemarks("");
      setPkgError("");
    } else if (activeTab === "LOOK_AHEAD") {
      setLaTowerId("");
      setLaDescription("");
      setLaTimeframe("30_DAYS");
      setLaPriority("CRITICAL");
    } else {
      setLiaisonTowerId("");
      setLiaisonAuthorityId("");
      setLiaisonStatus("Onboard");
      setLiaisonRemarks("");
    }
  };

  const title = activeTab === "PACKAGE" 
    ? "Record Tender Package Status" 
    : activeTab === "LOOK_AHEAD" 
    ? "Log Look-Ahead Milestone" 
    : "Update Statutory Authority Onboarding";

  const badge = activeTab === "PACKAGE" 
    ? "Tender Matrix Transaction" 
    : activeTab === "LOOK_AHEAD" 
    ? "Look-Ahead Milestone" 
    : "Liaisoning Clearance";

  const Icon = activeTab === "PACKAGE" ? Layers : activeTab === "LOOK_AHEAD" ? Clock : ShieldCheck;
  const iconBg = activeTab === "PACKAGE" 
    ? "bg-info-soft text-info-text border-info-border" 
    : activeTab === "LOOK_AHEAD" 
    ? "bg-warning-soft text-warning-text border-warning-border" 
    : "bg-surface text-accent-soft-text border-border";

  const saveLabel = activeTab === "PACKAGE" 
    ? "Record Status & Log Audit" 
    : activeTab === "LOOK_AHEAD" 
    ? "Add Milestone" 
    : "Update Authority";

  return (
    <TransactionFormLayout
      title={title}
      badge={badge}
      category="Design Tracking"
      icon={Icon}
      iconBg={iconBg}
      description="Record execution packages, look-ahead milestones, and statutory clearances directly attached to the sidebar."
      breadcrumbs={[
        { label: "Design Tracking", onClick: onClose },
        { label: activeTab === "PACKAGE" ? "Tender Status" : activeTab === "LOOK_AHEAD" ? "Look-Ahead" : "Authority NOC" }
      ]}
      onBack={onClose}
      backLabel="Back to Design Tracking"
      onReset={handleCurrentReset}
      onSave={handleCurrentSave}
      saveLabel={saveLabel}
      saveIcon={Save}
    >
      {/* Tab Selector Banner */}
      <div className="p-1.5 rounded-lg bg-sunken border border-border flex items-center gap-1.5 text-xs max-w-2xl">
        <button
          type="button"
          onClick={() => setActiveTab("PACKAGE")}
          className={`flex-1 py-2 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "PACKAGE" 
              ? "bg-surface text-foreground shadow-xs border border-border" 
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="h-4 w-4 text-info-text" />
          <span>Tender status entry</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("LOOK_AHEAD")}
          className={`flex-1 py-2 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "LOOK_AHEAD" 
              ? "bg-surface text-foreground shadow-xs border border-border" 
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="h-4 w-4 text-warning-text" />
          <span>30/60 Day Look-Ahead</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("LIAISON")}
          className={`flex-1 py-2 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "LIAISON" 
              ? "bg-surface text-foreground shadow-xs border border-border" 
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-accent-soft-text" />
          <span>Statutory authority NOC</span>
        </button>
      </div>

      {/* Form 1: Tender Package Status */}
      {activeTab === "PACKAGE" && (
        <div className="space-y-6 max-w-4xl">
          <AppCard className="border-border shadow-xs">
            <AppCardHeader className="bg-surface/50 border-b border-border pb-3">
              <AppCardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-info-text" />
                <span>Project & location mapping</span>
              </AppCardTitle>
            </AppCardHeader>
            <AppCardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Target project *</label>
                  <select
                    required
                    value={pkgProjectId}
                    onChange={e => {
                      setPkgProjectId(e.target.value);
                      setPkgTowerId("");
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="">Select project</option>
                    {accessibleProjects.map((p: ProjectMaster) => (
                      <option key={p.id} value={p.id}>{p.isSubProject ? `${p.name} (Sub-Project)` : `${p.name}`}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Tower / wing *</label>
                    {pkgProjectId && pkgAvailableTowers.length === 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newTwr = DesignMasterStore.addTower({
                            projectId: pkgProjectId,
                            towerName: "Wing A",
                            towerType: "Sale"
                          });
                          setPkgTowerId(newTwr.id);
                        }}
                        className="h-5 px-2 rounded-md bg-success-soft hover:bg-success-soft text-success-text border border-success-border text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Quick add wing a</span>
                      </button>
                    )}
                  </div>
                  <select
                    required
                    value={pkgTowerId}
                    onChange={e => setPkgTowerId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="">{pkgAvailableTowers.length === 0 ? "No Wings (Click + Quick Add above)" : "Select Wing"}</option>
                    {pkgAvailableTowers.map(t => (
                      <option key={t.id} value={t.id}>{t.displayLabel}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Sub-package deliverable scope *</label>
                <select
                  required
                  value={pkgId}
                  onChange={e => setPkgId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">Select Sub-Package</option>
                  {storeState.packages.map(p => (
                    <option key={p.id} value={p.id}>[{p.disciplineName}] {p.packageName}</option>
                  ))}
                </select>
              </div>

              {pkgError && (
                <div className="p-3 rounded-lg bg-danger-soft border border-danger-border text-danger-text text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{pkgError}</span>
                </div>
              )}
            </AppCardContent>
          </AppCard>

          <AppCard className="border-border shadow-xs">
            <AppCardHeader className="bg-surface/50 border-b border-border pb-3">
              <AppCardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-info-text" />
                <span>Execution timeline & status parameters</span>
              </AppCardTitle>
            </AppCardHeader>
            <AppCardContent className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Delivery status *</label>
                <select
                  value={pkgStatus}
                  onChange={e => setPkgStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="Received">Received (Tender / GFC)</option>
                  <option value="In progress">⏳ In progress / onboard</option>
                  <option value="Pending">Pending / bottleneck</option>
                  <option value="Target Date">Target date forecast</option>
                  <option value="NA">Not applicable (NA)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-muted/20 border border-border">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-info-text" />
                    <span>Planned baseline date * (mandatory)</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={pkgPlannedDate}
                    onChange={e => setPkgPlannedDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-success-text" />
                    <span>Actual / certified delivery date * (mandatory)</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={pkgActualDate}
                    onChange={e => setPkgActualDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Assigned consultant partner</label>
                <select
                  value={pkgConsultantId}
                  onChange={e => setPkgConsultantId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">None / internal team</option>
                  {storeState.consultants.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.category}) - {c.onboardingStatus}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Remarks / audit note</label>
                <input
                  type="text"
                  value={pkgRemarks}
                  onChange={e => setPkgRemarks(e.target.value)}
                  placeholder="e.g. Approved by Structural Consultant with revised column grid notes"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>
            </AppCardContent>
          </AppCard>
        </div>
      )}

      {/* Form 2: Look-Ahead Milestone */}
      {activeTab === "LOOK_AHEAD" && (
        <div className="space-y-6 max-w-4xl">
          <AppCard className="border-border shadow-xs">
            <AppCardHeader className="bg-surface/50 border-b border-border pb-3">
              <AppCardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-warning-text" />
                <span>Project target & wing selection</span>
              </AppCardTitle>
            </AppCardHeader>
            <AppCardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Project *</label>
                  <select
                    required
                    value={laProjectId}
                    onChange={e => {
                      setLaProjectId(e.target.value);
                      setLaTowerId("");
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="">Select project</option>
                    {accessibleProjects.map((p: ProjectMaster) => (
                      <option key={p.id} value={p.id}>{p.isSubProject ? `${p.name} (Sub-Project)` : `${p.name}`}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Tower / wing *</label>
                    {laProjectId && laAvailableTowers.length === 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newTwr = DesignMasterStore.addTower({
                            projectId: laProjectId,
                            towerName: "Wing A",
                            towerType: "Sale"
                          });
                          setLaTowerId(newTwr.id);
                        }}
                        className="h-5 px-2 rounded-md bg-success-soft hover:bg-success-soft text-success-text border border-success-border text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Quick add wing a</span>
                      </button>
                    )}
                  </div>
                  <select
                    required
                    value={laTowerId}
                    onChange={e => setLaTowerId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="">{laAvailableTowers.length === 0 ? "No Wings (Click + Quick Add above)" : "Select Wing"}</option>
                    {laAvailableTowers.map(t => (
                      <option key={t.id} value={t.id}>{t.displayLabel}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Deliverable milestone description *</label>
                <textarea
                  required
                  rows={3}
                  value={laDescription}
                  onChange={e => setLaDescription(e.target.value)}
                  placeholder="e.g. Issue Level 4 Podium Reinforcement Detailing to GCC Contractor"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Timeframe window *</label>
                  <select
                    value={laTimeframe}
                    onChange={e => setLaTimeframe(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="30_DAYS">In 30 days (immediate action)</option>
                    <option value="60_DAYS">⏳ In 60 days (mid-term forecast)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Priority level</label>
                  <select
                    value={laPriority}
                    onChange={e => setLaPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="CRITICAL">Critical (High Urgency)</option>
                    <option value="HIGH">High priority</option>
                    <option value="NORMAL">Normal schedule</option>
                  </select>
                </div>
              </div>
            </AppCardContent>
          </AppCard>
        </div>
      )}

      {/* Form 3: Statutory Authority NOC */}
      {activeTab === "LIAISON" && (
        <div className="space-y-6 max-w-4xl">
          <AppCard className="border-border shadow-xs">
            <AppCardHeader className="bg-surface/50 border-b border-border pb-3">
              <AppCardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent-soft-text dark:text-muted-foreground" />
                <span>Statutory authority & compliance status</span>
              </AppCardTitle>
            </AppCardHeader>
            <AppCardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Project *</label>
                  <select
                    required
                    value={liaisonProjectId}
                    onChange={e => {
                      setLiaisonProjectId(e.target.value);
                      setLiaisonTowerId("");
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="">Select project</option>
                    {accessibleProjects.map((p: ProjectMaster) => (
                      <option key={p.id} value={p.id}>{p.isSubProject ? `${p.name} (Sub-Project)` : `${p.name}`}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Tower / wing *</label>
                    {liaisonProjectId && liaisonAvailableTowers.length === 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newTwr = DesignMasterStore.addTower({
                            projectId: liaisonProjectId,
                            towerName: "Wing A",
                            towerType: "Sale"
                          });
                          setLiaisonTowerId(newTwr.id);
                        }}
                        className="h-5 px-2 rounded-md bg-success-soft hover:bg-success-soft text-success-text border border-success-border text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Quick add wing a</span>
                      </button>
                    )}
                  </div>
                  <select
                    required
                    value={liaisonTowerId}
                    onChange={e => setLiaisonTowerId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="">{liaisonAvailableTowers.length === 0 ? "No Wings (Click + Quick Add above)" : "Select Wing"}</option>
                    {liaisonAvailableTowers.map(t => (
                      <option key={t.id} value={t.id}>{t.displayLabel}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Statutory authority *</label>
                <select
                  required
                  value={liaisonAuthorityId}
                  onChange={e => setLiaisonAuthorityId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">Select authority</option>
                  {storeState.authorities.map(a => (
                    <option key={a.id} value={a.id}>{a.authorityName} ({a.category})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Onboarding / NOC status *</label>
                <select
                  value={liaisonStatus}
                  onChange={e => setLiaisonStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="Onboard">Onboard (Clearance Active)</option>
                  <option value="Fixed consultant">Fixed corporate partner</option>
                  <option value="Not Onboard">Not onboard (action needed)</option>
                  <option value="Compliance Pending">⏳ Compliance pending</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Consultant name / file ref</label>
                <input
                  type="text"
                  value={liaisonRemarks}
                  onChange={e => setLiaisonRemarks(e.target.value)}
                  placeholder="e.g. MPCB consent to establish ref #2026/09"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>
            </AppCardContent>
          </AppCard>
        </div>
      )}
    </TransactionFormLayout>
  );
};
