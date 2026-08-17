"use client";

import React, { useState, useEffect } from "react";
import { AppCard, AppCardContent } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppTable, AppTableContainer, AppTableHeader, AppTableRow, AppTableHead, AppTableBody, AppTableCell } from "@/components/ui/AppTable";
import { createClient } from "@/utils/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Plus, RefreshCw, ArrowLeft, ShieldAlert, Trash2, Eye, Edit2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { TicketCreationWizard } from "@/components/tickets/TicketCreationWizard";
import { EditRequirementModal } from "@/components/requirements/EditRequirementModal";

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
  const router = useRouter();
  const supabase = createClient();
  const { hasPermission, loading: permsLoading } = usePermissions();
  
  const [mounted, setMounted] = useState(false);
  const [reqs, setReqs] = useState<RequirementItem[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [editReqId, setEditReqId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [filter, setFilter] = useState({ search: "", system: "", status: "", priority: "", department: "", stage: "" });

  useEffect(() => {
    setMounted(true);
    setIsSuperAdmin(hasPermission("SUPER_ADMIN"));
  }, [hasPermission]);

  const loadRequirements = async () => {
    setLoadingReqs(true);
    try {
      const m = await import("@/lib/actions/requirements");
      const data = await m.fetchRequirements();
      
      const mapped = data.map((d: any) => {
        const createdDate = new Date(d.created_at);
        const diffTime = Math.abs(new Date().getTime() - createdDate.getTime());
        const ageingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let statusStr = d.approval_status || 'Draft';
        if (d.requirement_approval_flow && d.requirement_approval_flow.length > 0) {
          if (statusStr === 'Pending' || statusStr === 'Pending Approval') {
            const pendingLevel = d.requirement_approval_flow.find((f: any) => f.status === 'Pending')?.level;
            const totalLevels = Math.max(...d.requirement_approval_flow.map((f: any) => f.level));
            if (pendingLevel) {
              statusStr = `${statusStr.toUpperCase()} (L${pendingLevel}/${totalLevels})`;
            }
          }
        }

        return {
          id: d.code || d.requirement_code || d.id,
          dbId: d.id,
          title: d.title || 'Untitled',
          scope: d.scope || '-',
          softwareSystem: d.software_system?.name || '-',
          module: d.module?.name || '-',
          subModule: d.sub_module?.name || '-',
          category: d.category?.name || '-',
          subCategory: d.sub_category?.name || '-',
          priority: d.priority?.name || '-',
          priorityColor: d.priority?.priority_color || null,
          department: d.department?.name || '-',
          createdBy: d.creator?.full_name || '-',
          stage: d.current_stage || d.status?.status_name || 'Requirement Registration',
          approvalStatus: statusStr,
          currentApprover: d.current_assignee_id ? 'Assigned' : '-', 
          currentApproverId: d.current_assignee_id,
          createdAt: createdDate.toLocaleDateString(),
          ageing: ageingDays,
          storyPoints: d.story_points || 0,
          acceptanceCriteria: d.acceptance_criteria || '',
          tags: d.tags || [],
          targetRelease: d.target_release || '-',
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

  const handleDelete = async (e: React.MouseEvent, dbId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to permanently delete this requirement? This action cannot be undone.")) return;
    try {
      const { deleteRequirement } = await import("@/lib/actions/requirements");
      const { data: { user } } = await supabase.auth.getUser();
      await deleteRequirement(dbId, user!.id);
      await loadRequirements();
    } catch (err: any) {
      alert(err.message || "Failed to delete requirement.");
    }
  };

  useEffect(() => {
    if (mounted) {
      loadRequirements();
    }
  }, [mounted]);

  if (!mounted || permsLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4 transition-colors duration-300 bg-background dark:bg-[#070913]">
        <div className="animate-spin h-10 w-10 border-2 border-theme-btn-primary border-t-transparent rounded-full shadow-lg shadow-indigo-500/20" />
      </div>
    );
  }

  if (!hasPermission("REQUIREMENTS_VIEW")) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4 transition-colors duration-300 bg-background dark:bg-[#070913] text-foreground dark:text-white">
        <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
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
        description="Centralized repository for all operational business requirements."
        badge={<AppBadge variant="info">List View</AppBadge>}
        actions={
          <>
            <Link href="/">
              <AppButton variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back
              </AppButton>
            </Link>
            <AppButton 
              variant="outline" 
              size="sm" 
              leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loadingReqs ? 'animate-spin' : ''}`} />}
              onClick={loadRequirements}
            >
              Refresh
            </AppButton>
            <AppButton 
              variant="outline" 
              size="sm" 
              leftIcon={<ShieldAlert className="h-3.5 w-3.5 text-amber-500" />}
              onClick={() => router.push('/requirements/approvals')}
              className="border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-100 dark:border-amber-800/50"
            >
              Go to Approvals
            </AppButton>
            {hasPermission("REQUIREMENTS_REPORTS_VIEW") && (
              <AppButton 
                variant="outline" 
                size="sm" 
                onClick={() => router.push('/requirements/reports')}
                className="border-theme-btn-primary/30 bg-theme-btn-primary/10 hover:bg-theme-btn-primary/10 text-theme-icon-secondary dark:bg-theme-btn-primary/10 dark:text-indigo-100 dark:border-indigo-800/50"
              >
                Analysis & Reports
              </AppButton>
            )}
            <AppButton 
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

      <div className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-3 px-1">
        <div>
          <div className="text-[10px] text-muted uppercase font-bold mb-1 ml-1 tracking-wider">Search</div>
          <AppInput 
            placeholder="Search by Title or Req #..." 
            value={filter.search}
            onChange={(e: any) => setFilter(f => ({ ...f, search: e.target.value }))}
          />
        </div>
        <div>
          <div className="text-[10px] text-muted uppercase font-bold mb-1 ml-1 tracking-wider">System</div>
          <select 
            className="w-full text-sm p-2 border border-border dark:border-white/10 rounded-md bg-surface dark:bg-[#0a0d14] text-foreground dark:text-gray-100 focus:ring-theme-btn-primary"
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
          <div className="text-[10px] text-muted uppercase font-bold mb-1 ml-1 tracking-wider">Status</div>
          <select 
            className="w-full text-sm p-2 border border-border dark:border-white/10 rounded-md bg-surface dark:bg-[#0a0d14] text-foreground dark:text-gray-100 focus:ring-theme-btn-primary"
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
          <div className="text-[10px] text-muted uppercase font-bold mb-1 ml-1 tracking-wider">Priority</div>
          <select 
            className="w-full text-sm p-2 border border-border dark:border-white/10 rounded-md bg-surface dark:bg-[#0a0d14] text-foreground dark:text-gray-100 focus:ring-theme-btn-primary"
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
          <div className="text-[10px] text-muted uppercase font-bold mb-1 ml-1 tracking-wider">Department</div>
          <select 
            className="w-full text-sm p-2 border border-border dark:border-white/10 rounded-md bg-surface dark:bg-[#0a0d14] text-foreground dark:text-gray-100 focus:ring-theme-btn-primary"
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
          <div className="text-[10px] text-muted uppercase font-bold mb-1 ml-1 tracking-wider">Flow/Stage</div>
          <select 
            className="w-full text-sm p-2 border border-border dark:border-white/10 rounded-md bg-surface dark:bg-[#0a0d14] text-foreground dark:text-gray-100 focus:ring-theme-btn-primary"
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
        <AppTableContainer className="flex-1 overflow-y-auto">
          <AppTable>
            <AppTableHeader>
              <AppTableRow>
                <AppTableHead>Req #</AppTableHead>
                <AppTableHead>Title</AppTableHead>
                <AppTableHead>System</AppTableHead>
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
                  <AppTableCell colSpan={14} className="text-center py-8 text-muted">
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
                }).map((r) => (
                  <AppTableRow 
                    key={r.id} 
                    className="cursor-pointer hover:bg-theme-btn-primary/10/50 dark:hover:bg-surface/[0.02] transition-colors"
                    onClick={() => router.push(`/requirements/${r.dbId}?tab=analysis`)}
                  >
                    <AppTableCell className="font-mono text-xs font-bold text-amber-400">{r.id}</AppTableCell>
                    <AppTableCell className="font-medium text-sm max-w-[200px] truncate" title={r.title}>{r.title}</AppTableCell>
                    <AppTableCell className="text-xs">{r.softwareSystem}</AppTableCell>
                    <AppTableCell className="text-xs">{r.module}</AppTableCell>
                    <AppTableCell className="text-xs">{r.subModule}</AppTableCell>
                    <AppTableCell className="text-xs">{r.subCategory}</AppTableCell>
                    <AppTableCell>
                      {r.priority !== '-' ? (
                        <span 
                          className="px-2 py-1 rounded text-[10px] font-bold text-foreground shadow-sm"
                          style={{ backgroundColor: r.priorityColor || '#6B7280' }}
                        >
                          {r.priority}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </AppTableCell>
                    <AppTableCell>
                      {r.storyPoints > 0 ? (
                        <AppBadge variant="info">{r.storyPoints} pts</AppBadge>
                      ) : (
                        <span className="text-muted text-xs">-</span>
                      )}
                    </AppTableCell>
                    <AppTableCell className="text-xs">{r.targetRelease}</AppTableCell>
                    <AppTableCell className="text-xs">{r.department}</AppTableCell>
                    <AppTableCell className="text-xs">{r.createdBy}</AppTableCell>
                    <AppTableCell className="text-xs">{r.createdAt}</AppTableCell>
                    <AppTableCell>
                       <AppBadge variant={r.approvalStatus === 'Approved' ? 'success' : r.approvalStatus === 'Rejected' ? 'danger' : r.approvalStatus === 'Pending Approval' ? 'warning' : 'neutral'}>
                         {r.approvalStatus}
                       </AppBadge>
                    </AppTableCell>
                    <AppTableCell>
                      <div className="flex items-center justify-center gap-0">
                        <AppButton 
                          variant="ghost" 
                          size="sm" 
                          title="View"
                          className="h-7 w-7 p-0 text-sky-500 hover:text-sky-600 hover:bg-sky-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/requirements/${r.dbId}?mode=view`);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </AppButton>
                        {(isSuperAdmin || hasPermission('REQUIREMENTS_UPDATE')) && (
                          <AppButton 
                            variant="ghost" 
                            size="sm" 
                            title="Edit Business Analysis"
                            className="h-7 w-7 p-0 text-theme-icon hover:text-theme-icon hover:bg-theme-btn-primary/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/requirements/${r.dbId}?tab=analysis`);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </AppButton>
                        )}
                        {(isSuperAdmin || hasPermission('REQUIREMENTS_DELETE')) && (
                          <AppButton 
                            variant="ghost" 
                            size="sm" 
                            title="Delete"
                            className="h-7 w-7 p-0 text-muted hover:text-rose-500 hover:bg-rose-500/10"
                            onClick={(e) => handleDelete(e, r.dbId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </AppButton>
                        )}
                      </div>
                    </AppTableCell>
                  </AppTableRow>
                ))
              )}
            </AppTableBody>
          </AppTable>
        </AppTableContainer>
      </div>
    </PageContainer>
  );
}
