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
import { Trash2, AlertOctagon, Archive, ShieldAlert, FolderKanban, Ticket } from "lucide-react";
import { fetchComplianceWorkspaces, fetchComplianceTasks, hardDeleteEntity } from "@/lib/actions/compliance";
import { usePermissions } from "@/hooks/usePermissions";

type TabType = "workspaces" | "tasks";
type ViewType = "active" | "deleted";

export default function DataRetentionClient() {
  const { roleCode } = usePermissions();
  const isSuperAdmin = roleCode === "SUPER_ADMIN";

  const [activeTab, setActiveTab] = useState<TabType>("workspaces");
  const [activeView, setActiveView] = useState<ViewType>("active");
  const [isLoading, setIsLoading] = useState(false);
  
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  // Deletion State
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

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
  }, [activeTab, activeView]);

  const handleHardDelete = async (id: string) => {
    if (!isSuperAdmin) {
      alert("Only SUPER_ADMIN roles can perform permanent hard deletions.");
      return;
    }

    if (!confirm("CRITICAL WARNING: This action is permanent and cannot be undone. Are you absolutely sure you want to hard delete this record?")) {
      return;
    }

    setIsDeleting(id);
    try {
      await hardDeleteEntity(activeTab, id);
      // Reload lists
      await loadData();
    } catch (e: any) {
      alert("Failed to hard delete: " + e.message);
    } finally {
      setIsDeleting(null);
    }
  };

  const renderWorkspaces = () => (
    <AppTableContainer>
      <AppTable>
        <AppTableHeader>
          <tr>
            <AppTableHead>Workspace Code</AppTableHead>
            <AppTableHead>Name</AppTableHead>
            <AppTableHead>Last Updated</AppTableHead>
            <AppTableHead className="text-right">Actions</AppTableHead>
          </tr>
        </AppTableHeader>
        <AppTableBody>
          {workspaces.map((ws) => (
            <AppTableRow key={ws.id}>
              <AppTableCell className="font-mono text-xs">{ws.code}</AppTableCell>
              <AppTableCell className="font-semibold">{ws.name}</AppTableCell>
              <AppTableCell className="text-xs text-gray-500">{new Date(ws.updated_at).toLocaleString()}</AppTableCell>
              <AppTableCell className="text-right">
                {activeView === "deleted" ? (
                  <AppButton 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => handleHardDelete(ws.id)}
                    isLoading={isDeleting === ws.id}
                    disabled={!isSuperAdmin || isDeleting !== null}
                    leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                  >
                    Purge
                  </AppButton>
                ) : (
                  <AppBadge variant="success">Active Record</AppBadge>
                )}
              </AppTableCell>
            </AppTableRow>
          ))}
          {workspaces.length === 0 && (
            <AppTableRow>
              <AppTableCell colSpan={4} className="text-center py-8 text-gray-500">
                {isLoading ? "Loading records..." : "No records found in this view."}
              </AppTableCell>
            </AppTableRow>
          )}
        </AppTableBody>
      </AppTable>
    </AppTableContainer>
  );

  const renderTasks = () => (
    <AppTableContainer>
      <AppTable>
        <AppTableHeader>
          <tr>
            <AppTableHead>Task ID</AppTableHead>
            <AppTableHead>Title/Subject</AppTableHead>
            <AppTableHead>Last Updated</AppTableHead>
            <AppTableHead className="text-right">Actions</AppTableHead>
          </tr>
        </AppTableHeader>
        <AppTableBody>
          {tasks.map((task) => (
            <AppTableRow key={task.id}>
              <AppTableCell className="font-mono text-xs">{task.task_number || task.id.split('-')[0]}</AppTableCell>
              <AppTableCell className="font-semibold">{task.subject || task.title}</AppTableCell>
              <AppTableCell className="text-xs text-gray-500">{new Date(task.updated_at).toLocaleString()}</AppTableCell>
              <AppTableCell className="text-right">
                {activeView === "deleted" ? (
                  <AppButton 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => handleHardDelete(task.id)}
                    isLoading={isDeleting === task.id}
                    disabled={!isSuperAdmin || isDeleting !== null}
                    leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                  >
                    Purge
                  </AppButton>
                ) : (
                  <AppBadge variant="success">Active Record</AppBadge>
                )}
              </AppTableCell>
            </AppTableRow>
          ))}
          {tasks.length === 0 && (
            <AppTableRow>
              <AppTableCell colSpan={4} className="text-center py-8 text-gray-500">
                {isLoading ? "Loading records..." : "No records found in this view."}
              </AppTableCell>
            </AppTableRow>
          )}
        </AppTableBody>
      </AppTable>
    </AppTableContainer>
  );

  return (
    <div className="space-y-6">
      
      {/* Warning Banner */}
      {!isSuperAdmin && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
          <AlertOctagon className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <h4 className="font-bold text-amber-500 uppercase tracking-wider">Access Restricted</h4>
            <p className="text-amber-400/80">You are currently viewing Data Retention in read-only mode. Only SUPER_ADMINs are authorized to execute permanent Purge (Hard Delete) actions against soft-deleted records.</p>
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
