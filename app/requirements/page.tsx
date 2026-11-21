"use client";
import { toast } from 'react-toastify';

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { AppCard, AppCardContent } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppTable, AppTableContainer, AppTableHeader, AppTableRow, AppTableHead, AppTableBody, AppTableCell } from "@/components/ui/AppTable";
import { createClient } from "@/utils/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Eye,
  Edit2,
  Calendar,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  X,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  LayoutList
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { TicketCreationWizard } from "@/components/tickets/TicketCreationWizard";
import { EditRequirementModal } from "@/components/requirements/EditRequirementModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDate, StatusBadge, statusTone, PriorityIndicator, UserCell } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/feedback/States";
import { MultiSelectFilter } from "@/components/ui/MultiSelectFilter";
import { useSavedFilters, SavedFilter } from "@/hooks/useSavedFilters";
import { SavedFiltersDropdown } from "@/components/ui/SavedFiltersDropdown";
import ChandakLoader from "@/components/ui/ChandakLoader";
import { cn } from "@/lib/utils";

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
  assignee: string;
  requester: string;
  stage: string;
  approvalStatus: string;
  currentApprover: string;
  currentApproverId?: string | null;
  createdAt: string;
  createdDateRaw: string;
  ageing: number;
  storyPoints: number;
  acceptanceCriteria?: string;
  tags: string[];
  targetRelease?: string;
  objective?: string;
  functionalScope?: string;
  technicalScope?: string;
  isDeleted?: boolean;
  dueDate?: string | null;
  sourceTicketId?: string | null;
  overdueDays?: number;
  remainingDays?: number;
  tatStatus?: string | null;
  requirementReason?: string | null;
}

interface ReqListFilterPayload {
  search: string;
  systems: string[];
  departments: string[];
  statuses: string[];
  priorities: string[];
  assignees: string[];
  requesters: string[];
  dateMode: "CREATED" | "DUE" | "BOTH";
  createdFrom: string;
  createdTo: string;
  dueFrom: string;
  dueTo: string;
  kpiCard: null | "PENDING" | "APPROVED" | "IN_PROGRESS" | "REJECTED" | "OVERDUE";
}

function istDay(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reqs, setReqs] = useState<RequirementItem[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [editReqId, setEditReqId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSystems, setSelectedSystems] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedRequesters, setSelectedRequesters] = useState<string[]>([]);

  // Interactive KPI Card Filter: null | "PENDING" | "APPROVED" | "IN_PROGRESS" | "REJECTED" | "OVERDUE"
  const [kpiCard, setKpiCard] = useState<null | "PENDING" | "APPROVED" | "IN_PROGRESS" | "REJECTED" | "OVERDUE">(null);

  // Date Filtering Mode & State
  const [dateMode, setDateMode] = useState<"CREATED" | "DUE" | "BOTH">("CREATED");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [dateError, setDateError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams?.get("create") === "true") {
      setShowWizard(true);
    }
  }, [searchParams]);

  useEffect(() => {
    setMounted(true);
    setIsSuperAdmin(hasPermission("SUPER_ADMIN"));
    supabase.auth.getUser().then(({ data }: any) => {
      if (data?.user) setCurrentUserId(data.user.id);
    });
  }, [hasPermission, supabase]);

  // Saved Filters Integration
  const currentFilterPayload: ReqListFilterPayload = useMemo(() => ({
    search: searchQuery,
    systems: selectedSystems,
    departments: selectedDepartments,
    statuses: selectedStatuses,
    priorities: selectedPriorities,
    assignees: selectedAssignees,
    requesters: selectedRequesters,
    dateMode,
    createdFrom,
    createdTo,
    dueFrom,
    dueTo,
    kpiCard
  }), [searchQuery, selectedSystems, selectedDepartments, selectedStatuses, selectedPriorities, selectedAssignees, selectedRequesters, dateMode, createdFrom, createdTo, dueFrom, dueTo, kpiCard]);

  const {
    savedFilters,
    activeSavedFilterId,
    saveCurrentFilter,
    updateSavedFilter,
    applySavedFilter,
    deleteSavedFilter
  } = useSavedFilters<ReqListFilterPayload>(
    "chandak_requirements_list_v1",
    currentUserId,
    (payload) => {
      setSearchQuery(payload.search || "");
      setSelectedSystems(payload.systems || []);
      setSelectedDepartments(payload.departments || []);
      setSelectedStatuses(payload.statuses || []);
      setSelectedPriorities(payload.priorities || []);
      setSelectedAssignees(payload.assignees || []);
      setSelectedRequesters(payload.requesters || []);
      setDateMode(payload.dateMode || "CREATED");
      setCreatedFrom(payload.createdFrom || "");
      setCreatedTo(payload.createdTo || "");
      setDueFrom(payload.dueFrom || "");
      setDueTo(payload.dueTo || "");
      setKpiCard(payload.kpiCard || null);
    }
  );

  const resetAllFilters = () => {
    setSearchQuery("");
    setSelectedSystems([]);
    setSelectedDepartments([]);
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setSelectedAssignees([]);
    setSelectedRequesters([]);
    setKpiCard(null);
    setCreatedFrom("");
    setCreatedTo("");
    setDueFrom("");
    setDueTo("");
    setDateError(null);
  };

  const handleApplySavedFilter = (f: SavedFilter<ReqListFilterPayload>) => {
    applySavedFilter(
      f,
      (payload) => {
        setSearchQuery(payload.search || "");
        setSelectedSystems(payload.systems || []);
        setSelectedDepartments(payload.departments || []);
        setSelectedStatuses(payload.statuses || []);
        setSelectedPriorities(payload.priorities || []);
        setSelectedAssignees(payload.assignees || []);
        setSelectedRequesters(payload.requesters || []);
        setDateMode(payload.dateMode || "CREATED");
        setCreatedFrom(payload.createdFrom || "");
        setCreatedTo(payload.createdTo || "");
        setDueFrom(payload.dueFrom || "");
        setDueTo(payload.dueTo || "");
        setKpiCard(payload.kpiCard || null);
      },
      resetAllFilters
    );
  };

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
          assignee: d?.assignee?.full_name || (d?.current_assignee_id ? 'Assigned' : 'Unassigned'),
          requester: d?.requester?.full_name || d?.creator?.full_name || '-',
          stage: d?.current_stage || d?.status?.status_name || 'Requirement Registration',
          approvalStatus: statusStr,
          currentApprover: d?.current_assignee_id ? 'Assigned' : '-',
          currentApproverId: d.current_assignee_id,
          createdAt: formatDate(createdDate),
          createdDateRaw: d?.created_at,
          ageing: ageingDays,
          storyPoints: d.estimated_effort ? parseInt(d.estimated_effort, 10) : 0,
          acceptanceCriteria: d.acceptance_criteria || '',
          tags: d.tags || [],
          targetRelease: d.target_release || d.release_version || '-',
          objective: d.objective,
          functionalScope: d.functional_scope,
          technicalScope: d.technical_scope,
          isDeleted: d.is_deleted,
          dueDate: d.due_date,
          sourceTicketId: d.source_ticket_id,
          overdueDays: d.overdue_days || 0,
          remainingDays: d.remaining_days || 0,
          tatStatus: d.tat_status,
          requirementReason: d.requirement_reason,
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

  // Date validation check
  useEffect(() => {
    if (createdFrom && createdTo && createdFrom > createdTo) {
      setDateError("Created 'From' date cannot be later than 'To' date");
    } else if (dueFrom && dueTo && dueFrom > dueTo) {
      setDateError("Due 'From' date cannot be later than 'To' date");
    } else {
      setDateError(null);
    }
  }, [createdFrom, createdTo, dueFrom, dueTo]);

  // Helper to extract base status name (stripping level indicators)
  const baseStatus = (s: string) => (s || "").split(" · ")[0];

  // Overdue check
  const today = istDay(new Date().toISOString());
  const isOverdue = (r: RequirementItem) => {
    const s = r.approvalStatus.toLowerCase();
    if (s.includes("approved") || s.includes("closed") || s.includes("rejected") || s.includes("cancelled")) return false;
    if (r.overdueDays && r.overdueDays > 0) return true;
    if (r.dueDate && istDay(r.dueDate) < today) return true;
    return false;
  };

  // KPI Metrics Calculation from authorized dataset
  const countPending = useMemo(() => reqs.filter(r => r.approvalStatus.toLowerCase().includes('pending')).length, [reqs]);
  const countApproved = useMemo(() => reqs.filter(r => r.approvalStatus.toLowerCase().includes('approved') || r.approvalStatus.toLowerCase() === 'closed').length, [reqs]);
  const countInProgress = useMemo(() => reqs.filter(r => {
    const s = r.approvalStatus.toLowerCase();
    return s.includes('in progress') || s.includes('development') || s.includes('uat');
  }).length, [reqs]);
  const countRejected = useMemo(() => reqs.filter(r => {
    const s = r.approvalStatus.toLowerCase();
    return s.includes('rejected') || s.includes('hold') || s.includes('cancelled');
  }).length, [reqs]);
  const countOverdue = useMemo(() => reqs.filter(isOverdue).length, [reqs, today]);

  // Multi-Select Options extraction
  const systemOptions = useMemo(() => {
    const set = new Set<string>();
    reqs.forEach(r => { if (r.softwareSystem && r.softwareSystem !== '-') set.add(r.softwareSystem); });
    return Array.from(set).sort().map(s => ({ value: s, label: s }));
  }, [reqs]);

  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    reqs.forEach(r => { if (r.department && r.department !== '-') set.add(r.department); });
    return Array.from(set).sort().map(d => ({ value: d, label: d }));
  }, [reqs]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    reqs.forEach(r => {
      const b = baseStatus(r.approvalStatus);
      if (b && b !== '-') set.add(b);
    });
    return Array.from(set).sort().map(s => ({ value: s, label: s }));
  }, [reqs]);

  const priorityOptions = useMemo(() => {
    const set = new Set<string>();
    reqs.forEach(r => { if (r.priority && r.priority !== '-') set.add(r.priority); });
    return Array.from(set).sort().map(p => ({ value: p, label: p }));
  }, [reqs]);

  const assigneeOptions = useMemo(() => {
    const set = new Set<string>(["Unassigned"]);
    reqs.forEach(r => {
      if (r.assignee && r.assignee !== '-') set.add(r.assignee);
    });
    return Array.from(set)
      .sort((a, b) => (a === "Unassigned" ? -1 : b === "Unassigned" ? 1 : a.localeCompare(b)))
      .map(a => ({ value: a, label: a }));
  }, [reqs]);

  const requesterOptions = useMemo(() => {
    const set = new Set<string>();
    reqs.forEach(r => {
      if (r.requester && r.requester !== '-') set.add(r.requester);
      else if (r.createdBy && r.createdBy !== '-') set.add(r.createdBy);
    });
    return Array.from(set).sort().map(u => ({ value: u, label: u }));
  }, [reqs]);

  // Combined Comprehensive Filtering
  const visibleReqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return reqs.filter(r => {
      // 1. Search Query
      if (q) {
        const fullText = `${r.id} ${r.title} ${r.objective || ''} ${r.functionalScope || ''} ${r.requirementReason || ''}`.toLowerCase();
        if (!fullText.includes(q)) return false;
      }

      // 2. Interactive KPI Card
      if (kpiCard === "PENDING") {
        if (!r.approvalStatus.toLowerCase().includes('pending')) return false;
      } else if (kpiCard === "APPROVED") {
        if (!r.approvalStatus.toLowerCase().includes('approved') && r.approvalStatus.toLowerCase() !== 'closed') return false;
      } else if (kpiCard === "IN_PROGRESS") {
        const s = r.approvalStatus.toLowerCase();
        if (!s.includes('in progress') && !s.includes('development') && !s.includes('uat')) return false;
      } else if (kpiCard === "REJECTED") {
        const s = r.approvalStatus.toLowerCase();
        if (!s.includes('rejected') && !s.includes('hold') && !s.includes('cancelled')) return false;
      } else if (kpiCard === "OVERDUE") {
        if (!isOverdue(r)) return false;
      }

      // 3. Systems Multi-Select
      if (selectedSystems.length > 0) {
        if (!selectedSystems.includes(r.softwareSystem)) return false;
      }

      // 4. Departments Multi-Select
      if (selectedDepartments.length > 0) {
        if (!selectedDepartments.includes(r.department)) return false;
      }

      // 5. Statuses Multi-Select
      if (selectedStatuses.length > 0) {
        const b = baseStatus(r.approvalStatus);
        if (!selectedStatuses.includes(b)) return false;
      }

      // 6. Priorities Multi-Select
      if (selectedPriorities.length > 0) {
        if (!selectedPriorities.includes(r.priority)) return false;
      }

      // 7. Assignees Multi-Select
      if (selectedAssignees.length > 0) {
        const aName = r.assignee || "Unassigned";
        if (!selectedAssignees.includes(aName)) return false;
      }

      // 8. Requesters Multi-Select
      if (selectedRequesters.length > 0) {
        const reqName = r.requester || r.createdBy;
        if (!selectedRequesters.includes(reqName)) return false;
      }

      // 9. Created Date Range
      if (dateMode === "CREATED" || dateMode === "BOTH") {
        const createdDay = istDay(r.createdDateRaw);
        if (createdFrom && (!createdDay || createdDay < createdFrom)) return false;
        if (createdTo && (!createdDay || createdDay > createdTo)) return false;
      }

      // 10. Due Date Range
      if (dateMode === "DUE" || dateMode === "BOTH") {
        if (dueFrom || dueTo) {
          if (!r.dueDate) return false;
          const dueDay = istDay(r.dueDate);
          if (dueFrom && (!dueDay || dueDay < dueFrom)) return false;
          if (dueTo && (!dueDay || dueDay > dueTo)) return false;
        }
      }

      return true;
    });
  }, [
    reqs,
    searchQuery,
    kpiCard,
    selectedSystems,
    selectedDepartments,
    selectedStatuses,
    selectedPriorities,
    selectedAssignees,
    selectedRequesters,
    dateMode,
    createdFrom,
    createdTo,
    dueFrom,
    dueTo,
    today
  ]);

  const filtersActive = Boolean(
    searchQuery ||
    kpiCard ||
    selectedSystems.length ||
    selectedDepartments.length ||
    selectedStatuses.length ||
    selectedPriorities.length ||
    selectedAssignees.length ||
    selectedRequesters.length ||
    createdFrom ||
    createdTo ||
    dueFrom ||
    dueTo
  );

  const canUpdate = isSuperAdmin || hasPermission('REQUIREMENTS_UPDATE');
  const canDelete = isSuperAdmin || hasPermission('REQUIREMENTS_DELETE');
  const iconBtn = "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground";

  const navigateToRequirement = (dbId: string, tabOrMode: string) => {
    // Preserve list filter state in sessionStorage before navigation
    try {
      sessionStorage.setItem("chandak_requirements_list_state_v1", JSON.stringify(currentFilterPayload));
    } catch {}
    router.push(`/requirements/${dbId}?${tabOrMode}`);
  };

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
          <div className="flex flex-wrap items-center gap-2">
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

            <SavedFiltersDropdown<ReqListFilterPayload>
              savedFilters={savedFilters}
              activeSavedFilterId={activeSavedFilterId}
              onSaveCurrent={() => saveCurrentFilter(currentFilterPayload)}
              onApplyFilter={handleApplySavedFilter}
              onDeleteFilter={deleteSavedFilter}
              onUpdateFilter={updateSavedFilter}
              currentPayload={currentFilterPayload}
            />

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
          </div>
        }
      />

      {showWizard && (
        <TicketCreationWizard
          onClose={() => setShowWizard(false)}
          onSuccess={() => {
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

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {/* Interactive KPI Status Summary Cards */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {/* 1. Total */}
          <button
            type="button"
            onClick={() => setKpiCard(null)}
            className={cn(
              "group relative flex flex-col justify-between p-3 rounded-xl border text-left transition-all",
              kpiCard === null
                ? "bg-elevated border-primary/40 ring-1 ring-primary/40 shadow-xs"
                : "bg-surface border-border hover:border-border-active hover:bg-surface-hover"
            )}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11.5px] font-semibold text-muted uppercase tracking-wider">Total</span>
              <div className="rounded-lg p-1.5 bg-accent-soft text-theme-icon">
                <LayoutList className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground">{reqs.length}</div>
          </button>

          {/* 2. Pending Approval */}
          <button
            type="button"
            onClick={() => setKpiCard(prev => prev === "PENDING" ? null : "PENDING")}
            className={cn(
              "group relative flex flex-col justify-between p-3 rounded-xl border text-left transition-all",
              kpiCard === "PENDING"
                ? "bg-elevated border-warning/50 ring-1 ring-warning/50 shadow-xs"
                : "bg-surface border-border hover:border-warning/30 hover:bg-surface-hover"
            )}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11.5px] font-semibold text-warning-text uppercase tracking-wider">Pending</span>
              <div className="rounded-lg p-1.5 bg-warning-soft text-warning-text">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl font-bold tracking-tight text-warning-text">{countPending}</div>
          </button>

          {/* 3. Approved */}
          <button
            type="button"
            onClick={() => setKpiCard(prev => prev === "APPROVED" ? null : "APPROVED")}
            className={cn(
              "group relative flex flex-col justify-between p-3 rounded-xl border text-left transition-all",
              kpiCard === "APPROVED"
                ? "bg-elevated border-success/50 ring-1 ring-success/50 shadow-xs"
                : "bg-surface border-border hover:border-success/30 hover:bg-surface-hover"
            )}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11.5px] font-semibold text-success-text uppercase tracking-wider">Approved</span>
              <div className="rounded-lg p-1.5 bg-success-soft text-success-text">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl font-bold tracking-tight text-success-text">{countApproved}</div>
          </button>

          {/* 4. In Progress */}
          <button
            type="button"
            onClick={() => setKpiCard(prev => prev === "IN_PROGRESS" ? null : "IN_PROGRESS")}
            className={cn(
              "group relative flex flex-col justify-between p-3 rounded-xl border text-left transition-all",
              kpiCard === "IN_PROGRESS"
                ? "bg-elevated border-accent-soft-text/50 ring-1 ring-accent-soft-text/50 shadow-xs"
                : "bg-surface border-border hover:border-accent-soft-text/30 hover:bg-surface-hover"
            )}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11.5px] font-semibold text-accent-soft-text uppercase tracking-wider">In Progress</span>
              <div className="rounded-lg p-1.5 bg-accent-soft text-accent-soft-text">
                <RefreshCw className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl font-bold tracking-tight text-accent-soft-text">{countInProgress}</div>
          </button>

          {/* 5. Rejected / Hold */}
          <button
            type="button"
            onClick={() => setKpiCard(prev => prev === "REJECTED" ? null : "REJECTED")}
            className={cn(
              "group relative flex flex-col justify-between p-3 rounded-xl border text-left transition-all",
              kpiCard === "REJECTED"
                ? "bg-elevated border-danger/50 ring-1 ring-danger/50 shadow-xs"
                : "bg-surface border-border hover:border-danger/30 hover:bg-surface-hover"
            )}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11.5px] font-semibold text-danger-text uppercase tracking-wider">Rejected/Hold</span>
              <div className="rounded-lg p-1.5 bg-danger-soft text-danger-text">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl font-bold tracking-tight text-danger-text">{countRejected}</div>
          </button>

          {/* 6. Overdue */}
          <button
            type="button"
            onClick={() => setKpiCard(prev => prev === "OVERDUE" ? null : "OVERDUE")}
            className={cn(
              "group relative flex flex-col justify-between p-3 rounded-xl border text-left transition-all",
              kpiCard === "OVERDUE"
                ? "bg-elevated border-purple-500/50 ring-1 ring-purple-500/50 shadow-xs"
                : "bg-surface border-border hover:border-purple-500/30 hover:bg-surface-hover"
            )}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11.5px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Overdue</span>
              <div className="rounded-lg p-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl font-bold tracking-tight text-purple-600 dark:text-purple-400">{countOverdue}</div>
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="theme-card-structural space-y-3 p-3">
          {/* Row 1: Search & Multi-Select Dropdowns */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
            {/* Search */}
            <div className="sm:col-span-2 lg:col-span-2">
              <label htmlFor="rq-search" className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wider text-muted">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
                <AppInput
                  id="rq-search"
                  type="search"
                  placeholder="Code, title, objective..."
                  value={searchQuery}
                  onChange={(e: any) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-8.5"
                />
              </div>
            </div>

            {/* Scope / System */}
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wider text-muted">
                System / Asset
              </label>
              <MultiSelectFilter
                options={systemOptions}
                selectedValues={selectedSystems}
                onChange={setSelectedSystems}
                placeholder="All systems"
              />
            </div>

            {/* Department */}
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wider text-muted">
                Department
              </label>
              <MultiSelectFilter
                options={departmentOptions}
                selectedValues={selectedDepartments}
                onChange={setSelectedDepartments}
                placeholder="All depts"
              />
            </div>

            {/* Status / Approval */}
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wider text-muted">
                Approval Status
              </label>
              <MultiSelectFilter
                options={statusOptions}
                selectedValues={selectedStatuses}
                onChange={setSelectedStatuses}
                placeholder="All statuses"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wider text-muted">
                Priority
              </label>
              <MultiSelectFilter
                options={priorityOptions}
                selectedValues={selectedPriorities}
                onChange={setSelectedPriorities}
                placeholder="All priorities"
              />
            </div>

            {/* Assignee / Approver */}
            <div>
              <label className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wider text-muted">
                Assignee
              </label>
              <MultiSelectFilter
                options={assigneeOptions}
                selectedValues={selectedAssignees}
                onChange={setSelectedAssignees}
                placeholder="All assignees"
              />
            </div>
          </div>

          {/* Row 2: Date Filtering with Modes */}
          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted" />
              <span className="font-semibold text-muted text-[11.5px] uppercase tracking-wider">Date Mode:</span>
              <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
                {(["CREATED", "DUE", "BOTH"] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDateMode(mode)}
                    className={cn(
                      "px-2.5 py-1 text-[11.5px] font-medium rounded-md transition-colors",
                      dateMode === mode
                        ? "bg-accent-soft text-accent-soft-text font-semibold shadow-2xs"
                        : "text-muted hover:text-foreground"
                    )}
                  >
                    {mode === "CREATED" ? "Created date" : mode === "DUE" ? "Due date" : "Both dates"}
                  </button>
                ))}
              </div>
            </div>

            {(dateMode === "CREATED" || dateMode === "BOTH") && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted text-[11.5px]">Created:</span>
                <input
                  type="date"
                  value={createdFrom}
                  onChange={(e) => setCreatedFrom(e.target.value)}
                  className="h-7.5 rounded-md border border-border bg-surface px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  title="Created From"
                />
                <span className="text-muted text-[11.5px]">to</span>
                <input
                  type="date"
                  value={createdTo}
                  onChange={(e) => setCreatedTo(e.target.value)}
                  className="h-7.5 rounded-md border border-border bg-surface px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  title="Created To"
                />
              </div>
            )}

            {(dateMode === "DUE" || dateMode === "BOTH") && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted text-[11.5px]">Due:</span>
                <input
                  type="date"
                  value={dueFrom}
                  onChange={(e) => setDueFrom(e.target.value)}
                  className="h-7.5 rounded-md border border-border bg-surface px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  title="Due From"
                />
                <span className="text-muted text-[11.5px]">to</span>
                <input
                  type="date"
                  value={dueTo}
                  onChange={(e) => setDueTo(e.target.value)}
                  className="h-7.5 rounded-md border border-border bg-surface px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  title="Due To"
                />
              </div>
            )}

            {(createdFrom || createdTo || dueFrom || dueTo) && (
              <button
                type="button"
                onClick={() => {
                  setCreatedFrom("");
                  setCreatedTo("");
                  setDueFrom("");
                  setDueTo("");
                  setDateError(null);
                }}
                className="text-[11.5px] text-muted hover:text-foreground underline ml-auto"
              >
                Reset dates
              </button>
            )}

            {dateError && (
              <div className="flex items-center gap-1 text-[11.5px] text-danger-text w-full">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{dateError}</span>
              </div>
            )}
          </div>

          {/* Active Filter Chips */}
          {filtersActive && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2 text-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted mr-1">Active:</span>

              {searchQuery && (
                <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-[11.5px] text-accent-soft-text">
                  Search: &ldquo;{searchQuery}&rdquo;
                  <button type="button" onClick={() => setSearchQuery("")} className="hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {kpiCard && (
                <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-[11.5px] text-accent-soft-text font-semibold">
                  Card: {kpiCard.replace('_', ' ')}
                  <button type="button" onClick={() => setKpiCard(null)} className="hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {selectedSystems.map(s => (
                <span key={s} className="inline-flex items-center gap-1 rounded-md bg-surface border border-border px-2 py-0.5 text-[11.5px] text-foreground">
                  System: {s}
                  <button type="button" onClick={() => setSelectedSystems(prev => prev.filter(x => x !== s))} className="hover:text-danger-text">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}

              {selectedDepartments.map(d => (
                <span key={d} className="inline-flex items-center gap-1 rounded-md bg-surface border border-border px-2 py-0.5 text-[11.5px] text-foreground">
                  Dept: {d}
                  <button type="button" onClick={() => setSelectedDepartments(prev => prev.filter(x => x !== d))} className="hover:text-danger-text">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}

              {selectedStatuses.map(s => (
                <span key={s} className="inline-flex items-center gap-1 rounded-md bg-surface border border-border px-2 py-0.5 text-[11.5px] text-foreground">
                  Status: {s}
                  <button type="button" onClick={() => setSelectedStatuses(prev => prev.filter(x => x !== s))} className="hover:text-danger-text">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}

              {selectedPriorities.map(p => (
                <span key={p} className="inline-flex items-center gap-1 rounded-md bg-surface border border-border px-2 py-0.5 text-[11.5px] text-foreground">
                  Priority: {p}
                  <button type="button" onClick={() => setSelectedPriorities(prev => prev.filter(x => x !== p))} className="hover:text-danger-text">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}

              {selectedAssignees.map(a => (
                <span key={a} className="inline-flex items-center gap-1 rounded-md bg-surface border border-border px-2 py-0.5 text-[11.5px] text-foreground">
                  Assignee: {a}
                  <button type="button" onClick={() => setSelectedAssignees(prev => prev.filter(x => x !== a))} className="hover:text-danger-text">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}

              {(createdFrom || createdTo) && (
                <span className="inline-flex items-center gap-1 rounded-md bg-surface border border-border px-2 py-0.5 text-[11.5px] text-foreground">
                  Created: {createdFrom || "start"} → {createdTo || "now"}
                  <button type="button" onClick={() => { setCreatedFrom(""); setCreatedTo(""); }} className="hover:text-danger-text">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {(dueFrom || dueTo) && (
                <span className="inline-flex items-center gap-1 rounded-md bg-surface border border-border px-2 py-0.5 text-[11.5px] text-foreground">
                  Due: {dueFrom || "start"} → {dueTo || "now"}
                  <button type="button" onClick={() => { setDueFrom(""); setDueTo(""); }} className="hover:text-danger-text">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={resetAllFilters}
                className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-primary hover:underline font-medium"
              >
                <RotateCcw className="h-3 w-3" />
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Requirements Table / Mobile View */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {visibleReqs.length === 0 ? (
            <div className="theme-card-structural">
              {loadingReqs ? (
                <div className="flex h-48 items-center justify-center">
                  <ChandakLoader size="md" title="Loading requirements…" />
                </div>
              ) : (
                <EmptyState
                  kind={filtersActive ? "no-results" : "empty"}
                  title={filtersActive ? "No requirements match these filters" : "No requirements yet"}
                  description={filtersActive ? "Try clearing a filter chip or searching with another keyword." : "Register a requirement when a team needs a change in a system or asset."}
                  action={filtersActive ? (
                    <AppButton variant="secondary" onClick={resetAllFilters}>
                      Clear filters
                    </AppButton>
                  ) : undefined}
                />
              )}
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <ul className="flex-1 space-y-2 overflow-y-auto lg:hidden">
                {visibleReqs.map((r) => {
                  const overdue = isOverdue(r);
                  return (
                    <li key={r.id} className="theme-card-structural p-4">
                      <button
                        type="button"
                        onClick={() => navigateToRequirement(r.dbId, "tab=analysis")}
                        className="w-full space-y-2 text-left"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[12.5px] font-medium text-accent-soft-text">{r.id}</span>
                            {overdue && (
                              <span className="inline-flex items-center gap-1 rounded bg-danger-soft px-1.5 py-0.5 text-[10.5px] font-bold text-danger-text">
                                <Clock className="h-3 w-3" />
                                Overdue
                              </span>
                            )}
                          </div>
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
                          <button
                            type="button"
                            className={iconBtn}
                            title="View"
                            aria-label={`View ${r.id}`}
                            onClick={() => navigateToRequirement(r.dbId, "mode=view")}
                          >
                            <Eye className="h-4 w-4" aria-hidden />
                          </button>
                          {canUpdate && (
                            <button
                              type="button"
                              className={iconBtn}
                              title="Edit analysis"
                              aria-label={`Edit analysis for ${r.id}`}
                              onClick={() => navigateToRequirement(r.dbId, "tab=analysis")}
                            >
                              <Edit2 className="h-4 w-4" aria-hidden />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              className={`${iconBtn} hover:bg-danger-soft hover:text-danger-text`}
                              title="Delete"
                              aria-label={`Delete ${r.id}`}
                              onClick={(e) => handleDeleteClick(e, r.dbId)}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Desktop Table */}
              <div className="hidden min-h-0 flex-1 overflow-hidden lg:block">
                <AppTableContainer className="h-full overflow-auto">
                  <AppTable>
                    <AppTableHeader>
                      <AppTableRow>
                        <AppTableHead className="w-[140px]">Requirement</AppTableHead>
                        <AppTableHead className="min-w-[240px]">Title</AppTableHead>
                        <AppTableHead>System or asset</AppTableHead>
                        <AppTableHead>Module</AppTableHead>
                        <AppTableHead>Priority</AppTableHead>
                        <AppTableHead className="text-right">Points</AppTableHead>
                        <AppTableHead>Due Date</AppTableHead>
                        <AppTableHead>Department</AppTableHead>
                        <AppTableHead>Raised by</AppTableHead>
                        <AppTableHead>Assignee</AppTableHead>
                        <AppTableHead>Approval</AppTableHead>
                        <AppTableHead className="w-24 text-right">Actions</AppTableHead>
                      </AppTableRow>
                    </AppTableHeader>
                    <AppTableBody>
                      {visibleReqs.map((r) => {
                        const overdue = isOverdue(r);
                        return (
                          <AppTableRow
                            key={r.id}
                            className="cursor-pointer"
                            onClick={() => navigateToRequirement(r.dbId, "tab=analysis")}
                          >
                            <AppTableCell className="whitespace-nowrap font-mono text-[12.5px] font-medium text-accent-soft-text">
                              <div className="flex items-center gap-1.5">
                                <span>{r.id}</span>
                                {overdue && (
                                  <span className="inline-flex items-center gap-0.5 rounded bg-danger-soft px-1 py-0.2 text-[10px] font-bold text-danger-text" title="Overdue">
                                    <Clock className="h-3 w-3" />
                                  </span>
                                )}
                              </div>
                            </AppTableCell>
                            <AppTableCell className="max-w-[280px] truncate font-medium text-foreground" title={r.title}>
                              {r.title}
                            </AppTableCell>
                            <AppTableCell className="text-subtle">{r.softwareSystem !== '-' ? r.softwareSystem : '—'}</AppTableCell>
                            <AppTableCell className="text-subtle">{r.module !== '-' ? r.module : '—'}</AppTableCell>
                            <AppTableCell>{r.priority !== '-' ? <PriorityIndicator priority={r.priority} /> : <span className="text-muted">—</span>}</AppTableCell>
                            <AppTableCell className="text-right tabular text-subtle">{r.storyPoints > 0 ? r.storyPoints : '—'}</AppTableCell>
                            <AppTableCell className="whitespace-nowrap tabular text-subtle">
                              {r.dueDate ? (
                                <span className={overdue ? "font-semibold text-danger-text" : ""}>
                                  {formatDate(r.dueDate)}
                                </span>
                              ) : '—'}
                            </AppTableCell>
                            <AppTableCell className="text-subtle">{r.department !== '-' ? r.department : '—'}</AppTableCell>
                            <AppTableCell><UserCell name={r.createdBy !== '-' ? r.createdBy : null} emptyLabel="—" /></AppTableCell>
                            <AppTableCell><UserCell name={r.assignee !== 'Unassigned' ? r.assignee : null} emptyLabel="Unassigned" /></AppTableCell>
                            <AppTableCell>
                              <div className="flex flex-col items-start gap-0.5">
                                <StatusBadge status={baseStatus(r.approvalStatus)} />
                                {r.approvalStatus.includes(" · ") && (
                                  <span className="text-[11px] text-muted">{r.approvalStatus.split(" · ")[1]}</span>
                                )}
                              </div>
                            </AppTableCell>
                            <AppTableCell>
                              <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  className={iconBtn}
                                  title="View"
                                  aria-label={`View ${r.id}`}
                                  onClick={() => navigateToRequirement(r.dbId, "mode=view")}
                                >
                                  <Eye className="h-4 w-4" aria-hidden />
                                </button>
                                {canUpdate && (
                                  <button
                                    type="button"
                                    className={iconBtn}
                                    title="Edit analysis"
                                    aria-label={`Edit analysis for ${r.id}`}
                                    onClick={() => navigateToRequirement(r.dbId, "tab=analysis")}
                                  >
                                    <Edit2 className="h-4 w-4" aria-hidden />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    type="button"
                                    className={`${iconBtn} hover:bg-danger-soft hover:text-danger-text`}
                                    title="Delete"
                                    aria-label={`Delete ${r.id}`}
                                    onClick={(e) => handleDeleteClick(e, r.dbId)}
                                  >
                                    <Trash2 className="h-4 w-4" aria-hidden />
                                  </button>
                                )}
                              </div>
                            </AppTableCell>
                          </AppTableRow>
                        );
                      })}
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