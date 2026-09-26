"use client";

import React, { useState, useMemo } from "react";
import { 
  FileCheck2, 
  Send, 
  Search, 
  Plus, 
  Printer, 
  CheckCircle2, 
  Clock, 
  Building2, 
  FileText, 
  Layers, 
  AlertCircle, 
  ExternalLink,
  QrCode,
  ShieldCheck,
  X,
  Eye,
  UserCheck,
  Download,
  Trash2
} from "lucide-react";
import { DesignMasterStore } from "../services/designMasterStore";
import { TransmittalItem, TransmittalPurpose } from "../types";
import { DesignMultiSelectDropdown } from "./DesignMultiSelectDropdown";
import { TransactionFormLayout, WorkingDocumentLayout } from "./DesignTransactionLayout";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";

export function TransmittalManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedPurposes, setSelectedPurposes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTransmittal, setSelectedTransmittal] = useState<TransmittalItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPrintSlipOpen, setIsPrintSlipOpen] = useState(false);

  // Form State
  const [projectId, setProjectId] = useState("");
  const [towerName, setTowerName] = useState("");
  const [recipientAgency, setRecipientAgency] = useState("");
  const [recipientContact, setRecipientContact] = useState("");
  const [purpose, setPurpose] = useState<TransmittalPurpose>("GOOD_FOR_CONSTRUCTION");
  const [issuedBy, setIssuedBy] = useState("Lead Design Manager");
  const [selectedDrawingIds, setSelectedDrawingIds] = useState<string[]>([]);
  const [remarks, setRemarks] = useState("");
  const [copiesPerDrawing, setCopiesPerDrawing] = useState<number>(3);
  const [formError, setFormError] = useState("");

  const projects = useMemo(() => {
    return DesignMasterStore.getUserAccessibleProjects();
  }, []);

  const accessibleProjectIds = useMemo(() => new Set(projects.map(p => p.id)), [projects]);

  const transmittals = useMemo(() => {
    const all = DesignMasterStore.getTransmittals();
    return all.filter(t => 
      accessibleProjectIds.has(t.projectId) ||
      projects.some(p => p.name.toLowerCase() === (t.projectName || "").toLowerCase())
    );
  }, [accessibleProjectIds, projects]);

  const drawings = useMemo(() => {
    const all = DesignMasterStore.getDrawings();
    return all.filter(d => 
      projects.some(p => p.name.toLowerCase() === (d.project || "").toLowerCase() || p.id === d.project)
    );
  }, [projects]);

  const projectFilterOptions = useMemo(() => {
    return projects.map(p => ({
      value: p.id,
      label: p.name,
      count: transmittals.filter(t => t.projectId === p.id).length
    }));
  }, [projects, transmittals]);

  const purposeOptions = useMemo(() => [
    { value: "GOOD_FOR_CONSTRUCTION", label: "Good For Construction (GFC)", count: transmittals.filter(t => t.purpose === "GOOD_FOR_CONSTRUCTION").length },
    { value: "FOR_TENDER_BIDDING", label: "For Tender / Pricing", count: transmittals.filter(t => t.purpose === "FOR_TENDER_BIDDING").length },
    { value: "FOR_REVIEW_APPROVAL", label: "For Review & Comments", count: transmittals.filter(t => t.purpose === "FOR_REVIEW_APPROVAL").length },
    { value: "FOR_INFORMATION", label: "For Information Only", count: transmittals.filter(t => t.purpose === "FOR_INFORMATION").length },
    { value: "AS_BUILT_RECORD", label: "As-Built Archive", count: transmittals.filter(t => t.purpose === "AS_BUILT_RECORD").length }
  ], [transmittals]);

  const statusOptions = useMemo(() => [
    { value: "ISSUED", label: "Issued / In Transit", count: transmittals.filter(t => t.status === "ISSUED").length },
    { value: "ACKNOWLEDGED", label: "Acknowledged & Received", count: transmittals.filter(t => t.status === "ACKNOWLEDGED").length }
  ], [transmittals]);

  // Filtered Transmittals
  const filteredTransmittals = useMemo(() => {
    return transmittals.filter(t => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        t.transmittalNumber.toLowerCase().includes(q) ||
        t.projectName.toLowerCase().includes(q) ||
        t.recipientAgency.toLowerCase().includes(q) ||
        (t.towerName && t.towerName.toLowerCase().includes(q));

      const matchesProject = selectedProjects.length === 0 || selectedProjects.includes(t.projectId);
      const matchesPurpose = selectedPurposes.length === 0 || selectedPurposes.includes(t.purpose);
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(t.status);

      return matchesSearch && matchesProject && matchesPurpose && matchesStatus;
    });
  }, [transmittals, searchQuery, selectedProjects, selectedPurposes, selectedStatuses]);

  // Handle Create Transmittal
  const handleCreateTransmittal = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!projectId) {
      setFormError("Please select a project.");
      return;
    }
    if (!recipientAgency.trim()) {
      setFormError("Please specify recipient agency / contractor.");
      return;
    }
    if (selectedDrawingIds.length === 0) {
      setFormError("Please select at least one drawing to attach to this transmittal.");
      return;
    }

    const proj = projects.find(p => p.id === projectId);
    const attachedDrawings = drawings.filter(d => selectedDrawingIds.includes(d.id));

    const newTransmittal: TransmittalItem = {
      id: `tr-${Date.now()}`,
      transmittalNumber: `TR-CK-${new Date().getFullYear()}-${(transmittals.length + 1).toString().padStart(3, "0")}`,
      projectId,
      projectName: proj?.name || "Chandak Project",
      towerName: towerName.trim() || undefined,
      issueDate: new Date().toISOString().split("T")[0],
      purpose,
      recipientAgency: recipientAgency.trim(),
      recipientContact: recipientContact.trim() || undefined,
      issuedBy: issuedBy.trim(),
      drawingIds: selectedDrawingIds,
      drawingDetails: attachedDrawings.map(d => ({
        drawingCode: d.code,
        drawingTitle: d.title,
        revision: d.revision,
        copiesIssued: copiesPerDrawing
      })),
      remarks: remarks.trim() || undefined,
      status: "ISSUED"
    };

    DesignMasterStore.saveTransmittal(newTransmittal);

    // Reset Form
    setIsCreateModalOpen(false);
    setProjectId("");
    setTowerName("");
    setRecipientAgency("");
    setRecipientContact("");
    setSelectedDrawingIds([]);
    setRemarks("");
  };

  const handleAcknowledge = (id: string) => {
    const user = prompt("Enter Name / Designation of Recipient Acknowledging Receipt:", "Site Project Manager");
    if (user && user.trim()) {
      DesignMasterStore.acknowledgeTransmittal(id, user.trim());
    }
  };

  const openPrintSlip = (t: TransmittalItem) => {
    setSelectedTransmittal(t);
    setIsPrintSlipOpen(true);
  };

  const purposeLabels: Record<TransmittalPurpose, { label: string; color: string }> = {
    GOOD_FOR_CONSTRUCTION: { label: "GOOD FOR CONSTRUCTION (GFC)", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
    FOR_TENDER_BIDDING: { label: "FOR TENDER / PRICING", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
    FOR_REVIEW_APPROVAL: { label: "FOR REVIEW & COMMENTS", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
    FOR_INFORMATION: { label: "FOR INFORMATION ONLY", color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
    AS_BUILT_RECORD: { label: "AS-BUILT ARCHIVE", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" }
  };

  return (
    <div className="space-y-6">
      {!isCreateModalOpen && !isPrintSlipOpen && (
        <>
          {/* Header Banner */}
          <div className="p-5 rounded-2xl bg-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Send className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              Document Transmittals & GFC Dispatch Slips
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="h-8 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-md cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Generate Transmittal Note</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-[11px] font-bold text-muted-foreground uppercase">Total Transmittals</div>
          <div className="text-xl font-black text-foreground mt-1">{transmittals.length}</div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">GFC Releases</div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {transmittals.filter(t => t.purpose === "GOOD_FOR_CONSTRUCTION").length}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase">Acknowledged</div>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {transmittals.filter(t => t.status === "ACKNOWLEDGED").length}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase">Pending Acknowledgment</div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {transmittals.filter(t => t.status === "ISSUED").length}
          </div>
        </div>
      </div>

      {/* Unified Multi-Select Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border space-y-3 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              aria-label="Search transmittal number, recipient, tower"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50 text-foreground focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <DesignMultiSelectDropdown
              label="Project"
              options={projectFilterOptions}
              selectedValues={selectedProjects}
              onChange={setSelectedProjects}
              colorTheme="blue"
              placeholder="All Projects"
            />

            <DesignMultiSelectDropdown
              label="Purpose"
              options={purposeOptions}
              selectedValues={selectedPurposes}
              onChange={setSelectedPurposes}
              colorTheme="emerald"
              placeholder="All Purposes"
            />

            <DesignMultiSelectDropdown
              label="Status"
              options={statusOptions}
              selectedValues={selectedStatuses}
              onChange={setSelectedStatuses}
              colorTheme="amber"
              placeholder="All Status"
            />

            {(selectedProjects.length > 0 || selectedPurposes.length > 0 || selectedStatuses.length > 0 || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedProjects([]);
                  setSelectedPurposes([]);
                  setSelectedStatuses([]);
                  setSearchQuery("");
                }}
                className="h-8 px-2.5 rounded-xl border border-dashed border-rose-500/40 hover:border-rose-500/70 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <X className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {(selectedProjects.length > 0 || selectedPurposes.length > 0 || selectedStatuses.length > 0) && (
          <div className="pt-2 border-t border-border flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-muted-foreground mr-1">Active:</span>

            {selectedProjects.map(id => {
              const p = projects.find(proj => proj.id === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 text-[11px] font-medium"
                >
                  <span>Project: {p?.name || id}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedProjects(selectedProjects.filter(x => x !== id))}
                    className="hover:text-blue-900 dark:hover:text-blue-100"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              );
            })}

            {selectedPurposes.map(purp => {
              const opt = purposeOptions.find(o => o.value === purp);
              return (
                <span
                  key={purp}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[11px] font-medium"
                >
                  <span>Purpose: {opt?.label || purp}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedPurposes(selectedPurposes.filter(x => x !== purp))}
                    className="hover:text-emerald-900 dark:hover:text-emerald-100"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              );
            })}

            {selectedStatuses.map(st => {
              const opt = statusOptions.find(o => o.value === st);
              return (
                <span
                  key={st}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-[11px] font-medium"
                >
                  <span>Status: {opt?.label || st}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedStatuses(selectedStatuses.filter(x => x !== st))}
                    className="hover:text-amber-900 dark:hover:text-amber-100"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setSelectedProjects([]);
                setSelectedPurposes([]);
                setSelectedStatuses([]);
              }}
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground ml-1 underline cursor-pointer"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Transmittals List Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-slate-50/80 dark:bg-slate-900/80 text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">
                <th className="p-3.5 pl-4">Transmittal #</th>
                <th className="p-3.5">Project / Tower</th>
                <th className="p-3.5">Purpose</th>
                <th className="p-3.5">Recipient Agency</th>
                <th className="p-3.5">Drawings Attached</th>
                <th className="p-3.5">Issue Date</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTransmittals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground text-xs">
                    No transmittal records found matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredTransmittals.map(t => {
                  const pBadge = purposeLabels[t.purpose] || { label: t.purpose, color: "bg-slate-500/10 text-slate-600" };
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="p-3.5 pl-4">
                        <div className="font-mono font-bold text-blue-600 dark:text-blue-400">{t.transmittalNumber}</div>
                        <div className="text-[10px] text-muted-foreground">By: {t.issuedBy}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-foreground">{t.projectName}</div>
                        {t.towerName && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            <span>{t.towerName}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${pBadge.color}`}>
                          {pBadge.label}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-foreground">{t.recipientAgency}</div>
                        {t.recipientContact && (
                          <div className="text-[10px] text-muted-foreground">{t.recipientContact}</div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-foreground font-mono font-bold text-[11px]">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span>{t.drawingDetails?.length || t.drawingIds.length} Drawing(s)</span>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono text-[11px] text-muted-foreground">
                        {t.issueDate}
                      </td>

                      <td className="p-3.5">
                        {t.status === "ACKNOWLEDGED" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>ACKNOWLEDGED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="h-3 w-3" />
                            <span>ISSUED</span>
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openPrintSlip(t)}
                            title="View & Print Official Slip"
                            className="h-7 px-2.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>Print Slip</span>
                          </button>

                          {t.status !== "ACKNOWLEDGED" && (
                            <button
                              type="button"
                              onClick={() => handleAcknowledge(t.id)}
                              title="Mark Acknowledged by Site Team"
                              className="h-7 px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>Sign Receipt</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete transmittal note ${t.transmittalNumber}?`)) {
                                DesignMasterStore.deleteTransmittal(t.id);
                              }
                            }}
                            title="Delete Transmittal"
                            className="h-7 w-7 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 inline-flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* CREATE TRANSMITTAL TRANSACTION CANVAS */}
      {isCreateModalOpen && (
        <TransactionFormLayout
          title="Generate Document Transmittal Note"
          badge="Formal Issuance Record"
          category="Transmittal Control"
          icon={Send}
          iconBg="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25"
          description="Create formal construction issue record with attached drawings schedule and recipient verification."
          breadcrumbs={[
            { label: "Transmittal Manager", onClick: () => setIsCreateModalOpen(false) },
            { label: "Generate Transmittal Note" }
          ]}
          onBack={() => setIsCreateModalOpen(false)}
          backLabel="Back to Transmittals"
          onReset={() => {
            setTowerName("");
            setPurpose("GOOD_FOR_CONSTRUCTION");
            setRecipientAgency("");
            setRecipientContact("");
            setSelectedDrawingIds([]);
            setCopiesPerDrawing(2);
            setRemarks("");
            setFormError("");
          }}
          onSave={handleCreateTransmittal}
          saveLabel="Generate & Dispatch"
          saveIcon={Send}
        >
          <div className="space-y-6 max-w-4xl">
            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <AppCard className="border-border shadow-xs">
              <AppCardHeader className="bg-surface/50 border-b border-border/50 pb-3">
                <AppCardTitle className="text-sm font-bold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Project & Purpose Configuration</span>
                </AppCardTitle>
              </AppCardHeader>
              <AppCardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Target Project *</label>
                    <select
                      value={projectId}
                      onChange={e => setProjectId(e.target.value)}
                      aria-label="Target Project"
                      className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="">Select Project</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Tower / Zone / Sector</label>
                    <input
                      type="text"
                      value={towerName}
                      onChange={e => setTowerName(e.target.value)}
                      placeholder="e.g. Tower A / Podium / Commercial Wing"
                      aria-label="Tower, Zone, or Sector"
                      className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Purpose of Issue *</label>
                    <select
                      value={purpose}
                      onChange={e => setPurpose(e.target.value as TransmittalPurpose)}
                      aria-label="Purpose of Issue"
                      className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="GOOD_FOR_CONSTRUCTION">Good For Construction (GFC)</option>
                      <option value="FOR_TENDER_BIDDING">For Tender / Pricing</option>
                      <option value="FOR_REVIEW_APPROVAL">For Review & Approval</option>
                      <option value="FOR_INFORMATION">For Information Only</option>
                      <option value="AS_BUILT_RECORD">As-Built Record</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Issued By / Designation</label>
                    <input
                      type="text"
                      value={issuedBy}
                      onChange={e => setIssuedBy(e.target.value)}
                      aria-label="Issued By or Designation"
                      className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </AppCardContent>
            </AppCard>

            <AppCard className="border-border shadow-xs">
              <AppCardHeader className="bg-surface/50 border-b border-border/50 pb-3">
                <AppCardTitle className="text-sm font-bold flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Recipient & Contractor Details</span>
                </AppCardTitle>
              </AppCardHeader>
              <AppCardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Recipient Agency / Contractor *</label>
                    <input
                      type="text"
                      required
                      value={recipientAgency}
                      onChange={e => setRecipientAgency(e.target.value)}
                      placeholder="e.g. L&T Construction / Shapoorji Pallonji"
                      aria-label="Recipient Agency or Contractor"
                      className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Recipient Contact Person</label>
                    <input
                      type="text"
                      value={recipientContact}
                      onChange={e => setRecipientContact(e.target.value)}
                      placeholder="e.g. Mr. Rajesh Sharma (Project Director)"
                      aria-label="Recipient Contact Person"
                      className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Drawing Selection Checklist */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>Select Drawings to Include ({selectedDrawingIds.length} selected) *</span>
                    <span className="text-[11px] text-muted-foreground">Select one or more drawing revisions</span>
                  </label>
                  <div className="p-3 rounded-2xl border border-border bg-background max-h-56 overflow-y-auto custom-scrollbar space-y-2">
                    {drawings.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground text-xs">
                        No drawings uploaded yet in Drawing Register.
                      </div>
                    ) : (
                      drawings.map(d => {
                        const isChecked = selectedDrawingIds.includes(d.id);
                        return (
                          <label
                            key={d.id}
                            className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                              isChecked 
                                ? "bg-blue-500/10 border-blue-500/40 text-foreground" 
                                : "bg-surface border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedDrawingIds([...selectedDrawingIds, d.id]);
                                } else {
                                  setSelectedDrawingIds(selectedDrawingIds.filter(id => id !== d.id));
                                }
                              }}
                              className="mt-0.5 rounded border-border text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-mono font-bold text-foreground flex items-center gap-2">
                                <span>{d.code}</span>
                                <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] border border-border">{d.revision}</span>
                                <span className="text-[10px] text-muted-foreground">({d.discipline})</span>
                              </div>
                              <div className="truncate text-muted-foreground text-xs mt-0.5">{d.title}</div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Copies per Drawing</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={copiesPerDrawing}
                      onChange={e => setCopiesPerDrawing(parseInt(e.target.value) || 1)}
                      aria-label="Copies per Drawing"
                      className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Transmittal Remarks / Instructions</label>
                    <input
                      type="text"
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                      placeholder="e.g. For immediate structural column bar bending schedule execution"
                      aria-label="Transmittal remarks or instructions"
                      className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </AppCardContent>
            </AppCard>
          </div>
        </TransactionFormLayout>
      )}

      {/* OFFICIAL PRINTABLE TRANSMITTAL SLIP WORKING DOCUMENT */}
      {isPrintSlipOpen && selectedTransmittal && (
        <WorkingDocumentLayout
          title={`Transmittal Slip: ${selectedTransmittal.transmittalNumber}`}
          badge="Verified Legal Issuance Document"
          category="Transmittal Control"
          icon={Printer}
          iconBg="bg-slate-900 text-white border-slate-700"
          description="Formal construction issue record with attached drawings schedule, digital QR checksum & recipient sign-off."
          breadcrumbs={[
            { label: "Transmittal Manager", onClick: () => setIsPrintSlipOpen(false) },
            { label: `Slip #${selectedTransmittal.transmittalNumber}` }
          ]}
          onBack={() => setIsPrintSlipOpen(false)}
          backLabel="Back to Transmittals"
          headerActions={
            <button
              type="button"
              onClick={() => window.print()}
              className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Transmittal Slip</span>
            </button>
          }
        >
          <div className="bg-white text-slate-900 border border-slate-300 rounded-3xl p-8 shadow-sm max-w-4xl mx-auto space-y-6">
            {/* Document Header */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                    CHANDAK GROUP
                  </h1>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Design & Project Delivery Division • Corporate Office Mumbai
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Official Drawing Document Transmittal & Handover Record
                  </p>
                </div>

                <div className="text-right">
                  <div className="inline-block p-2 border border-slate-300 rounded-xl bg-slate-50">
                    <QrCode className="h-10 w-10 text-slate-800" />
                  </div>
                  <div className="text-[10px] font-mono font-bold text-slate-500 mt-1">
                    {selectedTransmittal.transmittalNumber}
                  </div>
                </div>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs mb-6">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Project Name:</span>
                <span className="font-bold text-slate-900 text-sm">{selectedTransmittal.projectName}</span>
                {selectedTransmittal.towerName && (
                  <span className="text-[11px] text-slate-600 block">Tower / Sector: {selectedTransmittal.towerName}</span>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Transmittal Ref No:</span>
                <span className="font-mono font-black text-blue-600 text-sm">{selectedTransmittal.transmittalNumber}</span>
                <span className="text-[11px] text-slate-600 block">Date of Issue: {selectedTransmittal.issueDate}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Issued To (Recipient):</span>
                <span className="font-bold text-slate-900">{selectedTransmittal.recipientAgency}</span>
                {selectedTransmittal.recipientContact && (
                  <span className="text-[11px] text-slate-600 block">Attn: {selectedTransmittal.recipientContact}</span>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Purpose of Release:</span>
                <span className="inline-block px-2.5 py-0.5 mt-0.5 rounded text-[10px] font-bold bg-slate-900 text-white uppercase tracking-wider">
                  {selectedTransmittal.purpose.replace(/_/g, " ")}
                </span>
                <span className="text-[11px] text-slate-600 block mt-1">Issued By: {selectedTransmittal.issuedBy}</span>
              </div>
            </div>

            {/* Attached Drawings Table */}
            <div className="mb-6">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Attached Drawing Schedule ({selectedTransmittal.drawingDetails.length} items)
              </h4>
              <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 text-[10px] uppercase">
                    <th className="p-2.5 border-r border-slate-300">Sr.</th>
                    <th className="p-2.5 border-r border-slate-300">Drawing Number</th>
                    <th className="p-2.5 border-r border-slate-300">Drawing Title / Description</th>
                    <th className="p-2.5 border-r border-slate-300 text-center">Rev</th>
                    <th className="p-2.5 text-center">Copies</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedTransmittal.drawingDetails.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 border-r border-slate-300 text-center font-mono text-[10px]">{idx + 1}</td>
                      <td className="p-2.5 border-r border-slate-300 font-mono font-bold text-slate-900">{item.drawingCode}</td>
                      <td className="p-2.5 border-r border-slate-300 text-slate-700">{item.drawingTitle}</td>
                      <td className="p-2.5 border-r border-slate-300 text-center font-mono font-bold text-blue-600">{item.revision}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-slate-900">{item.copiesIssued}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedTransmittal.remarks && (
              <div className="p-3.5 mb-6 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <span className="font-bold block uppercase text-[10px] mb-0.5">Special Instructions / Remarks:</span>
                <span>{selectedTransmittal.remarks}</span>
              </div>
            )}

            {/* Signature & Seal Block */}
            <div className="grid grid-cols-2 gap-6 pt-6 border-t-2 border-slate-300 text-xs mt-8">
              <div className="border border-slate-300 rounded-2xl p-4 bg-slate-50/50">
                <div className="text-[10px] font-bold text-slate-500 uppercase mb-8">Issued By (Chandak Design Division):</div>
                <div className="border-b border-slate-400 pb-1 mb-1 font-bold text-slate-800">{selectedTransmittal.issuedBy}</div>
                <div className="text-[10px] text-slate-500">Authorized Design Signatory & Date: {selectedTransmittal.issueDate}</div>
              </div>

              <div className="border border-slate-300 rounded-2xl p-4 bg-slate-50/50">
                <div className="text-[10px] font-bold text-slate-500 uppercase mb-8">Received & Acknowledged By:</div>
                <div className="border-b border-slate-400 pb-1 mb-1 font-bold text-slate-800">
                  {selectedTransmittal.acknowledgedBy || "_______________________________"}
                </div>
                <div className="text-[10px] text-slate-500">
                  {selectedTransmittal.acknowledgedAt ? `Signed on: ${selectedTransmittal.acknowledgedAt}` : "Signature / Stamp / Date"}
                </div>
              </div>
            </div>
          </div>
        </WorkingDocumentLayout>
      )}
    </div>
  );
}
