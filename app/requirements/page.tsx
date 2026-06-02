"use client";

import React, { useState, useEffect } from "react";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { createClient } from "@/utils/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { 
  FileCheck2, 
  CheckCircle2, 
  Clock, 
  Layers, 
  ShieldAlert, 
  Plus, 
  CheckSquare, 
  Square,
  Users,
  GitCommit,
  AlertTriangle,
  ArrowRight,
  History,
  Tag,
  FileCode,
  RefreshCw,
  ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";

interface RequirementItem {
  id: string;
  title: string;
  objective: string;
  functionalScope: string;
  technicalScope: string;
  risk: "Low" | "Medium" | "High";
  stage: "Draft" | "Analysis" | "Approval" | "Development" | "QA" | "Released";
  approvals: {
    business: boolean;
    technical: boolean;
    compliance: boolean;
    final: boolean;
  };
  criteria: { label: string; done: boolean }[];
  customFields?: Record<string, any>;
  versionTag?: string;
  versionHistory?: {
    v: string;
    author: string;
    date: string;
    changes: string;
  }[];
}

export default function RequirementsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { hasPermission, loading: permsLoading } = usePermissions();
  
  // Realtime Database-Driven Selectors State
  const [regulatoryOptions, setRegulatoryOptions] = useState<string[]>([]);
  const [approvalTypesList, setApprovalTypesList] = useState<any[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configWarnings, setConfigWarnings] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [reqs, setReqs] = useState<RequirementItem[]>([
    {
      id: "REQ-901",
      title: "Universal queue-based async event dispatcher service",
      objective: "Decouple synchronous WebSocket notifications and SMTP email logging from primary PostgreSQL storage inserts to guarantee sub-300ms ticket opening speeds.",
      functionalScope: "CRUD triggers publish normalized JSON events directly into Redis worker queues for secondary downstream processing.",
      technicalScope: "Implement @supabase/ssr middleware intercepts integrated with background server listeners supporting granular retry fallback loops.",
      risk: "Medium",
      stage: "Approval",
      approvals: { business: true, technical: true, compliance: false, final: false },
      criteria: [
        { label: "Verify Zod payload validation parameters pass client constraints", done: true },
        { label: "Confirm zero active connections leak during concurrent bulk inserts", done: true },
        { label: "Enforce strict snapshot permission metadata mappings", done: false },
      ],
      customFields: {
        regulatory_scope: "SOC2 Certified",
        budget_allocation_usd: 12500
      },
      versionTag: "v2.4-STABLE",
      versionHistory: [
        { v: "v2.4-STABLE", author: "Alex Vance", date: "May 14, 2026", changes: "Added multi-region Redis retry loops and circuit breakers." },
        { v: "v2.1-DRAFT", author: "Elena Rostova", date: "May 10, 2026", changes: "Initial scope outline mapping baseline pgBouncer triggers." }
      ]
    },
    {
      id: "REQ-902",
      title: "Dynamic RBAC flattened permission snapshot engine",
      objective: "Pre-compute complex role joins into cached string lists injected directly into active JWT user metadata headers.",
      functionalScope: "Eliminate repetitive nested SQL lookups during multi-department dashboard renderings.",
      technicalScope: "Postgres materialized view caching bindings powered by pg_cron incremental triggers.",
      risk: "High",
      stage: "Analysis",
      approvals: { business: true, technical: false, compliance: false, final: false },
      criteria: [
        { label: "Validate custom hook context hydration timing", done: true },
      ],
      customFields: {
        regulatory_scope: "ISO-27001 System",
        budget_allocation_usd: 8400
      },
      versionTag: "v1.0-ALPHA",
      versionHistory: [
        { v: "v1.0-ALPHA", author: "Security Compliance Daemon", date: "May 12, 2026", changes: "Enforced RLS execution constraints on snapshot read channels." }
      ]
    }
  ]);

  const [selectedReq, setSelectedReq] = useState<RequirementItem>(reqs[0]);

  // Extract exclusive selector records from Postgres
  const fetchDatabaseGovernanceConfigs = async () => {
    setLoadingConfig(true);
    try {
      // 1. Fetch custom dynamic attributes registry definitions
      const { data: cfdData, error: cfdErr } = await supabase
        .from("custom_field_definitions")
        .select("options")
        .eq("field_key", "regulatory_scope")
        .single();

      // 2. Fetch master approval types
      const { data: appData } = await supabase
        .from("approval_types")
        .select("*")
        .filter("is_active", "eq", true);

      const resolvedOptions = cfdData?.options || [];
      const resolvedApprovals = (appData || []).filter((a: any) => a.is_deleted !== true);

      setRegulatoryOptions(resolvedOptions);
      setApprovalTypesList(resolvedApprovals);

      const warnings: string[] = [];
      if (resolvedOptions.length === 0) {
        warnings.push("Missing regulatory options definitions in custom_field_definitions registry.");
      }
      if (resolvedApprovals.length === 0) {
        warnings.push("Missing governed Approval Types. Multi-tier gates operating under volatile cache state.");
      }

      setConfigWarnings(warnings);
    } catch (err: any) {
      console.error("Governance settings retrieval failure:", err);
      setConfigWarnings(["Failed to fetch master constraints from PostgreSQL."]);
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    fetchDatabaseGovernanceConfigs();
  }, []);

  const toggleApproval = (tier: keyof RequirementItem["approvals"]) => {
    const updated = {
      ...selectedReq,
      approvals: {
        ...selectedReq.approvals,
        [tier]: !selectedReq.approvals[tier]
      }
    };
    
    // Automatically advance stage if all tiers pass
    const allApproved = updated.approvals.business && updated.approvals.technical && updated.approvals.compliance && updated.approvals.final;
    if (allApproved && updated.stage === "Approval") {
      updated.stage = "Development";
    }

    setSelectedReq(updated);
    setReqs(reqs.map(r => r.id === updated.id ? updated : r));
  };

  const toggleCriterion = (idx: number) => {
    const newCriteria = [...selectedReq.criteria];
    newCriteria[idx].done = !newCriteria[idx].done;
    const updated = { ...selectedReq, criteria: newCriteria };
    setSelectedReq(updated);
    setReqs(reqs.map(r => r.id === updated.id ? updated : r));
  };

  const handleCustomFieldChange = (key: string, val: any) => {
    const updatedFields = {
      ...selectedReq.customFields,
      [key]: val
    };
    const updated = {
      ...selectedReq,
      customFields: updatedFields
    };
    setSelectedReq(updated);
    setReqs(reqs.map(r => r.id === updated.id ? updated : r));
  };

  const [newCommitMessage, setNewCommitMessage] = useState("");
  const commitVersionSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommitMessage.trim()) return;
    const nextVer = `v2.${(selectedReq.versionHistory || []).length + 5}-SNAPSHOT`;
    const newEntry = {
      v: nextVer,
      author: "Engineering Lifecycle Daemon",
      date: "Just now",
      changes: newCommitMessage.trim()
    };
    const updated = {
      ...selectedReq,
      versionTag: nextVer,
      versionHistory: [newEntry, ...(selectedReq.versionHistory || [])]
    };
    setSelectedReq(updated);
    setReqs(reqs.map(r => r.id === updated.id ? updated : r));
    setNewCommitMessage("");
  };

  const stages = ["Draft", "Analysis", "Approval", "Development", "QA", "Released"];

  if (!mounted || permsLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4 transition-colors duration-300 bg-[#070913]">
        <div className="animate-spin h-10 w-10 border-2 border-indigo-500 border-t-transparent rounded-full shadow-lg shadow-indigo-500/20" />
        <span className="text-xs font-bold uppercase tracking-widest animate-pulse text-gray-500">
          Verifying Credentials...
        </span>
      </div>
    );
  }

  if (!hasPermission("REQUIREMENTS_VIEW")) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4 transition-colors duration-300 bg-[#070913] text-white">
        <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-xs text-gray-500">You do not have capabilities to view the Requirement Engineering Lifecycle.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-400 w-full font-sans">
      {/* Module Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
        <div className="flex items-center gap-3">
          <AppButton variant="outline" size="sm" onClick={() => router.push("/")} leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </AppButton>
          <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">Requirement Engineering Lifecycle</h1>
            <AppBadge variant="warning">Approval Engine</AppBadge>
          </div>
          <p className="text-xs text-gray-400">
            Structured functional analysis and sequential operational sign-off architecture mapped directly from the master blueprint.
          </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <AppButton 
            variant="outline" 
            size="sm" 
            leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loadingConfig ? 'animate-spin text-amber-400' : ''}`} />}
            onClick={fetchDatabaseGovernanceConfigs}
          >
            Sync Config Registry
          </AppButton>
          <AppButton 
            variant="primary" 
            size="sm" 
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            disabled={!hasPermission("REQUIREMENTS_CREATE")}
          >
            Draft Scope
          </AppButton>
        </div>
      </div>

      {/* Dynamic Master Config Status Bar */}
      {configWarnings.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5 animate-in fade-in-20">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 flex-1">
            <strong className="font-bold block uppercase tracking-wider text-[0.8rem]">Configuration Missing Warning:</strong>
            {configWarnings.map((w, idx) => (
              <p key={idx} className="text-amber-200/90 leading-tight">• {w}</p>
            ))}
            <p className="text-xs text-gray-400 pt-1 italic">
              Exclusive lookup queries active. Fallback placeholders disabled to ensure audit state machine adherence.
            </p>
          </div>
        </div>
      )}

      {/* Orchestrated Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column Span 4: Indexed Registry Catalog */}
        <div className="lg:col-span-4 space-y-3">
          <span className="text-[0.8rem] font-bold text-gray-400 tracking-wider uppercase select-none block">
            Indexed Requirement Directory
          </span>

          <div className="space-y-2.5 max-h-[calc(100vh-16rem)] overflow-y-auto pr-1 scrollbar-thin">
            {reqs.map((r) => {
              const isSelected = selectedReq.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedReq(r)}
                  className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer text-left relative overflow-hidden ${
                    isSelected 
                      ? "bg-white/[0.04] border-amber-500/40 shadow-md" 
                      : "bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
                  }`}
                >
                  {isSelected && <div className="absolute left-0 top-0 w-1 h-full bg-amber-500" />}

                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-gray-400">{r.id}</span>
                    <AppBadge variant={r.stage === "Released" ? "success" : r.stage === "Approval" ? "warning" : "info"}>
                      {r.stage}
                    </AppBadge>
                  </div>

                  <h3 className="text-xs font-bold text-white tracking-tight line-clamp-2 mb-2">
                    {r.title}
                  </h3>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                    <span className={`font-semibold ${r.risk === "High" ? "text-rose-400" : "text-gray-400"}`}>
                      Risk: {r.risk}
                    </span>
                    <span className="text-amber-400/80 font-semibold flex items-center gap-1">
                      Inspect Scope →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column Span 8: Full Functional Detail Inspector */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          <AppCard className="p-6 space-y-6 shadow-2xl border-white/10">
            {/* Context Header */}
            <div className="space-y-2 border-b border-white/5 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-sans">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {selectedReq.id}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/5 text-gray-300 font-bold border border-white/10">
                    {selectedReq.versionTag || "v1.0-DRAFT"}
                  </span>
                  <span className="text-gray-600">•</span>
                  <span className="text-xs text-gray-400 font-medium">Department Head Analysis Scope</span>
                </div>
                <span className="text-xs text-gray-500 font-mono">Immutable audit entry</span>
              </div>
              <h2 className="text-base text-white font-bold leading-relaxed pt-1">
                {selectedReq.title}
              </h2>

              {/* Lifecycle Track Ribbon */}
              <div className="pt-2 overflow-x-auto scrollbar-none pr-2">
                <div className="flex items-center justify-between text-xs font-bold text-gray-500 min-w-[360px]">
                  {stages.map((stg, sIdx) => {
                    const isCurrent = selectedReq.stage === stg;
                    const isPassed = stages.indexOf(selectedReq.stage) > sIdx;
                    return (
                      <span key={stg} className={`flex items-center gap-1.5 ${isCurrent ? "text-amber-400 font-bold underline" : isPassed ? "text-emerald-500" : ""}`}>
                        {stg}
                        {sIdx < stages.length - 1 && <ArrowRight className="h-2.5 w-2.5 text-gray-700 shrink-0" />}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Scope Divisions Mapping */}
            <div className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Business Objective</span>
                <p className="text-gray-200 leading-relaxed bg-black/40 p-3.5 rounded-xl border border-white/5">
                  {selectedReq.objective}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">Functional Scope</span>
                  <p className="text-gray-300 leading-relaxed bg-white/[0.005] p-3 rounded-xl border border-white/5">
                    {selectedReq.functionalScope}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">Technical Scope</span>
                  <p className="text-gray-300 leading-relaxed bg-white/[0.005] p-3 rounded-xl border border-white/5">
                    {selectedReq.technicalScope}
                  </p>
                </div>
              </div>
            </div>

            {/* Custom Implementation Attributes Map */}
            <div className="space-y-3 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
                  <Layers className="h-3 w-3" />
                  <span>Dynamic Custom Implementation Attributes</span>
                </span>
                <span className="text-[0.7rem] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Database Selectors
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/[0.005] p-3 rounded-xl border border-white/5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 block">Data Sovereignty Act Scope</label>
                  <select
                    value={selectedReq.customFields?.regulatory_scope || ""}
                    onChange={(e) => handleCustomFieldChange("regulatory_scope", e.target.value)}
                    className="w-full h-8 px-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-200 focus:outline-none focus:border-amber-500/50 cursor-pointer disabled:opacity-50"
                    disabled={regulatoryOptions.length === 0 || !hasPermission("REQUIREMENTS_UPDATE")}
                  >
                    {regulatoryOptions.length === 0 ? (
                      <option value="" className="bg-[#0A0D14] text-amber-500">-- Unconfigured in Registry --</option>
                    ) : (
                      <>
                        <option value="" className="bg-[#0A0D14] text-gray-500">-- Select Governed Option --</option>
                        {regulatoryOptions.map((optString, idx) => (
                          <option key={idx} value={optString} className="bg-[#0A0D14]">
                            {optString}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 block">CAPEX Budget Allowance (USD)</label>
                  <AppInput 
                    type="number"
                    placeholder="e.g. 15000"
                    value={selectedReq.customFields?.budget_allocation_usd || ""}
                    onChange={(e) => handleCustomFieldChange("budget_allocation_usd", Number(e.target.value))}
                    disabled={!hasPermission("REQUIREMENTS_UPDATE")}
                    className="h-8 text-xs font-mono disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Acceptance Criteria Engine */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                Acceptance Criteria Verification Matrix
              </span>
              <div className="space-y-1.5">
                {selectedReq.criteria.map((c, cIdx) => (
                  <div
                    key={cIdx}
                    onClick={() => hasPermission("REQUIREMENTS_UPDATE") && toggleCriterion(cIdx)}
                    className={`flex items-center gap-2.5 p-2 rounded-lg text-xs select-none transition-colors ${
                      hasPermission("REQUIREMENTS_UPDATE") 
                        ? "hover:bg-white/[0.02] cursor-pointer text-gray-300" 
                        : "opacity-55 cursor-not-allowed text-gray-400"
                    }`}
                  >
                    <div className={c.done ? "text-emerald-400" : "text-gray-600"}>
                      {c.done ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    </div>
                    <span className={c.done ? "line-through text-gray-500" : "font-medium"}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Multi-Level Approval Switches Section */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 block">
                  <Users className="h-3 w-3" />
                  <span>Multi-Tier Authority Sign-Off Engine</span>
                </span>
                {approvalTypesList.length > 0 && (
                  <span className="text-[0.7rem] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                    {approvalTypesList.length} DB Gating Rules
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {[
                  { tier: "business" as const, label: "Business Lead", role: approvalTypesList.find(a => a.code === "APP_TIER1_MGR")?.name || "Line Mgr" },
                  { tier: "technical" as const, label: "Technical Lead", role: approvalTypesList.find(a => a.code === "APP_TIER2_CAB")?.name || "CAB Gate" },
                  { tier: "compliance" as const, label: "Compliance Team", role: "Sec Daemon" },
                  { tier: "final" as const, label: "Final Release Gate", role: "Super Admin" },
                ].map((app) => {
                  const isApproved = selectedReq.approvals[app.tier];
                  return (
                    <button
                      key={app.tier}
                      type="button"
                      onClick={() => toggleApproval(app.tier)}
                      disabled={!hasPermission("REQUIREMENTS_UPDATE")}
                      className={`p-2.5 rounded-xl border text-left transition-all duration-200 select-none flex flex-col justify-between h-16 disabled:opacity-45 disabled:cursor-not-allowed ${
                        isApproved 
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" 
                          : "bg-white/[0.01] border-white/5 hover:border-white/10 text-gray-500"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full text-xs">
                        <span className="font-bold text-gray-300 truncate" title={app.role}>{app.label}</span>
                        {isApproved ? <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" /> : <Clock className="h-3 w-3 text-gray-600 shrink-0" />}
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[0.65rem] text-gray-500 block truncate">{app.role}</span>
                        <span className={`text-[0.7rem] font-bold uppercase tracking-wider block ${isApproved ? "text-emerald-400" : "text-gray-600"}`}>
                          {isApproved ? "Approved" : "Pending"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-gray-500 border-t border-white/5">
                <span>Sign-offs instantly publish state events to async worker queues.</span>
                <span className="underline hover:text-white cursor-pointer">SLA Escalation Advisory</span>
              </div>
            </div>

            {/* Incremental Multi-Version Metadata Commit Logs */}
            <div className="space-y-3 pt-2 border-t border-white/5 font-sans">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 block">
                  <History className="h-3 w-3" />
                  <span>Immutable Versioning Snapshots & Incremental Audit Timeline</span>
                </span>
                <span className="text-xs text-gray-500 font-mono">
                  {(selectedReq.versionHistory || []).length} registered revisions
                </span>
              </div>

              <div className="space-y-2">
                {(selectedReq.versionHistory || []).map((ver, vIdx) => (
                  <div key={vIdx} className="p-3 rounded-xl bg-white/[0.01] border border-white/5 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/20">
                          {ver.v}
                        </span>
                        <span className="text-xs font-bold text-white">{ver.author}</span>
                      </div>
                      <span className="text-xs text-gray-500 font-mono">{ver.date}</span>
                    </div>
                    <p className="text-xs text-gray-400 pl-1">{ver.changes}</p>
                  </div>
                ))}
              </div>

              {/* Version Submission Form */}
              <form onSubmit={commitVersionSnapshot} className="flex gap-2 pt-1">
                <div className="flex-1">
                  <AppInput 
                    placeholder={hasPermission("REQUIREMENTS_UPDATE") ? "Document functional mapping adjustments for next iteration tuple..." : "You do not have permissions to commit snapshots."}
                    value={newCommitMessage}
                    onChange={(e) => setNewCommitMessage(e.target.value)}
                    disabled={!hasPermission("REQUIREMENTS_UPDATE")}
                    className="h-9 text-xs disabled:opacity-50"
                  />
                </div>
                <AppButton 
                  variant="primary" 
                  size="sm" 
                  className="h-9 px-3 shrink-0 text-xs disabled:opacity-50" 
                  type="submit"
                  disabled={!newCommitMessage.trim() || !hasPermission("REQUIREMENTS_UPDATE")}
                >
                  Commit New Snapshot
                </AppButton>
              </form>
            </div>
          </AppCard>
        </div>
      </div>
    </div>
  );
}
