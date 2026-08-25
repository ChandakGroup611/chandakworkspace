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

  // Perfectly balanced layout matrix for segregated assignees:
  const gridCols = 'minmax(280px, 6fr) minmax(90px, 1fr) minmax(90px, 1fr) minmax(90px, 1fr) minmax(90px, 1fr) minmax(90px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr)';

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
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold text-[#ffffff] border-2 border-white`} style={{ backgroundColor: uInfo?.profile_photo ? 'transparent' : 'var(--accent-primary, #4f46e5)' }}>
                  {uInfo?.profile_photo ? <img src={uInfo.profile_photo} className="h-full w-full rounded-full" alt="" /> : (uInfo?.full_name?.substring(0,2).toUpperCase() || "U")}
                </div>
                <div className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-white ${isOnline ? 'bg-success' : 'bg-danger'}`}></div>
              </div>
            );
          })}
          {extraCount > 0 && (
            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold text-[#ffffff] border-2 border-white`} style={{ backgroundColor: 'var(--accent-primary, #4f46e5)' }}>
              +{extraCount}
            </div>
          )}
        </div>

        {/* Hover Tooltip */}
        <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded-lg shadow-xl opacity-0 invisible group-hover/avatar:opacity-100 group-hover/avatar:visible transition-all z-[9999] theme-card-structural`}>
          <div className="text-[10px] font-bold uppercase text-muted mb-2 px-1 border-b pb-1 border-border dark:border-border">{title} ({members.length})</div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {members.map((m: any, idx: number) => {
              const uid = m.user_id || m.id;
              const uInfo = usersMap.get(uid);
              const isOnline = onlineUsers.has(uid);
              return (
                <div key={idx} className="flex items-center gap-2 p-1 rounded hover:bg-surface/40 backdrop-blur/5 dark:hover:bg-surface/40 backdrop-blur/40/5">
                  <div className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-success shadow-[0_0_4px_#22c55e]' : 'bg-danger shadow-[0_0_4px_#ef4444]'}`} />
                  <span className={`text-[11px] truncate ${isOnline ? ("text-foreground") : 'text-danger font-medium'}`}>{uInfo?.full_name || 'Unknown User'}</span>
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
    const isSubWorkspace = node.type === 'SUB_WORKSPACE';
    const isTask = node.type === 'TASK' || node.type === 'SUB_TASK';
    
    // Distinct icons based on depth and type
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
    const shortDate = node.created_at ? new Date(node.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '---';
    const priority = isTask ? getPriorityInfo(node) : null;
    const statusName = getStatusName(node);
    const statusColor = getStatusColor(node);

    return (
      <div 
        onClick={(e) => {
          e.stopPropagation();
          // Find any interactive element (button, link, etc) that might have been clicked
          const target = e.target as HTMLElement;
          const isInteractive = target.closest('button, a, input, [role="button"]');
          
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
        className={`theme-table-row grid items-center border-b transition-colors group min-h-[48px] cursor-pointer select-none relative hover:z-50 hover:theme-card-structural -hover ${ node.isMatched ? 'bg-theme-btn-primary/5 ring-1 ring-inset ring-theme-btn-primary/30' : '' } /40`} style={{ gridTemplateColumns: gridCols }}>

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
              <React.Fragment key={i}>
                <div 
                  className={`absolute top-0 bottom-0 border-l-[2px] ${isLast ? guideLineColor : ("border-border border-dashed opacity-70")}`}
                  style={{ left: `${i * 2.5 + 1.95}rem` }}
                />
                {isLast && (
                  <div 
                    className={`absolute top-[22px] border-b-[2px] ${guideLineColor}`}
                    style={{ 
                      left: `${i * 2.5 + 1.95}rem`, 
                      width: '1.0rem' 
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}

          {/* Entity Name */}
          <div className="py-3 px-4 flex items-center min-w-0 relative" style={{ paddingLeft: `${depth * 2.5 + 1.2}rem` }}>
            <div className="flex items-start gap-2 min-w-0 w-full">
              <div className="mt-0.5 flex-shrink-0 z-10 bg-transparent">
                {(isWorkspaceType ? (totalTaskCount > 0 || subWsCount > 0) : (childTaskCount > 0 || hasChildren)) ? (
                  <AppButton 
                    onClick={(e) => toggleNode(node, e)}
                    disabled={loadingNodes[node.id]}
                    className={`p-0.5 rounded-md transition-colors relative z-20 text-white hover:brightness-110 ${loadingNodes[node.id] ? 'opacity-50' : ''}`}
                  >
                    {loadingNodes[node.id] ? (
                      <div className="h-4 w-4 rounded-full border-2 border-theme-icon border-t-transparent animate-spin" />
                    ) : isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </AppButton>
                ) : (
                  <div className="w-6 h-6" /> // spacer matching button size
                )}
              </div>
              
              <div className="flex flex-col min-w-0 flex-1 justify-center py-0.5 relative z-10">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 max-w-full">
                    <TypeIcon className={`h-4 w-4 flex-shrink-0 ${
                      isWorkspaceType ? (depth === 0 ? 'text-theme-icon dark:text-theme-icon' : 'text-theme-icon/80') : 'text-success'
                    }`} />
                    <div className="flex items-center gap-2 min-w-0 flex-1 py-1">
                      <span className={`${
                        isWorkspaceType ? 'truncate font-semibold tracking-tight text-sm' : 
                        isSubWorkspace ? 'truncate font-medium tracking-tight text-[13px]' : 
                        'whitespace-normal break-words text-[13px] font-normal leading-snug'
                      } ${
                        (depth === 0 ? 'text-foreground group-hover:text-theme-icon transition-colors' : 'text-foreground/80 group-hover:text-foreground transition-colors')
                      }`}>
                        {isSubWorkspace && parentNode && (parentNode.workspace_name || parentNode.name) && !(node.workspace_name || node.name || '').startsWith((parentNode.workspace_name || parentNode.name) + ' -')
                          ? `${parentNode.workspace_name || parentNode.name} - ${node.workspace_name || node.name}`
                          : (node.workspace_name || node.name || node.subject || node.title)}
                      </span>

                      {/* Task Status & Priority Badges */}
                      {isTask && (
                        <div className="inline-flex items-center gap-1.5 ml-1 shrink-0">
                          <span 
                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-sm"
                            style={{ 
                              borderColor: `${statusColor}40`, 
                              backgroundColor: `${statusColor}15`,
                              color: statusColor
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                            {statusName}
                          </span>

                          {priority && (
                            <span 
                              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border"
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
                        <div className={`flex items-center justify-center p-0.5 px-1 rounded-md ml-1 bg-theme-btn-primary/10 text-theme-icon`} title={`${node.attachmentCount} Attachment(s)`}>
                          <Paperclip className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {isWorkspaceType && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1 ml-[22px]">
                    <span 
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        router.push(`/workspaces/tasks?workspaceId=${node.id}`);
                      }}
                      className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded whitespace-nowrap cursor-pointer transition-all active:scale-95 bg-theme-btn-primary/10 text-theme-icon hover:opacity-90/20 border border-theme-icon/20`} 
                      title={`${directTaskCount} Direct, ${childTaskCount} Child (Double-click to open)`}
                    >
                      {totalTaskCount} Tasks <span className="opacity-75 font-medium">({directTaskCount} Direct)</span>
                    </span>
                  </div>
                )}
                {!isWorkspaceType && childTaskCount > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1 ml-[22px]">
                    <span 
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        router.push(`/tasks/${node.id}`);
                      }}
                      className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded whitespace-nowrap cursor-pointer transition-all active:scale-95 bg-theme-btn-secondary/10 text-theme-btn-secondary-text hover:bg-theme-btn-secondary/20 border border-theme-btn-secondary-text/20`} 
                      title={`${childTaskCount} Sub-Tasks (Double-click to open)`}
                    >
                      {childTaskCount} Sub-Task{childTaskCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Created Date */}
          <div className="py-3 px-4 text-[13px] text-muted whitespace-nowrap" title={fullDate}>
            {shortDate}
          </div>

          {/* Creator */}
          <div className="py-3 px-4 flex items-center justify-center">
            {renderAvatarGroup(creatorId ? [{ id: creatorId }] : [], "Creator", "System")}
          </div>

          {/* Owner */}
          <div className="py-3 px-4 flex items-center justify-center">
            {renderAvatarGroup(
              isWorkspaceType 
                ? (node.owner_id ? [{ id: node.owner_id }] : (node.workspace_owner_id ? [{ id: node.workspace_owner_id }] : (node.members?.filter((m: any) => m.role === 'OWNER') || [])))
                : (node.owner_id ? [{ id: node.owner_id }] : []),
              "Owner", "None"
            )}
          </div>

          {/* Executives */}
          <div className="py-3 px-4 flex items-center justify-center">
            {renderAvatarGroup(
              isWorkspaceType 
                ? (node.members?.filter((m: any) => m.role === 'EXECUTOR') || [])
                : (node.assignees?.filter((m: any) => m.participation_role === 'EXECUTOR') || (node.assigned_to ? [{ id: node.assigned_to }] : [])),
              "Executives", "None"
            )}
          </div>

          {/* Watchers */}
          <div className="py-3 px-4 flex items-center justify-center">
            {renderAvatarGroup(
              isWorkspaceType 
                ? (node.members?.filter((m: any) => m.role === 'WATCHER') || [])
                : (node.assignees?.filter((m: any) => m.participation_role === 'WATCHER') || []),
              "Watchers", "None"
            )}
          </div>

          {/* Create Sub-Items */}
          <div className="py-3 px-4">
            <div className="flex items-center justify-center gap-1 whitespace-nowrap">
              {isWorkspaceType && onCreateSubWorkspace && (roleCode === 'SUPER_ADMIN' || hasPermission('WORKSPACES_CREATE')) && (
                <AppButton
                  variant="outline"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onCreateSubWorkspace(node); }}
                  className={`h-7 px-3 text-[10px] font-medium uppercase ${
                    "border-theme-icon/30 text-theme-icon hover:opacity-90/10"
                  }`}
                >
                  + Sub WS
                </AppButton>
              )}
              {onCreateTask && (roleCode === 'SUPER_ADMIN' || hasPermission('TASKS_CREATE')) && (
                <AppButton
                  variant="outline"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onCreateTask(node); }}
                  className={`h-7 px-3 text-[10px] font-medium uppercase ${
                    "border-theme-icon/30 text-theme-icon hover:opacity-90/10"
                  }`}
                >
                  {isWorkspaceType ? '+ Task' : '+ Sub Task'}
                </AppButton>
              )}
            </div>
          </div>

          {/* Actions - Progressive Disclosure (Visible on Hover) */}
          <div className="py-1 px-1 flex items-center justify-center gap-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {isTask && onOpenTask && (
              <AppButton 
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenTask(node);
                }}
                className={`h-7 w-7 p-0 text-muted hover:text-theme-icon hover:bg-elevated`}
                title="Quick View Details"
              >
                <Eye className="h-3.5 w-3.5" />
              </AppButton>
            )}

            {isWorkspaceType && totalTaskCount > 0 && (
              <AppButton 
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/workspaces/tasks?workspaceId=${node.id}`);
                }}
                className={`h-7 w-7 p-0 text-muted hover:bg-elevated`}
                title="Open Task List"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </AppButton>
            )}

            {isTask && (
              <AppButton 
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/tasks/${node.id}`);
                }}
                className={`h-7 w-7 p-0 text-muted hover:bg-elevated`}
                title="Open Dedicated Task Page"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </AppButton>
            )}
            
            {(roleCode === 'SUPER_ADMIN' || (isWorkspaceType ? hasPermission('WORKSPACES_UPDATE') : hasPermission('TASKS_UPDATE'))) && (
              <AppButton 
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isWorkspaceType) {
                    onOpenWorkspace(node);
                  } else {
                    router.push(`/tasks/${node.id}`);
                  }
                }}
                className={`h-7 w-7 p-0 text-theme-icon hover:opacity-90/10`}
                title="Edit"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </AppButton>
            )}

            {onShareNode && isWorkspaceType && (roleCode === 'SUPER_ADMIN' || hasPermission('WORKSPACES_UPDATE')) && (
              <AppButton 
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onShareNode(node); }}
                className={`h-7 w-7 p-0 text-success hover:bg-success/10`}
                title="Share Workspace"
              >
                <Share2 className="h-3.5 w-3.5" />
              </AppButton>
            )}

            {onDeleteNode && (roleCode === 'SUPER_ADMIN' || (isWorkspaceType ? hasPermission('WORKSPACES_DELETE') : hasPermission('TASKS_DELETE'))) && (
              <AppButton 
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onDeleteNode(node); }}
                className={`h-7 w-7 p-0 text-danger hover:bg-danger/10`}
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </AppButton>
            )}
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

  return (
    <div className="w-full font-sans overflow-visible">
      <div className="w-full flex flex-col min-w-[1050px]">
        {/* Header */}
        <div className={`sticky top-0 z-20 grid items-center text-[13px] tracking-wider font-bold uppercase text-muted border-b border-border/50 pb-2 mb-1 ${
          "bg-background/90 text-muted"
        }`} style={{ gridTemplateColumns: gridCols }}>
          <div className="py-3 px-4 pl-[64px]">Entity Name</div>
          <div className="py-3 px-4">Created Date</div>
          <div className="py-3 px-4 text-center">Creator</div>
          <div className="py-3 px-4 text-center">Owner</div>
          <div className="py-3 px-4 text-center">Executives</div>
          <div className="py-3 px-4 text-center">Watchers</div>
          <div className="py-3 px-4 text-center">Create</div>
          <div className="py-3 px-4 text-center">Actions</div>
        </div>

        {/* Body */}
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
  );
}

