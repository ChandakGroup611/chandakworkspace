"use client";
import { toast } from 'react-toastify';

import React, { useState, useEffect, useMemo, useRef } from "react";
import useSWR from 'swr';
import { AppCard } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { useTheme } from "@/components/theme/ThemeProvider";
import { 
  FolderKanban, Users, Activity, Plus, Send, 
  Layers, GitMerge, ChevronDown, Building2, Calendar, Target,
  Loader2, ShieldAlert, Sparkles, ShieldCheck, Search, Filter,
  X, Check, ChevronsDownUp, ChevronsUpDown, UserCheck, RefreshCw
} from "lucide-react";
import { 
  fetchWorkspaces, fetchTasksByWorkspace, toggleChecklistItem, 
  fetchWorkspaceStakeholders, createWorkspace, fetchCompanies, fetchPriorities,
  updateWorkspace, deleteWorkspace, fetchWorkspaceDashboardData, fetchHierarchyChildren,
  searchHierarchyDeep, fetchAllHierarchyBranches, type HierarchyFilterOptions
} from "@/lib/actions/workspaces";
import { usePermissions } from "@/hooks/usePermissions";
import { LifecycleManager } from "@/lib/services/LifecycleManager";
import { HierarchyManager } from "@/lib/services/HierarchyManager";
import { HierarchyStateManager } from "@/lib/services/HierarchyStateManager";
import { usePresence } from "@/hooks/use-presence";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useSavedFilters, SavedFilter } from "@/hooks/useSavedFilters";
import { SavedFiltersDropdown } from "@/components/ui/SavedFiltersDropdown";
import TaskCreationWizard from "@/components/tasks/TaskCreationWizard";
import TaskExecutionController from "@/components/tasks/TaskExecutionController";
import { TaskDetailDrawer } from "@/components/tasks/TaskDetailDrawer";
import { SidePeekDrawer } from "@/components/ui/SidePeekDrawer";
import { getTaskDetails, updateNodeStatus, deleteTask, createTask } from "@/lib/actions/tasks";
import { useRouter, useSearchParams } from "next/navigation";
import { WorkspaceMasterTable } from "@/components/workspaces/WorkspaceMasterTable";
import { SprintBoard } from "@/components/workspaces/sprints/SprintBoard";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
export default function WorkspacesClient({ initialData, initialTaskId }: { initialData: any; initialTaskId?: string | null }) {
  const router = useRouter();
  const { theme } = useTheme();
  const { hasPermission, loading: permsLoading, roleCode } = usePermissions();
  const isLightMode = ["light-neumorphic", "pure-white", "pure-white-neumorphic", "amazon-prime-upi"].includes(theme);

  const [workspaces, setWorkspaces] = useState<any[]>(initialData?.workspaces || []);
  const [companies, setCompanies] = useState<any[]>(initialData?.companies || []);
  const [priorities, setPriorities] = useState<any[]>(initialData?.priorities || []);
  const [taskStatuses, setTaskStatuses] = useState<any[]>(initialData?.taskStatuses || []);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<any>(initialData?.workspaces?.find((w: any) => w.id === initialData?.prefetchWorkspaceId) || null);
  const [tasks, setTasks] = useState<any[]>(initialData?.prefetchTasks || []);
  const [stakeholders, setStakeholders] = useState<any[]>(initialData?.prefetchStakeholders || []);
  const [masterHierarchy, setMasterHierarchy] = useState<any[]>(initialData?.masterHierarchy || []);
  const [initialMasterHierarchy] = useState<any[]>(initialData?.masterHierarchy || []);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isExpandingAll, setIsExpandingAll] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const triggerErrorToast = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 4000);
  };
  const [currentUser, setCurrentUser] = useState<any>(initialData?.userProfile || null);
  const [mounted, setMounted] = useState(false);
  const lastFetchedWorkspaceId = React.useRef<string | null>(initialData?.prefetchWorkspaceId || null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  const searchParams = useSearchParams();
  useEffect(() => {
    const createParam = searchParams?.get("create");
    if (createParam === "true" || createParam === "workspace") {
      setWsModalMode("ROOT");
    } else if (createParam === "task") {
      setIsCreatingTask(true);
      setCreatingTaskWorkspaceId(null); // Force user to select workspace if not context aware, or it will default to selected inside component
      setCreatingTaskParentId(null);
    }
  }, [searchParams]);

  const [filters, setFilters] = useState<HierarchyFilterOptions>({
    entityType: 'ALL',
    statusId: '',
    priorityId: '',
    assigneeId: '',
    myTasksOnly: false
  });

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 280);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Deep Search Execution Effect
  useEffect(() => {
    let isCancelled = false;
    const hasActiveFilters = !!(
      debouncedSearchQuery.trim() || 
      filters.statusId || 
      filters.priorityId || 
      filters.assigneeId || 
      filters.myTasksOnly || 
      (filters.entityType && filters.entityType !== 'ALL')
    );

    if (!hasActiveFilters) {
      if (initialMasterHierarchy.length > 0) {
        setMasterHierarchy(initialMasterHierarchy);
      }
      return;
    }

    setIsSearching(true);
    searchHierarchyDeep(debouncedSearchQuery, filters)
      .then(res => {
        if (!isCancelled) {
          setMasterHierarchy(res.hierarchy);
          if (res.expandedNodeIds.length > 0) {
            setExpandedNodes(prev => {
              const next = { ...prev };
              res.expandedNodeIds.forEach((id: string) => {
                next[id] = true;
              });
              return next;
            });
          }
        }
      })
      .catch(err => {
        console.error("Deep search failed:", err);
      })
      .finally(() => {
        if (!isCancelled) setIsSearching(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [debouncedSearchQuery, filters]);

  const {
    savedFilters,
    activeSavedFilterId,
    saveCurrentFilter,
    applySavedFilter,
    deleteSavedFilter
  } = useSavedFilters<{ searchQuery: string, filters: HierarchyFilterOptions }>("chandak_workspaces", currentUser?.id || null, (payload) => {
    setSearchQuery(payload.searchQuery || "");
    setFilters(payload.filters || {
      entityType: 'ALL',
      statusId: '',
      priorityId: '',
      assigneeId: '',
      myTasksOnly: false
    });
    if (payload.searchQuery || Object.values(payload.filters || {}).some(v => v !== '' && v !== false && v !== 'ALL')) {
        setShowFilters(true);
    }
  });

  const handleSaveCurrentFilter = () => {
    saveCurrentFilter({
      searchQuery: debouncedSearchQuery,
      filters
    });
  };

  const applyFilter = (f: SavedFilter<{ searchQuery: string, filters: HierarchyFilterOptions }>) => {
    applySavedFilter(
      f,
      (payload) => {
        setSearchQuery(payload.searchQuery || "");
        setFilters(payload.filters || {
          entityType: 'ALL',
          statusId: '',
          priorityId: '',
          assigneeId: '',
          myTasksOnly: false
        });
        if (payload.searchQuery || Object.values(payload.filters || {}).some(v => v !== '' && v !== false && v !== 'ALL')) {
           setShowFilters(true);
        }
      },
      () => {
        clearFilters();
      }
    );
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.entityType && filters.entityType !== 'ALL') count++;
    if (filters.statusId) count++;
    if (filters.priorityId) count++;
    if (filters.assigneeId) count++;
    if (filters.myTasksOnly) count++;
    return count;
  }, [filters]);

  const clearFilters = () => {
    setSearchQuery("");
    setFilters({
      entityType: 'ALL',
      statusId: '',
      priorityId: '',
      assigneeId: '',
      myTasksOnly: false
    });
  };

  const handleExpandAllBranches = async () => {
    setIsExpandingAll(true);
    try {
      const fullBranches = await fetchAllHierarchyBranches();
      if (fullBranches && fullBranches.length > 0) {
        setMasterHierarchy(fullBranches);
        // Expand all ids
        const allIds: Record<string, boolean> = {};
        const collectIds = (nodes: any[]) => {
          nodes.forEach(n => {
            allIds[n.id] = true;
            if (n.children) collectIds(n.children);
          });
        };
        collectIds(fullBranches);
        setExpandedNodes(allIds);
      }
    } catch (e) {
      console.error("Expand all failed", e);
    } finally {
      setIsExpandingAll(false);
    }
  };

  const handleCollapseAllBranches = () => {
    setExpandedNodes({});
  };

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

  // Sync active workspace from server data on soft navigation
  useEffect(() => {
    if (initialData?.prefetchWorkspaceId) {
      const targetWorkspace = initialData.workspaces?.find((w: any) => w.id === initialData.prefetchWorkspaceId);
      if (targetWorkspace) {
        setActiveWorkspace(targetWorkspace);
      }
    }
  }, [initialData?.prefetchWorkspaceId, initialData?.workspaces]);

  // Auto-expand hierarchy path to prefetched workspace
  const autoExpandedPathsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (initialData?.prefetchWorkspaceId && workspaces.length > 0) {
      const targetId = initialData.prefetchWorkspaceId;
      if (autoExpandedPathsRef.current.has(targetId)) return;
      autoExpandedPathsRef.current.add(targetId);

      // Build parent path from target up to root
      const path: string[] = [targetId];
      let currentId = targetId;
      while (currentId) {
        const current = workspaces.find(w => w.id === currentId);
        if (current && current.parent_workspace_id) {
          path.push(current.parent_workspace_id);
          currentId = current.parent_workspace_id;
        } else {
          break;
        }
      }
      
      // Expand all nodes in the path
      setExpandedNodes(prev => {
        const next = { ...prev };
        path.forEach(id => {
          next[id] = true;
        });
        return next;
      });

      // Fetch children for all ancestors sequentially to construct the tree
      const loadTreePath = async () => {
        const orderedPath = [...path].reverse(); // from root to leaf
        
        for (const nodeId of orderedPath) {
          try {
            const children = await fetchHierarchyChildren(nodeId, 'WORKSPACE');
            
            setMasterHierarchy(prev => {
              const insertChildren = (tree: any[]): any[] => {
                return tree.map(item => {
                  if (item.id === nodeId) {
                    return { 
                      ...item, 
                      children: HierarchyStateManager.mergePrefetchedChildren(item.children, children), 
                      childrenFetched: true 
                    };
                  }
                  if (item.children && item.children.length > 0) {
                    return { ...item, children: insertChildren(item.children) };
                  }
                  return item;
                });
              };
              return insertChildren(prev);
            });
          } catch (err) {
            console.error(`Failed to prefetch children for path node ${nodeId}:`, err);
          }
        }
      };
      
      loadTreePath();
    }
  }, [initialData?.prefetchWorkspaceId, workspaces, initialData?.workspaces]);

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
        <AppButton variant="secondary" 
          onClick={() => setActiveWorkspace(workspaces.find(orig => orig.id === w.id))}
          className={`w-full text-left py-3 text-xs transition-colors border-b last:border-0 ${ isLightMode ? (activeWorkspace?.id === w.id ? 'bg-theme-btn-primary/10 border-border/50' : 'hover:bg-surface border-border/50') : (activeWorkspace?.id === w.id ? 'bg-theme-btn-primary/10 border-border' : 'hover:theme-card-structural /5 border-border') }`}
          style={{ paddingLeft: `${1 + depth * 1.5}rem`, paddingRight: '1rem' }}
        >
          <div className="flex items-center gap-2">
            {depth > 0 && <span className={"text-muted"}>↳</span>}
            <div className={`font-bold ${"text-foreground"}`}>{w.code}</div>
          </div>
          <div className={`text-[10px] text-muted truncate ${depth > 0 ? "ml-4" : ""}`}>{w.name}</div>
        </AppButton>
        {w.subWorkspaces && w.subWorkspaces.length > 0 && renderWorkspaceTree(w.subWorkspaces, depth + 1)}
      </React.Fragment>
    ));
  };

  
  const [wsModalMode, setWsModalMode] = useState<'ROOT' | 'SUB' | 'EDIT' | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [drawerTask, setDrawerTask] = useState<any>(null);
  const [editWSId, setEditWSId] = useState<string | null>(null);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const [activeView, setActiveView] = useState<'HIERARCHY' | 'SPRINTS'>('HIERARCHY');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  
  // Dependency Checks
  const [checkingDependencyId, setCheckingDependencyId] = useState<string | null>(null);
  const [dependencyModal, setDependencyModal] = useState<{
    userId: string;
    userName: string;
    result: import("@/lib/actions/dependencies").DependencyCheckResult;
  } | null>(null);

  // User Role Modal
  const [userRoleModal, setUserRoleModal] = useState<{
    userId: string;
    userName: string;
    step: 'choice' | 'tasks';
  } | null>(null);
  const [workspaceTasksForRole, setWorkspaceTasksForRole] = useState<any[]>([]);
  const [fetchingTasksForRole, setFetchingTasksForRole] = useState(false);
  const [stagedTaskRoles, setStagedTaskRoles] = useState<Record<string, 'primary' | 'executor'>>({});
  
  const [isAssigningTasks, setIsAssigningTasks] = useState(false);


  const [autoCollapse, setAutoCollapse] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('workspace_auto_collapse');
        if (saved !== null) return JSON.parse(saved);
      } catch (e) {}
    }
    return true; // default
  });

  useEffect(() => {
    try {
      localStorage.setItem('workspace_auto_collapse', JSON.stringify(autoCollapse));
    } catch (e) {}
  }, [autoCollapse]);

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
  const [creatingTaskParentId, setCreatingTaskParentId] = useState<string | null>(null);
  const [creatingTaskInitialName, setCreatingTaskInitialName] = useState("");

  const findNodeInHierarchy = (nodes: any[], targetId: string): any => {
    for (const n of nodes) {
      if (n.id === targetId) return n;
      if (n.children && n.children.length > 0) {
        const found = findNodeInHierarchy(n.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  const parentWorkspace = newWS.parent_workspace_id 
    ? (workspaces.find(w => w.id === newWS.parent_workspace_id) || findNodeInHierarchy(masterHierarchy, newWS.parent_workspace_id))
    : null;

  const availableUsers = parentWorkspace 
    ? allUsers.filter(u => {
        const membersList = parentWorkspace.members || parentWorkspace.assignees || [];
        return membersList.some((m: any) => (m.user_id === u.id || m.id === u.id)) || u.id === currentUser?.id;
      })
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

  const fetcher = async ([wsId]: [string]) => {
    const [tData, sData] = await Promise.all([
      fetchTasksByWorkspace(wsId),
      fetchWorkspaceStakeholders(wsId)
    ]);
    return { tasks: tData, stakeholders: sData };
  };

  const { data: workspaceData, mutate: mutateWorkspaceData } = useSWR(
    activeWorkspace?.id ? [activeWorkspace.id, 'workspace_data'] : null,
    fetcher,
    { 
      fallbackData: { tasks: initialData?.prefetchTasks || [], stakeholders: initialData?.prefetchStakeholders || [] },
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      keepPreviousData: true
    }
  );

  // Sync SWR data to state to maintain compatibility with existing functionality
  useEffect(() => {
    if (workspaceData) {
      setTasks(workspaceData.tasks);
      setStakeholders(workspaceData.stakeholders);
    }
  }, [workspaceData]);
  const handleCreateWorkspace = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (isSubmitting) return;
    if (newWS.start_date && newWS.end_date && new Date(newWS.end_date) < new Date(newWS.start_date)) {
      toast.error("Target End Date cannot be earlier than the Start Date.");
      return;
    }
    try {
      setIsSubmitting(true);
      let finalName = newWS.name;

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
        if (data?.error) throw new Error(data.error);
        
        // Close modal immediately for snappy UI
        setWsModalMode(null);
        setEditWSId(null);
        triggerToast("Workspace updated successfully");
        
        const selectedCompany = companies.find(c => c.id === newWS.company_id);
        if (selectedCompany) data.company = selectedCompany;
        
        const updatedList = workspaces.map(w => w.id === editWSId ? data : w);
        setWorkspaces(updatedList);
        setActiveWorkspace(data);

        // Optimistically update the tree
        setMasterHierarchy(curr => {
          const updateNode = (tree: any[]): any[] => tree.map(node => {
            if (node.id === editWSId) {
              return { ...node, ...data, children: node.children };
            }
            if (node.children) return { ...node, children: updateNode(node.children) };
            return node;
          });
          return updateNode(curr);
        });
      } else {
        data = await createWorkspace(payload);
        if (data?.error) throw new Error(data.error);
        
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
      if (!editWSId) {
        setMasterHierarchy(curr => {
          const newNode = {
            ...data,
            type: newWS.parent_workspace_id ? 'SUB_WORKSPACE' : 'WORKSPACE',
            children: [],
            childrenFetched: true,
            subworkspace_count: 0,
            direct_task_count: 0,
            child_task_count: 0,
            total_hierarchy_task_count: 0
          };

          if (newWS.parent_workspace_id) {
            const insertChildOptimistic = (tree: any[]): any[] => tree.map(node => {
              if (node.id === newWS.parent_workspace_id) {
                return { ...node, children: [newNode, ...(node.children || [])], childrenFetched: true, subworkspace_count: (node.subworkspace_count || 0) + 1 };
              }
              if (node.children) return { ...node, children: insertChildOptimistic(node.children) };
              return node;
            });
            return insertChildOptimistic(curr);
          } else {
            return [newNode, ...curr];
          }
        });
      }

      import("@/lib/actions/workspaces").then(m => {
        if (newWS.parent_workspace_id) {
          setExpandedNodes(prev => ({ ...prev, [newWS.parent_workspace_id]: true }));
          m.fetchHierarchyChildren(newWS.parent_workspace_id, 'WORKSPACE').then(children => {
            setMasterHierarchy(curr => {
              const insertChildren = (tree: any[]): any[] => tree.map(node => {
                if (node.id === newWS.parent_workspace_id) return { ...node, children, childrenFetched: true };
                if (node.children) return { ...node, children: insertChildren(node.children) };
                return node;
              });
              return insertChildren(curr);
            });
          });
        }
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
      console.warn("[Workspace Creation] Intercepted:", err.message || err);
      if (err.message && err.message.includes("was not found on the server")) {
         window.location.reload();
         return;
      }
      triggerErrorToast("Database Error on Workspace Save: " + (err.message || err.details || JSON.stringify(err)));
    } finally {
      setIsSubmitting(false);
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
      const res = await deleteWorkspace(id) as any;
      if (res?.error) throw new Error(res.error);
      
      const updatedList = workspaces.filter(w => w.id !== id);
      setWorkspaces(updatedList);
      triggerToast("Workspace deleted successfully");
      if (updatedList.length > 0) {
        setActiveWorkspace(updatedList[0]);
      } else {
        setActiveWorkspace(null);
      }
      
      // Optimistically remove from tree and update parent counts
      setMasterHierarchy(curr => {
        const nodeToDelete = findNodeInHierarchy(curr, id);
        const parentId = nodeToDelete?.parent_workspace_id;
        const tasksToSubtract = nodeToDelete?.total_hierarchy_task_count || 0;

        let bubbled = curr;
        if (parentId && tasksToSubtract > 0) {
          const result = HierarchyStateManager.bubbleTaskCount(curr, parentId, -tasksToSubtract);
          bubbled = result.nodes;
        }

        const removeNode = (tree: any[]): any[] => {
          return tree.filter(n => n.id !== id).map(n => {
            if (n.id === parentId) {
              return {
                ...n,
                subworkspace_count: Math.max(0, (n.subworkspace_count || 0) - 1),
                children: n.children ? removeNode(n.children) : undefined
              };
            }
            if (n.children) {
              return { ...n, children: removeNode(n.children) };
            }
            return n;
          });
        };
        return removeNode(bubbled);
      });
    } catch (e: any) {
      console.warn("[Workspace Deletion] Intercepted:", e.message || e);
      triggerErrorToast("Database Error on Workspace Deletion: " + (e.message || e.details || JSON.stringify(e)));
    }
  };

  const handleDeleteWorkspaceTask = async (nodeId: string) => {
    if (!confirm("Are you sure you want to delete this task? This action cannot be undone.")) return;
    try {
      const res = await deleteTask(nodeId);
      if (res?.error) throw new Error(res.error);
      
      triggerToast("Task deleted successfully");
      
      // Optimistically remove from tree and bubble task count downwards
      setMasterHierarchy(prev => {
        const nodeToDelete = findNodeInHierarchy(prev, nodeId);
        const parentId = nodeToDelete?.parent_workspace_id || nodeToDelete?.parent_task_id;
        
        let bubbled = prev;
        if (parentId) {
          const result = HierarchyStateManager.bubbleTaskCount(prev, parentId, -1);
          bubbled = result.nodes;
        }

        const removeNode = (tree: any[]): any[] => {
          return tree.filter(n => n.id !== nodeId).map(n => {
            if (n.children) {
              return { ...n, children: removeNode(n.children) };
            }
            return n;
          });
        };
        
        return removeNode(bubbled);
      });

      // Remove from active tasks list if currently active
      setTasks(prev => prev.filter(t => t.id !== nodeId));
    } catch (e: any) {
      console.warn("[Task Deletion] Intercepted:", e.message || e);
      triggerErrorToast("Database Error on Task Deletion: " + (e.message || e.details || JSON.stringify(e)));
    }
  };

  // Intent-Driven Hover Prefetching
  const prefetchCache = useRef<Set<string>>(new Set());
  
  const handlePrefetchNode = async (node: any) => {
    // Only prefetch if it hasn't been fetched, isn't currently loading, and hasn't been prefetched already
    if (node.childrenFetched || loading || prefetchCache.current.has(node.id)) return;
    
    // Only prefetch if we know it actually has children
    const hasItems = node.type === 'WORKSPACE' || node.type === 'SUB_WORKSPACE' 
      ? ((node.subworkspace_count || 0) > 0 || (node.total_hierarchy_task_count || 0) > 0)
      : (node.children && node.children.length > 0);
      
    if (!hasItems) return;

    prefetchCache.current.add(node.id);
    
    try {
      const children = await fetchHierarchyChildren(node.id, node.type);
      
      // Inject children silently without expanding
      const insertChildren = (tree: any[]): any[] => {
        return tree.map(item => {
          if (item.id === node.id) {
            return { 
              ...item, 
              children: HierarchyStateManager.mergePrefetchedChildren(item.children, children), 
              childrenFetched: true 
            };
          }
          if (item.children && item.children.length > 0) {
            return { ...item, children: insertChildren(item.children) };
          }
          return item;
        });
      };
      setMasterHierarchy(prev => insertChildren(prev));
    } catch (e) {
      prefetchCache.current.delete(node.id); // allow retry on failure
      console.error("Hover prefetch failed", e);
    }
  };

  const handleTaskWizardSuccess = async (taskData: any) => {
    try {
      const data = await createTask({ ...taskData, workspace_id: taskData.workspace_id || activeWorkspace?.id });
      if (data && 'error' in data) {
        throw new Error((data as any).error);
      }
      
      // Close modal immediately for instant UI feedback
      setIsCreatingTask(false);
      triggerToast("Task created successfully");
      
      // Optimistically insert to list for instant update
      setTasks(prev => [{ ...data, isOptimistic: true }, ...prev]);

      // Refetch full data with relations in background silently
      if (activeWorkspace?.id) {
        fetchTasksByWorkspace(activeWorkspace.id).then(tData => setTasks(tData)).catch(console.error);
      }

      // Refresh the execution hierarchy tree to show the newly created task
      import("@/lib/actions/workspaces").then(m => {
        const parentId = creatingTaskParentId || creatingTaskWorkspaceId;
        const parentType = creatingTaskParentId ? 'TASK' : 'WORKSPACE';
        if (parentId) {
          setExpandedNodes(prev => ({ ...prev, [parentId]: true }));
          m.fetchHierarchyChildren(parentId, parentType).then(children => {
            setMasterHierarchy(curr => {
              // W5.1: Bubble the count recursively via HierarchyStateManager
              const { nodes: bubbledNodes } = HierarchyStateManager.bubbleTaskCount(curr, parentId, 1);
              
              // W5.2: Inject fetched children using intelligent merge
              const insertChildren = (tree: any[]): any[] => tree.map(node => {
                if (node.id === parentId) {
                  return { 
                    ...node, 
                    children: HierarchyStateManager.mergePrefetchedChildren(node.children, children), 
                    childrenFetched: true
                  };
                }
                if (node.children) {
                  return { ...node, children: insertChildren(node.children) };
                }
                return node;
              });
              return insertChildren(bubbledNodes);
            });
          });
        }
      });
      } catch (err: any) {
        console.warn("[Task Creation] Intercepted:", err.message || err);
        if (err.message && err.message.includes("was not found on the server")) {
           window.location.reload();
           return;
        }
        triggerErrorToast("Database Error on Task Creation: " + (err.message || err.details || JSON.stringify(err)));
      }
  };

  if (!mounted || permsLoading || loading) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center space-y-4 transition-colors duration-300 ${
        "bg-surface text-foreground"
      }`}>
        <Loader2 className="h-10 w-10 animate-spin text-theme-icon" />
        <p className="text-xs text-muted font-bold tracking-[0.2em] uppercase">Hydrating Enterprise Workspaces...</p>
      </div>
    );
  }

  if (!hasPermission("WORKSPACES_VIEW")) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center space-y-4 transition-colors duration-300 ${
        "bg-surface text-foreground"
      }`}>
        <div className="p-4 rounded-full bg-danger/10 border border-rose-500/20 text-danger">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-xs text-muted">You do not have capabilities to view the Workspace & Task Engine Dashboard.</p>
      </div>
    );
  }

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="Workspace & Task Engine"
        icon={<FolderKanban className="h-6 w-6" />}
        actions={
          <>
            <div className="relative flex items-center">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isSearching ? 'text-theme-icon animate-spin' : 'text-muted'}`} />
              <input 
                type="text" 
                placeholder="Deep search tasks & workspaces..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-9 pr-8 h-8 text-[13px] rounded-md /50 theme-card-structural focus:-hover outline-none focus: transition-all w-56 sm:w-72 text-foreground`}
              />
              {searchQuery && (
                <AppButton 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-surface/50 text-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </AppButton>
              )}
            </div>

            <AppButton 
              variant={showFilters || activeFilterCount > 0 ? "primary" : "outline"} 
              size="sm" 
              leftIcon={<Filter className="h-4 w-4" />}
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white text-theme-icon">
                  {activeFilterCount}
                </span>
              )}
            </AppButton>

            <AppButton 
              variant="primary" 
              size="sm" 
              leftIcon={<Plus className="h-4 w-4" />} 
              onClick={() => {
                setNewWS({
                  name: "", 
                  code: "", 
                  description: "",
                  assigneeIds: [],
                  start_date: "",
                  end_date: "",
                  is_public: false,
                  parent_workspace_id: "",
                  company_id: ""
                });
                setWsModalMode('ROOT');
              }}
              disabled={!hasPermission("WORKSPACES_CREATE")}
            >
              New Workspace
            </AppButton>
            
            {savedFilters.length > 0 && <div className="hidden sm:block h-6 w-px bg-border mx-1"></div>}
            
            {savedFilters.map(f => (
              <AppButton
                key={f.id}
                variant="ghost"
                onClick={() => applyFilter(f)}
                className={`px-3 py-1.5 text-[12px] font-bold rounded-lg transition-all ${activeSavedFilterId === f.id ? "bg-primary/10 text-primary shadow-sm" : "text-muted hover:text-foreground hover:bg-surface/50"}`}
              >
                {f.name}
              </AppButton>
            ))}

            <div className="hidden sm:block h-6 w-px bg-border mx-1"></div>
            
            <SavedFiltersDropdown
              savedFilters={savedFilters}
              activeSavedFilterId={activeSavedFilterId}
              onSaveCurrent={handleSaveCurrentFilter}
              onApplyFilter={applyFilter}
              onDeleteFilter={deleteSavedFilter}
              align="end"
            />
          </>
        }
      />

      {/* Deep Search & Multi-Level Filtering Ribbon */}
      {showFilters && (
        <div className="mb-4 p-3 rounded-md /40 theme-card-structural space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Filter By Scope:</span>
              <div className="flex items-center theme-card-structural /50 p-0.5 rounded-lg">
                {[
                  { id: 'ALL', label: 'All Items' },
                  { id: 'WORKSPACES', label: 'Workspaces' },
                  { id: 'SUB_WORKSPACES', label: 'Sub-Workspaces' },
                  { id: 'TASKS', label: 'Tasks' },
                ].map(tab => (
                  <AppButton
                    key={tab.id}
                    onClick={() => setFilters(prev => ({ ...prev, entityType: tab.id as any }))}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                      filters.entityType === tab.id 
                        ? 'bg-theme-btn-primary text-white shadow-sm font-semibold' 
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </AppButton>
                ))}
              </div>
            </div>

            {/* Quick Toggle: My Assigned Tasks Only */}
            <div className="flex items-center gap-2">
              <AppButton
                onClick={() => setFilters(prev => ({ ...prev, myTasksOnly: !prev.myTasksOnly }))}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${ filters.myTasksOnly ? 'bg-success/15 text-success border-emerald-500/40 shadow-sm' : 'theme-card-structural /50 text-muted hover:text-foreground' }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>My Assigned Tasks Only</span>
                {filters.myTasksOnly && <Check className="h-3 w-3 ml-0.5" />}
              </AppButton>

              {activeFilterCount > 0 && (
                <AppButton 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="h-7 text-xs text-muted hover:text-danger"
                >
                  Clear All
                </AppButton>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Status</label>
              <select
                value={filters.statusId || ""}
                onChange={(e) => setFilters(prev => ({ ...prev, statusId: e.target.value }))}
                className="w-full text-xs p-2 rounded-lg theme-card-structural text-foreground focus:ring-1 focus:ring-theme-icon outline-none"
              >
                <option value="">All Statuses</option>
                {(taskStatuses || []).map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name || s.status_name}</option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Priority</label>
              <select
                value={filters.priorityId || ""}
                onChange={(e) => setFilters(prev => ({ ...prev, priorityId: e.target.value }))}
                className="w-full text-xs p-2 rounded-lg theme-card-structural text-foreground focus:ring-1 focus:ring-theme-icon outline-none"
              >
                <option value="">All Priorities</option>
                {(priorities || []).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name || p.priority_name}</option>
                ))}
              </select>
            </div>

            {/* Assignee Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Assignee</label>
              <select
                value={filters.assigneeId || ""}
                onChange={(e) => setFilters(prev => ({ ...prev, assigneeId: e.target.value }))}
                className="w-full text-xs p-2 rounded-lg theme-card-structural text-foreground focus:ring-1 focus:ring-theme-icon outline-none"
              >
                <option value="">All Assignees</option>
                {allUsers.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.user_code || 'User'})</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Full Width Master Table Layout */}
      {workspaces.length > 0 ? (
        <div className="flex-1 flex flex-col min-h-0">
            
            {/* Hierarchical Task Matrix */}
            <AppCard className="flex-1 p-2 flex flex-col min-h-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
                <div className="flex items-center gap-1 theme-card-structural p-1 rounded-lg /40">
                  <AppButton 
                    variant="ghost" 
                    onClick={() => setActiveView('HIERARCHY')}
                    className={`h-8 px-3 text-[12px] rounded-md transition-all ${activeView === 'HIERARCHY' ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted hover:text-foreground font-medium"}`}
                  >
                    <GitMerge className="h-3.5 w-3.5 mr-1.5" />
                    Execution Hierarchy
                  </AppButton>
                  <AppButton 
                    variant="ghost" 
                    onClick={() => setActiveView('SPRINTS')}
                    className={`h-8 px-3 text-[12px] rounded-md transition-all ${activeView === 'SPRINTS' ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted hover:text-foreground font-medium"}`}
                  >
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                    Sprint Planning
                  </AppButton>
                </div>

                {activeView === 'HIERARCHY' && (
                  <div className="flex items-center gap-1.5">
                    <label className={`flex items-center gap-2 cursor-pointer text-muted mr-3`}>
                      <input 
                        type="checkbox" 
                        checked={autoCollapse} 
                        onChange={e => setAutoCollapse(e.target.checked)} 
                        className={`rounded border-border text-theme-icon focus:ring-theme-icon`}
                      />
                      <span className="text-[11px] uppercase tracking-wider font-bold">Auto-Minimize Others</span>
                    </label>
                    <div className="w-px h-4 bg-border/50 mx-1"></div>
                    <AppButton
                      variant="ghost"
                      size="icon-sm"
                      onClick={handleExpandAllBranches}
                      disabled={isExpandingAll}
                      className="text-muted hover:text-foreground hover:theme-card-structural -hover rounded-md /40"
                      title="Fetch and expand all workspace and task branches"
                    >
                      {isExpandingAll ? (
                        <Loader2 className="h-4 w-4 animate-spin text-theme-icon" />
                      ) : (
                        <ChevronsUpDown className="h-4 w-4" />
                      )}
                    </AppButton>

                    <AppButton
                      variant="ghost"
                      size="icon-sm"
                      onClick={handleCollapseAllBranches}
                      className="text-muted hover:text-foreground hover:theme-card-structural -hover rounded-md /40"
                      title="Collapse all branches"
                    >
                      <ChevronsDownUp className="h-4 w-4" />
                    </AppButton>
                  </div>
                )}
              </div>

              {activeView === 'HIERARCHY' ? (
                <div className="flex-1 overflow-auto min-h-0 scrollbar-thin pr-1">
              <WorkspaceMasterTable 
                hierarchy={masterHierarchy} 
                expandedNodes={expandedNodes}
                setExpandedNodes={setExpandedNodes}
                autoCollapse={autoCollapse}
                forceExpandAll={!!(debouncedSearchQuery.trim() || activeFilterCount > 0)}
                searchQuery={debouncedSearchQuery}
                isLightMode={isLightMode}
                taskStatuses={initialData?.taskStatuses || []}
                allUsers={allUsers}
                onlineUsers={onlineUsers}
                presenceMap={presenceMap}
                onOpenTask={(taskNode) => setDrawerTask(taskNode)}
                onOpenWorkspace={(node) => openEditWorkspace(node)}
                onShareNode={(node) => openEditWorkspace(node)}
                onCreateSubWorkspace={(node) => {
                  setNewWS({
                    name: "", 
                    code: "", 
                    description: "",
                    assigneeIds: [],
                    start_date: "",
                    end_date: "",
                    is_public: false,
                    parent_workspace_id: node.id,
                    company_id: node.company_id || workspaces.find(w => w.id === node.id)?.company_id || ""
                  });
                  setWsModalMode('SUB');
                }}
                onCreateTask={(node) => {
                  if (node.type === 'WORKSPACE' || node.type === 'SUB_WORKSPACE') {
                    setCreatingTaskWorkspaceId(node.id);
                    setCreatingTaskParentId(null);
                  } else {
                    setCreatingTaskWorkspaceId(node.workspace_id);
                    setCreatingTaskParentId(node.id);
                  }
                  setCreatingTaskInitialName("");
                  setIsCreatingTask(true);
                }}
                onDeleteNode={(node) => {
                  if (node.type === 'WORKSPACE' || node.type === 'SUB_WORKSPACE') {
                    handleDeleteWorkspace(node.id);
                  } else {
                    handleDeleteWorkspaceTask(node.id);
                  }
                }}
                onPrefetchNode={handlePrefetchNode}
                onExpandNode={async (node) => {
                  try {
                    const children = await fetchHierarchyChildren(node.id, node.type);
                    // Add the children to the correct node in masterHierarchy
                    const insertChildren = (tree: any[]): any[] => {
                      return tree.map(item => {
                        if (item.id === node.id) {
                          return { 
                            ...item, 
                            children: HierarchyStateManager.mergePrefetchedChildren(item.children, children), 
                            childrenFetched: true 
                          };
                        }
                        if (item.children && item.children.length > 0) {
                          return { ...item, children: insertChildren(item.children) };
                        }
                        return item;
                      });
                    };
                    setMasterHierarchy(prev => insertChildren(prev));
                  } catch (e) {
                    console.error("Failed to fetch children", e);
                  }
                }}
              />
              </div>
              ) : (
                <div className="flex-1 overflow-hidden">
                  <SprintBoard workspaceId={activeWorkspace?.id || workspaces[0]?.id} currentUser={currentUser} />
                </div>
              )}
            </AppCard>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 mx-4 my-8 rounded-xl border-dashed /60 theme-card-structural /30">
          <FolderKanban className="h-10 w-10 text-muted opacity-40 mb-4" />
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground mb-1">No Active Workspaces Found</h2>
          <p className="text-[13px] text-muted max-w-sm text-center mb-6">Initialize a new enterprise workspace to begin orchestrating tasks and collaborating with your team.</p>
          <AppButton variant="primary" onClick={() => setWsModalMode('ROOT')} disabled={!hasPermission("WORKSPACES_CREATE")} leftIcon={<Plus className="h-4 w-4" />}>
            Create Workspace
          </AppButton>
        </div>
      )}

      {/* Creation Overlays */}
      <SidePeekDrawer
        isOpen={wsModalMode !== null}
        onClose={() => { setWsModalMode(null); setEditWSId(null); }}
        title={wsModalMode === 'EDIT' ? "Edit Workspace" : (wsModalMode === 'SUB' ? "New Sub-Workspace" : "Provision Workspace")}
        width="lg"
      >
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* Section 1: Workspace Identity */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                <Building2 className="h-4 w-4 text-theme-icon" />
                <h3 className={`text-sm font-semibold tracking-tight text-foreground`}>Workspace Identity</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Company / Entity Link *</label>
                  <select 
                    className={`w-full p-2 rounded-md text-[13px] theme-card-structural /60 focus:border-theme-icon focus:outline-none transition-colors text-foreground`}
                    value={newWS.company_id}
                    onChange={e => setNewWS({...newWS, company_id: e.target.value})}
                  >
                    <option value="" disabled>-- Select Company --</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Workspace Name *</label>
                  <AppInput disabled={!!editWSId} placeholder="e.g. Q4 Platform Migration" value={newWS.name || ""} onChange={e => setNewWS({...newWS, name: e.target.value})} className="bg-surface h-9 text-[13px]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Workspace Code</label>
                  <AppInput disabled placeholder="[Auto-Generated]" value={editWSId ? (newWS.code || "") : "[Auto-Generated]"} className="bg-surface-hover h-9 text-[13px]" />
                </div>
              </div>

              {(wsModalMode === 'SUB' || (wsModalMode === 'EDIT' && newWS.parent_workspace_id)) && (
                <div className="grid grid-cols-1">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Parent Workspace Link</label>
                    <select 
                      className={`w-full p-2 rounded-md text-[13px] theme-card-structural /60 focus:border-theme-icon focus:outline-none transition-colors text-foreground`}
                      value={newWS.parent_workspace_id}
                      onChange={e => {
                        const parentId = e.target.value;
                        const parent = workspaces.find(w => w.id === parentId);
                        setNewWS({
                          ...newWS, 
                          parent_workspace_id: parentId,
                          ...(parent?.company_id ? { company_id: parent.company_id } : {})
                        });
                      }}
                    >
                      <option value="" disabled>-- Select Parent Workspace --</option>
                      {workspaces.filter(w => w.id !== editWSId).map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Timeline & Objectives */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                <Target className="h-4 w-4 text-theme-icon" />
                <h3 className={`text-sm font-semibold tracking-tight text-foreground`}>Timeline & Objectives</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Start Date</label>
                  <AppInput type="date" min={new Date().toISOString().split('T')[0]} value={newWS.start_date} onChange={e => setNewWS({...newWS, start_date: e.target.value})} className="bg-surface h-9 text-[13px]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Target End Date</label>
                  <AppInput type="date" min={newWS.start_date || new Date().toISOString().split('T')[0]} value={newWS.end_date} onChange={e => setNewWS({...newWS, end_date: e.target.value})} className="bg-surface h-9 text-[13px]" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">Objective Description</label>
                <textarea 
                  className={`w-full h-24 p-3 rounded-md text-[13px] theme-card-structural /60 focus:border-theme-icon focus:outline-none transition-colors resize-none text-foreground`}
                  placeholder="Detailed project requirements, goals, and constraints..."
                  value={newWS.description}
                  onChange={e => setNewWS({...newWS, description: e.target.value})}
                />
              </div>
            </div>

            {/* Section 3: Access & Security */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                <ShieldCheck className="h-4 w-4 text-theme-icon" />
                <h3 className={`text-sm font-semibold tracking-tight text-foreground`}>Access & Stakeholders</h3>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-muted uppercase tracking-wider block">Workspace Assignees (Users)</label>
                  <AppButton 
                    variant="ghost" 
                    size="sm"
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
                    className="h-6 px-2 text-[10px] text-theme-icon hover:bg-theme-btn-primary/10"
                  >
                    {newWS.assigneeIds.length === availableUsers.length && availableUsers.length > 0 ? "Deselect All" : "Select All"}
                  </AppButton>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                  <input 
                    type="text" 
                    placeholder="Search personnel..." 
                    value={assigneeSearch} 
                    onChange={e => setAssigneeSearch(e.target.value)} 
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                    className="w-full pl-8 pr-3 h-8 text-[12px] rounded-md /60 theme-card-structural focus:outline-none focus:border-theme-icon text-foreground transition-colors"
                  />
                </div>

                <div className="max-h-[160px] overflow-y-auto rounded-md border border-border/40 bg-background/50 p-1 scrollbar-thin">
                  {availableUsers.filter(u => u.full_name?.toLowerCase().includes(assigneeSearch.toLowerCase()) || u.user_code?.toLowerCase().includes(assigneeSearch.toLowerCase())).map(u => (
                    <label key={u.id} className="flex items-center gap-3 text-sm p-1.5 rounded cursor-pointer hover:bg-surface-hover transition-colors">
                      <input 
                        type="checkbox" 
                        disabled={checkingDependencyId === u.id}
                        checked={newWS.assigneeIds.includes(u.id)} 
                        onChange={async e => {
                          if (e.target.checked) {
                            if (editWSId) {
                              setUserRoleModal({ userId: u.id, userName: u.full_name, step: 'choice' });
                            } else {
                              setNewWS({...newWS, assigneeIds: [...newWS.assigneeIds, u.id]});
                            }
                          } else {
                            if (editWSId) {
                              setCheckingDependencyId(u.id);
                              try {
                                const { checkWorkspaceUserDependencies } = await import("@/lib/actions/dependencies");
                                const deps = await checkWorkspaceUserDependencies(editWSId, [u.id]);
                                const result = deps[u.id];
                                if (result && !result.isSafe) {
                                  setDependencyModal({ userId: u.id, userName: u.full_name, result });
                                  return; // Stop here, don't update state yet
                                }
                              } catch (err) {
                                console.error("Dependency check failed:", err);
                              } finally {
                                setCheckingDependencyId(null);
                              }
                            }
                            // Safe to remove
                            setNewWS({...newWS, assigneeIds: newWS.assigneeIds.filter((id: string) => id !== u.id)});
                          }
                        }} 
                        className="rounded border-border text-theme-icon focus:ring-theme-icon focus:ring-offset-background h-3.5 w-3.5" 
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-foreground text-[12px] font-medium truncate flex items-center gap-2">
                          {u.full_name}
                          {checkingDependencyId === u.id && <Loader2 className="w-3 h-3 animate-spin text-theme-icon" />}
                        </span>
                      </div>
                    </label>
                  ))}
                  {availableUsers.length === 0 && <p className="text-[11px] text-muted p-2 text-center">No users available.</p>}
                </div>
              </div>

              <div className={`p-3 rounded-md /40 flex items-start gap-3 transition-colors ${ newWS.is_public ? "bg-theme-btn-primary/5 border-theme-btn-primary/30" : "theme-card-structural " }`}>
                <input 
                  type="checkbox" 
                  id="is_public" 
                  checked={newWS.is_public} 
                  onChange={e => {
                    const checked = e.target.checked;
                    if (checked) {
                      const allUserIds = availableUsers.map(u => u.id);
                      setNewWS({...newWS, is_public: true, assigneeIds: allUserIds});
                    } else {
                      setNewWS({...newWS, is_public: false});
                    }
                  }} 
                  className="mt-0.5 rounded border-border text-theme-icon focus:ring-theme-icon h-4 w-4 cursor-pointer"
                />
                <label htmlFor="is_public" className="cursor-pointer flex flex-col">
                  <span className="text-[13px] font-semibold text-foreground">Public Visibility</span>
                  <span className="text-[11px] text-muted">Allow any authenticated personnel to view and join this workspace.</span>
                </label>
              </div>
            </div>

          </div>
          
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border px-6 pb-6">
            <AppButton variant="outline" onClick={() => { setWsModalMode(null); setEditWSId(null); }} disabled={isSubmitting} className="text-danger border-danger/30 hover:bg-danger/10 hover:border-danger hover:text-danger">Discard</AppButton>
            <AppButton variant="primary" onClick={handleCreateWorkspace} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : (editWSId ? "Save Changes" : "Provision Workspace")}
            </AppButton>
          </div>
        </div>
      </SidePeekDrawer>

      {isCreatingTask && (activeWorkspace || workspaces.length > 0) && (
        <TaskCreationWizard 
          workspaceId={creatingTaskWorkspaceId || activeWorkspace?.id || workspaces[0]?.id} 
          initialParentTaskId={creatingTaskParentId || undefined}
          initialTaskName={creatingTaskInitialName}
          onClose={() => {
            setIsCreatingTask(false);
            setCreatingTaskWorkspaceId(null);
            setCreatingTaskParentId(null);
            setCreatingTaskInitialName("");
          }}
          onSuccess={async (newTask: any) => {
            const wsId = creatingTaskWorkspaceId || activeWorkspace?.id || workspaces[0]?.id;
            await handleTaskWizardSuccess({ ...newTask, workspace_id: wsId });
            setCreatingTaskWorkspaceId(null);
            setCreatingTaskParentId(null);
          }}
        />
      )}

      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 rounded-xl bg-theme-btn-primary text-white px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <span className="text-xs font-semibold">{successToast}</span>
        </div>
      )}
      {errorToast && (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 rounded-xl bg-danger text-white px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <span className="text-xs font-semibold">{errorToast}</span>
        </div>
      )}

      {drawerTask && (
        <TaskDetailDrawer 
          task={drawerTask} 
          onClose={() => setDrawerTask(null)} 
        />
      )}

      {/* Dependency Check Modal */}
      {dependencyModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background border border-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className={`p-4 border-b ${dependencyModal.result.type === 'executive' ? 'bg-danger/10 border-danger/20' : 'bg-warning/10 border-warning/20'}`}>
              <div className="flex items-center gap-3">
                {dependencyModal.result.type === 'executive' ? (
                  <ShieldAlert className="w-5 h-5 text-danger" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-warning" />
                )}
                <h3 className="font-bold text-sm">Action Requires Attention</h3>
              </div>
            </div>
            
            <div className="p-5">
              <p className="text-sm text-foreground leading-relaxed mb-4">
                <strong>{dependencyModal.userName}</strong> has active dependencies in this workspace:
              </p>
              
              <ul className="text-xs text-muted mb-5 space-y-1 bg-surface p-3 rounded-lg border border-border/50 max-h-40 overflow-y-auto">
                {dependencyModal.result.blockingItems.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-theme-icon mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              
              <div className="p-3 bg-surface-hover rounded-lg border border-border/50 text-xs text-foreground font-medium">
                {dependencyModal.result.message}
              </div>
            </div>
            
            <div className="p-4 border-t border-border flex justify-end gap-3 bg-surface/30">
              <AppButton 
                variant="outline" 
                onClick={() => setDependencyModal(null)}
              >
                {dependencyModal.result.type === 'executive' ? 'Close' : 'No, Go Back'}
              </AppButton>
              {dependencyModal.result.type === 'watcher' && (
                <AppButton 
                  variant="primary" 
                  className="bg-danger hover:opacity-90 border-none"
                  onClick={() => {
                    // Safe to remove watcher
                    setNewWS({
                      ...newWS,
                      assigneeIds: newWS.assigneeIds.filter(id => id !== dependencyModal.userId)
                    });
                    setDependencyModal(null);
                  }}
                >
                  Yes, Remove User
                </AppButton>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Role Assignment Modal */}
      {userRoleModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background border border-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b bg-surface flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm">Assign User Role: {userRoleModal.userName}</h3>
              <button onClick={() => { setUserRoleModal(null); setStagedTaskRoles({}); }} className="text-muted hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 min-h-0">
              {userRoleModal.step === 'choice' ? (
                <div className="space-y-4">
                  <p className="text-sm text-foreground leading-relaxed">
                    Will this user be only a watcher in this workspace, or should they be assigned as an owner/executive to specific tasks?
                  </p>
                  
                  <div className="flex flex-col gap-3 mt-4">
                    <AppButton 
                      variant="outline" 
                      className="justify-start h-auto py-3 px-4 text-left border-border/50 hover:bg-surface"
                      onClick={() => {
                        setNewWS({...newWS, assigneeIds: [...newWS.assigneeIds, userRoleModal.userId]});
                        setUserRoleModal(null);
                      }}
                    >
                      <div>
                        <div className="font-bold text-sm text-foreground">Only Watcher / Member</div>
                        <div className="text-xs text-muted mt-1">Add them to the workspace without task assignments.</div>
                      </div>
                    </AppButton>
                    
                    <AppButton 
                      variant="primary" 
                      className="justify-start h-auto py-3 px-4 text-left bg-theme-btn-primary hover:opacity-90"
                      onClick={async () => {
                        setUserRoleModal({ ...userRoleModal, step: 'tasks' });
                        setFetchingTasksForRole(true);
                        try {
                          const { fetchWorkspaceTasksList } = await import("@/lib/actions/tasks");
                          const tasks = await fetchWorkspaceTasksList(editWSId!);
                          setWorkspaceTasksForRole(tasks);
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setFetchingTasksForRole(false);
                        }
                      }}
                    >
                      <div>
                        <div className="font-bold text-sm">Assign to Tasks</div>
                        <div className="text-xs opacity-90 mt-1">Select specific tasks to assign them as Primary or Executor.</div>
                      </div>
                    </AppButton>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-foreground leading-relaxed">
                    Select tasks to assign <strong>{userRoleModal.userName}</strong> to:
                  </p>
                  
                  {fetchingTasksForRole ? (
                    <div className="flex items-center justify-center p-8 text-muted">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      <span className="text-sm">Loading tasks...</span>
                    </div>
                  ) : workspaceTasksForRole.length === 0 ? (
                    <div className="text-center p-8 bg-surface rounded-lg border border-border/50 text-sm text-muted">
                      No active tasks found in this workspace.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {workspaceTasksForRole.map(task => (
                        <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-surface">
                          <div className="font-medium text-xs truncate max-w-[180px]">{task.title}</div>
                          <div className="flex items-center gap-2">
                            <select
                              className="text-xs bg-background border border-border rounded px-2 py-1 outline-none text-muted focus:text-foreground"
                              value={stagedTaskRoles[task.id] || ""}
                              onChange={e => {
                                const val = e.target.value;
                                if (!val) {
                                  const newRoles = { ...stagedTaskRoles };
                                  delete newRoles[task.id];
                                  setStagedTaskRoles(newRoles);
                                } else {
                                  setStagedTaskRoles({ ...stagedTaskRoles, [task.id]: val as 'primary' | 'executor' });
                                }
                              }}
                            >
                              <option value="">None</option>
                              <option value="executor">Executor</option>
                              <option value="primary">Primary Owner</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {userRoleModal.step === 'tasks' && (
              <div className="p-4 border-t border-border flex justify-end gap-3 bg-surface/30 shrink-0">
                <AppButton 
                  variant="ghost" 
                  onClick={() => setUserRoleModal({ ...userRoleModal, step: 'choice' })}
                  disabled={isAssigningTasks}
                >
                  Back
                </AppButton>
                <AppButton 
                  variant="primary" 
                  className="bg-theme-btn-primary hover:opacity-90"
                  disabled={isAssigningTasks || (workspaceTasksForRole.length > 0 && Object.keys(stagedTaskRoles).length === 0)}
                  onClick={async () => {
                    if (Object.keys(stagedTaskRoles).length > 0) {
                      setIsAssigningTasks(true);
                      try {
                        const { assignUserToTasksBatch } = await import("@/lib/actions/tasks");
                        const assignments = Object.entries(stagedTaskRoles).map(([taskId, role]) => ({ taskId, role }));
                        const res = await assignUserToTasksBatch(userRoleModal.userId, assignments);
                        if (res.error) {
                          toast.error(res.error);
                        } else {
                          toast.success(`User assigned to ${assignments.length} task(s).`);
                        }
                      } catch (err) {
                        console.error(err);
                        toast.error("Failed to assign user to tasks.");
                      } finally {
                        setIsAssigningTasks(false);
                      }
                    }
                    
                    setNewWS({...newWS, assigneeIds: [...newWS.assigneeIds, userRoleModal.userId]});
                    setUserRoleModal(null);
                    setStagedTaskRoles({});
                  }}
                >
                  {isAssigningTasks ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Assignments'}
                </AppButton>
              </div>
            )}
          </div>
        </div>
      )}

    </PageContainer>
  );
}

