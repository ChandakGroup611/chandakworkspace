"use client";

import React, { useState } from "react";
import { LearningModule, CrudOperationSpec } from "@/lib/data/learning-data";
import { 
  CheckCircle2, 
  Info, 
  Settings2, 
  ArrowRight, 
  ListChecks, 
  Database, 
  ShieldCheck, 
  PlusCircle, 
  Eye, 
  Edit3, 
  Trash2, 
  AlertTriangle,
  Key,
  Layers,
  Sparkles,
  Search,
  Share2
} from "lucide-react";
import { AppTableContainer, AppTable, AppTableHeader, AppTableBody, AppTableRow, AppTableHead, AppTableCell } from "@/components/ui/AppTable";
import { AppButton } from "@/components/ui/AppButton";

interface ModuleRendererProps {
  module: LearningModule;
}

export default function ModuleRenderer({ module }: ModuleRendererProps) {
  const [activeCrudTab, setActiveCrudTab] = useState<"CREATE" | "READ" | "UPDATE" | "DELETE">("CREATE");
  const [fieldSearchQuery, setFieldSearchQuery] = useState("");

  if (!module) return null;

  const activeCrud = module.crudOperations.find(c => c.operation === activeCrudTab) || module.crudOperations[0];

  const filteredFields = (module.fields || []).filter(f => {
    if (!fieldSearchQuery) return true;
    const q = fieldSearchQuery.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      f.dbColumn.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q) ||
      f.purpose.toLowerCase().includes(q) ||
      (f.foreignKeyRelation && f.foreignKeyRelation.toLowerCase().includes(q))
    );
  });

  const getCrudIcon = (op: string) => {
    switch (op) {
      case "CREATE": return PlusCircle;
      case "READ": return Eye;
      case "UPDATE": return Edit3;
      case "DELETE": return Trash2;
      default: return Database;
    }
  };

  const getCrudColor = (op: string) => {
    switch (op) {
      case "CREATE": return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "READ": return "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20";
      case "UPDATE": return "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "DELETE": return "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20";
      default: return "text-theme-btn-primary bg-theme-btn-primary/10 border-theme-btn-primary/20";
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-16">
      
      {/* 1. Header & Business Purpose Card */}
      <section className="bg-surface rounded-2xl p-6 md:p-8 border border-border shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-theme-btn-primary/10 text-theme-btn-primary shrink-0">
              <module.icon className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-theme-btn-primary/10 text-theme-btn-primary">
                  {module.code}
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-elevated text-muted-foreground uppercase">
                  {module.category}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1">
                {module.title}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {module.description}
              </p>
            </div>
          </div>
        </div>

        {/* Real-World Purpose & Ecosystem Inflow/Outflow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-elevated/60 border border-border md:col-span-3 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-theme-btn-primary">
              <Sparkles className="h-4 w-4" />
              <span>Real-World Business Purpose</span>
            </div>
            <p className="text-xs md:text-sm text-foreground leading-relaxed">
              {module.businessPurpose}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 uppercase">
              <Share2 className="h-3.5 w-3.5 rotate-180" />
              <span>Inflow Sources</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
              {module.inflowFromModules.map((inf, i) => (
                <li key={i}>{inf}</li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">
              <Share2 className="h-3.5 w-3.5" />
              <span>Outflow Destinations</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
              {module.outflowToModules.map((out, i) => (
                <li key={i}>{out}</li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400 uppercase">
              <Database className="h-3.5 w-3.5" />
              <span>PostgreSQL Tables</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {module.databaseTables.map((t, i) => (
                <span key={i} className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-surface border border-border text-foreground">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation & Prerequisites */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-elevated/40 border border-border flex items-start gap-3">
            <ArrowRight className="h-5 w-5 text-theme-btn-primary shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-foreground">UI Navigation Flow</div>
              <div className="text-xs font-mono font-semibold text-theme-btn-primary mt-0.5">
                {module.startInfo.navigation}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-elevated/40 border border-border flex items-start gap-3">
            <ListChecks className="h-5 w-5 text-success shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-foreground">Prerequisites & Permissions</div>
              <ul className="text-xs text-muted-foreground mt-0.5 list-disc pl-4 space-y-0.5">
                {module.startInfo.prerequisites.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive CRUD Operations Lifecycle Specs */}
      <section className="bg-surface rounded-2xl p-6 md:p-8 border border-border shadow-sm space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-theme-btn-primary">
            <Database className="h-4 w-4" />
            <span>Complete Lifecycle Operations</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground mt-1">
            CRUD Operations & Transaction Playbook
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Detailed breakdown of authorization rules, mutation payloads, auto-generated defaults, and referential safety cascades.
          </p>
        </div>

        {/* CRUD Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          {module.crudOperations.map((crud) => {
            const isSelected = crud.operation === activeCrudTab;
            const Icon = getCrudIcon(crud.operation);
            const colorCls = getCrudColor(crud.operation);

            return (
              <button
                key={crud.operation}
                onClick={() => setActiveCrudTab(crud.operation)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  isSelected
                    ? `${colorCls} shadow-sm ring-2 ring-theme-btn-primary/20`
                    : "bg-elevated hover:bg-elevated/80 border-border text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>[{crud.code}] {crud.operation}</span>
              </button>
            );
          })}
        </div>

        {/* Active CRUD Details */}
        {activeCrud && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${getCrudColor(activeCrud.operation)}`}>
                    [{activeCrud.code}]
                  </span>
                  {activeCrud.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activeCrud.overview}
                </p>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-lg bg-elevated border border-border text-muted-foreground hidden sm:inline-block">
                Path: {activeCrud.navigationPath}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              
              <div className="p-4 rounded-xl bg-elevated/50 border border-border space-y-2">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-theme-btn-primary" />
                  <span>Authorized Roles</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeCrud.whoCanPerform.map((role, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-theme-btn-primary/10 text-theme-btn-primary">
                      {role}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-elevated/50 border border-border space-y-2">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Settings2 className="h-3.5 w-3.5 text-theme-btn-primary" />
                  <span>Required Inputs / Payload</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeCrud.requiredInputs.map((input, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[11px] font-medium bg-surface border border-border text-foreground">
                      {input}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2 md:col-span-2">
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 uppercase">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>System Mutations & Database Execution</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                  {activeCrud.systemMutations.map((mut, i) => (
                    <li key={i}>{mut}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1.5 md:col-span-2">
                <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 uppercase">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Referential Safety & Cascade Rules</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {activeCrud.safetyAndCascadeRules}
                </p>
              </div>

            </div>
          </div>
        )}
      </section>

      {/* 3. Field-to-Field Data Dictionary */}
      <section className="bg-surface rounded-2xl p-6 md:p-8 border border-border shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-theme-btn-primary">
              <Layers className="h-4 w-4" />
              <span>Schema & Field Dictionary</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground mt-1">
              Field-to-Field Specifications
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comprehensive reference of UI labels, database columns, data types, validation rules, and real-world purposes.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search fields or columns..."
              value={fieldSearchQuery}
              onChange={(e) => setFieldSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-elevated border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/30"
            />
          </div>
        </div>

        <div className="rounded-xl overflow-hidden border border-border">
          <AppTableContainer>
            <AppTable className="w-full text-left text-xs">
              <AppTableHeader className="bg-elevated text-muted-foreground font-semibold uppercase text-[11px] border-b border-border">
                <AppTableRow>
                  <AppTableHead className="px-4 py-3">Field Label</AppTableHead>
                  <AppTableHead className="px-4 py-3">DB Column</AppTableHead>
                  <AppTableHead className="px-4 py-3">Data Type</AppTableHead>
                  <AppTableHead className="px-4 py-3">Requirement</AppTableHead>
                  <AppTableHead className="px-4 py-3">Description & Validations</AppTableHead>
                  <AppTableHead className="px-4 py-3">Business Purpose & FK</AppTableHead>
                </AppTableRow>
              </AppTableHeader>
              <AppTableBody className="divide-y divide-border">
                {filteredFields.map((field, idx) => (
                  <AppTableRow key={idx} className="hover:bg-elevated/60 transition-colors">
                    <AppTableCell className="px-4 py-3.5 font-bold text-foreground whitespace-nowrap">
                      {field.name}
                    </AppTableCell>
                    <AppTableCell className="px-4 py-3.5 font-mono text-[11px] text-theme-btn-primary">
                      {field.dbColumn}
                    </AppTableCell>
                    <AppTableCell className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-elevated text-muted-foreground">
                        {field.type}
                      </span>
                    </AppTableCell>
                    <AppTableCell className="px-4 py-3.5">
                      {field.isRequired ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                          Mandatory
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-muted-foreground">
                          Optional
                        </span>
                      )}
                    </AppTableCell>
                    <AppTableCell className="px-4 py-3.5 text-muted-foreground max-w-xs">
                      <div>{field.description}</div>
                      {field.validationRules && (
                        <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                          Rules: {field.validationRules}
                        </div>
                      )}
                    </AppTableCell>
                    <AppTableCell className="px-4 py-3.5 text-muted-foreground max-w-xs">
                      <div>{field.purpose}</div>
                      {field.foreignKeyRelation && (
                        <div className="text-[10px] font-mono text-sky-600 dark:text-sky-400 mt-0.5 font-semibold">
                          FK ➔ {field.foreignKeyRelation}
                        </div>
                      )}
                    </AppTableCell>
                  </AppTableRow>
                ))}
              </AppTableBody>
            </AppTable>
          </AppTableContainer>
        </div>
      </section>

      {/* 4. Practical Execution Steps */}
      <section className="bg-surface rounded-2xl p-6 md:p-8 border border-border shadow-sm space-y-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            End-to-End Operational Workflow
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Step-by-step walkthrough of how this module is used from initial setup to day-to-day operations.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {module.steps.map((step, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-elevated/40 border border-border flex items-start gap-4">
              <div className="h-7 w-7 rounded-full bg-theme-btn-primary/10 text-theme-btn-primary font-bold text-xs flex items-center justify-center shrink-0">
                {idx + 1}
              </div>
              <div className="space-y-1">
                <div className="text-xs md:text-sm font-bold text-foreground">
                  {step.title}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {step.instruction}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
