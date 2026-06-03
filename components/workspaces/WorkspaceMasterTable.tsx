"use client";

import React, { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, FolderKanban, Layers, CheckCircle2, CircleDashed, ExternalLink, Edit2, Share2, Trash2, MoreVertical } from "lucide-react";
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
  onCreateTask
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
}) {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const closeMenu = () => setActiveMenu(null);
    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, []);

  const toggleNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
  // completely eliminating both the left-side gaps and the right-side congestion.
  const gridCols = 'minmax(150px, 2.5fr) minmax(100px, 1.5fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(160px, 1.5fr) minmax(130px, 1fr)';

  const renderRow = (node: any, depth: number) => {
    const isExpanded = !!expandedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    
    let TypeIcon = FolderKanban;
    if (node.type === 'SUB_WORKSPACE') TypeIcon = Layers;
    if (node.type === 'TASK') TypeIcon = CircleDashed;
    if (node.type === 'SUB_TASK') TypeIcon = CheckCircle2;

    const isWorkspaceType = node.type === 'WORKSPACE' || node.type === 'SUB_WORKSPACE';
    
    let subWsCount = 0;
    let directTaskCount = node.direct_task_count || 0;
    let childTaskCount = node.child_task_count || 0;
    let totalTaskCount = node.total_hierarchy_task_count || 0;

    if (isWorkspaceType && hasChildren) {
      subWsCount = node.children.filter((c: any) => c.type === 'SUB_WORKSPACE' || c.type === 'WORKSPACE').length;
    }
    
    // Fallback company inheritance for visual completeness if needed
    const companyName = node.company?.name || (isWorkspaceType ? "Independent" : "---");
    const creatorId = node.created_by || node.owner_id || node.workspace_owner_id;

    const fullDate = node.created_at ? new Date(node.created_at).toLocaleString() : '---';
    const shortDate = node.created_at ? new Date(node.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '---';

    return (
      <React.Fragment key={node.id}>
        {/* Universal Grid View */}
        <div 
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (isWorkspaceType) {
              router.push(`/workspaces/tasks?workspaceId=${node.id}`);
            } else if (node.type === 'TASK' || node.type === 'SUB_TASK') {
              onOpenTask(node);
            }
          }}
          className={`grid items-center border-b transition-colors group min-h-[44px] cursor-pointer select-none relative hover:z-50 ${
          isLightMode 
            ? 'border-gray-200 hover:bg-gray-50' 
            : 'border-white/5 hover:bg-white/[0.02]'
        }`} style={{ gridTemplateColumns: gridCols }}>
          {/* Entity Name */}
          <div className="py-1 px-2 flex items-center min-w-0" style={{ paddingLeft: `${depth * 2 + 0.5}rem` }}>
            <div className="flex items-center gap-2 min-w-0 w-full">
              {hasChildren ? (
                <button 
                  onClick={(e) => toggleNode(node.id, e)}
                  className={`p-1 rounded-md transition-colors flex-shrink-0 ${
                    isLightMode ? 'hover:bg-gray-200 text-gray-500' : 'hover:bg-white/10 text-gray-400'
                  }`}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              ) : (
                <div className="w-6 flex-shrink-0" /> // spacer
              )}
              <TypeIcon className={`h-4 w-4 flex-shrink-0 ${
                isWorkspaceType ? 'text-indigo-500' : 'text-purple-500'
              }`} />
              <div className="flex flex-col min-w-0 flex-1">
                <span className={`font-semibold text-sm truncate ${
                  isLightMode ? 'text-gray-900' : 'text-white'
                }`}>
                  {node.workspace_name || node.name || node.subject || node.title}
                </span>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-500 font-mono truncate max-w-[80px] shrink-0">{node.workspace_code || node.code || "N/A"}</span>
                  {isWorkspaceType && (
                    <div className="flex flex-wrap items-center gap-1.5 border-l border-gray-300 dark:border-gray-700 pl-2">
                      <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded whitespace-nowrap">{subWsCount} Sub-WS</span>
                      <span className="text-[10px] font-bold text-purple-500 bg-purple-50 dark:bg-purple-500/10 px-1.5 py-0.5 rounded whitespace-nowrap" title={`${directTaskCount} Direct, ${childTaskCount} Child`}>
                        {totalTaskCount} Tasks ({directTaskCount} Direct)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Company */}
          <div className="py-1 px-2 text-xs text-gray-500 truncate">
            {companyName}
          </div>

          {/* Created Date */}
          <div className="py-1 px-2 text-xs text-gray-500 whitespace-nowrap truncate" title={fullDate}>
            {shortDate}
          </div>

          {/* Created By */}
          <div className="py-1 px-2 text-xs font-medium text-gray-600 dark:text-gray-400 truncate">
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
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (isWorkspaceType) {
                  router.push(`/workspaces/tasks?workspaceId=${node.id}`);
                } else {
                  onOpenTask(node);
                }
              }}
              className={`p-1 rounded-md transition-colors ${isLightMode ? 'text-gray-500 hover:bg-gray-200' : 'text-gray-400 hover:bg-white/10'}`}
              title={isWorkspaceType ? "Open Task List" : "View Task"}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (isWorkspaceType) {
                  onOpenWorkspace(node);
                } else {
                  onOpenTask(node);
                }
              }}
              className={`p-1 rounded-md transition-colors ${isLightMode ? 'text-indigo-600 hover:bg-indigo-50' : 'text-indigo-400 hover:bg-indigo-500/20'}`}
              title="Edit"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>

            {onShareNode && (
              <button 
                onClick={() => onShareNode(node)}
                className={`p-1 rounded-md transition-colors ${isLightMode ? 'text-emerald-600 hover:bg-emerald-50' : 'text-emerald-400 hover:bg-emerald-500/20'}`}
                title="Share"
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

        {isExpanded && hasChildren && node.children.map((child: any) => renderRow(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="w-full">
      <div className="w-full flex flex-col">
        {/* Header */}
        <div className={`grid items-center text-xs uppercase tracking-wider font-semibold border-b ${
          isLightMode ? 'bg-gray-50 text-gray-500 border-gray-200' : 'bg-white/[0.02] text-gray-400 border-white/10'
        }`} style={{ gridTemplateColumns: gridCols }}>
          <div className="py-2 px-2 pl-[64px] truncate">Entity Name</div>
          <div className="py-2 px-2 truncate">Company</div>
          <div className="py-2 px-2 truncate">Created Date</div>
          <div className="py-2 px-2 truncate">Created By</div>
          <div className="py-2 px-2 truncate text-center">Assign</div>
          <div className="py-2 px-2 truncate text-center">Create</div>
          <div className="py-2 px-1 text-center">Actions</div>
        </div>

        {/* Body */}
        <div className="flex flex-col">
          {hierarchy.length > 0 ? (
            hierarchy.map(node => renderRow(node, 0))
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
