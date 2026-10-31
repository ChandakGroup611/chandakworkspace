"use client";
/* eslint-disable no-restricted-syntax */
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
  X, Check, ChevronsDownUp, ChevronsUpDown, UserCheck, RefreshCw, Globe, FileSpreadsheet
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
import { WorkspaceFilterMultiSelect } from "@/components/workspaces/WorkspaceFilterMultiSelect";
import dynamic from "next/dynamic";

const TaskCreationWizard = dynamic(() => import("@/components/tasks/TaskCreationWizard"), {
  ssr: false
});
const TaskDetailDrawer = dynamic(() => import("@/components/tasks/TaskDetailDrawer").then(m => m.TaskDetailDrawer), {
  ssr: false
});
const SprintBoard = dynamic(() => import("@/components/workspaces/sprints/SprintBoard").then(m => m.SprintBoard), {
  ssr: false
});

import { SidePeekDrawer } from "@/components/ui/SidePeekDrawer";
import { getTaskDetails, updateNodeStatus, deleteTask, createTask } from "@/lib/actions/tasks";
import { useRouter, useSearchParams } from "next/navigation";
import { WorkspaceMasterTable } from "@/components/workspaces/WorkspaceMasterTable";
import { PageContainer } from "@/components/layout/PageContainer";
import ChandakLoader from "@/components/ui/ChandakLoader";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/feedback/States";
import { cn } from "@/lib/utils";

const SEG_ON = "bg-surface text-foreground font-semibold shadow-sm";
const SEG_OFF = "text-muted hover:text-foreground";
const SEG_BTN = "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-colors";
const CHIP = "inline-flex items-center gap-1 rounded-md bg-accent-soft py-0.5 pl-2 pr-1 text-[12.5px] text-accent-soft-text";
const CHIP_X = "inline-flex h-5 w-5 items-center justify-center rounded hover:bg-surface/60";
const FIELD_LABEL = "text-[13px] font-medium text-subtle";
const SECTION_TITLE = "text-[14px] font-semibold text-heading";
const MODAL_CARD = "w-full max-w-md overflow-hidden rounded-[12px] border border-border bg-elevated text-foreground shadow-lg";
export default function WorkspacesClient({ initialData, initialTaskId }: { initialData: any; initialTaskId?: string | null }) {
  const router = useRouter();
  const { isLight: isLightMode } = useTheme();
  const { hasPermission, loading: permsLoading, roleCode } = usePermissions();

  const [workspaces, setWorkspaces] = useState<any[]>(initialData?.workspaces || []);
  const [companies, setCompanies] = useState<any[]>(initialData?.companies || []);
  const [priorities, setPriorities] = useState<any[]>(initialData?.priorities || []);
  const [taskStatuses, setTaskStatuses] = useState<any[]>(initialData?.taskStatuses || []);
  const [allUsers, setAllUsers] = useState<any[]>(initialData?.allUsers || []);
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
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; type: 'WORKSPACE' | 'TASK'; id: string; title: string; description: string } | null>(null);

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
  const filterPopoverRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };
    if (showFilters) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFilters]);
  
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

  useEffect(() => {
    if (!initialData?.allUsers || initialData.allUsers.length === 0) {
      const supabase = createClient();
      supabase.from('user_master').select('id, full_name, user_code, email').eq('is_active', true).eq('is_deleted', false).order('full_name').then(({ data }) => {
        if (data && data.length > 0) setAllUsers(data);
      });
    }
  }, [initialData?.allUsers]);

  const userScope = initialData?.userScope;
  const isSuperAdmin = roleCode === "SUPER_ADMIN" || userScope?.isSuperAdmin || hasPermission("WORKSPACES_MANAGE");
  const isManager = userScope?.isManager || (userScope?.subordinateUserIds && userScope.subordinateUserIds.length > 1);
  const managedDepts = userScope?.managedDepartments || [];

  const [hierarchyScope, setHierarchyScope] = useState<"all" | "my_dept" | "my_reports" | "assigned_me">("all");
  const [selectedDepartmentName, setSelectedDepartmentName] = useState<string>("ALL");

  const [openDropdown, setOpenDropdown] = useState<'scope' | 'workspace' | 'subworkspace' | 'company' | 'status' | 'priority' | 'assignee' | null>(null);

  const [filters, setFilters] = useState<HierarchyFilterOptions>({
    entityType: 'ALL',
    entityTypes: [],
    workspaceIds: [],
    subWorkspaceIds: [],
    companyIds: [],
    statusIds: [],
    priorityIds: [],
    assigneeIds: [],
    workspaceId: '',
    subWorkspaceId: '',
    companyId: '',
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
      (filters.workspaceIds && filters.workspaceIds.length > 0) ||
      filters.workspaceId ||
      (filters.subWorkspaceIds && filters.subWorkspaceIds.length > 0) ||
      filters.subWorkspaceId ||
      (filters.companyIds && filters.companyIds.length > 0) ||
      filters.companyId ||
      (filters.statusIds && filters.statusIds.length > 0) ||
      filters.statusId || 
      (filters.priorityIds && filters.priorityIds.length > 0) ||
      filters.priorityId || 
      (filters.assigneeIds && filters.assigneeIds.length > 0) ||
      filters.assigneeId || 
      filters.myTasksOnly || 
      (filters.entityTypes && filters.entityTypes.length > 0) ||
      (filters.entityType && filters.entityType !== 'ALL')
    );

    if (!hasActiveFilters) {
      if (initialMasterHierarchy.length > 0) {
        setMasterHierarchy(initialMasterHierarchy);
      } else {
        searchHierarchyDeep("", { entityType: 'ALL' }).then(res => {
          if (!isCancelled && res.hierarchy) setMasterHierarchy(res.hierarchy);
        });
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
  }, [debouncedSearchQuery, filters, initialMasterHierarchy]);

  const {
    savedFilters,
    activeSavedFilterId,
    saveCurrentFilter,
    applySavedFilter,
    deleteSavedFilter
  } = useSavedFilters<{ searchQuery: string, filters: HierarchyFilterOptions }>("chandak_workspaces", currentUser?.id || null, (payload) => {
    setSearchQuery(payload.searchQuery || "");
    const pf = payload.filters || {};
    const loadedWsIds = pf.workspaceIds || (pf.workspaceId ? [pf.workspaceId] : []);
    const loadedSubWsIds = pf.subWorkspaceIds || (pf.subWorkspaceId ? [pf.subWorkspaceId] : []);
    const loadedCompIds = pf.companyIds || (pf.companyId ? [pf.companyId] : []);
    const loadedStatusIds = pf.statusIds || (pf.statusId ? [pf.statusId] : []);
    const loadedPriorityIds = pf.priorityIds || (pf.priorityId ? [pf.priorityId] : []);
    const loadedAssigneeIds = pf.assigneeIds || (pf.assigneeId ? [pf.assigneeId] : []);
    setFilters({
      entityType: pf.entityType || 'ALL',
      entityTypes: pf.entityTypes || [],
      workspaceIds: loadedWsIds,
      workspaceId: pf.workspaceId || '',
      subWorkspaceIds: loadedSubWsIds,
      subWorkspaceId: pf.subWorkspaceId || '',
      companyIds: loadedCompIds,
      companyId: pf.companyId || '',
      statusIds: loadedStatusIds,
      priorityIds: loadedPriorityIds,
      assigneeIds: loadedAssigneeIds,
      statusId: pf.statusId || '',
      priorityId: pf.priorityId || '',
      assigneeId: pf.assigneeId || '',
      myTasksOnly: !!pf.myTasksOnly
    });
    if (payload.searchQuery || Object.values(pf).some(v => v !== '' && v !== false && v !== 'ALL' && (!Array.isArray(v) || v.length > 0))) {
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
        const pf = payload.filters || {};
        const loadedWsIds = pf.workspaceIds || (pf.workspaceId ? [pf.workspaceId] : []);
        const loadedSubWsIds = pf.subWorkspaceIds || (pf.subWorkspaceId ? [pf.subWorkspaceId] : []);
        const loadedCompIds = pf.companyIds || (pf.companyId ? [pf.companyId] : []);
        const loadedStatusIds = pf.statusIds || (pf.statusId ? [pf.statusId] : []);
        const loadedPriorityIds = pf.priorityIds || (pf.priorityId ? [pf.priorityId] : []);
        const loadedAssigneeIds = pf.assigneeIds || (pf.assigneeId ? [pf.assigneeId] : []);
        setFilters({
          entityType: pf.entityType || 'ALL',
          entityTypes: pf.entityTypes || [],
          workspaceIds: loadedWsIds,
          workspaceId: pf.workspaceId || '',
          subWorkspaceIds: loadedSubWsIds,
          subWorkspaceId: pf.subWorkspaceId || '',
          companyIds: loadedCompIds,
          companyId: pf.companyId || '',
          statusIds: loadedStatusIds,
          priorityIds: loadedPriorityIds,
          assigneeIds: loadedAssigneeIds,
          statusId: pf.statusId || '',
          priorityId: pf.priorityId || '',
          assigneeId: pf.assigneeId || '',
          myTasksOnly: !!pf.myTasksOnly
        });
        if (payload.searchQuery || Object.values(pf).some(v => v !== '' && v !== false && v !== 'ALL' && (!Array.isArray(v) || v.length > 0))) {
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
    if (filters.entityTypes && filters.entityTypes.length > 0) {
      count += filters.entityTypes.length;
    } else if (filters.entityType && filters.entityType !== 'ALL') {
      count++;
    }

    if (filters.workspaceIds && filters.workspaceIds.length > 0) {
      count += filters.workspaceIds.length;
    } else if (filters.workspaceId) {
      count++;
    }

    if (filters.subWorkspaceIds && filters.subWorkspaceIds.length > 0) {
      count += filters.subWorkspaceIds.length;
    } else if (filters.subWorkspaceId) {
      count++;
    }

    if (filters.companyIds && filters.companyIds.length > 0) {
      count += filters.companyIds.length;
    } else if (filters.companyId) {
      count++;
    }

    if (filters.statusIds && filters.statusIds.length > 0) {
      count += filters.statusIds.length;
    } else if (filters.statusId) {
      count++;
    }

    if (filters.priorityIds && filters.priorityIds.length > 0) {
      count += filters.priorityIds.length;
    } else if (filters.priorityId) {
      count++;
    }

    if (filters.assigneeIds && filters.assigneeIds.length > 0) {
      count += filters.assigneeIds.length;
    } else if (filters.assigneeId) {
      count++;
    }

    if (filters.myTasksOnly) count++;
    return count;
  }, [filters]);

  const clearFilters = () => {
    setSearchQuery("");
    setFilters({
      entityType: 'ALL',
      entityTypes: [],
      workspaceIds: [],
      subWorkspaceIds: [],
      companyIds: [],
      statusIds: [],
      priorityIds: [],
      assigneeIds: [],
      workspaceId: '',
      subWorkspaceId: '',
      companyId: '',
      statusId: '',
      priorityId: '',
      assigneeId: '',
      myTasksOnly: false
    });
    setOpenDropdown(null);
  };

  const toggleScope = (scopeId: 'WORKSPACES' | 'SUB_WORKSPACES' | 'TASKS') => {
    setFilters(prev => {
      const current = prev.entityTypes && prev.entityTypes.length > 0
        ? [...prev.entityTypes]
        : (prev.entityType && prev.entityType !== 'ALL' ? [prev.entityType] : []);
      const exists = current.includes(scopeId);
      let next: ('WORKSPACES' | 'SUB_WORKSPACES' | 'TASKS')[];
      if (exists) {
        next = current.filter(s => s !== scopeId);
      } else {
        next = [...current, scopeId];
      }
      if (next.length === 0 || next.length === 3) {
        return { ...prev, entityType: 'ALL', entityTypes: [] };
      }
      return {
        ...prev,
        entityType: next.length === 1 ? next[0] : undefined,
        entityTypes: next
      };
    });
  };

  const scopeOptions = useMemo(() => [
    { id: 'WORKSPACES', label: 'Workspaces' },
    { id: 'SUB_WORKSPACES', label: 'Sub-workspaces' },
    { id: 'TASKS', label: 'Tasks' },
  ], []);
  const scopeLabel = (id: string) => scopeOptions.find(o => o.id === id)?.label || id;

  const rootWorkspaces = useMemo(() => {
    return (workspaces || []).filter((w: any) => !w.parent_workspace_id);
  }, [workspaces]);

  const workspaceOptions = useMemo(() => {
    const list = rootWorkspaces.length > 0 ? rootWorkspaces : (workspaces || []);
    return list.map((w: any) => ({
      id: w.id,
      label: w.name || w.workspace_name || 'Workspace',
      sublabel: w.code || w.workspace_code ? `(${w.code || w.workspace_code})` : undefined
    }));
  }, [rootWorkspaces, workspaces]);

  const subWorkspaceOptions = useMemo(() => {
    const allSubs = (workspaces || []).filter((w: any) => !!w.parent_workspace_id);
    const parentWsIds = filters.workspaceIds && filters.workspaceIds.length > 0
      ? filters.workspaceIds
      : (filters.workspaceId ? [filters.workspaceId] : []);
    
    const filteredSubs = parentWsIds.length > 0
      ? allSubs.filter((w: any) => parentWsIds.includes(w.parent_workspace_id))
      : allSubs;

    return filteredSubs.map((w: any) => {
      const parentObj = workspaces.find((p: any) => p.id === w.parent_workspace_id);
      return {
        id: w.id,
        label: w.name || w.workspace_name || 'Sub-workspace',
        sublabel: parentObj ? `(${parentObj.name || parentObj.workspace_name})` : (w.code ? `(${w.code})` : undefined)
      };
    });
  }, [workspaces, filters.workspaceIds, filters.workspaceId]);

  const companyOptions = useMemo(() => {
    return (companies || []).map((c: any) => ({
      id: c.id,
      label: c.name || c.company_name || 'Company'
    }));
  }, [companies]);

  const statusOptions = useMemo(() => {
    return (taskStatuses || []).map((s: any) => ({
      id: s.id,
      label: s.name || s.status_name || 'Status',
      color: s.status_color
    }));
  }, [taskStatuses]);

  const priorityOptions = useMemo(() => {
    return (priorities || []).map((p: any) => ({
      id: p.id,
      label: p.name || p.priority_name || 'Priority',
      color: p.priority_color
    }));
  }, [priorities]);

  const assigneeOptions = useMemo(() => {
    return (allUsers || []).map((u: any) => ({
      id: u.id,
      label: u.full_name || 'User',
      sublabel: u.user_code ? `(${u.user_code})` : undefined
    }));
  }, [allUsers]);

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

  const [autoCollapse, setAutoCollapse] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('workspace_auto_collapse');
        if (saved !== null) return JSON.parse(saved);
      } catch (e) {}
    }
    return false; // Default false: keep branches open on list page basis
  });

  useEffect(() => {
    try {
      localStorage.setItem('workspace_auto_collapse', JSON.stringify(autoCollapse));
    } catch (e) {}
  }, [autoCollapse]);

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

  // Auto-expand hierarchy path to prefetched workspace or restored hierarchy state
  const autoExpandedPathsRef = useRef<Set<string>>(new Set());
  const workspaceParam = searchParams?.get('workspace');
  const restoreHierarchyParam = searchParams?.get('restoreHierarchy');

  useEffect(() => {
    let targetId = workspaceParam;
    let savedExpanded: Record<string, boolean> | null = null;
    let savedLastActive: string | null = null;

    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem('chandak_hierarchy_expanded_nodes');
        if (raw) savedExpanded = JSON.parse(raw);
        savedLastActive = sessionStorage.getItem('chandak_hierarchy_last_active_id');
      } catch (e) {}
    }

    if (!targetId && (restoreHierarchyParam || savedLastActive)) {
      targetId = savedLastActive || null;
    }

    if (targetId && workspaces.length > 0) {
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
      
      // Expand all nodes in the path and merge any saved expanded nodes
      setExpandedNodes(prev => {
        const next = { ...prev, ...(savedExpanded || {}) };
        if (autoCollapse) {
          path.forEach(nodeId => {
            const current = workspaces.find(w => w.id === nodeId);
            if (current) {
              const parentId = current.parent_workspace_id;
              // Collapse all sibling workspaces at the same level except those in path
              const siblings = workspaces.filter(w => w.parent_workspace_id === parentId);
              siblings.forEach(s => {
                if (s.id !== nodeId && !path.includes(s.id)) {
                  next[s.id] = false;
                }
              });
            }
          });
        }
        // Ensure the expansion path itself is set to true
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
    } else if (!workspaceParam && !restoreHierarchyParam && !savedLastActive && mounted) {
      // Clear expansion state only if no target or restoration state is requested
      setExpandedNodes({});
      autoExpandedPathsRef.current.clear();
    }
  }, [workspaceParam, restoreHierarchyParam, workspaces, autoCollapse, mounted]);

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
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('chandak_hierarchy_expanded_nodes');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });
  
  // Dependency Checks
  const [checkingDependencyId, setCheckingDependencyId] = useState<string | null>(null);
  const [dependencyModal, setDependencyModal] = useState<{
    userId: string;
    userName: string;
    result: import("@/lib/actions/dependencies").DependencyCheckResult;
  } | null>(null);
  const [reassignTargetUserId, setReassignTargetUserId] = useState<string>("");
  const [isReassigning, setIsReassigning] = useState<boolean>(false);

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
      toast.error("Target end date can't be before the start date.");
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
        triggerToast("Workspace updated");
        
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
        triggerToast("Workspace created");
        
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

      const parentWsId = newWS.parent_workspace_id;
      if (parentWsId) {
        setExpandedNodes(prev => ({ ...prev, [parentWsId]: true }));
        try {
          const children = await fetchHierarchyChildren(parentWsId, 'WORKSPACE');
          setMasterHierarchy(curr => {
            const insertChildren = (tree: any[]): any[] => tree.map(node => {
              if (node.id === parentWsId) {
                return { 
                  ...node, 
                  children: HierarchyStateManager.mergePrefetchedChildren(node.children, children), 
                  childrenFetched: true,
                  subworkspace_count: Math.max(node.subworkspace_count || 0, children.filter((c: any) => c.type === 'SUB_WORKSPACE').length)
                };
              }
              if (node.children) return { ...node, children: insertChildren(node.children) };
              return node;
            });
            return insertChildren(curr);
          });
        } catch (e) {
          console.error("Failed to refresh hierarchy children for parent workspace", e);
        }
      }
      
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
      triggerErrorToast("Couldn't save the workspace: " + (err.message || err.details || "please try again."));
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
      // ui-audit-ignore-next-line html-date-input
      start_date: ws.start_date ? new Date(ws.start_date).toISOString().split('T')[0] : "",
      // ui-audit-ignore-next-line html-date-input
      end_date: ws.end_date ? new Date(ws.end_date).toISOString().split('T')[0] : "",
      is_public: !!ws.visibility_settings?.public
    });
    setAssigneeSearch("");
    setAssigneeDropdownOpen(false);
    setWsModalMode('EDIT');
  };

  const handleDeleteWorkspace = (id: string) => {
    setDeleteConfirm({
      open: true,
      type: 'WORKSPACE',
      id,
      title: "Delete this workspace?",
      description: "All tasks, chat messages and timeline history inside it are permanently deleted."
    });
  };

  const executeDeleteWorkspace = async (id: string) => {
    try {
      const res = await deleteWorkspace(id) as any;
      if (res?.error) throw new Error(res.error);
      
      const updatedList = workspaces.filter(w => w.id !== id);
      setWorkspaces(updatedList);
      triggerToast("Workspace deleted");
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
      triggerErrorToast("Couldn't delete the workspace: " + (e.message || e.details || "please try again."));
    }
  };

  const handleDeleteWorkspaceTask = (nodeId: string) => {
    setDeleteConfirm({
      open: true,
      type: 'TASK',
      id: nodeId,
      title: "Delete this task?",
      description: "The task, its checklist and remarks are removed. This can't be undone from here."
    });
  };

  const executeDeleteWorkspaceTask = async (nodeId: string) => {
    try {
      const res = await deleteTask(nodeId);
      if (res?.error) throw new Error(res.error);
      
      triggerToast("Task deleted");
      
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
      triggerErrorToast("Couldn't delete the task: " + (e.message || e.details || "please try again."));
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
      triggerToast("Task created");
      
      // Optimistically insert to list for instant update
      setTasks(prev => [{ ...data, isOptimistic: true }, ...prev]);

      // Refetch full data with relations in background silently
      if (activeWorkspace?.id) {
        fetchTasksByWorkspace(activeWorkspace.id).then(tData => setTasks(tData)).catch(console.error);
      }

      // Refresh the execution hierarchy tree to show the newly created task
      const targetParentId = taskData.parent_task_id || data?.parent_task_id || creatingTaskParentId || creatingTaskWorkspaceId;
      const targetParentType = (taskData.parent_task_id || data?.parent_task_id || creatingTaskParentId) ? 'TASK' : 'WORKSPACE';

      if (targetParentId) {
        setExpandedNodes(prev => ({ ...prev, [targetParentId]: true }));
        try {
          const children = await fetchHierarchyChildren(targetParentId, targetParentType);
          setMasterHierarchy(curr => {
            // W5.1: Bubble the count recursively via HierarchyStateManager
            const { nodes: bubbledNodes } = HierarchyStateManager.bubbleTaskCount(curr, targetParentId, 1);
            
            // W5.2: Inject fetched children using intelligent merge
            const insertChildren = (tree: any[]): any[] => tree.map(node => {
              if (node.id === targetParentId) {
                const merged = HierarchyStateManager.mergePrefetchedChildren(node.children, children);
                return { 
                  ...node, 
                  children: merged, 
                  childrenFetched: true,
                  child_task_count: Math.max(node.child_task_count || 0, merged.length)
                };
              }
              if (node.children) {
                return { ...node, children: insertChildren(node.children) };
              }
              return node;
            });
            return insertChildren(bubbledNodes);
          });
        } catch (e) {
          console.error("Failed to refresh hierarchy children for parent task", e);
        }
      }
      } catch (err: any) {
        console.warn("[Task Creation] Intercepted:", err.message || err);
        if (err.message && err.message.includes("was not found on the server")) {
           window.location.reload();
           return;
        }
        triggerErrorToast("Couldn't create the task: " + (err.message || err.details || "please try again."));
      }
  };

  if (!mounted || permsLoading || loading) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center transition-colors duration-300 ${
        "bg-surface text-foreground"
      }`}>
        <ChandakLoader
          size="lg"
          title="Loading workspaces…"
          subtitle="Fetching workspaces and tasks"
        />
      </div>
    );
  }

  if (!hasPermission("WORKSPACES_VIEW")) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center space-y-4 transition-colors duration-300 ${
        "bg-surface text-foreground"
      }`}>
        <div className="rounded-full bg-warning-soft p-3 text-warning-text">
          <ShieldAlert className="h-6 w-6" aria-hidden />
        </div>
        <h2 className="text-[15px] font-semibold text-heading">You don't have access to workspaces</h2>
        <p className="text-[13px] text-muted">Ask your administrator to grant Workspaces view access in RBAC access policies.</p>
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Workspaces"
        description="Workspaces, sub-workspaces and their tasks in one hierarchy"
        actions={
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto justify-end">
            <div className="relative flex min-w-[160px] flex-1 items-center sm:w-64 sm:flex-none md:w-72">
              {isSearching
                ? <Loader2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" aria-label="Searching" />
                : <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />}
              <input
                type="search"
                aria-label="Search workspaces and tasks"
                placeholder="Search workspaces and tasks"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full pl-9 pr-8 text-[13.5px]"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted hover:bg-sunken hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            </div>

            <div className="relative shrink-0" ref={filterPopoverRef}>
              <AppButton
                variant="secondary"
                leftIcon={<Filter className="h-4 w-4" />}
                onClick={() => setShowFilters(!showFilters)}
                aria-expanded={showFilters}
                className={cn(showFilters && "border-border-active bg-surface-hover")}
              >
                Filters
                {activeFilterCount > 0 && (
                  <span className="rounded bg-primary px-1.5 text-[11px] leading-[18px] text-primary-foreground tabular">
                    {activeFilterCount}
                  </span>
                )}
              </AppButton>

              {/* Floating Filter Popover (Does NOT take page height) */}
              {showFilters && (
                <div role="dialog" aria-label="Filters" className="absolute right-0 top-full z-[var(--z-popover)] mt-2 max-h-[85vh] w-80 space-y-3.5 overflow-y-auto rounded-[10px] border border-border bg-elevated p-4 text-foreground shadow-lg sm:w-96">
                  <div className="flex items-center justify-between border-b border-border pb-2.5">
                    <span className="text-[14px] font-semibold text-heading">Filters</span>
                    <div className="flex items-center gap-2">
                      {activeFilterCount > 0 && (
                        <button 
                          type="button"
                          onClick={clearFilters}
                          className="text-[12.5px] font-medium text-accent-soft-text hover:underline"
                        >
                          Reset all
                        </button>
                      )}
                      <button 
                        type="button"
                        aria-label="Close filters"
                        onClick={() => setShowFilters(false)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-foreground"
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </div>

                  {/* Quick Toggle: My Assigned Tasks Only */}
                  <button
                    type="button"
                    onClick={() => setFilters(prev => ({ ...prev, myTasksOnly: !prev.myTasksOnly }))}
                    role="switch"
                    aria-checked={filters.myTasksOnly}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md border px-3 py-2 text-[13px] font-medium transition-colors",
                      filters.myTasksOnly ? "border-border-active bg-accent-soft text-accent-soft-text" : "border-border text-foreground hover:bg-surface-hover"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" aria-hidden />
                      Only tasks assigned to me
                    </span>
                    {filters.myTasksOnly && <Check className="h-4 w-4" aria-hidden />}
                  </button>

                  {/* Multi-Selection Filters */}
                  <div className="space-y-3">
                    {/* Scope Multi-Select */}
                    <WorkspaceFilterMultiSelect
                      label="Level"
                      placeholder="All levels"
                      options={scopeOptions}
                      selectedIds={filters.entityTypes && filters.entityTypes.length > 0 ? filters.entityTypes : (filters.entityType && filters.entityType !== 'ALL' ? [filters.entityType] : [])}
                      onChange={(ids) => {
                        if (ids.length === 0 || ids.length === scopeOptions.length) {
                          setFilters(prev => ({ ...prev, entityType: 'ALL', entityTypes: [] }));
                        } else {
                          setFilters(prev => ({
                            ...prev,
                            entityType: ids.length === 1 ? ids[0] as any : undefined,
                            entityTypes: ids as any[]
                          }));
                        }
                      }}
                      isOpen={openDropdown === 'scope'}
                      onToggle={() => setOpenDropdown(prev => prev === 'scope' ? null : 'scope')}
                      onClose={() => setOpenDropdown(null)}
                    />

                    {/* Workspace Multi-Select */}
                    {workspaceOptions.length > 0 && (
                      <WorkspaceFilterMultiSelect
                        label="Workspace"
                        placeholder="All workspaces"
                        options={workspaceOptions}
                        selectedIds={filters.workspaceIds || (filters.workspaceId ? [filters.workspaceId] : [])}
                        onChange={(ids) => setFilters(prev => ({ ...prev, workspaceIds: ids, workspaceId: ids.length === 1 ? ids[0] : '' }))}
                        isOpen={openDropdown === 'workspace'}
                        onToggle={() => setOpenDropdown(prev => prev === 'workspace' ? null : 'workspace')}
                        onClose={() => setOpenDropdown(null)}
                      />
                    )}

                    {/* Sub-workspace Multi-Select */}
                    {subWorkspaceOptions.length > 0 && (
                      <WorkspaceFilterMultiSelect
                        label="Sub-workspace"
                        placeholder="All sub-workspaces"
                        options={subWorkspaceOptions}
                        selectedIds={filters.subWorkspaceIds || (filters.subWorkspaceId ? [filters.subWorkspaceId] : [])}
                        onChange={(ids) => setFilters(prev => ({ ...prev, subWorkspaceIds: ids, subWorkspaceId: ids.length === 1 ? ids[0] : '' }))}
                        isOpen={openDropdown === 'subworkspace'}
                        onToggle={() => setOpenDropdown(prev => prev === 'subworkspace' ? null : 'subworkspace')}
                        onClose={() => setOpenDropdown(null)}
                      />
                    )}

                    {/* Company Multi-Select */}
                    {companyOptions.length > 1 && (
                      <WorkspaceFilterMultiSelect
                        label="Company"
                        placeholder="All companies"
                        options={companyOptions}
                        selectedIds={filters.companyIds || (filters.companyId ? [filters.companyId] : [])}
                        onChange={(ids) => setFilters(prev => ({ ...prev, companyIds: ids, companyId: ids.length === 1 ? ids[0] : '' }))}
                        isOpen={openDropdown === 'company'}
                        onToggle={() => setOpenDropdown(prev => prev === 'company' ? null : 'company')}
                        onClose={() => setOpenDropdown(null)}
                      />
                    )}

                    {/* Status Multi-Select */}
                    <WorkspaceFilterMultiSelect
                      label="Status"
                      placeholder="All statuses"
                      options={statusOptions}
                      selectedIds={filters.statusIds || (filters.statusId ? [filters.statusId] : [])}
                      onChange={(ids) => setFilters(prev => ({ ...prev, statusIds: ids, statusId: ids.length === 1 ? ids[0] : '' }))}
                      isOpen={openDropdown === 'status'}
                      onToggle={() => setOpenDropdown(prev => prev === 'status' ? null : 'status')}
                      onClose={() => setOpenDropdown(null)}
                    />

                    {/* Priority Multi-Select */}
                    <WorkspaceFilterMultiSelect
                      label="Priority"
                      placeholder="All priorities"
                      options={priorityOptions}
                      selectedIds={filters.priorityIds || (filters.priorityId ? [filters.priorityId] : [])}
                      onChange={(ids) => setFilters(prev => ({ ...prev, priorityIds: ids, priorityId: ids.length === 1 ? ids[0] : '' }))}
                      isOpen={openDropdown === 'priority'}
                      onToggle={() => setOpenDropdown(prev => prev === 'priority' ? null : 'priority')}
                      onClose={() => setOpenDropdown(null)}
                    />

                    {/* Assignee Multi-Select */}
                    <WorkspaceFilterMultiSelect
                      label="Assignee"
                      placeholder="All assignees"
                      options={assigneeOptions}
                      selectedIds={filters.assigneeIds || (filters.assigneeId ? [filters.assigneeId] : [])}
                      onChange={(ids) => setFilters(prev => ({ ...prev, assigneeIds: ids, assigneeId: ids.length === 1 ? ids[0] : '' }))}
                      isOpen={openDropdown === 'assignee'}
                      onToggle={() => setOpenDropdown(prev => prev === 'assignee' ? null : 'assignee')}
                      onClose={() => setOpenDropdown(null)}
                    />
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-end">
                    <AppButton
                      variant="secondary"
                      onClick={() => setShowFilters(false)}
                      className="w-full"
                    >
                      Done
                    </AppButton>
                  </div>
                </div>
              )}
            </div>

            <AppButton
              variant="ghost"
              leftIcon={<FileSpreadsheet className="h-4 w-4" />}
              onClick={() => router.push("/migration")}
              className="shrink-0 whitespace-nowrap"
              title="Import workspaces and tasks from Excel"
              aria-label="Import workspaces and tasks from Excel"
            >
              <span className="hidden sm:inline">Import</span>
            </AppButton>

            <SavedFiltersDropdown
              savedFilters={savedFilters}
              activeSavedFilterId={activeSavedFilterId}
              onSaveCurrent={handleSaveCurrentFilter}
              onApplyFilter={applyFilter}
              onDeleteFilter={deleteSavedFilter}
              align="end"
            />
            
            <AppButton
              variant="primary"
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
              className="shrink-0 whitespace-nowrap"
            >
              New workspace
            </AppButton>
          </div>
        }
      />

      {/* Scope: segmented control (same pattern as Workspace tasks) */}
      <div className="theme-card-structural mb-4 flex flex-wrap items-center gap-2 p-3">
        <span className="theme-label mr-1">Scope</span>
        <div className="inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-lg border border-border bg-sunken p-0.5" role="radiogroup" aria-label="Scope">
          {(isSuperAdmin || !isManager) && (
            <button
              type="button"
              role="radio"
              aria-checked={hierarchyScope === "all" && selectedDepartmentName === "ALL" && !filters.myTasksOnly}
              onClick={() => {
                setHierarchyScope("all");
                setSelectedDepartmentName("ALL");
                setFilters(prev => ({ ...prev, myTasksOnly: false, assigneeId: '', assigneeIds: [] }));
              }}
              className={cn(SEG_BTN, hierarchyScope === "all" && selectedDepartmentName === "ALL" && !filters.myTasksOnly ? SEG_ON : SEG_OFF)}
            >
              <Globe className="h-3.5 w-3.5" aria-hidden /> Entire organisation
            </button>
          )}

          {isManager && (
            <button
              type="button"
              role="radio"
              aria-checked={hierarchyScope === "my_reports"}
              onClick={() => {
                setHierarchyScope("my_reports");
                setSelectedDepartmentName("ALL");
                setFilters(prev => ({ ...prev, myTasksOnly: false }));
              }}
              className={cn(SEG_BTN, hierarchyScope === "my_reports" ? SEG_ON : SEG_OFF)}
            >
              <Users className="h-3.5 w-3.5" aria-hidden /> My reporting tree
              <span className="rounded bg-sunken px-1 text-[11.5px] text-muted tabular" title="People in your reporting tree">{userScope?.subordinateUserIds?.length || 0}</span>
            </button>
          )}

          {(managedDepts.length > 0 || userScope?.primaryDepartmentName) && (
            <button
              type="button"
              role="radio"
              aria-checked={hierarchyScope === "my_dept" && selectedDepartmentName === "ALL"}
              onClick={() => {
                setHierarchyScope("my_dept");
                setSelectedDepartmentName("ALL");
                setFilters(prev => ({ ...prev, myTasksOnly: false }));
              }}
              className={cn(SEG_BTN, hierarchyScope === "my_dept" ? SEG_ON : SEG_OFF)}
            >
              <Building2 className="h-3.5 w-3.5" aria-hidden />
              {managedDepts.length > 1
                ? "My departments"
                : `My department · ${userScope?.primaryDepartmentName || "General"}`}
            </button>
          )}

          <button
            type="button"
            role="radio"
            aria-checked={hierarchyScope === "assigned_me" || filters.myTasksOnly}
            onClick={() => {
              setHierarchyScope("assigned_me");
              setSelectedDepartmentName("ALL");
              setFilters(prev => ({ ...prev, myTasksOnly: true }));
            }}
            className={cn(SEG_BTN, hierarchyScope === "assigned_me" || filters.myTasksOnly ? SEG_ON : SEG_OFF)}
          >
            <UserCheck className="h-3.5 w-3.5" aria-hidden /> Assigned to me
          </button>
        </div>

        {managedDepts.length > 1 && (
          <label className="relative inline-flex items-center">
            <span className="sr-only">Department</span>
            <select
              value={selectedDepartmentName}
              onChange={(e) => {
                setSelectedDepartmentName(e.target.value);
                setHierarchyScope("my_dept");
              }}
              className="h-8 appearance-none pl-3 pr-8 text-[13px]"
            >
              <option value="ALL">All my departments ({managedDepts.length})</option>
              {managedDepts.map((d: any) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-muted" aria-hidden />
          </label>
        )}

        {savedFilters.length > 0 && (
          <div className="ml-auto inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-sunken p-0.5 no-scrollbar" role="radiogroup" aria-label="Saved filters">
            {savedFilters.map(f => (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={activeSavedFilterId === f.id}
                onClick={() => applyFilter(f)}
                className={cn(SEG_BTN, activeSavedFilterId === f.id ? "bg-accent-soft font-semibold text-accent-soft-text" : SEG_OFF)}
              >
                {f.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active Filter Chips Strip (Ultra-compact, takes minimal height ~28px) */}
      {activeFilterCount > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 px-1" aria-label="Active filters">
          <span className="mr-1 text-[12.5px] text-muted">Filtered by</span>

          {/* Scope Chips */}
          {filters.entityTypes && filters.entityTypes.length > 0 ? (
            filters.entityTypes.map(scopeType => (
              <span key={scopeType} className={CHIP}>
                Level: {scopeLabel(scopeType)}
                <button
                  type="button"
                  aria-label="Remove level filter"
                  onClick={() => toggleScope(scopeType)}
                  className={CHIP_X}
                  title="Remove level filter"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            ))
          ) : (filters.entityType && filters.entityType !== 'ALL' && (
            <span className={CHIP}>
              Level: {scopeLabel(filters.entityType)}
              <button
                type="button"
                aria-label="Remove level filter"
                onClick={() => setFilters(p => ({ ...p, entityType: 'ALL', entityTypes: [] }))}
                className={CHIP_X}
                title="Remove level filter"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))}

          {/* Workspace Chips */}
          {(filters.workspaceIds && filters.workspaceIds.length > 0
            ? filters.workspaceIds
            : (filters.workspaceId ? [filters.workspaceId] : [])
          ).map(wId => {
            const wsObj = workspaces.find((w: any) => w.id === wId);
            const wsName = wsObj?.name || wsObj?.workspace_name || 'Workspace';
            return (
              <span key={wId} className={CHIP}>
                Workspace: {wsName}
                <button
                  type="button"
                  aria-label="Remove workspace filter"
                  onClick={() => setFilters(p => {
                    const currentIds = p.workspaceIds && p.workspaceIds.length > 0 ? p.workspaceIds : (p.workspaceId ? [p.workspaceId] : []);
                    const next = currentIds.filter(id => id !== wId);
                    return { ...p, workspaceIds: next, workspaceId: next.length === 1 ? next[0] : '' };
                  })}
                  className={CHIP_X}
                  title="Remove workspace filter"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            );
          })}

          {/* Sub-workspace Chips */}
          {(filters.subWorkspaceIds && filters.subWorkspaceIds.length > 0
            ? filters.subWorkspaceIds
            : (filters.subWorkspaceId ? [filters.subWorkspaceId] : [])
          ).map(swId => {
            const swObj = workspaces.find((w: any) => w.id === swId);
            const swName = swObj?.name || swObj?.workspace_name || 'Sub-workspace';
            return (
              <span key={swId} className={CHIP}>
                Sub-workspace: {swName}
                <button
                  type="button"
                  aria-label="Remove sub-workspace filter"
                  onClick={() => setFilters(p => {
                    const currentIds = p.subWorkspaceIds && p.subWorkspaceIds.length > 0 ? p.subWorkspaceIds : (p.subWorkspaceId ? [p.subWorkspaceId] : []);
                    const next = currentIds.filter(id => id !== swId);
                    return { ...p, subWorkspaceIds: next, subWorkspaceId: next.length === 1 ? next[0] : '' };
                  })}
                  className={CHIP_X}
                  title="Remove sub-workspace filter"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            );
          })}

          {/* Company Chips */}
          {(filters.companyIds && filters.companyIds.length > 0
            ? filters.companyIds
            : (filters.companyId ? [filters.companyId] : [])
          ).map(cId => {
            const compObj = companies.find((c: any) => c.id === cId);
            const compName = compObj?.name || compObj?.company_name || 'Company';
            return (
              <span key={cId} className={CHIP}>
                Company: {compName}
                <button
                  type="button"
                  aria-label="Remove company filter"
                  onClick={() => setFilters(p => {
                    const currentIds = p.companyIds && p.companyIds.length > 0 ? p.companyIds : (p.companyId ? [p.companyId] : []);
                    const next = currentIds.filter(id => id !== cId);
                    return { ...p, companyIds: next, companyId: next.length === 1 ? next[0] : '' };
                  })}
                  className={CHIP_X}
                  title="Remove company filter"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            );
          })}

          {/* My Assigned Tasks Only */}
          {filters.myTasksOnly && (
            <span className={CHIP}>
              Assigned to me
              <button
                type="button"
                aria-label="Remove my tasks filter"
                onClick={() => setFilters(p => ({ ...p, myTasksOnly: false }))}
                className={CHIP_X}
                title="Remove filter"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          )}

          {/* Status Chips */}
          {(filters.statusIds && filters.statusIds.length > 0
            ? filters.statusIds
            : (filters.statusId ? [filters.statusId] : [])
          ).map(sId => {
            const statusObj = taskStatuses.find((s: any) => s.id === sId);
            const statusName = statusObj?.name || statusObj?.status_name || 'Status';
            return (
              <span key={sId} className={CHIP}>
                {statusObj?.status_color && (
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: statusObj.status_color }} />
                )}
                Status: {statusName}
                <button
                  type="button"
                  aria-label="Remove status filter"
                  onClick={() => setFilters(p => {
                    const currentIds = p.statusIds && p.statusIds.length > 0 ? p.statusIds : (p.statusId ? [p.statusId] : []);
                    const next = currentIds.filter(id => id !== sId);
                    return { ...p, statusIds: next, statusId: next.length === 1 ? next[0] : '' };
                  })}
                  className={CHIP_X}
                  title="Remove status filter"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            );
          })}

          {/* Priority Chips */}
          {(filters.priorityIds && filters.priorityIds.length > 0
            ? filters.priorityIds
            : (filters.priorityId ? [filters.priorityId] : [])
          ).map(pId => {
            const prioObj = priorities.find((p: any) => p.id === pId);
            const prioName = prioObj?.name || prioObj?.priority_name || 'Priority';
            return (
              <span key={pId} className={CHIP}>
                {prioObj?.priority_color && (
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: prioObj.priority_color }} />
                )}
                Priority: {prioName}
                <button
                  type="button"
                  aria-label="Remove priority filter"
                  onClick={() => setFilters(p => {
                    const currentIds = p.priorityIds && p.priorityIds.length > 0 ? p.priorityIds : (p.priorityId ? [p.priorityId] : []);
                    const next = currentIds.filter(id => id !== pId);
                    return { ...p, priorityIds: next, priorityId: next.length === 1 ? next[0] : '' };
                  })}
                  className={CHIP_X}
                  title="Remove priority filter"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            );
          })}

          {/* Assignee Chips */}
          {(filters.assigneeIds && filters.assigneeIds.length > 0
            ? filters.assigneeIds
            : (filters.assigneeId ? [filters.assigneeId] : [])
          ).map(aId => {
            const userObj = allUsers.find((u: any) => u.id === aId);
            const userName = userObj?.full_name || 'User';
            return (
              <span key={aId} className={CHIP}>
                Assignee: {userName}
                <button
                  type="button"
                  aria-label="Remove assignee filter"
                  onClick={() => setFilters(p => {
                    const currentIds = p.assigneeIds && p.assigneeIds.length > 0 ? p.assigneeIds : (p.assigneeId ? [p.assigneeId] : []);
                    const next = currentIds.filter(id => id !== aId);
                    return { ...p, assigneeIds: next, assigneeId: next.length === 1 ? next[0] : '' };
                  })}
                  className={CHIP_X}
                  title="Remove assignee filter"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            );
          })}

          <button
            type="button"
            onClick={clearFilters}
            className="ml-2 text-[12.5px] font-medium text-accent-soft-text hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Full Width Master Table Layout */}
      {workspaces.length > 0 ? (
        <div className="w-full flex flex-col pb-8">
            
            {/* Hierarchical Task Matrix */}
            <div className="theme-card-structural flex flex-col">
              <div className="flex flex-col justify-between gap-2.5 border-b border-border px-3 py-2.5 sm:flex-row sm:items-center">
                <div className="inline-flex gap-0.5 rounded-lg border border-border bg-sunken p-0.5" role="radiogroup" aria-label="View">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={activeView === 'HIERARCHY'}
                    onClick={() => setActiveView('HIERARCHY')}
                    className={cn(SEG_BTN, activeView === 'HIERARCHY' ? SEG_ON : SEG_OFF)}
                  >
                    <GitMerge className="h-3.5 w-3.5" aria-hidden />
                    Hierarchy
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={activeView === 'SPRINTS'}
                    onClick={() => setActiveView('SPRINTS')}
                    className={cn(SEG_BTN, activeView === 'SPRINTS' ? SEG_ON : SEG_OFF)}
                  >
                    <Calendar className="h-3.5 w-3.5" aria-hidden />
                    Sprint planning
                  </button>
                </div>

                {activeView === 'HIERARCHY' && (
                  <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                    <label className="flex cursor-pointer items-center gap-2 text-[13px] text-subtle">
                      <input
                        type="checkbox"
                        checked={autoCollapse}
                        onChange={e => setAutoCollapse(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <span className="whitespace-nowrap">Collapse other branches</span>
                    </label>
                    <div className="flex items-center gap-0.5">
                      <div className="mx-1 h-5 w-px bg-border" aria-hidden></div>
                      <AppButton
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleExpandAllBranches}
                        disabled={isExpandingAll}
                        className="text-muted hover:text-foreground"
                        title="Expand all"
                        aria-label="Expand all branches"
                      >
                        {isExpandingAll ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ChevronsUpDown className="h-4 w-4" />
                        )}
                      </AppButton>

                      <AppButton
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleCollapseAllBranches}
                        className="text-muted hover:text-foreground"
                        title="Collapse all"
                        aria-label="Collapse all branches"
                      >
                        <ChevronsDownUp className="h-4 w-4" />
                      </AppButton>
                    </div>
                  </div>
                )}
              </div>

              {activeView === 'HIERARCHY' ? (
                <div className="w-full">
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
                <div className="w-full min-h-[600px] overflow-hidden">
                  <SprintBoard workspaceId={activeWorkspace?.id || workspaces[0]?.id} currentUser={currentUser} />
                </div>
              )}
            </div>
        </div>
      ) : (
        <div className="theme-card-structural">
          <EmptyState
            title="No workspaces yet"
            description={hasPermission("WORKSPACES_CREATE") ? "Create a workspace to start organising tasks." : "You haven't been added to a workspace yet. Ask a workspace owner to add you."}
            action={hasPermission("WORKSPACES_CREATE") ? (
              <AppButton variant="secondary" onClick={() => setWsModalMode('ROOT')} leftIcon={<FolderKanban className="h-4 w-4" />}>
                Create workspace
              </AppButton>
            ) : undefined}
          />
        </div>
      )}

      {/* Creation Overlays */}
      <SidePeekDrawer
        isOpen={wsModalMode !== null}
        onClose={() => { setWsModalMode(null); setEditWSId(null); }}
        title={wsModalMode === 'EDIT' ? "Edit workspace" : (wsModalMode === 'SUB' ? "New sub-workspace" : "New workspace")}
        width="lg"
      >
        <div className="flex flex-col h-full">
          <div className="flex-1 space-y-7 overflow-y-auto p-6">
            
            {/* Section 1: Workspace Identity */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <Building2 className="h-4 w-4 text-muted" aria-hidden />
                <h3 className={SECTION_TITLE}>Details</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-1.5">
                  <label className={FIELD_LABEL}>Company <span className="text-danger-text" aria-hidden>*</span></label>
                  <select 
                    className="h-9 w-full px-3 text-[13.5px]"
                    value={newWS.company_id}
                    onChange={e => setNewWS({...newWS, company_id: e.target.value})}
                  >
                    <option value="" disabled>Select a company</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className={FIELD_LABEL}>Name <span className="text-danger-text" aria-hidden>*</span></label>
                  <AppInput disabled={!!editWSId} placeholder="e.g. Q4 Platform Migration" value={newWS.name || ""} onChange={e => setNewWS({...newWS, name: e.target.value})} className="h-9 text-[13.5px]" />
                </div>
                <div className="space-y-1.5">
                  <label className={FIELD_LABEL}>Code</label>
                  <AppInput disabled placeholder="Generated when you save" value={editWSId ? (newWS.code || "") : "Generated when you save"} className="h-9 text-[13.5px]" />
                </div>
              </div>

              {(wsModalMode === 'SUB' || (wsModalMode === 'EDIT' && newWS.parent_workspace_id)) && (
                <div className="grid grid-cols-1">
                  <div className="space-y-1.5">
                    <label className={FIELD_LABEL}>Parent workspace</label>
                    <select 
                      className="h-9 w-full px-3 text-[13.5px]"
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
                      <option value="" disabled>Select a parent workspace</option>
                      {workspaces.filter(w => w.id !== editWSId).map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Timeline & Objectives */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <Target className="h-4 w-4 text-muted" aria-hidden />
                <h3 className={SECTION_TITLE}>Timeline and objective</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className={FIELD_LABEL}>Start date</label>
                  {/* ui-audit-ignore-next-line html-date-input */}
                  <AppInput type="date" min={new Date().toISOString().split('T')[0]} value={newWS.start_date} onChange={e => setNewWS({...newWS, start_date: e.target.value})} className="h-9 text-[13.5px]" />
                </div>
                <div className="space-y-1.5">
                  <label className={FIELD_LABEL}>Target end date</label>
                  {/* ui-audit-ignore-next-line html-date-input */}
                  <AppInput type="date" min={newWS.start_date || new Date().toISOString().split('T')[0]} value={newWS.end_date} onChange={e => setNewWS({...newWS, end_date: e.target.value})} className="h-9 text-[13.5px]" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={FIELD_LABEL}>Objective</label>
                <textarea
                  className="min-h-24 w-full resize-y px-3 py-2 text-[13.5px]"
                  placeholder="What this workspace should achieve, and any constraints"
                  value={newWS.description}
                  onChange={e => setNewWS({...newWS, description: e.target.value})}
                />
              </div>
            </div>

            {/* Section 3: Access & Security */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <ShieldCheck className="h-4 w-4 text-muted" aria-hidden />
                <h3 className={SECTION_TITLE}>Access and people</h3>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className={FIELD_LABEL}>Members</label>
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
                    className="h-7 px-2 text-[12.5px] text-accent-soft-text"
                  >
                    {newWS.assigneeIds.length === availableUsers.length && availableUsers.length > 0 ? "Clear all" : "Select all"}
                  </AppButton>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
                  <input
                    type="search"
                    aria-label="Search people"
                    placeholder="Search people"
                    value={assigneeSearch} 
                    onChange={e => setAssigneeSearch(e.target.value)} 
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                    className="h-9 w-full pl-8 pr-3 text-[13.5px]"
                  />
                </div>

                <div className="max-h-[200px] overflow-y-auto rounded-md border border-border bg-surface p-1">
                  {availableUsers.filter(u => u.full_name?.toLowerCase().includes(assigneeSearch.toLowerCase()) || u.user_code?.toLowerCase().includes(assigneeSearch.toLowerCase())).map(u => (
                    <label key={u.id} className="flex cursor-pointer items-center gap-3 rounded-md p-1.5 text-[13.5px] hover:bg-surface-hover">
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
                        className="h-4 w-4"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="flex items-center gap-2 truncate text-[13.5px] text-foreground">
                          {u.full_name}
                          {checkingDependencyId === u.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" aria-label="Checking assignments" />}
                        </span>
                      </div>
                    </label>
                  ))}
                  {availableUsers.length === 0 && <p className="p-3 text-center text-[13px] text-muted">No people to add.</p>}
                </div>
              </div>

              <div className={cn("flex items-start gap-3 rounded-md border p-3 transition-colors", newWS.is_public ? "border-border-active bg-accent-soft" : "border-border bg-surface")}>
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
                  className="mt-0.5 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="is_public" className="cursor-pointer flex flex-col">
                  <span className="text-[13.5px] font-medium text-foreground">Visible to everyone</span>
                  <span className="text-[12.5px] text-muted">Anyone signed in can view and join this workspace.</span>
                </label>
              </div>
            </div>

          </div>
          
          <div className="flex justify-end gap-2 border-t border-border px-6 py-3">
            <AppButton variant="ghost" onClick={() => { setWsModalMode(null); setEditWSId(null); }} disabled={isSubmitting}>Cancel</AppButton>
            <AppButton variant="primary" onClick={handleCreateWorkspace} disabled={isSubmitting} isLoading={isSubmitting}>
              {isSubmitting ? "Saving…" : (editWSId ? "Save changes" : (wsModalMode === 'SUB' ? "Create sub-workspace" : "Create workspace"))}
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
            const parentId = creatingTaskParentId;
            await handleTaskWizardSuccess({ 
              ...newTask, 
              workspace_id: wsId, 
              parent_task_id: newTask.parent_task_id || parentId || null 
            });
            setCreatingTaskWorkspaceId(null);
            setCreatingTaskParentId(null);
          }}
        />
      )}

      {/* Toast Notification */}
      {successToast && (
        <div role="status" className="fixed bottom-6 right-6 z-[var(--z-toast)] flex max-w-sm items-center gap-2 rounded-[10px] border border-border border-l-[3px] border-l-success bg-elevated px-4 py-3 text-foreground shadow-lg">
          <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />
          <span className="text-[13.5px]">{successToast}</span>
        </div>
      )}
      {errorToast && (
        <div role="alert" className="fixed bottom-6 right-6 z-[var(--z-toast)] flex max-w-sm items-center gap-2 rounded-[10px] border border-border border-l-[3px] border-l-danger bg-elevated px-4 py-3 text-foreground shadow-lg">
          <ShieldAlert className="h-4 w-4 shrink-0 text-danger" aria-hidden />
          <span className="text-[13.5px]">{errorToast}</span>
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
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-[var(--overlay)] p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="dep-modal-title" className={MODAL_CARD}>
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-warning-soft text-warning-text">
                  {dependencyModal.result.type === 'executive' ? (
                    <ShieldAlert className="h-4 w-4" aria-hidden />
                  ) : (
                    <ShieldCheck className="h-4 w-4" aria-hidden />
                  )}
                </span>
                <h3 id="dep-modal-title" className="text-[15px] font-semibold text-heading">
                  {dependencyModal.result.type === 'executive' ? `Reassign ${dependencyModal.userName}'s tasks first` : `Remove ${dependencyModal.userName}?`}
                </h3>
              </div>
            </div>
            
            <div className="space-y-4 p-5">
              <p className="text-[13.5px] leading-relaxed text-foreground">
                <strong className="font-semibold">{dependencyModal.userName}</strong> still has active work in this workspace:
              </p>
              
              <ul className="max-h-36 space-y-1 overflow-y-auto rounded-md border border-border bg-sunken p-3 text-[13px]">
                {dependencyModal.result.blockingItems.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-0.5 text-muted" aria-hidden>•</span>
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              
              <div className="rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-[12.5px] text-warning-text">
                {dependencyModal.result.message}
              </div>

              {dependencyModal.result.type === 'executive' && (
                <div className="space-y-1.5 pt-2">
                  <label className={FIELD_LABEL}>
                    Hand their tasks to <span className="text-danger-text" aria-hidden>*</span>
                  </label>
                  <select
                    value={reassignTargetUserId}
                    onChange={e => setReassignTargetUserId(e.target.value)}
                    className="h-9 w-full px-3 text-[13.5px]"
                  >
                    <option value="">Select a person</option>
                    {availableUsers
                      .filter(u => u.id !== dependencyModal.userId && !u.is_deleted)
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.full_name} ({u.user_code || u.email || 'Member'})
                        </option>
                      ))}
                  </select>
                  <p className="text-[12.5px] text-muted">
                    Their tasks, sub-tasks, checklists and tickets move to this person.
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
              <AppButton
                variant="ghost"
                onClick={() => {
                  setDependencyModal(null);
                  setReassignTargetUserId("");
                }}
              >
                Cancel
              </AppButton>

              {dependencyModal.result.type === 'executive' ? (
                <AppButton 
                  variant="primary" 
                  disabled={!reassignTargetUserId || isReassigning}
                  onClick={async () => {
                    if (!reassignTargetUserId || !editWSId) return;
                    try {
                      setIsReassigning(true);
                      const { reassignAndRemoveWorkspaceUser } = await import("@/lib/actions/dependencies");
                      const res = await reassignAndRemoveWorkspaceUser(editWSId, dependencyModal.userId, reassignTargetUserId);
                      if (res.error) throw new Error(res.error);
                      
                      // Update workspace assignees state: remove old user, add new user if not present
                      setNewWS(prev => ({
                        ...prev,
                        assigneeIds: Array.from(new Set([...prev.assigneeIds.filter(id => id !== dependencyModal.userId), reassignTargetUserId]))
                      }));
                      
                      const targetUser = availableUsers.find(u => u.id === reassignTargetUserId);
                      triggerToast(`Tasks moved to ${targetUser?.full_name || 'the new person'}. ${dependencyModal.userName} removed.`);
                      setDependencyModal(null);
                      setReassignTargetUserId("");
                    } catch (err: any) {
                      toast.error(err.message || "Couldn't reassign the tasks. Try again.");
                    } finally {
                      setIsReassigning(false);
                    }
                  }}
                >
                  {isReassigning ? "Reassigning…" : "Reassign and remove"}
                </AppButton>
              ) : (
                <AppButton
                  variant="destructive"
                  onClick={() => {
                    // Safe to remove watcher
                    setNewWS({
                      ...newWS,
                      assigneeIds: newWS.assigneeIds.filter(id => id !== dependencyModal.userId)
                    });
                    setDependencyModal(null);
                  }}
                >
                  Remove {dependencyModal.userName}
                </AppButton>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Role Assignment Modal */}
      {userRoleModal && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-[var(--overlay)] p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="role-modal-title" className={cn(MODAL_CARD, "flex max-h-[80vh] flex-col")}>
            <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
              <h3 id="role-modal-title" className="text-[15px] font-semibold text-heading">Add {userRoleModal.userName}</h3>
              <button 
                type="button" 
                aria-label="Close role assignment modal"
                onClick={() => { setUserRoleModal(null); setStagedTaskRoles({}); }} 
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {userRoleModal.step === 'choice' ? (
                <div className="space-y-4">
                  <p className="text-[13.5px] leading-relaxed text-foreground">
                    Should {userRoleModal.userName} only watch this workspace, or work on specific tasks?
                  </p>
                  
                  <div className="mt-4 flex flex-col gap-2">
                    <AppButton
                      variant="secondary"
                      className="h-auto justify-start px-4 py-3 text-left"
                      onClick={() => {
                        setNewWS({...newWS, assigneeIds: [...newWS.assigneeIds, userRoleModal.userId]});
                        setUserRoleModal(null);
                      }}
                    >
                      <div>
                        <div className="text-[13.5px] font-semibold text-foreground">Watcher only</div>
                        <div className="mt-0.5 text-[12.5px] font-normal text-muted">Add them to the workspace without assigning tasks.</div>
                      </div>
                    </AppButton>
                    
                    <AppButton
                      variant="secondary"
                      className="h-auto justify-start px-4 py-3 text-left"
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
                        <div className="text-[13.5px] font-semibold text-foreground">Assign to tasks</div>
                        <div className="mt-0.5 text-[12.5px] font-normal text-muted">Choose tasks where they're the primary owner or an executor.</div>
                      </div>
                    </AppButton>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-[13.5px] leading-relaxed text-foreground">
                    Choose a role for <strong className="font-semibold">{userRoleModal.userName}</strong> on each task:
                  </p>
                  
                  {fetchingTasksForRole ? (
                    <div className="flex items-center justify-center p-8 text-muted">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
                      <span className="text-[13.5px]">Loading tasks…</span>
                    </div>
                  ) : workspaceTasksForRole.length === 0 ? (
                    <div className="rounded-md border border-border bg-sunken p-6 text-center text-[13.5px] text-muted">
                      This workspace has no active tasks yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {workspaceTasksForRole.map(task => (
                        <div key={task.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface p-3">
                          <div className="min-w-0 truncate text-[13.5px] text-foreground" title={task.title}>{task.title}</div>
                          <div className="flex items-center gap-2">
                            <select
                              aria-label={`Role on ${task.title}`}
                              className="h-8 px-2 text-[13px]"
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
                              <option value="primary">Primary owner</option>
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
              <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-3">
                <AppButton 
                  variant="ghost" 
                  onClick={() => setUserRoleModal({ ...userRoleModal, step: 'choice' })}
                  disabled={isAssigningTasks}
                >
                  Back
                </AppButton>
                <AppButton
                  variant="primary"
                  isLoading={isAssigningTasks}
                  disabled={isAssigningTasks|| (workspaceTasksForRole.length > 0 && Object.keys(stagedTaskRoles).length === 0)}
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
                          toast.success(`${userRoleModal.userName} added to ${assignments.length} ${assignments.length === 1 ? "task" : "tasks"}`);
                        }
                      } catch (err) {
                        console.error(err);
                        toast.error("Couldn't add them to the tasks. Try again.");
                      } finally {
                        setIsAssigningTasks(false);
                      }
                    }
                    
                    setNewWS({...newWS, assigneeIds: [...newWS.assigneeIds, userRoleModal.userId]});
                    setUserRoleModal(null);
                    setStagedTaskRoles({});
                  }}
                >
                  {isAssigningTasks ? "Saving…" : "Save assignments"}
                </AppButton>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (!deleteConfirm) return;
          const { type, id } = deleteConfirm;
          setDeleteConfirm(null);
          if (type === 'WORKSPACE') {
            await executeDeleteWorkspace(id);
          } else {
            await executeDeleteWorkspaceTask(id);
          }
        }}
        title={deleteConfirm?.title || "Delete this item?"}
        description={deleteConfirm?.description || "This can't be undone from here."}
        confirmLabel="Delete"
        tone="danger"
      />

    </PageContainer>
  );
}

