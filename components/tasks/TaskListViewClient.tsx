"use client";
import { toast } from 'react-toastify';

import React, { useMemo, useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import SafeHtml from "@/components/ui/SafeHtml";
import { useVirtualizer } from '@tanstack/react-virtual';
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import {
  AppTableContainer,
  AppTable,
  AppTableHeader,
  AppTableBody,
  AppTableRow,
  AppTableHead,
  AppTableCell
} from "@/components/ui/AppTable";
import { Loader2, Eye, Filter, Search, Users, Calendar, ArrowLeft, Download, FileText, FileSpreadsheet, Edit2, Trash2, Paperclip, Shield } from "lucide-react";
import Link from "next/link";
import { deleteTask, getTaskStatuses, updateTaskStatusInline, getDepartments, executeTaskBatchOperation, createTask } from "@/lib/actions/tasks";
import { fetchTasksByWorkspace, fetchAllTasks, fetchWorkspaces } from "@/lib/actions/workspaces";
import { createClient } from "@/utils/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { ExperienceProvider } from "@/components/theme/ExperienceProvider";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { usePermissions } from "@/hooks/usePermissions";
import { useLocalReportConfig, UIFieldDefinition } from "@/hooks/useLocalReportConfig";
import DynamicReportBuilder from "@/components/reports/DynamicReportBuilder";
import { Settings2, MessageSquare, ExternalLink, Plus, Upload, RotateCcw, LayoutList, Layers, CheckCircle2 } from "lucide-react";
import { HierarchyManager } from "@/lib/services/HierarchyManager";
import { HierarchyStateManager } from "@/lib/services/HierarchyStateManager";
import { ReportKPIBar } from "@/components/ui/ReportKPIBar";
import { MultiSelectFilter } from "@/components/ui/MultiSelectFilter";
import * as Popover from "@radix-ui/react-popover";

const getSafeExternalUrl = (url: string | undefined | null) => {
  if (!url) return '#';
  const str = String(url).trim();
  if (/^(https?|file|ftp|smb|mailto|tel):/i.test(str)) return str;
  return `https://${str}`;
};

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
                      }
                      case "department": return (
                        <AppTableCell className="text-subtle whitespace-nowrap text-center px-2">
                          <Popover.Root>
                            <Popover.Trigger asChild>
                              <AppButton variant="secondary" 
                                onClick={(e) => { e.stopPropagation(); }}
                                className={`${canUpdate ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'} transition-opacity focus:outline-none max-w-full`} 
                                title={canUpdate ? "Update Department" : "Department"}
                              >
                                <AppBadge variant="neutral" className={`max-w-full truncate block ${canUpdate ? "border-dashed" : ""}`}>
                                  {task.department?.name || '—'}
                                </AppBadge>
                              </AppButton>
                            </Popover.Trigger>
                            {canUpdate && (
                              <Popover.Portal>
                                <Popover.Content align="center" sideOffset={4} className="z-[100] w-48 p-2 theme-card-structural dark:bg-[#0B0F19] border-border rounded-xl shadow-xl flex flex-col gap-1 outline-none animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider px-2 py-1 mb-1 border-b border-border/50">Update Department</div>
                                  <div className="max-h-60 overflow-y-auto pr-1">
                                    {departments.map(d => (
                                      <AppButton 
                                        key={d.id}
                                        onClick={async () => {
                                          if (d.id === task.department_id) return;
                                          try {
                                            setInlineLoading(true);
                                            const res = await executeTaskBatchOperation({
                                              taskId: task.id,
                                              departmentChange: { old_id: task.department_id, new_id: d.id, old_name: task.department?.name, new_name: d.name },
                                              remarks: "Inline update"
                                            });
                                            if (res?.error) throw new Error(res.error);
                                            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, department_id: d.id, department: d } : t));
                                            triggerToast("Department updated");
                                          } catch (e: any) { toast.error("Failed: " + e.message); }
                                          finally { setInlineLoading(false); }
                                        }}
                                        className={`w-full text-left px-2 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between ${d.id === task.department_id ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-surface/50 font-medium'}`}
                                      >
                                        <span className="truncate">{d.name}</span>
                                        {d.id === task.department_id && <CheckCircle2 className="h-3 w-3" />}
                                      </AppButton>
                                    ))}
                                  </div>
                                </Popover.Content>
                              </Popover.Portal>
                            )}
                          </Popover.Root>
                        </AppTableCell>
                      );
                      case "priority": return (
                        <AppTableCell className="text-center">
                          <AppBadge variant={task.priority?.priority_color ? "custom" : "info"} customColor={task.priority?.priority_color || null} isOutline={true}>
                            {task.priority?.name || '—'}
                          </AppBadge>
                        </AppTableCell>
                      );
                      case "due_date": return (
                        <AppTableCell className="text-subtle whitespace-nowrap text-center">{task.end_date || '—'}</AppTableCell>
                      );
                      case "status": return (
                        <AppTableCell className="whitespace-nowrap text-center">
                          <Popover.Root>
                            <Popover.Trigger asChild>
                              <AppButton variant="secondary" 
                                onClick={(e) => { e.stopPropagation(); }}
                                className={`${canUpdate ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'} transition-opacity focus:outline-none`} 
                                title={canUpdate ? "Update Status" : "Status"}
                              >
                                <AppBadge variant={task.status?.status_color ? "custom" : "neutral"} customColor={task.status?.status_color || null} className={canUpdate ? "border-dashed" : ""} isOutline={true}>
                                  {task.status?.name || '—'}
                                </AppBadge>
                              </AppButton>
                            </Popover.Trigger>
                            {canUpdate && (
                              <Popover.Portal>
                                <Popover.Content align="center" sideOffset={4} className="z-[100] w-48 p-2 theme-card-structural dark:bg-[#0B0F19] border-border rounded-xl shadow-xl flex flex-col gap-1 outline-none animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-border/50">
                                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Update Status</span>
                                    <Link href={`/tasks/${task.id}`} className="text-[10px] font-bold text-primary hover:underline">View</Link>
                                  </div>
                                  <div className="max-h-60 overflow-y-auto pr-1">
                                    {masterStatuses.map(s => (
                                      <AppButton 
                                        key={s.id}
                                        onClick={async () => {
                                          if (s.id === task.status_id) return;
                                          try {
                                            setInlineLoading(true);
                                            const { error } = await updateTaskStatusInline(task.id, s.id, "Inline update");
                                            if (error) throw new Error(error);
                                            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status_id: s.id, status: { name: s.name, code: s.code, status_color: s.color } } : t));
                                            triggerToast("Status updated");
                                          } catch (e: any) { toast.error("Failed: " + e.message); }
                                          finally { setInlineLoading(false); }
                                        }}
                                        className={`w-full text-left px-2 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between ${s.id === task.status_id ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-surface/50 font-medium'}`}
                                      >
                                        <div className="flex items-center gap-2 truncate">
                                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color || '#ccc' }} />
                                          <span className="truncate">{s.name}</span>
                                        </div>
                                        {s.id === task.status_id && <CheckCircle2 className="h-3 w-3" />}
                                      </AppButton>
                                    ))}
                                  </div>
                                </Popover.Content>
                              </Popover.Portal>
                            )}
                          </Popover.Root>
                        </AppTableCell>
                      );
                      case "assignee": return (
                        <AppTableCell className="text-center">
                          {task.assignee ? (
                            <div className="flex items-center justify-center gap-2">
                              {(() => {
                                 const a = Array.isArray(task.assignee) ? task.assignee[0] : task.assignee;
                                 if (!a) return null;
                                 return (
                                   <>
                                     {a.profile_photo ? (
                                       <img src={a.profile_photo} alt="" className="w-5 h-5 rounded-full object-cover bg-elevated" />
                                     ) : (
                                       <div className="w-5 h-5 rounded-full bg-theme-btn-primary/10 text-theme-icon flex items-center justify-center text-[10px] font-bold shrink-0">
                                         {a.full_name?.substring(0, 2).toUpperCase() || "U"}
                                       </div>
                                     )}
                                     <span className="text-[13px] font-medium text-foreground whitespace-nowrap">{a.full_name}</span>
                                   </>
                                 );
                              })()}
                            </div>
                          ) : (
                            <span className="text-[13px] text-subtle italic">Unassigned</span>
                          )}
                        </AppTableCell>
                      );
                      case "creator_name": return (
                        <AppTableCell className="text-subtle text-center">{task.creator?.full_name || '—'}</AppTableCell>
                      );
                      case "start_date": return (
                        <AppTableCell className="text-subtle whitespace-nowrap text-center">{formatDate(task.start_date)}</AppTableCell>
                      );
                      case "duration": {
                        let text = "—";
                        if (task.start_date && task.end_date) {
                          const diff = Math.ceil((new Date(task.end_date).getTime() - new Date(task.start_date).getTime()) / (1000 * 60 * 60 * 24));
                          text = `${diff} day(s)`;
                        }
                        return <AppTableCell className="text-subtle ">{text}</AppTableCell>;
                      }
                      case "progress": return (
                        <AppTableCell className="w-[120px]">
                          {task.progress_percentage !== undefined ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-elevated dark:bg-surface rounded-full overflow-hidden">
                                <div className="h-full bg-success rounded-full" style={{ width: `${task.progress_percentage}%` }}></div>
                              </div>
                              <span className="text-[10px] font-bold text-muted w-6 text-right">{task.progress_percentage}%</span>
                            </div>
                          ) : "—"}
                        </AppTableCell>
                      );
                      case "executors": return (
                        <AppTableCell>
                          {task.executors && task.executors.length > 0 ? (
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {task.executors.slice(0, 3).map((u: any) => (
                                u.profile_photo ? (
                                  <img key={u.id} src={u.profile_photo} alt="" className="inline-block h-5 w-5 rounded-full ring-1 ring-white dark:ring-[#0f111a]" title={u.full_name} />
                                ) : (
                                  <div key={u.id} className="inline-flex h-5 w-5 items-center justify-center rounded-full ring-1 ring-white dark:ring-[#0f111a] bg-emerald-100 text-emerald-700 text-[8px] font-bold" title={u.full_name}>
                                    {u.full_name?.substring(0, 2).toUpperCase() || "E"}
                                  </div>
                                )
                              ))}
                              {task.executors.length > 3 && (
                                <div className="inline-flex h-5 w-5 items-center justify-center rounded-full ring-1 ring-white dark:ring-[#0f111a] bg-surface text-muted text-[8px] font-bold z-10">
                                  +{task.executors.length - 3}
                                </div>
                              )}
                            </div>
                          ) : <span className="text-muted text-xs">—</span>}
                        </AppTableCell>
                      );
                      case "reviewers": return (
                        <AppTableCell>
                          {task.reviewers && task.reviewers.length > 0 ? (
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {task.reviewers.slice(0, 3).map((u: any) => (
                                u.profile_photo ? (
                                  <img key={u.id} src={u.profile_photo} alt="" className="inline-block h-5 w-5 rounded-full ring-1 ring-white dark:ring-[#0f111a]" title={u.full_name} />
                                ) : (
                                  <div key={u.id} className="inline-flex h-5 w-5 items-center justify-center rounded-full ring-1 ring-white dark:ring-[#0f111a] bg-theme-btn-primary/10 text-theme-icon text-[8px] font-bold" title={u.full_name}>
                                    {u.full_name?.substring(0, 2).toUpperCase() || "W"}
                                  </div>
                                )
                              ))}
                              {task.reviewers.length > 3 && (
                                <div className="inline-flex h-5 w-5 items-center justify-center rounded-full ring-1 ring-white dark:ring-[#0f111a] bg-surface text-muted text-[8px] font-bold z-10">
                                  +{task.reviewers.length - 3}
                                </div>
                              )}
                            </div>
                          ) : <span className="text-muted text-xs">—</span>}
                        </AppTableCell>
                      );
                      case "attachments": return (
                        <AppTableCell className="text-center">
                          {task.attachmentCount > 0 ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-theme-btn-primary/10 text-theme-icon dark:bg-theme-btn-primary/10 dark:text-theme-icon font-medium text-[11px]">
                              <Paperclip className="h-3 w-3" />
                              {task.attachmentCount}
                            </div>
                          ) : <span className="text-muted text-xs">—</span>}
                        </AppTableCell>
                      );
                      case "comments": return (
                        <AppTableCell className="text-center">
                          {task.commentCount > 0 ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-theme-btn-primary/10 text-theme-icon dark:bg-theme-btn-primary/10 dark:text-theme-icon font-medium text-[11px]">
                              <MessageSquare className="h-3 w-3" />
                              {task.commentCount}
                            </div>
                          ) : <span className="text-muted text-xs">—</span>}
                        </AppTableCell>
                      );
                      case "external_link": return (
                        <AppTableCell >
                          {task.custom_fields?.link_url ? (
                            <a href={getSafeExternalUrl(task.custom_fields.link_url)} target="_blank" rel="noopener noreferrer" className="text-theme-icon hover:underline inline-flex items-center gap-1 max-w-[180px] truncate" onClick={(e) => e.stopPropagation()}>
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{task.custom_fields.link_url}</span>
                            </a>
                          ) : <span className="text-muted">—</span>}
                        </AppTableCell>
                      );
                      case "created_at": return (
                        <AppTableCell className="text-right text-muted whitespace-nowrap">{formatDate(task.created_at)}</AppTableCell>
                      );
                      case "updated_at": return (
                        <AppTableCell className="text-right text-muted whitespace-nowrap">{formatDate(task.updated_at)}</AppTableCell>
                      );
                      case "actions": return (
                        <AppTableCell className="text-right">
                          <div className="flex items-center justify-end gap-3">
                            <Link 
                              href={`/tasks/${task.id}?mode=view`}
                              className="text-theme-icon hover:text-theme-icon transition-colors active:scale-95"
                              title="View Task"
                            >
                              <Eye className="h-[15px] w-[15px]" />
                            </Link>
                            {canUpdate && (
                              <Link 
                                href={`/tasks/${task.id}`}
                                className="text-warning hover:text-warning transition-colors active:scale-95"
                                title="Edit Task"
                              >
                                <Edit2 className="h-[15px] w-[15px]" />
                              </Link>
                            )}
                            {canDelete && (
                              <AppButton variant="secondary" 
                                onClick={(e) => handleDeleteTask(e, task.id)}
                                disabled={deleteLoadingId === task.id}
                                className="text-danger hover:text-danger transition-colors active:scale-95 disabled:opacity-50"
                                title="Delete Task"
                              >
                                {deleteLoadingId === task.id ? (
                                  <Loader2 className="h-[15px] w-[15px] animate-spin" />
                                ) : (
                                  <Trash2 className="h-[15px] w-[15px]" />
                                )}
                              </AppButton>
                            )}
                          </div>
                        </AppTableCell>
                      );
                      default: {
                        let val = undefined;
                        if (task.custom_fields && task.custom_fields[col.field_key] !== undefined) {
                          val = task.custom_fields[col.field_key];
                        } else if (task[col.field_key] !== undefined) {
                          val = task[col.field_key];
                        }
                        
                        if (val === undefined || val === null || val === "") val = "—";
                        else if (col.data_type === "boolean") val = val ? "Yes" : "No";
                        else if (col.data_type === "date") val = formatDate(val);
                        
                        return (
                          <AppTableCell className="text-subtle ">
                            <div className="truncate max-w-[200px]" title={String(val)}>
                              {col.data_type === "link" && val !== "—" ? (
                                <a href={getSafeExternalUrl(val)} target="_blank" rel="noreferrer" className="text-theme-icon hover:underline">{val}</a>
                              ) : col.data_type === "badge" && val !== "—" ? (
                                <AppBadge variant="neutral">{val}</AppBadge>
                              ) : (
                                val
                              )}
                            </div>
                          </AppTableCell>
                        );
                      }
                    }
                    };
                    const cellNode = renderCell() as React.ReactElement<any>;
                    const isFirst = index === 0;
                    return React.cloneElement(cellNode, {
                      key: col.field_id,
                      className: cn(cellNode.props.className, isFirst ? "sticky left-[40px] z-20 bg-surface transition-colors" : ""),
                    });
                  })}
                </AppTableRow>
              );
            })}
            {virtualizer.getVirtualItems().length > 0 && (
              <tr>
                <td 
                  colSpan={visibleColumns.length + 1} 
                  style={{ 
                    height: `${virtualizer.getTotalSize() - virtualizer.getVirtualItems()[virtualizer.getVirtualItems().length - 1].end}px` 
                  }} 
                />
              </tr>
            )}
          </AppTableBody>
        </AppTable>
      </div>
    </DndContext>
  ) : viewMode === "board" ? (
    <div className="h-[calc(100vh-200px)]">
      <TaskBoardView 
        tasks={filtered} 
        statuses={masterStatuses} 
        onStatusChange={async (taskId, newStatusId) => {
          setInlineTask({ id: taskId } as any);
          setInlineNewStatus(newStatusId);
          setInlineRemark("Moved via Kanban Board");
          // Perform inline save
          const stMaster = masterStatuses.find(s => s.id === newStatusId);
          const mappedStatus = stMaster ? { name: stMaster.name, code: stMaster.code, status_color: stMaster.color } : undefined;
          
          await updateTaskStatusInline(taskId, newStatusId, "Moved via Kanban Board");
          setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status_id: newStatusId, status: mappedStatus || t.status } : t));
          triggerToast(`Status updated successfully.`);
        }}
        onTaskClick={(task) => {
          setSelectedTask(task);
        }}
      />
    </div>
  ) : (
    <div className="h-[calc(100vh-200px)]">
      <TaskTimelineView 
        tasks={filtered}
        onTaskClick={(task) => {
          setSelectedTask(task);
        }}
      />
    </div>
  )}

        {filtered.length === 0 && !loading && (
          <div className="text-center py-10 text-muted">No tasks found for this filter.</div>
        )}
        
        {hasMore && filtered.length > 0 && (
          <div className="flex justify-center py-4 border-t border-border dark:border-border bg-surface dark:bg-[#0B0F19]">
            <AppButton variant="outline" size="sm" onClick={loadMore} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Load More Tasks
            </AppButton>
          </div>
        )}

      {/* Side Drawer Component */}
      {selectedTask && (
        <>
          <div className="fixed inset-0 z-40 bg-surface/40 transition-opacity" onClick={() => setSelectedTask(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[450px] theme-card-structural dark:bg-[#0B0F19] shadow-2xl border-l border-border dark:border-border flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-border dark:border-border flex items-center justify-between bg-surface dark:theme-card-structural /[0.02]">
              <div>
                <h2 className="text-[14px] font-bold text-theme-heading truncate pr-4">{selectedTask.title}</h2>
                <div className="text-[11px] font-mono text-muted mt-1">{selectedTask.code} • {selectedTask.workspace?.name}</div>
              </div>
              <AppButton variant="ghost" size="sm" onClick={() => setSelectedTask(null)} className="h-8 w-8 p-0 shrink-0">✕</AppButton>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div className="space-y-2">
                <h4 className="text-[11px] uppercase font-bold text-muted tracking-wider">Description</h4>
                <div className="text-[13px] text-foreground  leading-relaxed">
                  <SafeHtml html={selectedTask.description || 'No description provided.'} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col p-3 rounded-lg bg-surface/50 dark:bg-surface/10 border border-border/60 dark:border-border shadow-sm transition-colors">
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1">Priority</span>
                  <div className="text-[13px] font-semibold text-theme-heading truncate">{selectedTask.priority?.name || 'N/A'}</div>
                </div>
                <div className="flex flex-col p-3 rounded-lg bg-surface/50 dark:bg-surface/10 border border-border/60 dark:border-border shadow-sm transition-colors">
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1">Department</span>
                  <div className="text-[13px] font-semibold text-theme-heading truncate">{selectedTask.department?.name || 'N/A'}</div>
                </div>
                <div className="flex flex-col p-3 rounded-lg bg-surface/50 dark:bg-surface/10 border border-border/60 dark:border-border shadow-sm transition-colors">
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1">Status</span>
                  <div className="text-[13px] font-semibold text-theme-heading truncate">{selectedTask.status?.name || 'N/A'}</div>
                </div>
                <div className="flex flex-col p-3 rounded-lg bg-surface/50 dark:bg-surface/10 border border-border/60 dark:border-border shadow-sm transition-colors">
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1">Due Date</span>
                  <div className="text-[13px] font-semibold text-theme-heading truncate">{selectedTask.end_date || 'N/A'}</div>
                </div>
              </div>
              
              {/* Checklists and Custom Fields */}
              {selectedTask.custom_fields && Object.keys(selectedTask.custom_fields).length > 0 && (
                <div className="space-y-3 pt-4 border-t border-border/50 dark:border-border">
                  <h4 className="text-[11px] uppercase font-bold text-theme-icon tracking-wider mb-2">Checklists & Details</h4>
                  
                  {selectedTask.custom_fields.checklist && Array.isArray(selectedTask.custom_fields.checklist) && (
                    <div className="space-y-2 mb-4">
                      {selectedTask.custom_fields.checklist.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 bg-surface dark:theme-card-structural /[0.02] p-2 rounded-lg border-border/50 dark:border-border">
                          <input type="checkbox" checked={item.completed} readOnly className="mt-1 shrink-0 rounded border-border text-theme-icon focus:ring-theme-btn-primary" />
                          <span className={`text-[13px] ${item.completed ? 'line-through text-muted' : 'text-foreground '}`}>{item.title}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid gap-3">
                    {Object.entries(selectedTask.custom_fields).filter(([k]) => k !== 'checklist' && k !== 'progress_percentage').map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-1">
                        <span className="text-[11px] uppercase font-bold text-muted tracking-wider">{key.replace(/_/g, ' ')}</span>
                        <div className="text-[13px] text-foreground ">
                          {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border dark:border-border bg-surface dark:theme-card-structural /[0.02] flex items-center gap-2">
              <Link href={`/tasks/${selectedTask.id}`} className="w-full flex-1">
                <AppButton variant="primary" className="w-full bg-theme-btn-primary hover:opacity-90">Open Execution Workspace</AppButton>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>

      {/* Floating Action Bar for Bulk Actions */}
      {selectedTaskIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 theme-card-structural dark:bg-[#0f111a] border-border dark:border-border shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="flex items-center gap-2">
            <div className="bg-theme-btn-primary/10 text-theme-icon dark:bg-theme-btn-primary/20 dark:text-theme-icon font-bold text-sm w-6 h-6 rounded-full flex items-center justify-center">
              {selectedTaskIds.size}
            </div>
            <span className="theme-data-value text-subtle ">Tasks Selected</span>
          </div>
          <div className="h-6 w-px bg-elevated dark:bg-surface/20"></div>
          <div className="flex items-center gap-2">
            {canUpdate && (
              <AppButton variant="outline" size="sm" onClick={() => setBulkStatusModalOpen(true)}>Update Tasks</AppButton>
            )}
            {canDelete && (
              <AppButton variant="outline" size="sm" onClick={handleBulkDelete} className="text-danger hover:text-danger hover:bg-rose-50 dark:hover:bg-danger/10">Delete Tasks</AppButton>
            )}
            <AppButton variant="ghost" size="sm" onClick={() => setSelectedTaskIds(new Set())}>Cancel</AppButton>
          </div>
        </div>
      )}

      {/* Bulk Status Update Modal */}
      <Dialog open={bulkStatusModalOpen} onOpenChange={setBulkStatusModalOpen}>
        <DialogContent className="sm:max-w-[425px] theme-card-structural dark:bg-[#0B0F19] border-border dark:border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-theme-heading">Bulk Update Tasks</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-sm font-medium mb-1">Updating {selectedTaskIds.size} Tasks</div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-bold text-muted uppercase tracking-wider">From Status (Current)</label>
                <select
                  value={bulkOldStatus}
                  onChange={(e) => setBulkOldStatus(e.target.value)}
                  className="w-full text-[13px] theme-card-structural border-border rounded-lg px-3 py-2 outline-none focus:border-theme-btn-primary focus:ring-1 focus:ring-theme-btn-primary"
                >
                  <option value="">Any Status</option>
                  {masterStatuses.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-bold text-muted uppercase tracking-wider">To Status (New)</label>
                <select
                  value={bulkNewStatus}
                  onChange={(e) => setBulkNewStatus(e.target.value)}
                  className="w-full text-[13px] theme-card-structural border-border rounded-lg px-3 py-2 outline-none focus:border-theme-btn-primary focus:ring-1 focus:ring-theme-btn-primary"
                >
                  <option value="">Leave Unchanged</option>
                  {masterStatuses.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-bold text-muted uppercase tracking-wider">From Department (Current)</label>
                <select
                  value={bulkOldDepartment}
                  onChange={(e) => setBulkOldDepartment(e.target.value)}
                  className="w-full text-[13px] theme-card-structural border-border rounded-lg px-3 py-2 outline-none focus:border-theme-btn-primary focus:ring-1 focus:ring-theme-btn-primary"
                >
                  <option value="">Any Department</option>
                  {departments.map((dep) => (
                    <option key={dep.id} value={dep.id}>{dep.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-bold text-muted uppercase tracking-wider">To Department (New)</label>
                <select
                  value={bulkNewDepartment}
                  onChange={(e) => setBulkNewDepartment(e.target.value)}
                  className="w-full text-[13px] theme-card-structural border-border rounded-lg px-3 py-2 outline-none focus:border-theme-btn-primary focus:ring-1 focus:ring-theme-btn-primary"
                >
                  <option value="">Leave Unchanged</option>
                  {departments.map((dep) => (
                    <option key={dep.id} value={dep.id}>{dep.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-bold text-muted uppercase tracking-wider">Remark (Optional)</label>
              <textarea
                value={bulkRemark}
                onChange={(e) => setBulkRemark(e.target.value)}
                placeholder="Why are you updating these tasks?"
                className="w-full text-[13px] theme-card-structural border-border rounded-lg px-3 py-2 outline-none focus:border-theme-btn-primary focus:ring-1 focus:ring-theme-btn-primary min-h-[80px] resize-none"
              />
            </div>
            <div className="text-[10px] text-warning">Note: Tasks you don't own will fail to update unless you are a super admin.</div>
          </div>
          <DialogFooter>
            <AppButton variant="ghost" onClick={() => setBulkStatusModalOpen(false)}>Cancel</AppButton>
            <AppButton 
              variant="primary" 
              onClick={handleBulkStatusSave}
              disabled={inlineLoading || (!bulkNewStatus && !bulkNewDepartment)}
            >
              {inlineLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update Tasks
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inline Status Update Modal */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="sm:max-w-[425px] theme-card-structural dark:bg-[#0B0F19] border-border dark:border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-theme-heading">Update Status</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-sm font-medium mb-1">Task: {inlineTask?.title || 'Unknown'}</div>
            
            {true ? (
              <div className="grid gap-2">
                <label className="text-sm font-bold text-muted uppercase tracking-wider">New Status</label>
                <select
                  value={inlineNewStatus}
                  onChange={(e) => setInlineNewStatus(e.target.value)}
                  className="w-full text-[13px] theme-card-structural border-border rounded-lg px-3 py-2 outline-none focus:border-theme-btn-primary focus:ring-1 focus:ring-theme-btn-primary"
                >
                  <option value="" disabled>Select Status</option>
                  {masterStatuses.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="text-xs text-warning bg-amber-50 p-2 rounded border border-amber-200">
                You are not the assignee for this task. You can only leave a remark/comment.
              </div>
            )}
            
            <div className="grid gap-2">
              <label className="text-sm font-bold text-muted uppercase tracking-wider">Remark (Required)</label>
              <textarea
                value={inlineRemark}
                onChange={(e) => setInlineRemark(e.target.value)}
                placeholder="Why are you updating this task?"
                className="w-full text-[13px] theme-card-structural border-border rounded-lg px-3 py-2 outline-none focus:border-theme-btn-primary focus:ring-1 focus:ring-theme-btn-primary min-h-[80px] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <AppButton variant="ghost" onClick={() => setStatusModalOpen(false)}>Cancel</AppButton>
            <AppButton 
              variant="primary" 
              onClick={handleStatusSave}
              disabled={inlineLoading || !inlineRemark.trim()}
            >
              {inlineLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {(inlineTask?.assigned_to === currentUserId || hasPermission("WORKSPACES_MANAGE")) && inlineNewStatus !== inlineTask?.status_id ? "Change Status" : "Add Remark"}
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inline Department Update Modal */}
      <Dialog open={departmentModalOpen} onOpenChange={setDepartmentModalOpen}>
        <DialogContent className="sm:max-w-[425px] theme-card-structural dark:bg-[#0B0F19] border-border dark:border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-theme-heading">Update Department</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-sm font-medium mb-1">Task: {inlineTask?.title || 'Unknown'}</div>
            
            {true ? (
              <div className="grid gap-2">
                <label className="text-sm font-bold text-muted uppercase tracking-wider">New Department</label>
                <select
                  value={inlineNewDepartment}
                  onChange={(e) => setInlineNewDepartment(e.target.value)}
                  className="w-full text-[13px] theme-card-structural border-border rounded-lg px-3 py-2 outline-none focus:border-theme-btn-primary focus:ring-1 focus:ring-theme-btn-primary"
                >
                  <option value="">-- No Department --</option>
                  {departments.map((dep) => (
                    <option key={dep.id} value={dep.id}>{dep.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="text-xs text-warning bg-amber-50 p-2 rounded border border-amber-200">
                You are not the assignee for this task. You can only leave a remark/comment.
              </div>
            )}
            
            <div className="grid gap-2">
              <label className="text-sm font-bold text-muted uppercase tracking-wider">Remark (Required)</label>
              <textarea
                value={inlineRemark}
                onChange={(e) => setInlineRemark(e.target.value)}
                placeholder="Why are you updating this task?"
                className="w-full text-[13px] theme-card-structural border-border rounded-lg px-3 py-2 outline-none focus:border-theme-btn-primary focus:ring-1 focus:ring-theme-btn-primary min-h-[80px] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <AppButton variant="ghost" onClick={() => setDepartmentModalOpen(false)}>Cancel</AppButton>
            <AppButton 
              variant="primary" 
              onClick={handleDepartmentSave}
              disabled={inlineLoading || !inlineRemark.trim()}
            >
              {inlineLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {(inlineTask?.assigned_to === currentUserId || hasPermission("WORKSPACES_MANAGE")) && inlineNewDepartment !== inlineTask?.department_id ? "Change Department" : "Add Remark"}
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWorkspaceSelector} onOpenChange={setShowWorkspaceSelector}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden theme-card-structural dark:bg-[#0a0d14] border-border dark:border-border shadow-xl">
          <DialogHeader className="px-6 py-4 border-b border-border/50 dark:border-border">
            <DialogTitle>Select Workspace for Task</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="block theme-data-value text-subtle  mb-1">Target Workspace <span className="text-danger">*</span></label>
              <select
                value={creationWorkspaceId}
                onChange={(e) => {
                  setCreationWorkspaceId(e.target.value);
                  setCreationSubWorkspaceId("");
                }}
                className="w-full text-sm p-2.5 border-border dark:border-border rounded-md theme-card-structural dark:bg-[#0a0d14] text-theme-heading focus:ring-theme-btn-primary focus:border-theme-btn-primary"
              >
                <option value="">-- Select Workspace --</option>
                {allWorkspaces.filter(w => !w.parent_workspace_id).map(w => (
                  <option key={w.id} value={w.id}>{w.workspace_name || w.name}</option>
                ))}
              </select>
            </div>
            
            {creationWorkspaceId && (
              <div>
                <label className="block theme-data-value text-subtle  mb-1">Sub-Workspace (Optional)</label>
                <select
                  value={creationSubWorkspaceId}
                  onChange={(e) => setCreationSubWorkspaceId(e.target.value)}
                  className="w-full text-sm p-2.5 border-border dark:border-border rounded-md theme-card-structural dark:bg-[#0a0d14] text-theme-heading focus:ring-theme-btn-primary focus:border-theme-btn-primary"
                >
                  <option value="">-- None --</option>
                  {allWorkspaces.filter(sw => sw.parent_workspace_id === creationWorkspaceId).map(sw => (
                    <option key={sw.id} value={sw.id}>{sw.workspace_name || sw.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50 dark:border-border bg-surface dark:theme-card-structural /5">
            <AppButton variant="outline" onClick={() => setShowWorkspaceSelector(false)}>Cancel</AppButton>
            <AppButton 
              variant="primary" 
              disabled={!creationWorkspaceId} 
              onClick={() => {
                setShowWorkspaceSelector(false);
                setIsCreatingTask(true);
              }}
            >
              Continue
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isCreatingTask && (
        <TaskCreationWizard 
          workspaceId={creationSubWorkspaceId || creationWorkspaceId || ""} 
          onClose={() => setIsCreatingTask(false)}
          onSuccess={async (data) => {
            try {
              setIsCreatingTask(false);
              await createTask({ ...data, workspace_id: creationSubWorkspaceId || creationWorkspaceId });
              // Force refresh of tasks after creating
              fetchTasksData(1, false, selectedWorkspaceId);
            } catch (e: any) {
              console.error("[TaskListViewClient] Error creating task:", e);
              toast.error(e.message || "Failed to create task");
            }
          }}
        />
      )}
    </ExperienceProvider>
  );
}

