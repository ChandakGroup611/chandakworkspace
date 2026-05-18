"use client";

import React, { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { useTheme } from "@/components/theme/ThemeProvider";
import { createClient } from "@/utils/supabase/client";
import { 
  FolderKanban, Users, Activity, Plus, Send, 
  Layers, GitMerge, ChevronDown, Building2, Calendar, Target,
  Loader2, ShieldAlert, Sparkles, ShieldCheck
} from "lucide-react";
import { 
  fetchWorkspaces, fetchTasksByWorkspace, toggleChecklistItem, 
  fetchWorkspaceStakeholders, createWorkspace, createTask, fetchCompanies, fetchPriorities,
  updateWorkspace, deleteWorkspace, fetchWorkspacesInitialData
} from "@/lib/actions/workspaces";
import Link from "next/link";
import TaskCreationWizard from "@/components/tasks/TaskCreationWizard";
import TaskRealtimeChat from "@/components/tasks/TaskRealtimeChat";
import TaskActivityTimeline from "@/components/tasks/TaskActivityTimeline";
import TaskExecutionController from "@/components/tasks/TaskExecutionController";
import { getTaskDetails } from "@/lib/actions/tasks";

export default function WorkspacesPage() {
  const { theme } = useTheme();
  const isLightMode = theme === "executive-light";

  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [stakeholders, setStakeholders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScope, setSelectedScope] = useState<"ALL" | "CREATOR" | "ASSIGNEE" | "MANAGER">("ALL");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const lastFetchedWorkspaceId = React.useRef<string | null>(null);

  const filteredWorkspaces = workspaces.filter(w => {
    if (selectedScope === "ALL") return true;
    if (!currentUser) return true;
    
    if (selectedScope === "CREATOR") {
      return w.owner_id === currentUser.id;
    }
    if (selectedScope === "ASSIGNEE") {
      // Workspaces where current user is owner, enrolled in workspace_members, or has tasks assigned to them inside it
      return w.owner_id === currentUser.id || 
             w.workspace_members?.some((m: any) => m.user_id === currentUser.id) ||
             !!w.has_assigned_tasks;
    }
    if (selectedScope === "MANAGER") {
      return currentUser.managedDeptIds?.includes(w.department_id);
    }
    return true;
  });

  const filteredTasks = tasks.filter(t => {
    if (selectedScope === "ALL") return true;
    if (!currentUser) return true;
    
    if (selectedScope === "CREATOR") {
      return t.creator_id === currentUser.id;
    }
    if (selectedScope === "ASSIGNEE") {
      // Check explicit assignees, primary assignee, and team membership
      const isExplicit = t.assignees?.some((a: any) => a.user?.id === currentUser.id) || t.assignee_id === currentUser.id;
      const isTeamMember = t.teams?.some((tt: any) => tt.members?.some((m: any) => m.user?.id === currentUser.id));
      return t.creator_id === currentUser.id || isExplicit || isTeamMember;
    }
    if (selectedScope === "MANAGER") {
      return currentUser.managedDeptIds?.includes(t.department_id) || currentUser.managedDeptIds?.includes(activeWorkspace?.department_id);
    }
    return true;
  });

  // Auto-switch active workspace if current one gets filtered out
  useEffect(() => {
    if (filteredWorkspaces.length > 0) {
      const isStillVisible = filteredWorkspaces.some(w => w.id === activeWorkspace?.id);
      if (!isStillVisible) {
        setActiveWorkspace(filteredWorkspaces[0]);
      }
    } else {
      setActiveWorkspace(null);
    }
  }, [selectedScope, workspaces, currentUser]);
  
  // Modals
  const [isCreatingWS, setIsCreatingWS] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [editWSId, setEditWSId] = useState<string | null>(null);
  
  // Active selected task for side panel detail view (chat & timeline)
  const [selectedTask, setSelectedTask] = useState<any>(null);

  
  // Forms
  const [newWS, setNewWS] = useState({ 
    name: "", 
    code: "", 
    description: "", 
    company_id: "", 
    priority_id: "",
    start_date: "", 
    end_date: "",
    is_public: false
  });

  useEffect(() => {
    async function init() {
      // 1. Prepare Supabase client for user profile hydration
      const supabase = createClient();

      // 2. Define parallel user profile hydration promise
      const hydrateUserPromise = (async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const [profileRes, managedDeptsRes] = await Promise.all([
              supabase.from("user_master").select("*, department:departments(*)").eq("id", user.id).single(),
              supabase.from("departments").select("id").eq("manager_id", user.id)
            ]);
            
            const profile = profileRes.data;
            const managedDepts = managedDeptsRes.data;
            const managedDeptIds = managedDepts?.map(d => d.id) || [];
            return { ...profile, id: user.id, managedDeptIds };
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
        }
        return null;
      })();

      // 3. Trigger initial workspaces/companies/priorities fetch and user profile fetch in parallel!
      const [initialRes, userData] = await Promise.all([
        fetchWorkspacesInitialData(),
        hydrateUserPromise
      ]);

      const { workspaces: wsData, companies: compData, priorities: prioData } = initialRes;

      setWorkspaces(wsData);
      setCompanies(compData);
      setPriorities(prioData);
      
      if (userData) {
        setCurrentUser(userData);
      }

      if (wsData.length > 0) {
        const firstWS = wsData[0];
        setActiveWorkspace(firstWS);

        // Prefetch first active workspace's tasks & stakeholders immediately in parallel!
        lastFetchedWorkspaceId.current = firstWS.id;
        const [tData, sData] = await Promise.all([
          fetchTasksByWorkspace(firstWS.id),
          fetchWorkspaceStakeholders(firstWS.id)
        ]);
        setTasks(tData);
        setStakeholders(sData);
        if (tData.length > 0) {
          setSelectedTask(tData[0]);
        }
      }

      // If ?task=... present, attempt to open that task directly
      try {
        let taskQ: string | null = null;
        try {
          const url = typeof window !== 'undefined' ? new URL(window.location.href) : null;
          taskQ = url ? url.searchParams.get('task') : null;
        } catch (e) {
          taskQ = null;
        }
        if (taskQ) {
          const taskDetails = await getTaskDetails(taskQ);
          if (taskDetails) {
            const ws = wsData.find((w: any) => w.id === taskDetails.workspace_id);
            if (ws) {
              setActiveWorkspace(ws);
              setSelectedTask(taskDetails);
              await fetch('/api/mentions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _action: 'mark_read', taskId: taskQ }) });
            }
          }
        }
      } catch (e) {
        console.error('Failed to auto-open task from URL', e);
      }
      
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (!activeWorkspace) {
      setTasks([]);
      setStakeholders([]);
      setSelectedTask(null);
      lastFetchedWorkspaceId.current = null;
      return;
    }

    // Prevent double-fetching on initial mount/load
    if (lastFetchedWorkspaceId.current === activeWorkspace.id) return;

    async function loadWorkspaceData() {
      lastFetchedWorkspaceId.current = activeWorkspace.id;
      const [tData, sData] = await Promise.all([
        fetchTasksByWorkspace(activeWorkspace.id),
        fetchWorkspaceStakeholders(activeWorkspace.id)
      ]);
      setTasks(tData);
      setStakeholders(sData);
      if (tData.length > 0) {
        setSelectedTask(tData[0]);
      } else {
        setSelectedTask(null);
      }
    }
    loadWorkspaceData();
  }, [activeWorkspace?.id]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: newWS.name,
        description: newWS.description,
        company_id: newWS.company_id || null,
        priority_id: newWS.priority_id || null,
        start_date: newWS.start_date || null,
        end_date: newWS.end_date || null,
        visibility_settings: { public: newWS.is_public }
      };
      
      let data: any;
      if (editWSId) {
        data = await updateWorkspace(editWSId, payload);
        
        const selectedCompany = companies.find(c => c.id === newWS.company_id);
        const selectedPriority = priorities.find(p => p.id === newWS.priority_id);
        if (selectedCompany) data.company = selectedCompany;
        if (selectedPriority) data.priority = selectedPriority;
        
        const updatedList = workspaces.map(w => w.id === editWSId ? data : w);
        setWorkspaces(updatedList);
        setActiveWorkspace(data);
      } else {
        data = await createWorkspace(payload);
        
        const selectedCompany = companies.find(c => c.id === newWS.company_id);
        const selectedPriority = priorities.find(p => p.id === newWS.priority_id);
        if (selectedCompany) data.company = selectedCompany;
        if (selectedPriority) data.priority = selectedPriority;
        
        setWorkspaces([data, ...workspaces]);
        setActiveWorkspace(data);
      }
      
      setIsCreatingWS(false);
      setEditWSId(null);
      setNewWS({ 
        name: "", 
        code: "", 
        description: "", 
        company_id: "", 
        priority_id: "",
        start_date: "", 
        end_date: "",
        is_public: false
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  const openEditWorkspace = (ws: any) => {
    setEditWSId(ws.id);
    setNewWS({
      name: ws.name,
      code: ws.code,
      description: ws.description || "",
      company_id: ws.company_id || "",
      priority_id: ws.priority_id || "",
      start_date: ws.start_date || "",
      end_date: ws.end_date || "",
      is_public: !!ws.visibility_settings?.public
    });
    setIsCreatingWS(true);
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
      console.error(e);
    }
  };

  const handleTaskWizardSuccess = async (taskData: any) => {
    try {
      const data = await createTask({ ...taskData, workspace_id: activeWorkspace.id });
      const tData = await fetchTasksByWorkspace(activeWorkspace.id);
      setTasks(tData);
      const createdTask = tData.find((t: any) => t.id === data.id) || data;
      setSelectedTask(createdTask);
      setIsCreatingTask(false);
    } catch (err: any) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
        <p className="text-xs text-gray-500 font-bold tracking-[0.2em] uppercase">Hydrating Enterprise Workspaces...</p>
      </div>
    );
  }

  return (
    <div className={`h-screen overflow-y-auto flex flex-col font-sans p-6 space-y-6 ${isLightMode ? "bg-gray-50" : "bg-[#070913]"}`}>
      
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

        {/* Scope Selector Tabs */}
        <div className={`flex items-center p-1 rounded-xl shrink-0 ${isLightMode ? "bg-gray-100/80" : "bg-white/5 border border-white/10"}`}>
          {(["ALL", "ASSIGNEE", "CREATOR", "MANAGER"] as const).map(sc => {
            const label = 
              sc === "ALL" ? "All Operations" : 
              sc === "ASSIGNEE" ? "Assigned To Me" : 
              sc === "CREATOR" ? "Created By Me" : "Managed By Me";
            
            const active = selectedScope === sc;
            return (
              <button
                key={sc}
                onClick={() => setSelectedScope(sc)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${
                  active 
                    ? (isLightMode ? "bg-white text-gray-900 shadow-sm" : "bg-indigo-600 text-white shadow-md shadow-indigo-500/20")
                    : (isLightMode ? "text-gray-500 hover:text-gray-900" : "text-gray-400 hover:text-white")
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <AppButton variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsCreatingWS(true)}>
            New Workspace
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
                {currentUser ? (
                  <>
                    {/* Created by Me */}
                    {workspaces.filter(w => w.owner_id === currentUser.id).length > 0 && (
                      <div>
                        <div className={`px-4 py-2 text-[9px] font-bold tracking-widest uppercase flex items-center justify-between ${
                          isLightMode ? "bg-gray-50 border-y border-gray-100" : "bg-white/[0.02] border-y border-white/5"
                        }`}>
                          <span className={isLightMode ? "text-gray-500" : "text-gray-400"}>My Created Workspaces</span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded font-bold bg-indigo-500/10 text-indigo-400">{workspaces.filter(w => w.owner_id === currentUser.id).length}</span>
                        </div>
                        {workspaces.filter(w => w.owner_id === currentUser.id).map(w => (
                          <button 
                            key={w.id}
                            onClick={() => setActiveWorkspace(w)}
                            className={`w-full text-left px-4 py-3 text-xs transition-colors border-b last:border-0 ${
                              isLightMode 
                                ? (activeWorkspace?.id === w.id ? 'bg-indigo-50 border-gray-100' : 'hover:bg-gray-50 border-gray-100')
                                : (activeWorkspace?.id === w.id ? 'bg-indigo-500/10 border-white/5' : 'hover:bg-white/5 border-white/5')
                            }`}
                          >
                            <div className={`font-bold ${isLightMode ? "text-gray-900" : "text-white"}`}>{w.code}</div>
                            <div className="text-[10px] text-gray-500 truncate">{w.name}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Managed by Me */}
                    {workspaces.filter(w => w.owner_id !== currentUser.id && currentUser.managedDeptIds?.includes(w.department_id)).length > 0 && (
                      <div>
                        <div className={`px-4 py-2 text-[9px] font-bold tracking-widest uppercase flex items-center justify-between ${
                          isLightMode ? "bg-gray-50 border-y border-gray-100" : "bg-white/[0.02] border-y border-white/5"
                        }`}>
                          <span className={isLightMode ? "text-gray-500" : "text-gray-400"}>Managed Departments</span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-400">{workspaces.filter(w => w.owner_id !== currentUser.id && currentUser.managedDeptIds?.includes(w.department_id)).length}</span>
                        </div>
                        {workspaces.filter(w => w.owner_id !== currentUser.id && currentUser.managedDeptIds?.includes(w.department_id)).map(w => (
                          <button 
                            key={w.id}
                            onClick={() => setActiveWorkspace(w)}
                            className={`w-full text-left px-4 py-3 text-xs transition-colors border-b last:border-0 ${
                              isLightMode 
                                ? (activeWorkspace?.id === w.id ? 'bg-indigo-50 border-gray-100' : 'hover:bg-gray-50 border-gray-100')
                                : (activeWorkspace?.id === w.id ? 'bg-indigo-500/10 border-white/5' : 'hover:bg-white/5 border-white/5')
                            }`}
                          >
                            <div className={`font-bold ${isLightMode ? "text-gray-900" : "text-white"}`}>{w.code}</div>
                            <div className="text-[10px] text-gray-500 truncate">{w.name}</div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* General / Other Workspaces */}
                    {workspaces.filter(w => w.owner_id !== currentUser.id && !currentUser.managedDeptIds?.includes(w.department_id)).length > 0 && (
                      <div>
                        <div className={`px-4 py-2 text-[9px] font-bold tracking-widest uppercase flex items-center justify-between ${
                          isLightMode ? "bg-gray-50 border-y border-gray-100" : "bg-white/[0.02] border-y border-white/5"
                        }`}>
                          <span className={isLightMode ? "text-gray-500" : "text-gray-400"}>General Operations</span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded font-bold bg-purple-500/10 text-purple-400">{workspaces.filter(w => w.owner_id !== currentUser.id && !currentUser.managedDeptIds?.includes(w.department_id)).length}</span>
                        </div>
                        {workspaces.filter(w => w.owner_id !== currentUser.id && !currentUser.managedDeptIds?.includes(w.department_id)).map(w => (
                          <button 
                            key={w.id}
                            onClick={() => setActiveWorkspace(w)}
                            className={`w-full text-left px-4 py-3 text-xs transition-colors border-b last:border-0 ${
                              isLightMode 
                                ? (activeWorkspace?.id === w.id ? 'bg-indigo-50 border-gray-100' : 'hover:bg-gray-50 border-gray-100')
                                : (activeWorkspace?.id === w.id ? 'bg-indigo-500/10 border-white/5' : 'hover:bg-white/5 border-white/5')
                            }`}
                          >
                            <div className={`font-bold ${isLightMode ? "text-gray-900" : "text-white"}`}>{w.code}</div>
                            <div className="text-[10px] text-gray-500 truncate">{w.name}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  workspaces.map(w => (
                    <button 
                      key={w.id}
                      onClick={() => setActiveWorkspace(w)}
                      className={`w-full text-left px-4 py-3 text-xs transition-colors border-b last:border-0 ${
                        isLightMode 
                          ? (activeWorkspace?.id === w.id ? 'bg-indigo-50 border-gray-100' : 'hover:bg-gray-50 border-gray-100')
                          : (activeWorkspace?.id === w.id ? 'bg-indigo-500/10 border-white/5' : 'hover:bg-white/5 border-white/5')
                      }`}
                    >
                      <div className={`font-bold ${isLightMode ? "text-gray-900" : "text-white"}`}>{w.code}</div>
                      <div className="text-[10px] text-gray-500 truncate">{w.name}</div>
                    </button>
                  ))
                )}
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
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <AppCard className={`p-4 flex flex-col justify-center border-l-4 ${isLightMode ? "border-l-indigo-500" : "border-l-indigo-400"}`}>
                <span className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center gap-1"><Building2 className="h-3 w-3"/> Company</span>
                <span className={`text-xs font-bold truncate ${isLightMode ? "text-gray-900" : "text-white"}`}>{activeWorkspace.company?.name || "Independent"}</span>
              </AppCard>
              <AppCard className={`p-4 flex flex-col justify-center border-l-4 ${isLightMode ? "border-l-rose-500" : "border-l-rose-400"}`}>
                <span className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3"/> Priority</span>
                <span className={`text-xs font-bold truncate ${isLightMode ? "text-gray-900" : "text-white"}`}>{activeWorkspace.priority?.name || "Standard"}</span>
              </AppCard>
              <AppCard className={`p-4 flex flex-col justify-center border-l-4 ${isLightMode ? "border-l-blue-500" : "border-l-blue-400"}`}>
                <span className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center gap-1"><Target className="h-3 w-3"/> Status</span>
                <span className={`text-xs font-bold truncate ${isLightMode ? "text-blue-700" : "text-blue-400"}`}>{activeWorkspace.status?.name || "ACTIVE"}</span>
              </AppCard>
              <AppCard className={`p-4 flex flex-col justify-center border-l-4 ${isLightMode ? "border-l-purple-500" : "border-l-purple-400"}`}>
                <span className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center gap-1"><Layers className="h-3 w-3"/> Total Tasks</span>
                <span className={`text-sm font-bold ${isLightMode ? "text-gray-900" : "text-white"}`}>{filteredTasks.length} Directives</span>
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
                  <Link href="/workspaces/tasks" className="rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50">
                    View All Tasks
                  </Link>
                  <AppButton variant="outline" size="sm" leftIcon={<Plus className="h-3 w-3" />} onClick={() => setIsCreatingTask(true)}>
                    New Task
                  </AppButton>
                </div>
              </div>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 scrollbar-thin">
                {filteredTasks.map(task => (
                  <a
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className={`block p-4 rounded-xl border transition-all ${
                      selectedTask?.id === task.id
                        ? (isLightMode ? "bg-indigo-50/50 border-indigo-200 shadow-sm" : "bg-indigo-500/10 border-indigo-500/30")
                        : (isLightMode ? "bg-white border-gray-200 hover:shadow-md" : "bg-white/[0.02] border-white/10 hover:border-white/20")
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 w-full">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                              isLightMode ? "bg-purple-100 text-purple-700 border border-purple-200" : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            }`}>{task.code}</span>

                            {task.priority && (
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                                task.priority.code === "P1" || task.priority.code === "CRITICAL"
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                  : task.priority.code === "P2" || task.priority.code === "HIGH"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              }`}>
                                {task.priority.name}
                              </span>
                            )}

                            <span className={`text-sm font-bold ${isLightMode ? "text-gray-900" : "text-white"}`}>{task.title}</span>
                          </div>
                          {task.assignee && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {task.assignee.profile_photo ? (
                                <img 
                                  src={task.assignee.profile_photo} 
                                  alt={task.assignee.full_name} 
                                  className="h-5 w-5 rounded-full object-cover border border-white/10"
                                />
                              ) : (
                                <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                  isLightMode ? "bg-indigo-100 text-indigo-700" : "bg-indigo-500/20 text-indigo-300"
                                }`}>
                                  {task.assignee.full_name?.charAt(0).toUpperCase() || "A"}
                                </div>
                              )}
                              <span className="text-[10px] font-semibold text-gray-500 hidden sm:inline">{task.assignee.full_name?.split(" ")[0]}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-1">{task.description}</p>
                        
                        {task.parent_task && (
                          <div className="flex items-center gap-1.5 mt-1 text-[9px] font-bold text-indigo-400/80">
                            <GitMerge className="h-3 w-3 shrink-0" />
                            <span>Parent Dependency: {task.parent_task.code} - {task.parent_task.title}</span>
                          </div>
                        )}
                        
                        {/* Progress Tracker */}
                        <div className="pt-2">
                          <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                            <span>Lifecycle Progress</span>
                            <span className={isLightMode ? "text-purple-600" : "text-purple-400"}>{task.progress_percentage}%</span>
                          </div>
                          <div className={`w-full h-1.5 rounded-full overflow-hidden ${isLightMode ? "bg-gray-100" : "bg-white/5"}`}>
                            <div className={`h-full rounded-full transition-all duration-500 ${
                              isLightMode ? "bg-gradient-to-r from-purple-500 to-indigo-500" : "bg-gradient-to-r from-purple-500 to-indigo-500"
                            }`} style={{ width: `${task.progress_percentage}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
                {filteredTasks.length === 0 && (
                  <div className={`text-center py-12 rounded-xl border border-dashed ${isLightMode ? "border-gray-300" : "border-white/10"}`}>
                    <p className="text-gray-500 text-xs font-semibold">No tasks orchestrated in this responsibility filter.</p>
                  </div>
                )}
              </div>
            </AppCard>

            {/* Active Selected Task Collab Matrix */}
            {selectedTask && (
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-white/5 animate-in fade-in-30">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                  Task Governance & Collaboration Matrix
                </span>
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                  <div className="xl:col-span-6">
                    <TaskExecutionController 
                      taskId={selectedTask.id}
                      onUpdate={async () => {
                        const tData = await fetchTasksByWorkspace(activeWorkspace.id);
                        setTasks(tData);
                        // Refresh active selected task reference
                        const freshTask = tData.find((t: any) => t.id === selectedTask.id);
                        if (freshTask) setSelectedTask(freshTask);
                      }}
                    />
                  </div>
                  <div className="xl:col-span-6 flex flex-col gap-6">
                    <TaskRealtimeChat taskId={selectedTask.id} />
                    <TaskActivityTimeline taskId={selectedTask.id} />
                  </div>
                </div>
              </div>
            )}
            
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
                    className="px-2 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold transition-all active:scale-95"
                  >
                    Edit Workspace
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleDeleteWorkspace(activeWorkspace.id)}
                    className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold transition-all active:scale-95"
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
                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm overflow-hidden">
                      {s.profile_photo ? <img src={s.profile_photo} alt="" className="h-full w-full object-cover" /> : s.full_name.substring(0, 2).toUpperCase()}
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
          <AppButton variant="primary" onClick={() => setIsCreatingWS(true)}>Create Workspace</AppButton>
        </div>
      )}

      {/* Creation Overlays */}
      {isCreatingWS && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in-50">
          <AppCard className={`w-full max-w-lg p-6 shadow-2xl border-t-4 ${isLightMode ? "border-t-indigo-600 border-x-0 border-b-0" : "border-t-indigo-500 border-white/10"}`}>
            <h3 className={`text-lg font-bold mb-4 ${isLightMode ? "text-gray-900" : "text-white"}`}>{editWSId ? "Edit" : "Initialize"} Workspace</h3>
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
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

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Priority Master</label>
                  <select 
                    className={`w-full p-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isLightMode ? "bg-white border-gray-300 text-gray-900" : "bg-black/50 border-white/10 text-white"
                    }`}
                    value={newWS.priority_id}
                    onChange={e => setNewWS({...newWS, priority_id: e.target.value})}
                    required
                  >
                    <option value="" disabled>-- Select Priority --</option>
                    {priorities.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Workspace Name</label>
                  <AppInput placeholder="e.g. Q4 Migration" value={newWS.name} onChange={e => setNewWS({...newWS, name: e.target.value})} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Workspace Code</label>
                  <AppInput disabled placeholder="[Auto-Generated]" value="[Auto-Generated]" />
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
                <AppButton variant="ghost" type="button" onClick={() => { setIsCreatingWS(false); setEditWSId(null); }}>Cancel</AppButton>
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
