"use client";

import React, { useState } from "react";
import AMCReportsClient from "@/components/amc/AMCReportsClient";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { FileBarChart, Clock } from "lucide-react";

export function AMCReportsHistoryTab() {
  return (
    <div className="space-y-4">
      {/* Header Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-border/50 bg-elevated p-2 text-theme-icon">
            <FileBarChart className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">AMC & Subscription Reports Center</h2>
            <p className="text-xs text-muted">
              Analyze contracts register, invoices, renewals, and license allocations with customizable columns and Excel / PDF exports.
            </p>
          </div>
        </div>
      </div>

      {/* Embedded Reports Client */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
        <AMCReportsClient />
      </div>
    </div>
  );
}
