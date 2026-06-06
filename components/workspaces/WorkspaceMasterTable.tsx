"use client";

import React, { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, ExternalLink, Edit2, Share2, Trash2, MoreVertical, Folder, FolderTree, CheckSquare, CornerDownRight, CheckCircle2, CircleDashed } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { useRouter } from "next/navigation";

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
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const closeMenu = () => setActiveMenu(null);
    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, []);

  const [loadingNodes, setLoadingNodes] = useState<Record<string, boolean>>({});

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
    return node.status?.status_color || (isLightMode ? "#6b7280" : "#9ca3af");
  };

  const getStatusName = (node: any) => {
    if (node.status?.status_name) return node.status.status_name;
    if (node.status?.name) return node.status.name;
    if (node.status_id) return "Active";
    return "Unknown";
  };

  const getUserName = (userId: string) => {
    const user = allUsers.find(u => u.id === userId);
    return user ? user.full_name : "System";
  };

  const renderAssignees = (node: any) => {
    // Workspaces have .members array, tasks might have .assignees or we fallback
    const members = node.members || node.assignees || [];
    if (!members || members.length === 0) return <span className="text-gray-500 text-[10px]">Unassigned</span>;

    const displayMembers = members.slice(0, 3);
    const extraCount = members.length - 3;

    return (
      <div className="relative group/assignee inline-flex items-center cursor-pointer">
        <div className="flex -space-x-2">
          {displayMembers.map((m: any, idx: number) => {
            const uid = m.user_id || m.id;
            const uInfo = allUsers.find(u => u.id === uid);
            const isOnline = onlineUsers.has(uid);
            return (
              <div key={idx} className="relative">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 ${isLightMode ? 'border-white' : 'border-[#0B0D17] bg-indigo-600'}`} style={{ backgroundColor: uInfo?.profile_photo ? 'transparent' : '#4f46e5' }}>
                  {uInfo?.profile_photo ? <img src={uInfo.profile_photo} className="h-full w-full rounded-full" alt="" /> : (uInfo?.full_name?.substring(0,2).toUpperCase() || "U")}
                </div>
                <div className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 ${isLightMode ? 'border-white' : 'border-[#0B0D17]'} ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
              </div>
            );
          })}
          {extraCount > 0 && (
            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold text-gray-600 bg-gray-200 border-2 ${isLightMode ? 'border-white' : 'border-[#0B0D17]'}`}>
              +{extraCount}
            </div>
          )}
        </div>

        {/* Hover Tooltip */}
        <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded-lg shadow-xl opacity-0 invisible group-hover/assignee:opacity-100 group-hover/assignee:visible transition-all z-[9999] ${isLightMode ? 'bg-white border border-gray-200' : 'bg-gray-900 border border-white/10'}`}>
          <div className="text-[10px] font-bold uppercase text-gray-500 mb-2 px-1 border-b pb-1 border-gray-200 dark:border-white/10">Assigned Users ({members.length})</div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {members.map((m: any, idx: number) => {
              const uid = m.user_id || m.id;
              const uInfo = allUsers.find(u => u.id === uid);
              const isOnline = onlineUsers.has(uid);
              return (
                <div key={idx} className="flex items-center gap-2 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5">
                  <div className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_4px_#22c55e]' : 'bg-red-500 shadow-[0_0_4px_#ef4444]'}`} />
                  <span className={`text-[11px] truncate ${isOnline ? (isLightMode ? 'text-gray-800' : 'text-gray-200') : 'text-red-500 font-medium'}`}>{uInfo?.full_name || 'Unknown User'}</span>
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
  const gridCols = 'minmax(150px, 2.5fr) minmax(100px, 1.5fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(160px, 1.5fr) minmax(130px, 1fr)';


  const HierarchyRow = React.memo(({ node, depth, isExpanded }: { node: any, depth: number, isExpanded: boolean }) => {
    const hasChildren = node.children && node.children.length > 0;
    const isWorkspaceType = node.type === 'WORKSPACE' || node.type === 'SUB_WORKSPACE';
    const isSubWorkspace = node.type === 'SUB_WORKSPACE';
    const isRoot = depth === 0;
    
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
    if (node.type === 'WORKSPACE') {
      rowBg = isLightMode ? 'bg-indigo-50/80' : 'bg-indigo-900/15';
      hoverBg = isLightMode ? 'hover:bg-indigo-100/70' : 'hover:bg-indigo-900/30';
    } else if (node.type === 'SUB_WORKSPACE') {
      rowBg = isLightMode ? 'bg-indigo-50/40' : 'bg-indigo-900/10';
      hoverBg = isLightMode ? 'hover:bg-indigo-100/50' : 'hover:bg-indigo-900/20';
    } else if (node.type === 'TASK') {
      rowBg = isLightMode ? 'bg-emerald-50/40' : 'bg-emerald-900/10';
      hoverBg = isLightMode ? 'hover:bg-emerald-100/50' : 'hover:bg-emerald-900/20';
    } else if (node.type === 'SUB_TASK') {
      rowBg = isLightMode ? 'bg-amber-50/40' : 'bg-amber-900/10';
      hoverBg = isLightMode ? 'hover:bg-amber-100/50' : 'hover:bg-amber-900/20';
    } else {
      rowBg = isLightMode ? 'bg-white' : 'bg-[#1C1C28]';
      hoverBg = isLightMode ? 'hover:bg-gray-50' : 'hover:bg-[#252535]';
    }
    
    let subWsCount = node.subworkspace_count || 0;
    let directTaskCount = node.direct_task_count || 0;
    let childTaskCount = node.child_task_count || 0;
    let totalTaskCount = node.total_hierarchy_task_count || 0;

    if (isWorkspaceType && hasChildren && node.childrenFetched) {
      // Re-calculate live if we fetched children, to keep it accurate if user creates something locally
      subWsCount = node.children.filter((c: any) => c.type === 'SUB_WORKSPACE' || c.type === 'WORKSPACE').length;
    }
    
    const companyName = node.company?.name || (isWorkspaceType ? "Independent" : "---");
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
          // Open full task page on single click for tasks
          if (node.type === 'TASK' || node.type === 'SUB_TASK') {
            router.push(`/tasks/${node.id}`);
          }
        }}
        onMouseEnter={() => {
          if (onPrefetchNode) onPrefetchNode(node);
        }}
        className={`grid items-center border-b transition-colors group min-h-[44px] cursor-pointer select-none relative hover:z-50 ${rowBg} ${hoverBg} ${
        isLightMode ? 'border-gray-200' : 'border-white/5'
      }`} style={{ gridTemplateColumns: gridCols }}>

          {/* VS Code Style Guide Lines for Nested Items */}
          {depth > 0 && Array.from({ length: depth }).map((_, i) => {
            const isLast = i === depth - 1;
            let guideLineColor = isLightMode ? 'border-gray-300' : 'border-white/20';
            
            if (isLast) {
              if (node.type === 'SUB_WORKSPACE') guideLineColor = isLightMode ? 'border-indigo-400' : 'border-indigo-500/80';
              else if (node.type === 'TASK') guideLineColor = isLightMode ? 'border-emerald-400' : 'border-emerald-500/80';
              else if (node.type === 'SUB_TASK') guideLineColor = isLightMode ? 'border-amber-400' : 'border-amber-500/80';
            }

            return (
              <React.Fragment key={i}>
                <div 
                  className={`absolute top-0 bottom-0 border-l-[2px] ${isLast ? guideLineColor : (isLightMode ? 'border-gray-200 border-dashed opacity-70' : 'border-white/10 border-dashed opacity-50')}`}
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
                      isLightMode ? 'hover:bg-gray-200 text-gray-500 bg-white' : 'hover:bg-white/10 text-gray-400 bg-[#1C1C28]'
                    } ${loadingNodes[node.id] ? 'opacity-50' : ''}`}
                  >
                    {loadingNodes[node.id] ? (
                      <div className="h-4 w-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
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
                      isWorkspaceType ? (depth === 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-indigo-500/80') : 'text-emerald-500'
                    }`} />
                    <div className="flex items-center gap-2">
                      <span className="opacity-50 font-mono text-[10px] tracking-wider font-bold">
                        {node.workspace_code || node.task_code || ""}
                      </span>
                      <span className={`truncate max-w-[200px] ${
                        isWorkspaceType ? 'font-bold tracking-tight text-[14px]' : 
                        isSubWorkspace ? 'font-semibold tracking-tight text-[13px]' : 
                        'font-medium text-[13px]'
                      } ${
                        isLightMode ? (depth === 0 ? 'text-gray-900' : 'text-gray-800') : (depth === 0 ? 'text-white' : 'text-gray-200')
                      }`}>
                        {node.workspace_name || node.name || node.subject || node.title}
                      </span>
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
                      className={`text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded whitespace-nowrap cursor-pointer transition-all active:scale-95 ${isLightMode ? 'text-orange-500 bg-white hover:bg-orange-50 border border-orange-400' : 'text-orange-500 bg-[#1C1C28] hover:bg-orange-900/20 border border-orange-500/50'}`} 
                      title={`${directTaskCount} Direct, ${childTaskCount} Child (Double-click to open)`}
                    >
                      {totalTaskCount} Tasks <span className="opacity-75 font-semibold">({directTaskCount} Direct)</span>
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
                      className={`text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded whitespace-nowrap cursor-pointer transition-all active:scale-95 ${isLightMode ? 'text-amber-500 bg-white hover:bg-amber-50 border border-amber-400' : 'text-amber-500 bg-[#1C1C28] hover:bg-amber-900/20 border border-amber-500/50'}`} 
                      title={`${childTaskCount} Sub-Tasks (Double-click to open)`}
                    >
                      {childTaskCount} Sub-Task{childTaskCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Company */}
          <div className="py-1 px-2 text-xs text-gray-500 break-words">
            {companyName}
          </div>

          {/* Created Date */}
          <div className="py-1 px-2 text-xs text-gray-500 whitespace-nowrap" title={fullDate}>
            {shortDate}
          </div>

          {/* Created By */}
          <div className="py-1 px-2 text-xs font-medium text-gray-600 dark:text-gray-400 break-words">
            {creatorId ? getUserName(creatorId) : "System"}
          </div>

          {/* Assignees */}
          <div className="py-1 px-2 flex items-center">
            {renderAssignees(node)}
          </div>

          {/* Create Sub-Items */}
          <div className="py-1 px-2">
            <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
              {isWorkspaceType && onCreateSubWorkspace && (
                <button
                  onClick={(e) => { e.stopPropagation(); onCreateSubWorkspace(node); }}
                  className={`text-[10px] font-bold uppercase px-2 py-1 rounded shadow-sm border transition-all active:scale-95 w-auto ${
                    isLightMode 
                      ? 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300' 
                      : 'bg-[#0B0D17] border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-400'
                  }`}
                >
                  + Sub WS
                </button>
              )}
              {onCreateTask && (
                <button
                  onClick={(e) => { e.stopPropagation(); onCreateTask(node); }}
                  className={`text-[10px] font-bold uppercase px-2 py-1 rounded shadow-sm border transition-all active:scale-95 w-auto ${
                    isLightMode 
                      ? 'bg-white border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300' 
                      : 'bg-[#0B0D17] border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:border-purple-400'
                  }`}
                >
                  {isWorkspaceType ? '+ Task' : '+ Sub Task'}
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="py-1 px-1 flex items-center justify-center gap-1.5 whitespace-nowrap">
            {isWorkspaceType && directTaskCount > 0 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/workspaces/tasks?workspaceId=${node.id}`);
                }}
                className={`p-1 rounded-md transition-colors ${isLightMode ? 'text-gray-500 hover:bg-gray-200' : 'text-gray-400 hover:bg-white/10'}`}
                title="Open Task List"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            )}
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (isWorkspaceType) {
                  onOpenWorkspace(node);
                } else {
                  router.push(`/tasks/${node.id}`);
                }
              }}
              className={`p-1 rounded-md transition-colors ${isLightMode ? 'text-indigo-600 hover:bg-indigo-50' : 'text-indigo-400 hover:bg-indigo-500/20'}`}
              title="Edit"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>

            {onShareNode && isWorkspaceType && (
              <button 
                onClick={() => onShareNode(node)}
                className={`p-1 rounded-md transition-colors ${isLightMode ? 'text-emerald-600 hover:bg-emerald-50' : 'text-emerald-400 hover:bg-emerald-500/20'}`}
                title="Share Workspace"
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>
            )}

            {onDeleteNode && (
              <button 
                onClick={() => onDeleteNode(node)}
                className={`p-1 rounded-md transition-colors ${isLightMode ? 'text-rose-600 hover:bg-rose-50' : 'text-rose-400 hover:bg-rose-500/20'}`}
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      );
    }, (prevProps, nextProps) => {
      // Memoize the row, only re-render if node identity or expanded state changes
      return prevProps.node === nextProps.node && prevProps.isExpanded === nextProps.isExpanded;
    });

    const renderTree = (nodes: any[], depth = 0) => {
      return nodes.map((node) => {
        const isActuallyExpanded = forceExpandAll || !!expandedNodes[node.id];
        return (
          <React.Fragment key={node.id}>
            <HierarchyRow node={node} depth={depth} isExpanded={isActuallyExpanded} />
            {isActuallyExpanded && node.children && renderTree(node.children, depth + 1)}
          </React.Fragment>
        );
      });
    };

  return (
    <div className="w-full">
      <div className="w-full flex flex-col">
        {/* Header */}
        <div className={`grid items-center text-xs uppercase tracking-wider font-semibold border-b ${
          isLightMode ? 'bg-gray-50 text-gray-500 border-gray-200' : 'bg-white/[0.02] text-gray-400 border-white/10'
        }`} style={{ gridTemplateColumns: gridCols }}>
          <div className="py-2 px-2 pl-[64px]">Entity Name</div>
          <div className="py-2 px-2">Company</div>
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
