"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import { createClient } from "@/utils/supabase/client";
import { saveAMCEntity, deleteAMCEntity } from "@/lib/actions/amc-client";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  Calendar, 
  User, 
  FileText, 
  RotateCcw, 
  Layers, 
  Settings, 
  MessageSquare, 
  Sparkles, 
  TestTube2, 
  GraduationCap, 
  ShoppingCart, 
  PlayCircle,
  Loader2,
  Paperclip,
  Check,
  X,
  Edit3,
  ExternalLink
} from "lucide-react";

export interface ImplementationStage {
  id?: string;
  amc_id: string;
  stage_key: string;
  stage_name: string;
  sequence_order: number;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Blocked' | 'Skipped';
  target_date?: string | null;
  completed_date?: string | null;
  assigned_to?: string | null;
  assigned_user?: { id: string; full_name: string; email: string } | null;
  signoff_person_name?: string | null;
  notes?: string | null;
  attachment_file_path?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface AMCImplementationTabProps {
  amcId: string;
  isLightMode: boolean;
  onUpdate?: () => Promise<void> | void;
  softwareName?: string;
  contractPutToUseDate?: string;
}

const DEFAULT_STAGES = [
  {
    stage_key: "purchase",
    stage_name: "1. PO Issued & Procurement",
    description: "Purchase order issued, contract signed, initial licenses procured.",
    icon: ShoppingCart,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30"
  },
  {
    stage_key: "discussion",
    stage_name: "2. Discussion & Discovery",
    description: "Stakeholder requirements discovery, kickoff meeting, IT architecture review.",
    icon: MessageSquare,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30"
  },
  {
    stage_key: "configuration",
    stage_name: "3. Setup & Configuration",
    description: "Tenant setup, SSO / IAM configuration, sandbox & admin provisioning.",
    icon: Settings,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30"
  },
  {
    stage_key: "implementation",
    stage_name: "4. Implementation & Integration",
    description: "Custom development, data migration, API connectors, workflow automation.",
    icon: Layers,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/30"
  },
  {
    stage_key: "uat",
    stage_name: "5. UAT & Testing Sign-Off",
    description: "User acceptance testing with department champions, security audit, bug fixing.",
    icon: TestTube2,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30"
  },
  {
    stage_key: "training",
    stage_name: "6. Training & User Rollout",
    description: "End-user training sessions, SOP guide distribution, change management.",
    icon: GraduationCap,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30"
  },
  {
    stage_key: "go_live",
    stage_name: "7. Go-Live / Put to Use",
    description: "Production launch, system marked fully operational and active in production.",
    icon: PlayCircle,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30"
  }
];

export function AMCImplementationTab({
  amcId,
  isLightMode,
  onUpdate,
  softwareName,
  contractPutToUseDate
}: AMCImplementationTabProps) {
  const supabase = createClient();
  const [stages, setStages] = useState<ImplementationStage[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingStageId, setSavingStageId] = useState<string | null>(null);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [uploadingStageId, setUploadingStageId] = useState<string | null>(null);

  // Custom stage modal
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [customStageName, setCustomStageName] = useState("");
  const [customStageTargetDate, setCustomStageTargetDate] = useState("");
  const [customStageAssignedTo, setCustomStageAssignedTo] = useState("");
  const [customStageNotes, setCustomStageNotes] = useState("");

  useEffect(() => {
    if (amcId) {
      fetchUsers();
      fetchStages();
    }
  }, [amcId]);

  const fetchUsers = async () => {
    try {
      const { data } = await supabase.from("user_master").select("id, full_name, email").eq("is_active", true).order("full_name");
      if (data) setUsers(data);
    } catch (e) {
      console.error("Failed to load users", e);
    }
  };

  const fetchStages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("amc_implementation_stages")
        .select(`
          *,
          assigned_user:assigned_to (id, full_name, email)
        `)
        .eq("amc_id", amcId)
        .order("sequence_order", { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        // Auto-initialize standard 7 stages
        await initializeStandardStages();
      } else {
        setStages(data);
      }
    } catch (err: any) {
      console.error("Error loading implementation stages:", err);
      toast.error("Failed to load lifecycle stages: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const initializeStandardStages = async () => {
    try {
      const initialPayloads = DEFAULT_STAGES.map((s, idx) => ({
        amc_id: amcId,
        stage_key: s.stage_key,
        stage_name: s.stage_name,
        sequence_order: idx + 1,
        status: idx === 0 ? 'Completed' : idx === 1 ? 'In Progress' : 'Pending',
        completed_date: idx === 0 ? new Date().toISOString().split('T')[0] : null,
        notes: idx === 0 ? "PO release & procurement completed." : ""
      }));

      const { data, error } = await supabase
        .from("amc_implementation_stages")
        .insert(initialPayloads)
        .select(`*, assigned_user:assigned_to (id, full_name, email)`);

      if (error) throw error;
      setStages(data || []);
      
      // Update main AMC implementation status
      await saveAMCEntity("software_amc", { implementation_status: "Discussion & Discovery" }, amcId);
      if (onUpdate) onUpdate();
    } catch (e: any) {
      console.error("Failed to initialize stages", e);
    }
  };

  const handleUpdateStageField = async (stageId: string, field: keyof ImplementationStage, value: any) => {
    // Optimistic local update
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, [field]: value } : s));

    try {
      setSavingStageId(stageId);
      const updatePayload: any = { [field]: value };

      // If marking as Completed, auto-populate completed_date if empty
      if (field === 'status' && value === 'Completed') {
        const stage = stages.find(s => s.id === stageId);
        if (!stage?.completed_date) {
          const today = new Date().toISOString().split('T')[0];
          updatePayload.completed_date = today;
          setStages(prev => prev.map(s => s.id === stageId ? { ...s, completed_date: today } : s));
        }

        // Check if this is the Go-Live stage
        if (stage?.stage_key === 'go_live') {
          const completedDate = updatePayload.completed_date || stage?.completed_date || new Date().toISOString().split('T')[0];
          await saveAMCEntity("software_amc", {
            put_to_use_date: completedDate,
            implementation_status: "Live / Operational",
            status: "Active"
          }, amcId);
          toast.success("Go-Live achieved! Software is now marked as Active with Put to Use Date.");
          if (onUpdate) onUpdate();
        } else {
          // Update overall software_amc implementation status
          await syncOverallStatus(stageId, value);
        }
      } else if (field === 'status') {
        await syncOverallStatus(stageId, value);
      }

      const res = await saveAMCEntity("amc_implementation_stages", updatePayload, stageId);
      if (!res.success) throw new Error(res.error);
    } catch (err: any) {
      toast.error("Failed to update stage: " + err.message);
      fetchStages();
    } finally {
      setSavingStageId(null);
    }
  };

  const syncOverallStatus = async (stageId: string, newStatus: string) => {
    const updatedStages = stages.map(s => s.id === stageId ? { ...s, status: newStatus as any } : s);
    const activeStage = updatedStages.find(s => s.status === 'In Progress') 
      || updatedStages.filter(s => s.status === 'Completed').pop()
      || updatedStages[0];

    if (activeStage) {
      const displayStatus = activeStage.stage_name.replace(/^\d+\.\s*/, '');
      await saveAMCEntity("software_amc", { implementation_status: displayStatus }, amcId);
      if (onUpdate) onUpdate();
    }
  };

  const handleFileUpload = async (stage: ImplementationStage, file: File) => {
    if (!file || !stage.id) return;
    setUploadingStageId(stage.id);

    try {
      const safeStageKey = stage.stage_key.replace(/[^a-zA-Z0-9]/g, '');
      const fileName = `${amcId}/[STAGE_${safeStageKey}]_${Math.random().toString(36).substring(2, 7)}_${file.name}`;
      
      const { error: uploadErr } = await supabase.storage.from('amc-attachments').upload(fileName, file);
      if (uploadErr) throw uploadErr;

      await handleUpdateStageField(stage.id, "attachment_file_path", fileName);
      toast.success("Stage document uploaded successfully.");
    } catch (err: any) {
      toast.error("File upload failed: " + err.message);
    } finally {
      setUploadingStageId(null);
    }
  };

  const handleDeleteAttachment = async (stage: ImplementationStage) => {
    if (!stage.attachment_file_path || !stage.id) return;
    if (!confirm("Delete this stage attachment?")) return;

    try {
      await supabase.storage.from('amc-attachments').remove([stage.attachment_file_path]);
      await handleUpdateStageField(stage.id, "attachment_file_path", null);
      toast.success("Attachment deleted.");
    } catch (err: any) {
      toast.error("Failed to delete attachment: " + err.message);
    }
  };

  const handleAddCustomStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStageName.trim()) {
      toast.warning("Please enter a stage name.");
      return;
    }

    try {
      const nextSeq = stages.length + 1;
      const newStagePayload = {
        amc_id: amcId,
        stage_key: `custom_${Math.random().toString(36).substring(2, 7)}`,
        stage_name: customStageName.trim(),
        sequence_order: nextSeq,
        status: 'Pending',
        target_date: customStageTargetDate || null,
        assigned_to: customStageAssignedTo || null,
        notes: customStageNotes || ""
      };

      const res = await saveAMCEntity("amc_implementation_stages", newStagePayload);
      if (!res.success) throw new Error(res.error);

      toast.success("Custom stage added.");
      setShowAddCustomModal(false);
      setCustomStageName("");
      setCustomStageTargetDate("");
      setCustomStageAssignedTo("");
      setCustomStageNotes("");
      fetchStages();
    } catch (err: any) {
      toast.error("Failed to add custom stage: " + err.message);
    }
  };

  const handleDeleteCustomStage = async (stageId: string) => {
    if (!confirm("Are you sure you want to delete this stage?")) return;
    try {
      const res = await deleteAMCEntity("amc_implementation_stages", stageId, true);
      if (!res.success) throw new Error(res.error);
      toast.success("Stage removed.");
      fetchStages();
    } catch (err: any) {
      toast.error("Failed to delete stage: " + err.message);
    }
  };

  const handleResetToStandard = async () => {
    if (!confirm("Reset all stages to standard 7 onboarding stages? This will replace existing custom stages.")) return;
    try {
      for (const s of stages) {
        if (s.id) await deleteAMCEntity("amc_implementation_stages", s.id, true);
      }
      await initializeStandardStages();
      toast.success("Stages reset to standard lifecycle.");
    } catch (e: any) {
      toast.error("Failed to reset: " + e.message);
    }
  };

  // Metrics
  const totalStages = stages.length;
  const completedCount = stages.filter(s => s.status === 'Completed').length;
  const progressPercent = totalStages > 0 ? Math.round((completedCount / totalStages) * 100) : 0;
  const currentActiveStage = stages.find(s => s.status === 'In Progress') || stages.find(s => s.status === 'Pending') || stages[stages.length - 1];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-success/10 text-success border border-success/20 flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Completed</span>;
      case 'In Progress':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-theme-btn-primary/10 text-theme-icon border border-theme-btn-primary/20 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 animate-pulse" /> In Progress</span>;
      case 'Blocked':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-danger/10 text-danger border border-danger/20 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" /> Blocked / On Hold</span>;
      case 'Skipped':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-muted/10 text-muted border border-border flex items-center gap-1.5"><X className="h-3.5 w-3.5" /> Skipped</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-muted/10 text-muted border border-border flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Pending</span>;
    }
  };

  const getStageMeta = (key: string) => {
    return DEFAULT_STAGES.find(s => s.stage_key === key) || {
      icon: Sparkles,
      color: "text-theme-icon",
      bgColor: "bg-theme-btn-primary/10",
      borderColor: "border-theme-btn-primary/30",
      description: "Custom implementation milestone."
    };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-theme-icon" />
        <p className="text-xs text-muted">Loading software implementation lifecycle...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Metric & Summary Card */}
      <AppCard className="p-6 theme-card-structural border border-border space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-theme-icon" />
              <h3 className="text-lg font-bold text-foreground">
                Software Onboarding & Implementation Lifecycle
              </h3>
            </div>
            <p className="text-xs text-muted">
              Track progress from initial purchase, discovery discussions, setup, integration, UAT, and rollout to production Go-Live.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <AppButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddCustomModal(true)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add Custom Stage
            </AppButton>
            <AppButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetToStandard}
              title="Reset to 7 standard stages"
              className="text-muted hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
            </AppButton>
          </div>
        </div>

        {/* Progress Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-surface border border-border flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-muted uppercase">Overall Progress</span>
              <div className="text-2xl font-black text-foreground">{progressPercent}%</div>
            </div>
            <div className="h-10 w-10 rounded-full bg-theme-btn-primary/10 text-theme-icon flex items-center justify-center font-bold text-sm">
              {completedCount}/{totalStages}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-muted uppercase">Current Active Stage</span>
              <div className="text-sm font-bold text-foreground truncate max-w-[180px]">
                {currentActiveStage?.stage_name || "Completed"}
              </div>
            </div>
            <div>{currentActiveStage && getStatusBadge(currentActiveStage.status)}</div>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-muted uppercase">Next Target Date</span>
              <div className="text-sm font-bold text-foreground">
                {currentActiveStage?.target_date 
                  ? new Date(currentActiveStage.target_date).toLocaleDateString() 
                  : "Not set"}
              </div>
            </div>
            <Calendar className="h-5 w-5 text-muted" />
          </div>
        </div>

        {/* Live Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full bg-elevated rounded-full h-2.5 overflow-hidden border border-border">
            <div 
              className="bg-gradient-to-r from-theme-btn-primary via-emerald-500 to-success h-full transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted font-medium">
            <span>Purchased (Kickoff)</span>
            <span>{completedCount} of {totalStages} Stages Completed</span>
            <span>Live / Operational</span>
          </div>
        </div>
      </AppCard>

      {/* STAGE PIPELINE TIMELINE */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold uppercase tracking-wider text-theme-icon flex items-center gap-2">
          <Layers className="h-4 w-4" /> Implementation Stages & Sign-Offs
        </h4>

        <div className="space-y-4">
          {stages.map((stage, idx) => {
            const meta = getStageMeta(stage.stage_key);
            const IconComponent = meta.icon;
            const isCustom = stage.stage_key.startsWith('custom_');
            const isEditing = editingStageId === stage.id;

            return (
              <div
                key={stage.id || idx}
                className={`p-5 rounded-2xl border transition-all duration-200 ${
                  stage.status === 'Completed'
                    ? 'bg-surface/90 border-success/30 shadow-sm'
                    : stage.status === 'In Progress'
                    ? 'bg-surface border-theme-btn-primary shadow-md ring-1 ring-theme-btn-primary/20'
                    : 'bg-surface/60 border-border opacity-90'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left: Stage Name, Icon, Description */}
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${meta.bgColor} ${meta.color} shrink-0 mt-0.5 border ${meta.borderColor}`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h5 className="text-base font-bold text-foreground">{stage.stage_name}</h5>
                        {getStatusBadge(stage.status)}
                        {stage.stage_key === 'go_live' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">
                            Syncs Put to Use Date
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted leading-relaxed">
                        {meta.description}
                      </p>
                    </div>
                  </div>

                  {/* Right: Quick Status Changer & Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={stage.status}
                      onChange={(e) => handleUpdateStageField(stage.id!, "status", e.target.value)}
                      className="h-9 px-3 rounded-lg text-xs font-semibold border bg-elevated border-border text-foreground outline-none focus:ring-2 focus:ring-theme-btn-primary/20 cursor-pointer"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Blocked">Blocked / On Hold</option>
                      <option value="Skipped">Skipped</option>
                    </select>

                    <AppButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingStageId(isEditing ? null : stage.id!)}
                      className="h-9 px-2.5 text-xs text-theme-icon hover:bg-theme-btn-primary/10"
                    >
                      <Edit3 className="h-3.5 w-3.5 mr-1" />
                      {isEditing ? "Hide Details" : "Edit / MOM"}
                    </AppButton>

                    {isCustom && (
                      <AppButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCustomStage(stage.id!)}
                        className="h-9 w-9 p-0 text-danger hover:bg-danger/10"
                        title="Delete custom stage"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </AppButton>
                    )}
                  </div>
                </div>

                {/* Always-visible Meta Strip: Owner, Target Date, Completed Date, Attachment */}
                <div className="mt-4 pt-3 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted shrink-0" />
                    <span className="text-muted">Lead / Owner:</span>
                    <select
                      value={stage.assigned_to || ""}
                      onChange={(e) => handleUpdateStageField(stage.id!, "assigned_to", e.target.value || null)}
                      className="text-xs bg-transparent border-none text-foreground font-semibold outline-none cursor-pointer truncate max-w-[130px]"
                    >
                      <option value="">Unassigned</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted shrink-0" />
                    <span className="text-muted">Target:</span>
                    <input
                      type="date"
                      value={stage.target_date || ""}
                      onChange={(e) => handleUpdateStageField(stage.id!, "target_date", e.target.value || null)}
                      className="text-xs bg-transparent border-none text-foreground font-medium outline-none cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-muted shrink-0" />
                    <span className="text-muted">Completed:</span>
                    <input
                      type="date"
                      value={stage.completed_date || ""}
                      onChange={(e) => handleUpdateStageField(stage.id!, "completed_date", e.target.value || null)}
                      className="text-xs bg-transparent border-none text-foreground font-medium outline-none cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 overflow-hidden">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <Paperclip className="h-3.5 w-3.5 text-muted shrink-0" />
                      {stage.attachment_file_path ? (
                        <span className="truncate text-foreground font-medium text-[11px]" title={stage.attachment_file_path}>
                          {stage.attachment_file_path.split('_').slice(2).join('_') || 'Sign-off doc'}
                        </span>
                      ) : (
                        <span className="text-muted italic text-[11px]">No sign-off file</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {stage.attachment_file_path ? (
                        <>
                          <AppButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const url = supabase.storage.from('amc-attachments').getPublicUrl(stage.attachment_file_path!).data.publicUrl;
                              window.open(url, '_blank');
                            }}
                            className="h-6 w-6 p-0 text-theme-icon"
                            title="Download Sign-Off"
                          >
                            <Download className="h-3 w-3" />
                          </AppButton>
                          <AppButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAttachment(stage)}
                            className="h-6 w-6 p-0 text-danger"
                            title="Delete file"
                          >
                            <Trash2 className="h-3 w-3" />
                          </AppButton>
                        </>
                      ) : (
                        <label className="cursor-pointer text-[11px] font-semibold text-theme-icon hover:underline flex items-center gap-1">
                          <Upload className="h-3 w-3" />
                          <span>Attach</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(stage, file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Section: Notes / Minutes of Meeting & Sign-Off Person */}
                {isEditing && (
                  <div className="mt-4 pt-4 border-t border-border space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
                          Sign-Off Person / Approver Name
                        </label>
                        <AppInput
                          value={stage.signoff_person_name || ""}
                          onChange={(e) => handleUpdateStageField(stage.id!, "signoff_person_name", e.target.value)}
                          placeholder="e.g., John Doe (VP Engineering / IT Lead)"
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
                          Stage Sign-Off Document
                        </label>
                        <div className="flex items-center gap-2 h-9">
                          <input
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(stage, file);
                            }}
                            className="text-xs text-muted file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-theme-btn-primary/10 file:text-theme-icon hover:file:bg-theme-btn-primary/20 cursor-pointer flex-1"
                          />
                          {uploadingStageId === stage.id && (
                            <Loader2 className="h-4 w-4 animate-spin text-theme-icon" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
                        Meeting Minutes (MOM), Key Decisions & Progress Remarks
                      </label>
                      <textarea
                        value={stage.notes || ""}
                        onChange={(e) => handleUpdateStageField(stage.id!, "notes", e.target.value)}
                        placeholder="Document key discussion points, blockers, integration details, or meeting minutes for this stage..."
                        className="w-full p-3 rounded-xl text-xs bg-elevated border border-border text-foreground outline-none focus:ring-2 focus:ring-theme-btn-primary/20 min-h-[80px] resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Custom Stage Modal */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-surface/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl p-6 bg-surface border border-border shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Plus className="h-4 w-4 text-theme-icon" /> Add Custom Implementation Stage
              </h3>
              <AppButton variant="secondary" onClick={() => setShowAddCustomModal(false)} className="p-1.5 rounded-lg text-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </AppButton>
            </div>

            <form onSubmit={handleAddCustomStage} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted">
                  Stage Name <span className="text-danger">*</span>
                </label>
                <AppInput
                  value={customStageName}
                  onChange={(e) => setCustomStageName(e.target.value)}
                  placeholder="e.g., Security & Pen-Testing Audit"
                  required
                  className="h-10"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted">Target Date</label>
                  <AppInput
                    type="date"
                    value={customStageTargetDate}
                    onChange={(e) => setCustomStageTargetDate(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted">Assign Lead / Owner</label>
                  <select
                    value={customStageAssignedTo}
                    onChange={(e) => setCustomStageAssignedTo(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg text-xs font-medium border bg-elevated border-border text-foreground outline-none focus:ring-2 focus:ring-theme-btn-primary/20"
                  >
                    <option value="">-- Unassigned --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted">Description / Notes</label>
                <textarea
                  value={customStageNotes}
                  onChange={(e) => setCustomStageNotes(e.target.value)}
                  placeholder="Brief description of requirements or deliverables for this stage..."
                  className="w-full p-3 rounded-xl text-xs bg-elevated border border-border text-foreground outline-none focus:ring-2 focus:ring-theme-btn-primary/20 min-h-[80px] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <AppButton type="button" variant="outline" size="sm" onClick={() => setShowAddCustomModal(false)}>
                  Cancel
                </AppButton>
                <AppButton type="submit" variant="primary" size="sm">
                  Add Stage
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
