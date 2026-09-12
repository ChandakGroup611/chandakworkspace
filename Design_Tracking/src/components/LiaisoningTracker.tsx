"use client";

import React, { useState, useMemo } from "react";
import { 
  EY_LIAISON_CONSULTANTS, 
  EY_PROJECT_COLUMNS, 
  EY_UNIQUE_PROJECTS,
  LiaisonConsultantItem,
  ProjectTowerColumn
} from "../data/eyTenderData";
import { 
  Shield, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  FileCheck2,
  Users
} from "lucide-react";

export const LiaisoningTracker: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<string>("ALL");
  const [onboardFilter, setOnboardFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const visibleColumns = useMemo(() => {
    if (selectedProject === "ALL") return EY_PROJECT_COLUMNS;
    return EY_PROJECT_COLUMNS.filter(c => c.project === selectedProject);
  }, [selectedProject]);

  const filteredConsultants = useMemo(() => {
    return EY_LIAISON_CONSULTANTS.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = item.consultantTitle.toLowerCase().includes(q) || item.scope.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (onboardFilter !== "ALL") {
        const hasMatch = visibleColumns.some(col => {
          const val = (item.statuses[`${col.project}__${col.tower}`] || "").toLowerCase();
          if (onboardFilter === "ONBOARD" && val.includes("onboard") && !val.includes("not onboard")) return true;
          if (onboardFilter === "NOT_ONBOARD" && val.includes("not onboard")) return true;
          return false;
        });
        if (!hasMatch) return false;
      }

      return true;
    });
  }, [searchQuery, onboardFilter, visibleColumns]);

  const renderBadge = (rawVal: string) => {
    const val = (rawVal || "NA").trim();
    const lower = val.toLowerCase();

    if (lower === "na" || lower === "-") {
      return <span className="text-[10px] text-muted-foreground/50 font-mono">—</span>;
    }
    if (lower.includes("not onboard")) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25">
          Not Onboard
        </span>
      );
    }
    if (lower.includes("onboard")) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
          {lower.includes("pending") ? "Compliance Pending" : "Onboard"}
        </span>
      );
    }
    if (lower.includes("fixed")) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/25">
          Fixed Partner
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-foreground">
        {val}
      </span>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Control Header */}
      <div className="p-4 rounded-2xl border border-border bg-surface shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center border border-purple-500/25">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Statutory Liaisoning & Approvals Matrix
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Municipal approvals, CFO Fire NOC, Tree Authority, Civil Aviation, RERA, and Environmental compliance onboarding
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-border bg-surface text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
            >
              <option value="ALL">🏢 All 11 Projects</option>
              {EY_UNIQUE_PROJECTS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <select
              value={onboardFilter}
              onChange={e => setOnboardFilter(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-border bg-surface text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="ONBOARD">✅ Onboard Only</option>
              <option value="NOT_ONBOARD">⚠️ Pending Onboarding</option>
            </select>

            <div className="relative w-48">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search NOC / Consultant..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-border shadow-2xs">
              <tr>
                <th className="p-3 sticky left-0 z-30 bg-slate-100 dark:bg-slate-900 border-r border-border min-w-[240px] font-bold text-foreground uppercase tracking-wider text-[11px]">
                  Statutory Consultant / Scope
                </th>
                {visibleColumns.map((col, idx) => (
                  <th
                    key={idx}
                    className="p-2 text-center font-bold text-foreground border-r border-border/50 text-[10px] uppercase tracking-wider bg-slate-50 dark:bg-slate-900/60 min-w-[120px]"
                  >
                    <div className="truncate font-black">{col.project}</div>
                    <div className="text-muted-foreground font-mono font-medium text-[9px]">
                      {col.tower}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-border/60">
              {filteredConsultants.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 sticky left-0 z-10 bg-surface border-r border-border">
                    <div className="font-bold text-foreground text-xs">
                      {item.consultantTitle}
                    </div>
                    {item.scope && item.scope !== item.consultantTitle && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Scope: {item.scope}
                      </div>
                    )}
                  </td>

                  {visibleColumns.map((col, colIdx) => {
                    const val = item.statuses[`${col.project}__${col.tower}`] || "NA";
                    return (
                      <td key={colIdx} className="p-2 border-r border-border/40 text-center">
                        {renderBadge(val)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
