"use client";

import React, { useState, useMemo } from "react";
import { 
  HelpCircle, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Building2, 
  FileText, 
  MessageSquare, 
  User, 
  Calendar, 
  ChevronRight, 
  X, 
  Send,
  AlertCircle,
  Tag,
  CornerDownRight,
  ShieldAlert,
  Trash2
} from "lucide-react";
import { DesignMasterStore } from "../services/designMasterStore";
import { RfiItem, RfiPriority, RfiStatus, DesignDiscipline } from "../types";
import { DesignMultiSelectDropdown } from "./DesignMultiSelectDropdown";
import { TransactionFormLayout, WorkingDocumentLayout } from "./DesignTransactionLayout";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import { confirmAction } from "@/components/ui/feedback/confirm";

export function DesignRfiTracker() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  
  // Modals
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [selectedRfiForReply, setSelectedRfiForReply] = useState<RfiItem | null>(null);

  // Raise Form State
  const [projectId, setProjectId] = useState("");
  const [towerName, setTowerName] = useState("");
  const [discipline, setDiscipline] = useState<DesignDiscipline>("Structural");
  const [drawingCode, setDrawingCode] = useState("");
  const [drawingTitle, setDrawingTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [queryDescription, setQueryDescription] = useState("");
  const [raisedBy, setRaisedBy] = useState("");
  const [assignedConsultant, setAssignedConsultant] = useState("");
  const [priority, setPriority] = useState<RfiPriority>("HIGH");
  const [targetResolutionDate, setTargetResolutionDate] = useState("");
  const [formError, setFormError] = useState("");

  // Response Form State
  const [responseText, setResponseText] = useState("");
  const [respondedByName, setRespondedByName] = useState("");
  const [resolvingRev, setResolvingRev] = useState("");
  const [replyError, setReplyError] = useState("");

  const projects = useMemo(() => {
    return DesignMasterStore.getUserAccessibleProjects();
  }, []);

  const accessibleProjectIds = useMemo(() => new Set(projects.map(p => p.id)), [projects]);

  const rfis = useMemo(() => {
    const all = DesignMasterStore.getRfis();
    return all.filter(r => 
      accessibleProjectIds.has(r.projectId) ||
      projects.some(p => p.name.toLowerCase() === (r.projectName || "").toLowerCase())
    );
  }, [accessibleProjectIds, projects]);

  const drawings = useMemo(() => {
    const all = DesignMasterStore.getDrawings();
    return all.filter(d => 
      projects.some(p => p.name.toLowerCase() === (d.project || "").toLowerCase() || p.id === d.project)
    );
  }, [projects]);

  const consultants = DesignMasterStore.getConsultants();

  const projectFilterOptions = useMemo(() => {
    return projects.map(p => ({
      value: p.id,
      label: p.name,
      count: rfis.filter(r => r.projectId === p.id).length
    }));
  }, [projects, rfis]);

  const disciplineFilterOptions = useMemo(() => {
    const fromMasters = (DesignMasterStore.getState().disciplines || []).map(d => d.name);
    const fromRfis = rfis.map(r => r.discipline);
    const all = Array.from(new Set([...fromMasters, ...fromRfis])).filter(Boolean);
    return all.map(d => ({
      value: d,
      label: d,
      count: rfis.filter(r => r.discipline === d).length
    }));
  }, [rfis]);

  const statusFilterOptions = useMemo(() => [
    { value: "OPEN", label: "Open / awaiting response", count: rfis.filter(r => r.status === "OPEN").length },
    { value: "UNDER_REVIEW", label: "Under review / escalated", count: rfis.filter(r => r.status === "UNDER_REVIEW").length },
    { value: "CLARIFIED", label: "Clarified / resolved", count: rfis.filter(r => r.status === "CLARIFIED").length },
    { value: "CLOSED", label: "Closed & Signed-off", count: rfis.filter(r => r.status === "CLOSED").length }
  ], [rfis]);

  const priorityFilterOptions = useMemo(() => [
    { value: "URGENT", label: "Urgent (24-48h SLA)", count: rfis.filter(r => r.priority === "URGENT").length },
    { value: "HIGH", label: "High (3-5 days SLA)", count: rfis.filter(r => r.priority === "HIGH").length },
    { value: "NORMAL", label: "Normal (7 days SLA)", count: rfis.filter(r => r.priority === "NORMAL").length }
  ], [rfis]);

  // Filtered RFIs
  const filteredRfis = useMemo(() => {
    return rfis.filter(r => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        r.rfiNumber.toLowerCase().includes(q) ||
        r.projectName.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q) ||
        r.assignedConsultant.toLowerCase().includes(q) ||
        (r.drawingCode && r.drawingCode.toLowerCase().includes(q));

      const matchesProject = selectedProjects.length === 0 || selectedProjects.includes(r.projectId);
      const matchesDiscipline = selectedDisciplines.length === 0 || selectedDisciplines.includes(r.discipline);
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(r.status);
      const matchesPriority = selectedPriorities.length === 0 || selectedPriorities.includes(r.priority);

      return matchesSearch && matchesProject && matchesDiscipline && matchesStatus && matchesPriority;
    });
  }, [rfis, searchQuery, selectedProjects, selectedDisciplines, selectedStatuses, selectedPriorities]);

  // Handle Raise RFI
  const handleRaiseRfi = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!projectId) {
      setFormError("Please select a project.");
      return;
    }
    if (!subject.trim() || !queryDescription.trim()) {
      setFormError("Subject and query description are required.");
      return;
    }
    if (!raisedBy.trim()) {
      setFormError("Please specify who is raising this query.");
      return;
    }
    if (!assignedConsultant.trim()) {
      setFormError("Please assign a consultant firm.");
      return;
    }

    const proj = projects.find(p => p.id === projectId);

    const newRfi: RfiItem = {
      id: `rfi-${Date.now()}`,
      rfiNumber: `RFI-${discipline.slice(0, 3).toUpperCase()}-${(rfis.length + 1).toString().padStart(3, "0")}`,
      projectId,
      projectName: proj?.name || "Chandak Project",
      towerName: towerName.trim() || undefined,
      discipline,
      drawingCode: drawingCode.trim() || undefined,
      drawingTitle: drawingTitle.trim() || undefined,
      subject: subject.trim(),
      queryDescription: queryDescription.trim(),
      raisedBy: raisedBy.trim(),
      raisedDate: new Date().toISOString().split("T")[0],
      assignedConsultant: assignedConsultant.trim(),
      priority,
      targetResolutionDate: targetResolutionDate || new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
      status: "OPEN"
    };

    DesignMasterStore.saveRfi(newRfi);

    // Reset Form
    setIsRaiseModalOpen(false);
    setProjectId("");
    setTowerName("");
    setDrawingCode("");
    setDrawingTitle("");
    setSubject("");
    setQueryDescription("");
    setRaisedBy("");
    setAssignedConsultant("");
  };

  // Handle Consultant Reply
  const handleConsultantReply = (e: React.FormEvent) => {
    e.preventDefault();
    setReplyError("");

    if (!responseText.trim()) {
      setReplyError("Please provide clarification / response text.");
      return;
    }
    if (!respondedByName.trim()) {
      setReplyError("Please provide responder name.");
      return;
    }

    if (selectedRfiForReply) {
      DesignMasterStore.resolveRfi(
        selectedRfiForReply.id,
        responseText.trim(),
        respondedByName.trim(),
        resolvingRev.trim() || undefined
      );

      setSelectedRfiForReply(null);
      setResponseText("");
      setRespondedByName("");
      setResolvingRev("");
    }
  };

  const priorityBadges: Record<RfiPriority, { label: string; color: string }> = {
    URGENT: { label: "URGENT", color: "bg-danger-soft text-danger-text border-danger-border" },
    HIGH: { label: "HIGH", color: "bg-warning-soft text-warning-text border-warning-border" },
    NORMAL: { label: "NORMAL", color: "bg-info-soft text-info-text border-info-border" }
  };

  const statusBadges: Record<RfiStatus, { label: string; color: string; icon: any }> = {
    OPEN: { label: "OPEN", color: "bg-danger-soft text-danger-text border-danger-border", icon: AlertTriangle },
    UNDER_REVIEW: { label: "UNDER REVIEW", color: "bg-warning-soft text-warning-text border-warning-border", icon: Clock },
    CLARIFIED: { label: "CLARIFIED", color: "bg-success-soft text-success-text border-success-border", icon: CheckCircle2 },
    CLOSED: { label: "CLOSED", color: "bg-sunken text-subtle border-border", icon: CheckCircle2 }
  };

  return (
    <div className="space-y-6">
      {!isRaiseModalOpen && !selectedRfiForReply && (
        <>
          {/* Header Banner */}
          <div className="p-5 rounded-lg bg-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-surface border border-border flex items-center justify-center text-accent-soft-text dark:text-muted-foreground shrink-0">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              RFI & site clash query tracker
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRaiseModalOpen(true)}
            className="h-8 px-3.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-md cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Raise site query (RFI)</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="text-[11px] font-semibold text-muted-foreground">Total RFIs logged</div>
          <div className="text-xl font-semibold text-foreground mt-1">{rfis.length}</div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="text-[11px] font-semibold text-danger-text">Open / pending</div>
          <div className="text-xl font-semibold text-danger-text mt-1">
            {rfis.filter(r => r.status === "OPEN" || r.status === "UNDER_REVIEW").length}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="text-[11px] font-semibold text-success-text">Clarified & resolved</div>
          <div className="text-xl font-semibold text-success-text mt-1">
            {rfis.filter(r => r.status === "CLARIFIED" || r.status === "CLOSED").length}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="text-[11px] font-semibold text-warning-text">Urgent priority</div>
          <div className="text-xl font-semibold text-warning-text mt-1">
            {rfis.filter(r => r.priority === "URGENT").length}
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
              aria-label="Search RFI number, subject, consultant"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-sunken text-foreground focus:outline-none focus:border-border-active"
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
              label="Discipline"
              options={disciplineFilterOptions}
              selectedValues={selectedDisciplines}
              onChange={setSelectedDisciplines}
              colorTheme="emerald"
              placeholder="All disciplines"
            />

            <DesignMultiSelectDropdown
              label="Status"
              options={statusFilterOptions}
              selectedValues={selectedStatuses}
              onChange={setSelectedStatuses}
              colorTheme="purple"
              placeholder="All status"
            />

            <DesignMultiSelectDropdown
              label="Priority"
              options={priorityFilterOptions}
              selectedValues={selectedPriorities}
              onChange={setSelectedPriorities}
              colorTheme="rose"
              placeholder="All priorities"
            />

            {(selectedProjects.length > 0 || selectedDisciplines.length > 0 || selectedStatuses.length > 0 || selectedPriorities.length > 0 || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedProjects([]);
                  setSelectedDisciplines([]);
                  setSelectedStatuses([]);
                  setSelectedPriorities([]);
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
        {(selectedProjects.length > 0 || selectedDisciplines.length > 0 || selectedStatuses.length > 0 || selectedPriorities.length > 0) && (
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

            {selectedDisciplines.map(disc => (
              <span
                key={disc}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success-soft text-success-text border border-success-border text-[11px] font-medium"
              >
                <span>Discipline: {disc}</span>
                <button aria-label="Close"
                  type="button"
                  onClick={() => setSelectedDisciplines(selectedDisciplines.filter(x => x !== disc))}
                  className="hover:text-success-text"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}

            {selectedStatuses.map(st => {
              const opt = statusFilterOptions.find(o => o.value === st);
              return (
                <span
                  key={st}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface text-foreground dark:text-muted-foreground border border-border text-[11px] font-medium"
                >
                  <span>Status: {opt?.label || st}</span>
                  <button aria-label="Close"
                    type="button"
                    onClick={() => setSelectedStatuses(selectedStatuses.filter(x => x !== st))}
                    className="hover:text-accent-soft-text"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              );
            })}

            {selectedPriorities.map(prio => {
              const opt = priorityFilterOptions.find(o => o.value === prio);
              return (
                <span
                  key={prio}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-danger-soft text-danger-text border border-danger-border text-[11px] font-medium"
                >
                  <span>Priority: {opt?.label || prio}</span>
                  <button aria-label="Close"
                    type="button"
                    onClick={() => setSelectedPriorities(selectedPriorities.filter(x => x !== prio))}
                    className="hover:text-danger-text"
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
                setSelectedDisciplines([]);
                setSelectedStatuses([]);
                setSelectedPriorities([]);
              }}
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground ml-1 underline cursor-pointer"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* RFI Cards List */}
      <div className="space-y-3">
        {filteredRfis.length === 0 ? (
          <div className="p-10 rounded-lg border border-border bg-card text-center text-muted-foreground text-xs">
            No RFI queries found matching the selected filters.
          </div>
        ) : (
          filteredRfis.map(r => {
            const pBadge = priorityBadges[r.priority];
            const sBadge = statusBadges[r.status];
            const StatusIcon = sBadge.icon;

            return (
              <div
                key={r.id}
                className="p-5 rounded-lg border border-border bg-card hover:border-border-active transition-all shadow-sm space-y-3"
              >
                {/* Header line */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-semibold text-sm text-accent-soft-text dark:text-muted-foreground">
                      {r.rfiNumber}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${pBadge.color}`}>
                      {pBadge.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${sBadge.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      <span>{sBadge.label}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sunken text-muted-foreground">
                      {r.discipline}
                    </span>
                  </div>

                  <div className="text-[11px] text-muted-foreground flex items-center gap-2 font-mono">
                    <span>Target TAT: {r.targetResolutionDate}</span>
                  </div>
                </div>

                {/* Subject & Description */}
                <div>
                  <h3 className="font-semibold text-sm text-foreground mb-1">
                    {r.subject}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {r.queryDescription}
                  </p>
                </div>

                {/* Context Badges */}
                <div className="flex flex-wrap items-center gap-3 text-xs pt-1 border-t border-border">
                  <div className="flex items-center gap-1.5 text-foreground font-semibold">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{r.projectName} {r.towerName && `• ${r.towerName}`}</span>
                  </div>

                  {r.drawingCode && (
                    <div className="flex items-center gap-1.5 text-info-text font-mono text-[11px]">
                      <FileText className="h-3.5 w-3.5" />
                      <span>{r.drawingCode}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span>Raised by: <b className="text-foreground">{r.raisedBy}</b> ({r.raisedDate})</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Tag className="h-3.5 w-3.5" />
                    <span>Assigned Consultant: <b className="text-foreground">{r.assignedConsultant}</b></span>
                  </div>
                </div>

                {/* Consultant Response Box if Clarified */}
                {r.consultantResponse && (
                  <div className="p-3.5 rounded-lg bg-success-soft border border-success-border text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-success-text">
                      <div className="flex items-center gap-1.5">
                        <CornerDownRight className="h-3.5 w-3.5" />
                        <span>Consultant clarification & solution:</span>
                      </div>
                      <span className="font-normal text-muted-foreground">
                        By {r.respondedBy} on {r.respondedDate}
                      </span>
                    </div>
                    <p className="text-foreground leading-relaxed pl-5">
                      {r.consultantResponse}
                    </p>
                    {r.resolvingRevisionNumber && (
                      <div className="pl-5 pt-1 text-[11px] text-info-text font-semibold flex items-center gap-1">
                        <span>Resolved in drawing revision:</span>
                        <span className="font-mono font-semibold px-1.5 py-0.2 rounded bg-info-soft">{r.resolvingRevisionNumber}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  {r.status !== "CLARIFIED" && r.status !== "CLOSED" && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRfiForReply(r);
                        setResponseText("");
                        setRespondedByName("");
                        setResolvingRev("");
                      }}
                      className="h-7 px-3 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Submit consultant clarification</span>
                    </button>
                  )}

                  <button aria-label="Delete RFI"
                    type="button"
                    onClick={async () => {
                      if (await confirmAction(`Delete RFI query ${r.rfiNumber}?`)) {
                        DesignMasterStore.deleteRfi(r.id);
                      }
                    }}
                    title="Delete RFI"
                    className="h-7 w-7 rounded-lg hover:bg-danger-soft text-muted-foreground hover:text-danger-text inline-flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
      </>
      )}

      {/* RAISE RFI TRANSACTION CANVAS */}
      {isRaiseModalOpen && (
        <TransactionFormLayout
          title="Raise site request for information (RFI)"
          badge="Technical Query Entry"
          category="RFI & Query Control"
          icon={HelpCircle}
          iconBg="bg-surface text-accent-soft-text border-border"
          description="Log design query, site condition clash, or structural specification ambiguity with consultant assignment."
          breadcrumbs={[
            { label: "RFI Tracker", onClick: () => setIsRaiseModalOpen(false) },
            { label: "Raise site RFI" }
          ]}
          onBack={() => setIsRaiseModalOpen(false)}
          backLabel="Back to RFIs"
          onReset={() => {
            setTowerName("");
            setDiscipline("Architectural");
            setPriority("HIGH");
            setDrawingCode("");
            setSubject("");
            setQueryDescription("");
            setTargetResolutionDate("");
            setFormError("");
          }}
          onSave={handleRaiseRfi}
          saveLabel="Submit RFI"
          saveIcon={Send}
        >
          <div className="space-y-6 max-w-4xl">
            {formError && (
              <div className="p-3.5 rounded-lg bg-danger-soft border border-danger-border text-danger-text text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <AppCard className="border-border shadow-xs">
              <AppCardHeader className="bg-surface/50 border-b border-border pb-3">
                <AppCardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-accent-soft-text dark:text-muted-foreground" />
                  <span>Project & engineering discipline</span>
                </AppCardTitle>
              </AppCardHeader>
              <AppCardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Project *</label>
                    <select
                      value={projectId}
                      onChange={e => setProjectId(e.target.value)}
                      aria-label="Select project"
                      className="w-full h-10 px-3 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                    >
                      <option value="">Select project</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Tower / zone</label>
                    <input
                      type="text"
                      value={towerName}
                      onChange={e => setTowerName(e.target.value)}
                      placeholder="e.g. Tower b / podium basement 1"
                      aria-label="Tower or zone"
                      className="w-full h-10 px-3 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Discipline *</label>
                    <select
                      value={discipline}
                      onChange={e => setDiscipline(e.target.value as DesignDiscipline)}
                      aria-label="Discipline"
                      className="w-full h-10 px-3 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                    >
                      <option value="Architectural">Architectural</option>
                      <option value="Structural">Structural</option>
                      <option value="MEP">MEP (mech / elec / plumb)</option>
                      <option value="Landscape">Landscape & hardscape</option>
                      <option value="Interior">Interior / common areas</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Priority level *</label>
                    <select
                      value={priority}
                      onChange={e => setPriority(e.target.value as RfiPriority)}
                      aria-label="Priority level"
                      className="w-full h-10 px-3 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                    >
                      <option value="URGENT">Urgent (site stoppage risk)</option>
                      <option value="HIGH">High (Upcoming Activity)</option>
                      <option value="NORMAL">Normal (Pre-construction / Planning)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Referenced drawing number</label>
                    <input
                      type="text"
                      value={drawingCode}
                      onChange={e => setDrawingCode(e.target.value)}
                      placeholder="e.g. ST-T1-COL-204"
                      aria-label="Referenced drawing number"
                      className="w-full h-10 px-3 text-xs rounded-lg border border-border bg-background text-foreground font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Target resolution date</label>
                    <input
                      type="date"
                      value={targetResolutionDate}
                      onChange={e => setTargetResolutionDate(e.target.value)}
                      aria-label="Target resolution date"
                      className="w-full h-10 px-3 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
              </AppCardContent>
            </AppCard>

            <AppCard className="border-border shadow-xs">
              <AppCardHeader className="bg-surface/50 border-b border-border pb-3">
                <AppCardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-accent-soft-text dark:text-muted-foreground" />
                  <span>Technical query details</span>
                </AppCardTitle>
              </AppCardHeader>
              <AppCardContent className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Subject / query title *</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="e.g. Clash between MEP HVAC Ducting and Structural Beam Level 3"
                    aria-label="Subject or query title"
                    className="w-full h-10 px-3 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Detailed query description *</label>
                  <textarea
                    rows={4}
                    required
                    value={queryDescription}
                    onChange={e => setQueryDescription(e.target.value)}
                    placeholder="Provide specific grid locations, discrepancy measurements, and contractor query…"
                    aria-label="Detailed query description"
                    className="w-full p-3 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Raised by (site engineer) *</label>
                    <input
                      type="text"
                      required
                      value={raisedBy}
                      onChange={e => setRaisedBy(e.target.value)}
                      placeholder="e.g. Site engineer (civil)"
                      aria-label="Raised by site engineer"
                      className="w-full h-10 px-3 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Assigned consultant firm *</label>
                    <input
                      type="text"
                      required
                      value={assignedConsultant}
                      onChange={e => setAssignedConsultant(e.target.value)}
                      placeholder="e.g. Structural consultant / MEP firm"
                      aria-label="Assigned consultant firm"
                      className="w-full h-10 px-3 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
              </AppCardContent>
            </AppCard>
          </div>
        </TransactionFormLayout>
      )}

      {/* CONSULTANT CLARIFICATION WORKING CANVAS */}
      {selectedRfiForReply && (
        <TransactionFormLayout
          title={`Provide Consultant Clarification (${selectedRfiForReply.rfiNumber})`}
          badge="Consultant Response"
          category="RFI & Query Control"
          icon={MessageSquare}
          iconBg="bg-success-soft text-success-text border-success-border"
          description="Formal technical response, engineering instructions and resolving drawing revision commit."
          breadcrumbs={[
            { label: "RFI Tracker", onClick: () => setSelectedRfiForReply(null) },
            { label: `Clarification #${selectedRfiForReply.rfiNumber}` }
          ]}
          onBack={() => setSelectedRfiForReply(null)}
          backLabel="Back to RFIs"
          onSave={handleConsultantReply}
          saveLabel="Resolve & Close RFI"
          saveIcon={CheckCircle2}
        >
          <div className="space-y-6 max-w-4xl">
            {/* Query Summary Dossier */}
            <AppCard className="border-border shadow-xs">
              <AppCardHeader className="bg-surface/50 border-b border-border pb-3">
                <AppCardTitle className="text-sm font-semibold flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  <span>Site query dossier</span>
                </AppCardTitle>
              </AppCardHeader>
              <AppCardContent className="p-5 space-y-3">
                <div className="text-base font-semibold text-foreground">{selectedRfiForReply.subject}</div>
                <div className="text-xs text-muted-foreground leading-relaxed bg-muted/20 p-3.5 rounded-lg border border-border">
                  {selectedRfiForReply.queryDescription}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div className="p-2.5 rounded-lg bg-sunken border border-border">
                    <span className="text-[11px] text-muted-foreground block font-semibold">Project:</span>
                    <span className="font-semibold text-foreground">{selectedRfiForReply.projectName}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-sunken border border-border">
                    <span className="text-[11px] text-muted-foreground block font-semibold">Discipline:</span>
                    <span className="font-semibold text-foreground">{selectedRfiForReply.discipline}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-sunken border border-border">
                    <span className="text-[11px] text-muted-foreground block font-semibold">Raised By:</span>
                    <span className="font-semibold text-foreground">{selectedRfiForReply.raisedBy}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-sunken border border-border">
                    <span className="text-[11px] text-muted-foreground block font-semibold">Assigned To:</span>
                    <span className="font-semibold text-accent-soft-text dark:text-muted-foreground">{selectedRfiForReply.assignedConsultant}</span>
                  </div>
                </div>
              </AppCardContent>
            </AppCard>

            {replyError && (
              <div className="p-3.5 rounded-lg bg-danger-soft border border-danger-border text-danger-text text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{replyError}</span>
              </div>
            )}

            {/* Technical Instructions Form */}
            <AppCard className="border-border shadow-xs">
              <AppCardHeader className="bg-surface/50 border-b border-border pb-3">
                <AppCardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success-text" />
                  <span>Consultant technical resolution</span>
                </AppCardTitle>
              </AppCardHeader>
              <AppCardContent className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Consultant clarification & technical instructions *
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={responseText}
                    onChange={e => setResponseText(e.target.value)}
                    placeholder="Provide detailed engineering clearance, revised coordinate fix, or contractor instructions…"
                    aria-label="Consultant clarification and instructions"
                    className="w-full p-3 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-success-border resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Responded by (consultant engineer) *</label>
                    <input
                      type="text"
                      required
                      value={respondedByName}
                      onChange={e => setRespondedByName(e.target.value)}
                      placeholder="e.g. Lead structural consultant"
                      aria-label="Responded by consultant engineer"
                      className="w-full h-10 px-3 text-xs rounded-lg border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-success-border"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Resolving drawing revision (e.g. R3)</label>
                    <input
                      type="text"
                      value={resolvingRev}
                      onChange={e => setResolvingRev(e.target.value)}
                      placeholder="e.g. ST-t1-COL-204 rev r3"
                      aria-label="Resolving drawing revision"
                      className="w-full h-10 px-3 text-xs rounded-lg border border-border bg-background text-foreground font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-success-border"
                    />
                  </div>
                </div>
              </AppCardContent>
            </AppCard>
          </div>
        </TransactionFormLayout>
      )}
    </div>
  );
}
