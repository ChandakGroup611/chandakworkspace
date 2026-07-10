"use client";

import React, { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, ExternalLink, Edit2, Share2, Trash2, MoreVertical, Folder, FolderTree, CheckSquare, CornerDownRight, CheckCircle2, CircleDashed, Paperclip } from "lucide-react";
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
  forceExpandAll = false
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
    return node.status?.status_color || ("#6b7280");
  };

  const getStatusName = (node: any) => {
    if (node.status?.status_name) return node.status.status_name;
    if (node.status?.name) return node.status.name;
    if (node.status_id) return "Active";
    return "Unknown";
  };

  const getUserName = (userId: string) => {
    const user = usersMap.get(userId);
    return user ? user.full_name : "System";
  };

  const renderAssignees = (node: any) => {
    // Workspaces have .members array, tasks might have .assignees or we fallback
    let members = node.members || node.assignees || [];
    if (members.length === 0) {
      if (node.assignee && node.assignee.id) members = [{ user_id: node.assignee.id }];
      else if (node.assigned_to) members = [{ user_id: node.assigned_to }];
      else if (node.owner_id) members = [{ user_id: node.owner_id }];
    }
    
    if (!members || members.length === 0) return <span className="text-gray-500 text-[10px]">Unassigned</span>;

    const displayMembers = members.slice(0, 3);
    const extraCount = members.length - 3;

    return (
      <div className="relative group/assignee inline-flex items-center cursor-pointer">
        <div className="flex -space-x-2">
          {displayMembers.map((m: any, idx: number) => {
            const uid = m.user_id || m.id;
            const uInfo = usersMap.get(uid);
            const isOnline = onlineUsers.has(uid);
            return (
              <div key={idx} className="relative">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-white`} style={{ backgroundColor: uInfo?.profile_photo ? 'transparent' : '#4f46e5' }}>
                  {uInfo?.profile_photo ? <img src={uInfo.profile_photo} className="h-full w-full rounded-full" alt="" /> : (uInfo?.full_name?.substring(0,2).toUpperCase() || "U")}
                </div>
                <div className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
              </div>
            );
          })}
          {extraCount > 0 && (
            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold text-gray-600 bg-gray-200 border-2 border-white`}>
              +{extraCount}
            </div>
          )}
        </div>

        {/* Hover Tooltip */}
        <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded-lg shadow-xl opacity-0 invisible group-hover/assignee:opacity-100 group-hover/assignee:visible transition-all z-[9999] bg-surface border border-border`}>
          <div className="text-[10px] font-bold uppercase text-gray-500 mb-2 px-1 border-b pb-1 border-gray-200 dark:border-white/10">Assigned Users ({members.length})</div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {members.map((m: any, idx: number) => {
              const uid = m.user_id || m.id;
              const uInfo = usersMap.get(uid);
              const isOnline = onlineUsers.has(uid);
              return (
                <div key={idx} className="flex items-center gap-2 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5">
                  <div className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_4px_#22c55e]' : 'bg-red-500 shadow-[0_0_4px_#ef4444]'}`} />
                  <span className={`text-[11px] truncate ${isOnline ? ("text-foreground") : 'text-red-500 font-medium'}`}>{uInfo?.full_name || 'Unknown User'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Perfectly balanced layout matrix:
  // Using minmax(minPixels, fr) for ALL columns allows the previously locked right-side columns (Assign/Create/Actions)
  // to expand proportionally on wide screens, aggressively stealing and absorbing the massive blank space from the left side,
  const gridCols = 'minmax(250px, 4fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(160px, 1.5fr) minmax(130px, 1fr)';


  const renderHierarchyRow = (node: any, parentNode: any, depth: number, isExpanded: boolean) => {
    const hasChildren = node.children && node.children.length > 0;
    const isWorkspaceType = node.type === 'WORKSPACE' || node.type === 'SUB_WORKSPACE';
    const isSubWorkspace = node.type === 'SUB_WORKSPACE';
    
    // Distinct icons based on depth and type
    let TypeIcon = Folder;
    if (node.type === 'WORKSPACE') TypeIcon = Folder;
    else if (node.type === 'SUB_WORKSPACE') TypeIcon = FolderTree;
    else if (node.type === 'TASK') TypeIcon = CheckSquare;
    else if (node.type === 'SUB_TASK') TypeIcon = CheckCircle2;

    // Background tinting based on entity type to visually segregate the hierarchy
    let rowBg = '';
    let hoverBg = '';
    
    // Ultra-premium minimalist shading (Notion / Linear style)
    if (isLightMode) {
      rowBg = depth % 2 === 0 ? 'bg-white' : 'bg-slate-50';
      hoverBg = depth % 2 === 0 ? 'hover:bg-slate-50' : 'hover:bg-slate-100';
    } else {
      rowBg = depth % 2 === 0 ? 'bg-[#0B0D17]' : 'bg-[#161B22]';
      hoverBg = depth % 2 === 0 ? 'hover:bg-slate-800/50' : 'hover:bg-slate-800/80';
    }
    
    let subWsCount = node.subworkspace_count || 0;
    let directTaskCount = node.direct_task_count || 0;
    let childTaskCount = node.child_task_count || 0;
    let totalTaskCount = node.total_hierarchy_task_count || 0;

    if (isWorkspaceType && hasChildren && node.childrenFetched) {
      // Re-calculate live if we fetched children, to keep it accurate if user creates something locally
      subWsCount = node.children.filter((c: any) => c.type === 'SUB_WORKSPACE' || c.type === 'WORKSPACE').length;
    }
    

    const creatorId = node.created_by || node.owner_id || node.workspace_owner_id;

    const fullDate = node.created_at ? new Date(node.created_at).toLocaleString() : '---';
    const shortDate = node.created_at ? new Date(node.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '---';

    return (
      <div 
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (isWorkspaceType) {
            router.push(`/workspaces/tasks?workspaceId=${node.id}`);
          }
        }}
        onClick={(e) => {
          if (node.type === 'TASK' || node.type === 'SUB_TASK') {
            // Open full task page on single click for tasks
            router.push(`/tasks/${node.id}`);
          }
        }}
        onMouseEnter={() => {
          if (onPrefetchNode) onPrefetchNode(node);
        }}
        className={`grid items-center border-b transition-colors group min-h-[44px] cursor-pointer select-none relative hover:z-50 ${rowBg} ${hoverBg} ${
        "border-border"
      }`} style={{ gridTemplateColumns: gridCols }}>

          {/* VS Code Style Guide Lines for Nested Items */}
          {depth > 0 && Array.from({ length: depth }).map((_, i) => {
            const isLast = i === depth - 1;
            let guideLineColor = "border-border";
            
            if (isLast) {
              if (node.type === 'SUB_WORKSPACE') guideLineColor = "border-accent";
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
          <div className="py-2 px-2 flex items-center min-w-0 relative" style={{ paddingLeft: `${depth * 2.5 + 1.2}rem` }}>
            <div className="flex items-start gap-2 min-w-0 w-full">
              <div className="mt-0.5 flex-shrink-0 z-10 bg-transparent">
                {(isWorkspaceType ? (totalTaskCount > 0 || subWsCount > 0) : (childTaskCount > 0 || hasChildren)) ? (
                  <button 
                    onClick={(e) => toggleNode(node, e)}
                    disabled={loadingNodes[node.id]}
                    className={`p-1 rounded-md transition-colors relative z-20 ${
                      "hover:bg-gray-200 text-muted bg-surface"
                    } ${loadingNodes[node.id] ? 'opacity-50' : ''}`}
                  >
                    {loadingNodes[node.id] ? (
                      <div className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                    ) : isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                ) : (
                  <div className="w-6 h-6" /> // spacer matching button size
                )}
              </div>
              
              <div className="flex flex-col min-w-0 flex-1 justify-center py-0.5 relative z-10">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 max-w-full">
                    <TypeIcon className={`h-4 w-4 flex-shrink-0 ${
                      isWorkspaceType ? (depth === 0 ? 'text-accent dark:text-accent' : 'text-accent/80') : 'text-emerald-500'
                    }`} />
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="opacity-50 font-mono text-[10px] tracking-wider font-bold shrink-0">
                        {node.workspace_code || node.task_code || ""}
                      </span>
                      <span className={`whitespace-normal break-words ${
                        isWorkspaceType ? 'font-semibold tracking-tight text-[14px]' : 
                        isSubWorkspace ? 'font-medium tracking-tight text-[13px]' : 
                        'text-[13px]'
                      } ${
                        isLightMode ? (depth === 0 ? 'text-black' : 'text-slate-900') : (depth === 0 ? 'text-white' : 'text-gray-200')
                      }`}>
                        {isSubWorkspace && parentNode && (parentNode.workspace_name || parentNode.name) && !(node.workspace_name || node.name || '').startsWith((parentNode.workspace_name || parentNode.name) + ' -')
                          ? `${parentNode.workspace_name || parentNode.name} - ${node.workspace_name || node.name}`
                          : (node.workspace_name || node.name || node.subject || node.title)}
                      </span>
                      {node.attachmentCount > 0 && (
                        <div className={`flex items-center justify-center p-0.5 px-1 rounded-md ml-1 bg-accent/10 text-accent`} title={`${node.attachmentCount} Attachment(s)`}>
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
                      className={`text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded whitespace-nowrap cursor-pointer transition-all active:scale-95 text-orange-500 bg-surface hover:bg-orange-50 border border-orange-400`} 
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
                      className={`text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded whitespace-nowrap cursor-pointer transition-all active:scale-95 text-amber-500 bg-surface hover:bg-amber-50 border border-amber-400`} 
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
          <div className="py-1 px-2 text-xs text-slate-900 dark:text-gray-300 whitespace-nowrap" title={fullDate}>
            {shortDate}
          </div>

          {/* Created By */}
          <div className="py-1 px-2 text-xs font-semibold text-black dark:text-gray-200 whitespace-nowrap">
            {creatorId ? getUserName(creatorId) : "System"}
          </div>

          {/* Assignees */}
          <div className="py-1 px-2 flex items-center">
            {renderAssignees(node)}
          </div>

          {/* Create Sub-Items */}
          <div className="py-1 px-2">
            <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
              {isWorkspaceType && onCreateSubWorkspace && (roleCode === 'SUPER_ADMIN' || hasPermission('WORKSPACES_CREATE')) && (
                <AppButton
                  variant="outline"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onCreateSubWorkspace(node); }}
                  className={`h-6 px-2 text-[10px] font-medium uppercase ${
                    "border-accent/30 text-accent hover:bg-accent/10"
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
                  className={`h-6 px-2 text-[10px] font-medium uppercase ${
                    "border-accent/30 text-accent hover:bg-accent/10"
                  }`}
                >
                  {isWorkspaceType ? '+ Task' : '+ Sub Task'}
                </AppButton>
              )}
            </div>
          </div>

          <div className="py-1 px-1 flex items-center justify-center gap-1.5 whitespace-nowrap">
            {isWorkspaceType && totalTaskCount > 0 && (
              <AppButton 
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/workspaces/tasks?workspaceId=${node.id}`);
                }}
                className={`h-7 w-7 p-0 text-muted hover:bg-gray-200`}
                title="Open Task List"
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
                className={`h-7 w-7 p-0 text-accent hover:bg-accent/10`}
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
                className={`h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-50`}
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
                className={`h-7 w-7 p-0 text-rose-600 hover:bg-rose-50`}
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
    <div className="w-full font-sharp">
      <div className="w-full flex flex-col">
        {/* Header */}
        <div className={`grid items-center text-xs uppercase tracking-wider font-bold border-b-2 ${
          "bg-slate-100 text-foreground border-slate-200"
        }`} style={{ gridTemplateColumns: gridCols }}>
          <div className="py-2 px-2 pl-[64px]">Entity Name</div>
          <div className="py-2 px-2">Created Date</div>
          <div className="py-2 px-2">Created By</div>
          <div className="py-2 px-2 text-center">Assign</div>
          <div className="py-2 px-2 text-center">Create</div>
          <div className="py-2 px-1 text-center">Actions</div>
        </div>

        {/* Body */}
        <div className="flex flex-col">
          {hierarchy.length > 0 ? (
            renderTree(hierarchy)
          ) : (
            <div className="py-12 text-center text-sm text-gray-500">
              No Execution Hierarchy Available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
