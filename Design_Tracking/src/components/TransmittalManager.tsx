"use client";

import React, { useState, useMemo, useEffect } from "react";
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
  Trash2,
  Pencil
} from "lucide-react";
import { RecordModeProvider, RecordFieldset, useFlashHighlight, type RecordMode } from "@/components/ui/record";
import { DesignMasterStore } from "../services/designMasterStore";
import { TransmittalItem, TransmittalPurpose } from "../types";
import { DesignMultiSelectDropdown } from "./DesignMultiSelectDropdown";
import { TransactionFormLayout, WorkingDocumentLayout } from "./DesignTransactionLayout";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import { confirmAction, promptAction } from "@/components/ui/feedback/confirm";

export function TransmittalManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedPurposes, setSelectedPurposes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTransmittal, setSelectedTransmittal] = useState<TransmittalItem | null>(null);
  // Record standard: one transmittal form for create / view / edit.
  const [trFormMode, setTrFormMode] = useState<RecordMode | null>(null);
  const [activeTr, setActiveTr] = useState<TransmittalItem | null>(null);
  const [highlightId, setHighlightId] = useFlashHighlight();
  const isCreateModalOpen = trFormMode !== null;
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

  // Re-read the store when it changes, so a new / edited transmittal shows in the list straight away.
  const [storeVersion, setStoreVersion] = useState(0);
  useEffect(() => DesignMasterStore.subscribe(() => setStoreVersion((v) => v + 1)), []);

  const transmittals = useMemo(() => {
    void storeVersion;
    const all = DesignMasterStore.getTransmittals();
    return all.filter(t => 
      accessibleProjectIds.has(t.projectId) ||
      projects.some(p => p.name.toLowerCase() === (t.projectName || "").toLowerCase())
    );
  }, [accessibleProjectIds, projects, storeVersion]);

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
    { value: "GOOD_FOR_CONSTRUCTION", label: "Good for construction (GFC)", count: transmittals.filter(t => t.purpose === "GOOD_FOR_CONSTRUCTION").length },
    { value: "FOR_TENDER_BIDDING", label: "For tender / pricing", count: transmittals.filter(t => t.purpose === "FOR_TENDER_BIDDING").length },
    { value: "FOR_REVIEW_APPROVAL", label: "For review & comments", count: transmittals.filter(t => t.purpose === "FOR_REVIEW_APPROVAL").length },
    { value: "FOR_INFORMATION", label: "For information only", count: transmittals.filter(t => t.purpose === "FOR_INFORMATION").length },
    { value: "AS_BUILT_RECORD", label: "As-built archive", count: transmittals.filter(t => t.purpose === "AS_BUILT_RECORD").length }
  ], [transmittals]);

  const statusOptions = useMemo(() => [
    { value: "ISSUED", label: "Issued / in transit", count: transmittals.filter(t => t.status === "ISSUED").length },
    { value: "ACKNOWLEDGED", label: "Acknowledged & received", count: transmittals.filter(t => t.status === "ACKNOWLEDGED").length }
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

  const closeTrForm = () => { setTrFormMode(null); setActiveTr(null); setFormError(""); };

  const openTrForm = (t: TransmittalItem | null, mode: RecordMode) => {
    setFormError("");
    setActiveTr(t);
    setProjectId(t?.projectId || "");
    setTowerName(t?.towerName || "");
    setRecipientAgency(t?.recipientAgency || "");
    setRecipientContact(t?.recipientContact || "");
    setPurpose(t?.purpose || "GOOD_FOR_CONSTRUCTION");
    setIssuedBy(t?.issuedBy || "Lead Design Manager");
    setSelectedDrawingIds(t?.drawingIds || []);
    setRemarks(t?.remarks || "");
    setCopiesPerDrawing(t?.drawingDetails?.[0]?.copiesIssued || 3);
    setTrFormMode(mode);
  };

  // A transmittal signed for by the site team is a formal record: view only.
  const canEditTr = (t: TransmittalItem | null) => !!t && t.status !== "ACKNOWLEDGED";

  // Handle Create / Update Transmittal
  const handleCreateTransmittal = (e?: React.FormEvent) => {
    e?.preventDefault?.();
    setFormError("");

    // View mode: the primary button switches to edit.
    if (trFormMode === "view") {
      setTrFormMode("edit");
      return;
    }

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

    if (trFormMode === "edit" && activeTr) {
      // Drawings outside this user's project scope can't be unticked here, so keep their saved detail.
      const kept = (activeTr.drawingDetails || []).filter(dd => !drawings.some(d => d.code === dd.drawingCode));
      DesignMasterStore.saveTransmittal({
        ...activeTr,
        projectId,
        projectName: proj?.name || activeTr.projectName,
        towerName: towerName.trim() || undefined,
        purpose,
        recipientAgency: recipientAgency.trim(),
        recipientContact: recipientContact.trim() || undefined,
        issuedBy: issuedBy.trim(),
        drawingIds: selectedDrawingIds,
        drawingDetails: [
          ...kept,
          ...attachedDrawings.map(d => {
            const prev = (activeTr.drawingDetails || []).find(dd => dd.drawingCode === d.code);
            return { drawingCode: d.code, drawingTitle: d.title, revision: d.revision, copiesIssued: copiesPerDrawing, ...(prev?.fileUrl ? { fileUrl: prev.fileUrl } : {}) };
          }),
        ],
        remarks: remarks.trim() || undefined,
      });
      setHighlightId(activeTr.id);
      closeTrForm();
      return;
    }

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
    // Record standard: back to the list with the new transmittal highlighted.
    setHighlightId(newTransmittal.id);

    // Reset Form
    closeTrForm();
    setProjectId("");
    setTowerName("");
    setRecipientAgency("");
    setRecipientContact("");
    setSelectedDrawingIds([]);
    setRemarks("");
  };

  const handleAcknowledge = async (id: string) => {
    const user = await promptAction({ title: "Record acknowledgement", description: "Who received this transmittal?", label: "Name or designation", defaultValue: "Site Project Manager", confirmLabel: "Acknowledge" });
    if (user && user.trim()) {
      DesignMasterStore.acknowledgeTransmittal(id, user.trim());
    }
  };

  const openPrintSlip = (t: TransmittalItem) => {
    setSelectedTransmittal(t);
    setIsPrintSlipOpen(true);
  };

  const purposeLabels: Record<TransmittalPurpose, { label: string; color: string }> = {
    GOOD_FOR_CONSTRUCTION: { label: "Good for construction (GFC)", color: "bg-success-soft text-success-text border-success-border" },
    FOR_TENDER_BIDDING: { label: "For tender / pricing", color: "bg-info-soft text-info-text border-info-border" },
    FOR_REVIEW_APPROVAL: { label: "For review & comments", color: "bg-warning-soft text-warning-text border-warning-border" },
    FOR_INFORMATION: { label: "For information only", color: "bg-sunken text-subtle border-border" },
    AS_BUILT_RECORD: { label: "As-built archive", color: "bg-surface text-foreground border-border" }
  };

  return (
    <div className="space-y-6">
      {!isCreateModalOpen && !isPrintSlipOpen && (
        <>
          {/* Header Banner */}
          <div className="p-5 rounded-lg bg-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-info-soft border border-info-border flex items-center justify-center text-info-text shrink-0">
            <Send className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Document transmittals & GFC dispatch slips
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openTrForm(null, "create")}
            className="h-8 px-3.5 rounded-lg bg-surface border border-border-active hover:bg-surface-hover text-foreground text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-md cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Generate transmittal note</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="text-[11px] font-semibold text-muted-foreground">Total transmittals</div>
          <div className="text-xl font-semibold text-foreground mt-1">{transmittals.length}</div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="text-[11px] font-semibold text-success-text">GFC releases</div>
          <div className="text-xl font-semibold text-success-text mt-1">
            {transmittals.filter(t => t.purpose === "GOOD_FOR_CONSTRUCTION").length}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="text-[11px] font-semibold text-info-text">Acknowledged</div>
          <div className="text-xl font-semibold text-info-text mt-1">
            {transmittals.filter(t => t.status === "ACKNOWLEDGED").length}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="text-[11px] font-semibold text-warning-text">Pending acknowledgment</div>
          <div className="text-xl font-semibold text-warning-text mt-1">
            {transmittals.filter(t => t.status === "ISSUED").length}
          </div>
        </div>
      </div>

      {/* Unified Multi-Select Filter and Search Bar */}
      <div className="p-4 rounded-lg bg-card border border-border space-y-3 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              aria-label="Search transmittal number, recipient, tower"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-sunken text-foreground focus:outline-none focus:border-info-border"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <DesignMultiSelectDropdown
              label="Project"
              options={projectFilterOptions}
              selectedValues={selectedProjects}
              onChange={setSelectedProjects}
              colorTheme="blue"
              placeholder="All projects"
            />

            <DesignMultiSelectDropdown
              label="Purpose"
              options={purposeOptions}
              selectedValues={selectedPurposes}
              onChange={setSelectedPurposes}
              colorTheme="emerald"
              placeholder="All purposes"
            />

            <DesignMultiSelectDropdown
              label="Status"
              options={statusOptions}
              selectedValues={selectedStatuses}
              onChange={setSelectedStatuses}
              colorTheme="amber"
              placeholder="All status"
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
                className="h-8 px-2.5 rounded-lg border border-danger-border hover:border-danger-border bg-danger-soft hover:bg-danger-soft text-danger-text text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
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
            <span className="text-[11px] font-semibold text-muted-foreground mr-1">Active:</span>

            {selectedProjects.map(id => {
              const p = projects.find(proj => proj.id === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-info-soft text-info-text border border-info-border text-[11px] font-medium"
                >
                  <span>Project: {p?.name || id}</span>
                  <button aria-label="Close"
                    type="button"
                    onClick={() => setSelectedProjects(selectedProjects.filter(x => x !== id))}
                    className="hover:text-info-text"
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
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success-soft text-success-text border border-success-border text-[11px] font-medium"
                >
                  <span>Purpose: {opt?.label || purp}</span>
                  <button aria-label="Close"
                    type="button"
                    onClick={() => setSelectedPurposes(selectedPurposes.filter(x => x !== purp))}
                    className="hover:text-success-text"
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
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning-soft text-warning-text border border-warning-border text-[11px] font-medium"
                >
                  <span>Status: {opt?.label || st}</span>
                  <button aria-label="Close"
                    type="button"
                    onClick={() => setSelectedStatuses(selectedStatuses.filter(x => x !== st))}
                    className="hover:text-warning-text"
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
      <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-sunken text-muted-foreground font-semibold text-[11px]">
                <th className="p-3.5 pl-4">Transmittal #</th>
                <th className="p-3.5">Project / tower</th>
                <th className="p-3.5">Purpose</th>
                <th className="p-3.5">Recipient agency</th>
                <th className="p-3.5">Drawings attached</th>
                <th className="p-3.5">Issue date</th>
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
                  const pBadge = purposeLabels[t.purpose] || { label: t.purpose, color: "bg-sunken text-subtle" };
                  return (
                    <tr
                      key={t.id}
                      data-record-id={t.id}
                      data-highlight={highlightId === t.id || undefined}
                      onClick={() => openTrForm(t, "view")}
                      className="hover:bg-sunken transition-colors cursor-pointer"
                    >
                      <td className="p-3.5 pl-4">
                        <div className="font-mono font-semibold text-info-text">{t.transmittalNumber}</div>
                        <div className="text-[11px] text-muted-foreground">By: {t.issuedBy}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-foreground">{t.projectName}</div>
                        {t.towerName && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            <span>{t.towerName}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${pBadge.color}`}>
                          {pBadge.label}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-foreground">{t.recipientAgency}</div>
                        {t.recipientContact && (
                          <div className="text-[11px] text-muted-foreground">{t.recipientContact}</div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-sunken text-foreground font-mono font-semibold text-[11px]">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span>{t.drawingDetails?.length || t.drawingIds.length} Drawing(s)</span>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono text-[11px] text-muted-foreground">
                        {t.issueDate}
                      </td>

                      <td className="p-3.5">
                        {t.status === "ACKNOWLEDGED" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-success-soft text-success-text border border-success-border">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Acknowledged</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-warning-soft text-warning-text border border-warning-border">
                            <Clock className="h-3 w-3" />
                            <span>Issued</span>
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            aria-label={`View ${t.transmittalNumber}`}
                            title="View"
                            onClick={() => openTrForm(t, "view")}
                            className="h-7 w-7 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground inline-flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {canEditTr(t) && (
                            <button
                              type="button"
                              aria-label={`Edit ${t.transmittalNumber}`}
                              title="Edit"
                              onClick={() => openTrForm(t, "edit")}
                              className="h-7 w-7 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground inline-flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openPrintSlip(t)}
                            title="View & print official slip"
                            className="h-7 px-2.5 rounded-lg bg-info-soft hover:bg-info-soft text-info-text text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>Print slip</span>
                          </button>

                          {t.status !== "ACKNOWLEDGED" && (
                            <button
                              type="button"
                              onClick={() => handleAcknowledge(t.id)}
                              title="Mark acknowledged by site team"
                              className="h-7 px-2.5 rounded-lg bg-success-soft hover:bg-success-soft text-success-text text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>Sign receipt</span>
                            </button>
                          )}

                          <button aria-label="Delete transmittal"
                            type="button"
                            onClick={async () => {
                              if (await confirmAction(`Delete transmittal note ${t.transmittalNumber}?`)) {
                                DesignMasterStore.deleteTransmittal(t.id);
                              }
                            }}
                            title="Delete transmittal"
                            className="h-7 w-7 rounded-lg hover:bg-danger-soft text-muted-foreground hover:text-danger-text inline-flex items-center justify-center transition-colors cursor-pointer"
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
        <RecordModeProvider mode={trFormMode ?? "create"}>
        <TransactionFormLayout
          title={
            trFormMode === "create"
              ? "Generate document transmittal note"
              : trFormMode === "edit"
                ? `Edit transmittal · ${activeTr?.transmittalNumber ?? ""}`
                : `Transmittal · ${activeTr?.transmittalNumber ?? ""}`
          }
          badge={trFormMode === "create" ? "Formal Issuance Record" : trFormMode === "edit" ? "Editing" : "Viewing"}
          category="Transmittal Control"
          icon={Send}
          iconBg="bg-info-soft text-info-text border-info-border"
          description="Create formal construction issue record with attached drawings schedule and recipient verification."
          breadcrumbs={[
            { label: "Transmittal Manager", onClick: () => closeTrForm() },
            { label: trFormMode === "create" ? "Generate transmittal note" : activeTr?.transmittalNumber ?? "Transmittal" }
          ]}
          onBack={() => closeTrForm()}
          backLabel="Back to Transmittals"
          onReset={trFormMode !== "create" ? undefined : () => {
            setTowerName("");
            setPurpose("GOOD_FOR_CONSTRUCTION");
            setRecipientAgency("");
            setRecipientContact("");
            setSelectedDrawingIds([]);
            setCopiesPerDrawing(2);
            setRemarks("");
            setFormError("");
          }}
          onSave={trFormMode === "view" && !canEditTr(activeTr) ? undefined : handleCreateTransmittal}
          saveLabel={trFormMode === "create" ? "Generate & Dispatch" : trFormMode === "edit" ? "Save changes" : "Edit"}
          saveIcon={trFormMode === "view" ? Pencil : Send}
          headerActions={trFormMode === "view" && activeTr ? (
            <button
              type="button"
              onClick={() => { const t = activeTr; closeTrForm(); openPrintSlip(t); }}
              className="h-8 px-3 rounded-lg bg-info-soft text-info-text text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print slip</span>
            </button>
          ) : undefined}
        >
          <RecordFieldset className="space-y-6 max-w-4xl">
            {trFormMode === "view" && activeTr?.status === "ACKNOWLEDGED" && (
              <div className="p-3.5 rounded-lg bg-success-soft border border-success-border text-success-text text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Receipt signed{activeTr.acknowledgedBy ? ` by ${activeTr.acknowledgedBy}` : ""}. This transmittal can no longer be edited.</span>
              </div>
            )}
            {formError && (
              <div className="p-3.5 rounded-lg bg-danger-soft border border-danger-border text-danger-text text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <AppCard className="border-border shadow-xs">
              <AppCardHeader className="bg-surface/50 border-b border-border pb-3">
                <AppCardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-info-text" />
                  <span>Project & purpose configuration</span>
                </AppCardTitle>
              </AppCardHeader>
              <AppCardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Target project *</label>
                    <select
                      value={projectId}
                      onChange={e => setProjectId(e.target.value)}
                      aria-label="Target project"
                      className="w-full h-10 px-3 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-info-border cursor-pointer"
                    >
                      <option value="">Select project</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Tower / zone / sector</label>
                    <input
                      type="text"
                      value={towerName}
                      onChange={e => setTowerName(e.target.value)}
                      placeholder="e.g. Tower a / podium / commercial wing"
                      aria-label="Tower, zone, or sector"
                      className="w-full h-10 px-3 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-info-border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Purpose of issue *</label>
                    <select
                      value={purpose}
                      onChange={e => setPurpose(e.target.value as TransmittalPurpose)}
                      aria-label="Purpose of issue"
                      className="w-full h-10 px-3 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-info-border cursor-pointer"
                    >
                      <option value="GOOD_FOR_CONSTRUCTION">Good for construction (GFC)</option>
                      <option value="FOR_TENDER_BIDDING">For tender / pricing</option>
                      <option value="FOR_REVIEW_APPROVAL">For review & approval</option>
                      <option value="FOR_INFORMATION">For information only</option>
                      <option value="AS_BUILT_RECORD">As-built record</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Issued by / designation</label>
                    <input
                      type="text"
                      value={issuedBy}
                      onChange={e => setIssuedBy(e.target.value)}
                      aria-label="Issued by or designation"
                      className="w-full h-10 px-3 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-info-border"
                    />
                  </div>
                </div>
              </AppCardContent>
            </AppCard>

            <AppCard className="border-border shadow-xs">
              <AppCardHeader className="bg-surface/50 border-b border-border pb-3">
                <AppCardTitle className="text-sm font-semibold flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-info-text" />
                  <span>Recipient & contractor details</span>
                </AppCardTitle>
              </AppCardHeader>
              <AppCardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Recipient agency / contractor *</label>
                    <input
                      type="text"
                      required
                      value={recipientAgency}
                      onChange={e => setRecipientAgency(e.target.value)}
                      placeholder="e.g. L&t construction / shapoorji pallonji"
                      aria-label="Recipient agency or contractor"
                      className="w-full h-10 px-3 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-info-border"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Recipient contact person</label>
                    <input
                      type="text"
                      value={recipientContact}
                      onChange={e => setRecipientContact(e.target.value)}
                      placeholder="e.g. Mr. Rajesh sharma (project director)"
                      aria-label="Recipient contact person"
                      className="w-full h-10 px-3 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-info-border"
                    />
                  </div>
                </div>

                {/* Drawing Selection Checklist */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Select drawings to include ({selectedDrawingIds.length} selected) *</span>
                    <span className="text-[11px] text-muted-foreground">Select one or more drawing revisions</span>
                  </label>
                  <div className="p-3 rounded-lg border border-border bg-background max-h-56 overflow-y-auto custom-scrollbar space-y-2">
                    {drawings.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground text-xs">
                        No drawings uploaded yet in drawing register.
                      </div>
                    ) : (
                      drawings.map(d => {
                        const isChecked = selectedDrawingIds.includes(d.id);
                        return (
                          <label
                            key={d.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isChecked 
                                ? "bg-info-soft border-info-border text-foreground" 
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
                              className="mt-0.5 rounded border-border text-info-text focus:ring-info-border"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-mono font-semibold text-foreground flex items-center gap-2">
                                <span>{d.code}</span>
                                <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] border border-border">{d.revision}</span>
                                <span className="text-[11px] text-muted-foreground">({d.discipline})</span>
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
                    <label className="text-xs font-semibold text-foreground">Copies per drawing</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={copiesPerDrawing}
                      onChange={e => setCopiesPerDrawing(parseInt(e.target.value) || 1)}
                      aria-label="Copies per drawing"
                      className="w-full h-10 px-3 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-info-border"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Transmittal remarks / instructions</label>
                    <input
                      type="text"
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                      placeholder="e.g. For immediate structural column bar bending schedule execution"
                      aria-label="Transmittal remarks or instructions"
                      className="w-full h-10 px-3 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-info-border"
                    />
                  </div>
                </div>
              </AppCardContent>
            </AppCard>
          </RecordFieldset>
        </TransactionFormLayout>
        </RecordModeProvider>
      )}

      {/* OFFICIAL PRINTABLE TRANSMITTAL SLIP WORKING DOCUMENT */}
      {isPrintSlipOpen && selectedTransmittal && (
        <WorkingDocumentLayout
          title={`Transmittal Slip: ${selectedTransmittal.transmittalNumber}`}
          badge="Verified Legal Issuance Document"
          category="Transmittal Control"
          icon={Printer}
          iconBg="bg-foreground text-background border-border-active"
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
              className="h-9 px-4 rounded-lg bg-foreground hover:bg-foreground text-background text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print transmittal slip</span>
            </button>
          }
        >
          <div className="bg-surface text-foreground border border-border rounded-3xl p-8 shadow-sm max-w-4xl mx-auto space-y-6">
            {/* Document Header */}
            <div className="border-b-2 border-border-active pb-4 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] text-heading">
                    Chandak group
                  </h1>
                  <p className="text-xs font-semibold text-subtle">
                    Design & project delivery division • corporate office Mumbai
                  </p>
                  <p className="text-[11px] text-muted">
                    Official drawing document transmittal & handover record
                  </p>
                </div>

                <div className="text-right">
                  <div className="inline-block p-2 border border-border rounded-lg bg-sunken">
                    <QrCode className="h-10 w-10 text-foreground" />
                  </div>
                  <div className="text-[11px] font-mono font-semibold text-muted mt-1">
                    {selectedTransmittal.transmittalNumber}
                  </div>
                </div>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-sunken border border-border text-xs mb-6">
              <div>
                <span className="text-[11px] font-semibold text-muted block">Project Name:</span>
                <span className="font-semibold text-foreground text-sm">{selectedTransmittal.projectName}</span>
                {selectedTransmittal.towerName && (
                  <span className="text-[11px] text-subtle block">Tower / Sector: {selectedTransmittal.towerName}</span>
                )}
              </div>

              <div>
                <span className="text-[11px] font-semibold text-muted block">Transmittal ref no:</span>
                <span className="font-mono font-semibold text-info-text text-sm">{selectedTransmittal.transmittalNumber}</span>
                <span className="text-[11px] text-subtle block">Date of Issue: {selectedTransmittal.issueDate}</span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-muted block">Issued to (recipient):</span>
                <span className="font-semibold text-foreground">{selectedTransmittal.recipientAgency}</span>
                {selectedTransmittal.recipientContact && (
                  <span className="text-[11px] text-subtle block">Attn: {selectedTransmittal.recipientContact}</span>
                )}
              </div>

              <div>
                <span className="text-[11px] font-semibold text-muted block">Purpose of Release:</span>
                <span className="inline-block px-2.5 py-0.5 mt-0.5 rounded text-[11px] font-semibold bg-foreground text-background">
                  {selectedTransmittal.purpose.replace(/_/g, " ")}
                </span>
                <span className="text-[11px] text-subtle block mt-1">Issued By: {selectedTransmittal.issuedBy}</span>
              </div>
            </div>

            {/* Attached Drawings Table */}
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-foreground mb-2">
                Attached drawing schedule ({selectedTransmittal.drawingDetails.length} items)
              </h4>
              <table className="w-full text-left border-collapse border border-border text-xs">
                <thead>
                  <tr className="bg-sunken border-b border-border font-semibold text-foreground text-[11px]">
                    <th className="p-2.5 border-r border-border">Sr.</th>
                    <th className="p-2.5 border-r border-border">Drawing number</th>
                    <th className="p-2.5 border-r border-border">Drawing title / description</th>
                    <th className="p-2.5 border-r border-border text-center">Rev</th>
                    <th className="p-2.5 text-center">Copies</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedTransmittal.drawingDetails.map((item, idx) => (
                    <tr key={idx} className="hover:bg-sunken">
                      <td className="p-2.5 border-r border-border text-center font-mono text-[11px]">{idx + 1}</td>
                      <td className="p-2.5 border-r border-border font-mono font-semibold text-foreground">{item.drawingCode}</td>
                      <td className="p-2.5 border-r border-border text-foreground">{item.drawingTitle}</td>
                      <td className="p-2.5 border-r border-border text-center font-mono font-semibold text-info-text">{item.revision}</td>
                      <td className="p-2.5 text-center font-mono font-semibold text-foreground">{item.copiesIssued}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedTransmittal.remarks && (
              <div className="p-3.5 mb-6 rounded-lg bg-warning-soft border border-warning-border text-xs text-warning-text">
                <span className="font-semibold block text-[11px] mb-0.5">Special instructions / remarks:</span>
                <span>{selectedTransmittal.remarks}</span>
              </div>
            )}

            {/* Signature & Seal Block */}
            <div className="grid grid-cols-2 gap-6 pt-6 border-t-2 border-border text-xs mt-8">
              <div className="border border-border rounded-lg p-4 bg-sunken">
                <div className="text-[11px] font-semibold text-muted mb-8">Issued by (Chandak design division):</div>
                <div className="border-b border-border-active pb-1 mb-1 font-semibold text-foreground">{selectedTransmittal.issuedBy}</div>
                <div className="text-[11px] text-muted">Authorised design signatory & date: {selectedTransmittal.issueDate}</div>
              </div>

              <div className="border border-border rounded-lg p-4 bg-sunken">
                <div className="text-[11px] font-semibold text-muted mb-8">Received & acknowledged by:</div>
                <div className="border-b border-border-active pb-1 mb-1 font-semibold text-foreground">
                  {selectedTransmittal.acknowledgedBy || "_______________________________"}
                </div>
                <div className="text-[11px] text-muted">
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
