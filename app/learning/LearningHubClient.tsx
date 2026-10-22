"use client";

import React, { useState } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { learningModules } from "@/lib/data/learning-data";
import ModuleRenderer from "@/components/learning/ModuleRenderer";
import ModuleDependencyGraph from "@/components/learning/ModuleDependencyGraph";
import { useTheme } from "@/components/theme/ThemeProvider";
import { 
  GraduationCap, 
  ChevronDown, 
  Workflow, 
  Layers, 
  Search, 
  BookOpen, 
  Compass, 
  Ticket, 
  FileCheck2, 
  Car, 
  ShieldCheck, 
  UserCheck, 
  ShieldAlert, 
  FolderKanban, 
  Database,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { AppTableContainer, AppTable, AppTableHeader, AppTableBody, AppTableRow, AppTableHead, AppTableCell } from "@/components/ui/AppTable";

export default function LearningHubClient() {
  const { theme } = useTheme();
  
  const [activeTopTab, setActiveTopTab] = useState<"DIAGRAM" | "MODULE_SPECS" | "GLOBAL_FIELDS">("DIAGRAM");
  const [selectedModuleId, setSelectedModuleId] = useState<string>("design_tracking");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [globalFieldQuery, setGlobalFieldQuery] = useState("");

  const selectedModule = learningModules.find(m => m.id === selectedModuleId) || learningModules[0];

  // Aggregated fields across all modules for global search
  const allGlobalFields = learningModules.flatMap(m => 
    (m.fields || []).map(f => ({
      ...f,
      moduleId: m.id,
      moduleTitle: m.title,
      moduleCode: m.code
    }))
  );

  const filteredGlobalFields = allGlobalFields.filter(f => {
    if (!globalFieldQuery) return true;
    const q = globalFieldQuery.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      f.dbColumn.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q) ||
      f.purpose.toLowerCase().includes(q) ||
      f.moduleTitle.toLowerCase().includes(q)
    );
  });

  const handleSelectModuleFromGraph = (moduleId: string) => {
    setSelectedModuleId(moduleId);
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] p-4 md:p-8 relative flex flex-col items-center max-w-7xl mx-auto space-y-8">
      
      {/* Top Hero Banner */}
      <div className="w-full text-center space-y-4 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-accent-soft text-primary border border-border-active mb-1">
          <GraduationCap className="h-4 w-4" />
          <span>Enterprise platform learning hub & knowledge center</span>
        </div>
        
        <h1 className="text-2xl md:text-4xl font-semibold tracking-tight text-foreground">
          System architecture, module connections & CRUD operations
        </h1>
        <p className="text-sm md:text-base max-w-3xl mx-auto text-muted-foreground leading-relaxed">
          Master how modules connect, understand downstream data flows and ripple impacts, and explore complete field-to-field specifications for every entity in the platform.
        </p>

        {/* Primary Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
          <button type="button"
            onClick={() => setActiveTopTab("DIAGRAM")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all border ${
              activeTopTab === "DIAGRAM"
                ? "bg-primary text-white border-primary shadow-lg shadow-theme-btn-primary/20"
                : "bg-surface hover:bg-elevated border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Workflow className="h-4 w-4" />
            <span>1. Architecture & module diagram</span>
          </button>

          <button type="button"
            onClick={() => setActiveTopTab("MODULE_SPECS")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all border ${
              activeTopTab === "MODULE_SPECS"
                ? "bg-primary text-white border-primary shadow-lg shadow-theme-btn-primary/20"
                : "bg-surface hover:bg-elevated border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>2. Module deep-dive & CRUD playbooks</span>
          </button>

          <button type="button"
            onClick={() => setActiveTopTab("GLOBAL_FIELDS")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all border ${
              activeTopTab === "GLOBAL_FIELDS"
                ? "bg-primary text-white border-primary shadow-lg shadow-theme-btn-primary/20"
                : "bg-surface hover:bg-elevated border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Database className="h-4 w-4" />
            <span>3. Global field & schema index</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="w-full">
        
        {/* TAB 1: ARCHITECTURE & MODULE DIAGRAM */}
        {activeTopTab === "DIAGRAM" && (
          <ModuleDependencyGraph
            onSelectModule={(modId) => {
              setSelectedModuleId(modId);
              setActiveTopTab("MODULE_SPECS");
            }}
          />
        )}

        {/* TAB 2: MODULE DEEP-DIVE & CRUD PLAYBOOKS */}
        {activeTopTab === "MODULE_SPECS" && (
          <div className="w-full space-y-8 animate-in fade-in duration-300">
            
            {/* Module Picker Bar */}
            <div className="bg-surface rounded-lg p-4 border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Select Module:</span>
                <span className="font-semibold text-sm text-foreground">{selectedModule.title}</span>
              </div>

              {/* Module Dropdown Selector */}
              <div className="relative w-full md:w-80">
                <button type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-border bg-elevated text-left text-xs font-semibold text-foreground hover:border-primary transition-all"
                >
                  <div className="flex items-center gap-2 truncate">
                    {React.createElement(selectedModule.icon, { className: "h-4 w-4 text-primary shrink-0" })}
                    <span className="truncate">{selectedModule.title}</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 left-0 top-full mt-2 p-2 rounded-lg border border-border bg-surface shadow-lg z-30 space-y-1">
                    {learningModules.map((m) => {
                      const Icon = m.icon;
                      const isCurr = m.id === selectedModuleId;
                      return (
                        <button type="button"
                          key={m.id}
                          onClick={() => {
                            setSelectedModuleId(m.id);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                            isCurr
                              ? "bg-accent-soft text-primary font-semibold"
                              : "hover:bg-elevated text-foreground"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <div className="truncate">
                            <div>{m.title}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{m.code}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Render Selected Module Detailed Specs */}
            <ModuleRenderer module={selectedModule} />
          </div>
        )}

        {/* TAB 3: GLOBAL FIELD & SCHEMA INDEX */}
        {activeTopTab === "GLOBAL_FIELDS" && (
          <div className="w-full space-y-6 animate-in fade-in duration-300">
            <div className="bg-surface rounded-lg p-6 border border-border shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-foreground">
                    Universal field & database schema index
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Search and cross-reference all {allGlobalFields.length} documented fields across all enterprise modules.
                  </p>
                </div>

                <div className="relative w-full sm:w-80">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search across all fields, tables, or modules…"
                    value={globalFieldQuery}
                    onChange={(e) => setGlobalFieldQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-elevated border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="rounded-lg overflow-hidden border border-border">
                <AppTableContainer>
                  <AppTable className="w-full text-left text-xs">
                    <AppTableHeader className="bg-elevated text-muted-foreground font-semibold text-[11px] border-b border-border">
                      <AppTableRow>
                        <AppTableHead className="px-4 py-3">Module</AppTableHead>
                        <AppTableHead className="px-4 py-3">Field label</AppTableHead>
                        <AppTableHead className="px-4 py-3">DB column</AppTableHead>
                        <AppTableHead className="px-4 py-3">Type</AppTableHead>
                        <AppTableHead className="px-4 py-3">Requirement</AppTableHead>
                        <AppTableHead className="px-4 py-3">Description</AppTableHead>
                        <AppTableHead className="px-4 py-3">Business purpose & FK</AppTableHead>
                      </AppTableRow>
                    </AppTableHeader>
                    <AppTableBody className="divide-y divide-border">
                      {filteredGlobalFields.map((field, idx) => (
                        <AppTableRow key={idx} className="hover:bg-elevated/60 transition-colors">
                          <AppTableCell className="px-4 py-3.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-accent-soft text-primary">
                              {field.moduleCode}
                            </span>
                          </AppTableCell>
                          <AppTableCell className="px-4 py-3.5 font-semibold text-foreground whitespace-nowrap">
                            {field.name}
                          </AppTableCell>
                          <AppTableCell className="px-4 py-3.5 font-mono text-[11px] text-primary">
                            {field.dbColumn}
                          </AppTableCell>
                          <AppTableCell className="px-4 py-3.5">
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-elevated text-muted-foreground">
                              {field.type}
                            </span>
                          </AppTableCell>
                          <AppTableCell className="px-4 py-3.5">
                            {field.isRequired ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-danger-soft text-danger-text">
                                Mandatory
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sunken text-muted-foreground">
                                Optional
                              </span>
                            )}
                          </AppTableCell>
                          <AppTableCell className="px-4 py-3.5 text-muted-foreground max-w-xs">
                            {field.description}
                          </AppTableCell>
                          <AppTableCell className="px-4 py-3.5 text-muted-foreground max-w-xs">
                            <div>{field.purpose}</div>
                            {field.foreignKeyRelation && (
                              <div className="text-[11px] font-mono text-info-text mt-0.5 font-semibold">
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
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
