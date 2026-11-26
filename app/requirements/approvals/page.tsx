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
import { QuickApprovalModal } from "@/components/requirements/QuickApprovalModal";
import ChandakLoader from "@/components/ui/ChandakLoader";
import { formatDate, StatusBadge, PriorityIndicator, UserCell } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/feedback/States";

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
  createdById: string | null;
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserDepartmentId, setCurrentUserDepartmentId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [filter, setFilter] = useState({ search: "", system: "", priority: "", department: "", status: "" });

  useEffect(() => {
    setMounted(true);
    const fetchUserRole = async () => {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return;
       const { data: userRoles } = await supabase
         .from('user_roles')
         .select('roles(code)')
         .eq('user_id', user.id);
       setIsSuperAdmin(userRoles?.some((ur: any) => ['SUPER_ADMIN', 'ROLE_SUPER_ADMIN', 'ADMIN_ROLE', 'ROLE_ADMIN'].includes(ur.roles?.code)) ?? false);
       setCurrentUserId(user.id);
       
       const { data: userData } = await supabase.from('user_master').select('department_id').eq('id', user.id).single();
       if (userData) {
           setCurrentUserDepartmentId(userData.department_id);
       }
    };
    fetchUserRole();
  }, []);

  const loadRequirements = async () => {
    setLoadingReqs(true);
    try {
      const m = await import("@/lib/actions/requirements");
      const data = await m.fetchRequirements();
      
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
              statusStr = `${statusStr} · level ${pendingLevel} of ${totalLevels}`;
            }
          }
        }

        return {
          id: d?.code || d?.requirement_code || d?.id,
          dbId: d?.id,
          title: d?.title || 'Untitled',
          scope: d?.scope || '-',
          softwareSystem: d?.software_system?.name || '-',
          module: d?.module?.name || '-',
          subModule: d?.sub_module?.name || '-',
          category: d?.category?.name || '-',
          subCategory: d?.sub_category?.name || '-',
          priority: d?.priority?.name || '-',
          priorityColor: d?.priority?.priority_color || null,
          department: d?.department?.name || '-',
          createdBy: d?.creator?.full_name || d?.requester?.full_name || '-',
          createdById: d?.requester_id || d?.creator_id || null,
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



  useEffect(() => {
    if (mounted) {
      loadRequirements();
    }
  }, [mounted]);

  // "Pending Approval · level 1 of 2" → "Pending Approval". Multi-level items previously never matched
  // the exact "Pending Approval" check, so their "Process approval" button and badge colour were missing.
  const baseStatus = (st: string) => (st || "").split(" · ")[0];
  const isPending = (st: string) => ["pending approval", "pending"].includes(baseStatus(st).toLowerCase());
  const visibleReqs = reqs.filter(r => {
    // If they are not Super Admin and not Creator, only show if they are the current approver OR their department is the current approver
    if (!isSuperAdmin && (r as any).currentApproverId !== currentUserId && (r as any).currentApproverId !== currentUserDepartmentId && (r as any).createdById !== currentUserId) return false;
    if (filter.search && !r.title.toLowerCase().includes(filter.search.toLowerCase()) && !r.id.toLowerCase().includes(filter.search.toLowerCase())) return false;
    if (filter.system && r.softwareSystem !== filter.system) return false;
    if (filter.priority && r.priority !== filter.priority) return false;
    if (filter.department && r.department !== filter.department) return false;
    if (filter.status && r.approvalStatus !== filter.status) return false;
    return true;
  });
  const waitingOnMe = visibleReqs.filter(r => isPending(r.approvalStatus) && (isSuperAdmin || (r as any).currentApproverId === currentUserId)).length;
  const optionList = (vals: string[]) => Array.from(new Set(vals.filter(v => v && v !== '-'))).sort();
  const labelCls = "mb-1.5 block text-[13px] font-medium text-subtle";
  const iconBtn = "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground";

  if (!mounted || permsLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <ChandakLoader size="lg" title="Loading approvals…" />
      </div>
    );
  }

  if (!hasPermission("REQUIREMENTS_APPROVALS_VIEW")) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-3 text-center text-foreground">
        <div className="rounded-full bg-warning-soft p-3 text-warning-text">
          <ShieldAlert className="h-6 w-6" aria-hidden />
        </div>
        <h2 className="text-[15px] font-semibold text-heading">You don't have access to requirement approvals</h2>
        <p className="text-[13px] text-muted">Ask your administrator to grant Requirement approvals access in RBAC access policies.</p>
      </div>
    );
  }

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="Requirement approvals"
        description={waitingOnMe > 0 ? `${waitingOnMe} ${waitingOnMe === 1 ? "requirement is" : "requirements are"} waiting for your decision` : "Nothing is waiting for your decision right now"}
        breadcrumbs={[{ label: "Requirements", href: "/requirements" }, { label: "Approvals" }]}
        actions={
          <AppButton
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Refresh approvals"
            title="Refresh"
            onClick={loadRequirements}
          >
            <RefreshCw className={`h-4 w-4 ${loadingReqs ? 'animate-spin' : ''}`} />
          </AppButton>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="theme-card-structural grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="ap-search" className={labelCls}>Search</label>
            <AppInput
              id="ap-search"
              type="search"
              placeholder="Title or requirement code"
              value={filter.search}
              onChange={(e: any) => setFilter(f => ({ ...f, search: e.target.value }))}
            />
          </div>
          {([
            ["system", "System", optionList(reqs.map(r => r.softwareSystem)), "All systems"],
            ["priority", "Priority", optionList(reqs.map(r => r.priority)), "All priorities"],
            ["department", "Department", optionList(reqs.map(r => r.department)), "All departments"],
            ["status", "Status", optionList(reqs.map(r => r.approvalStatus)), "All statuses"],
          ] as const).map(([key, label, opts, all]) => (
            <div key={key}>
              <label htmlFor={`ap-${key}`} className={labelCls}>{label}</label>
              <select
                id={`ap-${key}`}
                className="h-9 w-full px-3 text-[13.5px]"
                value={(filter as any)[key]}
                onChange={(e: any) => setFilter(f => ({ ...f, [key]: e.target.value }))}
              >
                <option value="">{all}</option>
                {opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {visibleReqs.length === 0 ? (
            <div className="theme-card-structural">
              {loadingReqs ? (
                <div className="flex h-48 items-center justify-center"><ChandakLoader size="md" title="Loading approvals…" /></div>
              ) : (
                <EmptyState
                  kind="no-results"
                  title="No requirements to approve"
                  description="Requirements waiting for you, or raised by you, appear here."
                />
              )}
            </div>
          ) : (
            <AppTableContainer className="flex-1 overflow-auto">
              <AppTable cardsOnPhone>
                <AppTableHeader>
                  <AppTableRow>
                    <AppTableHead>Requirement</AppTableHead>
                    <AppTableHead className="min-w-[220px]">Title</AppTableHead>
                    <AppTableHead>System</AppTableHead>
                    <AppTableHead>Module</AppTableHead>
                    <AppTableHead>Sub-module</AppTableHead>
                    <AppTableHead>Particulars</AppTableHead>
                    <AppTableHead>Priority</AppTableHead>
                    <AppTableHead>Department</AppTableHead>
                    <AppTableHead>Raised by</AppTableHead>
                    <AppTableHead>Raised on</AppTableHead>
                    <AppTableHead>Approval</AppTableHead>
                    <AppTableHead className="w-28 text-right">Actions</AppTableHead>
                  </AppTableRow>
                </AppTableHeader>
                <AppTableBody>
                  {visibleReqs.map((r) => {
                    const canProcess = isPending(r.approvalStatus) && (isSuperAdmin || (r as any).currentApproverId === currentUserId);
                    return (
                      <AppTableRow
                        key={r.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/requirements/${r.dbId}?tab=analysis&from=approvals`)}
                      >
                        <AppTableCell className="whitespace-nowrap font-mono text-[12.5px] font-medium text-accent-soft-text">{r.id}</AppTableCell>
                        <AppTableCell className="max-w-[260px] truncate font-medium text-foreground" title={r.title}>{r.title}</AppTableCell>
                        <AppTableCell className="text-subtle">{r.softwareSystem !== '-' ? r.softwareSystem : '—'}</AppTableCell>
                        <AppTableCell className="text-subtle">{r.module !== '-' ? r.module : '—'}</AppTableCell>
                        <AppTableCell className="text-subtle">{r.subModule !== '-' ? r.subModule : '—'}</AppTableCell>
                        <AppTableCell className="text-subtle">{r.subCategory !== '-' ? r.subCategory : '—'}</AppTableCell>
                        <AppTableCell>{r.priority !== '-' ? <PriorityIndicator priority={r.priority} /> : <span className="text-muted">—</span>}</AppTableCell>
                        <AppTableCell className="text-subtle">{r.department !== '-' ? r.department : '—'}</AppTableCell>
                        <AppTableCell><UserCell name={r.createdBy !== '-' ? r.createdBy : null} emptyLabel="—" /></AppTableCell>
                        <AppTableCell className="whitespace-nowrap text-subtle tabular">{r.createdAt}</AppTableCell>
                        <AppTableCell>
                          <div className="flex flex-col items-start gap-0.5">
                            <StatusBadge status={baseStatus(r.approvalStatus)} />
                            {r.approvalStatus.includes(" · ") && <span className="text-[11.5px] text-muted">{r.approvalStatus.split(" · ")[1]}</span>}
                          </div>
                        </AppTableCell>
                        <AppTableCell>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              className={iconBtn}
                              title="View business analysis"
                              aria-label={`View business analysis for ${r.id}`}
                              onClick={(e) => { e.stopPropagation(); router.push(`/requirements/${r.dbId}?tab=analysis`); }}
                            >
                              <Eye className="h-4 w-4" aria-hidden />
                            </button>
                            {canProcess && (
                              <AppButton
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={(e: any) => {
                                  e.stopPropagation();
                                  router.push(`/requirements/${r.dbId}?tab=analysis&from=approvals`);
                                }}
                                aria-label={`Review and decide on ${r.id}`}
                              >
                                Review
                              </AppButton>
                            )}
                          </div>
                        </AppTableCell>
                      </AppTableRow>
                    );
                  })}
                </AppTableBody>
              </AppTable>
            </AppTableContainer>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
