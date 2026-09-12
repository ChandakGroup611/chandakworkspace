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
      <div className="p-4 rounded-2xl border border-border bg-slate-50/60 dark:bg-slate-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Good For Construction (GFC) Site Handover Log</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit register of certified GFC blueprint sheets issued to civil contractors and site project managers
          </p>
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
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              <th className="p-3.5">GFC Release ID</th>
              <th className="p-3.5">Drawing Code & Title</th>
              <th className="p-3.5 text-center">Certified Revision</th>
              <th className="p-3.5">Site Engineer</th>
              <th className="p-3.5">Civil Contractor Firm</th>
              <th className="p-3.5">Handover Date</th>
              <th className="p-3.5 text-center">Physical Prints</th>
              <th className="p-3.5 text-right">Certificate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {releases.map((rel) => (
              <tr key={rel.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="p-3.5 font-mono font-bold text-muted-foreground">
                  #{rel.id}
                </td>
                <td className="p-3.5">
                  <div className="font-mono font-bold text-foreground">{rel.drawingCode}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 max-w-sm truncate">{rel.drawingTitle}</div>
                </td>
                <td className="p-3.5 text-center">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                    {rel.revisionNumber} GFC
                  </span>
                </td>
                <td className="p-3.5 font-medium text-foreground">
                  {rel.siteEngineerName}
                </td>
                <td className="p-3.5 text-foreground font-semibold flex items-center gap-1 mt-1">
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                  <span>{rel.contractorFirm}</span>
                </td>
                <td className="p-3.5 font-mono text-muted-foreground">
                  {rel.handoverDate}
                </td>
                <td className="p-3.5 text-center font-mono font-bold text-foreground">
                  {rel.physicalCopiesIssued} Sets
                </td>
                <td className="p-3.5 text-right">
                  <button
                    type="button"
                    onClick={() => alert(`Downloading Verified GFC Digital Certificate for ${rel.drawingCode}`)}
                    className="h-7 px-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold text-xs inline-flex items-center gap-1 hover:bg-emerald-500/20 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>GFC Pass</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
