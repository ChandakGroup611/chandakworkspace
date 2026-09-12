"use client";

import React, { useState, useMemo } from "react";
import { DrawingItem, ConsultantPartner } from "../types";
import { 
  LineChart, 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Building2, 
  Star, 
  FileSpreadsheet, 
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Users
} from "lucide-react";

interface DesignReportsAnalyticsProps {
  drawings: DrawingItem[];
  consultants: ConsultantPartner[];
}

export const DesignReportsAnalytics: React.FC<DesignReportsAnalyticsProps> = ({
  drawings,
  consultants
}) => {
  const [timeRange, setTimeRange] = useState("ALL");

  // Summary Metrics
  const totalDrawings = drawings.length;
  const approvedGfc = drawings.filter(d => d.status === "Approved (GFC)" || d.status === "Site Handed Over").length;
  const underReview = drawings.filter(d => d.status === "Under Review").length;
  const revisionRequested = drawings.filter(d => d.status === "Revision Requested").length;

  const gfcApprovalRate = totalDrawings > 0 ? Math.round((approvedGfc / totalDrawings) * 100) : 0;

  // Breakdown by discipline
  const disciplineCounts = useMemo(() => {
    const map: Record<string, { total: number; gfc: number; pending: number }> = {};
    drawings.forEach(d => {
      if (!map[d.discipline]) map[d.discipline] = { total: 0, gfc: 0, pending: 0 };
      map[d.discipline].total += 1;
      if (d.status === "Approved (GFC)" || d.status === "Site Handed Over") {
        map[d.discipline].gfc += 1;
      } else {
        map[d.discipline].pending += 1;
      }
    });
    return map;
  }, [drawings]);

  // Breakdown by project
  const projectBreakdown = useMemo(() => {
    const map: Record<string, { total: number; gfc: number; review: number }> = {};
    drawings.forEach(d => {
      if (!map[d.project]) map[d.project] = { total: 0, gfc: 0, review: 0 };
      map[d.project].total += 1;
      if (d.status === "Approved (GFC)" || d.status === "Site Handed Over") {
        map[d.project].gfc += 1;
      } else {
        map[d.project].review += 1;
      }
    });
    return map;
  }, [drawings]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner Strip */}
      <div className="p-5 rounded-2xl border border-border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/25 shrink-0">
            <LineChart className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              Design & Engineering Velocity Scoreboard
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Portfolio drawing issuance speed, consultant turnaround metrics, and GFC release compliance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {["ALL", "LAST_30D", "LAST_90D"].map(range => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                timeRange === range
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-surface border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {range === "ALL" ? "All Time" : range === "LAST_30D" ? "Past 30 Days" : "Past 90 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span>Total Drawing Sheets</span>
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-foreground">{totalDrawings}</h3>
            <span className="text-[11px] text-muted-foreground">Across all active developments</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span>GFC Release Rate</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-500 font-mono">{gfcApprovalRate}%</h3>
            <span className="text-[11px] text-muted-foreground">{approvedGfc} of {totalDrawings} certified</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span>Review Queue Active</span>
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-amber-500">{underReview}</h3>
            <span className="text-[11px] text-muted-foreground">Average TAT: 3.2 days</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span>Empanelled Partners</span>
            <div className="h-7 w-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-purple-500">{consultants.length}</h3>
            <span className="text-[11px] text-muted-foreground">Specialist firms engaged</span>
          </div>
        </div>
      </div>

      {/* 2-Column Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Discipline Delivery Matrix */}
        <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h4 className="text-sm font-bold text-foreground">Discipline-wise Delivery Progress</h4>
              <p className="text-xs text-muted-foreground">Distribution of issued drawings per engineering domain</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-500">Live Metric</span>
          </div>

          <div className="space-y-3.5">
            {Object.entries(disciplineCounts).map(([disc, stats]) => {
              const pct = Math.round((stats.gfc / stats.total) * 100) || 0;
              return (
                <div key={disc} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-foreground">{disc}</span>
                    <span className="text-muted-foreground font-mono">{stats.gfc} / {stats.total} GFC ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500" 
                      style={{ width: `${pct}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Project-wise Status Breakdown */}
        <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h4 className="text-sm font-bold text-foreground">Project Readiness Breakdown</h4>
              <p className="text-xs text-muted-foreground">Drawing release status for current development projects</p>
            </div>
            <Building2 className="h-4 w-4 text-blue-500" />
          </div>

          <div className="space-y-3">
            {Object.entries(projectBreakdown).map(([proj, stats]) => {
              const gfcPct = Math.round((stats.gfc / stats.total) * 100) || 0;
              return (
                <div key={proj} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-border/60 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-foreground">{proj}</h5>
                    <span className="text-[11px] text-muted-foreground">{stats.total} Total Drawing Sheets</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">{gfcPct}%</span>
                    <span className="block text-[10px] text-muted-foreground font-medium">{stats.gfc} GFC Certified</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Consultant Scoreboard Table */}
      <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h4 className="text-sm font-bold text-foreground">Consultant Performance & TAT Scoreboard</h4>
            <p className="text-xs text-muted-foreground">Turnaround time, quality ratings, and sheet volume per engineering firm</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                <th className="p-3">Consultant Firm</th>
                <th className="p-3">Category</th>
                <th className="p-3">Lead Contact</th>
                <th className="p-3 text-center">Sheets Submitted</th>
                <th className="p-3 text-center">Average TAT</th>
                <th className="p-3 text-center">Quality Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {consultants.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-3 font-bold text-foreground">{c.name}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                      {c.category}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{c.leadContact}</td>
                  <td className="p-3 text-center font-mono font-bold text-foreground">{c.totalDrawingsSubmitted}</td>
                  <td className="p-3 text-center font-mono text-foreground">{c.averageTatDays} days</td>
                  <td className="p-3 text-center">
                    <span className="inline-flex items-center gap-1 font-bold text-amber-500 text-xs">
                      <Star className="h-3.5 w-3.5 fill-amber-500" />
                      <span>{c.rating}</span>
                    </span>
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
