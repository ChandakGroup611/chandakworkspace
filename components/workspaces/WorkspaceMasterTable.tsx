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
  const { hasPermission, roleCode } = usePermissions();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const closeMenu = () => setActiveMenu(null);
    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, []);

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

  const gridCols = 'minmax(320px, 4fr) minmax(95px, 1fr) minmax(70px, 0.8fr) minmax(70px, 0.8fr) minmax(70px, 0.8fr) minmax(70px, 0.8fr) minmax(145px, 1.2fr) 85px';

  const renderAvatarGroup = (members: any[], title: string, fallbackText: string = "None") => {
    if (!members || members.length === 0) return <span className="text-muted text-[10px]">{fallbackText}</span>;

    const displayMembers = members.slice(0, 3);
    const extraCount = members.length - 3;

    return (
      <div className="relative group/avatar inline-flex items-center cursor-pointer">
        <div className="flex -space-x-2">
          {displayMembers.map((m: any, idx: number) => {
            const uid = m.user_id || m.id;
            const uInfo = usersMap.get(uid);
            const isOnline = onlineUsers.has(uid);
            return (
              <div key={idx} className="relative">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold text-[#ffffff] border-2 border-white dark:border-background`} style={{ backgroundColor: uInfo?.profile_photo ? 'transparent' : 'var(--accent-primary, #4f46e5)' }}>
                  {uInfo?.profile_photo ? <img src={uInfo.profile_photo} className="h-full w-full rounded-full object-cover" alt="" /> : (uInfo?.full_name?.substring(0,2).toUpperCase() || "U")}
                </div>
                <div className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-white dark:border-background ${isOnline ? 'bg-success' : 'bg-danger'}`}></div>
              </div>
            );
          })}
          {extraCount > 0 && (
            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold text-[#ffffff] border-2 border-white dark:border-background`} style={{ backgroundColor: 'var(--accent-primary, #4f46e5)' }}>
              +{extraCount}
            </div>
          )}
        </div>

        {/* Hover Tooltip */}
        <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded-lg opacity-0 invisible group-hover/avatar:opacity-100 group-hover/avatar:visible transition-all z-[9999] theme-card-structural shadow-lg border border-border`}>
          <div className="text-[10px] font-bold uppercase text-muted mb-2 px-1 border-b pb-1 border-border">{title} ({members.length})</div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {members.map((m: any, idx: number) => {
              const uid = m.user_id || m.id;
              const uInfo = usersMap.get(uid);
              const isOnline = onlineUsers.has(uid);
              return (
                <div key={idx} className="flex items-center gap-2 p-1 rounded hover:bg-surface/50">
                  <div className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-success shadow-[0_0_4px_#22c55e]' : 'bg-danger shadow-[0_0_4px_#ef4444]'}`} />
                  <span className={`text-[11px] truncate ${isOnline ? "text-foreground font-medium" : "text-muted"}`}>{uInfo?.full_name || 'Unknown User'}</span>
                </div>
              );
            })}
          </div>
        </div>
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
    
    let subWsCount = node.subworkspace_count || 0;
    let directTaskCount = node.direct_task_count || 0;
    let childTaskCount = node.child_task_count || 0;
    let totalTaskCount = node.total_hierarchy_task_count || 0;

    if (isWorkspaceType && hasChildren && node.childrenFetched) {
      subWsCount = node.children.filter((c: any) => c.type === 'SUB_WORKSPACE' || c.type === 'WORKSPACE').length;
    }

    const creatorId = node.created_by || node.owner_id || node.workspace_owner_id;
    const fullDate = node.created_at ? new Date(node.created_at).toLocaleString() : '---';
    const shortDate = node.created_at ? new Date(node.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '---';
    const priority = isTask ? getPriorityInfo(node) : null;
    const statusName = getStatusName(node);
    const statusColor = getStatusColor(node);

    return (
      <div 
        onClick={(e) => {
          e.stopPropagation();
          const target = e.target as HTMLElement;
          const isInteractive = target.closest('button, a, input, select, [role="button"]');
          
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
        className={`theme-table-row grid items-center border-b border-border/40 transition-colors group min-h-[48px] cursor-pointer select-none relative hover:bg-surface/50 ${ node.isMatched ? 'bg-theme-btn-primary/5 ring-1 ring-inset ring-theme-btn-primary/30' : '' }`} 
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
          <div className="py-2 px-4 flex items-center min-w-0 pr-2 relative z-10" style={{ paddingLeft: `${Math.max(16, depth * 24 + 16)}px` }}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Expand Toggle */}
              <div 
                onClick={(e) => toggleNode(node, e)}
                className={`h-5 w-5 rounded flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
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
              <div className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 shadow-xs ${
                node.type === 'WORKSPACE' ? 'bg-theme-btn-primary/10 text-theme-icon' :
                node.type === 'SUB_WORKSPACE' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' :
                node.type === 'TASK' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }`}>
                <TypeIcon className="h-3.5 w-3.5" />
              </div>

              {/* Text Info */}
              <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-foreground truncate group-hover:text-theme-icon transition-colors">
                    {node.subject || node.name || 'Untitled Entity'}
                  </span>
                  
                  {isTask && (
                    <div className="flex items-center gap-1 shrink-0">
                      <span 
                        className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border"
                        style={{ 
                          borderColor: `${statusColor}40`,
                          backgroundColor: `${statusColor}15`,
                          color: statusColor
                        }}
                      >
                        {statusName}
                      </span>

                      {priority && (
                        <span 
                          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border"
                          style={{ 
                            borderColor: `${priority.color}40`,
                            backgroundColor: `${priority.color}15`,
                            color: priority.color
                          }}
                        >
                          {priority.name}
                        </span>
                      )}
                    </div>
                  )}

                  {node.attachmentCount > 0 && (
                    <div className="flex items-center justify-center p-0.5 px-1 rounded-md ml-1 bg-theme-btn-primary/10 text-theme-icon" title={`${node.attachmentCount} Attachment(s)`}>
                      <Paperclip className="h-3 w-3" />
                    </div>
                  )}
                </div>

                {isWorkspaceType && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
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
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
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
              {isWorkspaceType && onCreateSubWorkspace && (roleCode === 'SUPER_ADMIN' || hasPermission('WORKSPACES_CREATE')) && (
                <AppButton
                  variant="outline"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onCreateSubWorkspace(node); }}
                  className="h-6 px-2 text-[9px] font-bold uppercase border-theme-icon/30 text-theme-icon hover:bg-theme-btn-primary/10"
                >
                  + Sub WS
                </AppButton>
              )}
              {onCreateTask && (roleCode === 'SUPER_ADMIN' || hasPermission('TASKS_CREATE')) && (
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
          <div className="sticky right-0 bg-surface/95 dark:bg-[#0B0F19]/95 shadow-[-6px_0_12px_rgba(0,0,0,0.06)] py-1 px-2 flex items-center justify-center gap-1 whitespace-nowrap z-20">
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
            <div className="relative">
              <AppButton
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenu(activeMenu === node.id ? null : node.id);
                }}
                className="h-7 w-7 p-0 text-muted hover:text-foreground hover:bg-surface-hover"
                title="More Actions"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </AppButton>

              {activeMenu === node.id && (
                <div 
                  className="absolute right-0 top-full mt-1 w-44 rounded-xl shadow-xl border border-border bg-surface dark:bg-[#111827] p-1 z-50 animate-in fade-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  {(roleCode === 'SUPER_ADMIN' || (isWorkspaceType ? hasPermission('WORKSPACES_UPDATE') : hasPermission('TASKS_UPDATE'))) && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenu(null);
                        if (isWorkspaceType) onOpenWorkspace(node);
                        else router.push(`/tasks/${node.id}`);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground hover:bg-surface-hover transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-theme-icon" />
                      <span>Edit Details</span>
                    </button>
                  )}

                  {onShareNode && isWorkspaceType && (roleCode === 'SUPER_ADMIN' || hasPermission('WORKSPACES_UPDATE')) && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenu(null);
                        onShareNode(node);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground hover:bg-surface-hover transition-colors"
                    >
                      <Share2 className="h-3.5 w-3.5 text-success" />
                      <span>Transfer Workspace</span>
                    </button>
                  )}

                  {onDeleteNode && (roleCode === 'SUPER_ADMIN' || (isWorkspaceType ? hasPermission('WORKSPACES_DELETE') : hasPermission('TASKS_DELETE'))) && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenu(null);
                        onDeleteNode(node);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-danger hover:bg-danger/10 transition-colors"
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

    return (
      <div 
        key={node.id}
        className="mb-2.5 rounded-xl border border-border/60 bg-surface/80 dark:bg-[#111827]/80 p-3 shadow-xs hover:border-theme-btn-primary/40 transition-all select-none"
        style={{ marginLeft: `${Math.min(depth * 14, 42)}px` }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            {hasChildren ? (
              <button 
                type="button"
                onClick={(e) => toggleNode(node, e)}
                className="h-6 w-6 rounded flex items-center justify-center text-muted hover:text-foreground shrink-0 mt-0.5 bg-surface-hover/50"
              >
                {loadingNodes[node.id] ? (
                  <CircleDashed className="h-3.5 w-3.5 animate-spin text-theme-icon" />
                ) : isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-1.5 h-6 shrink-0" />
            )}

            <div className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
              node.type === 'WORKSPACE' ? 'bg-theme-btn-primary/10 text-theme-icon' :
              node.type === 'SUB_WORKSPACE' ? 'bg-purple-500/10 text-purple-600' :
              node.type === 'TASK' ? 'bg-emerald-500/10 text-emerald-600' :
              'bg-amber-500/10 text-amber-600'
            }`}>
              <TypeIcon className="h-3.5 w-3.5" />
            </div>

            <div 
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => {
                if (isWorkspaceType) router.push(`/workspaces/tasks?workspaceId=${node.id}`);
                else router.push(`/tasks/${node.id}`);
              }}
            >
              <h4 className="text-xs font-bold text-foreground truncate hover:text-theme-icon">
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

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenu(activeMenu === `mobile-${node.id}` ? null : `mobile-${node.id}`);
              }}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-hover active:scale-95"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {activeMenu === `mobile-${node.id}` && (
              <div 
                className="absolute right-0 top-full mt-1 w-44 rounded-xl shadow-xl border border-border bg-surface dark:bg-[#111827] p-1 z-50 animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu(null);
                    if (isWorkspaceType) router.push(`/workspaces/tasks?workspaceId=${node.id}`);
                    else router.push(`/tasks/${node.id}`);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-surface-hover"
                >
                  <Eye className="h-3.5 w-3.5 text-theme-icon" />
                  <span>Open Item</span>
                </button>
                {isWorkspaceType && onOpenWorkspace && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenu(null);
                      onOpenWorkspace(node);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-surface-hover"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-purple-500" />
                    <span>Edit Workspace</span>
                  </button>
                )}
                {onShareNode && isWorkspaceType && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenu(null);
                      onShareNode(node);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-success hover:bg-success/10"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Transfer</span>
                  </button>
                )}
                {onDeleteNode && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenu(null);
                      onDeleteNode(node);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-danger hover:bg-danger/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
            {isWorkspaceType && onCreateSubWorkspace && (roleCode === 'SUPER_ADMIN' || hasPermission('WORKSPACES_CREATE')) && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onCreateSubWorkspace(node); }}
                className="h-6 px-2 rounded-md text-[10px] font-bold uppercase bg-theme-btn-primary/10 text-theme-icon border border-theme-icon/30 active:scale-95"
              >
                + Sub WS
              </button>
            )}
            {onCreateTask && (roleCode === 'SUPER_ADMIN' || hasPermission('TASKS_CREATE')) && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onCreateTask(node); }}
                className="h-6 px-2 rounded-md text-[10px] font-bold uppercase bg-foreground/5 text-foreground border border-border active:scale-95"
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
    <div className="w-full font-sans">
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
        <div className="w-full flex flex-col min-w-[960px]">
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
