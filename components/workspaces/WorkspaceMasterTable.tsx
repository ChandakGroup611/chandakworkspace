"use client";

import React, { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, ExternalLink, Edit2, Share2, Trash2, MoreVertical, Folder, FolderTree, CheckSquare, CornerDownRight, CheckCircle2, CircleDashed, Paperclip, Eye } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { StatusBadge, PriorityIndicator, formatDate, formatDateTime } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/feedback/States";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const MENU_ITEM = "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] text-foreground hover:bg-surface-hover";
const ICON_BTN = "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";
/** Entity tile colours: workspaces carry the theme accent, everything else stays neutral. */
const TYPE_TILE: Record<string, string> = { WORKSPACE: "bg-accent-soft text-accent-soft-text", SUB_WORKSPACE: "bg-sunken text-subtle", TASK: "bg-sunken text-subtle", SUB_TASK: "bg-sunken text-muted" };
const TYPE_LABEL: Record<string, string> = { WORKSPACE: "Workspace", SUB_WORKSPACE: "Sub-workspace", TASK: "Task", SUB_TASK: "Sub-task" };
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";

export function WorkspaceMasterTable({ 
  hierarchy, 
  isLightMode,
  taskStatuses = [],
  allUsers = [],
  onlineUsers = new Set(),
  presenceMap = new Map(),
  onOpenTask,
  onOpenWorkspace,
  onShareNode,
  onDeleteNode,
  onCreateSubWorkspace,
  onCreateTask,
  onExpandNode,
  onPrefetchNode,
  expandedNodes,
  setExpandedNodes,
  autoCollapse = true,
  forceExpandAll = false,
  searchQuery = ""
}: { 
  hierarchy: any[]; 
  isLightMode: boolean;
  taskStatuses?: any[];
  allUsers?: any[];
  onlineUsers?: Set<string>;
  presenceMap?: Map<string, any>;
  onOpenTask: (node: any) => void;
  onOpenWorkspace: (workspace: any) => void;
  onShareNode?: (node: any) => void;
  onDeleteNode?: (node: any) => void;
  onCreateSubWorkspace?: (node: any) => void;
  onCreateTask?: (node: any) => void;
  onExpandNode?: (node: any) => Promise<void>;
  onPrefetchNode?: (node: any) => void;
  expandedNodes: Record<string, boolean>;
  setExpandedNodes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  autoCollapse?: boolean;
  forceExpandAll?: boolean;
  searchQuery?: string;
}) {
  const { hasPermission, roleCode, userId } = usePermissions();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const router = useRouter();

  // Close active dropdown menu when clicking outside
  useEffect(() => {
    if (!activeMenu) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown-menu="true"]')) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [activeMenu]);

  const [loadingNodes, setLoadingNodes] = useState<Record<string, boolean>>({});

  const usersMap = React.useMemo(() => {
    const map = new Map<string, any>();
    if (allUsers) {
      for (const u of allUsers) {
        map.set(u.id, u);
      }
    }
    return map;
  }, [allUsers]);

  const saveHierarchySessionState = (targetNodeId: string, customExpanded?: Record<string, boolean>) => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('chandak_hierarchy_expanded_nodes', JSON.stringify(customExpanded || expandedNodes));
        sessionStorage.setItem('chandak_hierarchy_last_active_id', targetNodeId);
      } catch (err) {}
    }
  };

  const toggleNode = async (node: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const id = node.id;
    const isExpanded = !!expandedNodes[id];
    
    if (!isExpanded && onExpandNode && !node.childrenFetched) {
      setLoadingNodes(prev => ({ ...prev, [id]: true }));
      try {
        await onExpandNode(node);
      } finally {
        setLoadingNodes(prev => ({ ...prev, [id]: false }));
      }
    }

    if (!isExpanded && autoCollapse) {
      // Find siblings to collapse
      const findSiblings = (nodes: any[], targetId: string): any[] | null => {
        for (const n of nodes) {
          if (n.id === targetId) return nodes;
          if (n.children && n.children.length > 0) {
            const found = findSiblings(n.children, targetId);
            if (found) return found;
          }
        }
        return null;
      };

      const siblings = findSiblings(hierarchy, id);
      if (siblings) {
        setExpandedNodes(prev => {
          const next = { ...prev };
          siblings.forEach(s => {
            if (s.id !== id) next[s.id] = false;
          });
          next[id] = true;
          saveHierarchySessionState(id, next);
          return next;
        });
        return;
      }
    }
    
    setExpandedNodes(prev => {
      const next = { ...prev, [id]: !prev[id] };
      saveHierarchySessionState(id, next);
      return next;
    });
  };

  const getStatusColor = (node: any) => {
    return node.status?.status_color || node.status?.color || "var(--text-muted)";
  };

  const getStatusName = (node: any) => {
    if (node.status?.status_name) return node.status.status_name;
    if (node.status?.name) return node.status.name;
    if (node.status_name) return node.status_name;
    if (node.status_id) return "Active";
    return "Unknown";
  };

  const getPriorityInfo = (node: any) => {
    const name = node.priority?.priority_name || node.priority?.name || node.priority_name;
    const color = node.priority?.priority_color || node.priority?.color || "var(--warning)";
    return name ? { name, color } : null;
  };

  const getUserName = (userId: string) => {
    const user = usersMap.get(userId);
    return user ? user.full_name : "System";
  };

  const gridCols = 'minmax(360px, 4.5fr) minmax(110px, 1fr) minmax(76px, 0.8fr) minmax(76px, 0.8fr) minmax(88px, 0.8fr) minmax(80px, 0.8fr) minmax(190px, 1.3fr) 108px';

  const renderAvatarGroup = (members: any[], title: string, fallbackText: string = "None") => {
    if (!members || members.length === 0) {
      return (
        <span className="select-none text-[12.5px] text-muted">
          {fallbackText === "None" ? "—" : fallbackText}
        </span>
      );
    }

    const firstMember = members[0];
    const uId = firstMember.user_id || firstMember.id;
    const uObj = usersMap.get(uId);
    const name = uObj?.full_name || firstMember.name || "User";
    const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2);
    const count = members.length;
    const isOnline = onlineUsers.has(uId);

    return (
      <div className="flex items-center gap-1.5" title={`${title}: ${members.map((m: any) => {
        const id = m.user_id || m.id;
        return usersMap.get(id)?.full_name || m.name || id;
      }).join(", ")}`}>
        <div className="relative">
          <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-[10.5px] font-semibold text-accent-soft-text">
            {uObj?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={uObj.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          {isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-success ring-2 ring-surface" aria-label="Online" />
          )}
        </div>
        {count > 1 && (
          <span className="rounded-full bg-sunken px-1.5 text-[11.5px] font-medium leading-5 text-subtle tabular">
            +{count - 1}
          </span>
        )}
      </div>
    );
  };

  const renderHierarchyRow = (node: any, parentNode: any, depth: number, isExpanded: boolean) => {
    const hasChildren = node.children && node.children.length > 0;
    const isWorkspaceType = node.type === 'WORKSPACE' || node.type === 'SUB_WORKSPACE';
    const isTask = node.type === 'TASK' || node.type === 'SUB_TASK';

    let TypeIcon = Folder;
    if (node.type === 'WORKSPACE') TypeIcon = Folder;
    else if (node.type === 'SUB_WORKSPACE') TypeIcon = FolderTree;
    else if (node.type === 'TASK') TypeIcon = CheckSquare;
    else if (node.type === 'SUB_TASK') TypeIcon = CheckCircle2;

    const childrenList = Array.isArray(node.children) ? node.children : [];
    const hasLoadedChildren = childrenList.some((c: any) => c && !c.is_deleted);

    let totalTaskCount = Number(node.total_hierarchy_task_count) || 0;
    let directTaskCount = Number(node.direct_task_count) || 0;
    let subWsCount = Number(node.subworkspace_count) || 0;
    let childTaskCount = Number(node.child_task_count) || ((Array.isArray(node.subtasks) ? Number(node.subtasks[0]?.count) : Number(node.subtasks?.count)) || 0);

    if (childrenList.length > 0) {
      const activeTaskCount = childrenList.filter((c: any) => c && !c.is_deleted && (c.type === 'TASK' || c.type === 'SUB_TASK')).length;
      childTaskCount = Math.max(childTaskCount, activeTaskCount);
      if (isWorkspaceType && node.childrenFetched) {
        subWsCount = Math.max(subWsCount, childrenList.filter((c: any) => c && !c.is_deleted && (c.type === 'SUB_WORKSPACE' || c.type === 'WORKSPACE')).length);
        directTaskCount = Math.max(directTaskCount, activeTaskCount);
      }
    }

    const canExpand = isWorkspaceType 
      ? (subWsCount > 0 || directTaskCount > 0 || totalTaskCount > 0 || hasLoadedChildren)
      : (childTaskCount > 0 || hasLoadedChildren);

    const creatorId = node.created_by || node.owner_id || node.workspace_owner_id;
    const fullDate = formatDateTime(node.created_at);
    const shortDate = formatDate(node.created_at);
    const priority = isTask ? getPriorityInfo(node) : null;
    const statusName = getStatusName(node);
    const statusColor = getStatusColor(node);

    const isWorkspaceOwner = node.owner_id === userId || node.created_by === userId || node.workspace_owner_id === userId;
    const isTaskOwner = node.created_by === userId || node.owner_user_id === userId || node.assigned_to === userId || node.assignee_id === userId || (node.task_assignees && node.task_assignees.some((a: any) => a.id === userId));

    const canCreateWs = roleCode === 'SUPER_ADMIN' || isWorkspaceOwner || hasPermission('WORKSPACES_CREATE') || hasPermission('WORKSPACES_MANAGE');
    const canCreateTsk = roleCode === 'SUPER_ADMIN' || isWorkspaceOwner || isTaskOwner || hasPermission('TASKS_CREATE') || hasPermission('TASKS_MANAGE');
    const canEditNode = roleCode === 'SUPER_ADMIN' || (isWorkspaceType ? (isWorkspaceOwner || hasPermission('WORKSPACES_UPDATE') || hasPermission('WORKSPACES_MANAGE')) : (isTaskOwner || (isWorkspaceOwner && hasPermission('TASKS_MANAGE'))));
    const canShare = isWorkspaceType && (roleCode === 'SUPER_ADMIN' || isWorkspaceOwner || hasPermission('WORKSPACES_UPDATE') || hasPermission('WORKSPACES_MANAGE'));
    const canDelete = roleCode === 'SUPER_ADMIN' || (isWorkspaceType ? (isWorkspaceOwner || hasPermission('WORKSPACES_DELETE') || hasPermission('WORKSPACES_MANAGE')) : ((isTaskOwner || isWorkspaceOwner) && hasPermission('TASKS_DELETE')));

    const isMenuOpen = activeMenu === node.id;

    return (
      <div 
        onClick={(e) => {
          e.stopPropagation();
          const target = e.target as HTMLElement;
          const isInteractive = target.closest('button, a, input, select, [role="button"], [data-dropdown-menu="true"]');
          
          if (!isInteractive) {
            saveHierarchySessionState(node.id);
            if (isWorkspaceType) {
              router.push(`/workspaces/tasks?workspaceId=${node.id}`);
            } else {
              router.push(`/tasks/${node.id}`);
            }
          }
        }}
        onMouseEnter={() => {
          if (onPrefetchNode) onPrefetchNode(node);
        }}
        data-matched={node.isMatched ? "true" : undefined}
        className={cn(
          "group relative grid min-h-[46px] cursor-pointer select-none items-center border-b border-border transition-colors hover:bg-surface-hover",
          isMenuOpen ? "z-[3]" : "z-0",
          node.isMatched && "bg-accent-soft/50"
        )}
        style={{ gridTemplateColumns: gridCols }}
      >
          {/* VS Code Style Guide Lines for Nested Items */}
          {depth > 0 && Array.from({ length: depth }).map((_, i) => {
            const isLast = i === depth - 1;
            const guideLineColor = isLast ? "border-border-active" : "border-border";

            return (
              <div 
                key={i}
                className={`pointer-events-none absolute bottom-0 top-0 border-l ${guideLineColor}`}
                style={{ left: `${(i * 24) + 16}px` }}
              />
            );
          })}

          {/* Column 1: Tree Hierarchy + Entity Name */}
          <div 
            className="relative z-[1] flex min-w-0 items-start px-4 py-2.5 pr-2"
            style={{ paddingLeft: `${Math.max(16, depth * 24 + 16)}px` }}
            title={node.subject || node.name || 'Untitled Entity'}
          >
            <div className="flex items-start gap-2 min-w-0 flex-1">
              {/* Expand Toggle */}
              <button
                type="button"
                onClick={(e) => canExpand ? toggleNode(node, e) : undefined}
                tabIndex={canExpand ? 0 : -1}
                aria-hidden={!canExpand}
                aria-expanded={canExpand ? isExpanded : undefined}
                aria-label={canExpand ? `${isExpanded ? "Collapse" : "Expand"} ${node.subject || node.name || "item"}` : undefined}
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors",
                  canExpand ? "text-muted hover:bg-sunken hover:text-foreground" : "pointer-events-none opacity-0"
                )}
              >
                {loadingNodes[node.id] ? (
                  <CircleDashed className="h-4 w-4 animate-spin text-muted" aria-label="Loading" />
                ) : (
                  <ChevronRight className={cn("h-4 w-4 transition-transform duration-150", isExpanded && "rotate-90 text-foreground")} aria-hidden />
                )}
              </button>

              {/* Entity Icon */}
              <div className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md", TYPE_TILE[node.type] || TYPE_TILE.TASK)} title={TYPE_LABEL[node.type]}>
                <TypeIcon className="h-3.5 w-3.5" aria-label={TYPE_LABEL[node.type]} />
              </div>

              {/* Text Info */}
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span 
                    className={cn("whitespace-normal break-words leading-snug text-foreground", isWorkspaceType ? "text-[13.5px] font-semibold" : "text-[13.5px] font-medium")}
                    title={node.subject || node.name || 'Untitled Entity'}
                  >
                    {node.subject || node.name || 'Untitled Entity'}
                  </span>
                  
                  {isTask && (
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={statusName === "Unknown" ? null : statusName} size="sm" />
                      {priority && <PriorityIndicator priority={priority.name} className="text-[12.5px] text-subtle" />}
                    </div>
                  )}

                  {node.attachmentCount > 0 && (
                    <span className="inline-flex shrink-0 items-center gap-1 text-[12px] text-muted tabular" title={`${node.attachmentCount} attachment(s)`}>
                      <Paperclip className="h-3.5 w-3.5" aria-hidden /> {node.attachmentCount}
                    </span>
                  )}
                </div>

                {isWorkspaceType && (
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        saveHierarchySessionState(node.id);
                        router.push(`/workspaces/tasks?workspaceId=${node.id}`);
                      }}
                      className="text-[12px] text-accent-soft-text hover:underline tabular"
                      title={`${directTaskCount} directly in this workspace, ${childTaskCount} in sub-items`}
                    >
                      {totalTaskCount} {totalTaskCount === 1 ? "task" : "tasks"}
                      <span className="text-muted"> · {directTaskCount} direct</span>
                    </button>
                  </div>
                )}
                {!isWorkspaceType && childTaskCount > 0 && (
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        saveHierarchySessionState(node.id);
                        router.push(`/tasks/${node.id}`);
                      }}
                      className="text-[12px] text-accent-soft-text hover:underline tabular"
                    >
                      {childTaskCount} {childTaskCount === 1 ? "sub-task" : "sub-tasks"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Created Date */}
          <div className="whitespace-nowrap px-3 py-2 text-[13px] text-subtle tabular" title={fullDate}>
            {shortDate}
          </div>

          {/* Creator */}
          <div className="flex items-center px-3 py-2">
            {renderAvatarGroup(creatorId ? [{ id: creatorId }] : [], "Creator", "System")}
          </div>

          {/* Owner */}
          <div className="flex items-center px-3 py-2">
            {renderAvatarGroup(
              isWorkspaceType 
                ? (node.owner_id ? [{ id: node.owner_id }] : (node.workspace_owner_id ? [{ id: node.workspace_owner_id }] : (node.members?.filter((m: any) => m.role === 'OWNER') || [])))
                : (node.owner_id ? [{ id: node.owner_id }] : []),
              "Owner", "None"
            )}
          </div>

          {/* Executives */}
          <div className="flex items-center px-3 py-2">
            {renderAvatarGroup(
              isWorkspaceType 
                ? (node.members?.filter((m: any) => m.role === 'EXECUTOR') || [])
                : (node.assignees?.filter((m: any) => m.participation_role === 'EXECUTOR') || (node.assigned_to ? [{ id: node.assigned_to }] : [])),
              "Executives", "None"
            )}
          </div>

          {/* Watchers */}
          <div className="flex items-center px-3 py-2">
            {renderAvatarGroup(
              isWorkspaceType 
                ? (node.members?.filter((m: any) => m.role === 'WATCHER') || [])
                : (node.assignees?.filter((m: any) => m.participation_role === 'WATCHER') || []),
              "Watchers", "None"
            )}
          </div>

          {/* Create Sub-Items */}
          <div className="py-2 px-2">
            <div className="flex items-center gap-1 whitespace-nowrap">
              {isWorkspaceType && onCreateSubWorkspace && canCreateWs && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onCreateSubWorkspace(node); }}
                  className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12.5px] font-medium text-subtle hover:bg-sunken hover:text-foreground"
                  title="Add a sub-workspace"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden /> Sub-workspace
                </button>
              )}
              {onCreateTask && canCreateTsk && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onCreateTask(node); }}
                  className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12.5px] font-medium text-subtle hover:bg-sunken hover:text-foreground"
                  title={isWorkspaceType ? "Add a task" : "Add a sub-task"}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden /> {isWorkspaceType ? "Task" : "Sub-task"}
                </button>
              )}
            </div>
          </div>

          {/* Sticky Actions Column - Pinned on Right so it never scrolls off */}
          <div className={cn(
            "sticky right-0 flex items-center justify-end gap-0.5 self-stretch whitespace-nowrap bg-surface px-2 py-1 shadow-[inset_1px_0_0_var(--border-subtle)] group-hover:bg-surface-hover",
            node.isMatched && "bg-accent-soft",
            isMenuOpen ? "z-[3]" : "z-[2]"
          )}>
            {isTask && onOpenTask && (
              <AppButton 
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenTask(node);
                }}
                className="h-7 w-7 p-0 text-muted hover:bg-sunken hover:text-foreground"
                title="Quick view"
                aria-label={`Quick view ${node.subject || node.name || "task"}`}
              >
                <Eye className="h-4 w-4" />
              </AppButton>
            )}

            {isWorkspaceType && (
              <AppButton 
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/workspaces/tasks?workspaceId=${node.id}`);
                }}
                className="h-7 w-7 p-0 text-muted hover:bg-sunken hover:text-foreground"
                title="Open task list"
                aria-label={`Open task list for ${node.subject || node.name || "workspace"}`}
              >
                <ExternalLink className="h-4 w-4" />
              </AppButton>
            )}

            {/* Context Menu for Edit / Share / Delete */}
            <div className="relative" data-dropdown-menu="true">
              <AppButton
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenu(prev => prev === node.id ? null : node.id);
                }}
                className={cn("h-7 w-7 p-0", isMenuOpen ? "bg-sunken text-foreground" : "text-muted hover:bg-sunken hover:text-foreground")}
                title="More actions"
                aria-label="More actions"
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
              >
                <MoreVertical className="h-4 w-4" />
              </AppButton>

              {isMenuOpen && (
                <div 
                  data-dropdown-menu="true"
                  role="menu"
                  className="absolute right-0 top-full z-[var(--z-popover)] mt-1 w-52 rounded-[10px] border border-border bg-elevated p-1 shadow-lg"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  {canEditNode && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(null);
                        if (isWorkspaceType) onOpenWorkspace(node);
                        else if (onOpenTask) onOpenTask(node);
                        else router.push(`/tasks/${node.id}`);
                      }}
                      role="menuitem"
                      className={MENU_ITEM}
                    >
                      <Edit2 className="h-4 w-4 text-muted" aria-hidden />
                      <span>{isWorkspaceType ? 'Edit workspace' : 'Edit task'}</span>
                    </button>
                  )}

                  {onShareNode && canShare && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(null);
                        onShareNode(node);
                      }}
                      role="menuitem"
                      className={MENU_ITEM}
                    >
                      <Share2 className="h-4 w-4 text-muted" aria-hidden />
                      <span>Transfer workspace</span>
                    </button>
                  )}

                  {onDeleteNode && canDelete && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(null);
                        onDeleteNode(node);
                      }}
                      role="menuitem"
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] text-danger-text hover:bg-danger-soft"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
    );
  };

  const renderMobileRow = (node: any, parentNode: any, depth: number, isExpanded: boolean) => {
    const hasChildren = node.children && node.children.length > 0;
    const isWorkspaceType = node.type === 'WORKSPACE' || node.type === 'SUB_WORKSPACE';
    const isTask = node.type === 'TASK' || node.type === 'SUB_TASK';

    let TypeIcon = Folder;
    if (node.type === 'WORKSPACE') TypeIcon = Folder;
    else if (node.type === 'SUB_WORKSPACE') TypeIcon = FolderTree;
    else if (node.type === 'TASK') TypeIcon = CheckSquare;
    else if (node.type === 'SUB_TASK') TypeIcon = CheckCircle2;

    const childrenList = Array.isArray(node.children) ? node.children : [];
    const hasLoadedChildren = childrenList.some((c: any) => c && !c.is_deleted);

    let totalTaskCount = Number(node.total_hierarchy_task_count) || 0;
    let directTaskCount = Number(node.direct_task_count) || 0;
    let subWsCount = Number(node.subworkspace_count) || 0;
    let childTaskCount = Number(node.child_task_count) || ((Array.isArray(node.subtasks) ? Number(node.subtasks[0]?.count) : Number(node.subtasks?.count)) || 0);

    if (childrenList.length > 0) {
      const activeTaskCount = childrenList.filter((c: any) => c && !c.is_deleted && (c.type === 'TASK' || c.type === 'SUB_TASK')).length;
      childTaskCount = Math.max(childTaskCount, activeTaskCount);
      if (isWorkspaceType && node.childrenFetched) {
        subWsCount = Math.max(subWsCount, childrenList.filter((c: any) => c && !c.is_deleted && (c.type === 'SUB_WORKSPACE' || c.type === 'WORKSPACE')).length);
        directTaskCount = Math.max(directTaskCount, activeTaskCount);
      }
    }

    const canExpand = isWorkspaceType 
      ? (subWsCount > 0 || directTaskCount > 0 || totalTaskCount > 0 || hasLoadedChildren)
      : (childTaskCount > 0 || hasLoadedChildren);

    const shortDate = formatDate(node.created_at);
    const statusName = getStatusName(node);
    const statusColor = getStatusColor(node);
    const priority = isTask ? getPriorityInfo(node) : null;
    const menuKey = `mobile-${node.id}`;
    const isMenuOpen = activeMenu === menuKey;

    const isWorkspaceOwner = node.owner_id === userId || node.created_by === userId || node.workspace_owner_id === userId;
    const isTaskOwner = node.created_by === userId || node.owner_user_id === userId || node.assigned_to === userId || node.assignee_id === userId || (node.task_assignees && node.task_assignees.some((a: any) => a.id === userId));

    const canCreateWs = roleCode === 'SUPER_ADMIN' || isWorkspaceOwner || hasPermission('WORKSPACES_CREATE') || hasPermission('WORKSPACES_MANAGE');
    const canCreateTsk = roleCode === 'SUPER_ADMIN' || isWorkspaceOwner || isTaskOwner || hasPermission('TASKS_CREATE') || hasPermission('TASKS_MANAGE');
    const canEditNode = roleCode === 'SUPER_ADMIN' || (isWorkspaceType ? (isWorkspaceOwner || hasPermission('WORKSPACES_UPDATE') || hasPermission('WORKSPACES_MANAGE')) : (isTaskOwner || (isWorkspaceOwner && hasPermission('TASKS_MANAGE'))));
    const canShare = isWorkspaceType && (roleCode === 'SUPER_ADMIN' || isWorkspaceOwner || hasPermission('WORKSPACES_UPDATE') || hasPermission('WORKSPACES_MANAGE'));
    const canDelete = roleCode === 'SUPER_ADMIN' || (isWorkspaceType ? (isWorkspaceOwner || hasPermission('WORKSPACES_DELETE') || hasPermission('WORKSPACES_MANAGE')) : ((isTaskOwner || isWorkspaceOwner) && hasPermission('TASKS_DELETE')));

    return (
      <div 
        key={node.id}
        className={cn("theme-card-structural mb-2 select-none p-3 transition-[border-color] hover:border-border-active", isMenuOpen ? "relative z-[3]" : "relative z-[1]")}
        style={{ marginLeft: `${Math.min(depth * 14, 42)}px` }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            {canExpand ? (
              <button 
                type="button"
                onClick={(e) => toggleNode(node, e)}
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sunken text-muted hover:text-foreground"
                aria-label={isExpanded ? "Collapse" : "Expand"}
                aria-expanded={isExpanded}
              >
                {loadingNodes[node.id] ? (
                  <CircleDashed className="h-4 w-4 animate-spin" aria-label="Loading" />
                ) : (
                  <ChevronRight className={cn("h-4 w-4 transition-transform duration-150", isExpanded && "rotate-90 text-foreground")} aria-hidden />
                )}
              </button>
            ) : (
              <div className="w-2 h-7 shrink-0" />
            )}

            <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md", TYPE_TILE[node.type] || TYPE_TILE.TASK)}>
              <TypeIcon className="h-4 w-4" aria-label={TYPE_LABEL[node.type]} />
            </div>

            {/* ui-audit-ignore-next-line title area opens the item; the ⋮ menu also offers Open */}
            <div
              className="min-w-0 flex-1 cursor-pointer"
              onClick={() => {
                saveHierarchySessionState(node.id);
                if (isWorkspaceType) router.push(`/workspaces/tasks?workspaceId=${node.id}`);
                else if (onOpenTask) onOpenTask(node);
                else router.push(`/tasks/${node.id}`);
              }}
            >
              <h4 
                className="whitespace-normal break-words text-[14px] font-semibold leading-snug text-foreground"
                title={node.subject || node.name || 'Untitled Entity'}
              >
                {node.subject || node.name || 'Untitled Entity'}
              </h4>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {isWorkspaceType && (
                  <span className="text-[12.5px] text-muted tabular">
                    {totalTaskCount} {totalTaskCount === 1 ? "task" : "tasks"} · {directTaskCount} direct
                  </span>
                )}
                {isTask && (
                  <>
                    <StatusBadge status={statusName === "Unknown" ? null : statusName} size="sm" />
                    {priority && <PriorityIndicator priority={priority.name} className="text-[12.5px]" />}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="relative shrink-0" data-dropdown-menu="true">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenu(prev => prev === menuKey ? null : menuKey);
              }}
              className={cn(ICON_BTN, "h-8 w-8", isMenuOpen && "bg-surface-hover text-foreground")}
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {isMenuOpen && (
              <div 
                data-dropdown-menu="true"
                role="menu"
                className="absolute right-0 top-full z-[var(--z-popover)] mt-1 w-52 rounded-[10px] border border-border bg-elevated p-1 shadow-lg"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenu(null);
                    if (isWorkspaceType) router.push(`/workspaces/tasks?workspaceId=${node.id}`);
                    else if (onOpenTask) onOpenTask(node);
                    else router.push(`/tasks/${node.id}`);
                  }}
                  role="menuitem"
                  className={MENU_ITEM}
                >
                  <Eye className="h-4 w-4 text-muted" aria-hidden />
                  <span>Open</span>
                </button>
                {canEditNode && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(null);
                      if (isWorkspaceType) onOpenWorkspace(node);
                      else if (onOpenTask) onOpenTask(node);
                      else router.push(`/tasks/${node.id}`);
                    }}
                    role="menuitem"
                  className={MENU_ITEM}
                  >
                    <Edit2 className="h-4 w-4 text-muted" aria-hidden />
                    <span>{isWorkspaceType ? 'Edit workspace' : 'Edit task'}</span>
                  </button>
                )}
                {onShareNode && canShare && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(null);
                      onShareNode(node);
                    }}
                    role="menuitem"
                    className={MENU_ITEM}
                  >
                    <Share2 className="h-4 w-4 text-muted" aria-hidden />
                    <span>Transfer workspace</span>
                  </button>
                )}
                {onDeleteNode && canDelete && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(null);
                      onDeleteNode(node);
                    }}
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] text-danger-text hover:bg-danger-soft"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border pt-2">
          <span className="text-[12px] text-muted">Created {shortDate}</span>
          <div className="flex items-center gap-1.5">
            {isWorkspaceType && onCreateSubWorkspace && canCreateWs && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onCreateSubWorkspace(node); }}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-surface px-2.5 text-[12.5px] font-medium text-foreground hover:bg-surface-hover"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden /> Sub-workspace
              </button>
            )}
            {onCreateTask && canCreateTsk && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onCreateTask(node); }}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-surface px-2.5 text-[12.5px] font-medium text-foreground hover:bg-surface-hover"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden /> {isWorkspaceType ? "Task" : "Sub-task"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTree = (nodes: any[], depth = 0, parentNode: any = null) => {
    return nodes.map((node) => {
      const isActuallyExpanded = forceExpandAll || !!expandedNodes[node.id];
      return (
        <React.Fragment key={node.id}>
          {renderHierarchyRow(node, parentNode, depth, isActuallyExpanded)}
          {isActuallyExpanded && Array.isArray(node.children) && node.children.length > 0 && (
            <div className="flex flex-col">
              {renderTree(node.children, depth + 1, node)}
            </div>
          )}
        </React.Fragment>
      );
    });
  };

  const renderMobileTree = (nodes: any[], depth = 0, parentNode: any = null) => {
    return nodes.map((node) => {
      const isActuallyExpanded = forceExpandAll || !!expandedNodes[node.id];
      return (
        <React.Fragment key={node.id}>
          {renderMobileRow(node, parentNode, depth, isActuallyExpanded)}
          {isActuallyExpanded && Array.isArray(node.children) && node.children.length > 0 && (
            <div className="flex flex-col">
              {renderMobileTree(node.children, depth + 1, node)}
            </div>
          )}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="relative w-full">
      <div className="block lg:hidden w-full pb-8">
        {hierarchy.length > 0 ? (
          renderMobileTree(hierarchy)
        ) : (
          <EmptyState kind="no-results" compact title="Nothing to show here" description="No workspaces or tasks match this scope and these filters." />
        )}
      </div>

      <div className="hidden w-full overflow-x-auto lg:block">
        <div className="w-full flex flex-col min-w-[1040px]">
          <div 
            className="sticky top-0 z-[var(--z-sticky)] grid items-center border-b border-border bg-sunken text-[12px] font-semibold text-subtle"
            style={{ gridTemplateColumns: gridCols }}
          >
            <div className="px-4 py-2.5 pl-[72px]">Name</div>
            <div className="px-3 py-2.5">Created</div>
            <div className="px-3 py-2.5">Creator</div>
            <div className="px-3 py-2.5">Owner</div>
            <div className="px-3 py-2.5">Executives</div>
            <div className="px-3 py-2.5">Watchers</div>
            <div className="px-3 py-2.5">Add</div>
            <div className="sticky right-0 z-[1] bg-sunken px-3 py-2.5 text-right shadow-[inset_1px_0_0_var(--border-subtle)]">Actions</div>
          </div>

          <div className="flex flex-col">
            {hierarchy.length > 0 ? (
              renderTree(hierarchy)
            ) : (
              <EmptyState kind="no-results" compact title="Nothing to show here" description="No workspaces or tasks match this scope and these filters." />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
