"use client";

import React, { useState, useMemo } from "react";
import { DrawingItem, DrawingStatus } from "../types";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Eye, 
  FileCheck, 
  ShieldCheck, 
  Search, 
  Building2, 
  Building,
  SlidersHorizontal, 
  Sparkles, 
  Download, 
  Stamp, 
  MessageSquare,
  X
} from "lucide-react";
import { DesignMultiSelectDropdown, DropdownOption } from "./DesignMultiSelectDropdown";
import { DesignMasterStore } from "../services/designMasterStore";

interface ApprovalsReviewQueueProps {
  drawings: DrawingItem[];
  onOpenReviewModal: (drawing: DrawingItem) => void;
  onQuickStatusUpdate: (drawingId: string, status: DrawingStatus) => void;
}

export const ApprovalsReviewQueue: React.FC<ApprovalsReviewQueueProps> = ({
  drawings,
  onOpenReviewModal,
  onQuickStatusUpdate
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<string[]>([]);
  const [selectedDisciplineFilters, setSelectedDisciplineFilters] = useState<string[]>([]);
  const [selectedProjectFilters, setSelectedProjectFilters] = useState<string[]>([]);

  const disciplines = useMemo(() => {
    const fromMasters = (DesignMasterStore.getState().disciplines || []).map(d => d.name);
    const fromDrawings = drawings.map(d => d.discipline);
    return Array.from(new Set([...fromMasters, ...fromDrawings])).filter(Boolean);
  }, [drawings]);
  const uniqueProjects = useMemo(() => Array.from(new Set(drawings.map(d => d.project))), [drawings]);

  const filteredDrawings = useMemo(() => {
    return drawings.filter(d => {
      if (selectedStatusFilters.length > 0 && !selectedStatusFilters.includes(d.status)) return false;
      if (selectedDisciplineFilters.length > 0 && !selectedDisciplineFilters.includes(d.discipline)) return false;
      if (selectedProjectFilters.length > 0 && !selectedProjectFilters.includes(d.project)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (d.code || "").toLowerCase().includes(q) ||
          (d.title || "").toLowerCase().includes(q) ||
          (d.project || "").toLowerCase().includes(q) ||
          (d.consultant || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [drawings, selectedStatusFilters, selectedDisciplineFilters, selectedProjectFilters, searchQuery]);

  const underReviewCount = drawings.filter(d => d.status === "Under Review").length;
  const revisionReqCount = drawings.filter(d => d.status === "Revision Requested").length;
  const approvedGfcCount = drawings.filter(d => d.status === "Approved (GFC)").length;

  // Dropdown options
  const statusOptions = useMemo<DropdownOption[]>(() => {
    return [
      {
        value: "Under Review",
        label: "Under Review",
        count: underReviewCount,
        colorDot: "var(--warning)",
        subtitle: "Pending engineering sign-off"
      },
      {
        value: "Revision Requested",
        label: "Revision Requested",
        count: revisionReqCount,
        colorDot: "var(--danger)",
        subtitle: "Awaiting consultant updates"
      },
      {
        value: "Approved (GFC)",
        label: "Approved (GFC)",
        count: approvedGfcCount,
        colorDot: "var(--success)",
        subtitle: "Signed & certified"
      }
    ];
  }, [underReviewCount, revisionReqCount, approvedGfcCount]);

  const disciplineOptions = useMemo<DropdownOption[]>(() => {
    return disciplines.map(d => {
      const cnt = drawings.filter(item => item.discipline === d).length;
      return {
        value: d,
        label: d,
        count: cnt,
        subtitle: `${cnt} drawing${cnt === 1 ? "" : "s"}`
      };
    });
  }, [disciplines, drawings]);

  const projectOptions = useMemo<DropdownOption[]>(() => {
    return uniqueProjects.map(p => {
      const cnt = drawings.filter(item => item.project === p).length;
      return {
        value: p,
        label: p,
        count: cnt,
        subtitle: `${cnt} sheet${cnt === 1 ? "" : "s"}`
      };
    });
  }, [uniqueProjects, drawings]);

  const totalActiveFilterCount =
    selectedStatusFilters.length +
    selectedDisciplineFilters.length +
    selectedProjectFilters.length;

  const handleClearAllFilters = () => {
    setSelectedStatusFilters([]);
    setSelectedDisciplineFilters([]);
    setSelectedProjectFilters([]);
    setSearchQuery("");
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Control Strip */}
      <div className="p-4 sm:p-5 rounded-lg border border-border bg-surface shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-success-soft text-success-text flex items-center justify-center border border-success-border shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Design approvals & review
              </h2>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Search approvals review queue"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-sunken text-foreground focus:outline-none focus:border-success-border"
            />
          </div>
        </div>

        {/* Multi-Selection Dropdowns Filter Row */}
        <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* 1. Status Dropdown */}
            <DesignMultiSelectDropdown
              label="Review status"
              icon={<Clock className="h-3.5 w-3.5" />}
              options={statusOptions}
              selectedValues={selectedStatusFilters}
              onChange={setSelectedStatusFilters}
              colorTheme="amber"
              placeholder="All queue items"
              searchPlaceholder="Filter status..."
              showSearch={false}
            />

            {/* 2. Discipline Dropdown */}
            <DesignMultiSelectDropdown
              label="Discipline"
              icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
              options={disciplineOptions}
              selectedValues={selectedDisciplineFilters}
              onChange={setSelectedDisciplineFilters}
              colorTheme="emerald"
              placeholder={`All Disciplines (${disciplines.length})`}
              searchPlaceholder="Search discipline..."
            />

            {/* 3. Project Dropdown */}
            <DesignMultiSelectDropdown
              label="Projects"
              icon={<Building className="h-3.5 w-3.5" />}
              options={projectOptions}
              selectedValues={selectedProjectFilters}
              onChange={setSelectedProjectFilters}
              colorTheme="blue"
              placeholder={`All Projects (${uniqueProjects.length})`}
              searchPlaceholder="Search project..."
            />

            {/* Clear All Filters Button */}
            {totalActiveFilterCount > 0 && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="h-9 px-3 rounded-lg border border-danger-border bg-danger-soft hover:bg-danger-soft text-danger-text text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs"
                title="Reset all active filters"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reset filters ({totalActiveFilterCount})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 text-muted-foreground text-xs">
            <span>Showing <strong className="text-foreground">{filteredDrawings.length}</strong> of {drawings.length} review items</span>
          </div>
        </div>

        {/* Active Selected Filter Badges */}
        {totalActiveFilterCount > 0 && (
          <div className="pt-2 border-t border-border flex flex-wrap items-center gap-1.5 text-xs animate-in fade-in duration-100">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1 shrink-0">
              Active Filters:
            </span>

            {/* Status Badges */}
            {selectedStatusFilters.map(st => (
              <span
                key={`st-${st}`}
                className="px-2 py-0.5 rounded-lg bg-warning-soft text-warning-text border border-warning-border text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs"
              >
                <Clock className="h-2.5 w-2.5" />
                <span>{st}</span>
                <button aria-label="Close"
                  type="button"
                  onClick={() => setSelectedStatusFilters(prev => prev.filter(x => x !== st))}
                  className="hover:text-danger-text cursor-pointer p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}

            {/* Discipline Badges */}
            {selectedDisciplineFilters.map(d => (
              <span
                key={`disc-${d}`}
                className="px-2 py-0.5 rounded-lg bg-success-soft text-success-text border border-success-border text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs"
              >
                <SlidersHorizontal className="h-2.5 w-2.5" />
                <span>{d}</span>
                <button aria-label="Close"
                  type="button"
                  onClick={() => setSelectedDisciplineFilters(prev => prev.filter(x => x !== d))}
                  className="hover:text-danger-text cursor-pointer p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}

            {/* Project Badges */}
            {selectedProjectFilters.map(p => (
              <span
                key={`proj-${p}`}
                className="px-2 py-0.5 rounded-lg bg-info-soft text-info-text border border-info-border text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs"
              >
                <Building className="h-2.5 w-2.5" />
                <span>{p}</span>
                <button aria-label="Close"
                  type="button"
                  onClick={() => setSelectedProjectFilters(prev => prev.filter(x => x !== p))}
                  className="hover:text-danger-text cursor-pointer p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}

            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-[11px] text-muted-foreground hover:text-danger-text underline ml-1 cursor-pointer font-medium"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-lg bg-surface border border-border flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-xs font-semibold text-warning-text">Under review</span>
            <div className="text-2xl font-semibold text-foreground mt-0.5">{underReviewCount}</div>
            <span className="text-[11px] text-muted-foreground">Pending lead sign-off</span>
          </div>
          <div className="h-9 w-9 rounded-lg bg-warning-soft text-warning-text flex items-center justify-center border border-warning-border">
            <Clock className="h-4 w-4" />
          </div>
        </div>

        <div className="p-4 rounded-lg bg-surface border border-border flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-xs font-semibold text-danger-text">Revisions requested</span>
            <div className="text-2xl font-semibold text-foreground mt-0.5">{revisionReqCount}</div>
            <span className="text-[11px] text-muted-foreground">Returned with comments</span>
          </div>
          <div className="h-9 w-9 rounded-lg bg-danger-soft text-danger-text flex items-center justify-center border border-danger-border">
            <AlertCircle className="h-4 w-4" />
          </div>
        </div>

        <div className="p-4 rounded-lg bg-surface border border-border flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-xs font-semibold text-success-text">GFC certified</span>
            <div className="text-2xl font-semibold text-foreground mt-0.5">{approvedGfcCount}</div>
            <span className="text-[11px] text-muted-foreground">Stamped for site release</span>
          </div>
          <div className="h-9 w-9 rounded-lg bg-success-soft text-success-text flex items-center justify-center border border-success-border">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Review Queue Cards */}
      <div className="space-y-3">
        {filteredDrawings.length === 0 ? (
          <div className="text-center py-16 p-6 rounded-lg border border-border text-muted-foreground text-xs">
            No drawing sheets found matching the current review filter.
          </div>
        ) : (
          filteredDrawings.map((drawing) => (
            <div 
              key={drawing.id} 
              className="p-4 sm:p-5 rounded-lg border border-border bg-surface shadow-xs hover:border-success-border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-semibold text-xs text-foreground bg-sunken px-2 py-0.5 rounded border border-border">
                    {drawing.code}
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sunken text-muted-foreground">
                    {drawing.discipline}
                  </span>
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-info-soft text-info-text border border-info-border">
                    Rev {drawing.revision}
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                    drawing.status === "Approved (GFC)" 
                      ? "bg-success-soft text-success-text border-success-border"
                      : drawing.status === "Under Review"
                      ? "bg-warning-soft text-warning-text border-warning-border"
                      : "bg-danger-soft text-danger-text border-danger-border"
                  }`}>
                    {drawing.status}
                  </span>
                </div>

                <h4 className="text-sm font-semibold text-foreground">
                  {drawing.title}
                </h4>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{drawing.project}</span>
                  </span>
                  <span>Consultant: <strong className="text-foreground">{drawing.consultant}</strong></span>
                  <span>Submitted: <strong className="text-foreground font-mono">{drawing.submittedDate}</strong></span>
                  {drawing.approvedDate && (
                    <span className="text-success-text font-semibold">
                      GFC Date: {drawing.approvedDate}
                    </span>
                  )}
                </div>

                {drawing.description && (
                  <p className="text-xs text-muted-foreground italic bg-sunken p-2 rounded-lg border border-border">
                    "{drawing.description}"
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <button
                  type="button"
                  onClick={() => onOpenReviewModal(drawing)}
                  className="h-8 px-3.5 rounded-lg bg-success hover:bg-success text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Review & certify</span>
                </button>

                {drawing.status !== "Approved (GFC)" && (
                  <button
                    type="button"
                    onClick={() => onQuickStatusUpdate(drawing.id, "Approved (GFC)")}
                    className="h-8 px-3 rounded-lg border border-success-border bg-success-soft hover:bg-success-soft text-success-text text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
                    title="Directly stamp as GFC approved"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Stamp GFC</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
