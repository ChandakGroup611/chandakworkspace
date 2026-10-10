"use client";

import React, { useState } from "react";
import { 
  Workflow, 
  ArrowRight, 
  GitFork, 
  Layers, 
  AlertCircle, 
  ShieldCheck, 
  Database, 
  Zap, 
  Sparkles,
  Info,
  CheckCircle2,
  Share2,
  Compass,
  Ticket,
  FileCheck2,
  Car,
  UserCheck,
  ShieldAlert,
  FolderKanban,
  Search
} from "lucide-react";
import { ecosystemDependencies, learningModules, ModuleDependency } from "@/lib/data/learning-data";
import { AppButton } from "@/components/ui/AppButton";
import { AppTableContainer, AppTable, AppTableHeader, AppTableBody, AppTableRow, AppTableHead, AppTableCell } from "@/components/ui/AppTable";

interface ModuleDependencyGraphProps {
  onSelectModule?: (moduleId: string) => void;
}

export default function ModuleDependencyGraph({ onSelectModule }: ModuleDependencyGraphProps) {
  const [selectedModuleId, setSelectedModuleId] = useState<string>("design_tracking");
  const [filterQuery, setFilterQuery] = useState("");

  const activeModule = learningModules.find(m => m.id === selectedModuleId) || learningModules[0];

  // Inflows: Dependencies where current module is target
  const inflows = ecosystemDependencies.filter(d => d.targetModuleId === activeModule.id);
  // Outflows: Dependencies where current module is source
  const outflows = ecosystemDependencies.filter(d => d.sourceModuleId === activeModule.id);

  // Filtered list for the comprehensive matrix table
  const filteredDependencies = ecosystemDependencies.filter(d => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      d.sourceModuleName.toLowerCase().includes(q) ||
      d.targetModuleName.toLowerCase().includes(q) ||
      d.dataTransferred.toLowerCase().includes(q) ||
      d.impactOnSourceChange.toLowerCase().includes(q) ||
      d.impactOnTargetChange.toLowerCase().includes(q)
    );
  });

  const getModuleIcon = (id: string) => {
    switch (id) {
      case "design_tracking": return Compass;
      case "task_workflow": return Ticket;
      case "requirements_module": return FileCheck2;
      case "vehicle_desk": return Car;
      case "amc_contracts": return ShieldCheck;
      case "iam_rbac": return UserCheck;
      case "sla_monitoring": return ShieldAlert;
      case "workspaces_masters": return FolderKanban;
      default: return Layers;
    }
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Interactive Architecture Map Header */}
      <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-theme-btn-primary font-bold text-xs uppercase tracking-wider">
              <Workflow className="h-4 w-4" />
              <span>Enterprise Ecosystem Architecture</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground mt-1">
              Cross-Module Connections & Ripple Impact Diagram
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
              Click on any module below to inspect its data inflow, downstream triggers, foreign key dependencies, and system-wide ripple impacts.
            </p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground font-semibold">Active Node:</span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-theme-btn-primary/10 text-theme-btn-primary border border-theme-btn-primary/20 flex items-center gap-1.5">
              {React.createElement(getModuleIcon(activeModule.id), { className: "h-3.5 w-3.5" })}
              {activeModule.title}
            </span>
          </div>
        </div>

        {/* Visual Module Nodes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {learningModules.map((mod) => {
            const Icon = mod.icon;
            const isSelected = mod.id === activeModule.id;
            const isInflow = inflows.some(i => i.sourceModuleId === mod.id);
            const isOutflow = outflows.some(o => o.targetModuleId === mod.id);

            return (
              <button
                key={mod.id}
                onClick={() => {
                  setSelectedModuleId(mod.id);
                  if (onSelectModule) onSelectModule(mod.id);
                }}
                className={`flex flex-col text-left p-4 rounded-xl border transition-all relative overflow-hidden group ${
                  isSelected
                    ? "bg-theme-btn-primary/10 border-theme-btn-primary shadow-md ring-2 ring-theme-btn-primary/20"
                    : isInflow
                    ? "bg-sky-500/5 border-sky-500/30 hover:border-sky-500/60"
                    : isOutflow
                    ? "bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/60"
                    : "bg-surface hover:bg-elevated border-border"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className={`p-2 rounded-lg ${
                    isSelected 
                      ? "bg-theme-btn-primary text-white" 
                      : "bg-elevated text-muted-foreground group-hover:text-foreground"
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {isSelected && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-theme-btn-primary text-white">
                      Active
                    </span>
                  )}
                  {!isSelected && isInflow && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-600 dark:text-sky-400">
                      Feeds Data ➔
                    </span>
                  )}
                  {!isSelected && isOutflow && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      ➔ Receives
                    </span>
                  )}
                </div>

                <div className="font-bold text-xs text-foreground line-clamp-1 group-hover:text-theme-btn-primary transition-colors">
                  {mod.title}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 font-mono">
                  {mod.code}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Selected Module Deep-Dive Connectivity Card */}
      <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-theme-btn-primary/10 text-theme-btn-primary">
              {React.createElement(getModuleIcon(activeModule.id), { className: "h-6 w-6" })}
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {activeModule.title} — Inter-Module Relationship Analysis
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeModule.businessPurpose}
              </p>
            </div>
          </div>

          <AppButton
            variant="outline"
            size="sm"
            onClick={() => onSelectModule && onSelectModule(activeModule.id)}
            rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
          >
            Open CRUD Specs
          </AppButton>
        </div>

        {/* Inflow vs Outflow Side-by-Side Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          
          {/* INFLOW: Who feeds data into this module */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
              <Share2 className="h-4 w-4 rotate-180" />
              <span>Data Inflows (Upstream Dependencies)</span>
            </div>

            {inflows.length > 0 ? (
              <div className="space-y-3">
                {inflows.map((inf, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-sky-500"></span>
                        {inf.sourceModuleName}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-700 dark:text-sky-300 font-semibold">
                        {inf.relationshipType}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <strong className="text-foreground font-medium">Data Received: </strong>
                      {inf.dataTransferred}
                    </p>
                    <div className="p-2.5 rounded-lg bg-surface border border-sky-500/15 text-[11px] text-muted-foreground">
                      <strong className="text-sky-600 dark:text-sky-400 font-semibold">Impact on Change: </strong>
                      {inf.impactOnSourceChange}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-elevated/50 border border-border text-center text-xs text-muted-foreground">
                This is a root foundational module with zero upstream data dependencies.
              </div>
            )}
          </div>

          {/* OUTFLOW: Who receives data from this module */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <Share2 className="h-4 w-4" />
              <span>Data Outflows (Downstream Triggers & Impacts)</span>
            </div>

            {outflows.length > 0 ? (
              <div className="space-y-3">
                {outflows.map((out, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        {out.targetModuleName}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold">
                        {out.relationshipType}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <strong className="text-foreground font-medium">Data Emitted: </strong>
                      {out.dataTransferred}
                    </p>
                    <div className="p-2.5 rounded-lg bg-surface border border-emerald-500/15 text-[11px] text-muted-foreground">
                      <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">Downstream Action: </strong>
                      {out.impactOnTargetChange}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-elevated/50 border border-border text-center text-xs text-muted-foreground">
                This module operates as a terminal execution or analytics receiver.
              </div>
            )}
          </div>

        </div>

        {/* Global Ripple Impact Alert */}
        <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-xs text-muted-foreground">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-amber-700 dark:text-amber-300">
              System-Wide Ripple Impact Summary
            </div>
            <p className="mt-0.5 leading-relaxed">
              {activeModule.rippleImpactSummary}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Global Ecosystem Dependency Matrix Table */}
      <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              Master Inter-Module Dependency Matrix
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Complete reference ledger of all architectural links, data pipelines, and trigger cascades across the platform.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search dependencies, data, or impact..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-elevated border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/30"
            />
          </div>
        </div>

        <div className="rounded-xl overflow-hidden border border-border">
          <AppTableContainer>
            <AppTable className="w-full text-left text-xs">
              <AppTableHeader className="bg-elevated text-muted-foreground font-semibold uppercase text-[11px] border-b border-border">
                <AppTableRow>
                  <AppTableHead className="px-4 py-3">Source Module (From)</AppTableHead>
                  <AppTableHead className="px-4 py-3">Relationship Type</AppTableHead>
                  <AppTableHead className="px-4 py-3">Target Module (To)</AppTableHead>
                  <AppTableHead className="px-4 py-3">Data Exchanged</AppTableHead>
                  <AppTableHead className="px-4 py-3">Ripple Impact on Mutation</AppTableHead>
                </AppTableRow>
              </AppTableHeader>
              <AppTableBody className="divide-y divide-border">
                {filteredDependencies.map((dep, idx) => (
                  <AppTableRow key={idx} className="hover:bg-elevated/60 transition-colors">
                    <AppTableCell className="px-4 py-3.5 font-bold text-foreground whitespace-nowrap">
                      {dep.sourceModuleName}
                    </AppTableCell>
                    <AppTableCell className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-theme-btn-primary/10 text-theme-btn-primary">
                        {dep.relationshipType}
                      </span>
                    </AppTableCell>
                    <AppTableCell className="px-4 py-3.5 font-bold text-foreground whitespace-nowrap">
                      {dep.targetModuleName}
                    </AppTableCell>
                    <AppTableCell className="px-4 py-3.5 text-muted-foreground max-w-xs">
                      {dep.dataTransferred}
                    </AppTableCell>
                    <AppTableCell className="px-4 py-3.5 text-muted-foreground max-w-md">
                      {dep.impactOnSourceChange}
                    </AppTableCell>
                  </AppTableRow>
                ))}
              </AppTableBody>
            </AppTable>
          </AppTableContainer>
        </div>
      </div>

    </div>
  );
}
