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
  Loader2, ShieldAlert, Sparkles, ShieldCheck
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
import { getTaskDetails } from "@/lib/actions/tasks";

export default function WorkspacesPage() {
  const { theme } = useTheme();
  const { hasPermission, loading: permsLoading } = usePermissions();
  const isLightMode = theme === "executive-light";

  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [stakeholders, setStakeholders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const lastFetchedWorkspaceId = React.useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Real-time presence tracking via server-side heartbeat
  const stakeholderIds = useMemo(
    () => stakeholders.map((s: any) => s.id || s.user_id).filter(Boolean),
    [stakeholders]
  );
  const presenceMap = usePresence(stakeholderIds);
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
  const [editWSId, setEditWSId] = useState<string | null>(null);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);

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

  const parentWorkspace = newWS.parent_workspace_id 
    ? workspaces.find(w => w.id === newWS.parent_workspace_id) 
    : null;

  const availableUsers = parentWorkspace 
    ? allUsers.filter(u => parentWorkspace.workspace_members?.some((m: any) => m.user_id === u.id) || u.id === currentUser?.id)
    : allUsers;

  // Lazy load users when modal opens
  useEffect(() => {
    if (wsModalMode !== null && allUsers.length === 0) {
      import("@/lib/actions/workspaces").then(m => {
        m.fetchAssignableUsers().then(users => setAllUsers(users));
      });
    }
  }, [wsModalMode]);

  useEffect(() => {
    async function init() {
      // 1. Determine if there is a task query param in the URL to prefetch that specific workspace
      let taskWorkspaceId: string | null = null;
      let urlTaskDetails: any = null;
      try {
        let taskQ: string | null = null;
        const url = typeof window !== 'undefined' ? new URL(window.location.href) : null;
        taskQ = url ? url.searchParams.get('task') : null;
        if (taskQ) {
          urlTaskDetails = await getTaskDetails(taskQ);
          if (urlTaskDetails) {
            taskWorkspaceId = urlTaskDetails.workspace_id;
          }
        }
      } catch (e) {}

      try {
        // 2. Fetch all landing data (workspaces, profile, companies, priorities, and pre-fetched workspace tasks/stakeholders) in one Server request!
        const dashboard = await fetchWorkspaceDashboardData(taskWorkspaceId);

        if (dashboard.userProfile) {
          setCurrentUser(dashboard.userProfile);
        }
        setWorkspaces(dashboard.workspaces || []);
        setCompanies(dashboard.companies || []);
        setPriorities(dashboard.priorities || []);

        // 3. Populate pre-fetched tasks and stakeholders for the active workspace
        if (dashboard.prefetchWorkspaceId) {
          const prefetchWS = (dashboard.workspaces || []).find((w: any) => w.id === dashboard.prefetchWorkspaceId);
          if (prefetchWS) {
            setActiveWorkspace(prefetchWS);
            lastFetchedWorkspaceId.current = prefetchWS.id;
            setTasks(dashboard.prefetchTasks || []);
            setStakeholders(dashboard.prefetchStakeholders || []);

            if (urlTaskDetails) {
              // Mark read asynchronously
              fetch('/api/mentions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ _action: 'mark_read', taskId: urlTaskDetails.id })
              }).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.error("Failed to load workspace dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

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

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
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
        visibility_settings: { public: newWS.is_public }
      };
      
      let data: any;
      if (editWSId) {
        data = await updateWorkspace(editWSId, payload);
        
        const selectedCompany = companies.find(c => c.id === newWS.company_id);
        if (selectedCompany) data.company = selectedCompany;
        
        const updatedList = workspaces.map(w => w.id === editWSId ? data : w);
        setWorkspaces(updatedList);
        setActiveWorkspace(data);
      } else {
        data = await createWorkspace(payload);
        
        const selectedCompany = companies.find(c => c.id === newWS.company_id);
        if (selectedCompany) data.company = selectedCompany;
        
        setWorkspaces([data, ...workspaces]);
        setActiveWorkspace(data);
      }
      
      setWsModalMode(null);
      setEditWSId(null);
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
      if (updatedList.length > 0) {
        setActiveWorkspace(updatedList[0]);
      } else {
        setActiveWorkspace(null);
      }
    } catch (e: any) {
      console.error("[Workspace Deletion] Intercepted:", e.message || e);
      alert("Database Error on Workspace Deletion: " + (e.message || e.details || JSON.stringify(e)));
    }
  };

  const handleTaskWizardSuccess = async (taskData: any) => {
    try {
      const data = await createTask({ ...taskData, workspace_id: activeWorkspace.id });
      const tData = await fetchTasksByWorkspace(activeWorkspace.id);
      setTasks(tData);
      const createdTask = tData.find((t: any) => t.id === data.id) || data;

      setIsCreatingTask(false);
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
    <div className={`min-h-screen flex flex-col font-sans p-6 space-y-6 ${isLightMode ? "bg-gray-50" : "bg-[#070913]"}`}>
      
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

          <AppButton 
            variant="outline" 
            size="sm" 
            leftIcon={<Plus className="h-4 w-4" />} 
            onClick={() => setWsModalMode('SUB')}
            disabled={!hasPermission("WORKSPACES_CREATE")}
          >
            Add Sub Workspace
          </AppButton>
          
          <div className="relative group z-50">
            <button className={`flex items-center gap-2 text-xs px-4 py-2 rounded-xl font-bold transition-all ${
              isLightMode ? "bg-white border border-gray-200 text-gray-700 hover:border-gray-300 shadow-sm" : "bg-white/5 border border-white/10 text-gray-300 hover:border-white/20"
            }`}>
              Project: <span className={isLightMode ? "text-indigo-600" : "text-indigo-400"}>{activeWorkspace?.code || "None"}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <div className={`absolute right-0 top-full mt-2 w-72 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all overflow-hidden ${
              isLightMode ? "bg-white border border-gray-200" : "bg-[#0f111a] border border-white/10"
            }`}>
              <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                {renderWorkspaceTree(workspaceHierarchy)}
                {workspaces.length === 0 && <div className="p-4 text-xs text-gray-500 text-center">No workspaces found.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid Architecture */}
      {activeWorkspace ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Content Area (Tasks & Checklists) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Top Stat Row (Glassmorphism Bento) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AppCard className={`p-4 flex flex-col justify-center border-l-4 ${isLightMode ? "border-l-indigo-500" : "border-l-indigo-400"}`}>
                <span className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center gap-1"><Building2 className="h-3 w-3"/> Company</span>
                <span className={`text-xs font-bold truncate ${isLightMode ? "text-gray-900" : "text-white"}`}>{activeWorkspace.company?.name || "Independent"}</span>
              </AppCard>
              
              <AppCard className={`p-4 flex flex-col justify-center border-l-4 ${isLightMode ? "border-l-purple-500" : "border-l-purple-400"}`}>
                <span className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center gap-1"><Layers className="h-3 w-3"/> Total Tasks</span>
                <span className={`text-sm font-bold ${isLightMode ? "text-gray-900" : "text-white"}`}>{tasks.length} Directives</span>
              </AppCard>
            </div>

            {/* Hierarchical Task Matrix */}
            <AppCard className="flex-1 p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-3 mb-4 border-gray-200 dark:border-white/5">
                <div className="space-y-0.5">
                  <h3 className={`text-sm font-bold flex items-center gap-2 ${isLightMode ? "text-gray-900" : "text-white"}`}>
                    <GitMerge className={`h-4 w-4 ${isLightMode ? "text-purple-600" : "text-purple-400"}`} />
                    <span>Hierarchical Tasks & Execution Pipeline</span>
                  </h3>
                  <p className="text-[11px] text-gray-500">Live operational tasks under active sprint context.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/workspaces/tasks?workspaceId=${activeWorkspace.id}`} className="rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50">
                    View All Tasks
                  </Link>
                  <AppButton variant="outline" size="sm" leftIcon={<Plus className="h-3 w-3" />} onClick={() => setIsCreatingTask(true)}>
                    New Task
                  </AppButton>
                </div>
              </div>

                <div className={`max-h-[400px] overflow-y-auto scrollbar-thin border rounded-xl overflow-hidden ${isLightMode ? 'border-gray-200' : 'border-white/10'}`}>
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className={`sticky top-0 z-10 text-[10px] uppercase tracking-wider ${isLightMode ? 'bg-gray-50 text-gray-500 shadow-sm' : 'bg-[#151722] text-gray-400 border-b border-white/5'}`}>
                      <tr>
                        <th className="px-4 py-3 font-semibold">Task ID</th>
                        <th className="px-4 py-3 font-semibold w-full min-w-[200px]">Details</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Timeline</th>
                        <th className="px-4 py-3 font-semibold">Created Date</th>
                        <th className="px-4 py-3 font-semibold">Last Update</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isLightMode ? 'divide-gray-200 bg-white' : 'divide-white/5 bg-transparent'}`}>
                      {filteredTasks.map(task => (
                        <tr key={task.id} onClick={() => window.location.href = `/tasks/${task.id}`} className={`cursor-pointer transition-colors ${isLightMode ? 'hover:bg-indigo-50/50' : 'hover:bg-white/[0.02]'}`}>
                          <td className="px-4 py-3 align-top">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                              isLightMode ? "bg-purple-100 text-purple-700 border border-purple-200" : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            }`}>{task.code}</span>
                          </td>
                          <td className="px-4 py-3 min-w-[200px] whitespace-normal align-top">
                            <div className="flex flex-col items-start gap-1">
                              {task.priority && (
                                <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase leading-none ${
                                  task.priority.code === "P1" || task.priority.code === "CRITICAL"
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                    : task.priority.code === "P2" || task.priority.code === "HIGH"
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                }`}>
                                  {task.priority.name}
                                </span>
                              )}
                              <div className={`font-bold text-xs leading-snug ${isLightMode ? "text-gray-900" : "text-white"}`}>{task.title}</div>
                            </div>
                            {task.parent_task && (
                              <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-indigo-400/80 truncate">
                                <GitMerge className="h-3 w-3 shrink-0" />
                                <span>Parent: {task.parent_task.code}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top">
                            {task.status && (
                              <span className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: task.status.status_color || '#888' }}>
                                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: task.status.status_color || '#888' }} />
                                {task.status.name}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top text-[10px] text-gray-500 font-medium">
                            {task.start_date ? new Date(task.start_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: '2-digit' }) : '---'}
                            {' → '}
                            {task.end_date ? new Date(task.end_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: '2-digit' }) : '---'}
                          </td>
                          <td className="px-4 py-3 align-top text-[10px] text-gray-500 font-medium">
                            {task.created_at ? new Date(task.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '---'}
                          </td>
                          <td className="px-4 py-3 align-top text-[10px] text-gray-500 font-medium">
                            {task.updated_at ? new Date(task.updated_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '---'}
                          </td>
                        </tr>
                      ))}
                      {filteredTasks.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center">
                            <p className="text-gray-500 text-xs font-semibold">No tasks orchestrated in this responsibility filter.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
            </AppCard>

            
          </div>

          {/* Right Sidebar (Context & Stakeholders) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Workspace Context Meta */}
            <AppCard className={`p-5 space-y-4 ${
              isLightMode ? "bg-gradient-to-b from-indigo-50 to-white border-indigo-100" : "bg-gradient-to-b from-indigo-950/20 to-transparent border-indigo-500/20"
            }`}>
              <div className="border-b pb-2 mb-3 border-gray-200 dark:border-white/5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isLightMode ? "text-indigo-600" : "text-indigo-400"}`}>
                    Project Manifest
                  </span>
                  <div className="flex items-center gap-1.5">
                    {activeWorkspace.visibility_settings?.public ? (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-500"><ShieldCheck className="h-3 w-3"/> Public</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-amber-500"><ShieldAlert className="h-3 w-3"/> Private</span>
                    )}
                    <span className="text-[9px] font-mono font-bold text-gray-400">| {activeWorkspace.code}</span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 text-[10px] pt-1">
                  <button 
                    type="button"
                    onClick={() => openEditWorkspace(activeWorkspace)}
                    disabled={!(hasPermission("WORKSPACES_UPDATE") || hasPermission("WORKSPACES_MANAGE") || activeWorkspace.owner_id === currentUser?.id)}
                    className="px-2 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Edit Workspace
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleDeleteWorkspace(activeWorkspace.id)}
                    disabled={!(hasPermission("WORKSPACES_DELETE") || hasPermission("WORKSPACES_MANAGE") || activeWorkspace.owner_id === currentUser?.id)}
                    className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500">Objective Summary</label>
                  <p className={`text-xs leading-relaxed ${isLightMode ? "text-gray-700" : "text-gray-300"}`}>
                    {activeWorkspace.description || "No specific objectives defined."}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-xl border ${isLightMode ? "bg-white border-gray-200" : "bg-black/20 border-white/5"}`}>
                    <span className="block text-[10px] text-gray-500 font-bold mb-1 flex items-center gap-1"><Calendar className="h-3 w-3"/> Start Date</span>
                    <span className={`text-xs font-semibold ${isLightMode ? "text-gray-900" : "text-white"}`}>{activeWorkspace.start_date || "TBD"}</span>
                  </div>
                  <div className={`p-3 rounded-xl border ${isLightMode ? "bg-white border-gray-200" : "bg-black/20 border-white/5"}`}>
                    <span className="block text-[10px] text-gray-500 font-bold mb-1 flex items-center gap-1"><Calendar className="h-3 w-3"/> Target End</span>
                    <span className={`text-xs font-semibold ${isLightMode ? "text-gray-900" : "text-white"}`}>{activeWorkspace.end_date || "TBD"}</span>
                  </div>
                </div>
              </div>
            </AppCard>

            {/* Stakeholder Directory */}
            <AppCard className="p-5 flex-1 flex flex-col">
              <div className="border-b pb-3 mb-4 border-gray-200 dark:border-white/5 flex items-center gap-2">
                <Users className={`h-4 w-4 ${isLightMode ? "text-indigo-600" : "text-indigo-400"}`} />
                <h3 className={`text-sm font-bold ${isLightMode ? "text-gray-900" : "text-white"}`}>Stakeholder Matrix</h3>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {stakeholders.map((s, idx) => (
                  <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    isLightMode ? "bg-white border-gray-200" : "bg-white/[0.01] border-white/5 hover:bg-white/[0.03]"
                  }`}>
                    <div className="relative">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm overflow-hidden">
                        {s.profile_photo ? <img src={s.profile_photo} alt="" className="h-full w-full object-cover" /> : s.full_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 ${isLightMode ? 'border-white' : 'border-[#0f111a]'} ${onlineUsers.has(s.id || s.user_id) ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-gray-400'}`} title={onlineUsers.has(s.id || s.user_id) ? 'Online now' : `Last seen: ${presenceMap.get(s.id || s.user_id)?.lastSeen?.toLocaleString() || 'Unknown'}`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-bold truncate ${isLightMode ? "text-gray-900" : "text-white"}`}>{s.full_name}</span>
                        <AppBadge variant={s.workspace_role === 'manager' ? 'info' : 'neutral'} className="text-[8px] py-0">{s.workspace_role}</AppBadge>
                      </div>
                      <div className="flex items-center text-[10px] text-gray-500 gap-2 mt-0.5">
                        <span className="truncate">{s.designation?.name || 'Staff'}</span>
                        <span className="truncate">• {s.department?.name}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {stakeholders.length === 0 && (
                  <div className="text-center py-6 text-[11px] text-gray-500">
                    No stakeholders enrolled.
                  </div>
                )}
              </div>
            </AppCard>

          </div>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in-50">
          <AppCard className={`w-full max-w-2xl p-6 shadow-2xl border-t-4 max-h-[85vh] overflow-y-auto ${isLightMode ? "border-t-indigo-600 border-x-0 border-b-0" : "border-t-indigo-500 border-white/10"}`}>
            <h3 className={`text-lg font-bold mb-4 ${isLightMode ? "text-gray-900" : "text-white"}`}>{wsModalMode === 'EDIT' ? "Edit Workspace" : (wsModalMode === 'SUB' ? "New Sub Workspace" : "New Workspace")}</h3>
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Company Link</label>
                  <select 
                    className={`w-full p-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isLightMode ? "bg-white border-gray-300 text-gray-900" : "bg-black/50 border-white/10 text-white"
                    }`}
                    value={newWS.company_id}
                    onChange={e => setNewWS({...newWS, company_id: e.target.value})}
                    required
                  >
                    <option value="" disabled>-- Select Company --</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {(wsModalMode === 'SUB' || (wsModalMode === 'EDIT' && newWS.parent_workspace_id)) && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Parent Workspace Name</label>
                    <select 
                      className={`w-full p-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isLightMode ? "bg-white border-gray-300 text-gray-900" : "bg-black/50 border-white/10 text-white"
                      }`}
                      value={newWS.parent_workspace_id}
                      onChange={e => setNewWS({...newWS, parent_workspace_id: e.target.value})}
                      required={wsModalMode === 'SUB'}
                    >
                      <option value="" disabled>-- Select Parent Workspace --</option>
                      {workspaces.filter(w => w.id !== editWSId).map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 relative">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Assignee To (Users)</label>
                  <div 
                    onClick={() => setAssigneeDropdownOpen(!assigneeDropdownOpen)}
                    className={`w-full p-2.5 rounded-xl text-sm border flex justify-between items-center cursor-pointer ${isLightMode ? "bg-white border-gray-300" : "bg-black/50 border-white/10 text-white"}`}
                  >
                    <span className="truncate">{newWS.assigneeIds.length} Selected</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${assigneeDropdownOpen ? "rotate-180" : ""}`} />
                  </div>
                  {assigneeDropdownOpen && (
                    <div className={`absolute z-10 w-full mt-1 p-2 rounded-xl border shadow-xl max-h-[200px] overflow-y-auto scrollbar-thin ${isLightMode ? "bg-white border-gray-300" : "bg-[#0B0D17] border-white/10"}`}>
                      <input 
                        type="text" 
                        placeholder="Search users..." 
                        value={assigneeSearch} 
                        onChange={e => setAssigneeSearch(e.target.value)} 
                        onClick={e => e.stopPropagation()}
                        className={`w-full mb-2 p-1.5 text-xs rounded border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${isLightMode ? "bg-gray-50 border-gray-200 text-gray-900" : "bg-white/5 border-white/10 text-white"}`}
                      />
                      {availableUsers.filter(u => u.full_name?.toLowerCase().includes(assigneeSearch.toLowerCase()) || u.user_code?.toLowerCase().includes(assigneeSearch.toLowerCase())).map(u => (
                        <label key={u.id} className="flex items-center gap-2 text-sm p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded cursor-pointer transition-colors">
                          <input 
                            type="checkbox" 
                            checked={newWS.assigneeIds.includes(u.id)} 
                            onChange={e => {
                              if (e.target.checked) setNewWS({...newWS, assigneeIds: [...newWS.assigneeIds, u.id]});
                              else setNewWS({...newWS, assigneeIds: newWS.assigneeIds.filter((id: string) => id !== u.id)});
                            }} 
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4" 
                          />
                          <span className={isLightMode ? "text-gray-700" : "text-gray-300"}>{u.full_name} <span className="opacity-50 text-[10px]">({u.user_code})</span></span>
                        </label>
                      ))}
                      {availableUsers.length === 0 && <p className="text-xs text-gray-500 p-2">No users available.</p>}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Workspace Name</label>
                  <AppInput disabled={!!editWSId} placeholder="e.g. Q4 Migration" value={newWS.name} onChange={e => setNewWS({...newWS, name: e.target.value})} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Workspace Code</label>
                  <AppInput disabled placeholder="[Auto-Generated]" value={editWSId ? newWS.code : "[Auto-Generated]"} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Start Date</label>
                  <AppInput type="date" value={newWS.start_date} onChange={e => setNewWS({...newWS, start_date: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Target End Date</label>
                  <AppInput type="date" value={newWS.end_date} onChange={e => setNewWS({...newWS, end_date: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Objective Description</label>
                <textarea 
                  className={`w-full h-24 p-3 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isLightMode ? "bg-white border-gray-300 text-gray-900" : "bg-black/50 border-white/10 text-white"
                  }`}
                  placeholder="Detailed project requirements..."
                  value={newWS.description}
                  onChange={e => setNewWS({...newWS, description: e.target.value})}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="is_public" 
                  checked={newWS.is_public} 
                  onChange={e => setNewWS({...newWS, is_public: e.target.checked})} 
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label htmlFor="is_public" className="text-xs font-semibold text-gray-500 dark:text-gray-300 cursor-pointer">
                  Public Workspace (Visible to all authenticated personnel)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
                <AppButton variant="ghost" type="button" onClick={() => { setWsModalMode(null); setEditWSId(null); }}>Cancel</AppButton>
                <AppButton variant="primary" type="submit">{editWSId ? "Save Changes" : "Provision Workspace"}</AppButton>
              </div>
            </form>
          </AppCard>
        </div>
      )}

      {isCreatingTask && (
        <TaskCreationWizard 
          workspaceId={activeWorkspace.id} 
          onClose={() => setIsCreatingTask(false)}
          onSuccess={handleTaskWizardSuccess}
        />
      )}

    </div>
  );
}
