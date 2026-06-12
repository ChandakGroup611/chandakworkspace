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
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import RequirementDraftModal from "@/components/requirements/RequirementDraftModal";
import TaskCreationWizard from "@/components/tasks/TaskCreationWizard";

interface RequirementItem {
  id: string;
  dbId?: string;
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
  budgetImpact?: number;
  estimatedEffort?: string;
  dependencyNotes?: string;
  scope?: string;
  sourceTicketId?: string;
  approvalFlow?: {
    id: string;
    level: number;
    departmentName: string;
    approverDesignationName: string;
    approverName?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'HOLD' | 'CLARIFICATION';
    remarks?: string;
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

  const [reqs, setReqs] = useState<RequirementItem[]>([]);
  const [selectedReq, setSelectedReq] = useState<RequirementItem | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingTask, setIsGeneratingTask] = useState(false);

  // Fetch real requirements
  const loadRequirements = async (wsId: string) => {
    try {
      const m = await import("@/lib/actions/requirements");
      const data = await m.fetchRequirements(wsId);
      const mapped = data.map((d: any) => ({
        id: d.requirement_code,
        dbId: d.id,
        title: d.title,
        objective: d.requirement_reason || d.objective,
        functionalScope: d.functional_scope || d.description,
        technicalScope: d.technical_scope || "Pending definition...",
        risk: d.risk_assessment || "Low",
        stage: d.status?.name || "Draft",
        approvals: { business: false, technical: false, compliance: false, final: false },
        criteria: d.custom_fields?.criteria || [],
        customFields: d.custom_fields || {},
        versionTag: d.custom_fields?.versionTag || "v1.0-DRAFT",
        versionHistory: d.custom_fields?.versionHistory || [],
        budgetImpact: d.budget_impact,
        estimatedEffort: d.estimated_effort,
        dependencyNotes: d.dependency_notes,
        scope: d.scope,
        sourceTicketId: d.source_ticket_id,
        approvalFlow: d.requirement_approval_flow?.map((f: any) => ({
          id: f.id,
          level: f.level,
          departmentName: f.departments?.name || "Unknown Dept",
          approverDesignationName: f.designations?.name || "Assigned Role",
          approverName: f.user_master?.full_name,
          status: f.status,
          remarks: f.remarks
        })) || []
      }));
      setReqs(mapped);
      if (mapped.length > 0 && !selectedReq) {
        setSelectedReq(mapped[0]);
      } else if (mapped.length === 0) {
        setSelectedReq(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const wsId = params.get("workspaceId");
      if (wsId) {
        setActiveWorkspaceId(wsId);
        loadRequirements(wsId);
      }
    }
  }, []);

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

  const toggleApproval = async (tier: keyof RequirementItem["approvals"]) => {
    if (!selectedReq) return;
    const updatedApprovals = {
      ...selectedReq.approvals,
      [tier]: !selectedReq.approvals[tier]
    };

    const updated = {
      ...selectedReq,
      approvals: updatedApprovals
    };
    
    // Automatically advance stage if all tiers pass
    const allApproved = updated.approvals.business && updated.approvals.technical && updated.approvals.compliance && updated.approvals.final;
    if (allApproved && updated.stage === "Approval") {
      updated.stage = "Development";
      // We would ideally call transitionRequirementStatus here if we had the status IDs
    }

    setSelectedReq(updated);
    setReqs(reqs.map(r => r.id === updated.id ? updated : r));

    // Persist to DB
    const newCustomFields = { ...updated.customFields, approvals: updatedApprovals };
    await supabase.from('requirements').update({ custom_fields: newCustomFields }).eq('requirement_code', updated.id);
  };

  const toggleCriterion = async (idx: number) => {
    if (!selectedReq) return;
    const newCriteria = [...selectedReq.criteria];
    newCriteria[idx].done = !newCriteria[idx].done;
    const newCustomFields = { ...selectedReq.customFields, criteria: newCriteria };
    const updated = { ...selectedReq, criteria: newCriteria, customFields: newCustomFields };
    setSelectedReq(updated);
    setReqs(reqs.map(r => r.id === updated.id ? updated : r));
    await supabase.from('requirements').update({ custom_fields: newCustomFields }).eq('requirement_code', updated.id);
  };

  const handleCustomFieldChange = async (key: string, val: any) => {
    if (!selectedReq) return;
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
    await supabase.from('requirements').update({ custom_fields: updatedFields }).eq('requirement_code', updated.id);
  };

  const [newCommitMessage, setNewCommitMessage] = useState("");
  const commitVersionSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommitMessage.trim() || !selectedReq) return;
    const nextVer = `v2.${(selectedReq.versionHistory || []).length + 5}-SNAPSHOT`;
    const newEntry = {
      v: nextVer,
      author: "Engineering Lifecycle Daemon",
      date: new Date().toLocaleDateString(),
      changes: newCommitMessage.trim()
    };
    const newVersionHistory = [newEntry, ...(selectedReq.versionHistory || [])];
    const newCustomFields = { ...selectedReq.customFields, versionHistory: newVersionHistory, versionTag: nextVer };
    const updated = {
      ...selectedReq,
      versionTag: nextVer,
      versionHistory: newVersionHistory,
      customFields: newCustomFields
    };
    setSelectedReq(updated);
    setReqs(reqs.map(r => r.id === updated.id ? updated : r));
    setNewCommitMessage("");
    await supabase.from('requirements').update({ custom_fields: newCustomFields }).eq('requirement_code', updated.id);
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
    <PageContainer strict={true}>
      <PageHeader
        title="Requirement Engineering Lifecycle"
        description="Structured functional analysis and sequential operational sign-off architecture mapped directly from the master blueprint."
        badge={<AppBadge variant="warning">Approval Engine</AppBadge>}
        actions={
          <>
            <AppButton variant="outline" size="sm" onClick={() => router.push("/")} leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </AppButton>
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
              disabled={!hasPermission("REQUIREMENTS_CREATE") || !activeWorkspaceId}
              onClick={() => setIsCreating(true)}
            >
              Draft Scope
            </AppButton>
          </>
        }
      />

      {isCreating && activeWorkspaceId && (
        <RequirementDraftModal 
          workspaceId={activeWorkspaceId}
          regulatoryOptions={regulatoryOptions}
          onClose={() => setIsCreating(false)}
          onSuccess={async (payload: any) => {
            const m = await import("@/lib/actions/requirements");
            // inject currently authenticated user if possible, but actually createTask and createRequirement do it natively!
            // Wait, we need to pass created_by to payload, or modify createRequirement to auto-fetch just like createTask
            // But we already updated createRequirement in tasks... oh wait, requirements.ts doesn't auto-fetch created_by yet.
            // Let's pass a placeholder or let backend handle it
            const { data: { user } } = await supabase.auth.getUser();
            const fullPayload = { ...payload, created_by: user?.id };
            await m.createRequirement(fullPayload);
            setIsCreating(false);
            loadRequirements(activeWorkspaceId); // reload list
          }}
        />
      )}

      {isGeneratingTask && activeWorkspaceId && selectedReq && (
        <TaskCreationWizard
          workspaceId={activeWorkspaceId}
          onClose={() => setIsGeneratingTask(false)}
          onSuccess={async (taskPayload) => {
            const m = await import("@/lib/actions/requirements");
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");
            const fullTaskPayload = { ...taskPayload, workspace_id: activeWorkspaceId };
            await m.generateRequirementTask(selectedReq.dbId || selectedReq.id, fullTaskPayload, user.id);
            setIsGeneratingTask(false);
            // Optional: trigger toast
          }}
        />
      )}

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
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden mt-4">
        {/* Left Column Span 4: Indexed Registry Catalog */}
        <div className="lg:col-span-4 space-y-3 flex flex-col min-h-0">
          <span className="text-[0.8rem] font-bold text-gray-400 tracking-wider uppercase select-none block shrink-0">
            Indexed Requirement Directory
          </span>

          <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
            {reqs.map((r) => {
              const isSelected = selectedReq?.id === r.id;
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

                  {r.sourceTicketId && (
                    <div className="text-[10px] text-indigo-400 font-mono mb-1 flex items-center gap-1">
                      <FileCode className="h-3 w-3" /> Source: {r.sourceTicketId}
                    </div>
                  )}

                  <h3 className="text-xs font-bold text-white tracking-tight line-clamp-2 mb-2">
                    {r.title}
                  </h3>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                    <span className={`font-semibold ${r.risk === "High" ? "text-rose-400" : "text-gray-400"}`}>
                      Risk: {r.risk}
                    </span>
                    <span className="text-gray-500 font-medium">
                      Scope: {r.scope || 'N/A'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column Span 8: Full Functional Detail Inspector */}
        <div className="lg:col-span-8 flex flex-col min-h-0">
          {!selectedReq ? (
            <AppCard className="p-10 flex flex-col items-center justify-center text-center space-y-4 border-white/10 shadow-2xl bg-black/20 flex-1">
              <div className="p-4 rounded-full bg-white/5 border border-white/10">
                <FileCheck2 className="h-10 w-10 text-gray-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-300">No Requirement Selected</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto mt-2">
                  Select a requirement from the left directory or draft a new scope to begin analysis.
                </p>
              </div>
            </AppCard>
          ) : (
          <AppCard className="p-6 space-y-6 shadow-2xl border-white/10 flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-thin">
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
                <div className="flex items-center gap-3">
                  {selectedReq.stage !== "Draft" && selectedReq.stage !== "Analysis" && selectedReq.stage !== "Approval" && (
                    <AppButton variant="primary" size="sm" onClick={() => setIsGeneratingTask(true)}>Generate Execution Task</AppButton>
                  )}
                  <span className="text-xs text-gray-500 font-mono">Immutable audit entry</span>
                </div>
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
            <div className="h-px bg-white/5 w-full my-6" />

            {/* Custom Fields & Acceptance Criteria */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-400">
                    <CheckSquare className="h-4 w-4" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Acceptance Criteria</h3>
                </div>
                <div className="space-y-2">
                  {selectedReq.criteria && selectedReq.criteria.length > 0 ? selectedReq.criteria.map((c, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => toggleCriterion(idx)}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        c.done 
                          ? "bg-emerald-500/5 border-emerald-500/20" 
                          : "bg-white/[0.02] border-white/5 hover:border-white/10"
                      }`}
                    >
                      {c.done ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-600 shrink-0 mt-0.5" />
                      )}
                      <span className={`text-[13px] leading-snug ${c.done ? "text-emerald-200 line-through opacity-70" : "text-gray-300"}`}>
                        {c.label}
                      </span>
                    </div>
                  )) : (
                    <div className="text-xs text-gray-500 italic p-3 border border-dashed border-white/10 rounded-xl text-center">
                      No criteria defined for this requirement.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-indigo-500/10 text-indigo-400">
                    <Layers className="h-4 w-4" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Governed Attributes</h3>
                </div>
                <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-white/5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Regulatory Mapping</label>
                    <select
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300 outline-none focus:border-indigo-500"
                      value={selectedReq.customFields?.regulatory_scope || ""}
                      onChange={(e) => handleCustomFieldChange("regulatory_scope", e.target.value)}
                    >
                      <option value="" disabled className="bg-[#070913]">Select Framework...</option>
                      {regulatoryOptions.map(opt => (
                        <option key={opt} value={opt} className="bg-[#070913]">{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Approved Budget (USD)</label>
                    <AppInput 
                      type="number" 
                      className="h-8 text-xs bg-white/5 border-white/10"
                      value={selectedReq.budgetImpact || selectedReq.customFields?.budget_allocation_usd || ""}
                      onChange={(e) => handleCustomFieldChange("budget_allocation_usd", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Estimated Effort</label>
                    <AppInput 
                      className="h-8 text-xs bg-white/5 border-white/10"
                      value={selectedReq.estimatedEffort || ""}
                      onChange={(e) => handleCustomFieldChange("estimatedEffort", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Dependency Notes</label>
                    <AppInput 
                      className="h-8 text-xs bg-white/5 border-white/10"
                      value={selectedReq.dependencyNotes || ""}
                      onChange={(e) => handleCustomFieldChange("dependencyNotes", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Multi-Level Approval Switches Section */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 block">
                  <Users className="h-3 w-3" />
                  <span>Dynamic Snapshot Approval Flow</span>
                </span>
                <span className="text-[0.7rem] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                  {selectedReq.approvalFlow?.length || 0} Sequential Gates
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                {(selectedReq.approvalFlow && selectedReq.approvalFlow.length > 0) ? (
                  selectedReq.approvalFlow.map((flow) => {
                    const isApproved = flow.status === 'APPROVED';
                    const isPending = flow.status === 'PENDING';
                    const isRejected = flow.status === 'REJECTED';
                    
                    return (
                      <div
                        key={flow.id}
                        className={`p-3 rounded-xl border text-left transition-all duration-200 select-none flex flex-col justify-between h-20 ${
                          isApproved 
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" 
                            : isRejected 
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                            : "bg-white/[0.01] border-white/5 hover:border-white/10 text-gray-400"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full text-[11px]">
                          <span className="font-bold text-gray-300 truncate">Lvl {flow.level}: {flow.departmentName}</span>
                          {isApproved && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                          {isPending && <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                          {isRejected && <ShieldAlert className="h-3.5 w-3.5 text-rose-400 shrink-0" />}
                        </div>
                        <div className="space-y-0.5 mt-1">
                          <span className="text-[10px] text-gray-500 block truncate" title={flow.approverDesignationName}>
                            {flow.approverName || flow.approverDesignationName}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                            isApproved ? "text-emerald-400" : isRejected ? "text-rose-400" : "text-amber-400"
                          }`}>
                            {flow.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full p-4 rounded-xl border border-dashed border-white/10 text-center text-xs text-gray-500">
                    No approval flow snapshot generated. Complete analysis to generate flow.
                  </div>
                )}
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
                  {(selectedReq?.versionHistory || []).length} registered revisions
                </span>
              </div>

              <div className="space-y-2">
                {(selectedReq?.versionHistory || []).map((ver, vIdx) => (
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
          )}
        </div>
      </div>
    </PageContainer>
  );
}
