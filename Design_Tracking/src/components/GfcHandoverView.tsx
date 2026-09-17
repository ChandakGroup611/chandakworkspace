"use client";

import React, { useState, useMemo } from "react";
import { GfcRelease } from "../types";
import { 
  ShieldCheck, 
  Download, 
  Printer, 
  Building2, 
  UserCheck, 
  Calendar, 
  Search, 
  X,
  FileSpreadsheet,
  CheckCircle2,
  Layers
} from "lucide-react";
import { DesignMultiSelectDropdown } from "./DesignMultiSelectDropdown";

interface GfcHandoverViewProps {
  releases: GfcRelease[];
  onRecordNewHandover?: () => void;
}

export const GfcHandoverView: React.FC<GfcHandoverViewProps> = ({
  releases
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContractors, setSelectedContractors] = useState<string[]>([]);
  const [selectedRevisions, setSelectedRevisions] = useState<string[]>([]);

  const contractorOptions = useMemo(() => {
    const list = Array.from(new Set(releases.map(r => r.contractorFirm).filter(Boolean)));
    return list.map(c => ({
      value: c,
      label: c,
      count: releases.filter(r => r.contractorFirm === c).length
    }));
  }, [releases]);

  const revisionOptions = useMemo(() => {
    const list = Array.from(new Set(releases.map(r => r.revisionNumber).filter(Boolean)));
    return list.map(rev => ({
      value: rev,
      label: `${rev} GFC Release`,
      count: releases.filter(r => r.revisionNumber === rev).length
    }));
  }, [releases]);

  const filteredReleases = useMemo(() => {
    return releases.filter(r => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        r.drawingCode.toLowerCase().includes(q) ||
        r.drawingTitle.toLowerCase().includes(q) ||
        r.contractorFirm.toLowerCase().includes(q) ||
        r.siteEngineerName.toLowerCase().includes(q);

      const matchesContractor = selectedContractors.length === 0 || selectedContractors.includes(r.contractorFirm);
      const matchesRevision = selectedRevisions.length === 0 || selectedRevisions.includes(r.revisionNumber);

      return matchesSearch && matchesContractor && matchesRevision;
    });
  }, [releases, searchQuery, selectedContractors, selectedRevisions]);

  const totalCopies = useMemo(() => {
    return filteredReleases.reduce((acc, curr) => acc + (curr.physicalCopiesIssued || 0), 0);
  }, [filteredReleases]);

  const handleExportCsv = () => {
    const headers = ["GFC Release ID", "Drawing Code", "Title", "Certified Revision", "Site Engineer", "Contractor Firm", "Handover Date", "Physical Sets"];
    const rows = filteredReleases.map(r => [
      `"${r.id}"`,
      `"${r.drawingCode}"`,
      `"${r.drawingTitle.replace(/"/g, '""')}"`,
      `"${r.revisionNumber}"`,
      `"${r.siteEngineerName.replace(/"/g, '""')}"`,
      `"${r.contractorFirm.replace(/"/g, '""')}"`,
      `"${r.handoverDate}"`,
      `"${r.physicalCopiesIssued}"`
    ].join(","));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GFC_Handover_Manifest_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              GFC Site Handover Manifest
            </h2>
            <p className="text-xs text-muted-foreground">
              Good For Construction drawings issued to site execution teams and civil contractors
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="h-8 px-3 rounded-xl border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="h-8 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Manifest</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-[11px] font-bold text-muted-foreground uppercase">Total GFC Dispatches</div>
          <div className="text-xl font-black text-foreground mt-1">{releases.length}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Approved site releases</div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Physical Sets Issued</div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{totalCopies}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Printed drawing sets</div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase">Contractor Firms</div>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">{contractorOptions.length}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Civil & MEP contractors</div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase">Filtered Records</div>
          <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">{filteredReleases.length}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Active matching criteria</div>
        </div>
      </div>

      {/* Unified Multi-Select Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border space-y-3 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search drawing, contractor, engineer..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <DesignMultiSelectDropdown
              label="Contractor"
              options={contractorOptions}
              selectedValues={selectedContractors}
              onChange={setSelectedContractors}
              colorTheme="blue"
              placeholder="All Contractors"
            />

            <DesignMultiSelectDropdown
              label="Revision"
              options={revisionOptions}
              selectedValues={selectedRevisions}
              onChange={setSelectedRevisions}
              colorTheme="emerald"
              placeholder="All Revisions"
            />

            {(selectedContractors.length > 0 || selectedRevisions.length > 0 || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedContractors([]);
                  setSelectedRevisions([]);
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
        {(selectedContractors.length > 0 || selectedRevisions.length > 0) && (
          <div className="pt-2 border-t border-border flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-muted-foreground mr-1">Active:</span>

            {selectedContractors.map(c => (
              <span
                key={c}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 text-[11px] font-medium"
              >
                <span>Contractor: {c}</span>
                <button
                  type="button"
                  onClick={() => setSelectedContractors(selectedContractors.filter(x => x !== c))}
                  className="hover:text-blue-900 dark:hover:text-blue-100"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}

            {selectedRevisions.map(rev => (
              <span
                key={rev}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[11px] font-medium"
              >
                <span>Revision: {rev}</span>
                <button
                  type="button"
                  onClick={() => setSelectedRevisions(selectedRevisions.filter(x => x !== rev))}
                  className="hover:text-emerald-900 dark:hover:text-emerald-100"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}

            <button
              type="button"
              onClick={() => {
                setSelectedContractors([]);
                setSelectedRevisions([]);
              }}
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground ml-1 underline cursor-pointer"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                <th className="p-3.5 whitespace-nowrap min-w-[120px]">GFC Release ID</th>
                <th className="p-3.5 whitespace-nowrap min-w-[280px]">Drawing Code & Title</th>
                <th className="p-3.5 text-center whitespace-nowrap min-w-[130px]">Certified Revision</th>
                <th className="p-3.5 whitespace-nowrap min-w-[160px]">Site Engineer</th>
                <th className="p-3.5 whitespace-nowrap min-w-[190px]">Civil Contractor Firm</th>
                <th className="p-3.5 whitespace-nowrap min-w-[130px]">Handover Date</th>
                <th className="p-3.5 text-center whitespace-nowrap min-w-[120px]">Physical Prints</th>
                <th className="p-3.5 text-right whitespace-nowrap min-w-[140px]">Certificate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredReleases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground text-xs">
                    No GFC handover records match current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredReleases.map((rel) => (
                  <tr key={rel.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-muted-foreground whitespace-nowrap min-w-[120px]">
                      #{rel.id}
                    </td>
                    <td className="p-3.5 min-w-[280px]">
                      <div className="font-mono font-bold text-foreground whitespace-nowrap select-all">{rel.drawingCode}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{rel.drawingTitle}</div>
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap min-w-[130px]">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 whitespace-nowrap">
                        {rel.revisionNumber} GFC
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-foreground whitespace-nowrap min-w-[160px]">
                      {rel.siteEngineerName}
                    </td>
                    <td className="p-3.5 text-foreground font-semibold whitespace-nowrap min-w-[190px]">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{rel.contractorFirm}</span>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-muted-foreground whitespace-nowrap min-w-[130px]">
                      {rel.handoverDate}
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-foreground whitespace-nowrap min-w-[120px]">
                      {rel.physicalCopiesIssued} Sets
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap min-w-[140px]">
                      <button
                        type="button"
                        onClick={() => alert(`Downloading Verified GFC Digital Certificate for ${rel.drawingCode}`)}
                        className="h-7 px-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold text-xs inline-flex items-center gap-1 hover:bg-emerald-500/20 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Download className="h-3.5 w-3.5 shrink-0" />
                        <span>GFC Pass</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
