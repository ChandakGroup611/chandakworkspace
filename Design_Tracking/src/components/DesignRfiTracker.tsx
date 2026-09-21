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

  const disciplineFilterOptions = useMemo(() => [
    { value: "Architectural", label: "Architectural", count: rfis.filter(r => r.discipline === "Architectural").length },
    { value: "Structural", label: "Structural", count: rfis.filter(r => r.discipline === "Structural").length },
    { value: "MEP", label: "MEP Services", count: rfis.filter(r => r.discipline === "MEP").length },
    { value: "Landscape", label: "Landscape", count: rfis.filter(r => r.discipline === "Landscape").length },
    { value: "Interior", label: "Interior Design", count: rfis.filter(r => r.discipline === "Interior").length }
  ], [rfis]);

  const statusFilterOptions = useMemo(() => [
    { value: "OPEN", label: "Open / Awaiting Response", count: rfis.filter(r => r.status === "OPEN").length },
    { value: "UNDER_REVIEW", label: "Under Review / Escalated", count: rfis.filter(r => r.status === "UNDER_REVIEW").length },
    { value: "CLARIFIED", label: "Clarified / Resolved", count: rfis.filter(r => r.status === "CLARIFIED").length },
    { value: "CLOSED", label: "Closed & Signed-off", count: rfis.filter(r => r.status === "CLOSED").length }
  ], [rfis]);

  const priorityFilterOptions = useMemo(() => [
    { value: "URGENT", label: "Urgent (24-48h SLA)", count: rfis.filter(r => r.priority === "URGENT").length },
    { value: "HIGH", label: "High (3-5 Days SLA)", count: rfis.filter(r => r.priority === "HIGH").length },
    { value: "NORMAL", label: "Normal (7 Days SLA)", count: rfis.filter(r => r.priority === "NORMAL").length }
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
    URGENT: { label: "URGENT", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
    HIGH: { label: "HIGH", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
    NORMAL: { label: "NORMAL", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" }
  };

  const statusBadges: Record<RfiStatus, { label: string; color: string; icon: any }> = {
    OPEN: { label: "OPEN", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20", icon: AlertTriangle },
    UNDER_REVIEW: { label: "UNDER REVIEW", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", icon: Clock },
    CLARIFIED: { label: "CLARIFIED", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
    CLOSED: { label: "CLOSED", color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20", icon: CheckCircle2 }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              RFI & Site Clash Query Tracker
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRaiseModalOpen(true)}
            className="h-8 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-md cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Raise Site Query (RFI)</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-[11px] font-bold text-muted-foreground uppercase">Total RFIs Logged</div>
          <div className="text-xl font-black text-foreground mt-1">{rfis.length}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Site queries & clashes</div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase">Open / Pending</div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {rfis.filter(r => r.status === "OPEN" || r.status === "UNDER_REVIEW").length}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Awaiting consultant reply</div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Clarified & Resolved</div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {rfis.filter(r => r.status === "CLARIFIED" || r.status === "CLOSED").length}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Resolved with revisions</div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase">Urgent Priority</div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {rfis.filter(r => r.priority === "URGENT").length}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Critical path bottlenecks</div>
        </div>
      </div>

      {/* Unified Multi-Select Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border space-y-3 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              aria-label="Search RFI number, subject, consultant"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50 text-foreground focus:outline-none focus:border-purple-500"
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
              label="Discipline"
              options={disciplineFilterOptions}
              selectedValues={selectedDisciplines}
              onChange={setSelectedDisciplines}
              colorTheme="emerald"
              placeholder="All Disciplines"
            />

            <DesignMultiSelectDropdown
              label="Status"
              options={statusFilterOptions}
              selectedValues={selectedStatuses}
              onChange={setSelectedStatuses}
              colorTheme="purple"
              placeholder="All Status"
            />

            <DesignMultiSelectDropdown
              label="Priority"
              options={priorityFilterOptions}
              selectedValues={selectedPriorities}
              onChange={setSelectedPriorities}
              colorTheme="rose"
              placeholder="All Priorities"
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
                className="h-8 px-2.5 rounded-xl border border-dashed border-rose-500/40 hover:border-rose-500/70 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
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

            {selectedDisciplines.map(disc => (
              <span
                key={disc}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[11px] font-medium"
              >
                <span>Discipline: {disc}</span>
                <button
                  type="button"
                  onClick={() => setSelectedDisciplines(selectedDisciplines.filter(x => x !== disc))}
                  className="hover:text-emerald-900 dark:hover:text-emerald-100"
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
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 text-[11px] font-medium"
                >
                  <span>Status: {opt?.label || st}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedStatuses(selectedStatuses.filter(x => x !== st))}
                    className="hover:text-purple-900 dark:hover:text-purple-100"
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
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 text-[11px] font-medium"
                >
                  <span>Priority: {opt?.label || prio}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedPriorities(selectedPriorities.filter(x => x !== prio))}
                    className="hover:text-rose-900 dark:hover:text-rose-100"
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
          <div className="p-10 rounded-2xl border border-border bg-card text-center text-muted-foreground text-xs">
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
                className="p-5 rounded-2xl border border-border bg-card hover:border-purple-500/40 transition-all shadow-sm space-y-3"
              >
                {/* Header line */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-sm text-purple-600 dark:text-purple-400">
                      {r.rfiNumber}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${pBadge.color}`}>
                      {pBadge.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${sBadge.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      <span>{sBadge.label}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-muted-foreground">
                      {r.discipline}
                    </span>
                  </div>

                  <div className="text-[11px] text-muted-foreground flex items-center gap-2 font-mono">
                    <span>Target TAT: {r.targetResolutionDate}</span>
                  </div>
                </div>

                {/* Subject & Description */}
                <div>
                  <h3 className="font-bold text-sm text-foreground mb-1">
                    {r.subject}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {r.queryDescription}
                  </p>
                </div>

                {/* Context Badges */}
                <div className="flex flex-wrap items-center gap-3 text-xs pt-1 border-t border-border/50">
                  <div className="flex items-center gap-1.5 text-foreground font-semibold">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{r.projectName} {r.towerName && `• ${r.towerName}`}</span>
                  </div>

                  {r.drawingCode && (
                    <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-mono text-[11px]">
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
                  <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <div className="flex items-center gap-1.5">
                        <CornerDownRight className="h-3.5 w-3.5" />
                        <span>Consultant Clarification & Solution:</span>
                      </div>
                      <span className="font-normal text-muted-foreground">
                        By {r.respondedBy} on {r.respondedDate}
                      </span>
                    </div>
                    <p className="text-foreground leading-relaxed pl-5">
                      {r.consultantResponse}
                    </p>
                    {r.resolvingRevisionNumber && (
                      <div className="pl-5 pt-1 text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                        <span>Resolved in Drawing Revision:</span>
                        <span className="font-mono font-black px-1.5 py-0.2 rounded bg-blue-500/10">{r.resolvingRevisionNumber}</span>
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
                      className="h-7 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Submit Consultant Clarification</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete RFI query ${r.rfiNumber}?`)) {
                        DesignMasterStore.deleteRfi(r.id);
                      }
                    }}
                    title="Delete RFI"
                    className="h-7 w-7 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 inline-flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* RAISE RFI MODAL */}
      {isRaiseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface text-foreground border border-border w-full max-w-xl rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-purple-500" />
                  <span>Raise Site Request For Information (RFI)</span>
                </h3>
                <p className="text-xs text-muted">
                  Log design query, site condition clash, or structural specification ambiguity
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRaiseModalOpen(false)}
                className="h-7 w-7 rounded-lg hover:bg-muted/20 flex items-center justify-center text-muted hover:text-foreground transition-colors"
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

            <form onSubmit={handleRaiseRfi} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-foreground">Project *</label>
                  <select
                    value={projectId}
                    onChange={e => setProjectId(e.target.value)}
                    aria-label="Select Project"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="">Select Project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-foreground">Tower / Zone</label>
                  <input
                    type="text"
                    value={towerName}
                    onChange={e => setTowerName(e.target.value)}
                    aria-label="Tower or Zone"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-foreground">Discipline *</label>
                  <select
                    value={discipline}
                    onChange={e => setDiscipline(e.target.value as DesignDiscipline)}
                    aria-label="Discipline"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="Architectural">Architectural</option>
                    <option value="Structural">Structural</option>
                    <option value="MEP">MEP</option>
                    <option value="Landscape">Landscape</option>
                    <option value="Interior">Interior</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-foreground">Priority Level *</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as RfiPriority)}
                    aria-label="Priority Level"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="URGENT">Urgent (Site Stoppage Risk)</option>
                    <option value="HIGH">High (Upcoming Activity)</option>
                    <option value="NORMAL">Normal (Pre-construction / Planning)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-foreground">Referenced Drawing Number</label>
                  <input
                    type="text"
                    value={drawingCode}
                    onChange={e => setDrawingCode(e.target.value)}
                    aria-label="Referenced Drawing Number"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-foreground">Target Resolution Date</label>
                  <input
                    type="date"
                    value={targetResolutionDate}
                    onChange={e => setTargetResolutionDate(e.target.value)}
                    aria-label="Target Resolution Date"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-foreground">Subject / Query Title *</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  aria-label="Subject or Query Title"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-foreground">Detailed Query Description *</label>
                <textarea
                  rows={3}
                  required
                  value={queryDescription}
                  onChange={e => setQueryDescription(e.target.value)}
                  aria-label="Detailed Query Description"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-foreground">Raised By (Site Engineer) *</label>
                  <input
                    type="text"
                    required
                    value={raisedBy}
                    onChange={e => setRaisedBy(e.target.value)}
                    aria-label="Raised By Site Engineer"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-foreground">Assigned Consultant Firm *</label>
                  <input
                    type="text"
                    required
                    value={assignedConsultant}
                    onChange={e => setAssignedConsultant(e.target.value)}
                    aria-label="Assigned Consultant Firm"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsRaiseModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-border bg-surface hover:bg-muted/20 text-foreground text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
                >
                  Submit RFI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONSULTANT REPLY MODAL */}
      {selectedRfiForReply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface text-foreground border border-border w-full max-w-xl rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-500" />
                  <span>Provide Consultant Clarification ({selectedRfiForReply.rfiNumber})</span>
                </h3>
                <p className="text-xs text-muted">
                  Formal technical response and drawing revision resolution
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRfiForReply(null)}
                className="h-7 w-7 rounded-lg hover:bg-muted/20 flex items-center justify-center text-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Query Summary */}
            <div className="p-3.5 mb-4 rounded-xl bg-muted/15 border border-border text-xs space-y-1">
              <div className="font-bold text-foreground">{selectedRfiForReply.subject}</div>
              <div className="text-muted">{selectedRfiForReply.queryDescription}</div>
              <div className="text-[10px] text-muted pt-1">
                Raised by: {selectedRfiForReply.raisedBy} • Assigned: {selectedRfiForReply.assignedConsultant}
              </div>
            </div>

            {replyError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{replyError}</span>
              </div>
            )}

            <form onSubmit={handleConsultantReply} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-bold text-foreground">
                  Consultant Clarification & Technical Instructions *
                </label>
                <textarea
                  rows={4}
                  required
                  value={responseText}
                  onChange={e => setResponseText(e.target.value)}
                  aria-label="Consultant clarification and instructions"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-foreground">Responded By (Consultant Engineer) *</label>
                  <input
                    type="text"
                    required
                    value={respondedByName}
                    onChange={e => setRespondedByName(e.target.value)}
                    aria-label="Responded By Consultant Engineer"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-foreground">Resolving Drawing Revision (e.g. R3)</label>
                  <input
                    type="text"
                    value={resolvingRev}
                    onChange={e => setResolvingRev(e.target.value)}
                    aria-label="Resolving Drawing Revision"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setSelectedRfiForReply(null)}
                  className="h-9 px-4 rounded-xl border border-border bg-surface hover:bg-muted/20 text-foreground text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
                >
                  Resolve & Close RFI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
