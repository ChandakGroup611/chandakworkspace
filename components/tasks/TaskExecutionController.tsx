"use client";

import React, { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import { useTheme } from "@/components/theme/ThemeProvider";
import { 
  CheckSquare, Paperclip, Users2, Activity, Play, CheckCircle2, 
  XCircle, RotateCcw, Plus, Download, Loader2, Trash2, FolderPlus, Pin,
  ChevronDown, ChevronUp, MessageSquare, Clock, ExternalLink, Eye
} from "lucide-react";
import { 
  getTaskDetails, updateTask, deleteTask, transitionTaskStatus, resolveTask, 
  approveTask, reopenTask, createChecklistItem, 
  createTaskAttachment, getTaskComments, addTaskRemark, getTaskStatuses,
  getTaskChecklists, getTaskAttachments
} from "@/lib/actions/tasks";
import { toggleChecklistItem } from "@/lib/actions/workspaces";
import { useRouter } from "next/navigation";
import { ExperienceProvider } from "@/components/theme/ExperienceProvider";
import { usePermissions } from "@/hooks/usePermissions";

export default function TaskExecutionController({ taskId, onUpdate, initialTask, initialStatuses }: { taskId: string; onUpdate?: () => void; initialTask?: any; initialStatuses?: any[] }) {
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze"].includes(theme);

  const router = useRouter();
  const { hasPermission } = usePermissions();
  const canDelete = hasPermission("TASKS_DELETE");
  const [task, setTask] = useState<any>(initialTask || null);
  const [statuses, setStatuses] = useState<any[]>(initialStatuses || []);
  const [loading, setLoading] = useState(!initialTask);
  const [activeTab, setActiveTab] = useState<"checklist" | "attachments">("checklist");
  
  // Lazy Load States
  const [isChecklistsLoaded, setIsChecklistsLoaded] = useState(false);
  const [isAttachmentsLoaded, setIsAttachmentsLoaded] = useState(false);
  const [isCommentsLoaded, setIsCommentsLoaded] = useState(false);
  const [isLoadingTab, setIsLoadingTab] = useState(false);
  
  // Input fields
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [newChecklistLabel, setNewChecklistLabel] = useState("");
  const [newFileName, setNewFileName] = useState("");

  const [showAttachmentInput, setShowAttachmentInput] = useState(false);
  const [remarksDraft, setRemarksDraft] = useState("");
  const [saveRemarksLoading, setSaveRemarksLoading] = useState(false);
  const [remarksHistory, setRemarksHistory] = useState<any[]>([]);
  const [remarksHistoryLoading, setRemarksHistoryLoading] = useState(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [localCustomFields, setLocalCustomFields] = useState<Record<string, any>>({});
  const [pendingChecklists, setPendingChecklists] = useState<string[]>([]);
  const [editedChecklists, setEditedChecklists] = useState<Record<string, boolean>>({});
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingTaskUpdates, setPendingTaskUpdates] = useState<Record<string, any>>({});

  const loadTaskDetails = async (forceUpdate = false) => {
    if (!forceUpdate && initialTask && task) return;
    setLoading(true);
    setError(null);
    setPendingStatus(null);
    try {
      const details = await getTaskDetails(taskId);
      if (details?.error) throw new Error("Load Error: " + details.error);
      
      setTask((prev: any) => ({
        ...details,
        checklists: prev?.checklists || [],
        attachments: prev?.attachments || []
      }));
      setRemarksDraft("");
      // Initialize editable custom fields
      setLocalCustomFields(details.custom_fields || {});
      
      const st = await getTaskStatuses();
      setStatuses(st);
      
      // Default to collapsed for progressive load
      setIsHistoryCollapsed(true);
      
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to load task details.");
    } finally {
      setLoading(false);
    }
  };

  // Lazy loaders for tabs
  const loadChecklists = async (force = false) => {
    if (isChecklistsLoaded && !force) return;
    setIsLoadingTab(true);
    try {
      const data = await getTaskChecklists(taskId);
      setTask((prev: any) => ({ ...prev, checklists: data }));
      setIsChecklistsLoaded(true);
    } finally {
      setIsLoadingTab(false);
    }
  };

  const loadAttachments = async (force = false) => {
    if (isAttachmentsLoaded && !force) return;
    setIsLoadingTab(true);
    try {
      const data = await getTaskAttachments(taskId);
      setTask((prev: any) => ({ ...prev, attachments: data }));
      setIsAttachmentsLoaded(true);
    } finally {
      setIsLoadingTab(false);
    }
  };

  const loadComments = async (force = false) => {
    if (isCommentsLoaded && !force) return;
    setRemarksHistoryLoading(true);
    try {
      const comments = await getTaskComments(taskId, 20, 0);
      if (comments && !Array.isArray(comments) && 'error' in comments) {
        throw new Error("Comments Error: " + comments.error);
      }
      setRemarksHistory(Array.isArray(comments) ? comments : []);
      setIsCommentsLoaded(true);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to load comments.");
    } finally {
      setRemarksHistoryLoading(false);
    }
  };

  // Trigger loaders on tab change
  useEffect(() => {
    if (!task) return;
    if (activeTab === "checklist") loadChecklists();
    if (activeTab === "attachments") loadAttachments();
  }, [activeTab, task?.id]);

  // Handle remarks history expansion
  useEffect(() => {
    if (!isHistoryCollapsed) {
      loadComments();
    }
  }, [isHistoryCollapsed]);

  useEffect(() => {
    if (initialTask) {
      const defaultFields = initialTask.custom_fields || {};
      if (!('link_url' in defaultFields)) defaultFields.link_url = "";
      setLocalCustomFields(defaultFields);
      setIsHistoryCollapsed(true);
    } else {
      loadTaskDetails(true);
    }
  }, [taskId]);

  // Mark mentions as read when task opens
  useEffect(() => {
    async function clearMentions() {
      if (!taskId) return;
      try {
        await fetch('/api/mentions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _action: 'mark_read', taskId }) });
      } catch (e) {
        // fallback to calling server action directly if available
        try {
          // server action invocation via import isn't possible from client; rely on API route above
        } catch (err) {}
      }
    }
    clearMentions();
  }, [taskId]);



  const handleStatusTransition = async (action: "start" | "resolve" | "approve" | "reopen") => {
    if (action === "start") {
      setPendingStatus("ST_IN_PROGRESS");
    } else if (action === "resolve") {
      setPendingStatus("ST_RESOLVED");
    } else if (action === "approve") {
      setActionLoading(true);
      try {
        const { approveTask } = await import("@/lib/actions/tasks");
        await approveTask(taskId);
        await loadTaskDetails(true);
      } catch (e: any) {
        setError(e.message || "Failed to approve task.");
      } finally {
        setActionLoading(false);
      }
    } else if (action === "reopen") {
      setActionLoading(true);
      try {
        const { reopenTask } = await import("@/lib/actions/tasks");
        await reopenTask(taskId);
        await loadTaskDetails(true);
      } catch (e: any) {
        setError(e.message || "Failed to reopen task.");
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleToggleChecklist = async (itemId: string, currentStatus: boolean) => {
    setError(null);
    // Record edit locally; DB update will be performed on batch save
    setEditedChecklists(prev => ({ ...prev, [itemId]: !currentStatus }));
    // Optimistically update UI
    setTask((prev: any) => ({
      ...prev,
      checklists: prev.checklists.map((item: any) =>
        item.id === itemId ? { ...item, is_completed: !currentStatus } : item
      )
    }));
  };

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistLabel.trim()) return;
    setError(null);
    // Queue new checklist label for batch creation
    setPendingChecklists(prev => [...prev, newChecklistLabel.trim()]);
    // Optimistically add placeholder to UI
    setTask((prev: any) => ({
      ...prev,
      checklists: [...(prev.checklists || []), { id: `temp-${Date.now()}`, label: newChecklistLabel.trim(), is_completed: false }]
    }));
    setNewChecklistLabel("");
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    // Queue file for batch upload
    setPendingFiles(prev => [...prev, file]);
    // Optimistically add placeholder attachment to UI
    setTask((prev: any) => ({
      ...prev,
      attachments: [...(prev.attachments || []), { id: `temp-file-${Date.now()}`, file_name: file.name, is_temp: true }]
    }));
  };
  const handleCustomFieldChange = (key: string, value: string) => {
    setLocalCustomFields(prev => ({ ...prev, [key]: value }));

    setLocalCustomFields(prev => ({ ...prev, [key]: value }));
  };




  if (loading) {
    return (
      <AppCard className="p-8 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Hydrating Task details...</p>
      </AppCard>
    );
  }

  const handleBatchSave = async () => {
    if (!task) return;

    if (!remarksDraft.trim()) {
      alert("Task remarks are mandatory to save any updates or status changes. Please scroll down to the 'Task Remarks' section to enter your remarks.");
      return;
    }

    setSaveRemarksLoading(true);
    setError(null);
    try {
      // 1. Process pending status change
      if (pendingStatus) {
        let res: any;
        if (pendingStatus === "ST_IN_PROGRESS") {
          res = await transitionTaskStatus(taskId, "ST_IN_PROGRESS");
        } else if (pendingStatus === "ST_RESOLVED") {
          res = await resolveTask(taskId);
        } else if (pendingStatus === "ST_CLOSED") {
          res = await approveTask(taskId);
        } else if (pendingStatus === "ST_REOPEN") {
          res = await reopenTask(taskId);
        } else {
          res = await transitionTaskStatus(taskId, pendingStatus);
        }
        if (res?.error) throw new Error("Status Error: " + res.error);
      }

      // 2. Create new checklists
      for (const label of pendingChecklists) {
        const newItem = await createChecklistItem(taskId, label);
        // replace temp placeholder with real item
        setTask((prev: any) => {
          const updated = prev.checklists.map((c: any) => c.label === label && c.is_temp ? newItem : c);
          return { ...prev, checklists: updated };
        });
      }

      // 3. Apply edited checklist statuses
      for (const [chkId, newStatus] of Object.entries(editedChecklists)) {
        await toggleChecklistItem(chkId, newStatus);
      }

      // 4. Upload pending files
      for (const file of pendingFiles) {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        await createTaskAttachment(taskId, file.name, dataUrl, file.size);
      }

      // 5. Save custom fields and pending properties if changed
      const updatePayload: any = {};
      
      // Only include custom fields if they actually changed
      if (Object.keys(localCustomFields).length) {
        if (JSON.stringify(localCustomFields) !== JSON.stringify(task.custom_fields || {})) {
          updatePayload.custom_fields = localCustomFields;
        }
      }

      if (Object.keys(pendingTaskUpdates).length) Object.assign(updatePayload, pendingTaskUpdates);
      
      if (Object.keys(updatePayload).length > 0) {
        const res = await updateTask(taskId, updatePayload);
        if (res?.error) throw new Error("Update Error: " + res.error);
      }

      // 6. Save remark if present
      if (remarksDraft.trim()) {
        const res = await addTaskRemark(taskId, remarksDraft);
        if (res?.error) throw new Error("Remark Error: " + res.error);
        if (res?.data) {
          setRemarksHistory(prev => [...prev, res.data]);
        }
      }

      // Reset pending states
      setPendingStatus(null);
      setPendingChecklists([]);
      setEditedChecklists({});
      setPendingFiles([]);
      setRemarksDraft("");

      await loadTaskDetails(true);
      if (isChecklistsLoaded) await loadChecklists(true);
      if (isAttachmentsLoaded) await loadAttachments(true);
      if (isCommentsLoaded || !isHistoryCollapsed) await loadComments(true);

      triggerToast("Task updated successfully");
      if (onUpdate) {
        onUpdate();
      } else {
        // If no onUpdate callback is provided, we are on the standalone page, so route back to list
        setTimeout(() => {
          router.push(task.workspace_id ? `/workspaces?workspace=${task.workspace_id}` : "/workspaces");
        }, 1000);
      }
      // Note: router.refresh() removed — it caused Server Component re-render errors.
      // State is refreshed via loadTaskDetails() above.
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to save changes.");
      setTimeout(() => setError(null), 8000);
    } finally {
      setSaveRemarksLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm("Delete this task? This action can be restored only by a database administrator.")) return;
    setDeleteLoading(true);
    setError(null);
    try {
      const res = await deleteTask(taskId);
      if (res?.error) {
        throw new Error(res.error);
      }
      onUpdate?.();
      triggerToast("Task deleted successfully");
      // Need a slight delay to allow the toast to render before redirecting
      setTimeout(() => {
        router.push("/workspaces");
      }, 1500);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to delete task.");
      setTimeout(() => setError(null), 8000);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!task) return null;

  const currentStatusCode = task.status?.code || "ST_OPEN";
  const progressPercentage = task.progress_percentage || 0;

  const isFrozen = task.status?.is_closed;
  
  // Roles
  const isOwner = task.currentUserCanAct; // Owner/Assignee or SuperAdmin
  const isExecutor = task.task_assignees?.some((a: any) => a.id === task.currentUserId) || false;
  const isWatcherOrReviewer = task.task_watchers?.some((w: any) => w.id === task.currentUserId) || false;
  
  // Owners and Executors can edit core properties
  const canEditCore = (isOwner || isExecutor) && !isFrozen;
  const canEditAux = canEditCore;
  const canDeleteTask = isOwner && canDelete;
  
  // Reviewers & Watchers
  const canAddRemark = (canEditAux || isWatcherOrReviewer) && !isFrozen;
  // Filter inherited workspace members to remove anyone explicitly assigned
  const explicitExecutors = [...(task.task_assignees || [])];
  
  // Implicitly treat the Primary Assignee as an Executor
  if (task.assignee && !explicitExecutors.some((e: any) => e.id === task.assignee.id)) {
    explicitExecutors.unshift(task.assignee);
  }

  const explicitReviewers = task.task_reviewers || [];
  const explicitWatchers = [...(task.task_watchers || [])];

  if (task.inherited_users && task.inherited_users.length > 0) {
    task.inherited_users.forEach((u: any) => {
      if (task.assignee?.id === u.id) return;
      if (explicitExecutors.some((e: any) => e.id === u.id)) return;
      if (explicitReviewers.some((e: any) => e.id === u.id)) return;
      if (explicitWatchers.some((e: any) => e.id === u.id)) return;
      
      // All inherited workspace access defaults to being a Watcher
      explicitWatchers.push(u);
    });
  }

  return (
    <ExperienceProvider mode="compact">
    <AppCard className="p-4 space-y-4 border-t-2 border-t-blue-500">
      
      {/* Sleek Error Notification Banner */}
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center justify-between animate-in slide-in-from-top-1">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs text-rose-400/60 hover:text-rose-400 font-bold px-2">Dismiss</button>
        </div>
      )}

      {/* Title & Core Meta removed to avoid duplication with parent page layout */}
      
      {/* Extended Metadata Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3 bg-gray-50/50 dark:bg-[#111827] p-3 rounded-md border border-gray-100 dark:border-white/5">
          <div className="space-y-1">
            <span className="text-[0.7rem] font-bold uppercase tracking-wider text-gray-400">Priority</span>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.priority?.color || '#cbd5e1' }} />
              <span className="text-xs font-medium dark:text-gray-200">{task.priority?.name || "Standard"}</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[0.7rem] font-bold uppercase tracking-wider text-gray-400">Start Date</span>
            <div className="text-xs font-medium dark:text-gray-200 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {task.start_date ? new Date(task.start_date).toLocaleDateString() : "Not set"}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[0.7rem] font-bold uppercase tracking-wider text-gray-400">Due Date</span>
            <div className="text-xs font-medium dark:text-gray-200 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {task.end_date ? new Date(task.end_date).toLocaleDateString() : "Not set"}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[0.7rem] font-bold uppercase tracking-wider text-gray-400">Duration (Days)</span>
            <div className="text-xs font-medium dark:text-gray-200 flex items-center gap-1.5">
              {task.currentUserIsSuperAdmin ? (
                <input
                  type="number"
                  className="w-16 px-1.5 py-0.5 border border-gray-200 dark:border-white/10 rounded-md bg-white dark:bg-[#0B0F19] text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={task.start_date && task.end_date ? Math.max(1, Math.round((new Date(task.end_date).getTime() - new Date(task.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1) : 0}
                  onChange={(e) => {
                    if (!task.start_date) return;
                    const days = parseInt(e.target.value, 10);
                    if (!isNaN(days) && days > 0) {
                      const startDate = new Date(task.start_date);
                      startDate.setDate(startDate.getDate() + (days - 1));
                      const newEndDateStr = startDate.toISOString().split('T')[0];
                      setPendingTaskUpdates(prev => ({ ...prev, end_date: newEndDateStr }));
                      setTask((prev: any) => ({ ...prev, end_date: newEndDateStr }));
                    }
                  }}
                />
              ) : (
                <span>
                  {task.start_date && task.end_date ? Math.max(1, Math.round((new Date(task.end_date).getTime() - new Date(task.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1) : 0}
                </span>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[0.7rem] font-bold uppercase tracking-wider text-gray-400">Primary Assignee</span>
            <div className="flex items-center gap-1.5">
              {task.assignee ? (
                <>
                  {task.assignee.profile_photo ? (
                    <img src={task.assignee.profile_photo} alt="" className="w-5 h-5 rounded-full object-cover bg-gray-200" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                      {task.assignee.full_name?.substring(0, 2).toUpperCase() || "U"}
                    </div>
                  )}
                  <span className="text-xs font-medium dark:text-gray-200 truncate">{task.assignee.full_name}</span>
                </>
              ) : (
                <span className="text-xs font-medium text-gray-400 italic">Unassigned</span>
              )}
            </div>
          </div>
          {/* Executors */}
          <div className="space-y-1">
            <span className="text-[0.7rem] font-bold uppercase tracking-wider text-emerald-500">Executors</span>
            <div className="text-xs font-medium dark:text-gray-200">
              {explicitExecutors.length > 0 ? explicitExecutors.map((p: any) => p.full_name).join(', ') : <span className="text-gray-400 italic">None</span>}
            </div>
          </div>
          
          {/* Reviewers */}
          <div className="space-y-1">
            <span className="text-[0.7rem] font-bold uppercase tracking-wider text-blue-500">Reviewers</span>
            <div className="text-xs font-medium dark:text-gray-200">
              {explicitReviewers.length > 0 ? explicitReviewers.map((p: any) => p.full_name).join(', ') : <span className="text-gray-400 italic">None</span>}
            </div>
          </div>

          {/* Watchers */}
          <div className="space-y-1">
            <span className="text-[0.7rem] font-bold uppercase tracking-wider text-amber-500">Watchers</span>
            <div className="text-xs font-medium dark:text-gray-200">
              {explicitWatchers.length > 0 ? explicitWatchers.map((p: any) => p.full_name).join(', ') : <span className="text-gray-400 italic">None</span>}
            </div>
          </div>
        </div>

        {/* Editable Custom Fields */}
        {localCustomFields && Object.keys(localCustomFields).length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Custom Properties</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(localCustomFields).map(([key, val]) => {
                const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
                const isReadOnly = false;
                return (
                  <div key={key} className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      {key.replace(/_/g, ' ')}
                    </label>
                    {isReadOnly || !canEditCore ? (
                      <div className={`w-full p-2 rounded-md text-[13px] border ${normalizedKey !== 'link_url' && 'cursor-not-allowed'} ${
                        isLightMode ? "bg-gray-100 border-gray-200 text-gray-700" : "bg-[#0B0F19]/50 border-white/5 text-gray-400"
                      }`}>
                        {normalizedKey === 'link_url' && val ? (
                          <a href={String(val).startsWith('http') ? String(val) : `https://${val}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{String(val)}</a>
                        ) : (
                          String(val)
                        )}
                      </div>
                    ) : (
                      <div className="relative flex items-center">
                        <AppInput 
                          value={String(val)} 
                          onChange={e => handleCustomFieldChange(key, e.target.value)} 
                          className={normalizedKey === 'link_url' && val ? "pr-8" : ""}
                        />
                        {normalizedKey === 'link_url' && val && (
                          <a 
                            href={String(val).startsWith('http') ? String(val) : `https://${val}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            title="Open Link"
                            className="absolute right-2 text-blue-500 hover:text-blue-600 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {/* Interactive Lifecycle State Transition Panel */}
      <div className={`p-3 rounded-md border space-y-3 ${
        isLightMode ? "bg-gray-50 border-gray-200" : "bg-white/[0.01] border-white/5"
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Status Field</label>
            <select
              value={pendingStatus || currentStatusCode}
              disabled={!canEditCore}
              onChange={(e) => {
                const newCode = e.target.value;
                if (newCode === currentStatusCode) {
                  setPendingStatus(null);
                } else {
                  setPendingStatus(newCode);
                }
              }}
              className={`w-full p-1.5 rounded-md text-[13px] border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-[#0B0F19] border-white/10 text-white"
              } ${!canEditCore ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {statuses.map(st => (
                <option key={st.id} value={st.code || st.status_code}>{st.name || st.status_name}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-1">
              Quick Action Operations
            </label>
            <div className="flex flex-wrap gap-2">
              {currentStatusCode === "ST_OPEN" && canEditCore && (
                <AppButton 
                  size="sm" 
                  variant="primary" 
                  className="bg-indigo-600 hover:bg-indigo-700"
                  leftIcon={<Play className="h-3.5 w-3.5" />}
                  disabled={actionLoading}
                  onClick={() => handleStatusTransition("start")}
                >
                  Start Progress
                </AppButton>
              )}

              {currentStatusCode === "ST_IN_PROGRESS" && canEditCore && (
                <AppButton 
                  size="sm" 
                  variant="primary" 
                  className="bg-emerald-600 hover:bg-emerald-700"
                  leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  disabled={actionLoading}
                  onClick={() => handleStatusTransition("resolve")}
                >
                  Resolve Directive
                </AppButton>
              )}

              {currentStatusCode === "ST_RESOLVED" && task.currentUserCanAct && (
                <>
                  <AppButton 
                    size="sm" 
                    variant="primary" 
                    className="bg-blue-600 hover:bg-blue-700"
                    leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    disabled={actionLoading}
                    onClick={() => handleStatusTransition("approve")}
                  >
                    Approve & Close
                  </AppButton>
                  <AppButton 
                    size="sm" 
                    variant="ghost" 
                    className="text-rose-400 hover:bg-rose-500/10"
                    leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                    disabled={actionLoading}
                    onClick={() => handleStatusTransition("reopen")}
                  >
                    Reject & Reopen
                  </AppButton>
                </>
              )}

              {task.status?.is_closed && task.currentUserCanAct && (
                <AppButton 
                  size="sm" 
                  variant="outline" 
                  leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                  disabled={actionLoading}
                  onClick={() => handleStatusTransition("reopen")}
                >
                  Reopen Task
                </AppButton>
              )}

              <div className="flex-1" />
              {canDeleteTask && (
                <AppButton 
                  variant="outline" 
                  size="sm" 
                  className="text-rose-400 hover:bg-rose-500/10 border-rose-500/20 hover:border-rose-500/50" 
                  onClick={handleDeleteTask} 
                  disabled={deleteLoading}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Task
                </AppButton>
              )}
            </div>
          </div>
        </div>

        {pendingStatus && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-xl flex items-center justify-between animate-in slide-in-from-top-1">
            <span>Status change to <strong>{statuses.find(s => s.status_code === pendingStatus)?.status_name || pendingStatus}</strong> is pending. Write a mandatory remark below and click <strong>"Commit Status & Save Remark"</strong> to save both.</span>
            <button onClick={() => setPendingStatus(null)} className="text-xs text-amber-400/60 hover:text-amber-400 font-bold px-2 underline hover:no-underline">Cancel Change</button>
          </div>
        )}
 
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Task Remarks</label>
          <textarea
            value={remarksDraft}
            onChange={e => setRemarksDraft(e.target.value)}
            disabled={!canAddRemark}
            className={`w-full min-h-[64px] p-2 rounded-md text-[13px] border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${
              isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-[#0B0F19] border-white/10 text-white"
            } ${!canAddRemark ? 'opacity-50 cursor-not-allowed' : ''}`}
            placeholder={!canAddRemark ? "Task is frozen/read-only." : "Add update notes or handoff remarks..."}
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-500">Last updated: {task.updated_at ? new Date(task.updated_at).toLocaleString() : "Not yet"}</span>
            {canAddRemark && (
              <AppButton type="button" variant="primary" size="sm" onClick={handleBatchSave} disabled={saveRemarksLoading}>
                {saveRemarksLoading ? "Saving..." : pendingStatus ? "Commit Status & Save Remark" : "Save Remarks"}
              </AppButton>
            )}
          </div>

          {/* Remarks History Queue */}
          <div className={`mt-3 rounded-md border p-3 transition-all duration-150 ${
            isLightMode ? "bg-gray-50 border-gray-200 text-gray-900" : "bg-white/[0.02] border-white/5 text-white"
          }`}>
            {/* Header with toggle */}
            <div 
              onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)} 
              className="flex items-center justify-between cursor-pointer select-none group"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <span className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  isLightMode ? "text-gray-700 group-hover:text-blue-600" : "text-gray-400 group-hover:text-blue-400"
                }`}>
                  Remarks History Queue
                </span>
                {remarksHistory.length > 0 && (
                  <AppBadge className="text-xs py-0.5 px-2 font-extrabold rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    {remarksHistory.length}
                  </AppBadge>
                )}
              </div>
              
              <button 
                type="button"
                className={`p-1 rounded-lg transition-colors ${
                  isLightMode ? "hover:bg-gray-200 text-gray-500 hover:text-gray-900" : "hover:bg-white/10 text-gray-400 hover:text-white"
                }`}
              >
                {isHistoryCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Collapsible Content */}
            {!isHistoryCollapsed && (
              <div className="mt-4 space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-transparent">
                {remarksHistoryLoading ? (
                  <div className="flex items-center justify-center py-6 gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                    <span className="text-xs text-gray-400">Loading history queue...</span>
                  </div>
                ) : remarksHistory.length === 0 ? (
                  <div className="text-center py-6 text-xs text-gray-500 italic">
                    No remark history entries. Create a new remark above to start the queue.
                  </div>
                ) : (
                  <div className="relative pl-4 border-l border-purple-500/20 space-y-5">
                    {remarksHistory.map((item, index) => {
                      const initials = (item.user?.full_name || "Unknown")
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2);
                      
                      return (
                        <div key={item.id} className="relative group/item">
                          {/* Timeline Node Point */}
                          <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-purple-500 border-2 border-slate-900 group-hover/item:scale-125 transition-transform" />
                          
                          <div className="flex items-start gap-3">
                            {/* Avatar */}
                            {item.user?.profile_photo ? (
                              <img 
                                src={item.user.profile_photo} 
                                alt={item.user.full_name} 
                                className="h-7 w-7 rounded-full border border-purple-500/20 object-cover"
                              />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-xs font-extrabold text-white border border-purple-500/20 shadow-md">
                                {initials}
                              </div>
                            )}

                            {/* Content Block */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1">
                                <span className={`text-xs font-bold transition-colors ${
                                  isLightMode ? "text-gray-800 group-hover/item:text-purple-600" : "text-gray-200 group-hover/item:text-purple-300"
                                }`}>
                                  {item.user?.full_name || "System Actor"}
                                </span>
                                <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                                  <Clock className="h-3 w-3" />
                                  <span>{new Date(item.created_at).toLocaleString()}</span>
                                </div>
                              </div>
                              
                              <p className={`text-xs rounded-lg p-2.5 leading-relaxed break-words whitespace-pre-wrap border ${
                                isLightMode ? "bg-gray-100 border-gray-200/50 text-gray-700" : "bg-black/30 border-white/5 text-gray-300"
                              }`}>
                                {item.message || item.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className={`flex border-b border-gray-200 dark:border-white/5`}>
        {(["checklist", "attachments"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            onMouseEnter={() => {
              // Intelligent Prefetching on Hover
              if (tab === "checklist" && !isChecklistsLoaded) getTaskChecklists(taskId).then(d => { setTask((p:any) => ({...p, checklists: d})); setIsChecklistsLoaded(true); });
              if (tab === "attachments" && !isAttachmentsLoaded) getTaskAttachments(taskId).then(d => { setTask((p:any) => ({...p, attachments: d})); setIsAttachmentsLoaded(true); });
            }}
            className={`px-4 py-2 text-[11px] uppercase tracking-wider font-bold transition-all border-b-2 -mb-px flex items-center gap-1.5 ${
              activeTab === tab
                ? "border-blue-500 text-blue-500"
                : "border-transparent text-gray-500 hover:text-gray-400"
            }`}
          >
            {tab === "checklist" && <CheckSquare className="h-3.5 w-3.5" />}
            {tab === "attachments" && <Paperclip className="h-3.5 w-3.5" />}
            <span>{tab}</span>
          </button>
        ))}
      </div>

      {/* Dynamic Tab Body */}
      <div className="min-h-[180px] pr-1">
        
        {/* Checklist Tab */}
        {activeTab === "checklist" && (
          <div className="space-y-4">
            {canEditAux && (
              <form onSubmit={handleAddChecklist} className="flex gap-2">
                <AppInput 
                  placeholder="New operational checkoff point..." 
                  value={newChecklistLabel}
                  onChange={e => setNewChecklistLabel(e.target.value)}
                  className="h-9 text-xs"
                />
                <AppButton type="submit" variant="primary" size="sm" className="h-9 shrink-0"><Plus className="h-4 w-4"/></AppButton>
              </form>
            )}

            <div className="space-y-2">
              {(task.checklists || []).map((item: any) => (
                <div 
                  key={item.id} 
                  onClick={() => canEditAux && handleToggleChecklist(item.id, item.is_completed)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${canEditAux ? 'cursor-pointer' : 'cursor-default opacity-80'} ${
                    item.is_completed
                      ? (isLightMode ? "bg-emerald-50/40 border-emerald-100 opacity-60" : "bg-emerald-500/5 border-emerald-500/10 opacity-70")
                      : (isLightMode ? "bg-white border-gray-200" : "bg-white/[0.01] border-white/5")
                  }`}
                >
                  <input 
                    type="checkbox" 
                    checked={item.is_completed}
                    onChange={() => {}} // Controlled by parent div click
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4 shrink-0 pointer-events-none"
                  />
                  <span className={`text-xs ${item.is_completed ? "line-through text-gray-500" : isLightMode ? "text-gray-900" : "text-white"}`}>
                    {item.label}
                  </span>
                </div>
              ))}
              {(task.checklists || []).length === 0 && (
                <div className="text-center py-8 text-xs text-gray-500">No checklists created yet.</div>
              )}
            </div>
          </div>
        )}

        {/* Attachments Tab */}
        {activeTab === "attachments" && (
          <div className="space-y-4">
            {isLoadingTab && !isAttachmentsLoaded ? (
              <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-purple-500" /></div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Attachments</span>
                  {canEditAux && (
                    <button
                      type="button"
                      onClick={triggerFileSelect}
                      className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-2 text-gray-500 transition hover:bg-purple-50 hover:text-purple-600"
                      aria-label="Upload file"
                    >
                      <Pin className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileChange} 
                />

                {canEditAux && (
                  <div 
                    onClick={triggerFileSelect}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                      isLightMode 
                        ? "border-gray-200 bg-gray-50 hover:bg-gray-100/50" 
                        : "border-white/10 bg-white/[0.01] hover:bg-white/[0.02]"
                    }`}
                  >
                    {uploadingFile ? (
                      <div className="space-y-2 flex flex-col items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Uploading file...</span>
                      </div>
                    ) : (
                      <div className="space-y-2 flex flex-col items-center justify-center">
                        <Paperclip className="h-6 w-6 text-purple-400" />
                        <span className="text-xs font-bold text-purple-500 hover:text-purple-600 block">Click to select and upload file</span>
                        <span className="text-xs text-gray-500 block">Supports any document or image file</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  {(task.attachments || []).map((item: any) => (
                    <div 
                      key={item.id} 
                      className={`flex items-center justify-between p-3 rounded-xl border ${
                        isLightMode ? "bg-white border-gray-200" : "bg-white/[0.01] border-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="h-4 w-4 text-purple-400 shrink-0" />
                        <div className="truncate space-y-0.5">
                          <span className={`text-xs font-bold block truncate ${isLightMode ? "text-gray-900" : "text-white"}`}>{item.file_name}</span>
                          <span className="text-[0.7rem] text-gray-500 block">{(item.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <a 
                          href={item.file_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          title="View Attachment"
                          className="p-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 text-gray-400 hover:text-white transition-colors flex items-center justify-center"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </a>
                        <a 
                          href={`${item.file_url}?download=`} 
                          download
                          title="Download Attachment"
                          className="p-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 text-gray-400 hover:text-white transition-colors flex items-center justify-center"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                  {(task.attachments || []).length === 0 && (
                    <div className="text-center py-8 text-xs text-gray-500">No attachments linked to this directive.</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

      </div>
      
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <span className="text-xs font-semibold">{successToast}</span>
        </div>
      )}
    </AppCard>
    </ExperienceProvider>
  );
}
