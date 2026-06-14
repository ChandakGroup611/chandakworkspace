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
import { Trash2, AlertOctagon, Archive, ShieldAlert, FolderKanban, Ticket, RefreshCcw, CheckSquare } from "lucide-react";
import { fetchComplianceWorkspaces, fetchComplianceTasks, hardDeleteEntity, restoreEntity } from "@/lib/actions/compliance";
import { usePermissions } from "@/hooks/usePermissions";

type TabType = "workspaces" | "tasks";
type ViewType = "active" | "deleted";

export default function DataRetentionClient() {
  const { roleCode, hasPermission } = usePermissions();
  const isSuperAdmin = roleCode === "SUPER_ADMIN" || hasPermission("SUPER_ADMIN");
  const canRestore = isSuperAdmin || hasPermission("COMPLIANCE_UPDATE");
  const canPurge = isSuperAdmin || hasPermission("COMPLIANCE_DELETE");

  const [activeTab, setActiveTab] = useState<TabType>("workspaces");
  const [activeView, setActiveView] = useState<ViewType>("active");
  const [isLoading, setIsLoading] = useState(false);
  
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Deletion/Restore State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const isDeleted = activeView === "deleted";
      if (activeTab === "workspaces") {
        const data = await fetchComplianceWorkspaces(isDeleted);
        setWorkspaces(data);
      } else {
        const data = await fetchComplianceTasks(isDeleted);
        setTasks(data);
      }
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
      if (actionType === 'restore') {
        await restoreEntity(activeTab, ids);
        setSuccessBanner(`Successfully restored ${ids.length} record(s).`);
      } else {
        await hardDeleteEntity(activeTab, ids);
        setSuccessBanner(`Successfully purged ${ids.length} record(s).`);
      }
      setSelectedIds(new Set());
      await loadData();
    } catch (e: any) {
      setErrorBanner(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderWorkspaces = () => (
    <div className="space-y-4">
      {selectedIds.size > 0 && activeView === "deleted" && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between mx-4 mt-4">
          <span className="text-sm font-bold text-gray-300">{selectedIds.size} workspace(s) selected</span>
          <div className="flex gap-2">
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
          </div>
        </div>
      )}
      <AppTableContainer>
        <AppTable>
          <AppTableHeader>
            <tr>
              {activeView === "deleted" && (
                <AppTableHead className="w-[40px]">
                  <input type="checkbox" checked={selectedIds.size === workspaces.length && workspaces.length > 0} onChange={() => toggleAll(workspaces.map(w => w.id))} className="rounded border-gray-600 bg-black/20" />
                </AppTableHead>
              )}
              <AppTableHead>Workspace Code</AppTableHead>
              <AppTableHead>Name</AppTableHead>
              <AppTableHead>Last Updated</AppTableHead>
              <AppTableHead className="text-right">Actions</AppTableHead>
            </tr>
          </AppTableHeader>
        <AppTableBody>
          {workspaces.map((ws) => (
            <AppTableRow key={ws.id}>
              {activeView === "deleted" && (
                <AppTableCell>
                  <input type="checkbox" checked={selectedIds.has(ws.id)} onChange={() => toggleSelection(ws.id)} className="rounded border-gray-600 bg-black/20" />
                </AppTableCell>
              )}
              <AppTableCell className="font-mono text-xs">{ws.workspace_code}</AppTableCell>
              <AppTableCell className="font-semibold">{ws.workspace_name}</AppTableCell>
              <AppTableCell className="text-xs text-gray-500">{new Date(ws.updated_at).toLocaleString()}</AppTableCell>
              <AppTableCell className="text-right">
                {activeView === "deleted" ? (
                  <div className="flex justify-end gap-2">
                    {canRestore && (
                      <AppButton variant="secondary" size="sm" onClick={() => handleAction('restore', [ws.id])} disabled={isProcessing}>
                        Restore
                      </AppButton>
                    )}
                    {canPurge && (
                      <AppButton variant="destructive" size="sm" onClick={() => handleAction('purge', [ws.id])} disabled={isProcessing} leftIcon={<Trash2 className="h-3.5 w-3.5" />}>
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
          {workspaces.length === 0 && (
            <AppTableRow>
              <AppTableCell colSpan={activeView === "deleted" ? 5 : 4} className="text-center py-8 text-gray-500">
                {isLoading ? "Loading records..." : "No records found in this view."}
              </AppTableCell>
            </AppTableRow>
          )}
        </AppTableBody>
      </AppTable>
    </AppTableContainer>
    </div>
  );

  const renderTasks = () => (
    <div className="space-y-4">
      {selectedIds.size > 0 && activeView === "deleted" && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between mx-4 mt-4">
          <span className="text-sm font-bold text-gray-300">{selectedIds.size} task(s) selected</span>
          <div className="flex gap-2">
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
          </div>
        </div>
      )}
      <AppTableContainer>
        <AppTable>
          <AppTableHeader>
            <tr>
              {activeView === "deleted" && (
                <AppTableHead className="w-[40px]">
                  <input type="checkbox" checked={selectedIds.size === tasks.length && tasks.length > 0} onChange={() => toggleAll(tasks.map(t => t.id))} className="rounded border-gray-600 bg-black/20" />
                </AppTableHead>
              )}
              <AppTableHead>Task ID</AppTableHead>
              <AppTableHead>Title/Subject</AppTableHead>
              <AppTableHead>Last Updated</AppTableHead>
              <AppTableHead className="text-right">Actions</AppTableHead>
            </tr>
          </AppTableHeader>
        <AppTableBody>
          {tasks.map((task) => (
            <AppTableRow key={task.id}>
              {activeView === "deleted" && (
                <AppTableCell>
                  <input type="checkbox" checked={selectedIds.has(task.id)} onChange={() => toggleSelection(task.id)} className="rounded border-gray-600 bg-black/20" />
                </AppTableCell>
              )}
              <AppTableCell className="font-mono text-xs">{task.task_number || task.id.split('-')[0]}</AppTableCell>
              <AppTableCell className="font-semibold">{task.subject || task.description}</AppTableCell>
              <AppTableCell className="text-xs text-gray-500">{new Date(task.updated_at).toLocaleString()}</AppTableCell>
              <AppTableCell className="text-right">
                {activeView === "deleted" ? (
                  <div className="flex justify-end gap-2">
                    {canRestore && (
                      <AppButton variant="secondary" size="sm" onClick={() => handleAction('restore', [task.id])} disabled={isProcessing}>
                        Restore
                      </AppButton>
                    )}
                    {canPurge && (
                      <AppButton variant="destructive" size="sm" onClick={() => handleAction('purge', [task.id])} disabled={isProcessing} leftIcon={<Trash2 className="h-3.5 w-3.5" />}>
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
          {tasks.length === 0 && (
            <AppTableRow>
              <AppTableCell colSpan={activeView === "deleted" ? 5 : 4} className="text-center py-8 text-gray-500">
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
      
      {/* Warning Banner Removed to unblock Purge actions */}

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

      {/* Module Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab("workspaces")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === "workspaces" 
              ? "bg-blue-500 text-white shadow-md shadow-blue-500/20" 
              : "bg-white/5 text-gray-400 hover:bg-white/10"
          }`}
        >
          <FolderKanban className="h-4 w-4" />
          Workspaces
        </button>
        <button
          onClick={() => setActiveTab("tasks")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === "tasks" 
              ? "bg-blue-500 text-white shadow-md shadow-blue-500/20" 
              : "bg-white/5 text-gray-400 hover:bg-white/10"
          }`}
        >
          <Ticket className="h-4 w-4" />
          Tasks
        </button>
      </div>

      {/* View Toggle (Active vs Deleted) */}
      <AppCard className="overflow-hidden">
        <AppCardHeader className="flex flex-row items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-4">
            <AppCardTitle className="flex items-center gap-2 text-white">
              <Archive className="h-4 w-4" />
              <span>{activeTab === "workspaces" ? "Workspaces" : "Tasks"} Registry</span>
            </AppCardTitle>
            
            <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
              <button
                onClick={() => setActiveView("active")}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  activeView === "active" ? "bg-white/20 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Active Records
              </button>
              <button
                onClick={() => setActiveView("deleted")}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeView === "deleted" ? "bg-rose-500/20 text-rose-400 shadow-sm border border-rose-500/30" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                Recycle Bin
              </button>
            </div>
          </div>
        </AppCardHeader>

        <div className="p-0">
          {activeTab === "workspaces" ? renderWorkspaces() : renderTasks()}
        </div>
      </AppCard>

    </div>
  );
}
