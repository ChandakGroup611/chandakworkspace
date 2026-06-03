"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { useTheme } from "@/components/theme/ThemeProvider";
import { 
  FolderKanban, Users, Activity, Plus, Send, 
  Layers, GitMerge, ChevronDown, Building2, Calendar, Target,
  Loader2, ShieldAlert, Sparkles, ShieldCheck, Search, Filter
} from "lucide-react";
import { 
  fetchWorkspaces, fetchTasksByWorkspace, toggleChecklistItem, 
  fetchWorkspaceStakeholders, createWorkspace, createTask, fetchCompanies, fetchPriorities,
  updateWorkspace, deleteWorkspace, fetchWorkspaceDashboardData
} from "@/lib/actions/workspaces";
import { usePermissions } from "@/hooks/usePermissions";
import { usePresence } from "@/hooks/use-presence";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import TaskCreationWizard from "@/components/tasks/TaskCreationWizard";
import TaskExecutionController from "@/components/tasks/TaskExecutionController";
import { TaskDetailDrawer } from "@/components/tasks/TaskDetailDrawer";
import { EnterpriseWizardShell } from "@/components/ui/enterprise/EnterpriseWizardShell";
import { getTaskDetails, updateNodeStatus } from "@/lib/actions/tasks";
import { useRouter } from "next/navigation";
import { WorkspaceMasterTable } from "@/components/workspaces/WorkspaceMasterTable";
import { SprintBoard } from "@/components/workspaces/sprints/SprintBoard";
export default function WorkspacesClient({ initialData, initialTaskId }: { initialData: any; initialTaskId?: string | null }) {
  const router = useRouter();
  const { theme } = useTheme();
  const { hasPermission, loading: permsLoading } = usePermissions();
  const isLightMode = theme === "executive-light";

  const [workspaces, setWorkspaces] = useState<any[]>(initialData?.workspaces || []);
  const [companies, setCompanies] = useState<any[]>(initialData?.companies || []);
  const [priorities, setPriorities] = useState<any[]>(initialData?.priorities || []);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<any>(initialData?.workspaces?.find((w: any) => w.id === initialData?.prefetchWorkspaceId) || null);
  const [tasks, setTasks] = useState<any[]>(initialData?.prefetchTasks || []);
  const [stakeholders, setStakeholders] = useState<any[]>(initialData?.prefetchStakeholders || []);
  const [masterHierarchy, setMasterHierarchy] = useState<any[]>(initialData?.masterHierarchy || []);
  const [loading, setLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };
  const [currentUser, setCurrentUser] = useState<any>(initialData?.userProfile || null);
  const [mounted, setMounted] = useState(false);
  const lastFetchedWorkspaceId = React.useRef<string | null>(initialData?.prefetchWorkspaceId || null);

  useEffect(() => {
    setMounted(true);
    // Asynchronously mark task as read if opened via URL
    if (initialTaskId) {
      fetch('/api/mentions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'mark_read', taskId: initialTaskId })
      }).catch(() => {});
    }
  }, [initialTaskId]);

  // Real-time presence tracking via server-side heartbeat
  const allUserIds = useMemo(
    () => allUsers.map((u: any) => u.id).filter(Boolean),
    [allUsers]
  );
  const presenceMap = usePresence(allUserIds);
  const onlineUsers = useMemo(() => {
    const set = new Set<string>();
    for (const [userId, info] of presenceMap) {
      if (info.isOnline) set.add(userId);
    }
    return set;
  }, [presenceMap]);

  const filteredWorkspaces = workspaces;

  const filteredTasks = tasks;

  const workspaceHierarchy = React.useMemo(() => {
    const wsMap = new Map();
    const roots: any[] = [];
    workspaces.forEach(w => {
      wsMap.set(w.id, { ...w, subWorkspaces: [] });
    });
    workspaces.forEach(w => {
      if (w.parent_workspace_id && wsMap.has(w.parent_workspace_id)) {
        wsMap.get(w.parent_workspace_id).subWorkspaces.push(wsMap.get(w.id));
      } else {
        roots.push(wsMap.get(w.id));
      }
    });
    return roots;
  }, [workspaces]);

  const renderWorkspaceTree = (nodes: any[], depth = 0) => {
    return nodes.map(w => (
      <React.Fragment key={w.id}>
        <button 
          onClick={() => setActiveWorkspace(workspaces.find(orig => orig.id === w.id))}
          className={`w-full text-left py-3 text-xs transition-colors border-b last:border-0 ${
            isLightMode 
              ? (activeWorkspace?.id === w.id ? 'bg-indigo-50 border-gray-100' : 'hover:bg-gray-50 border-gray-100')
              : (activeWorkspace?.id === w.id ? 'bg-indigo-500/10 border-white/5' : 'hover:bg-white/5 border-white/5')
          }`}
          style={{ paddingLeft: `${1 + depth * 1.5}rem`, paddingRight: '1rem' }}
        >
          <div className="flex items-center gap-2">
            {depth > 0 && <span className={isLightMode ? "text-gray-400" : "text-gray-600"}>↳</span>}
            <div className={`font-bold ${isLightMode ? "text-gray-900" : "text-white"}`}>{w.code}</div>
          </div>
          <div className={`text-[10px] text-gray-500 truncate ${depth > 0 ? "ml-4" : ""}`}>{w.name}</div>
        </button>
        {w.subWorkspaces && w.subWorkspaces.length > 0 && renderWorkspaceTree(w.subWorkspaces, depth + 1)}
      </React.Fragment>
    ));
  };

  
  // Modals
  const [wsModalMode, setWsModalMode] = useState<'ROOT' | 'SUB' | 'EDIT' | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [drawerTask, setDrawerTask] = useState<any>(null);
  const [editWSId, setEditWSId] = useState<string | null>(null);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const [activeView, setActiveView] = useState<'HIERARCHY' | 'SPRINTS'>('HIERARCHY');

  const [newWS, setNewWS] = useState({ 
    name: "", 
    code: "", 
    description: "", 
    company_id: "", 
    parent_workspace_id: "",
    assigneeIds: [] as string[],
    start_date: "", 
    end_date: "",
    is_public: false
  });
  const [creatingTaskWorkspaceId, setCreatingTaskWorkspaceId] = useState<string | null>(null);

  const parentWorkspace = newWS.parent_workspace_id 
    ? workspaces.find(w => w.id === newWS.parent_workspace_id) 
    : null;

  const availableUsers = parentWorkspace 
    ? allUsers.filter(u => parentWorkspace.members?.some((m: any) => m.user_id === u.id) || u.id === currentUser?.id)
    : allUsers;

  // Fetch users immediately if missing (e.g. on hot reload or missing initialData)
  useEffect(() => {
    if (allUsers.length === 0) {
      import("@/lib/actions/workspaces").then(m => {
        m.fetchAssignableUsers().then(users => setAllUsers(users));
      });
    }
  }, [allUsers.length]);

  // Removed client-side mount data fetching useEffect as data is now provided securely by Server Component

  useEffect(() => {
    if (!activeWorkspace) {
      setTasks([]);
      setStakeholders([]);
      lastFetchedWorkspaceId.current = null;
      return;
    }

    // Prevent double-fetching on initial mount/load
    if (lastFetchedWorkspaceId.current === activeWorkspace.id) return;

    async function loadWorkspaceData() {
      lastFetchedWorkspaceId.current = activeWorkspace.id;
      // Clear out the stale data immediately so the UI reflects the new workspace
      setTasks([]);
      setStakeholders([]);

      const [tData, sData] = await Promise.all([
        fetchTasksByWorkspace(activeWorkspace.id),
        fetchWorkspaceStakeholders(activeWorkspace.id)
      ]);
      setTasks(tData);
      setStakeholders(sData);
    }
    loadWorkspaceData();
  }, [activeWorkspace?.id]);

  const handleCreateWorkspace = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (newWS.start_date && newWS.end_date && new Date(newWS.end_date) < new Date(newWS.start_date)) {
      alert("Target End Date cannot be earlier than the Start Date.");
      return;
    }
    try {
      let finalName = newWS.name;
      if (wsModalMode === 'SUB' && newWS.parent_workspace_id) {
        const pName = workspaces.find(w => w.id === newWS.parent_workspace_id)?.name;
        if (pName) {
          finalName = `${pName} - ${newWS.name}`;
        }
      }

      const payload = {
        name: finalName,
        description: newWS.description,
        company_id: newWS.company_id || null,
        start_date: newWS.start_date || null,
        end_date: newWS.end_date || null,
        assigneeIds: newWS.assigneeIds,
        parent_workspace_id: newWS.parent_workspace_id || null,
        visibility_settings: { public: newWS.is_public }
      };
      
      let data: any;
      if (editWSId) {
        data = await updateWorkspace(editWSId, payload);
        // Close modal immediately for snappy UI
        setWsModalMode(null);
        setEditWSId(null);
        triggerToast("Workspace updated successfully");
        
        const selectedCompany = companies.find(c => c.id === newWS.company_id);
        if (selectedCompany) data.company = selectedCompany;
        
        const updatedList = workspaces.map(w => w.id === editWSId ? data : w);
        setWorkspaces(updatedList);
        setActiveWorkspace(data);
      } else {
        data = await createWorkspace(payload);
        // Close modal immediately for snappy UI
        setWsModalMode(null);
        setEditWSId(null);
        triggerToast("Workspace created successfully");
        
        const selectedCompany = companies.find(c => c.id === newWS.company_id);
        if (selectedCompany) data.company = selectedCompany;
        
        setWorkspaces([data, ...workspaces]);
        setActiveWorkspace(data);
      }
      
      // Refresh the execution hierarchy tree to show the newly created workspace
      import("@/lib/actions/workspaces").then(m => {
        m.fetchMasterHierarchy().then(hier => setMasterHierarchy(hier));
      });
      
      setNewWS({ 
        name: "", 
        code: "", 
        description: "", 
        company_id: "", 
        parent_workspace_id: "",
        assigneeIds: [],
        start_date: "", 
        end_date: "",
        is_public: false
      });
      setAssigneeSearch("");
      setAssigneeDropdownOpen(false);
    } catch (err: any) {
      console.error("[Workspace Creation] Intercepted:", err.message || err);
      alert("Database Error on Workspace Save: " + (err.message || err.details || JSON.stringify(err)));
    }
  };

  const openEditWorkspace = (ws: any) => {
    setEditWSId(ws.id);
    setNewWS({
      name: ws.name,
      code: ws.code,
      description: ws.description || "",
      company_id: ws.company_id || "",
      parent_workspace_id: ws.parent_workspace_id || "",
      assigneeIds: ws.members?.map((m: any) => m.user_id) || [],
      start_date: ws.start_date ? new Date(ws.start_date).toISOString().split('T')[0] : "",
      end_date: ws.end_date ? new Date(ws.end_date).toISOString().split('T')[0] : "",
      is_public: !!ws.visibility_settings?.public
    });
    setAssigneeSearch("");
    setAssigneeDropdownOpen(false);
    setWsModalMode('EDIT');
  };

  const handleDeleteWorkspace = async (id: string) => {
    if (!confirm("Are you sure you want to delete this workspace? This will permanently delete all tasks, chat messages, and timeline audits inside it.")) return;
    try {
      await deleteWorkspace(id);
      const updatedList = workspaces.filter(w => w.id !== id);
      setWorkspaces(updatedList);
      triggerToast("Workspace deleted successfully");
      if (updatedList.length > 0) {
        setActiveWorkspace(updatedList[0]);
      } else {
        setActiveWorkspace(null);
      }
      
      // Refresh the execution hierarchy tree to show the deleted workspace
      import("@/lib/actions/workspaces").then(m => {
        m.fetchMasterHierarchy().then(hier => setMasterHierarchy(hier));
      });
    } catch (e: any) {
      console.error("[Workspace Deletion] Intercepted:", e.message || e);
      alert("Database Error on Workspace Deletion: " + (e.message || e.details || JSON.stringify(e)));
    }
  };

  const handleTaskWizardSuccess = async (taskData: any) => {
    try {
      const data = await createTask({ ...taskData, workspace_id: taskData.workspace_id || activeWorkspace?.id });
      
      // Close modal immediately for instant UI feedback
      setIsCreatingTask(false);
      triggerToast("Task created successfully");
      
      // Optimistically insert to list for instant update
      setTasks(prev => [data, ...prev]);

      // Refetch full data with relations in background silently
      if (activeWorkspace?.id) {
        fetchTasksByWorkspace(activeWorkspace.id).then(tData => setTasks(tData)).catch(console.error);
      }

      // Refresh the execution hierarchy tree to show the newly created task
      import("@/lib/actions/workspaces").then(m => {
        m.fetchMasterHierarchy().then(hier => setMasterHierarchy(hier));
      });
    } catch (err: any) {
      console.error("[Task Creation] Intercepted:", err.message || err);
      alert("Database Error on Task Creation: " + (err.message || err.details || JSON.stringify(err)));
    }
  };

  if (!mounted || permsLoading || loading) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center space-y-4 transition-colors duration-300 ${
        isLightMode ? "bg-gray-50 text-gray-900" : "bg-[#070913] text-white"
      }`}>
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
        <p className="text-xs text-gray-500 font-bold tracking-[0.2em] uppercase">Hydrating Enterprise Workspaces...</p>
      </div>
    );
  }

  if (!hasPermission("WORKSPACES_VIEW")) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center space-y-4 transition-colors duration-300 ${
        isLightMode ? "bg-gray-50 text-gray-900" : "bg-[#070913] text-white"
      }`}>
        <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-xs text-gray-500">You do not have capabilities to view the Workspace & Task Engine Dashboard.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col font-sans p-2 md:px-4 space-y-2 ${isLightMode ? "bg-gray-50" : "bg-[#070913]"}`}>
      
      {/* Dynamic Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FolderKanban className={`h-6 w-6 ${isLightMode ? "text-indigo-600" : "text-indigo-400"}`} />
            <h1 className={`text-2xl font-bold tracking-tight ${isLightMode ? "text-gray-900" : "text-white"}`}>Workspace & Task Engine</h1>
            <AppBadge variant="info">Enterprise Tier</AppBadge>
          </div>
          <p className="text-xs text-gray-500">Real-time collaborative project workspaces linked to corporate masters.</p>
        </div>



        <div className="flex items-center gap-3">
          {/* Search & Filter Header Inputs */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search workspaces..." 
              className={`pl-9 pr-4 py-1.5 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-indigo-500 w-48 transition-all ${
                isLightMode ? 'bg-white border-gray-300 text-gray-900 focus:w-64' : 'bg-black/30 border-white/10 text-white focus:w-64'
              }`}
            />
          </div>
          <AppButton variant="outline" size="sm" leftIcon={<Filter className="h-4 w-4" />}>
            Filters
          </AppButton>
          
          <AppButton 
            variant="primary" 
            size="sm" 
            leftIcon={<Plus className="h-4 w-4" />} 
            onClick={() => {
              setNewWS({...newWS, parent_workspace_id: ""});
              setWsModalMode('ROOT');
            }}
            disabled={!hasPermission("WORKSPACES_CREATE")}
          >
            New Workspace
          </AppButton>
        </div>
      </div>

      {/* Full Width Master Table Layout */}
      {workspaces.length > 0 ? (
        <div className="flex-1 flex flex-col">
            
            {/* Hierarchical Task Matrix */}
            <AppCard className="flex-1 p-5 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b pb-3 mb-4 border-gray-200 dark:border-white/5">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setActiveView('HIERARCHY')}
                    className={`flex items-center gap-2 text-sm font-bold pb-3 border-b-2 transition-colors ${activeView === 'HIERARCHY' ? (isLightMode ? "border-purple-600 text-purple-600" : "border-purple-400 text-purple-400") : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"}`}
                    style={{ marginBottom: "-14px" }}
                  >
                    <GitMerge className="h-4 w-4" />
                    <span>Execution Hierarchy</span>
                  </button>
                  <button 
                    onClick={() => setActiveView('SPRINTS')}
                    className={`flex items-center gap-2 text-sm font-bold pb-3 border-b-2 transition-colors ${activeView === 'SPRINTS' ? (isLightMode ? "border-indigo-600 text-indigo-600" : "border-indigo-400 text-indigo-400") : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"}`}
                    style={{ marginBottom: "-14px" }}
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Sprint Planning</span>
                  </button>
                </div>
              </div>

              {activeView === 'HIERARCHY' ? (
                <div className="flex-1 overflow-visible">

              <WorkspaceMasterTable 
                hierarchy={masterHierarchy} 
                isLightMode={isLightMode}
                taskStatuses={initialData?.taskStatuses || []}
                allUsers={allUsers}
                onlineUsers={onlineUsers}
                presenceMap={presenceMap}
                onOpenTask={(taskNode) => setDrawerTask(taskNode)}
                onOpenWorkspace={(node) => openEditWorkspace(node)}
                onShareNode={(node) => openEditWorkspace(node)}
                onCreateSubWorkspace={(node) => {
                  setNewWS({ ...newWS, parent_workspace_id: node.id });
                  setWsModalMode('SUB');
                }}
                onCreateTask={(node) => {
                  setCreatingTaskWorkspaceId(node.id);
                  setIsCreatingTask(true);
                }}
                onDeleteNode={(node) => {
                  if (node.type === 'WORKSPACE' || node.type === 'SUB_WORKSPACE') {
                    handleDeleteWorkspace(node.id);
                  } else {
                    alert("Deleting tasks directly from this table is coming soon.");
                  }
                }}
              />
              </div>
              ) : (
                <div className="flex-1 overflow-hidden">
                  <SprintBoard workspaceId={workspaces[0]?.id} />
                </div>
              )}
            </AppCard>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <FolderKanban className="h-12 w-12 text-gray-400 opacity-50" />
          <h2 className={`text-lg font-bold ${isLightMode ? "text-gray-700" : "text-gray-300"}`}>No Active Workspaces Found</h2>
          <p className="text-xs text-gray-500">Initialize a new enterprise workspace to begin orchestrating tasks.</p>
          <AppButton variant="primary" onClick={() => setWsModalMode('ROOT')} disabled={!hasPermission("WORKSPACES_CREATE")}>Create Workspace</AppButton>
        </div>
      )}

      {/* Creation Overlays */}
      {wsModalMode !== null && (
        <EnterpriseWizardShell
          title={wsModalMode === 'EDIT' ? "Edit Workspace" : (wsModalMode === 'SUB' ? "New Sub-Workspace" : "Provision Workspace")}
          subtitle="Configure workspace scope, timeline, and stakeholder access."
          onClose={() => { setWsModalMode(null); setEditWSId(null); }}
          size="md"
          headerAccent="indigo"
          footer={
            <div className="flex justify-end gap-3 w-full">
              <AppButton variant="ghost" onClick={() => { setWsModalMode(null); setEditWSId(null); }}>Cancel</AppButton>
              <AppButton variant="primary" onClick={handleCreateWorkspace} className="bg-indigo-600 hover:bg-indigo-700">{editWSId ? "Save Changes" : "Provision Workspace"}</AppButton>
            </div>
          }
        >
          <div className="space-y-6">
            
            {/* Section 1: Workspace Identity */}
            <div className={`p-5 rounded-2xl border ${isLightMode ? "bg-white/60 border-gray-200/60 shadow-sm" : "bg-white/[0.02] border-white/5 shadow-lg"}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-1.5 rounded-lg ${isLightMode ? "bg-indigo-100 text-indigo-600" : "bg-indigo-500/20 text-indigo-400"}`}>
                  <Building2 className="h-4 w-4" />
                </div>
                <h3 className={`text-sm font-bold tracking-wide ${isLightMode ? "text-gray-900" : "text-white"}`}>Workspace Identity</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-5 mb-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Company / Entity Link *</label>
                  <select 
                    className={`w-full p-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-colors ${
                      isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-black/30 border-white/10 text-white"
                    }`}
                    value={newWS.company_id}
                    onChange={e => setNewWS({...newWS, company_id: e.target.value})}
                  >
                    <option value="" disabled>-- Select Company --</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Workspace Name *</label>
                  <AppInput disabled={!!editWSId} placeholder="e.g. Q4 Platform Migration" value={newWS.name} onChange={e => setNewWS({...newWS, name: e.target.value})} className={isLightMode ? "bg-white" : "bg-black/30"} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Workspace Code</label>
                  <AppInput disabled placeholder="[Auto-Generated]" value={editWSId ? newWS.code : "[Auto-Generated]"} className={isLightMode ? "bg-gray-50" : "bg-white/5"} />
                </div>
              </div>

              {(wsModalMode === 'SUB' || (wsModalMode === 'EDIT' && newWS.parent_workspace_id)) && (
                <div className="grid grid-cols-1 mt-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Parent Workspace Link</label>
                    <select 
                      className={`w-full p-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-colors ${
                        isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-black/30 border-white/10 text-white"
                      }`}
                      value={newWS.parent_workspace_id}
                      onChange={e => setNewWS({...newWS, parent_workspace_id: e.target.value})}
                    >
                      <option value="" disabled>-- Select Parent Workspace --</option>
                      {workspaces.filter(w => w.id !== editWSId).map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Timeline & Objectives */}
            <div className={`p-5 rounded-2xl border ${isLightMode ? "bg-white/60 border-gray-200/60 shadow-sm" : "bg-white/[0.02] border-white/5 shadow-lg"}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-1.5 rounded-lg ${isLightMode ? "bg-amber-100 text-amber-600" : "bg-amber-500/20 text-amber-400"}`}>
                  <Target className="h-4 w-4" />
                </div>
                <h3 className={`text-sm font-bold tracking-wide ${isLightMode ? "text-gray-900" : "text-white"}`}>Timeline & Objectives</h3>
              </div>

              <div className="grid grid-cols-2 gap-5 mb-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date</label>
                  <AppInput type="date" value={newWS.start_date} onChange={e => setNewWS({...newWS, start_date: e.target.value})} className={isLightMode ? "bg-white" : "bg-black/30"} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target End Date</label>
                  <AppInput type="date" value={newWS.end_date} onChange={e => setNewWS({...newWS, end_date: e.target.value})} className={isLightMode ? "bg-white" : "bg-black/30"} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Objective Description</label>
                <textarea 
                  className={`w-full h-24 p-3 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors resize-none ${
                    isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-black/30 border-white/10 text-white"
                  }`}
                  placeholder="Detailed project requirements, goals, and constraints..."
                  value={newWS.description}
                  onChange={e => setNewWS({...newWS, description: e.target.value})}
                />
              </div>
            </div>

            {/* Section 3: Access & Security */}
            <div className={`p-5 rounded-2xl border ${isLightMode ? "bg-white/60 border-gray-200/60 shadow-sm" : "bg-white/[0.02] border-white/5 shadow-lg"}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-1.5 rounded-lg ${isLightMode ? "bg-emerald-100 text-emerald-600" : "bg-emerald-500/20 text-emerald-400"}`}>
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <h3 className={`text-sm font-bold tracking-wide ${isLightMode ? "text-gray-900" : "text-white"}`}>Access & Stakeholders</h3>
              </div>

              <div className="space-y-1.5 relative mb-6">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Workspace Assignees (Users)</label>
                <div 
                  onClick={() => setAssigneeDropdownOpen(!assigneeDropdownOpen)}
                  className={`w-full p-3 rounded-xl text-sm border flex justify-between items-center cursor-pointer transition-colors ${
                    isLightMode ? "bg-white border-gray-200 hover:border-indigo-300" : "bg-black/30 border-white/10 text-white hover:border-indigo-500/50"
                  }`}
                >
                  <span className={`font-semibold ${newWS.assigneeIds.length > 0 ? (isLightMode ? "text-indigo-600" : "text-indigo-400") : "text-gray-500"}`}>
                    {newWS.assigneeIds.length > 0 ? `${newWS.assigneeIds.length} Personnel Assigned` : "-- Select Stakeholders --"}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${assigneeDropdownOpen ? "rotate-180" : "text-gray-400"}`} />
                </div>
                
                {assigneeDropdownOpen && (
                  <div className={`absolute z-20 w-full mt-2 p-2 rounded-xl border shadow-2xl max-h-[250px] overflow-hidden flex flex-col ${
                    isLightMode ? "bg-white border-gray-200" : "bg-[#0B0D17] border-white/10"
                  }`}>
                    <div className="relative mb-2 shrink-0">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Search personnel..." 
                        value={assigneeSearch} 
                        onChange={e => setAssigneeSearch(e.target.value)} 
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                          }
                        }}
                        className={`w-full pl-8 pr-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                          isLightMode ? "bg-gray-50 border-gray-200 text-gray-900" : "bg-white/5 border-white/10 text-white"
                        }`}
                      />
                    </div>
                    <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-gray-100 dark:border-white/5 shrink-0">
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          const allIds = availableUsers.map(u => u.id);
                          if (newWS.assigneeIds.length === allIds.length && allIds.length > 0) {
                            setNewWS({...newWS, assigneeIds: []});
                          } else {
                            setNewWS({...newWS, assigneeIds: allIds});
                          }
                        }}
                        className={`text-[11px] font-bold uppercase tracking-wider ${isLightMode ? "text-indigo-600 hover:text-indigo-700" : "text-indigo-400 hover:text-indigo-300"}`}
                      >
                        {newWS.assigneeIds.length === availableUsers.length && availableUsers.length > 0 ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                    <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-500/30 scrollbar-track-transparent">
                      {availableUsers.filter(u => u.full_name?.toLowerCase().includes(assigneeSearch.toLowerCase()) || u.user_code?.toLowerCase().includes(assigneeSearch.toLowerCase())).map(u => (
                        <label key={u.id} className={`flex items-center gap-3 text-sm p-2 rounded-lg cursor-pointer transition-colors ${
                          isLightMode ? "hover:bg-indigo-50" : "hover:bg-white/5"
                        }`}>
                          <input 
                            type="checkbox" 
                            checked={newWS.assigneeIds.includes(u.id)} 
                            onChange={e => {
                              if (e.target.checked) setNewWS({...newWS, assigneeIds: [...newWS.assigneeIds, u.id]});
                              else setNewWS({...newWS, assigneeIds: newWS.assigneeIds.filter((id: string) => id !== u.id)});
                            }} 
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4" 
                          />
                          <div className="flex flex-col">
                            <span className={isLightMode ? "text-gray-900 font-medium" : "text-gray-200 font-medium"}>{u.full_name}</span>
                            <span className="opacity-50 text-[10px]">{u.user_code}</span>
                          </div>
                        </label>
                      ))}
                      {availableUsers.length === 0 && <p className="text-xs text-gray-500 p-3 text-center">No users available.</p>}
                    </div>
                  </div>
                )}
              </div>

              <div className={`p-4 rounded-xl border flex items-center gap-3 transition-colors ${
                newWS.is_public 
                  ? (isLightMode ? "bg-indigo-50/50 border-indigo-200" : "bg-indigo-500/10 border-indigo-500/30") 
                  : (isLightMode ? "bg-gray-50 border-gray-200" : "bg-white/5 border-white/10")
              }`}>
                <input 
                  type="checkbox" 
                  id="is_public" 
                  checked={newWS.is_public} 
                  onChange={e => setNewWS({...newWS, is_public: e.target.checked})} 
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-5 w-5 cursor-pointer"
                />
                <label htmlFor="is_public" className="cursor-pointer flex flex-col">
                  <span className={`text-sm font-bold ${isLightMode ? "text-gray-900" : "text-white"}`}>Public Visibility</span>
                  <span className="text-xs text-gray-500">Allow any authenticated personnel to view and join this workspace.</span>
                </label>
              </div>
            </div>

          </div>
        </EnterpriseWizardShell>
      )}

      {isCreatingTask && (activeWorkspace || workspaces.length > 0) && (
        <TaskCreationWizard 
          workspaceId={creatingTaskWorkspaceId || activeWorkspace?.id || workspaces[0]?.id} 
          onClose={() => {
            setIsCreatingTask(false);
            setCreatingTaskWorkspaceId(null);
          }}
          onSuccess={async (newTask: any) => {
            const wsId = creatingTaskWorkspaceId || activeWorkspace?.id || workspaces[0]?.id;
            await handleTaskWizardSuccess({ ...newTask, workspace_id: wsId });
            setCreatingTaskWorkspaceId(null);
          }}
        />
      )}

      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <span className="text-xs font-semibold">{successToast}</span>
        </div>
      )}

      {drawerTask && (
        <TaskDetailDrawer 
          task={drawerTask} 
          onClose={() => setDrawerTask(null)} 
        />
      )}

    </div>
  );
}
