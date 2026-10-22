"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Compass, 
  Workflow, 
  Layers, 
  BookOpen, 
  CheckCircle2, 
  ArrowRight, 
  Database, 
  ShieldCheck, 
  FileText, 
  Clock, 
  Send, 
  HelpCircle, 
  FolderTree, 
  AlertTriangle, 
  Users, 
  Settings2, 
  PlusCircle, 
  Search, 
  Sparkles, 
  Key, 
  ChevronRight, 
  ExternalLink,
  GitFork,
  Check,
  Building2
} from "lucide-react";
import { learningModules, ecosystemDependencies } from "@/lib/data/learning-data";
import ModuleRenderer from "@/components/learning/ModuleRenderer";
import ModuleDependencyGraph from "@/components/learning/ModuleDependencyGraph";

interface DesignLearningGuideProps {
  onNavigateTab?: (tabRoute: string) => void;
}

export default function DesignLearningGuide({ onNavigateTab }: DesignLearningGuideProps) {
  const [activeGuideView, setActiveGuideView] = useState<"FLOWCHART" | "CRUD_FIELDS" | "ARCHITECTURE">("FLOWCHART");
  const [selectedPhase, setSelectedPhase] = useState<number>(1);

  const designModule = learningModules.find(m => m.id === "design_tracking") || learningModules[0];

  const lifecyclePhases = [
    {
      phaseNumber: 1,
      name: "Master Setup & Hierarchy",
      badge: "Prerequisite Phase",
      icon: Settings2,
      color: "text-info-text",
      bgColor: "bg-info-soft",
      borderColor: "border-info-border",
      route: "/design/masters",
      summary: "Foundation setup: Company, Projects, Towers/Wings, Disciplines, Sub-Packages, Consultants, and Authorities.",
      whyFirst: "Drawings and matrices cannot exist without being anchored to a specific Project, Tower, Discipline, and Consultant firm. Defining masters first guarantees referential integrity.",
      steps: [
        {
          order: "1.1",
          entity: "Project Master",
          action: "Create Project (e.g. 'Chandak Nostalgia', 'Unicorn')",
          fields: "Name, Code, Location, Start/Target Dates, RERA Reg No",
          purpose: "Root boundary container for all architectural drawings, budgets, and compliance records."
        },
        {
          order: "1.2",
          entity: "Sub-Project / Tower Master",
          action: "Add Towers & Wings (e.g. 'Tower A - G+40', 'Podium')",
          fields: "Tower Name, Project ID, Basements, Floors, Height (m)",
          purpose: "Enables floor-by-floor structural tracking and Building Section heat matrix visualization."
        },
        {
          order: "1.3",
          entity: "Package & Sub-Package Master",
          action: "Define Disciplines (ARCH, STR, MEP, FACADE, LANDSCAPE)",
          fields: "Package Code, Discipline Category, Lead Reviewer Role",
          purpose: "Categorizes drawings so engineering leads only review their domain deliverables."
        },
        {
          order: "1.4",
          entity: "Consultant Directory",
          action: "Register Consultant Firms & Scope Mapping",
          fields: "Firm Name, Category, Primary Contact, Phone, SLA Turnaround Days",
          purpose: "Assigns contractual accountability for drawing releases and SLA compliance tracking."
        },
        {
          order: "1.5",
          entity: "Statutory Authorities",
          action: "Add Municipal Bodies (MCGM, CFO Fire, High Rise Committee)",
          fields: "Authority Name, Jurisdiction, Standard Processing Days",
          purpose: "Tracks NOCs and sanction dependencies required before site execution commences."
        }
      ]
    },
    {
      phaseNumber: 2,
      name: "Tender Matrix & Look-Ahead Planning",
      badge: "Pre-Construction",
      icon: Clock,
      color: "text-warning-text",
      bgColor: "bg-warning-soft",
      borderColor: "border-warning-border",
      route: "/design/matrix",
      summary: "Generating the multi-tower package matrix grid, 30/60-day look-ahead deliverables, and milestone roadmaps.",
      whyFirst: "Establishes the procurement and site delivery schedule before releasing tenders or mobilizing contractors on site.",
      steps: [
        {
          order: "2.1",
          entity: "Tender Design Matrix",
          action: "Generate Tower x Package Matrix Grid",
          fields: "Project ID, Tower ID, Package ID, Status (Pending / In-Progress / Received / GFC)",
          purpose: "Gives leadership an instant visual heatmap of which disciplines are lagging across all towers."
        },
        {
          order: "2.2",
          entity: "Look-Ahead Forecast",
          action: "Set 30 / 60 / 90-Day Deliverable Milestones",
          fields: "Milestone Name, Target Release Date, Responsible Consultant, Critical Path Flag",
          purpose: "Identifies procurement bottlenecks 60 days in advance to prevent contractor site idling."
        },
        {
          order: "2.3",
          entity: "Statutory Liaisoning",
          action: "Log File Submissions & Track Sanctions",
          fields: "File Number, Authority ID, Submission Date, Approval Target, Status (Scrutiny / NOC Issued)",
          purpose: "Prevents stop-work notices by ensuring legal clearances precede physical construction."
        }
      ]
    },
    {
      phaseNumber: 3,
      name: "Drawing Upload, Revisions & Review",
      badge: "Engineering Coordination",
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-accent-soft",
      borderColor: "border-border-active",
      route: "/design/drawings",
      summary: "Consultant CAD/PDF uploads, multi-revision vaults (R0 -> R1 -> R2), and multi-disciplinary clash reviews.",
      whyFirst: "Ensures every architectural, structural, and MEP drawing undergoes rigorous peer review and version control before reaching site teams.",
      steps: [
        {
          order: "3.1",
          entity: "Drawing Register",
          action: "Upload Drawing Sheet with Metadata",
          fields: "Drawing Code (e.g. CN-STR-T1-101), Sheet Title, Scale, Revision (R0), CAD/PDF File",
          purpose: "Establishes a single source of truth; prevents site teams from working on outdated blueprints."
        },
        {
          order: "3.2",
          entity: "Design Approvals Queue",
          action: "Internal Engineering & Peer Review",
          fields: "Reviewer Status (Approved / Approved with Comments / Rejected), Redline Annotations",
          purpose: "Catches multi-disciplinary clashes (e.g. MEP pipe clashing with Structural beam) before casting."
        },
        {
          order: "3.3",
          entity: "Revision History Logs",
          action: "Version Delta Tracking & Superseded Archival",
          fields: "Revision Tag, Change Description, Replaced File URL, Approver Signature",
          purpose: "Maintains a permanent tamper-evident audit trail of what changes were made in each release."
        }
      ]
    },
    {
      phaseNumber: 4,
      name: "GFC Certification & Transmittal Slips",
      badge: "Site Release Gate",
      icon: Send,
      color: "text-success-text",
      bgColor: "bg-success-soft",
      borderColor: "border-success-border",
      route: "/design/handover",
      summary: "Digital Good-for-Construction (GFC) stamping, physical/digital transmittal slips, and contractor handover.",
      whyFirst: "Contractors are strictly prohibited from building without certified GFC drawings. Transmittals provide legal proof of delivery.",
      steps: [
        {
          order: "4.1",
          entity: "GFC Handover View",
          action: "Certify GFC Stamp & Digital Sign-off",
          fields: "Certified Date, Principal Architect Signature, Release Version, Scope of Work",
          purpose: "Legally authorizes the General Civil Contractor (GCC) to commence physical execution."
        },
        {
          order: "4.2",
          entity: "Transmittal Manager",
          action: "Generate & Dispatch Transmittal Slip",
          fields: "Transmittal No (TR-2026-001), Recipient Contractor, Hard Copies Issued, Soft Copy Link",
          purpose: "Provides legal delivery acknowledgement; prevents contractor delay claims regarding missing drawings."
        }
      ]
    },
    {
      phaseNumber: 5,
      name: "Site Execution, Field RFIs & DMS Vault",
      badge: "Field Operations & Audit",
      icon: FolderTree,
      color: "text-info-text",
      bgColor: "bg-info-soft",
      borderColor: "border-info-border",
      route: "/design/dms",
      summary: "Handling site clash RFIs, automated DMS folder indexing, and long-term project compliance archival.",
      whyFirst: "Resolves on-site construction queries within SLA and organizes thousands of drawings into searchable hierarchical folders.",
      steps: [
        {
          order: "5.1",
          entity: "Design RFI Tracker",
          action: "Raise Site Query / Clash Clarification",
          fields: "RFI Code, Query Subject, Grid Location, Priority, Assigned Consultant, Resolution Note",
          purpose: "Site engineers raise real-time site clashes; consultants must respond within contracted SLA (e.g. 48h)."
        },
        {
          order: "5.2",
          entity: "DMS Folder Repository",
          action: "Automated Folder Vault & Drawing Split",
          fields: "Project Folder, Discipline Sub-Folder, Tagged Files, Searchable OCR Index",
          purpose: "Enterprise document repository ensuring all historical revisions, CAD files, and NOCs are archived securely."
        }
      ]
    }
  ];

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Module Guide Banner */}
      <div className="bg-surface rounded-lg p-6 border border-border shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 theme-label text-primary">
              <BookOpen className="h-4 w-4" />
              <span>Design & engineering onboarding & architecture playbook</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
              End-to-end workflow, transaction lifecycle & field dictionary
            </h2>
            <p className="text-sm text-muted-foreground max-w-3xl">
              Master the entire Design & Tracking lifecycle: from master setup sequence and tender heatmaps to CAD revisions, GFC transmittals, and site clash RFIs.
            </p>
          </div>

          {/* Quick Guide Tab Switcher */}
          <div className="flex items-center gap-1.5 bg-muted/60 p-1.5 rounded-lg border border-border shrink-0 self-start lg:self-center">
            <button
              type="button"
              onClick={() => setActiveGuideView("FLOWCHART")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeGuideView === "FLOWCHART"
                  ? "bg-surface text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Workflow className="h-3.5 w-3.5 text-primary" />
              <span>Process flowchart</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGuideView("CRUD_FIELDS")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeGuideView === "CRUD_FIELDS"
                  ? "bg-surface text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Database className="h-3.5 w-3.5 text-primary" />
              <span>CRUD & field dictionary</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGuideView("ARCHITECTURE")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeGuideView === "ARCHITECTURE"
                  ? "bg-surface text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GitFork className="h-3.5 w-3.5 text-primary" />
              <span>Ecosystem impact</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: PROCESS FLOWCHART & STEP-BY-STEP SEQUENCE */}
      {activeGuideView === "FLOWCHART" && (
        <div className="space-y-6">
          {/* Phase Stepper Navigation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {lifecyclePhases.map((phase) => {
              const Icon = phase.icon;
              const isSelected = selectedPhase === phase.phaseNumber;
              return (
                <button
                  key={phase.phaseNumber}
                  type="button"
                  onClick={() => setSelectedPhase(phase.phaseNumber)}
                  className={`text-left p-4 rounded-lg border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? `bg-surface border-primary shadow-sm ring-2 ring-ring`
                      : "bg-surface/60 hover:bg-surface border-border hover:border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${phase.bgColor} ${phase.color} border ${phase.borderColor}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      Phase {phase.phaseNumber}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs text-foreground leading-snug">{phase.name}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{phase.badge}</p>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-primary pt-1 border-t border-border">
                      <span>Viewing active details</span>
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Detailed Selected Phase Card */}
          {(() => {
            const activePhase = lifecyclePhases.find(p => p.phaseNumber === selectedPhase) || lifecyclePhases[0];
            const Icon = activePhase.icon;
            return (
              <div className="bg-surface rounded-lg border border-border p-6 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${activePhase.bgColor} ${activePhase.color} border ${activePhase.borderColor} shrink-0`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="theme-label text-muted-foreground">
                          Phase {activePhase.phaseNumber} of 5
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-foreground border border-border">
                          {activePhase.badge}
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold text-foreground mt-0.5">
                        {activePhase.name}
                      </h3>
                    </div>
                  </div>

                  <Link
                    href={activePhase.route}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm self-start md:self-center"
                  >
                    <span>Open live view</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Why This Stage & Purpose Callout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-warning-text" />
                      <span>Executive overview</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {activePhase.summary}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-accent-soft border border-border-active space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Why this is done (business purpose & risk mitigation)</span>
                    </div>
                    <p className="text-xs text-foreground/90 leading-relaxed">
                      {activePhase.whyFirst}
                    </p>
                  </div>
                </div>

                {/* Sequence Steps Table */}
                <div className="space-y-3">
                  <h4 className="theme-label text-muted-foreground flex items-center gap-2">
                    <Workflow className="h-3.5 w-3.5 text-primary" />
                    <span>Sequential steps & field purpose</span>
                  </h4>

                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-muted/60 border-b border-border text-muted-foreground font-semibold">
                          <th className="py-2.5 px-3 w-16">Seq #</th>
                          <th className="py-2.5 px-3 w-40">Entity / master</th>
                          <th className="py-2.5 px-3 w-56">Action & inputs</th>
                          <th className="py-2.5 px-3 w-64">Key fields captured</th>
                          <th className="py-2.5 px-3">Why & what purpose it serves</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {activePhase.steps.map((step) => (
                          <tr key={step.order} className="hover:bg-surface/80 transition-colors">
                            <td className="py-3 px-3 font-mono font-semibold text-primary">
                              {step.order}
                            </td>
                            <td className="py-3 px-3 font-semibold text-foreground">
                              {step.entity}
                            </td>
                            <td className="py-3 px-3 text-muted-foreground">
                              {step.action}
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground">
                              {step.fields}
                            </td>
                            <td className="py-3 px-3 text-foreground font-medium">
                              {step.purpose}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* VIEW 2: CRUD OPERATIONS & FIELD DICTIONARY */}
      {activeGuideView === "CRUD_FIELDS" && (
        <div className="space-y-6">
          <ModuleRenderer module={designModule} />
        </div>
      )}

      {/* VIEW 3: ARCHITECTURE & ECOSYSTEM DEPENDENCY GRAPH */}
      {activeGuideView === "ARCHITECTURE" && (
        <div className="space-y-6">
          <ModuleDependencyGraph />
        </div>
      )}
    </div>
  );
}
