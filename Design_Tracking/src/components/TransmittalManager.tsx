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
  Download
} from "lucide-react";
import { DesignMasterStore } from "../services/designMasterStore";
import { TransmittalItem, TransmittalPurpose } from "../types";

export function TransmittalManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [purposeFilter, setPurposeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
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

  const projects = DesignMasterStore.getProjects();
  const drawings = DesignMasterStore.getDrawings();
  const transmittals = DesignMasterStore.getTransmittals();

  // Filtered Transmittals
  const filteredTransmittals = useMemo(() => {
    return transmittals.filter(t => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        t.transmittalNumber.toLowerCase().includes(q) ||
        t.projectName.toLowerCase().includes(q) ||
        t.recipientAgency.toLowerCase().includes(q) ||
        (t.towerName && t.towerName.toLowerCase().includes(q));

      const matchesPurpose = purposeFilter === "ALL" || t.purpose === purposeFilter;
      const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;

      return matchesSearch && matchesPurpose && matchesStatus;
    });
  }, [transmittals, searchQuery, purposeFilter, statusFilter]);

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
            <p className="text-xs text-muted-foreground">
              Formal drawing issuance records, contractor physical/cloud handovers, and legal verification seals
            </p>
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
          <div className="text-[10px] text-muted-foreground mt-0.5">Formal issuance packages</div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">GFC Releases</div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {transmittals.filter(t => t.purpose === "GOOD_FOR_CONSTRUCTION").length}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Site execution certified</div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase">Acknowledged</div>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {transmittals.filter(t => t.status === "ACKNOWLEDGED").length}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Signed by recipient site team</div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase">Pending Acknowledgment</div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {transmittals.filter(t => t.status === "ISSUED").length}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">In transit / verification</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50 text-foreground focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1">
            <span className="text-[11px] font-semibold text-muted-foreground shrink-0">Purpose:</span>
            {["ALL", "GOOD_FOR_CONSTRUCTION", "FOR_TENDER_BIDDING", "FOR_REVIEW_APPROVAL", "FOR_INFORMATION"].map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPurposeFilter(p)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                  purposeFilter === p
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "ALL" ? "All Purposes" : p.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
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

      {/* CREATE TRANSMITTAL MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Send className="h-4 w-4 text-blue-500" />
                  <span>Generate Document Transmittal Note</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Create formal construction issue record with attached drawings schedule
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTransmittal} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">Target Project *</label>
                  <select
                    value={projectId}
                    onChange={e => setProjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 text-foreground font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">Select Project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">Tower / Zone / Sector</label>
                  <input
                    type="text"
                    value={towerName}
                    onChange={e => setTowerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 text-foreground font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">Purpose of Issue *</label>
                  <select
                    value={purpose}
                    onChange={e => setPurpose(e.target.value as TransmittalPurpose)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 text-foreground font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="GOOD_FOR_CONSTRUCTION">Good For Construction (GFC)</option>
                    <option value="FOR_TENDER_BIDDING">For Tender / Pricing</option>
                    <option value="FOR_REVIEW_APPROVAL">For Review & Approval</option>
                    <option value="FOR_INFORMATION">For Information Only</option>
                    <option value="AS_BUILT_RECORD">As-Built Record</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">Issued By / Designation</label>
                  <input
                    type="text"
                    value={issuedBy}
                    onChange={e => setIssuedBy(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 text-foreground font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">Recipient Agency / Contractor *</label>
                  <input
                    type="text"
                    required
                    value={recipientAgency}
                    onChange={e => setRecipientAgency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 text-foreground font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">Recipient Contact Person</label>
                  <input
                    type="text"
                    value={recipientContact}
                    onChange={e => setRecipientContact(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 text-foreground font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Drawing Selection Checklist */}
              <div>
                <label className="block font-bold text-foreground mb-1.5">
                  Select Drawings to Include ({selectedDrawingIds.length} selected) *
                </label>
                <div className="p-3 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50 max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                  {drawings.map(d => {
                    const isChecked = selectedDrawingIds.includes(d.id);
                    return (
                      <label
                        key={d.id}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked 
                            ? "bg-blue-500/10 border-blue-500/30 text-foreground" 
                            : "bg-card border-border text-muted-foreground hover:text-foreground"
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
                            <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-[10px]">{d.revision}</span>
                            <span className="text-[10px] text-muted-foreground">({d.discipline})</span>
                          </div>
                          <div className="truncate text-muted-foreground text-[11px]">{d.title}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">Copies per Drawing</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={copiesPerDrawing}
                  onChange={e => setCopiesPerDrawing(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 text-foreground font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">Transmittal Remarks / Instructions</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 text-foreground font-semibold focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="h-8 px-4 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow cursor-pointer"
                >
                  Generate & Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL PRINTABLE TRANSMITTAL SLIP MODAL */}
      {isPrintSlipOpen && selectedTransmittal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white text-slate-900 border border-slate-300 w-full max-w-3xl rounded-2xl shadow-2xl p-8 relative max-h-[95vh] overflow-y-auto custom-scrollbar">
            {/* Action Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6 print:hidden">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Verified Legal Issuance Document</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="h-8 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintSlipOpen(false)}
                  className="h-8 w-8 rounded-xl hover:bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Document Header */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                    CHANDAK GROUP
                  </h1>
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Design & Project Delivery Division • Corporate Office Mumbai
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Official Drawing Document Transmittal & Handover Record
                  </p>
                </div>

                <div className="text-right">
                  <div className="inline-block p-1.5 border border-slate-300 rounded-lg bg-slate-50">
                    <QrCode className="h-10 w-10 text-slate-800" />
                  </div>
                  <div className="text-[9px] font-mono font-bold text-slate-500 mt-1">
                    {selectedTransmittal.transmittalNumber}
                  </div>
                </div>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs mb-6">
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
                <span className="inline-block px-2 py-0.5 mt-0.5 rounded text-[10px] font-bold bg-slate-900 text-white uppercase tracking-wider">
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
                      <td className="p-2 border-r border-slate-300 text-center font-mono text-[10px]">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-300 font-mono font-bold text-slate-900">{item.drawingCode}</td>
                      <td className="p-2 border-r border-slate-300 text-slate-700">{item.drawingTitle}</td>
                      <td className="p-2 border-r border-slate-300 text-center font-mono font-bold text-blue-600">{item.revision}</td>
                      <td className="p-2 text-center font-mono font-bold text-slate-900">{item.copiesIssued}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedTransmittal.remarks && (
              <div className="p-3 mb-6 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <span className="font-bold block uppercase text-[10px] mb-0.5">Special Instructions / Remarks:</span>
                <span>{selectedTransmittal.remarks}</span>
              </div>
            )}

            {/* Signature & Seal Block */}
            <div className="grid grid-cols-2 gap-6 pt-6 border-t-2 border-slate-300 text-xs mt-8">
              <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/50">
                <div className="text-[10px] font-bold text-slate-500 uppercase mb-8">Issued By (Chandak Design Division):</div>
                <div className="border-b border-slate-400 pb-1 mb-1 font-bold text-slate-800">{selectedTransmittal.issuedBy}</div>
                <div className="text-[10px] text-slate-500">Authorized Design Signatory & Date: {selectedTransmittal.issueDate}</div>
              </div>

              <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/50">
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
        </div>
      )}
    </div>
  );
}
