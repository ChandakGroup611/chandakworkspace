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
import { formatDate, StatusBadge, statusTone, PriorityIndicator, UserCell, StatTile, StatTileRow } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/feedback/States";
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
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><ChandakLoader size="lg" title="Loading requirements…" /></div>}>
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
      let data: any = null;
      try {
        const res = await fetch("/api/requirements", { cache: "no-store" });
        if (res.ok) {
          data = await res.json();
        }
      } catch { }

      if (!data) {
        const m = await import("@/lib/actions/requirements");
        data = await m.fetchRequirements();
      }

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
              statusStr = `${statusStr} · level ${pendingLevel} of ${totalLevels}`;
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
      toast.error(err.message || "Couldn't delete the requirement. Try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      loadRequirements();
    }
  }, [mounted]);

  // One filter pass shared by the cards and the table (was repeated four times).
  const visibleReqs = reqs.filter(r => {
    if (filter.search && !r.title.toLowerCase().includes(filter.search.toLowerCase()) && !r.id.toLowerCase().includes(filter.search.toLowerCase())) return false;
    if (filter.system && r.softwareSystem !== filter.system) return false;
    if (filter.status && r.approvalStatus !== filter.status) return false;
    if (filter.priority && r.priority !== filter.priority) return false;
    if (filter.department && r.department !== filter.department) return false;
    if (filter.stage && r.stage !== filter.stage) return false;
    return true;
  });
  const filtersActive = Object.values(filter).some(Boolean);
  // "Pending approval · level 1 of 2" → tone of "Pending approval"
  const baseStatus = (s: string) => (s || "").split(" · ")[0];
  const toneCount = (t: string) => reqs.filter(r => statusTone(baseStatus(r.approvalStatus)) === t).length;
  const optionList = (vals: string[]) => Array.from(new Set(vals.filter(v => v && v !== '-'))).sort();
  const selectCls = "h-9 w-full px-3 text-[13.5px]";
  const labelCls = "mb-1.5 block text-[13px] font-medium text-subtle";
  const canUpdate = isSuperAdmin || hasPermission('REQUIREMENTS_UPDATE');
  const canDelete = isSuperAdmin || hasPermission('REQUIREMENTS_DELETE');
  const iconBtn = "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground";

  if (!mounted || permsLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <ChandakLoader size="lg" title="Loading requirements…" />
      </div>
    );
  }

  if (!hasPermission("REQUIREMENTS_VIEW")) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-3 text-center text-foreground">
        <div className="rounded-full bg-warning-soft p-3 text-warning-text">
          <ShieldAlert className="h-6 w-6" aria-hidden />
        </div>
        <h2 className="text-[15px] font-semibold text-heading">You don't have access to requirements</h2>
        <p className="text-[13px] text-muted">Ask your administrator to grant Requirements view access in RBAC access policies.</p>
      </div>
    );
  }

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="Requirements"
        description="Change requests and new requirements, from registration to approval"
        actions={
          <>
            <AppButton
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Refresh requirements"
              title="Refresh"
              onClick={loadRequirements}
            >
              <RefreshCw className={`h-4 w-4 ${loadingReqs ? 'animate-spin' : ''}`} />
            </AppButton>
            {hasPermission("REQUIREMENTS_REPORTS_VIEW") && (
              <AppButton type="button" variant="ghost" onClick={() => router.push('/requirements/reports')}>
                Reports
              </AppButton>
            )}
            <AppButton
              type="button"
              variant="secondary"
              leftIcon={<ShieldAlert className="h-4 w-4" />}
              onClick={() => router.push('/requirements/approvals')}
            >
              Approvals
            </AppButton>
            <AppButton
              type="button"
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              disabled={!hasPermission("REQUIREMENTS_CREATE")}
              onClick={() => setShowWizard(true)}
            >
              New requirement
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

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <StatTileRow>
          <StatTile label="Total" value={reqs.length} tone="neutral" />
          <StatTile label="Awaiting approval" value={toneCount("warning")} tone="warning" />
          <StatTile label="Approved" value={toneCount("success")} tone="success" />
          <StatTile label="Rejected" value={toneCount("danger")} tone="danger" />
        </StatTileRow>

        {/* Filters */}
        <div className="theme-card-structural grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="rq-search" className={labelCls}>Search</label>
            <AppInput
              id="rq-search"
              type="search"
              placeholder="Title or requirement code"
              value={filter.search}
              onChange={(e: any) => setFilter(f => ({ ...f, search: e.target.value }))}
            />
          </div>
          {([
            ["system", "System or asset", optionList(reqs.map(r => r.softwareSystem)), "All systems"],
            ["status", "Approval", optionList(reqs.map(r => r.approvalStatus)), "All statuses"],
            ["priority", "Priority", optionList(reqs.map(r => r.priority)), "All priorities"],
            ["department", "Department", optionList(reqs.map(r => r.department)), "All departments"],
            ["stage", "Stage", optionList(reqs.map(r => r.stage)), "All stages"],
          ] as const).map(([key, label, opts, all]) => (
            <div key={key}>
              <label htmlFor={`rq-${key}`} className={labelCls}>{label}</label>
              <select
                id={`rq-${key}`}
                className={selectCls}
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
                <div className="flex h-48 items-center justify-center"><ChandakLoader size="md" title="Loading requirements…" /></div>
              ) : (
                <EmptyState
                  kind={filtersActive ? "no-results" : "empty"}
                  title={filtersActive ? "No requirements match these filters" : "No requirements yet"}
                  description={filtersActive ? "Clear a filter or search by requirement code." : "Register a requirement when a team needs a change in a system or asset."}
                  action={filtersActive ? (
                    <AppButton variant="secondary" onClick={() => setFilter({ search: "", system: "", status: "", priority: "", department: "", stage: "" })}>Clear filters</AppButton>
                  ) : undefined}
                />
              )}
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <ul className="flex-1 space-y-2 overflow-y-auto lg:hidden">
                {visibleReqs.map((r) => (
                  <li key={r.id} className="theme-card-structural p-4">
                    <button type="button" onClick={() => router.push(`/requirements/${r.dbId}?tab=analysis`)} className="w-full space-y-2 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[12.5px] font-medium text-accent-soft-text">{r.id}</span>
                        <StatusBadge status={baseStatus(r.approvalStatus)} size="sm" />
                      </div>
                      <div className="line-clamp-2 text-[14px] font-semibold text-foreground">{r.title}</div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
                        {r.priority !== '-' && <PriorityIndicator priority={r.priority} className="text-[12.5px]" />}
                        {r.softwareSystem !== '-' && <span>{r.softwareSystem}{r.module !== '-' ? ` › ${r.module}` : ''}</span>}
                        {r.department !== '-' && <span>{r.department}</span>}
                      </div>
                    </button>
                    <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2 text-[12.5px] text-muted">
                      <span className="truncate">{r.createdBy !== '-' ? r.createdBy : '—'} · {r.createdAt}</span>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button type="button" className={iconBtn} title="View" aria-label={`View ${r.id}`} onClick={() => router.push(`/requirements/${r.dbId}?mode=view`)}><Eye className="h-4 w-4" aria-hidden /></button>
                        {canUpdate && <button type="button" className={iconBtn} title="Edit analysis" aria-label={`Edit analysis for ${r.id}`} onClick={() => router.push(`/requirements/${r.dbId}?tab=analysis`)}><Edit2 className="h-4 w-4" aria-hidden /></button>}
                        {canDelete && <button type="button" className={`${iconBtn} hover:bg-danger-soft hover:text-danger-text`} title="Delete" aria-label={`Delete ${r.id}`} onClick={(e) => handleDeleteClick(e, r.dbId)}><Trash2 className="h-4 w-4" aria-hidden /></button>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Desktop table */}
              <div className="hidden min-h-0 flex-1 overflow-hidden lg:block">
                <AppTableContainer className="h-full overflow-auto">
                  <AppTable>
                    <AppTableHeader>
                      <AppTableRow>
                        <AppTableHead className="w-[140px]">Requirement</AppTableHead>
                        <AppTableHead className="min-w-[240px]">Title</AppTableHead>
                        <AppTableHead>System or asset</AppTableHead>
                        <AppTableHead>Module</AppTableHead>
                        <AppTableHead>Sub-module</AppTableHead>
                        <AppTableHead>Particulars</AppTableHead>
                        <AppTableHead>Priority</AppTableHead>
                        <AppTableHead className="text-right">Points</AppTableHead>
                        <AppTableHead>Release</AppTableHead>
                        <AppTableHead>Department</AppTableHead>
                        <AppTableHead>Raised by</AppTableHead>
                        <AppTableHead>Raised on</AppTableHead>
                        <AppTableHead>Approval</AppTableHead>
                        <AppTableHead className="w-24 text-right">Actions</AppTableHead>
                      </AppTableRow>
                    </AppTableHeader>
                    <AppTableBody>
                      {visibleReqs.map((r) => (
                        <AppTableRow key={r.id} className="cursor-pointer" onClick={() => router.push(`/requirements/${r.dbId}?tab=analysis`)}>
                          <AppTableCell className="whitespace-nowrap font-mono text-[12.5px] font-medium text-accent-soft-text">{r.id}</AppTableCell>
                          <AppTableCell className="max-w-[280px] truncate font-medium text-foreground" title={r.title}>{r.title}</AppTableCell>
                          <AppTableCell className="text-subtle">{r.softwareSystem !== '-' ? r.softwareSystem : '—'}</AppTableCell>
                          <AppTableCell className="text-subtle">{r.module !== '-' ? r.module : '—'}</AppTableCell>
                          <AppTableCell className="text-subtle">{r.subModule !== '-' ? r.subModule : '—'}</AppTableCell>
                          <AppTableCell className="text-subtle">{r.subCategory !== '-' ? r.subCategory : '—'}</AppTableCell>
                          <AppTableCell>{r.priority !== '-' ? <PriorityIndicator priority={r.priority} /> : <span className="text-muted">—</span>}</AppTableCell>
                          <AppTableCell className="text-right tabular text-subtle">{r.storyPoints > 0 ? r.storyPoints : '—'}</AppTableCell>
                          <AppTableCell className="text-subtle">{r.targetRelease && r.targetRelease !== '-' ? r.targetRelease : '—'}</AppTableCell>
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
                            <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                              <button type="button" className={iconBtn} title="View" aria-label={`View ${r.id}`} onClick={() => router.push(`/requirements/${r.dbId}?mode=view`)}><Eye className="h-4 w-4" aria-hidden /></button>
                              {canUpdate && <button type="button" className={iconBtn} title="Edit analysis" aria-label={`Edit analysis for ${r.id}`} onClick={() => router.push(`/requirements/${r.dbId}?tab=analysis`)}><Edit2 className="h-4 w-4" aria-hidden /></button>}
                              {canDelete && <button type="button" className={`${iconBtn} hover:bg-danger-soft hover:text-danger-text`} title="Delete" aria-label={`Delete ${r.id}`} onClick={(e) => handleDeleteClick(e, r.dbId)}><Trash2 className="h-4 w-4" aria-hidden /></button>}
                            </div>
                          </AppTableCell>
                        </AppTableRow>
                      ))}
                    </AppTableBody>
                  </AppTable>
                </AppTableContainer>
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDelete}
        title={`Delete ${reqs.find(r => r.dbId === deleteTargetId)?.id ?? "this requirement"}?`}
        description="The requirement and its approval history are removed permanently. This can't be undone."
        confirmLabel="Delete requirement"
        cancelLabel="Cancel"
        tone="danger"
      />
    </PageContainer>
  );
}
