"use client";

import React, { useState, useEffect, useRef } from "react";
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
  getTaskChecklists, getTaskAttachments, executeTaskBatchOperation
} from "@/lib/actions/tasks";
import { toggleChecklistItem } from "@/lib/actions/workspaces";
import { useRouter } from "next/navigation";
import { ExperienceProvider } from "@/components/theme/ExperienceProvider";
import { usePermissions } from "@/hooks/usePermissions";

export default function TaskExecutionController({ taskId, onUpdate, initialTask, initialStatuses, initialDepartments, readOnly = false }: { taskId: string; onUpdate?: () => void; initialTask?: any; initialStatuses?: any[]; initialDepartments?: any[]; readOnly?: boolean }) {
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);

  const router = useRouter();
  const { hasPermission } = usePermissions();
  const canDelete = !readOnly && hasPermission("TASKS_DELETE");
  const [task, setTask] = useState<any>(initialTask || null);
  const [statuses, setStatuses] = useState<any[]>(initialStatuses || []);
  const [departments, setDepartments] = useState<any[]>(initialDepartments || []);
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
  const [pendingDepartment, setPendingDepartment] = useState<string | null>(null);
  const [localCustomFields, setLocalCustomFields] = useState<Record<string, any>>({});
  const [pendingChecklists, setPendingChecklists] = useState<string[]>([]);
  const [editedChecklists, setEditedChecklists] = useState<Record<string, boolean>>({});
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingTaskUpdates, setPendingTaskUpdates] = useState<Record<string, any>>({});
  const [pendingAssignees, setPendingAssignees] = useState<string[] | null>(null);
  
  // Assignee Editing
  const [isEditingAssignees, setIsEditingAssignees] = useState(false);
  const [stakeholders, setStakeholders] = useState<any[]>([]);
  const [editingAssigneesList, setEditingAssigneesList] = useState<string[]>([]);
  const [isSavingAssignees, setIsSavingAssignees] = useState(false);
  
  // Click-outside reference for Executors Edit Panel
  const assigneesRef = useRef<HTMLDivElement>(null);
  
  // Transfer Feature & Advanced Scope Checking
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferWorkspaces, setTransferWorkspaces] = useState<any[]>([]);
  const [selectedTransferWorkspace, setSelectedTransferWorkspace] = useState("");
  const [selectedTransferSubworkspace, setSelectedTransferSubworkspace] = useState("");
  const [transferRemarks, setTransferRemarks] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  
  const [targetStakeholders, setTargetStakeholders] = useState<any[]>([]);
  const [checkingScope, setCheckingScope] = useState(false);
  const [droppedUsers, setDroppedUsers] = useState<any[]>([]);
  const [isOwnerDropped, setIsOwnerDropped] = useState(false);
  
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [newExecutors, setNewExecutors] = useState<string[]>([]);
  
  const handleOpenTransfer = async () => {
    setIsTransferModalOpen(true);
    if (transferWorkspaces.length === 0) {
      try {
        const { getTransferableWorkspaces } = await import('@/lib/actions/tasks');
        const workspaces = await getTransferableWorkspaces();
        setTransferWorkspaces(workspaces);
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    async function checkScope() {
      const targetId = selectedTransferSubworkspace || selectedTransferWorkspace;
      if (!targetId || targetId === task?.workspace_id) {
        setTargetStakeholders([]);
        setDroppedUsers([]);
        setIsOwnerDropped(false);
        return;
      }
      setCheckingScope(true);
      try {
        const { fetchWorkspaceStakeholders } = await import('@/lib/actions/workspaces');
        const stakeholders = await fetchWorkspaceStakeholders(targetId);
        setTargetStakeholders(stakeholders);
        
        // Compute delta
        const currentAssignee = task.assigned_to;
        const currentExecutors = task.task_assignees || [];
        const currentWatchers = task.task_watchers || [];
        
        const stakeholderIds = new Set(stakeholders.map((s: any) => s.id));
        
        const ownerMissing = currentAssignee && !stakeholderIds.has(currentAssignee);
        setIsOwnerDropped(!!ownerMissing);
        
        const dropped: any[] = [];
        if (ownerMissing && task.assignee) dropped.push(task.assignee);
        currentExecutors.forEach((e: any) => { if (!stakeholderIds.has(e.id)) dropped.push(e); });
        currentWatchers.forEach((w: any) => { if (!stakeholderIds.has(w.id)) dropped.push(w); });
        
        // Deduplicate dropped users
        const uniqueDropped = Array.from(new Map(dropped.map(item => [item.id, item])).values());
        setDroppedUsers(uniqueDropped);
        
        // Reset selections
        setNewAssigneeId("");
        setNewExecutors([]);
        
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingScope(false);
      }
    }
    checkScope();
  }, [selectedTransferWorkspace, selectedTransferSubworkspace, task]);

  const submitTransfer = async () => {
    if (!selectedTransferWorkspace) {
      setError("Please select a destination workspace.");
      return;
    }
    if (isOwnerDropped && !newAssigneeId) {
      setError("The primary assignee does not exist in the new workspace. You must select a new Primary Assignee.");
      return;
    }
    if (!transferRemarks.trim()) {
      setError("Please provide transfer remarks.");
      return;
    }
    setTransferLoading(true);
    setError(null);
    try {
      const { transferTask } = await import('@/lib/actions/tasks');
      const payload = {
        taskId,
        targetWorkspaceId: selectedTransferWorkspace,
        targetSubworkspaceId: selectedTransferSubworkspace || undefined,
        newAssigneeId: newAssigneeId || undefined,
        newExecutors: newExecutors.length > 0 ? newExecutors : undefined,
        droppedUsers: droppedUsers.map(u => u.id),
        remarks: transferRemarks
      };
      const res = await transferTask(payload);
      if (res?.error) throw new Error(res.error);
      triggerToast("Task transferred successfully!");
      setIsTransferModalOpen(false);
      setTimeout(() => router.push(`/workspaces/tasks?workspaceId=${selectedTransferWorkspace}`), 1000);
    } catch (err: any) {
      setError(err.message || "Failed to transfer task");
    } finally {
      setTransferLoading(false);
    }
  };
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isEditingAssignees && assigneesRef.current && !assigneesRef.current.contains(event.target as Node)) {
        setIsEditingAssignees(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditingAssignees]);

  const loadTaskDetails = async (forceUpdate = false) => {
    if (taskId === "new") return;
    if (!forceUpdate && initialTask && task) return;
    const t0 = performance.now();
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
      const t1 = performance.now();
      console.log(`[Performance] Task Open Duration (loadTaskDetails): ${(t1 - t0).toFixed(2)}ms`);
    }
  };

  // Lazy loaders for tabs
  const loadChecklists = async (force = false) => {
    if (taskId === "new") return;
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
    if (taskId === "new") return;
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

    const t0 = performance.now();
    setSaveRemarksLoading(true);
    setError(null);
    try {
      // Step 1: Upload pending files separately (Phase T6)
      const attachmentIds: string[] = [];
      const newAttachments: any[] = [];
      for (const file of pendingFiles) {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const att = await createTaskAttachment(taskId, file.name, dataUrl, file.size);
        if (att && att.id) {
           attachmentIds.push(att.id);
           newAttachments.push(att);
        }
      }

      // Step 2: Prepare Batch Payload
      const updatePayload: any = {};
      if (Object.keys(localCustomFields).length) {
        if (JSON.stringify(localCustomFields) !== JSON.stringify(task.custom_fields || {})) {
          updatePayload.custom_fields = localCustomFields;
        }
      }
      if (Object.keys(pendingTaskUpdates).length) Object.assign(updatePayload, pendingTaskUpdates);

      let finalStatusId = undefined;
      if (pendingStatus) {
         const matchedStatus = statuses.find(s => (s.code || s.status_code) === pendingStatus);
         if (matchedStatus) finalStatusId = matchedStatus.id;
         else finalStatusId = pendingStatus;
      }

      let departmentChangeObj = undefined;
      if (pendingDepartment !== null) {
         const matchedDept = departments.find(d => d.id === pendingDepartment);
         departmentChangeObj = {
            new_id: pendingDepartment,
            new_name: matchedDept?.name || matchedDept?.code || pendingDepartment,
            old_id: task.department_id,
            old_name: task.department?.name || 'None'
         };
      }

      const t1 = performance.now();
      const res = await executeTaskBatchOperation({
        taskId,
        updates: updatePayload,
        statusChanges: finalStatusId,
        departmentChange: departmentChangeObj,
        checklistCreates: pendingChecklists,
        checklistUpdates: editedChecklists,
        remarks: remarksDraft.trim(),
        attachmentIds
      });

      const t2 = performance.now();
      
      if (res?.error) throw new Error("Batch Save Error: " + res.error);

      if (pendingAssignees) {
        const { updateTaskAssignees } = await import("@/lib/actions/tasks");
        const assigneesRes = await updateTaskAssignees(taskId, task.workspace_id, pendingAssignees);
        if (assigneesRes.error) throw new Error(assigneesRes.error);
        setPendingAssignees(null);
        // Force hydration since assignment changed
        await loadTaskDetails(true);
      }

      // Step 3: Direct Hydration (Phase T5)
      if (res?.data) {
        setTask((prev: any) => {
          const newState = { ...prev };
          // Optimistically apply the changes
          if (updatePayload && Object.keys(updatePayload).length > 0) {
             Object.assign(newState, updatePayload);
          }
          if (finalStatusId) {
             const newStatusObj = statuses.find(s => s.id === finalStatusId || s.code === finalStatusId || s.status_code === finalStatusId);
             if (newStatusObj) newState.status = newStatusObj;
          }
          if (departmentChangeObj && departmentChangeObj.new_id !== undefined) {
             newState.department_id = departmentChangeObj.new_id || null;
             // also update the relational object so UI components that rely on it update
             const matchedDept = departments.find(d => d.id === departmentChangeObj.new_id);
             newState.department = matchedDept || null;
          }
          // Merge new checklists
          const existingChecklists = [...(prev.checklists || [])];
          
          if (res.data.checklistsUpdates && res.data.checklistsUpdates.length > 0) {
             res.data.checklistsUpdates.forEach((upd: any) => {
                const idx = existingChecklists.findIndex(c => c.id === upd.id);
                if (idx !== -1) existingChecklists[idx] = upd;
             });
          }
          
          if (res.data.checklistsCreates && res.data.checklistsCreates.length > 0) {
             // Remove temporary placeholders
             const cleanChecklists = existingChecklists.filter(c => !String(c.id).startsWith("temp-"));
             newState.checklists = [...cleanChecklists, ...res.data.checklistsCreates];
          } else {
             newState.checklists = existingChecklists;
          }
          
          if (newAttachments && newAttachments.length > 0) {
             const existingAtts = [...(prev.attachments || [])].filter(a => !a.is_temp);
             newState.attachments = [...newAttachments, ...existingAtts];
          }
          
          return newState;
        });
        
        if (res.data.comments && res.data.comments.length > 0) {
           setRemarksHistory(prev => [...res.data.comments, ...prev]);
        }
      }

      // Reset pending states
      setPendingStatus(null);
      setPendingDepartment(null);
      setPendingChecklists([]);
      setEditedChecklists({});
      setPendingFiles([]);
      setRemarksDraft("");

      setIsChecklistsLoaded(true);
      setIsAttachmentsLoaded(true);
      setIsCommentsLoaded(true);

      const t3 = performance.now();
      console.log(`[Task Save Metrics] Uploads+Prep: ${(t1 - t0).toFixed(2)}ms | Backend+Network: ${(t2 - t1).toFixed(2)}ms | Render Hydration: ${(t3 - t2).toFixed(2)}ms | Total: ${(t3 - t0).toFixed(2)}ms`);

      triggerToast("Task updated successfully");
      if (onUpdate) {
        onUpdate();
      }
      // We no longer force navigation away to let the user stay on the same page
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
  
  // Allow unfreezing if the user is staging a status change to an open status
  const targetStatusId = pendingStatus || currentStatusCode;
  const targetStatusObj = statuses.find(s => s.code === targetStatusId || s.status_code === targetStatusId);
  const isEffectivelyFrozen = pendingStatus ? (targetStatusObj?.is_closed ?? isFrozen) : isFrozen;
  
  // Roles
  const isOwner = task.currentUserCanAct; // Owner/Assignee or SuperAdmin
  const isExecutor = task.task_assignees?.some((a: any) => a.id === task.currentUserId) || false;
  const isWatcherOrReviewer = task.task_watchers?.some((w: any) => w.id === task.currentUserId) || false;
  
  // Owners and Executors can edit core properties, provided they have TASKS_UPDATE permission
  const canEditCore = !readOnly && (isOwner || isExecutor) && !isEffectivelyFrozen && hasPermission("TASKS_UPDATE");
  const canEditAux = canEditCore;
  const canDeleteTask = !readOnly && isOwner && canDelete;
  
  // Reviewers & Watchers
  const canAddRemark = !readOnly && ((canEditAux || isWatcherOrReviewer) && !isEffectivelyFrozen);
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
      if (explicitWatchers.some((e: any) => e.id === u.id)) return;
      
      // All inherited workspace access defaults to being a Watcher
      explicitWatchers.push(u);
    });
  }

  return (
    <ExperienceProvider mode="operational">
    <AppCard className="p-5 space-y-6 border-t-4 border-t-blue-500 shadow-sm">
      
      {/* Sleek Error Notification Banner */}
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center justify-between animate-in slide-in-from-top-1">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs text-rose-400/60 hover:text-rose-400 font-bold px-2">Dismiss</button>
        </div>
      )}

      {/* Title & Core Meta removed to avoid duplication with parent page layout */}
      
      {/* Extended Metadata Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4">
        
        {/* Timeline & Meta Block */}
        <div className={`p-4 rounded-xl border transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-300 dark:hover:shadow-blue-500/20 dark:hover:border-blue-500/40 ${isLightMode ? "bg-white border-gray-200/80 shadow-sm" : "bg-[#111827]/40 border-white/5"} space-y-4`}>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 border-b border-gray-100 dark:border-white/5 pb-2 flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Timeline & Meta</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Priority</span>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border dark:border-white/10" style={{ backgroundColor: isLightMode ? `${task.priority?.color}15` || '#f1f5f9' : `${task.priority?.color}25` || '#1e293b' }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.priority?.color || '#cbd5e1' }} />
                  <span className="text-xs font-semibold" style={{ color: task.priority?.color || (isLightMode ? '#64748b' : '#cbd5e1') }}>{task.priority?.name || "Standard"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Duration</span>
              <div className="text-sm font-medium dark:text-gray-200 mt-1">
                {task.currentUserIsSuperAdmin ? (
                  <div className="flex items-center gap-1 text-xs">
                    <input
                      type="number"
                      className="w-16 px-2 py-1 border border-gray-200 dark:border-white/10 rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
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
                    /> <span className="text-gray-400">Days</span>
                  </div>
                ) : (
                  <span>
                    {task.start_date && task.end_date ? Math.max(1, Math.round((new Date(task.end_date).getTime() - new Date(task.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1) : 0} <span className="text-gray-400 font-normal text-xs">Days</span>
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Start Date <span className="text-red-500">*</span></span>
              <div>
                {task.currentUserIsSuperAdmin ? (
                  <input
                    type="date"
                    className="px-2 py-1 w-full border border-gray-200 dark:border-white/10 rounded-md bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={task.start_date ? String(task.start_date).substring(0, 10) : ""}
                    onChange={(e) => {
                      const newStartDate = e.target.value;
                      setPendingTaskUpdates(prev => ({ ...prev, start_date: newStartDate }));
                      setTask((prev: any) => ({ ...prev, start_date: newStartDate }));
                    }}
                  />
                ) : (
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold ${isLightMode ? "bg-gray-100 text-gray-700" : "bg-white/5 text-gray-300"}`}>
                    {task.start_date ? new Date(task.start_date).toLocaleDateString() : "Not set"}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Due Date <span className="text-red-500">*</span></span>
              <div>
                {task.currentUserIsSuperAdmin ? (
                  <input
                    type="date"
                    className="px-2 py-1 w-full border border-gray-200 dark:border-white/10 rounded-md bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={task.end_date ? String(task.end_date).substring(0, 10) : ""}
                    onChange={(e) => {
                      const newEndDate = e.target.value;
                      setPendingTaskUpdates(prev => ({ ...prev, end_date: newEndDate }));
                      setTask((prev: any) => ({ ...prev, end_date: newEndDate }));
                    }}
                  />
                ) : (
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold ${
                    task.end_date && new Date(task.end_date) < new Date() ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400" : isLightMode ? "bg-gray-100 text-gray-700" : "bg-white/5 text-gray-300"
                  }`}>
                    {task.end_date ? new Date(task.end_date).toLocaleDateString() : "Not set"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Execution Team Block */}
        <div className={`p-4 rounded-xl border transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-300 dark:hover:shadow-blue-500/20 dark:hover:border-blue-500/40 ${isLightMode ? "bg-blue-50/50 border-blue-100/50" : "bg-blue-900/10 border-blue-500/10"} space-y-4`}>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1 border-b border-blue-100 dark:border-blue-500/10 pb-2 flex items-center gap-2"><Users2 className="w-3.5 h-3.5" /> Execution Team</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Primary Assignee</span>
              <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-white/20 dark:border-white/5">
                {task.assignee ? (
                  (() => {
                     const a = Array.isArray(task.assignee) ? task.assignee[0] : task.assignee;
                     if (!a) return null;
                     return (
                       <>
                         {a.profile_photo ? (
                           <img src={a.profile_photo} alt="" className="w-6 h-6 rounded-full object-cover bg-gray-200 shadow-sm" />
                         ) : (
                           <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shadow-sm">
                             {a.full_name?.substring(0, 2).toUpperCase() || "U"}
                           </div>
                         )}
                         <span className="text-sm font-semibold dark:text-gray-200 truncate">{a.full_name}</span>
                       </>
                     );
                  })()
                ) : (
                  <span className="text-xs font-medium text-gray-400 italic">Unassigned</span>
                )}
              </div>
            </div>

            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-500">Executors</span>
                { !readOnly && (isExecutor || task.currentUserIsSuperAdmin) && !isEffectivelyFrozen && (
                  <button 
                    onClick={async () => {
                      if (!isEditingAssignees) {
                        if (stakeholders.length === 0) {
                          try {
                            const { fetchWorkspaceStakeholders } = await import("@/lib/actions/workspaces");
                            const res = await fetchWorkspaceStakeholders(task.workspace_id);
                            setStakeholders(res);
                          } catch (err) {
                            console.error(err);
                          }
                        }
                        setEditingAssigneesList(explicitExecutors.map((e: any) => e.id));
                      }
                      setIsEditingAssignees(!isEditingAssignees);
                    }} 
                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 hover:opacity-80 underline"
                  >
                    {isEditingAssignees ? 'Cancel' : 'Edit'}
                  </button>
                )}
              </div>
              
              {isEditingAssignees ? (
                <div ref={assigneesRef} className={`p-2 rounded-xl border max-h-40 overflow-y-auto scrollbar-thin mt-1 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30 dark:shadow-emerald-500/20 ${isLightMode ? "bg-white border-emerald-200" : "bg-black/30 border-emerald-500/30"}`}>
                  <div className="flex flex-col gap-1">
                    {stakeholders.map(s => (
                      <label key={s.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded-md transition-colors">
                        <input type="checkbox" className="accent-emerald-500 h-3 w-3 rounded" checked={editingAssigneesList.includes(s.id)} onChange={e => {
                          if (e.target.checked) setEditingAssigneesList([...editingAssigneesList, s.id]);
                          else setEditingAssigneesList(editingAssigneesList.filter(id => id !== s.id));
                        }} />
                        <span className="truncate">{s.full_name}</span>
                      </label>
                    ))}
                    {stakeholders.length === 0 && <span className="text-xs text-gray-500 p-1">Loading...</span>}
                  </div>
                  <AppButton 
                    size="sm" 
                    className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-[10px] h-7" 
                    onClick={() => {
                      setPendingAssignees(editingAssigneesList);
                      setIsEditingAssignees(false);
                    }}
                  >
                    Stage Assignees
                  </AppButton>
                </div>
              ) : (
                <div className="text-sm font-medium dark:text-gray-200 bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-white/20 dark:border-white/5 min-h-[42px] flex items-center">
                  {pendingAssignees ? (
                    <span className="text-emerald-500 font-bold italic animate-pulse text-xs">Pending save...</span>
                  ) : (
                    <span className="truncate">
                      {explicitExecutors.length > 0 ? explicitExecutors.map((p: any) => p.full_name).join(', ') : <span className="text-gray-400 italic text-xs">None</span>}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <div className="space-y-1.5 col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500">Watchers (Team)</span>
              <div className="text-sm font-medium dark:text-gray-200 leading-relaxed bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-white/20 dark:border-white/5">
                {explicitWatchers.length > 0 ? explicitWatchers.map((p: any) => p.full_name).join(', ') : <span className="text-gray-400 italic text-xs">None</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Lifecycle State Transition Panel (MOVED TO TOP) */}
      <div className={`p-4 rounded-xl border shadow-sm space-y-3 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 hover:border-purple-300 dark:hover:shadow-purple-500/20 dark:hover:border-purple-500/40 ${
        isLightMode ? "bg-white border-gray-200/80" : "bg-[#111827]/40 border-white/10"
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Status Field</label>
            <select
              value={pendingStatus || currentStatusCode}
              disabled={readOnly || (!canEditCore && !(isOwner || isExecutor))}
              onChange={(e) => {
                const newCode = e.target.value;
                if (newCode === currentStatusCode) {
                  setPendingStatus(null);
                } else {
                  setPendingStatus(newCode);
                }
              }}
              className={`w-full p-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow ${
                isLightMode ? "bg-gray-50 border-gray-200 text-gray-900" : "bg-[#0B0F19] border-white/10 text-white"
              } ${(readOnly || (!canEditCore && !(isOwner || isExecutor))) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {statuses.map(st => (
                <option key={st.id} value={st.code || st.status_code}>{st.name || st.status_name}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Department Field</label>
            <select
              value={pendingDepartment !== null ? pendingDepartment : (task.department_id || "")}
              disabled={readOnly || (!canEditCore && !(isOwner || isExecutor))}
              onChange={(e) => {
                const newDept = e.target.value;
                if (newDept === (task.department_id || "")) {
                  setPendingDepartment(null);
                } else {
                  setPendingDepartment(newDept);
                }
              }}
              className={`w-full p-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow ${
                isLightMode ? "bg-gray-50 border-gray-200 text-gray-900" : "bg-[#0B0F19] border-white/10 text-white"
              } ${(readOnly || (!canEditCore && !(isOwner || isExecutor))) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <option value="">-- No Department --</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-1.5 w-full">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block text-right w-full">
              Quick Action Operations
            </label>
            <div className="flex flex-wrap justify-end gap-2 pt-0.5 w-full">
              {currentStatusCode === "ST_OPEN" && canEditCore && (
                <AppButton 
                  size="sm" 
                  variant="primary" 
                  className="bg-indigo-600 hover:bg-indigo-700"
                  leftIcon={<Play className="h-4 w-4" />}
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
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  disabled={actionLoading}
                  onClick={() => handleStatusTransition("resolve")}
                >
                  Resolve Directive
                </AppButton>
              )}

              {currentStatusCode === "ST_RESOLVED" && !readOnly && task.currentUserCanAct && (
                <>
                  <AppButton 
                    size="sm" 
                    variant="primary" 
                    className="bg-blue-600 hover:bg-blue-700"
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    disabled={actionLoading}
                    onClick={() => handleStatusTransition("approve")}
                  >
                    Approve & Close
                  </AppButton>
                  <AppButton 
                    size="sm" 
                    variant="ghost" 
                    className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    leftIcon={<RotateCcw className="h-4 w-4" />}
                    disabled={actionLoading}
                    onClick={() => handleStatusTransition("reopen")}
                  >
                    Reject & Reopen
                  </AppButton>
                </>
              )}

              { !readOnly && task.status?.is_closed && (task.currentUserCanAct || isExecutor) && (
                <AppButton 
                  size="sm" 
                  variant="outline" 
                  leftIcon={<RotateCcw className="h-4 w-4" />}
                  disabled={actionLoading}
                  onClick={() => handleStatusTransition("reopen")}
                >
                  Reopen Task
                </AppButton>
              )}
              {canDeleteTask && (
                <AppButton 
                  variant="outline" 
                  size="sm" 
                  className="text-rose-500 hover:bg-rose-50 border-rose-200 dark:border-rose-500/20 dark:hover:bg-rose-500/10" 
                  onClick={handleDeleteTask} 
                  disabled={deleteLoading || actionLoading}
                  leftIcon={<Trash2 className="h-4 w-4" />}
                >
                  Delete Task
                </AppButton>
              )}

              { !readOnly && (isOwner || isExecutor || task.currentUserIsSuperAdmin) && (
                <AppButton 
                  variant="outline" 
                  size="sm" 
                  className="text-indigo-600 hover:bg-indigo-50 border-indigo-200 dark:border-indigo-500/20 dark:hover:bg-indigo-500/10" 
                  onClick={handleOpenTransfer} 
                  disabled={actionLoading}
                  leftIcon={<ChevronUp className="h-4 w-4 rotate-90" />}
                >
                  Transfer Task
                </AppButton>
              )}
            </div>
            
            {/* Transfer Modal / Inline Panel */}
            {isTransferModalOpen && (
              <div className="mt-4 p-5 border-2 border-indigo-200 bg-indigo-50 dark:bg-indigo-900/10 dark:border-indigo-500/20 rounded-xl animate-in fade-in zoom-in-95 w-full text-left shadow-lg">
                <h4 className="text-sm font-bold text-indigo-700 dark:text-indigo-400 mb-4 flex items-center gap-2 border-b border-indigo-200 dark:border-indigo-800 pb-2">
                  <FolderPlus className="w-4 h-4" /> Transfer Task to Another Workspace
                </h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Root Workspace <span className="text-red-500">*</span></label>
                      <select
                        value={selectedTransferWorkspace}
                        onChange={e => {
                          setSelectedTransferWorkspace(e.target.value);
                          setSelectedTransferSubworkspace("");
                        }}
                        className="w-full p-2.5 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-[#0B0F19] dark:border-white/10 dark:text-white"
                      >
                        <option value="">-- Select Root Workspace --</option>
                        {transferWorkspaces.filter(w => !w.parent_workspace_id).map(w => (
                          <option key={w.id} value={w.id} disabled={w.id === task.workspace_id && !task.sub_workspace_id}>
                            {w.code ? `[${w.code}] ` : ""}{w.name} {w.id === task.workspace_id && !task.sub_workspace_id ? "(Current)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">Subworkspace (Optional)</label>
                      <select
                        value={selectedTransferSubworkspace}
                        onChange={e => setSelectedTransferSubworkspace(e.target.value)}
                        disabled={!selectedTransferWorkspace}
                        className="w-full p-2.5 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-[#0B0F19] dark:border-white/10 dark:text-white disabled:opacity-50"
                      >
                        <option value="">-- Root Level (No Subworkspace) --</option>
                        {transferWorkspaces.filter(w => w.parent_workspace_id === selectedTransferWorkspace).map(w => (
                          <option key={w.id} value={w.id} disabled={w.id === task.sub_workspace_id}>
                            {w.code ? `[${w.code}] ` : ""}{w.name} {w.id === task.sub_workspace_id ? "(Current)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {checkingScope && (
                    <div className="flex items-center gap-2 text-xs text-indigo-500 font-bold p-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking user scope...
                    </div>
                  )}

                  {!checkingScope && droppedUsers.length > 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg space-y-3">
                      <div className="text-xs text-amber-700 dark:text-amber-400 font-semibold leading-relaxed">
                        <span className="font-bold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Out of Scope Users Detected</span>
                        The following participants do not have access to the destination and will be removed from this task: 
                        <strong className="block mt-1">{droppedUsers.map(u => u.full_name).join(", ")}</strong>
                      </div>
                      
                      {isOwnerDropped && (
                        <div className="bg-white/50 dark:bg-black/20 p-3 rounded border border-amber-200 dark:border-amber-500/30">
                          <label className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1.5 block">Assign New Primary Owner <span className="text-red-500">*</span></label>
                          <select
                            value={newAssigneeId}
                            onChange={e => setNewAssigneeId(e.target.value)}
                            className="w-full p-2 rounded text-sm border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-[#0B0F19] dark:border-white/10 dark:text-white"
                          >
                            <option value="">-- Select New Owner --</option>
                            {targetStakeholders.map(s => (
                              <option key={s.id} value={s.id}>{s.full_name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      {true && (
                        <div className="bg-white/50 dark:bg-black/20 p-3 rounded border border-amber-200 dark:border-amber-500/30 mt-2">
                          <label className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1.5 block">Assign Additional Executives (Optional)</label>
                          <div className="max-h-32 overflow-y-auto space-y-1 scrollbar-thin">
                            {targetStakeholders.map(s => (
                              <label key={s.id} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={newExecutors.includes(s.id)}
                                  onChange={e => {
                                    if(e.target.checked) setNewExecutors([...newExecutors, s.id]);
                                    else setNewExecutors(newExecutors.filter(id => id !== s.id));
                                  }}
                                  className="accent-amber-500 rounded h-3 w-3"
                                />
                                {s.full_name}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Transfer Remarks (Mandatory) <span className="text-red-500">*</span></label>
                    <textarea 
                      value={transferRemarks}
                      onChange={e => setTransferRemarks(e.target.value)}
                      className="w-full min-h-[60px] p-2.5 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-[#0B0F19] dark:border-white/10 dark:text-white"
                      placeholder="Why is this task being transferred?"
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-2 border-t border-indigo-200 dark:border-indigo-800/50 mt-4">
                    <AppButton variant="ghost" size="sm" onClick={() => { setIsTransferModalOpen(false); setSelectedTransferWorkspace(""); setSelectedTransferSubworkspace(""); }}>Cancel</AppButton>
                    <AppButton variant="primary" size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={submitTransfer} disabled={transferLoading || checkingScope}>
                      {transferLoading ? "Transferring..." : "Confirm Transfer"}
                    </AppButton>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

        {pendingStatus && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-xl flex items-center justify-between animate-in slide-in-from-top-1">
            <span>Status change to <strong>{statuses.find(s => s.status_code === pendingStatus)?.status_name || pendingStatus}</strong> is pending. Write a mandatory remark below and click <strong>"Commit Updates & Save Remark"</strong> to save both.</span>
            <button onClick={() => setPendingStatus(null)} className="text-xs text-amber-400/60 hover:text-amber-400 font-bold px-2 underline hover:no-underline">Cancel Change</button>
          </div>
        )}

        {pendingDepartment && (
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs rounded-xl flex items-center justify-between animate-in slide-in-from-top-1 mt-3">
            <span>Department change to <strong>{departments.find(d => d.id === pendingDepartment)?.name || pendingDepartment}</strong> is pending. Write a mandatory remark below and click <strong>"Commit Updates & Save Remark"</strong> to save both.</span>
            <button onClick={() => setPendingDepartment(null)} className="text-xs text-purple-400/60 hover:text-purple-400 font-bold px-2 underline hover:no-underline">Cancel Change</button>
          </div>
        )}

        {pendingAssignees && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs rounded-xl flex items-center justify-between animate-in slide-in-from-top-1 mt-3">
            <span>Executors change is pending. Write a mandatory remark below and click <strong>"Commit Updates & Save Remark"</strong> to save.</span>
            <button onClick={() => setPendingAssignees(null)} className="text-xs text-emerald-500/60 hover:text-emerald-500 font-bold px-2 underline hover:no-underline">Cancel Change</button>
          </div>
        )}
 
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Task Remarks <span className="text-red-500">*</span></label>
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
                {saveRemarksLoading ? "Saving..." : (pendingStatus || pendingDepartment || pendingAssignees) ? "Commit Updates & Save Remark" : "Save Remarks"}
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

        {/* Editable Custom Fields */}
        {localCustomFields && Object.keys(localCustomFields).length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/5">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2"><Pin className="w-3.5 h-3.5" /> Custom Properties</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {Object.entries(localCustomFields).map(([key, val]) => {
                const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
                const isReadOnlyProp = readOnly;
                return (
                  <div key={key} className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      {key.replace(/_/g, ' ')}
                    </label>
                    {isReadOnlyProp || !canEditCore ? (
                      <div className={`w-full p-2.5 rounded-lg text-sm border shadow-sm ${normalizedKey !== 'link_url' && 'cursor-not-allowed'} ${
                        isLightMode ? "bg-gray-50 border-gray-200 text-gray-700" : "bg-[#0B0F19]/50 border-white/5 text-gray-400"
                      }`}>
                        {normalizedKey === 'link_url' && val && val !== "null" ? (
                          <a href={String(val).startsWith('http') ? String(val) : `https://${val}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{String(val)}</a>
                        ) : (
                          val === null || val === "null" ? "" : String(val)
                        )}
                      </div>
                    ) : (
                      <div className="relative flex items-center">
                        <AppInput 
                          value={val === null || val === "null" ? "" : String(val)} 
                          onChange={e => handleCustomFieldChange(key, e.target.value)} 
                          className={`shadow-sm ${normalizedKey === 'link_url' && val && val !== "null" ? "pr-8" : ""}`}
                        />
                        {normalizedKey === 'link_url' && val && val !== "null" && (
                          <a 
                            href={String(val).startsWith('http') ? String(val) : `https://${val}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            title="Open Link"
                            className="absolute right-3 text-blue-500 hover:text-blue-600 transition-colors"
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
            {tab === "checklist" && Math.max(task._meta?.checklistCount || 0, task.checklists?.length || 0) > 0 && (
              <AppBadge className={`ml-1 px-1.5 py-0 text-[9px] ${activeTab === tab ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-gray-100 text-gray-500"}`}>
                {Math.max(task._meta?.checklistCount || 0, task.checklists?.length || 0)}
              </AppBadge>
            )}
            {tab === "attachments" && Math.max(task._meta?.attachmentCount || 0, task.attachments?.length || 0) > 0 && (
              <AppBadge className={`ml-1 px-1.5 py-0 text-[9px] ${activeTab === tab ? "bg-purple-100 text-purple-700 border-purple-200" : "bg-gray-100 text-gray-500"}`}>
                {Math.max(task._meta?.attachmentCount || 0, task.attachments?.length || 0)}
              </AppBadge>
            )}
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
                  <span className={`text-xs ${item.is_completed ? "line-through text-gray-500" : "text-foreground"}`}>
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
                  {(task.attachments || []).map((item: any) => {
                    const isNativeViewable = !!item.file_name?.match(/\.(pdf|jpe?g|png|gif|webp|svg|txt|mp4|webm|mp3|wav|ogg)$/i);
                    const isOfficeDoc = !!item.file_name?.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i);
                    
                    let viewUrl = item.file_url;
                    if (!isNativeViewable && isOfficeDoc) {
                      // Use window.location.origin to get the absolute path for the proxy so Microsoft can reach it
                      const proxyUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/proxy-attachment/${item.id}` : '';
                      viewUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(proxyUrl)}`;
                    }
                    
                    return (
                    <div 
                      key={item.id} 
                      className={`flex items-center justify-between p-3 rounded-xl border ${
                        isLightMode ? "bg-white border-gray-200" : "bg-white/[0.01] border-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="h-4 w-4 text-purple-400 shrink-0" />
                        <div className="truncate space-y-0.5">
                          <span className={`text-xs font-bold block truncate ${"text-foreground"}`}>{item.file_name}</span>
                          <span className="text-[0.7rem] text-gray-500 block">{(item.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <a 
                          href={viewUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          title={(!isNativeViewable && isOfficeDoc) ? "View via Office Viewer" : "View Attachment"}
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
                  )})}
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
