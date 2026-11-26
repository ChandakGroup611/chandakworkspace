"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AppCard, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import {
  AppTableContainer,
  AppTable,
  AppTableHeader,
  AppTableBody,
  AppTableRow,
  AppTableHead,
  AppTableCell
} from "@/components/ui/AppTable";
import {
  Trash2,
  AlertOctagon,
  Archive,
  ShieldAlert,
  FolderKanban,
  Ticket,
  RefreshCcw,
  CheckSquare,
  FileText,
  Users,
  Building,
  UserCog,
  Building2,
  Search,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import {
  fetchComplianceWorkspaces,
  fetchComplianceTasks,
  fetchComplianceRequirements,
  fetchComplianceTickets,
  fetchComplianceAmc,
  fetchComplianceMaster,
  hardDeleteEntity,
  restoreEntity,
  ComplianceEntity
} from "@/lib/actions/compliance";
import { usePermissions } from "@/hooks/usePermissions";
import { MoveTasksModal } from "@/components/tasks/MoveTasksModal";
import { formatDateTime } from "@/components/ui/data";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type ViewType = "active" | "deleted";

const ALL_TABS = [
  { id: 'workspaces', label: 'Workspaces', icon: FolderKanban, entity: 'workspaces', nameKey: 'workspace_name', codeKey: 'workspace_code', module: 'TASK_WORKFLOW' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, entity: 'tasks', nameKey: 'subject', codeKey: 'task_code', module: 'TASK_WORKFLOW' },
  { id: 'tickets', label: 'Tickets', icon: Ticket, entity: 'tickets', nameKey: 'title', codeKey: 'code', module: 'TICKETS' },
  { id: 'requirements', label: 'Requirements', icon: FileText, entity: 'requirements', nameKey: 'title', codeKey: 'code', module: 'REQUIREMENTS' },
  { id: 'software_amc', label: 'AMC Contracts', icon: FileText, entity: 'software_amc', nameKey: 'software_name', codeKey: 'vendor_name', module: 'AMC' },
  { id: 'user_master', label: 'Users', icon: Users, entity: 'user_master', nameKey: 'full_name', codeKey: 'user_code', module: 'IAM' },
  { id: 'status_master', label: 'Statuses', icon: CheckSquare, entity: 'status_master', nameKey: 'status_name', codeKey: 'status_code', module: 'MASTERS' },
  { id: 'priority_master', label: 'Priorities', icon: AlertOctagon, entity: 'priority_master', nameKey: 'priority_name', codeKey: 'priority_code', module: 'MASTERS' },
  { id: 'department_master', label: 'Departments', icon: Building, entity: 'department_master', nameKey: 'name', codeKey: 'code', module: 'MASTERS' },
  { id: 'designation_master', label: 'Designations', icon: UserCog, entity: 'designation_master', nameKey: 'name', codeKey: 'code', module: 'MASTERS' },
  { id: 'company_master', label: 'Companies', icon: Building2, entity: 'company_master', nameKey: 'company_name', codeKey: 'company_code', module: 'MASTERS' },
];

export default function DataRetentionClient() {
  const { roleCode, hasPermission } = usePermissions();
  const isSuperAdmin = roleCode === "SUPER_ADMIN" || roleCode === "ROLE_SUPER_ADMIN";
  const canRestore = isSuperAdmin || hasPermission("TRASH_UPDATE");
  const canPurge = isSuperAdmin; // WP5 5.3: Strictly Super Admin

  // Module-wise tab filtering (WP5 5.5)
  const visibleTabs = useMemo(() => {
    if (isSuperAdmin) return ALL_TABS;
    return ALL_TABS.filter(t => {
      if (t.module === 'TASK_WORKFLOW') return hasPermission('TASK_VIEW') || hasPermission('WORKSPACES_VIEW');
      if (t.module === 'TICKETS') return hasPermission('TICKETS_VIEW');
      if (t.module === 'REQUIREMENTS') return hasPermission('REQUIREMENTS_VIEW');
      if (t.module === 'AMC') return hasPermission('AMC_VIEW');
      if (t.module === 'IAM') return hasPermission('USERS_VIEW');
      return false;
    });
  }, [isSuperAdmin, hasPermission]);

  const [activeTab, setActiveTab] = useState<string>("workspaces");
  const [activeView, setActiveView] = useState<ViewType>("deleted"); // default to recycle bin view
  const [isLoading, setIsLoading] = useState(false);

  const [records, setRecords] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Deletion/Restore State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Purge Modal State (WP5 5.3 typed confirmation & active cascade child check)
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [purgeIds, setPurgeIds] = useState<string[]>([]);
  const [typedConfirm, setTypedConfirm] = useState("");
  const [activeChildrenError, setActiveChildrenError] = useState<any[]>([]);

  // Move Tasks Modal State
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

  const currentTabConfig = visibleTabs.find(t => t.id === activeTab) || visibleTabs[0] || ALL_TABS[0];

  const loadData = async () => {
    setIsLoading(true);
    setErrorBanner(null);
    try {
      const isDeleted = activeView === "deleted";
      let data: any[] = [];

      // Attempt fast REST endpoint first for zero-409 resilience
      try {
        const queryParams = new URLSearchParams({
          tab: currentTabConfig.id,
          deleted: String(isDeleted),
          entity: currentTabConfig.entity,
          nameKey: currentTabConfig.nameKey,
          codeKey: currentTabConfig.codeKey
        });
        const res = await fetch(`/api/compliance?${queryParams.toString()}`);
        if (res.ok) {
          data = await res.json();
          if (Array.isArray(data)) {
            setRecords(data);
            setIsLoading(false);
            return;
          }
        }
      } catch (restErr) {
        console.warn("[DataRetentionClient] REST fetch failed, attempting Server Action:", restErr);
      }

      // Server Action fallback
      if (currentTabConfig.id === "workspaces") {
        data = await fetchComplianceWorkspaces(isDeleted);
      } else if (currentTabConfig.id === "tasks") {
        data = await fetchComplianceTasks(isDeleted);
      } else if (currentTabConfig.id === "tickets") {
        data = await fetchComplianceTickets(isDeleted);
      } else if (currentTabConfig.id === "requirements") {
        data = await fetchComplianceRequirements(isDeleted);
      } else if (currentTabConfig.id === "software_amc") {
        data = await fetchComplianceAmc(isDeleted);
      } else {
        data = await fetchComplianceMaster(currentTabConfig.entity, currentTabConfig.nameKey, currentTabConfig.codeKey, isDeleted);
      }

      setRecords(data);
    } catch (e: any) {
      console.error("[DataRetentionClient] Load error:", e);
      // WP5 5.4: Show load errors
      setErrorBanner(e.message || "Failed to load records. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setSelectedIds(new Set());
    setErrorBanner(null);
    setSuccessBanner(null);
    setSearchQuery("");
    setCurrentPage(1);
  }, [activeTab, activeView]);

  // Filtered & Paginated records (WP5 5.4)
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase();
    return records.filter(r => {
      const code = String(r[currentTabConfig.codeKey] || r.task_code || r.code || r.id || '').toLowerCase();
      const name = String(r[currentTabConfig.nameKey] || r.subject || r.title || r.full_name || '').toLowerCase();
      const deleter = String(r.deleted_by_name || '').toLowerCase();
      const reason = String(r.reason || '').toLowerCase();
      return code.includes(q) || name.includes(q) || deleter.includes(q) || reason.includes(q);
    });
  }, [records, searchQuery, currentTabConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const pagedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage]);

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    setSelectedIds(newSelection);
  };

  const toggleAll = (ids: string[]) => {
    if (selectedIds.size === ids.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(ids));
  };

  // Restore action (WP5 5.2)
  const handleRestore = async (ids: string[]) => {
    if (ids.length === 0) return;
    setIsProcessing(true);
    setErrorBanner(null);
    setSuccessBanner(null);

    try {
      let result: any = null;
      try {
        const res = await fetch("/api/compliance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "restore", entity: currentTabConfig.entity, ids })
        });
        if (res.ok) {
          result = await res.json();
        }
      } catch { }
      if (!result) {
        result = await restoreEntity(currentTabConfig.entity as ComplianceEntity, ids);
      }
      if (result.success) {
        setSuccessBanner(`Successfully restored ${ids.length} record(s).`);
        setSelectedIds(new Set());
        await loadData();
      } else {
        setErrorBanner(result.error || "Failed to restore records.");
      }
    } catch (e: any) {
      setErrorBanner(e.message || "An unexpected error occurred during restore.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Open Purge Dialog (WP5 5.3)
  const openPurgeModal = (ids: string[]) => {
    setPurgeIds(ids);
    setTypedConfirm("");
    setActiveChildrenError([]);
    setPurgeModalOpen(true);
  };

  // Execute Purge (WP5 5.3)
  const executePurge = async () => {
    if (typedConfirm.trim().toUpperCase() !== "PURGE") return;
    setIsProcessing(true);
    setActiveChildrenError([]);

    try {
      let result: any = null;
      try {
        const res = await fetch("/api/compliance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "purge", entity: currentTabConfig.entity, ids: purgeIds, typedConfirm })
        });
        if (res.ok) {
          result = await res.json();
        }
      } catch { }
      if (!result) {
        result = await hardDeleteEntity(currentTabConfig.entity as ComplianceEntity, purgeIds);
      }
      if (result.success) {
        setPurgeModalOpen(false);
        setSuccessBanner(`Successfully purged ${purgeIds.length} record(s).`);
        setSelectedIds(new Set());
        await loadData();
      } else {
        if (result.active_children && result.active_children.length > 0) {
          setActiveChildrenError(result.active_children);
        } else {
          setErrorBanner(result.error || "Purge operation failed.");
          setPurgeModalOpen(false);
        }
      }
    } catch (e: any) {
      setErrorBanner(e.message || "An unexpected error occurred during purge.");
      setPurgeModalOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderDataGrid = () => (
    <div className="space-y-4">
      {/* Search and Selection Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 pt-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
          <AppInput
            placeholder="Search code, title, deleter..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs font-semibold text-muted">{selectedIds.size} selected</span>
            <div className="flex gap-2">
              {activeView === "deleted" ? (
                <>
                  {canRestore && (
                    <AppButton
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRestore(Array.from(selectedIds))}
                      disabled={isProcessing}
                      leftIcon={<RefreshCcw className="h-3.5 w-3.5" />}
                    >
                      Restore selected
                    </AppButton>
                  )}
                  {canPurge && (
                    <AppButton
                      variant="destructive"
                      size="sm"
                      onClick={() => openPurgeModal(Array.from(selectedIds))}
                      disabled={isProcessing}
                      leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                    >
                      Purge selected
                    </AppButton>
                  )}
                </>
              ) : (
                <>
                  {activeTab === "tasks" && (
                    <AppButton variant="primary" size="sm" onClick={() => setIsMoveModalOpen(true)} disabled={isProcessing}>
                      Move to workspace
                    </AppButton>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Table Container */}
      <AppTableContainer>
        <AppTable cardsOnPhone>
          <AppTableHeader>
            <tr>
              {(activeView === "deleted" || activeTab === "tasks") && (
                <AppTableHead className="w-[40px]">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === pagedRecords.length && pagedRecords.length > 0}
                    onChange={() => toggleAll(pagedRecords.map(r => r.id))}
                    className="rounded border-border bg-surface/20"
                  />
                </AppTableHead>
              )}
              <AppTableHead>Code</AppTableHead>
              <AppTableHead>Name / Title</AppTableHead>
              {activeView === "deleted" && <AppTableHead>Deleted by</AppTableHead>}
              {activeView === "deleted" ? <AppTableHead>Deleted on</AppTableHead> : <AppTableHead>Last updated</AppTableHead>}
              {activeView === "deleted" && <AppTableHead>Reason</AppTableHead>}
              <AppTableHead className="text-right">Actions</AppTableHead>
            </tr>
          </AppTableHeader>
          <AppTableBody>
            {pagedRecords.map((record) => {
              const displayCode = record[currentTabConfig.codeKey] || record.task_code || record.code || record.id?.split('-')[0] || '—';
              const displayName = record[currentTabConfig.nameKey] || record.subject || record.title || record.full_name || record.workspace_name || 'N/A';
              const deletedBy = record.deleted_by_name || '—';
              const deletedOn = record.deleted_on ? formatDateTime(record.deleted_on) : (record.updated_at ? formatDateTime(record.updated_at) : '—');
              const reason = record.reason || '—';

              return (
                <AppTableRow key={record.id}>
                  {(activeView === "deleted" || activeTab === "tasks") && (
                    <AppTableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(record.id)}
                        onChange={() => toggleSelection(record.id)}
                        className="rounded border-border bg-surface/20"
                      />
                    </AppTableCell>
                  )}
                  <AppTableCell className="font-mono text-xs font-semibold text-primary">{displayCode}</AppTableCell>
                  <AppTableCell className="font-medium text-foreground max-w-xs truncate" title={displayName}>{displayName}</AppTableCell>
                  {activeView === "deleted" && (
                    <AppTableCell className="text-xs text-muted">{deletedBy}</AppTableCell>
                  )}
                  <AppTableCell className="text-xs text-muted whitespace-nowrap">
                    {activeView === "deleted" ? deletedOn : formatDateTime(record.updated_at)}
                  </AppTableCell>
                  {activeView === "deleted" && (
                    <AppTableCell className="text-xs text-muted max-w-[200px] truncate" title={reason}>{reason}</AppTableCell>
                  )}
                  <AppTableCell className="text-right">
                    {activeView === "deleted" ? (
                      <div className="flex justify-end gap-1.5">
                        {canRestore && (
                          <AppButton variant="secondary" size="sm" onClick={() => handleRestore([record.id])} disabled={isProcessing}>
                            Restore
                          </AppButton>
                        )}
                        {canPurge && (
                          <AppButton variant="destructive" size="sm" onClick={() => openPurgeModal([record.id])} disabled={isProcessing} leftIcon={<Trash2 className="h-3.5 w-3.5" />}>
                            Purge
                          </AppButton>
                        )}
                      </div>
                    ) : (
                      <AppBadge variant="success">Active</AppBadge>
                    )}
                  </AppTableCell>
                </AppTableRow>
              );
            })}
            {pagedRecords.length === 0 && (
              <AppTableRow>
                <AppTableCell colSpan={activeView === "deleted" ? 7 : 5} className="text-center py-8 text-muted">
                  {isLoading ? "Loading records..." : (searchQuery ? "No records match your search." : "No records found in this view.")}
                </AppTableCell>
              </AppTableRow>
            )}
          </AppTableBody>
        </AppTable>
      </AppTableContainer>

      {/* Pagination Footer (WP5 5.4) */}
      <div className="flex items-center justify-between px-4 pb-4 border-t border-border pt-3">
        <span className="text-xs text-muted">
          Showing {filteredRecords.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length} records
        </span>
        <div className="flex items-center gap-2">
          <AppButton
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            aria-label="Previous page"
            disabled={currentPage === 1 || isLoading}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </AppButton>
          <span className="text-xs font-semibold text-foreground">
            {currentPage} / {totalPages}
          </span>
          <AppButton
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            aria-label="Next page"
            disabled={currentPage === totalPages || isLoading}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </AppButton>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Action Banners */}
      {errorBanner && (
        <div className="p-4 rounded-lg border border-danger-border bg-danger-soft flex items-start gap-3">
          <AlertOctagon className="h-5 w-5 text-danger-text shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <h4 className="font-semibold text-danger-text">Action failed</h4>
            <p className="text-danger-text">{errorBanner}</p>
          </div>
        </div>
      )}

      {successBanner && (
        <div className="p-4 rounded-lg border border-success-border bg-success-soft flex items-start gap-3">
          <CheckSquare className="h-5 w-5 text-success-text shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <h4 className="font-semibold text-success-text">Success</h4>
            <p className="text-success-text">{successBanner}</p>
          </div>
        </div>
      )}

      {/* Module Tabs (WP5 5.5: Module-wise Trash tabs) */}
      <div className="pb-2">
        <div className="flex gap-1.5 overflow-x-auto p-1.5 bg-surface/50 dark:bg-surface/30 border border-border rounded-lg w-max max-w-full shadow-sm scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <AppButton
                key={tab.id}
                variant="ghost"
                onClick={() => setActiveTab(tab.id)}
                className={`theme-tab-standard rounded-lg min-w-[110px] ${isActive
                    ? 'bg-surface dark:bg-surface text-primary shadow-sm border border-border font-semibold'
                    : 'text-muted hover:text-foreground border border-transparent'
                  }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </AppButton>
            );
          })}
        </div>
      </div>

      {/* View Toggle (Active vs Deleted) */}
      <AppCard className="overflow-hidden">
        <AppCardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <AppCardTitle className="flex items-center gap-2 text-foreground">
              <Archive className="h-4 w-4" />
              <span>{currentTabConfig.label} Vault</span>
            </AppCardTitle>
          </div>

          <div className="flex bg-surface/40 rounded-lg p-1 border border-border">
            <AppButton
              variant={activeView === "deleted" ? "destructive" : "ghost"}
              onClick={() => setActiveView("deleted")}
              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Recycle bin
            </AppButton>
            <AppButton
              variant={activeView === "active" ? "primary" : "ghost"}
              onClick={() => setActiveView("active")}
              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
            >
              Active records
            </AppButton>
          </div>
        </AppCardHeader>

        <div className="p-0">
          {renderDataGrid()}
        </div>
      </AppCard>

      {/* Purge Typed Confirmation Modal (WP5 5.3) */}
      <Dialog open={purgeModalOpen} onOpenChange={setPurgeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger-text">
              <ShieldAlert className="h-5 w-5" />
              Permanent Purge Confirmation
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            {activeChildrenError.length > 0 ? (
              <div className="space-y-3 rounded-lg border border-danger-border bg-danger-soft p-3 text-danger-text">
                <p className="font-semibold">Purge refused: Active cascade child records exist:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  {activeChildrenError.map((c, i) => (
                    <li key={i}>{c.type}: {c.title} (ID: {c.id})</li>
                  ))}
                </ul>
                <p className="text-xs">Please delete or reassign all attached child records first.</p>
              </div>
            ) : (
              <>
                <p className="text-muted">
                  You are about to permanently purge <strong className="text-foreground">{purgeIds.length}</strong> record(s).
                  This will mark the batch as permanently destroyed and cannot be undone.
                </p>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">
                    Type <strong className="text-danger-text">PURGE</strong> to confirm:
                  </label>
                  <AppInput
                    placeholder="Type PURGE here"
                    value={typedConfirm}
                    onChange={(e) => setTypedConfirm(e.target.value)}
                    className="border-danger-border focus-visible:ring-danger"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
            <AppButton variant="secondary" onClick={() => setPurgeModalOpen(false)}>
              Cancel
            </AppButton>
            {activeChildrenError.length === 0 && (
              <AppButton
                variant="destructive"
                onClick={executePurge}
                disabled={typedConfirm.trim().toUpperCase() !== "PURGE" || isProcessing}
                leftIcon={<Trash2 className="h-4 w-4" />}
              >
                {isProcessing ? "Purging..." : "Confirm permanent purge"}
              </AppButton>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MoveTasksModal
        open={isMoveModalOpen}
        onOpenChange={setIsMoveModalOpen}
        taskIds={Array.from(selectedIds)}
        tasks={records}
        onSuccess={() => {
          setSelectedIds(new Set());
          loadData();
          setSuccessBanner("Tasks successfully moved to the new workspace.");
        }}
      />
    </div>
  );
}
