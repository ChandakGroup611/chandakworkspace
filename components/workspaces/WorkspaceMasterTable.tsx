"use client";

import React, { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, ExternalLink, Edit2, Share2, Trash2, MoreVertical, Folder, FolderTree, CheckSquare, CornerDownRight, CheckCircle2, CircleDashed, Paperclip, Eye } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
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
          return next;
        });
        return;
      }
    }
    
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getStatusColor = (node: any) => {
    return node.status?.status_color || node.status?.color || ("#6b7280");
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
    const color = node.priority?.priority_color || node.priority?.color || "#f59e0b";
    return name ? { name, color } : null;
  };

  const getUserName = (userId: string) => {
    const user = usersMap.get(userId);
    return user ? user.full_name : "System";
  };

  const gridCols = 'minmax(360px, 4.5fr) minmax(95px, 1fr) minmax(70px, 0.8fr) minmax(70px, 0.8fr) minmax(70px, 0.8fr) minmax(70px, 0.8fr) minmax(145px, 1.2fr) 85px';

  const renderAvatarGroup = (members: any[], title: string, fallbackText: string = "None") => {
    if (!members || members.length === 0) {
      return (
        <span className="text-[11px] text-muted opacity-40 select-none">
          {fallbackText}
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
          <div className="h-6 w-6 rounded-full bg-theme-btn-primary/10 border border-border flex items-center justify-center text-[9px] font-bold text-theme-icon overflow-hidden">
            {uObj?.avatar_url ? (
              <img src={uObj.avatar_url} alt={name} className="h-full w-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          {isOnline && (
            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-surface" />
          )}
        </div>
        {count > 1 && (
          <span className="text-[10px] font-semibold text-muted bg-surface-hover px-1.5 py-0.5 rounded-full border border-border/50">
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

    let totalTaskCount = node.total_hierarchy_task_count || 0;
    let directTaskCount = node.direct_task_count || 0;
    let childTaskCount = 0;
    let subWsCount = 0;

    if (node.children && node.children.length > 0) {
      childTaskCount = node.children.filter((c: any) => c.type === 'TASK' || c.type === 'SUB_TASK').length;
    }

    if (isWorkspaceType && hasChildren && node.childrenFetched) {
      subWsCount = node.children.filter((c: any) => c.type === 'SUB_WORKSPACE' || c.type === 'WORKSPACE').length;
    }

    const creatorId = node.created_by || node.owner_id || node.workspace_owner_id;
    const fullDate = node.created_at ? new Date(node.created_at).toLocaleString() : '---';
    const shortDate = node.created_at ? new Date(node.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '---';
    const priority = isTask ? getPriorityInfo(node) : null;
    const statusName = getStatusName(node);
    const statusColor = getStatusColor(node);

    const isWorkspaceOwner = node.owner_id === userId || node.created_by === userId || node.workspace_owner_id === userId;
    const isTaskOwner = node.created_by === userId || node.owner_user_id === userId || node.assigned_to === userId || node.assignee_id === userId;

    const canCreateWs = roleCode === 'SUPER_ADMIN' || hasPermission('WORKSPACES_CREATE') || hasPermission('WORKSPACES_MANAGE') || isWorkspaceOwner;
    const canCreateTsk = roleCode === 'SUPER_ADMIN' || hasPermission('TASKS_CREATE') || hasPermission('TASKS_MANAGE') || isWorkspaceOwner || isTaskOwner;
    const canEditNode = roleCode === 'SUPER_ADMIN' || (isWorkspaceType ? (hasPermission('WORKSPACES_UPDATE') || hasPermission('WORKSPACES_MANAGE') || isWorkspaceOwner) : (hasPermission('TASKS_UPDATE') || hasPermission('TASKS_MANAGE') || hasPermission('TASKS_EDIT') || isTaskOwner));
    const canShare = isWorkspaceType && (roleCode === 'SUPER_ADMIN' || hasPermission('WORKSPACES_UPDATE') || hasPermission('WORKSPACES_MANAGE') || isWorkspaceOwner);
    const canDelete = roleCode === 'SUPER_ADMIN' || (isWorkspaceType ? (hasPermission('WORKSPACES_DELETE') || hasPermission('WORKSPACES_MANAGE') || isWorkspaceOwner) : (hasPermission('TASKS_DELETE') || hasPermission('TASKS_MANAGE') || isTaskOwner));

    const isMenuOpen = activeMenu === node.id;

    return (
      <div 
        onClick={(e) => {
          e.stopPropagation();
          const target = e.target as HTMLElement;
          const isInteractive = target.closest('button, a, input, select, [role="button"], [data-dropdown-menu="true"]');
          
          if (!isInteractive) {
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
        className={`theme-table-row grid items-center border-b border-border/40 transition-colors group min-h-[48px] cursor-pointer select-none relative hover:bg-surface/50 ${
          isMenuOpen ? 'z-40' : 'z-0'
        } ${ node.isMatched ? 'bg-theme-btn-primary/5 ring-1 ring-inset ring-theme-btn-primary/30' : '' }`} 
        style={{ gridTemplateColumns: gridCols }}
      >
          {/* VS Code Style Guide Lines for Nested Items */}
          {depth > 0 && Array.from({ length: depth }).map((_, i) => {
            const isLast = i === depth - 1;
            let guideLineColor = "border-border";
            
            if (isLast) {
              if (node.type === 'SUB_WORKSPACE') guideLineColor = "border-theme-icon";
              else if (node.type === 'TASK') guideLineColor = "border-emerald-400";
              else if (node.type === 'SUB_TASK') guideLineColor = "border-amber-400";
            }

            return (
              <div 
                key={i}
                className={`absolute top-0 bottom-0 border-l ${guideLineColor} pointer-events-none opacity-40`}
                style={{ left: `${(i * 24) + 16}px` }}
              />
            );
          })}

          {/* Column 1: Tree Hierarchy + Entity Name */}
          <div 
            className="py-2.5 px-4 flex items-start min-w-0 pr-2 relative z-10" 
            style={{ paddingLeft: `${Math.max(16, depth * 24 + 16)}px` }}
            title={node.subject || node.name || 'Untitled Entity'}
          >
            <div className="flex items-start gap-2 min-w-0 flex-1">
              {/* Expand Toggle */}
              <div 
                onClick={(e) => toggleNode(node, e)}
                className={`h-5 w-5 rounded flex items-center justify-center shrink-0 transition-colors cursor-pointer mt-0.5 ${
                  hasChildren || (isWorkspaceType && subWsCount > 0)
                    ? 'hover:bg-surface-hover text-muted hover:text-foreground' 
                    : 'opacity-0 pointer-events-none'
                }`}
              >
                {loadingNodes[node.id] ? (
                  <CircleDashed className="h-3.5 w-3.5 animate-spin text-theme-icon" />
                ) : isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </div>

              {/* Entity Icon */}
              <div className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 shadow-xs mt-0.5 ${
                node.type === 'WORKSPACE' ? 'bg-theme-btn-primary/10 text-theme-icon' :
                node.type === 'SUB_WORKSPACE' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' :
                node.type === 'TASK' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }`}>
                <TypeIcon className="h-3.5 w-3.5" />
              </div>

              {/* Text Info */}
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span 
                    className="font-semibold text-xs text-foreground break-words whitespace-normal leading-snug group-hover:text-theme-icon transition-colors"
                    title={node.subject || node.name || 'Untitled Entity'}
                  >
                    {node.subject || node.name || 'Untitled Entity'}
                  </span>
                  
                  {isTask && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span 
                        className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none shrink-0"
                        style={{
                          borderColor: `${statusColor}40`,
                          backgroundColor: `${statusColor}15`,
                          color: statusColor
                        }}
                        title={`Status: ${statusName}`}
                      >
                        {statusName}
                      </span>
                      {priority && (
                        <span 
                          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none shrink-0"
                          style={{
                            borderColor: `${priority.color}40`,
                            backgroundColor: `${priority.color}15`,
                            color: priority.color
                          }}
                          title={`Priority: ${priority.name}`}
                        >
                          {priority.name}
                        </span>
                      )}
                    </div>
                  )}

                  {node.attachmentCount > 0 && (
                    <div className="flex items-center justify-center p-0.5 px-1 rounded-md bg-theme-btn-primary/10 text-theme-icon shrink-0" title={`${node.attachmentCount} Attachment(s)`}>
                      <Paperclip className="h-3 w-3" />
                    </div>
                  )}
                </div>

                {isWorkspaceType && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/workspaces/tasks?workspaceId=${node.id}`);
                      }}
                      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded cursor-pointer bg-theme-btn-primary/10 text-theme-icon hover:bg-theme-btn-primary/20 border border-theme-icon/20" 
                      title={`${directTaskCount} Direct, ${childTaskCount} Child`}
                    >
                      {totalTaskCount} Tasks <span className="opacity-75">({directTaskCount} Direct)</span>
                    </span>
                  </div>
                )}
                {!isWorkspaceType && childTaskCount > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/tasks/${node.id}`);
                      }}
                      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded cursor-pointer bg-theme-btn-secondary/10 text-theme-btn-secondary-text hover:bg-theme-btn-secondary/20 border border-theme-btn-secondary-text/20"
                    >
                      {childTaskCount} Sub-Task{childTaskCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Created Date */}
          <div className="py-2 px-3 text-xs text-muted whitespace-nowrap" title={fullDate}>
            {shortDate}
          </div>

          {/* Creator */}
          <div className="py-2 px-2 flex items-center justify-center">
            {renderAvatarGroup(creatorId ? [{ id: creatorId }] : [], "Creator", "System")}
          </div>

          {/* Owner */}
          <div className="py-2 px-2 flex items-center justify-center">
            {renderAvatarGroup(
              isWorkspaceType 
                ? (node.owner_id ? [{ id: node.owner_id }] : (node.workspace_owner_id ? [{ id: node.workspace_owner_id }] : (node.members?.filter((m: any) => m.role === 'OWNER') || [])))
                : (node.owner_id ? [{ id: node.owner_id }] : []),
              "Owner", "None"
            )}
          </div>

          {/* Executives */}
          <div className="py-2 px-2 flex items-center justify-center">
            {renderAvatarGroup(
              isWorkspaceType 
                ? (node.members?.filter((m: any) => m.role === 'EXECUTOR') || [])
                : (node.assignees?.filter((m: any) => m.participation_role === 'EXECUTOR') || (node.assigned_to ? [{ id: node.assigned_to }] : [])),
              "Executives", "None"
            )}
          </div>

          {/* Watchers */}
          <div className="py-2 px-2 flex items-center justify-center">
            {renderAvatarGroup(
              isWorkspaceType 
                ? (node.members?.filter((m: any) => m.role === 'WATCHER') || [])
                : (node.assignees?.filter((m: any) => m.participation_role === 'WATCHER') || []),
              "Watchers", "None"
            )}
          </div>

          {/* Create Sub-Items */}
          <div className="py-2 px-2">
            <div className="flex items-center justify-center gap-1 whitespace-nowrap">
              {isWorkspaceType && onCreateSubWorkspace && canCreateWs && (
                <AppButton
                  variant="outline"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onCreateSubWorkspace(node); }}
                  className="h-6 px-2 text-[9px] font-bold uppercase border-theme-icon/30 text-theme-icon hover:bg-theme-btn-primary/10"
                >
                  + Sub WS
                </AppButton>
              )}
              {onCreateTask && canCreateTsk && (
                <AppButton
                  variant="outline"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onCreateTask(node); }}
                  className="h-6 px-2 text-[9px] font-bold uppercase border-theme-icon/30 text-theme-icon hover:bg-theme-btn-primary/10"
                >
                  {isWorkspaceType ? '+ Task' : '+ Sub'}
                </AppButton>
              )}
            </div>
          </div>

          {/* Sticky Actions Column - Pinned on Right so it never scrolls off */}
          <div className={`sticky right-0 bg-surface/95 dark:bg-[#0B0F19]/95 shadow-[-6px_0_12px_rgba(0,0,0,0.06)] py-1 px-2 flex items-center justify-center gap-1 whitespace-nowrap ${
            isMenuOpen ? 'z-40' : 'z-20'
          }`}>
            {isTask && onOpenTask && (
              <AppButton 
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenTask(node);
                }}
                className="h-7 w-7 p-0 text-muted hover:text-theme-icon hover:bg-surface-hover"
                title="Quick View Details"
              >
                <Eye className="h-3.5 w-3.5" />
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
                className="h-7 w-7 p-0 text-muted hover:text-theme-icon hover:bg-surface-hover"
                title="Open Task List"
              >
                <ExternalLink className="h-3.5 w-3.5" />
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
                className={`h-7 w-7 p-0 transition-colors ${isMenuOpen ? 'bg-surface-hover text-foreground' : 'text-muted hover:text-foreground hover:bg-surface-hover'}`}
                title="More Actions"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </AppButton>

              {isMenuOpen && (
                <div 
                  data-dropdown-menu="true"
                  className="absolute right-0 top-full mt-1 w-48 rounded-xl shadow-2xl border border-border bg-surface dark:bg-[#111827] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
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
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors text-left"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-theme-icon" />
                      <span>{isWorkspaceType ? 'Edit Workspace' : 'Edit Task'}</span>
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
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors text-left"
                    >
                      <Share2 className="h-3.5 w-3.5 text-success" />
                      <span>Transfer Workspace</span>
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
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-danger hover:bg-danger/10 transition-colors text-left"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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

    let totalTaskCount = node.total_hierarchy_task_count || 0;
    let directTaskCount = node.direct_task_count || 0;
    const shortDate = node.created_at ? new Date(node.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '---';
    const statusName = getStatusName(node);
    const statusColor = getStatusColor(node);
    const priority = isTask ? getPriorityInfo(node) : null;
    const menuKey = `mobile-${node.id}`;
    const isMenuOpen = activeMenu === menuKey;

    const isWorkspaceOwner = node.owner_id === userId || node.created_by === userId || node.workspace_owner_id === userId;
    const isTaskOwner = node.created_by === userId || node.owner_user_id === userId || node.assigned_to === userId || node.assignee_id === userId;

    const canCreateWs = roleCode === 'SUPER_ADMIN' || hasPermission('WORKSPACES_CREATE') || hasPermission('WORKSPACES_MANAGE') || isWorkspaceOwner;
    const canCreateTsk = roleCode === 'SUPER_ADMIN' || hasPermission('TASKS_CREATE') || hasPermission('TASKS_MANAGE') || isWorkspaceOwner || isTaskOwner;
    const canEditNode = roleCode === 'SUPER_ADMIN' || (isWorkspaceType ? (hasPermission('WORKSPACES_UPDATE') || hasPermission('WORKSPACES_MANAGE') || isWorkspaceOwner) : (hasPermission('TASKS_UPDATE') || hasPermission('TASKS_MANAGE') || hasPermission('TASKS_EDIT') || isTaskOwner));
    const canShare = isWorkspaceType && (roleCode === 'SUPER_ADMIN' || hasPermission('WORKSPACES_UPDATE') || hasPermission('WORKSPACES_MANAGE') || isWorkspaceOwner);
    const canDelete = roleCode === 'SUPER_ADMIN' || (isWorkspaceType ? (hasPermission('WORKSPACES_DELETE') || hasPermission('WORKSPACES_MANAGE') || isWorkspaceOwner) : (hasPermission('TASKS_DELETE') || hasPermission('TASKS_MANAGE') || isTaskOwner));

    return (
      <div 
        key={node.id}
        className={`mb-2.5 rounded-xl border border-border/60 bg-surface/90 dark:bg-[#111827]/90 p-3 shadow-xs hover:border-theme-btn-primary/40 transition-all select-none ${
          isMenuOpen ? 'relative z-40' : 'relative z-10'
        }`}
        style={{ marginLeft: `${Math.min(depth * 14, 42)}px` }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            {hasChildren ? (
              <button 
                type="button"
                onClick={(e) => toggleNode(node, e)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-muted hover:text-foreground shrink-0 mt-0.5 bg-surface-hover/60 active:scale-95 transition-transform"
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                {loadingNodes[node.id] ? (
                  <CircleDashed className="h-4 w-4 animate-spin text-theme-icon" />
                ) : isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-2 h-7 shrink-0" />
            )}

            <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
              node.type === 'WORKSPACE' ? 'bg-theme-btn-primary/10 text-theme-icon' :
              node.type === 'SUB_WORKSPACE' ? 'bg-purple-500/10 text-purple-600' :
              node.type === 'TASK' ? 'bg-emerald-500/10 text-emerald-600' :
              'bg-amber-500/10 text-amber-600'
            }`}>
              <TypeIcon className="h-4 w-4" />
            </div>

            <div 
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => {
                if (isWorkspaceType) router.push(`/workspaces/tasks?workspaceId=${node.id}`);
                else if (onOpenTask) onOpenTask(node);
                else router.push(`/tasks/${node.id}`);
              }}
            >
              <h4 
                className="text-[13px] font-bold text-foreground break-words whitespace-normal leading-snug hover:text-theme-icon"
                title={node.subject || node.name || 'Untitled Entity'}
              >
                {node.subject || node.name || 'Untitled Entity'}
              </h4>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {isWorkspaceType && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-theme-btn-primary/10 text-theme-icon">
                    {totalTaskCount} Tasks ({directTaskCount} Direct)
                  </span>
                )}
                {isTask && (
                  <>
                    <span 
                      className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border"
                      style={{ borderColor: `${statusColor}40`, backgroundColor: `${statusColor}15`, color: statusColor }}
                    >
                      {statusName}
                    </span>
                    {priority && (
                      <span 
                        className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border"
                        style={{ borderColor: `${priority.color}40`, backgroundColor: `${priority.color}15`, color: priority.color }}
                      >
                        {priority.name}
                      </span>
                    )}
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
              className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors active:scale-95 ${
                isMenuOpen ? 'bg-surface-hover text-foreground' : 'text-muted hover:text-foreground hover:bg-surface-hover'
              }`}
              aria-label="More actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {isMenuOpen && (
              <div 
                data-dropdown-menu="true"
                className="absolute right-0 top-full mt-1.5 w-48 rounded-xl shadow-2xl border border-border bg-surface dark:bg-[#111827] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
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
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors text-left"
                >
                  <Eye className="h-4 w-4 text-theme-icon" />
                  <span>Open Item</span>
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
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors text-left"
                  >
                    <Edit2 className="h-4 w-4 text-purple-500" />
                    <span>{isWorkspaceType ? 'Edit Workspace' : 'Edit Task'}</span>
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
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-success hover:bg-success/10 transition-colors text-left"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>Transfer Workspace</span>
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
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-danger hover:bg-danger/10 transition-colors text-left"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-border/40">
          <span className="text-[10px] text-muted">Created: {shortDate}</span>
          <div className="flex items-center gap-1.5">
            {isWorkspaceType && onCreateSubWorkspace && canCreateWs && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onCreateSubWorkspace(node); }}
                className="h-6 px-2.5 rounded-md text-[10px] font-bold uppercase bg-theme-btn-primary/10 text-theme-icon border border-theme-icon/30 active:scale-95 transition-transform"
              >
                + Sub WS
              </button>
            )}
            {onCreateTask && canCreateTsk && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onCreateTask(node); }}
                className="h-6 px-2.5 rounded-md text-[10px] font-bold uppercase bg-foreground/5 text-foreground border border-border active:scale-95 transition-transform"
              >
                {isWorkspaceType ? '+ Task' : '+ Sub'}
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
          {isActuallyExpanded && node.children && renderTree(node.children, depth + 1, node)}
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
          {isActuallyExpanded && node.children && renderMobileTree(node.children, depth + 1, node)}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="w-full font-sans relative">
      <div className="block lg:hidden w-full pb-8">
        {hierarchy.length > 0 ? (
          renderMobileTree(hierarchy)
        ) : (
          <div className="py-12 text-center text-sm text-muted">
            No Execution Hierarchy Available.
          </div>
        )}
      </div>

      <div className="hidden lg:block w-full overflow-x-auto pb-10">
        <div className="w-full flex flex-col min-w-[1040px]">
          <div 
            className="sticky top-0 z-30 grid items-center text-[11px] tracking-wider font-bold uppercase text-muted border-b border-border bg-surface/95 dark:bg-[#0B0F19]/95 backdrop-blur-md pb-2.5 pt-2.5 mb-1 shadow-xs" 
            style={{ gridTemplateColumns: gridCols }}
          >
            <div className="py-2 px-4 pl-[54px]">Entity Name</div>
            <div className="py-2 px-3">Created Date</div>
            <div className="py-2 px-2 text-center">Creator</div>
            <div className="py-2 px-2 text-center">Owner</div>
            <div className="py-2 px-2 text-center">Executives</div>
            <div className="py-2 px-2 text-center">Watchers</div>
            <div className="py-2 px-2 text-center">Create</div>
            <div className="sticky right-0 bg-surface/95 dark:bg-[#0B0F19]/95 py-2 px-2 text-center z-30 shadow-[-6px_0_12px_rgba(0,0,0,0.06)]">Actions</div>
          </div>

          <div className="flex flex-col">
            {hierarchy.length > 0 ? (
              renderTree(hierarchy)
            ) : (
              <div className="py-12 text-center text-sm text-muted">
                No Execution Hierarchy Available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
