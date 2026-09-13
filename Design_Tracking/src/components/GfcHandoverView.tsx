"use client";

import React from "react";
import { GfcRelease } from "../types";
import { ShieldCheck, Download, Printer, Building2, UserCheck, Calendar } from "lucide-react";

interface GfcHandoverViewProps {
  releases: GfcRelease[];
  onRecordNewHandover?: () => void;
}

export const GfcHandoverView: React.FC<GfcHandoverViewProps> = ({
  releases
}) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              GFC Site Handover
            </h2>
            <p className="text-xs text-muted-foreground">
              Good For Construction drawings issued to site execution teams and civil contractors
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
        >
          <Printer className="h-3.5 w-3.5" />
          <span>Print Manifest</span>
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                <th className="p-3.5 whitespace-nowrap min-w-[110px]">GFC Release ID</th>
                <th className="p-3.5 whitespace-nowrap min-w-[240px]">Drawing Code & Title</th>
                <th className="p-3.5 text-center whitespace-nowrap min-w-[120px]">Certified Revision</th>
                <th className="p-3.5 whitespace-nowrap min-w-[150px]">Site Engineer</th>
                <th className="p-3.5 whitespace-nowrap min-w-[170px]">Civil Contractor Firm</th>
                <th className="p-3.5 whitespace-nowrap min-w-[120px]">Handover Date</th>
                <th className="p-3.5 text-center whitespace-nowrap min-w-[110px]">Physical Prints</th>
                <th className="p-3.5 text-right whitespace-nowrap min-w-[120px]">Certificate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {releases.map((rel) => (
                <tr key={rel.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-muted-foreground whitespace-nowrap">
                    #{rel.id}
                  </td>
                  <td className="p-3.5 min-w-[240px]">
                    <div className="font-mono font-bold text-foreground whitespace-nowrap">{rel.drawingCode}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{rel.drawingTitle}</div>
                  </td>
                  <td className="p-3.5 text-center whitespace-nowrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 whitespace-nowrap">
                      {rel.revisionNumber} GFC
                    </span>
                  </td>
                  <td className="p-3.5 font-medium text-foreground whitespace-nowrap">
                    {rel.siteEngineerName}
                  </td>
                  <td className="p-3.5 text-foreground font-semibold whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{rel.contractorFirm}</span>
                    </div>
                  </td>
                  <td className="p-3.5 font-mono text-muted-foreground whitespace-nowrap">
                    {rel.handoverDate}
                  </td>
                  <td className="p-3.5 text-center font-mono font-bold text-foreground whitespace-nowrap">
                    {rel.physicalCopiesIssued} Sets
                  </td>
                  <td className="p-3.5 text-right whitespace-nowrap">
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
