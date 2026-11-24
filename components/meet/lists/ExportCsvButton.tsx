"use client";

import React from "react";
import { Download } from "lucide-react";

/** Downloads the rows on screen as a CSV file (opens in Excel). */
export default function ExportCsvButton({ filename, header, rows }: { filename: string; header: string[]; rows: (string | number | null)[][] }) {
  const download = () => {
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = "﻿" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <button type="button" onClick={download} disabled={!rows.length} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[13.5px] font-semibold text-foreground hover:bg-surface-hover disabled:opacity-50">
      <Download className="h-4 w-4" aria-hidden /> Export (Excel)
    </button>
  );
}
