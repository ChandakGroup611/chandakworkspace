"use client";

import React, { useState, useEffect } from "react";
import { AppCard, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { 
  AppTableContainer, 
  AppTable, 
  AppTableHeader, 
  AppTableBody, 
  AppTableRow, 
  AppTableHead, 
  AppTableCell 
} from "@/components/ui/AppTable";
import { Trash2, AlertOctagon, Archive, ShieldAlert, FolderKanban, Ticket, RefreshCcw, CheckSquare, FileText, Users, Building, UserCog, Building2 } from "lucide-react";
import { 
  fetchComplianceWorkspaces, 
  fetchComplianceTasks, 
  fetchComplianceRequirements,
  fetchComplianceMaster,
  hardDeleteEntity, 
  restoreEntity,
  ComplianceEntity
} from "@/lib/actions/compliance";
import { usePermissions } from "@/hooks/usePermissions";
import { MoveTasksModal } from "@/components/tasks/MoveTasksModal";

type ViewType = "active" | "deleted";

const TABS = [
  { id: 'workspaces', label: 'Workspaces', icon: FolderKanban, entity: 'workspaces', nameKey: 'workspace_name', codeKey: 'workspace_code' },
  { id: 'tasks', label: 'Tasks', icon: Ticket, entity: 'tasks', nameKey: 'subject', codeKey: 'id' },
  { id: 'requirements', label: 'Requirements', icon: FileText, entity: 'requirements', nameKey: 'title', codeKey: 'code' },
  { id: 'user_master', label: 'Users', icon: Users, entity: 'user_master', nameKey: 'full_name', codeKey: 'user_code' },
  { id: 'status_master', label: 'Statuses', icon: CheckSquare, entity: 'status_master', nameKey: 'status_name', codeKey: 'status_code' },
  { id: 'priority_master', label: 'Priorities', icon: AlertOctagon, entity: 'priority_master', nameKey: 'priority_name', codeKey: 'priority_code' },
  { id: 'department_master', label: 'Departments', icon: Building, entity: 'department_master', nameKey: 'department_name', codeKey: 'department_code' },
  { id: 'designation_master', label: 'Designations', icon: UserCog, entity: 'designation_master', nameKey: 'designation_name', codeKey: 'designation_code' },
  { id: 'company_master', label: 'Companies', icon: Building2, entity: 'company_master', nameKey: 'company_name', codeKey: 'company_code' },
];

export default function DataRetentionClient() {
  const { roleCode, hasPermission } = usePermissions();
  const isSuperAdmin = roleCode === "SUPER_ADMIN";
  const canRestore = isSuperAdmin || hasPermission("TRASH_UPDATE");
  const canPurge = isSuperAdmin || hasPermission("TRASH_DELETE");

  const [activeTab, setActiveTab] = useState<string>("workspaces");
  const [activeView, setActiveView] = useState<ViewType>("active");
  const [isLoading, setIsLoading] = useState(false);
  
  const [records, setRecords] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Deletion/Restore State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  
  // Custom Modal for Foreign Key Error
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);
  const [errorDetails, setErrorDetails] = useState<string>("");

  // Move Tasks Modal State
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

  const currentTabConfig = TABS.find(t => t.id === activeTab) || TABS[0];

  const loadData = async () => {
    setIsLoading(true);
    try {
      const isDeleted = activeView === "deleted";
      let data = [];
      
      if (activeTab === "workspaces") {
        data = await fetchComplianceWorkspaces(isDeleted);
      } else if (activeTab === "tasks") {
        data = await fetchComplianceTasks(isDeleted);
      } else if (activeTab === "requirements") {
        data = await fetchComplianceRequirements(isDeleted);
      } else {
        data = await fetchComplianceMaster(currentTabConfig.entity, currentTabConfig.nameKey, currentTabConfig.codeKey, isDeleted);
      }
      
      setRecords(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setSelectedIds(new Set());
    setErrorBanner(null);
    setSuccessBanner(null);
  }, [activeTab, activeView]);

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

  const handleAction = async (actionType: 'restore' | 'purge', ids: string[]) => {
    if (ids.length === 0) return;
    
    if (actionType === 'purge') {
      if (!confirm(`CRITICAL WARNING: You are about to permanently purge ${ids.length} record(s). This action CANNOT be undone. Proceed?`)) {
        return;
      }
    }

    setIsProcessing(true);
    setErrorBanner(null);
    setSuccessBanner(null);
    
    try {
      let result;
      if (actionType === 'restore') {
        result = await restoreEntity(currentTabConfig.entity as ComplianceEntity, ids);
        if (result.success) setSuccessBanner(`Successfully restored ${ids.length} record(s).`);
      } else {
        result = await hardDeleteEntity(currentTabConfig.entity as ComplianceEntity, ids);
        if (result.success) setSuccessBanner(`Successfully purged ${ids.length} record(s).`);
      }
      
      if (!result.success && result.error) {
        if (result.error.includes('attached child records') || result.error.includes('foreign_key_violation')) {
          setErrorDetails(result.error);
          setShowErrorModal(true);
        } else {
          setErrorBanner(result.error);
        }
      } else {
        setSelectedIds(new Set());
        await loadData();
      }
    } catch (e: any) {
      setErrorBanner(e.message || "An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const renderDataGrid = () => (
    <div className="space-y-4">
      {selectedIds.size > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between mx-4 mt-4">
          <span className="text-sm font-bold text-gray-300">{selectedIds.size} record(s) selected</span>
          <div className="flex gap-2">
            {activeView === "deleted" ? (
              <>
                {canRestore && (
                  <AppButton variant="secondary" size="sm" onClick={() => handleAction('restore', Array.from(selectedIds))} disabled={isProcessing} leftIcon={<RefreshCcw className="h-4 w-4" />}>
                    Restore Selected
                  </AppButton>
                )}
                {canPurge && (
                  <AppButton variant="destructive" size="sm" onClick={() => handleAction('purge', Array.from(selectedIds))} disabled={isProcessing} leftIcon={<Trash2 className="h-4 w-4" />}>
                    Purge Selected
                  </AppButton>
                )}
              </>
            ) : (
              <>
                {activeTab === "tasks" && (
                  <AppButton variant="primary" size="sm" onClick={() => setIsMoveModalOpen(true)} disabled={isProcessing}>
                    Move Tasks to Workspace
                  </AppButton>
                )}
              </>
            )}
          </div>
        </div>
      )}
      <AppTableContainer>
        <AppTable>
          <AppTableHeader>
            <tr>
              {(activeView === "deleted" || activeTab === "tasks") && (
                <AppTableHead className="w-[40px]">
                  <input type="checkbox" checked={selectedIds.size === records.length && records.length > 0} onChange={() => toggleAll(records.map(r => r.id))} className="rounded border-gray-600 bg-black/20" />
                </AppTableHead>
              )}
              <AppTableHead>Code / ID</AppTableHead>
              <AppTableHead>Name / Title</AppTableHead>
              <AppTableHead>Last Updated</AppTableHead>
              <AppTableHead className="text-right">Actions</AppTableHead>
            </tr>
          </AppTableHeader>
        <AppTableBody>
          {records.map((record) => (
            <AppTableRow key={record.id}>
              {(activeView === "deleted" || activeTab === "tasks") && (
                <AppTableCell>
                  <input type="checkbox" checked={selectedIds.has(record.id)} onChange={() => toggleSelection(record.id)} className="rounded border-gray-600 bg-black/20" />
                </AppTableCell>
              )}
              <AppTableCell className="font-mono text-xs">{record[currentTabConfig.codeKey] || record.id.split('-')[0]}</AppTableCell>
              <AppTableCell className="font-semibold">{record[currentTabConfig.nameKey] || 'N/A'}</AppTableCell>
              <AppTableCell className="text-xs text-gray-500">{new Date(record.updated_at).toLocaleString()}</AppTableCell>
              <AppTableCell className="text-right">
                {activeView === "deleted" ? (
                  <div className="flex justify-end gap-2">
                    {canRestore && (
                      <AppButton variant="secondary" size="sm" onClick={() => handleAction('restore', [record.id])} disabled={isProcessing}>
                        Restore
                      </AppButton>
                    )}
                    {canPurge && (
                      <AppButton variant="destructive" size="sm" onClick={() => handleAction('purge', [record.id])} disabled={isProcessing} leftIcon={<Trash2 className="h-3.5 w-3.5" />}>
                        Purge
                      </AppButton>
                    )}
                  </div>
                ) : (
                  <AppBadge variant="success">Active Record</AppBadge>
                )}
              </AppTableCell>
            </AppTableRow>
          ))}
          {records.length === 0 && (
            <AppTableRow>
              <AppTableCell colSpan={(activeView === "deleted" || activeTab === "tasks") ? 5 : 4} className="text-center py-8 text-gray-500">
                {isLoading ? "Loading records..." : "No records found in this view."}
              </AppTableCell>
            </AppTableRow>
          )}
        </AppTableBody>
      </AppTable>
    </AppTableContainer>
    </div>
  );

  return (
    <div className="space-y-6">
      
      {/* Error Popup Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-rose-950 border border-rose-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-rose-900/20">
            <div className="flex items-center gap-3 text-rose-500 mb-4">
              <ShieldAlert className="h-8 w-8" />
              <h3 className="text-xl font-bold">Deletion Blocked</h3>
            </div>
            <p className="text-rose-200/80 text-sm mb-6 leading-relaxed">
              This record cannot be permanently deleted because active transactions or records are currently attached to it. 
              <br/><br/>
              <strong>System Message:</strong> {errorDetails}
              <br/><br/>
              Please delete or reassign all attached tasks, workspaces, or requirements before purging this master record.
            </p>
            <div className="flex justify-end">
              <AppButton variant="secondary" onClick={() => setShowErrorModal(false)}>
                Acknowledge
              </AppButton>
            </div>
          </div>
        </div>
      )}

      {/* Action Banners */}
      {errorBanner && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-start gap-3">
          <AlertOctagon className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <h4 className="font-bold text-rose-500 uppercase tracking-wider">Action Failed</h4>
            <p className="text-rose-400/80">{errorBanner}</p>
          </div>
        </div>
      )}
      
      {successBanner && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-start gap-3">
          <CheckSquare className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <h4 className="font-bold text-emerald-500 uppercase tracking-wider">Success</h4>
            <p className="text-emerald-400/80">{successBanner}</p>
          </div>
        </div>
      )}

      {/* Module Tabs (Scrollable for many tabs) */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-4 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <AppButton 
              variant={isActive ? "primary" : "secondary"}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-bold transition-all whitespace-nowrap shadow-sm ${
                isActive 
                  ? "shadow-accent/20" 
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </AppButton>
          );
        })}
      </div>

      {/* View Toggle (Active vs Deleted) */}
      <AppCard className="overflow-hidden">
        <AppCardHeader className="flex flex-row items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-4">
            <AppCardTitle className="flex items-center gap-2 text-foreground">
              <Archive className="h-4 w-4" />
              <span>{currentTabConfig.label} Registry</span>
            </AppCardTitle>
            
            <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
              <AppButton variant="secondary"
                onClick={() => setActiveView("active")}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  activeView === "active" ? "bg-white/20 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Active Records
              </AppButton>
              <AppButton variant="secondary"
                onClick={() => setActiveView("deleted")}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeView === "deleted" ? "bg-rose-500/20 text-rose-400 shadow-sm border border-rose-500/30" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                Recycle Bin
              </AppButton>
            </div>
          </div>
        </AppCardHeader>

        <div className="p-0">
          {renderDataGrid()}
        </div>
      </AppCard>

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
