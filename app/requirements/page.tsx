"use client";
import { toast } from 'react-toastify';

import React, { useState, useEffect, Suspense } from "react";
import { AppCard, AppCardContent } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppTable, AppTableContainer, AppTableHeader, AppTableRow, AppTableHead, AppTableBody, AppTableCell } from "@/components/ui/AppTable";
import { createClient } from "@/utils/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Plus, RefreshCw, ArrowLeft, ShieldAlert, Trash2, Eye, Edit2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { TicketCreationWizard } from "@/components/tickets/TicketCreationWizard";
import { EditRequirementModal } from "@/components/requirements/EditRequirementModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDate } from "@/components/ui/data";
import ChandakLoader from "@/components/ui/ChandakLoader";

interface RequirementItem {
  id: string;
  dbId: string;
  title: string;
  scope: string;
  softwareSystem: string;
  module: string;
  subModule: string;
  category: string;
  subCategory: string;
  priority: string;
  priorityColor: string | null;
  department: string;
  createdBy: string;
  stage: string;
  approvalStatus: string;
  currentApprover: string;
  currentApproverId?: string | null;
  createdAt: string;
  ageing: number;
  storyPoints: number;
  acceptanceCriteria?: string;
  tags: string[];
  targetRelease?: string;
  objective?: string;
  functionalScope?: string;
  technicalScope?: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  updatedAt?: string;
  customFields?: any;
  dueDate?: string | null;
  sourceTicketId?: string | null;
  requesterDepartmentId?: string | null;
  requirementReason?: string | null;
  budgetImpact?: string | null;
  estimatedEffort?: string | null;
  estimatedCost?: number | null;
  dependencyNotes?: string | null;
  startDate?: string | null;
  expectedCompletionDate?: string | null;
  actualCompletionDate?: string | null;
  requirementTypeId?: string | null;
  businessCriticalityId?: string | null;
  businessValueId?: string | null;
  projectId?: string | null;
  sprintId?: string | null;
  releaseVersion?: string | null;
  ownerId?: string | null;
  coordinatorId?: string | null;
  tatStatus?: string | null;
  overdueDays?: number;
  remainingDays?: number;
  regulatoryMapping?: string | null;
  requirementDetails?: string | null;
  requesterDesignationId?: string | null;
  intakeSnapshot?: any;
  putToUseDate?: string | null;
  deleteReason?: string | null;
  deleteBatchId?: string | null;
  amendmentVersion?: number;
  revisedDetails?: string | null;
}

export default function RequirementsPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><ChandakLoader size="lg" title="Loading Requirements..." /></div>}>
      <RequirementsPageContent />
    </Suspense>
  );
}

function RequirementsPageContent() {
  const router = useRouter();
  const supabase = createClient();
  const { hasPermission, loading: permsLoading } = usePermissions();
  
  const [mounted, setMounted] = useState(false);
  const [reqs, setReqs] = useState<RequirementItem[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [editReqId, setEditReqId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [filter, setFilter] = useState({ search: "", system: "", status: "", priority: "", department: "", stage: "" });

  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams?.get("create") === "true") {
      setShowWizard(true);
    }
  }, [searchParams]);

  useEffect(() => {
    setMounted(true);
    setIsSuperAdmin(hasPermission("SUPER_ADMIN"));
  }, [hasPermission]);

  const loadRequirements = async () => {
    setLoadingReqs(true);
    try {
      const m = await import("@/lib/actions/requirements");
      const data = await m.fetchRequirements();
      
      // Fetch assets for INFRA mapping
      const { data: assets } = await supabase.from('assets').select('id, name').eq('is_deleted', false);
      const assetMap = new Map(assets?.map((a: any) => [a.id, a.name]) || []);
      
      const mapped = data.map((d: any) => {
        const createdDate = new Date(d.created_at);
        const diffTime = Math.abs(new Date().getTime() - createdDate.getTime());
        const ageingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let statusStr = d?.approval_status || 'Draft';
        if (d?.requirement_approval_flow && Array.isArray(d.requirement_approval_flow) && d.requirement_approval_flow.length > 0) {
          if (statusStr === 'Pending' || statusStr === 'Pending Approval') {
            const pendingLevel = d.requirement_approval_flow.find((f: any) => f?.status === 'Pending')?.level;
            const levels = d.requirement_approval_flow.map((f: any) => f?.level).filter((l: any) => typeof l === 'number');
            const totalLevels = levels.length > 0 ? Math.max(...levels) : 1;
            if (pendingLevel) {
              statusStr = `${statusStr.toUpperCase()} (L${pendingLevel}/${totalLevels})`;
            }
          }
        }

        return {
          id: d?.code || d?.requirement_code || d?.id,
          dbId: d?.id,
          title: d?.title || 'Untitled',
          scope: d?.scope || '-',
          softwareSystem: d?.scope === 'INFRA' 
            ? (d?.custom_fields?.intake_snapshot?.assetId ? assetMap.get(d?.custom_fields?.intake_snapshot?.assetId) || '-' : '-') 
            : (d?.software_system?.name || '-'),
          module: d?.module?.name || '-',
          subModule: d?.sub_module?.name || '-',
          category: d?.category?.name || '-',
          subCategory: d?.sub_category?.name || '-',
          priority: d?.priority?.name || '-',
          priorityColor: d?.priority?.priority_color || null,
          department: d?.department?.name || '-',
          createdBy: d?.creator?.full_name || '-',
          stage: d?.current_stage || d?.status?.status_name || 'Requirement Registration',
          approvalStatus: statusStr,
          currentApprover: d?.current_assignee_id ? 'Assigned' : '-', 
          currentApproverId: d.current_assignee_id,
          createdAt: formatDate(createdDate),
          ageing: ageingDays,
          storyPoints: d.estimated_effort ? parseInt(d.estimated_effort, 10) : 0,
          acceptanceCriteria: d.acceptance_criteria || '',
          tags: d.tags || [],
          targetRelease: d.target_release || d.release_version || '-',
          objective: d.objective,
          functionalScope: d.functional_scope,
          technicalScope: d.technical_scope,
          isDeleted: d.is_deleted,
          deletedAt: d.deleted_at,
          deletedBy: d.deleted_by,
          updatedAt: d.updated_at,
          customFields: d.custom_fields,
          dueDate: d.due_date,
          sourceTicketId: d.source_ticket_id,
          requesterDepartmentId: d.requester_department_id,
          requirementReason: d.requirement_reason,
          budgetImpact: d.budget_impact,
          estimatedEffort: d.estimated_effort,
          estimatedCost: d.estimated_cost,
          dependencyNotes: d.dependency_notes,
          startDate: d.start_date,
          expectedCompletionDate: d.expected_completion_date,
          actualCompletionDate: d.actual_completion_date,
          requirementTypeId: d.requirement_type_id,
          businessCriticalityId: d.business_criticality_id,
          businessValueId: d.business_value_id,
          projectId: d.project_id,
          sprintId: d.sprint_id,
          releaseVersion: d.release_version,
          ownerId: d.owner_id,
          coordinatorId: d.coordinator_id,
          tatStatus: d.tat_status,
          overdueDays: d.overdue_days || 0,
          remainingDays: d.remaining_days || 0,
          regulatoryMapping: d.regulatory_mapping,
          requirementDetails: d.requirement_details,
          requesterDesignationId: d.requester_designation_id,
          intakeSnapshot: d.intake_snapshot,
          putToUseDate: d.put_to_use_date,
          deleteReason: d.delete_reason,
          deleteBatchId: d.delete_batch_id,
          amendmentVersion: d.amendment_version || 0,
          revisedDetails: d.revised_details,
        };
      });
      setReqs(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReqs(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, dbId: string) => {
    e.stopPropagation();
    setDeleteTargetId(dbId);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      const { deleteRequirement } = await import("@/lib/actions/requirements");
      const { data: { user } } = await supabase.auth.getUser();
      const res = await deleteRequirement(deleteTargetId, user!.id);
      if (res?.error) throw new Error(res.error);
      setDeleteTargetId(null);
      await loadRequirements();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete requirement.");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      loadRequirements();
    }
  }, [mounted]);

  if (!mounted || permsLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center transition-colors duration-300 bg-background">
        <ChandakLoader
          size="lg"
          title="Verifying Permissions..."
          subtitle="Loading requirements pipeline"
        />
      </div>
    );
  }

  if (!hasPermission("REQUIREMENTS_VIEW")) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4 transition-colors duration-300 bg-background text-foreground">
        <div className="p-4 rounded-full bg-danger-soft border border-danger/30 text-danger">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-xs text-muted">You do not have capabilities to view the Requirement Module.</p>
      </div>
    );
  }

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="Requirement Registration Repository"
        badge={<AppBadge variant="info">List View</AppBadge>}
        actions={
          <>
            <Link href="/">
              <AppButton type="button" variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back
              </AppButton>
            </Link>
            <AppButton 
              type="button"
              variant="outline" 
              size="sm" 
              leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loadingReqs ? 'animate-spin' : ''}`} />}
              onClick={loadRequirements}
            >
              Refresh
            </AppButton>
            <AppButton 
              type="button"
              variant="outline" 
              size="sm" 
              leftIcon={<ShieldAlert className="h-3.5 w-3.5 text-warning" />}
              onClick={() => router.push('/requirements/approvals')}
              className="border-warning/30 bg-warning-soft hover:bg-warning-soft text-warning-text"
            >
              Go to Approvals
            </AppButton>
            {hasPermission("REQUIREMENTS_REPORTS_VIEW") && (
              <AppButton 
                type="button"
                variant="outline" 
                size="sm" 
                onClick={() => router.push('/requirements/reports')}
                className="border-primary/30 bg-primary-soft hover:bg-primary-soft text-primary-text"
              >
                Analysis & Reports
              </AppButton>
            )}
            <AppButton 
              type="button"
              variant="primary" 
              size="sm" 
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              disabled={!hasPermission("REQUIREMENTS_CREATE")}
              onClick={() => setShowWizard(true)}
            >
              Create Requirement
            </AppButton>
          </>
        }
      />

      {showWizard && (
        <TicketCreationWizard 
          onClose={() => setShowWizard(false)}
          onSuccess={(id) => {
            setShowWizard(false);
            loadRequirements();
          }}
        />
      )}

      {editReqId && (
        <EditRequirementModal 
          reqId={editReqId}
          onClose={() => setEditReqId(null)}
          onSuccess={() => {
            setEditReqId(null);
            loadRequirements();
          }}
        />
      )}

      {/* Filters Grid */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 px-1">
        <div className="col-span-2 sm:col-span-1">
          <label className="theme-label block mb-1 ml-1">Search</label>
          <AppInput 
            placeholder="Search Title or Req #..." 
            value={filter.search}
            onChange={(e: any) => setFilter(f => ({ ...f, search: e.target.value }))}
          />
        </div>
        <div>
          <label className="theme-label block mb-1 ml-1">System / Asset</label>
          <select 
            className="w-full text-xs sm:text-sm p-2 border border-border rounded-md bg-elevated text-foreground focus:ring-1 focus:ring-theme-btn-primary h-9 outline-none"
            value={filter.system}
            onChange={(e: any) => setFilter(f => ({ ...f, system: e.target.value }))}
          >
            <option value="">ALL</option>
            {Array.from(new Set(reqs.map(r => r.softwareSystem).filter(s => s !== '-'))).map(sys => (
              <option key={sys} value={sys}>{sys}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="theme-label block mb-1 ml-1">Status</label>
          <select 
            className="w-full text-xs sm:text-sm p-2 border border-border rounded-md bg-elevated text-foreground focus:ring-1 focus:ring-theme-btn-primary h-9 outline-none"
            value={filter.status}
            onChange={(e: any) => setFilter(f => ({ ...f, status: e.target.value }))}
          >
            <option value="">ALL</option>
            {Array.from(new Set(reqs.map(r => r.approvalStatus))).map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="theme-label block mb-1 ml-1">Priority</label>
          <select 
            className="w-full text-xs sm:text-sm p-2 border border-border rounded-md bg-elevated text-foreground focus:ring-1 focus:ring-theme-btn-primary h-9 outline-none"
            value={filter.priority}
            onChange={(e: any) => setFilter(f => ({ ...f, priority: e.target.value }))}
          >
            <option value="">ALL</option>
            {Array.from(new Set(reqs.map(r => r.priority).filter(p => p !== '-'))).map(pri => (
              <option key={pri} value={pri}>{pri}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="theme-label block mb-1 ml-1">Department</label>
          <select 
            className="w-full text-xs sm:text-sm p-2 border border-border rounded-md bg-elevated text-foreground focus:ring-1 focus:ring-theme-btn-primary h-9 outline-none"
            value={filter.department}
            onChange={(e: any) => setFilter(f => ({ ...f, department: e.target.value }))}
          >
            <option value="">ALL</option>
            {Array.from(new Set(reqs.map(r => r.department).filter(d => d !== '-'))).map(dep => (
              <option key={dep} value={dep}>{dep}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="theme-label block mb-1 ml-1">Flow/Stage</label>
          <select 
            className="w-full text-xs sm:text-sm p-2 border border-border rounded-md bg-elevated text-foreground focus:ring-1 focus:ring-theme-btn-primary h-9 outline-none"
            value={filter.stage}
            onChange={(e: any) => setFilter(f => ({ ...f, stage: e.target.value }))}
          >
            <option value="">ALL</option>
            {Array.from(new Set(reqs.map(r => r.stage).filter(c => c !== '-'))).map(stg => (
              <option key={stg} value={stg}>{stg}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex-1 overflow-hidden flex flex-col min-h-0">
        {/* Mobile / Tablet Requirements Cards (<1024px) */}
        <div className="block lg:hidden flex-1 overflow-y-auto space-y-3">
          {reqs.filter(r => {
            if (filter.search && !r.title.toLowerCase().includes(filter.search.toLowerCase()) && !r.id.toLowerCase().includes(filter.search.toLowerCase())) return false;
            if (filter.system && r.softwareSystem !== filter.system) return false;
            if (filter.status && r.approvalStatus !== filter.status) return false;
            if (filter.priority && r.priority !== filter.priority) return false;
            if (filter.department && r.department !== filter.department) return false;
            if (filter.stage && r.stage !== filter.stage) return false;
            return true;
          }).length === 0 ? (
            <div className="text-center py-12 text-muted text-sm border border-border rounded-xl bg-elevated/40">
              {loadingReqs ? "Loading requirements..." : "No requirements found."}
            </div>
          ) : (
            reqs.filter(r => {
              if (filter.search && !r.title.toLowerCase().includes(filter.search.toLowerCase()) && !r.id.toLowerCase().includes(filter.search.toLowerCase())) return false;
              if (filter.system && r.softwareSystem !== filter.system) return false;
              if (filter.status && r.approvalStatus !== filter.status) return false;
              if (filter.priority && r.priority !== filter.priority) return false;
              if (filter.department && r.department !== filter.department) return false;
              if (filter.stage && r.stage !== filter.stage) return false;
              return true;
            }).map((r, index) => {
              const staggerClass = index < 8 ? `delay-${index + 1}` : "";
              return (
                <div 
                  key={r.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/requirements/${r.dbId}?tab=analysis`)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/requirements/${r.dbId}?tab=analysis`); } }}
                  className={`rounded-2xl border border-border bg-surface p-4 shadow-xs hover:border-theme-btn-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer space-y-3 relative animate-stagger-in ${staggerClass}`}
                >
                  {/* Top Row: Code, Priority, Approval Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-xs font-bold text-foreground bg-elevated border border-border px-2 py-0.5 rounded-md shrink-0">
                        {r.id}
                      </span>
                      {r.priority !== '-' && (
                        <AppBadge 
                          variant="custom"
                          customColor={r.priorityColor || 'var(--muted)'}
                          className="text-[10px]"
                        >
                          {r.priority}
                        </AppBadge>
                      )}
                    </div>
                    <AppBadge 
                      variant={r.approvalStatus === 'APPROVED' ? 'success' : r.approvalStatus === 'REJECTED' ? 'danger' : 'warning'}
                      withPulse={r.approvalStatus === 'PENDING' || r.approvalStatus === 'IN_REVIEW'}
                      className="text-[10px]"
                    >
                      {r.approvalStatus}
                    </AppBadge>
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className="text-sm font-bold text-foreground line-clamp-2 hover:text-theme-btn-primary transition-colors">
                      {r.title}
                    </h3>
                  </div>

                  {/* System, Module, Department */}
                  <div className="flex items-center gap-2 text-xs text-muted flex-wrap">
                    {r.softwareSystem && r.softwareSystem !== '-' && (
                      <span className="bg-elevated px-2 py-0.5 rounded text-[10px] font-bold text-foreground/80">
                        {r.softwareSystem}
                      </span>
                    )}
                    {r.module && r.module !== '-' && (
                      <span className="text-muted text-[11px]">› {r.module}</span>
                    )}
                    {r.department && r.department !== '-' && (
                      <span className="bg-elevated px-2 py-0.5 rounded text-[10px] font-semibold text-muted ml-auto">
                        {r.department}
                      </span>
                    )}
                  </div>

                  {/* Bottom Row: Created By, Date & Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
                    <div className="text-[11px] text-muted truncate max-w-[150px]">
                      <span>{r.createdBy || 'Unknown'}</span> • <span>{r.createdAt}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <AppButton 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-xs text-accent hover:bg-accent/10 rounded-lg flex items-center gap-1 active:scale-95 transition-all"
                        onClick={() => router.push(`/requirements/${r.dbId}?mode=view`)}
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </AppButton>
                      {(isSuperAdmin || hasPermission('REQUIREMENTS_UPDATE')) && (
                        <AppButton 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2 text-xs text-theme-icon hover:bg-theme-btn-primary/10 rounded-lg flex items-center gap-1 active:scale-95 transition-all"
                          onClick={() => router.push(`/requirements/${r.dbId}?tab=analysis`)}
                        >
                          <Edit2 className="h-3.5 w-3.5" /> Analysis
                        </AppButton>
                      )}
                      {(isSuperAdmin || hasPermission('REQUIREMENTS_DELETE')) && (
                        <AppButton 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 text-muted hover:text-danger rounded-lg flex items-center justify-center active:scale-95 transition-all"
                          onClick={(e) => handleDeleteClick(e, r.dbId)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </AppButton>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Virtualized Table (>=1024px) */}
        <div className="hidden lg:block flex-1 overflow-hidden">
          <AppTableContainer className="h-full overflow-y-auto">
            <AppTable>
              <AppTableHeader>
                <AppTableRow className="bg-surface/50 dark:bg-surface/10 hover:bg-transparent">
                  <AppTableHead className="w-[150px]">REQ #</AppTableHead>
                  <AppTableHead className="min-w-[200px]">Title</AppTableHead>
                  <AppTableHead>System / Asset</AppTableHead>
                  <AppTableHead>Module</AppTableHead>
                  <AppTableHead>Submodule</AppTableHead>
                  <AppTableHead>Particulars</AppTableHead>
                  <AppTableHead>Priority</AppTableHead>
                  <AppTableHead>Est. Pts</AppTableHead>
                  <AppTableHead>Release</AppTableHead>
                  <AppTableHead>Department</AppTableHead>
                  <AppTableHead>Created By</AppTableHead>
                  <AppTableHead>Created Date</AppTableHead>
                  <AppTableHead>Approval</AppTableHead>
                  <AppTableHead className="w-24 text-center">Action</AppTableHead>
                </AppTableRow>
              </AppTableHeader>
              <AppTableBody>
                {reqs.filter(r => {
                  if (filter.search && !r.title.toLowerCase().includes(filter.search.toLowerCase()) && !r.id.toLowerCase().includes(filter.search.toLowerCase())) return false;
                  if (filter.system && r.softwareSystem !== filter.system) return false;
                  if (filter.status && r.approvalStatus !== filter.status) return false;
                  if (filter.priority && r.priority !== filter.priority) return false;
                  if (filter.department && r.department !== filter.department) return false;
                  if (filter.stage && r.stage !== filter.stage) return false;
                  return true;
                }).length === 0 ? (
                  <AppTableRow>
                    <AppTableCell colSpan={14} className="text-center py-8 text-muted animate-in fade-in duration-300">
                      {loadingReqs ? "Loading requirements..." : "No requirements found."}
                    </AppTableCell>
                  </AppTableRow>
                ) : (
                  reqs.filter(r => {
                    if (filter.search && !r.title.toLowerCase().includes(filter.search.toLowerCase()) && !r.id.toLowerCase().includes(filter.search.toLowerCase())) return false;
                    if (filter.system && r.softwareSystem !== filter.system) return false;
                    if (filter.status && r.approvalStatus !== filter.status) return false;
                    if (filter.priority && r.priority !== filter.priority) return false;
                    if (filter.department && r.department !== filter.department) return false;
                    if (filter.stage && r.stage !== filter.stage) return false;
                    return true;
                  }).map((r, index) => {
                    const staggerClass = index < 10 ? `delay-${index + 1}` : "";
                    return (
                      <AppTableRow 
                        key={r.id} 
                        className={`cursor-pointer hover:bg-surface-hover/80 transition-colors animate-stagger-in ${staggerClass}`}
                        onClick={() => router.push(`/requirements/${r.dbId}?tab=analysis`)}
                      >
                        <AppTableCell className="font-mono text-xs font-bold text-foreground">{r.id}</AppTableCell>
                        <AppTableCell className="font-medium text-sm max-w-[200px] truncate group-hover:text-theme-btn-primary transition-colors" title={r.title}>{r.title}</AppTableCell>
                        <AppTableCell className="text-xs">{r.softwareSystem}</AppTableCell>
                        <AppTableCell className="text-xs">{r.module}</AppTableCell>
                        <AppTableCell className="text-xs">{r.subModule}</AppTableCell>
                        <AppTableCell className="text-xs">{r.subCategory}</AppTableCell>
                        <AppTableCell>
                          {r.priority !== '-' ? (
                            <AppBadge 
                              variant="custom"
                              customColor={r.priorityColor || 'var(--muted)'}
                              className="text-[10px]"
                            >
                              {r.priority}
                            </AppBadge>
                          ) : '-'}
                        </AppTableCell>
                        <AppTableCell>
                          {r.storyPoints > 0 ? (
                            <AppBadge variant="info">{r.storyPoints} pts</AppBadge>
                          ) : (
                            <span className="text-muted text-xs">-</span>
                          )}
                        </AppTableCell>
                        <AppTableCell className="text-xs">{r.targetRelease || '-'}</AppTableCell>
                        <AppTableCell className="text-xs">{r.department || '-'}</AppTableCell>
                        <AppTableCell className="text-xs font-medium">{r.createdBy || '-'}</AppTableCell>
                        <AppTableCell className="text-xs text-muted-foreground">{r.createdAt}</AppTableCell>
                        <AppTableCell>
                          <AppBadge 
                            variant={r.approvalStatus === 'Approved' ? 'success' : r.approvalStatus === 'Rejected' ? 'danger' : r.approvalStatus?.includes('Pending') ? 'warning' : 'neutral'}
                            withPulse={r.approvalStatus?.includes('Pending')}
                            className="text-[10px]"
                          >
                            {r.approvalStatus}
                          </AppBadge>
                        </AppTableCell>
                        <AppTableCell>
                          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <AppButton 
                              type="button"
                              variant="ghost" 
                              size="sm" 
                              title="View"
                              aria-label="View requirement"
                              className="h-7 w-7 p-0 text-accent hover:text-accent/80 hover:bg-accent/10 rounded-lg flex items-center justify-center transition-all"
                              onClick={() => router.push(`/requirements/${r.dbId}?mode=view`)}
                            >
                              <Eye className="h-4 w-4" />
                            </AppButton>
                            {(isSuperAdmin || hasPermission('REQUIREMENTS_UPDATE')) && (
                              <AppButton 
                                type="button"
                                variant="ghost" 
                                size="sm" 
                                title="Edit Business Analysis"
                                aria-label="Edit Business Analysis"
                                className="h-7 w-7 p-0 text-theme-icon hover:text-theme-icon hover:bg-theme-btn-primary/10 rounded-lg flex items-center justify-center transition-all"
                                onClick={() => router.push(`/requirements/${r.dbId}?tab=analysis`)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </AppButton>
                            )}
                            {(isSuperAdmin || hasPermission('REQUIREMENTS_DELETE')) && (
                              <AppButton 
                                type="button"
                                variant="ghost" 
                                size="sm" 
                                title="Delete"
                                aria-label="Delete requirement"
                                className="h-7 w-7 p-0 text-muted hover:text-danger hover:bg-danger-soft rounded-lg flex items-center justify-center transition-all"
                                onClick={(e) => handleDeleteClick(e, r.dbId)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </AppButton>
                            )}
                          </div>
                        </AppTableCell>
                      </AppTableRow>
                    );
                  })
                )}
              </AppTableBody>
            </AppTable>
          </AppTableContainer>
        </div>
      </div>

      <ConfirmDialog 
        open={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDelete}
        title="Delete Requirement"
        description="Are you sure you want to permanently delete this requirement? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
      />
    </PageContainer>
  );
}
