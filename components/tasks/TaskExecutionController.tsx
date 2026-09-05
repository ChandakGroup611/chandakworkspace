"use client";
import { toast } from 'react-toastify';

import React, { useState, useEffect, useRef, useMemo } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import { useTheme } from "@/components/theme/ThemeProvider";
import { 
  CheckSquare, Paperclip, Users2, Activity, Play, CheckCircle2, 
  XCircle, RotateCcw, Plus, Download, Loader2, Trash2, FolderPlus, Pin,
  ChevronDown, ChevronUp, MessageSquare, Clock, ExternalLink, Eye, ActivitySquare, Link as LinkIcon, MessageCircle,
  User, Calendar, Tag, Flag, Hourglass, CalendarDays, CalendarCheck, ShieldCheck, ShieldAlert, Users, X, Search, Check, UserCheck
} from "lucide-react";
import { 
  getTaskDetails, updateTask, deleteTask, transitionTaskStatus, resolveTask, 
  approveTask, reopenTask, createChecklistItem, 
  createTaskAttachment, deleteTaskAttachment, getTaskComments, addTaskRemark, getTaskStatuses,
  getTaskChecklists, getTaskAttachments, executeTaskBatchOperation
} from "@/lib/actions/tasks";
import { toggleChecklistItem } from "@/lib/actions/workspaces";
import { useRouter } from "next/navigation";
import { ExperienceProvider } from "@/components/theme/ExperienceProvider";
import { usePermissions } from "@/hooks/usePermissions";


import dynamic from 'next/dynamic';
import SafeHtml from "@/components/ui/SafeHtml";
import { sanitizeErrorMessage } from "@/lib/utils";

const getSafeExternalUrl = (url: string | undefined | null) => {
  if (!url) return '#';
  const str = String(url).trim();
  if (/^(https?|file|ftp|smb|mailto|tel):/i.test(str)) return str;
  return `https://${str}`;
};

const TaskRealtimeChat = dynamic(() => import("@/components/tasks/TaskRealtimeChat"), { 
  ssr: false, 
  loading: () => <div className="p-6 text-center theme-data-value text-muted animate-pulse">Loading Realtime Chat...</div> 
});

const TaskActivityTimeline = dynamic(() => import("@/components/tasks/TaskActivityTimeline"), { 
  ssr: false,
  loading: () => <div className="p-6 text-center theme-data-value text-muted animate-pulse">Loading Audit Timeline...</div> 
});

const TaskTimeLogs = dynamic(() => import("@/components/tasks/TaskTimeLogs"), { 
  ssr: false,
  loading: () => <div className="p-6 text-center theme-data-value text-muted animate-pulse">Loading Time Logs...</div> 
});
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });
import 'react-quill-new/dist/quill.snow.css';

const RichTextEditor = ({ value, onChange, readOnly = false, placeholder = "" }: { value: string, onChange: (val: string) => void, readOnly?: boolean, placeholder?: string }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="p-4 rounded-xl animate-pulse theme-card-structural dark:bg-slate-900/50 h-36 text-xs font-semibold text-muted flex items-center justify-center">Loading editor...</div>;
  }

  return (
    <div className="quill-wrapper rounded-xl /60 theme-card-structural dark:bg-[#0B0F19] text-foreground overflow-hidden shadow-sm">
      <style>{`
        .quill-wrapper .ql-toolbar.ql-snow {
          border: none;
          border-bottom: 1px solid rgba(156, 163, 175, 0.2);
          background: rgba(243, 244, 246, 0.5);
          border-top-left-radius: 0.75rem;
          border-top-right-radius: 0.75rem;
        }
        .dark .quill-wrapper .ql-toolbar.ql-snow {
          background: rgba(17, 24, 39, 0.8);
        }
        .dark .quill-wrapper .ql-stroke {
          stroke: #9CA3AF !important;
        }
        .dark .quill-wrapper .ql-fill {
          fill: #9CA3AF !important;
        }
        .dark .quill-wrapper .ql-picker {
          color: #9CA3AF !important;
        }
        .dark .quill-wrapper .ql-picker-options {
          background-color: #1F2937 !important;
          border-color: #374151 !important;
        }
        .quill-wrapper .ql-container.ql-snow {
          border: none;
          min-height: 140px;
          font-size: 0.875rem;
        }
        .quill-wrapper .ql-editor {
          min-height: 140px;
        }
      `}</style>
      <ReactQuill 
        theme="snow" 
        value={value} 
        onChange={onChange}
        readOnly={readOnly}
        placeholder={placeholder}
        modules={{
          toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['clean']
          ]
        }}
      />
    </div>
  );
};

export default function TaskExecutionController({ taskId, onUpdate, initialTask, initialStatuses, initialDepartments, readOnly = false }: { taskId: string; onUpdate?: () => void; initialTask?: any; initialStatuses?: any[]; initialDepartments?: any[]; readOnly?: boolean }) {
  const { theme } = useTheme();
  const isLightMode = ["light-neumorphic", "pure-white", "pure-white-neumorphic", "amazon-prime-upi"].includes(theme);

  const router = useRouter();
  const { hasPermission, roleCode } = usePermissions();
  const canDelete = !readOnly && hasPermission("TASKS_DELETE");
  const [task, setTask] = useState<any>(initialTask || null);
  const [statuses, setStatuses] = useState<any[]>(initialStatuses || []);
  const [departments, setDepartments] = useState<any[]>(initialDepartments || []);
  const [loading, setLoading] = useState(!initialTask);
  const [activeTab, setActiveTab] = useState<"tags" | "links" | "checklist" | "attachments" | "chat" | "timeline" | "time">("checklist");
  
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
  const [pendingChecklists, setPendingChecklists] = useState<{ label: string; assignee_id?: string }[]>([]);
  const [editedChecklists, setEditedChecklists] = useState<Record<string, { is_completed?: boolean; assignee_id?: string }>>({});
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingTaskUpdates, setPendingTaskUpdates] = useState<Record<string, any>>({});
  const [pendingAssignees, setPendingAssignees] = useState<string[] | null>(null);
  const [pendingPrimaryAssignee, setPendingPrimaryAssignee] = useState<string | null>(null);
  
  // Assignee & Executor Modal State
  const [isAssigneeModalOpen, setIsAssigneeModalOpen] = useState(false);
  const [assigneeModalTab, setAssigneeModalTab] = useState<'primary' | 'executors'>('primary');
  const [selectedPrimaryAssignee, setSelectedPrimaryAssignee] = useState<string>("");
  const [selectedExecutors, setSelectedExecutors] = useState<string[]>([]);
  const [stakeholderSearch, setStakeholderSearch] = useState<string>("");
  const [isEditingAssignees, setIsEditingAssignees] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  // Dependency Checks
  const [checkingDependencyId, setCheckingDependencyId] = useState<string | null>(null);
  const [dependencyModal, setDependencyModal] = useState<{
    userId: string;
    userName: string;
    result: import("@/lib/actions/dependencies").DependencyCheckResult;
  } | null>(null);
  
  const handleAcknowledgeAmendment = async () => {
    if (!task?.id) return;
    setIsAcknowledging(true);
    setError(null);
    try {
      const { acknowledgeTaskAmendment } = await import("@/lib/actions/tasks");
      const res = await acknowledgeTaskAmendment(task.id);
      if (res.error) throw new Error(res.error);
      
      triggerToast("Amendment acknowledged and task updated successfully.");
      // Refresh task details
      await loadTaskDetails(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to acknowledge amendment.");
    } finally {
      setIsAcknowledging(false);
    }
  };
  const [stakeholders, setStakeholders] = useState<any[]>([]);
  const [editingAssigneesList, setEditingAssigneesList] = useState<string[]>([]);
  const [isSavingAssignees, setIsSavingAssignees] = useState(false);
  
  const openAssigneeModal = async (tab: 'primary' | 'executors' = 'primary') => {
    setAssigneeModalTab(tab);
    setSelectedPrimaryAssignee(pendingPrimaryAssignee || task?.assigned_to || "");
    const currentExecutorIds = pendingAssignees || (task?.task_assignees || []).map((e: any) => e.id);
    setSelectedExecutors(currentExecutorIds);
    setStakeholderSearch("");
    setIsAssigneeModalOpen(true);
    
    if (task?.workspace_id) {
      try {
        const { fetchWorkspaceStakeholders } = await import("@/lib/actions/workspaces");
        const res = await fetchWorkspaceStakeholders(task.workspace_id);
        setStakeholders(res || []);
      } catch (err) {
        console.error("[openAssigneeModal] Error fetching stakeholders:", err);
      }
    }
  };

  const handleStageAssignees = () => {
    if (!selectedPrimaryAssignee && selectedExecutors.length === 0) {
      setError("Please select at least a Primary Assignee or an Executor.");
      return;
    }
    setPendingPrimaryAssignee(selectedPrimaryAssignee);
    setPendingAssignees(selectedExecutors);
    setIsAssigneeModalOpen(false);
    triggerToast("Assignee changes staged! Provide remarks and save updates.");
  };
  
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
  
  const flattenedWorkspaces = useMemo(() => {
    const map = new Map(transferWorkspaces.map(w => [w.id, w]));
    const paths: any[] = [];
    
    const getPath = (w: any): { pathName: string, rootId: string } => {
      let current = w;
      let pathName = w.code ? `[${w.code}] ${w.name}` : w.name;
      let rootId = w.id;
      const visited = new Set([w.id]);
      
      while (current.parent_workspace_id && map.has(current.parent_workspace_id)) {
        current = map.get(current.parent_workspace_id);
        if (visited.has(current.id)) break;
        visited.add(current.id);
        
        const currentName = current.code ? `[${current.code}] ${current.name}` : current.name;
        pathName = `${currentName} > ${pathName}`;
        rootId = current.id;
      }
      return { pathName, rootId };
    };

    transferWorkspaces.forEach(w => {
      const { pathName, rootId } = getPath(w);
      paths.push({
        id: w.id,
        pathName,
        rootId,
        isSub: !!w.parent_workspace_id,
        original: w
      });
    });
    
    paths.sort((a, b) => a.pathName.localeCompare(b.pathName));
    return paths;
  }, [transferWorkspaces]);

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
      if (Array.isArray(comments)) {
        setRemarksHistory(comments);
        setIsCommentsLoaded(true);
      }
    } catch (e: any) {
      console.warn("[loadComments] Error fetching comments:", e);
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
    setEditedChecklists(prev => ({ ...prev, [itemId]: { ...prev[itemId], is_completed: !currentStatus } }));
    setTask((prev: any) => ({
      ...prev,
      checklists: prev.checklists.map((item: any) =>
        item.id === itemId ? { ...item, is_completed: !currentStatus } : item
      )
    }));
  };

  const handleSetChecklistAssignee = (itemId: string, assignee_id: string) => {
    // If it's a temp item, update pendingChecklists
    if (itemId.startsWith("temp-")) {
      const idx = pendingChecklists.findIndex(p => `temp-${p.label}` === itemId || p.label === itemId); // Rough match if needed, but better to update the task state and let batch save handle it.
      // Actually, since pendingChecklists doesn't have an ID, we update the task state directly, and for saving we map over task.checklists that are temp.
    }
    
    setEditedChecklists(prev => ({ ...prev, [itemId]: { ...prev[itemId], assignee_id } }));
    setTask((prev: any) => ({
      ...prev,
      checklists: prev.checklists.map((item: any) =>
        item.id === itemId ? { ...item, assignee_id } : item
      )
    }));
  };

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistLabel.trim()) return;
    setError(null);
    const tempId = `temp-${Date.now()}`;
    setPendingChecklists(prev => [...prev, { label: newChecklistLabel.trim() }]);
    setTask((prev: any) => ({
      ...prev,
      checklists: [...(prev.checklists || []), { id: tempId, label: newChecklistLabel.trim(), is_completed: false }]
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
  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!window.confirm("Are you sure you want to delete this attachment? This action cannot be undone.")) return;
    try {
      setSaveRemarksLoading(true);
      const res = await deleteTaskAttachment(taskId, attachmentId);
      if (res.error) throw new Error(res.error);
      
      // Update UI
      setTask((prev: any) => ({
        ...prev,
        attachments: prev.attachments?.filter((a: any) => a.id !== attachmentId)
      }));
      toast.success("Attachment deleted successfully");
    } catch (err: any) {
      toast.error(`Failed to delete attachment: ${err.message}`);
    } finally {
      setSaveRemarksLoading(false);
    }
  };

  const handleCustomFieldChange = (key: string, value: string) => {
    setLocalCustomFields(prev => ({ ...prev, [key]: value }));

    setLocalCustomFields(prev => ({ ...prev, [key]: value }));
  };




  if (loading) {
    return (
      <AppCard className="p-8 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-theme-icon" />
        <p className="text-xs text-muted font-bold uppercase tracking-wider">Hydrating Task details...</p>
      </AppCard>
    );
  }

  const handleBatchSave = async () => {
    if (!task) return;

    if (!remarksDraft.trim()) {
      toast.warning("Task remarks are mandatory to save any updates or status changes. Please scroll down to the 'Task Remarks' section to enter your remarks.");
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
      const newChecklistsPayload = task.checklists
        ?.filter((c: any) => String(c.id).startsWith("temp-"))
        .map((c: any) => ({ label: c.label, assignee_id: c.assignee_id })) || [];

      const res = await executeTaskBatchOperation({
        taskId,
        updates: updatePayload,
        statusChanges: finalStatusId,
        departmentChange: departmentChangeObj,
        checklistCreates: newChecklistsPayload.length > 0 ? newChecklistsPayload : pendingChecklists,
        checklistUpdates: editedChecklists,
        remarks: remarksDraft.trim(),
        attachmentIds
      });

      const t2 = performance.now();
      
      if (res?.error) throw new Error("Batch Save Error: " + res.error);

      if (pendingAssignees !== null || pendingPrimaryAssignee !== null) {
        const { updateTaskAssignees } = await import("@/lib/actions/tasks");
        const executorsToUpdate = pendingAssignees !== null ? pendingAssignees : (task.task_assignees || []).map((e: any) => e.id);
        const primaryToUpdate = pendingPrimaryAssignee !== null ? pendingPrimaryAssignee : task.assigned_to;
        const assigneesRes = await updateTaskAssignees(taskId, task.workspace_id, executorsToUpdate, primaryToUpdate);
        if (assigneesRes?.error) throw new Error(assigneesRes.error);
        setPendingAssignees(null);
        setPendingPrimaryAssignee(null);
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
      // Refresh the page data (server components) while keeping the user on the same page
      router.refresh();
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
  
  // Allow unfreezing if the task is frozen and the user is staging a status change to an open status
  const targetStatusId = pendingStatus || currentStatusCode;
  const targetStatusObj = statuses.find(s => (s.code || s.status_code || s.id) === targetStatusId);
  const isEffectivelyFrozen = isFrozen ? (pendingStatus ? !!targetStatusObj?.is_closed : true) : false;
  const canBypassFreeze = task.currentUserIsSuperAdmin || hasPermission("WORKSPACES_MANAGE") || hasPermission("REQUIREMENTS_MANAGE");
  const effectivelyFrozenForUser = isEffectivelyFrozen && !canBypassFreeze;
  const canEditDates = !readOnly && !effectivelyFrozenForUser && (task.currentUserIsSuperAdmin || task.assigned_to === task.currentUserId);
  
  // Roles
  const isOwner = task.currentUserCanAct || canBypassFreeze; // Owner/Assignee or SuperAdmin/Executive
  const isExecutor = task.task_assignees?.some((a: any) => a.id === task.currentUserId) || false;
  const isWatcherOrReviewer = task.task_watchers?.some((w: any) => w.id === task.currentUserId) || false;
  
  // Owners and Executors can edit core properties, provided they have TASKS_UPDATE permission
  const canEditCore = !readOnly && (isOwner || isExecutor) && !effectivelyFrozenForUser && (hasPermission("TASKS_UPDATE") || task.assigned_to === task.currentUserId || task.currentUserIsSuperAdmin);
  const canEditAux = canEditCore;
  const canDeleteTask = !readOnly && isOwner && canDelete;
  
  // Reviewers & Watchers
  const canAddRemark = !readOnly && ((canEditAux || isWatcherOrReviewer || isOwner || isExecutor) && !effectivelyFrozenForUser);
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
    <div className="space-y-6">
      
      {/* Sleek Error Notification Banner */}
      {error && (
        <div className="p-3 bg-danger/10 border border-rose-500/20 text-danger text-xs rounded-xl flex items-center justify-between animate-in slide-in-from-top-1">
          <span>{sanitizeErrorMessage(error)}</span>
          <AppButton variant="secondary" onClick={() => setError(null)} className="text-xs text-danger/60 hover:text-danger font-bold px-2">Dismiss</AppButton>
        </div>
      )}

      {/* Title & Core Meta removed to avoid duplication with parent page layout */}
      
     
      {/* Extended Metadata Section - Dedicated Card with Background Header */}
      <div>
        <AppCard className="overflow-hidden shadow-sm p-0 mb-4 border border-border">
          <div className="bg-surface dark:bg-elevated/50 px-5 py-3.5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-4 rounded-full bg-accent shadow-xs" />
              <Clock className="w-4 h-4 text-accent" />
              <h3 className="font-bold text-sm tracking-wide text-foreground">Timeline & Meta</h3>
            </div>
            {task.priority?.name && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border dark:border-border bg-theme-btn-primary/10 text-theme-icon">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.priority?.color || 'var(--accent-primary)' }} />
                {task.priority.name}
              </span>
            )}
          </div>
          
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-stretch">
              
              {/* 1. Creator */}
              <div className="flex flex-col space-y-1 p-3 rounded-xl border border-border/70 bg-surface/80 dark:bg-elevated/40 hover:border-theme-btn-primary/40 transition-all min-h-[76px] justify-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-theme-icon" /> <span className="text-theme-icon font-bold">Creator</span>
                </span>
                <div className="text-sm font-semibold text-foreground h-9 flex items-center truncate">
                  {task.creator?.full_name || task.created_by?.full_name || task.created_by_user?.full_name || "System Actor"}
                </div>
              </div>

              {/* 2. Created At */}
              <div className="flex flex-col space-y-1 p-3 rounded-xl border border-border/70 bg-surface/80 dark:bg-elevated/40 hover:border-theme-btn-primary/40 transition-all min-h-[76px] justify-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted" /> <span className="text-muted font-bold">Created At</span>
                </span>
                <div className="text-sm font-semibold text-foreground h-9 flex items-center">
                  {task.created_at ? new Date(task.created_at).toLocaleString() : "Unknown"}
                </div>
              </div>

              {/* 3. Last Status */}
              <div className="flex flex-col space-y-1 p-3 rounded-xl border border-border/70 bg-surface/80 dark:bg-elevated/40 hover:border-theme-btn-primary/40 transition-all min-h-[76px] justify-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-theme-icon" /> <span className="text-theme-icon font-bold">Last Status</span>
                </span>
                <div className="text-sm font-semibold text-foreground h-9 flex items-center">
                  {task.status?.name || task.status?.status_name || "Open"}
                </div>
              </div>

              {/* 4. Last Updated */}
              <div className="flex flex-col space-y-1 p-3 rounded-xl border border-border/70 bg-surface/80 dark:bg-elevated/40 hover:border-theme-btn-primary/40 transition-all min-h-[76px] justify-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted" /> <span className="text-muted font-bold">Last Updated</span>
                </span>
                <div className="text-sm font-semibold text-foreground h-9 flex items-center">
                  {task.updated_at ? new Date(task.updated_at).toLocaleString() : (task.created_at ? new Date(task.created_at).toLocaleString() : "Unknown")}
                </div>
              </div>

              {/* 5. Priority */}
              <div className="flex flex-col space-y-1 p-3 rounded-xl border border-border/70 bg-surface/80 dark:bg-elevated/40 hover:border-theme-btn-primary/40 transition-all min-h-[76px] justify-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5 text-danger" /> <span className="text-danger font-bold">Priority</span>
                </span>
                <div className="h-9 flex items-center">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border dark:border-border" style={{ backgroundColor: `var(--accent-primary)15` }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.priority?.color || '#cbd5e1' }} />
                    <span className="text-xs font-semibold" style={{ color: task.priority?.color || ("#64748b") }}>{task.priority?.name || "Standard"}</span>
                  </div>
                </div>
              </div>

              {/* 6. Duration */}
              <div className="flex flex-col space-y-1 p-3 rounded-xl border border-border/70 bg-surface/80 dark:bg-elevated/40 hover:border-theme-btn-primary/40 transition-all min-h-[76px] justify-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Hourglass className="w-3.5 h-3.5 text-cyan-500" /> <span className="text-cyan-600 dark:text-cyan-400 font-bold">Duration</span>
                </span>
                <div className="text-sm font-semibold text-foreground h-9 flex items-center">
                  {canEditDates ? (
                    <div className="flex items-center gap-1.5 text-xs">
                      <input
                        type="number"
                        className="w-16 px-2 py-1 rounded-lg border border-border bg-white dark:bg-[#111827] text-foreground font-bold text-center focus:outline-none focus:ring-2 focus:ring-theme-btn-primary text-xs"
                        value={task.start_date && task.end_date ? Math.max(1, Math.round((new Date(task.end_date).getTime() - new Date(task.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1) : 0}
                        onChange={(e) => {
                          const days = parseInt(e.target.value, 10);
                          if (!isNaN(days) && days > 0) {
                            const currentStart = task.start_date ? task.start_date : new Date().toISOString().split('T')[0];
                            const startDate = new Date(currentStart);
                            startDate.setUTCDate(startDate.getUTCDate() + (days - 1));
                            const newEndDateStr = startDate.toISOString().split('T')[0];
                            setPendingTaskUpdates(prev => ({ 
                              ...prev, 
                              start_date: currentStart, 
                              end_date: newEndDateStr 
                            }));
                            setTask((prev: any) => ({ 
                              ...prev, 
                              start_date: currentStart, 
                              end_date: newEndDateStr 
                            }));
                          }
                        }}
                      /> <span className="text-muted font-medium text-xs">Days</span>
                    </div>
                  ) : (
                    <span>
                      {task.start_date && task.end_date ? Math.max(1, Math.round((new Date(task.end_date).getTime() - new Date(task.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1) : 0} <span className="text-muted font-medium text-xs">Days</span>
                    </span>
                  )}
                </div>
              </div>

              {/* 7. Start Date */}
              <div className="flex flex-col space-y-1 p-3 rounded-xl border border-border/70 bg-surface/80 dark:bg-elevated/40 hover:border-theme-btn-primary/40 transition-all min-h-[76px] justify-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-success" /> <span className="text-success dark:text-success font-bold">Start Date</span> <span className="text-danger">*</span>
                </span>
                <div className="h-9 flex items-center">
                  {canEditDates ? (
                    <input
                      type="date"
                      className="w-full h-9 px-2.5 rounded-lg border border-border bg-white dark:bg-[#111827] text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-theme-btn-primary transition-all"
                      value={task.start_date ? String(task.start_date).substring(0, 10) : ""}
                      onChange={(e) => {
                        const newStartDate = e.target.value;
                        if (newStartDate && task.start_date && task.end_date) {
                          // Keep existing duration (in days) constant
                          const days = Math.max(1, Math.round((new Date(task.end_date).getTime() - new Date(task.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1);
                          const sDate = new Date(newStartDate);
                          sDate.setUTCDate(sDate.getUTCDate() + (days - 1));
                          const newEndDateStr = sDate.toISOString().split('T')[0];
                          setPendingTaskUpdates(prev => ({ 
                            ...prev, 
                            start_date: newStartDate, 
                            end_date: newEndDateStr 
                          }));
                          setTask((prev: any) => ({ 
                            ...prev, 
                            start_date: newStartDate, 
                            end_date: newEndDateStr 
                          }));
                        } else {
                          setPendingTaskUpdates(prev => ({ ...prev, start_date: newStartDate }));
                          setTask((prev: any) => ({ ...prev, start_date: newStartDate }));
                        }
                      }}
                    />
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-surface border border-border text-foreground">
                      {task.start_date ? new Date(task.start_date).toLocaleDateString() : "Not set"}
                    </div>
                  )}
                </div>
              </div>

              {/* 8. Due Date */}
              <div className="flex flex-col space-y-1 p-3 rounded-xl border border-border/70 bg-surface/80 dark:bg-elevated/40 hover:border-theme-btn-primary/40 transition-all min-h-[76px] justify-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <CalendarCheck className="w-3.5 h-3.5 text-warning" /> <span className="text-warning dark:text-warning font-bold">Due Date</span> <span className="text-danger">*</span>
                </span>
                <div className="h-9 flex items-center">
                  {canEditDates ? (
                    <input
                      type="date"
                      className="w-full h-9 px-2.5 rounded-lg border border-border bg-white dark:bg-[#111827] text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-theme-btn-primary transition-all"
                      value={task.end_date ? String(task.end_date).substring(0, 10) : ""}
                      onChange={(e) => {
                        const newEndDate = e.target.value;
                        if (newEndDate && task.start_date && newEndDate < task.start_date) {
                          toast.error("Due date cannot be earlier than start date");
                          return;
                        }
                        setPendingTaskUpdates(prev => ({ ...prev, end_date: newEndDate }));
                        setTask((prev: any) => ({ ...prev, end_date: newEndDate }));
                      }}
                    />
                  ) : (
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold ${ task.end_date && new Date(task.end_date) < new Date() ? "bg-rose-100 text-rose-700 dark:bg-danger/20 dark:text-danger" : "bg-surface border border-border text-foreground" }`}>
                      {task.end_date ? new Date(task.end_date).toLocaleDateString() : "Not set"}
                    </div>
                  )}
                </div>
              </div>

              {/* 9. Primary Assignee */}
              <div className="flex flex-col space-y-1 p-3 rounded-xl border border-border/70 bg-surface/80 dark:bg-elevated/40 hover:border-theme-btn-primary/40 transition-all min-h-[76px] justify-center">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-theme-icon" /> <span className="text-theme-icon font-bold">Primary Assignee</span>
                  </span>
                  { !readOnly && (task.assigned_to === task.currentUserId || task.currentUserIsSuperAdmin) && !effectivelyFrozenForUser && (
                    <AppButton 
                      variant="secondary" 
                      onClick={() => openAssigneeModal('primary')}
                      className="text-[10px] font-bold text-theme-icon hover:opacity-80 underline px-1 py-0 h-auto min-h-0"
                    >
                      Edit
                    </AppButton>
                  )}
                </div>
                <div className="flex items-center gap-2 h-9 overflow-hidden">
                  {pendingPrimaryAssignee ? (
                    (() => {
                      const pUser = stakeholders.find(s => s.id === pendingPrimaryAssignee);
                      return (
                        <div className="flex items-center gap-1.5 text-xs text-theme-icon font-bold">
                          <span className="inline-block w-2 h-2 rounded-full bg-theme-btn-primary animate-pulse" />
                          <span className="truncate">{pUser?.full_name || "New Primary"} (Pending save)</span>
                        </div>
                      );
                    })()
                  ) : task.assignee ? (
                    (() => {
                       const a = Array.isArray(task.assignee) ? task.assignee[0] : task.assignee;
                       if (!a) return null;
                       return (
                         <>
                           {a.profile_photo ? (
                             <img src={a.profile_photo} alt="" className="w-5 h-5 rounded-full object-cover bg-elevated shadow-xs" />
                           ) : (
                             <div className="w-5 h-5 rounded-full bg-theme-btn-primary/20 text-theme-icon flex items-center justify-center text-[10px] font-bold shadow-xs">
                               {a.full_name?.substring(0, 2).toUpperCase() || "U"}
                             </div>
                           )}
                           <span className="text-sm font-semibold text-foreground truncate">{a.full_name}</span>
                         </>
                       );
                    })()
                  ) : (
                    <span className="text-xs font-medium text-muted italic">Unassigned</span>
                  )}
                </div>
              </div>

              {/* 10. Executors */}
              <div className="flex flex-col space-y-1 p-3 rounded-xl border border-border/70 bg-surface/80 dark:bg-elevated/40 hover:border-theme-btn-primary/40 transition-all min-h-[76px] justify-center">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-success" /> <span className="text-success dark:text-success font-bold">Executors</span>
                    <span className="text-[10px] px-1.5 py-0 bg-success/10 text-success dark:text-success rounded-full font-bold">
                      {pendingAssignees ? pendingAssignees.length : explicitExecutors.length}
                    </span>
                  </span>
                  { !readOnly && (task.assigned_to === task.currentUserId || task.currentUserIsSuperAdmin) && !effectivelyFrozenForUser && (
                    <AppButton 
                      variant="secondary" 
                      onClick={() => openAssigneeModal('executors')}
                      className="text-[10px] font-bold text-success dark:text-success hover:opacity-80 underline px-1 py-0 h-auto min-h-0"
                    >
                      Edit
                    </AppButton>
                  )}
                </div>
                
                <div className="text-xs text-foreground h-9 flex items-center overflow-hidden">
                  {pendingAssignees ? (
                    <div className="flex items-center gap-1.5 text-xs text-success dark:text-success font-bold">
                      <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse" />
                      <span className="truncate">{pendingAssignees.length} executor(s) (Pending save)</span>
                    </div>
                  ) : (
                    <span className="truncate block w-full text-ellipsis whitespace-nowrap overflow-hidden font-semibold">
                      {explicitExecutors.length > 0 ? explicitExecutors.map((p: any) => p.full_name).join(', ') : <span className="text-muted italic text-xs">None</span>}
                    </span>
                  )}
                </div>
              </div>
              
              {/* 11. Watchers (Team) */}
              <div className="flex flex-col space-y-1 p-3 rounded-xl bg-warning/5 dark:bg-warning/10 border border-amber-200/60 dark:border-amber-800/40 hover:border-amber-400/80 transition-all duration-200 min-h-[76px] justify-center sm:col-span-2 lg:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-warning" /> <span className="text-warning dark:text-warning font-bold">Watchers (Team)</span>
                </span>
                <div className="text-xs text-foreground h-9 flex items-center overflow-hidden">
                  <span className="truncate block w-full text-ellipsis whitespace-nowrap overflow-hidden font-semibold">
                     {explicitWatchers.length > 0 ? explicitWatchers.map((p: any) => p.full_name).join(', ') : <span className="text-muted italic text-xs">None</span>}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </AppCard>
      </div>

      
      {/* 4. Remarks and Updates Group - Dedicated Card with Background-Colored Header */}
      <div>
        <AppCard className="overflow-hidden shadow-sm p-0 mb-4 border border-border">
          <div className="bg-surface dark:bg-elevated/50 px-5 py-3.5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-4 rounded-full bg-accent shadow-xs" />
              <MessageSquare className="w-4 h-4 text-accent" />
              <h3 className="font-bold text-sm tracking-wide text-foreground">Remarks and Updates</h3>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-theme-icon bg-theme-btn-primary/10 dark:bg-theme-btn-primary/20 px-2.5 py-0.5 rounded-full border border-theme-btn-primary/30">
              Data Feeding Zone
            </span>
          </div>
          
          <div className="p-5 space-y-6">
{/* Interactive Lifecycle State Transition Panel (MOVED TO TOP) */}
      
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">Status Field</label>
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
              className={`w-full h-10 px-3 rounded-xl text-sm font-semibold border border-border bg-white dark:bg-[#111827] text-foreground focus:outline-none focus:ring-2 focus:ring-theme-btn-primary focus:border-theme-btn-primary transition-all ${(readOnly || (!canEditCore && !(isOwner || isExecutor))) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {statuses.map(st => (
                <option key={st.id} value={st.code || st.status_code}>{st.name || st.status_name}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">Department Field</label>
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
              className={`w-full h-10 px-3 rounded-xl text-sm font-semibold border border-border bg-white dark:bg-[#111827] text-foreground focus:outline-none focus:ring-2 focus:ring-theme-btn-primary focus:border-theme-btn-primary transition-all ${(readOnly || (!canEditCore && !(isOwner || isExecutor))) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <option value="">-- No Department --</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-1.5 w-full">
            <label className="text-xs font-bold uppercase tracking-wider text-muted block text-right w-full">
              Quick Action Operations
            </label>
            <div className="flex flex-wrap justify-end gap-2 pt-0.5 w-full">
              {currentStatusCode === "ST_OPEN" && canEditCore && (
                <AppButton 
                  size="sm" 
                  variant="primary" 
                  className="bg-theme-btn-primary hover:opacity-90"
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
                  className="bg-success hover:bg-success"
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  disabled={actionLoading}
                  onClick={() => handleStatusTransition("resolve")}
                >
                  Resolve Directive
                </AppButton>
              )}

              {currentStatusCode === "ST_RESOLVED" && !readOnly && isOwner && (
                <>
                  <AppButton 
                    size="sm" 
                    variant="primary" 
                    className="bg-theme-btn-primary hover:opacity-90"
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    disabled={actionLoading}
                    onClick={() => handleStatusTransition("approve")}
                  >
                    Approve & Close
                  </AppButton>
                  <AppButton 
                    size="sm" 
                    variant="ghost" 
                    className="text-theme-icon hover:bg-rose-50 dark:hover:bg-danger/10"
                    leftIcon={<RotateCcw className="h-4 w-4" />}
                    disabled={actionLoading}
                    onClick={() => handleStatusTransition("reopen")}
                  >
                    Reject & Reopen
                  </AppButton>
                </>
              )}

              { !readOnly && task.status?.is_closed && (isOwner || isExecutor) && (
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
                  className="text-theme-icon hover:bg-rose-50 border-rose-200 dark:border-rose-500/20 dark:hover:bg-danger/10" 
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
                  className="text-theme-icon hover:opacity-90/10 border-theme-btn-primary/30 dark:border-theme-btn-primary/20 dark:hover:opacity-90/10" 
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
              <div className="mt-4 p-5 border-2 border-theme-btn-primary/30 bg-theme-btn-primary/10 dark:bg-theme-btn-primary/10 dark:border-theme-btn-primary/20 rounded-xl animate-in fade-in zoom-in-95 w-full text-left shadow-lg">
                <h4 className="text-sm font-bold text-theme-icon dark:text-theme-icon mb-4 flex items-center gap-2 border-b border-theme-btn-primary/30 dark:border-indigo-800 pb-2">
                  <FolderPlus className="w-4 h-4" /> Transfer Task to Another Workspace
                </h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="theme-data-value text-subtle  mb-1.5 block">Destination Workspace <span className="text-danger">*</span></label>
                      <select
                        value={selectedTransferSubworkspace || selectedTransferWorkspace}
                        onChange={e => {
                          const val = e.target.value;
                          if (!val) {
                            setSelectedTransferWorkspace("");
                            setSelectedTransferSubworkspace("");
                            return;
                          }
                          const selectedObj = flattenedWorkspaces.find(w => w.id === val);
                          if (selectedObj) {
                            if (selectedObj.isSub) {
                              setSelectedTransferWorkspace(selectedObj.rootId);
                              setSelectedTransferSubworkspace(val);
                            } else {
                              setSelectedTransferWorkspace(val);
                              setSelectedTransferSubworkspace("");
                            }
                          }
                        }}
                        className="w-full p-2.5 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-theme-btn-primary dark:bg-[#0B0F19] dark:border-border dark:text-white"
                      >
                        <option value="">-- Select Destination Workspace --</option>
                        {flattenedWorkspaces.map(w => (
                          <option 
                            key={w.id} 
                            value={w.id} 
                            disabled={w.id === (task.sub_workspace_id || task.workspace_id)}
                          >
                            {w.pathName} {w.id === (task.sub_workspace_id || task.workspace_id) ? "(Current)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {checkingScope && (
                    <div className="flex items-center gap-2 text-xs text-theme-icon font-bold p-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking user scope...
                    </div>
                  )}

                  {!checkingScope && droppedUsers.length > 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-warning/10 border border-amber-200 dark:border-amber-500/20 rounded-lg space-y-3">
                      <div className="text-xs text-amber-700 dark:text-warning font-semibold leading-relaxed">
                        <span className="font-bold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Out of Scope Users Detected</span>
                        The following participants do not have access to the destination and will be removed from this task: 
                        <strong className="block mt-1">{droppedUsers.map(u => u.full_name).join(", ")}</strong>
                      </div>
                      
                      {isOwnerDropped && (
                        <div className="theme-card-structural dark:bg-surface/20 p-3 rounded border-amber-200 dark:border-amber-500/30">
                          <label className="theme-data-value text-amber-800 dark:text-amber-300 mb-1.5 block">Assign New Primary Owner <span className="text-danger">*</span></label>
                          <select
                            value={newAssigneeId}
                            onChange={e => setNewAssigneeId(e.target.value)}
                            className="w-full p-2 rounded text-sm border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-[#0B0F19] dark:border-border dark:text-white"
                          >
                            <option value="">-- Select New Owner --</option>
                            {targetStakeholders.map(s => (
                              <option key={s.id} value={s.id}>{s.full_name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      {true && (
                        <div className="theme-card-structural dark:bg-surface/20 p-3 rounded border-amber-200 dark:border-amber-500/30 mt-2">
                          <label className="theme-data-value text-amber-800 dark:text-amber-300 mb-1.5 block">Assign Additional Executives (Optional)</label>
                          <div className="max-h-32 overflow-y-auto space-y-1 scrollbar-thin">
                            {targetStakeholders.map(s => (
                              <label key={s.id} className="flex items-center gap-2 text-xs text-subtle  p-1 hover:bg-surface/5 dark:hover:bg-surface/5 rounded cursor-pointer">
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
                    <label className="theme-data-value text-subtle  mb-1 block">Transfer Remarks (Mandatory) <span className="text-danger">*</span></label>
                    <textarea 
                      value={transferRemarks}
                      onChange={e => setTransferRemarks(e.target.value)}
                      className="w-full min-h-[60px] p-2.5 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-theme-btn-primary dark:bg-[#0B0F19] dark:border-border dark:text-white"
                      placeholder="Why is this task being transferred?"
                    />
                  </div>
                  <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
                    <AppButton variant="outline" size="sm" onClick={() => { setIsTransferModalOpen(false); setSelectedTransferWorkspace(""); setSelectedTransferSubworkspace(""); }} className="text-danger border-danger/30 hover:bg-danger/10 hover:border-danger hover:text-danger">Discard</AppButton>
                    <AppButton variant="primary" size="sm" className="bg-theme-btn-primary hover:opacity-90" onClick={submitTransfer} disabled={transferLoading || checkingScope}>
                      {transferLoading ? "Transferring..." : "Confirm Transfer"}
                    </AppButton>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {pendingStatus && (
          <div className="p-3 bg-warning/10 border border-amber-500/20 text-warning text-xs rounded-xl flex items-center justify-between animate-in slide-in-from-top-1">
            <span>Status change to <strong>{statuses.find(s => (s.code || s.status_code || s.id) === pendingStatus)?.name || statuses.find(s => (s.code || s.status_code || s.id) === pendingStatus)?.status_name || pendingStatus}</strong> is pending. Write a mandatory remark below and click <strong>"Commit Updates & Save Remark"</strong> to save both.</span>
            <AppButton variant="secondary" onClick={() => setPendingStatus(null)} className="text-xs text-warning/60 hover:text-warning font-bold px-2 underline hover:no-underline">Cancel Change</AppButton>
          </div>
        )}

        {pendingDepartment && (
          <div className="p-3 bg-theme-btn-primary/10 border border-theme-btn-primary/20 text-theme-icon text-xs rounded-xl flex items-center justify-between animate-in slide-in-from-top-1 mt-3">
            <span>Department change to <strong>{departments.find(d => d.id === pendingDepartment)?.name || pendingDepartment}</strong> is pending. Write a mandatory remark below and click <strong>"Commit Updates & Save Remark"</strong> to save both.</span>
            <AppButton variant="secondary" onClick={() => setPendingDepartment(null)} className="text-xs text-theme-icon/60 hover:text-theme-icon font-bold px-2 underline hover:no-underline">Cancel Change</AppButton>
          </div>
        )}

        {pendingAssignees && (
          <div className="p-3 bg-success/10 border border-emerald-500/20 text-theme-icon text-xs rounded-xl flex items-center justify-between animate-in slide-in-from-top-1 mt-3">
            <span>Executors change is pending. Write a mandatory remark below and click <strong>"Commit Updates & Save Remark"</strong> to save.</span>
            <AppButton variant="secondary" onClick={() => setPendingAssignees(null)} className="text-xs text-theme-icon/60 hover:text-theme-icon font-bold px-2 underline hover:no-underline">Cancel Change</AppButton>
          </div>
        )}

        {pendingPrimaryAssignee && (
          <div className="p-3 bg-theme-btn-primary/10 border border-theme-btn-primary/20 text-theme-icon text-xs rounded-xl flex items-center justify-between animate-in slide-in-from-top-1 mt-3">
            <span>Primary Assignee change is pending. Write a mandatory remark below and click <strong>"Commit Updates & Save Remark"</strong> to save.</span>
            <AppButton variant="secondary" onClick={() => setPendingPrimaryAssignee(null)} className="text-xs text-theme-icon/60 hover:text-theme-icon font-bold px-2 underline hover:no-underline">Cancel Change</AppButton>
          </div>
        )}
 
        <div className="space-y-3 p-4 rounded-2xl border border-border bg-surface dark:bg-[#111827]/40 transition-all">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              Task Remarks <span className="text-danger font-extrabold">*</span>
            </label>
            <span className="text-[10px] font-extrabold tracking-wider text-theme-icon bg-theme-btn-primary/15 px-2 py-0.5 rounded-md border border-theme-btn-primary/30">
              Required Handoff Input
            </span>
          </div>
          <RichTextEditor
            value={remarksDraft}
            onChange={setRemarksDraft}
            readOnly={!canAddRemark}
            placeholder={!canAddRemark ? "Task is frozen/read-only." : "Add update notes or handoff remarks..."}
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted">Last updated: {task.updated_at ? new Date(task.updated_at).toLocaleString() : "Not yet"}</span>
            {canAddRemark && (
              <AppButton type="button" variant="primary" size="sm" onClick={handleBatchSave} disabled={saveRemarksLoading}>
                {saveRemarksLoading ? "Saving..." : (pendingStatus || pendingDepartment || pendingAssignees || pendingPrimaryAssignee) ? "Commit Updates & Save Remark" : "Save Remarks"}
              </AppButton>
            )}
          </div>

          {/* Remarks History Queue */}
          <div className={`mt-3 rounded-md border p-3 transition-all duration-150 ${
            "bg-elevated border-border text-foreground"
          }`}>
            {/* Header with toggle */}
            <div 
              onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)} 
              className="flex items-center justify-between cursor-pointer select-none group"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-theme-icon" />
                <span className={`theme-data-value uppercase tracking-wider transition-colors ${
                  "text-muted group-hover:text-theme-icon"
                }`}>
                  Remarks History Queue
                </span>
                {remarksHistory.length > 0 && (
                  <AppBadge className="text-xs py-0.5 px-2 font-extrabold rounded-full bg-theme-btn-primary/20 text-theme-icon border border-theme-btn-primary/30">
                    {remarksHistory.length}
                  </AppBadge>
                )}
              </div>
              
              <AppButton variant="secondary" 
                type="button"
                className={`p-1 rounded-lg transition-colors ${
                  "hover:bg-elevated text-muted hover:text-foreground"
                }`}
              >
                {isHistoryCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </AppButton>
            </div>

            {/* Collapsible Content */}
            {!isHistoryCollapsed && (
              <div className="mt-4 space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-transparent">
                {remarksHistoryLoading ? (
                  <div className="flex items-center justify-center py-6 gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-theme-icon" />
                    <span className="text-xs text-muted">Loading history queue...</span>
                  </div>
                ) : remarksHistory.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted italic">
                    No remark history entries. Create a new remark above to start the queue.
                  </div>
                ) : (
                  <div className="relative pl-4 border-l border-theme-btn-primary/20 space-y-5">
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
                          <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-theme-btn-primary border-2 border-slate-900 group-hover/item:scale-125 transition-transform" />
                          
                          <div className="flex items-start gap-3">
                            {/* Avatar */}
                            {item.user?.profile_photo ? (
                              <img 
                                src={item.user.profile_photo} 
                                alt={item.user.full_name} 
                                className="h-7 w-7 rounded-full border border-theme-btn-primary/20 object-cover"
                              />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-accent to-indigo-600 flex items-center justify-center text-xs font-extrabold text-white border border-theme-btn-primary/20 shadow-md">
                                {initials}
                              </div>
                            )}

                            {/* Content Block */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1">
                                <span className={`theme-data-value transition-colors ${
                                  "text-foreground group-hover/item:text-theme-icon"
                                }`}>
                                  {item.user?.full_name || "System Actor"}
                                </span>
                                <div className="flex items-center gap-1 text-xs text-muted font-medium">
                                  <Clock className="h-3 w-3" />
                                  <span>{new Date(item.created_at).toLocaleString()}</span>
                                </div>
                              </div>
                              
                              <div className={`text-xs rounded-lg p-2.5 leading-relaxed break-words border ${
                                "bg-elevated border-border/50 text-muted"
                              }`}>
                                <SafeHtml html={item.message || item.content || ""} />
                              </div>
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
        </AppCard>
      </div>


      {/* 5. Utilities & Communication Group - Dedicated Card with 7 Tabs */}
      <div>
        <AppCard className="overflow-hidden shadow-md hover: hover:-translate-y-1 transition-all duration-500 theme-card-structural /40 p-0 mb-4">
          <div className="theme-card-structural dark:bg-elevated/50 px-5 py-3.5 border-b flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-4 rounded-full bg-accent shadow-xs" />
              <ActivitySquare className="w-4 h-4 text-accent" />
              <h3 className="font-bold text-sm tracking-wide text-foreground">Utilities & Communication</h3>
            </div>
          </div>
          
          <div className="p-5">
            {/* 7 Tab Navigation Buttons */}
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl theme-card-structural dark:bg-elevated/40 mb-6 shadow-xs">
              {[
                { id: 'tags', label: 'Tags', icon: Pin },
                { id: 'links', label: 'Link URL', icon: LinkIcon },
                { id: 'checklist', label: 'Checklist', icon: CheckSquare, count: task.checklists !== undefined ? task.checklists.length : (task._meta?.checklistCount || 0) },
                { id: 'attachments', label: 'Attachment', icon: Paperclip, count: task.attachments !== undefined ? task.attachments.length : (task._meta?.attachmentCount || 0) },
                { id: 'chat', label: 'Chat', icon: MessageCircle },
                { id: 'timeline', label: 'Audit (Timeline)', icon: ActivitySquare },
                { id: 'time', label: 'Time Logs', icon: Clock }
              ].map(t => {
                const isActive = activeTab === t.id;
                return (
                  <AppButton
                    key={t.id}
                    type="button"
                    variant={isActive ? "primary" : "ghost"}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`theme-tab-standard rounded-xl ${
                      isActive ? "shadow-md scale-[1.02] border-transparent" : "border border-transparent hover:border-border/60"
                    }`}
                  >
                    <t.icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-theme-icon"}`} />
                    <span>{t.label}</span>
                    {t.count !== undefined && t.count > 0 && (
                      <span className={`ml-1 px-1.5 py-0.2 text-[10px] font-extrabold rounded-full ${ isActive ? "theme-card-structural /20 text-white" : "bg-theme-btn-primary/10 text-theme-icon border-theme-btn-primary/20" }`}>
                        {t.count}
                      </span>
                    )}
                  </AppButton>
                );
              })}
            </div>

            {/* Tab Contents */}
            <div className="pt-4">
              {/* Tags Tab */}
              {activeTab === 'tags' && (
                <div className="space-y-4">
                  <h4 className="theme-data-value uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <Pin className="w-3.5 h-3.5 text-theme-icon" /> Custom Properties & Tags
                  </h4>
                  {localCustomFields && Object.keys(localCustomFields).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Object.entries(localCustomFields).map(([key, val]) => (
                        <div key={key} className="p-3 rounded-lg /40 theme-card-structural /40 space-y-1">
                          <span className="text-[10px] font-bold uppercase text-muted">{key.replace(/_/g, ' ')}</span>
                          <div className="text-xs font-semibold text-foreground">{val ? String(val) : "Not set"}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted italic py-4 text-center">No custom tags assigned to this task.</div>
                  )}
                </div>
              )}

              {/* Link URL Tab */}
              {activeTab === 'links' && (
                <div className="space-y-4">
                  <h4 className="theme-data-value uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-theme-icon" /> Link URLs & External Resources
                  </h4>
                  {localCustomFields?.link_url ? (
                    <div className="p-4 rounded-xl /40 theme-card-structural /40 flex items-center justify-between gap-4">
                      <a 
                        href={getSafeExternalUrl(localCustomFields.link_url)} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs font-semibold text-theme-icon hover:underline truncate flex-1"
                        title={localCustomFields.link_url}
                      >
                        {localCustomFields.link_url}
                      </a>
                      <a 
                        href={getSafeExternalUrl(localCustomFields.link_url)} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="px-3 py-1.5 rounded-lg bg-theme-btn-primary/10 hover:opacity-90/20 text-theme-icon text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0"
                      >
                        Open <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ) : (
                    <div className="text-xs text-muted italic py-4 text-center">No external links attached to this task.</div>
                  )}
                </div>
              )}

              {/* Checklist Tab */}
              {activeTab === 'checklist' && (
                <div className="space-y-4">
                  {!readOnly && canEditAux && (
                    <form onSubmit={handleAddChecklist} className="flex gap-2">
                      <AppInput
                        placeholder="Add new item..."
                        value={newChecklistLabel}
                        onChange={e => setNewChecklistLabel(e.target.value)}
                        className="text-xs"
                      />
                      <AppButton type="submit" variant="secondary" size="sm">Add</AppButton>
                    </form>
                  )}
                  {task.checklists && task.checklists.length > 0 ? (
                    <div className="space-y-2">
                      {task.checklists.map((item: any) => (
                        <div 
                          key={item.id} 
                          className="flex items-center justify-between p-2 rounded-lg /30 hover:theme-card-structural transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={item.is_completed}
                              onChange={() => canEditAux && handleToggleChecklist(item.id, item.is_completed)}
                              disabled={readOnly || !canEditAux}
                              className="h-4 w-4 rounded accent-accent"
                            />
                            <span className={`text-xs ${item.is_completed ? "line-through text-muted" : "text-foreground"}`}>
                              {item.label}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-muted-foreground" />
                            <select
                              value={item.assignee_id || ""}
                              onChange={(e) => handleSetChecklistAssignee(item.id, e.target.value)}
                              disabled={readOnly || !canEditAux}
                              className="text-[10px] bg-transparent border-none text-muted-foreground outline-none font-semibold focus:ring-0 cursor-pointer w-24"
                            >
                              <option value="">Unassigned</option>
                              {task.task_assignees?.map((a: any) => (
                                <option key={a.id} value={a.id}>{a.full_name}</option>
                              ))}
                              {task.task_watchers?.map((w: any) => (
                                <option key={w.id} value={w.id}>{w.full_name}</option>
                              ))}
                              {task.inherited_users?.map((u: any) => (
                                <option key={u.id} value={u.id}>{u.full_name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted italic py-4 text-center">No checklist items created.</div>
                  )}
                </div>
              )}

              {/* Attachments Tab */}
              {activeTab === 'attachments' && (
                <div className="space-y-4">
                  {!readOnly && canEditAux && (
                    <div className="flex items-center gap-2">
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                      <AppButton variant="secondary" size="sm" onClick={triggerFileSelect} leftIcon={<Paperclip className="w-3.5 h-3.5" />}>
                        Upload Attachment
                      </AppButton>
                    </div>
                  )}
                  {task.attachments && task.attachments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {task.attachments.map((item: any) => {
                        const isProxied = item.id && (item.file_url?.startsWith('storage:') || !item.file_url?.startsWith('http'));
                        const viewUrl = isProxied 
                          ? `/api/proxy-attachment/${item.id}` 
                          : item.file_url;
                        const downloadUrl = isProxied
                          ? `/api/proxy-attachment/${item.id}?download=1`
                          : (item.file_url ? `${item.file_url}${item.file_url.includes('?') ? '&' : '?'}download=1` : item.file_url);

                        return (
                          <div key={item.id} className="p-3 rounded-lg /30 theme-card-structural /30 flex items-center justify-between">
                            <span className="text-xs font-semibold truncate pr-2" title={item.file_name}>{item.file_name}</span>
                            {viewUrl && (
                              <div className="flex items-center gap-3 shrink-0">
                                <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent dark:text-accent font-bold hover:underline flex items-center gap-1" title="View Attachment">
                                  <Eye className="w-3.5 h-3.5" /> View
                                </a>
                                <a href={downloadUrl} download={item.file_name || "Attachment"} className="text-xs text-theme-icon font-bold hover:underline flex items-center gap-1" title="Download Attachment">
                                  <Download className="w-3.5 h-3.5" /> Download
                                </a>
                                {roleCode === 'SUPER_ADMIN' && !item.is_temp && (
                                  <AppButton
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleDeleteAttachment(item.id);
                                    }}
                                    className="text-xs text-danger hover:text-danger font-bold hover:underline flex items-center gap-1 ml-2"
                                    title="Delete Attachment"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                  </AppButton>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-muted italic py-4 text-center">No file attachments uploaded.</div>
                  )}
                </div>
              )}

              {/* Chat Tab */}
              {activeTab === 'chat' && <TaskRealtimeChat taskId={taskId} />}

              {/* Audit Timeline Tab */}
              {activeTab === 'timeline' && <TaskActivityTimeline taskId={taskId} />}

              {/* Time Logs Tab */}
              {activeTab === 'time' && <TaskTimeLogs taskId={taskId} onLogAdded={onUpdate} />}
            </div>
          </div>
        </AppCard>
      </div>

      {/* Dedicated High-Clarity Assignee & Executor Management Modal */}
      {isAssigneeModalOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 animate-in fade-in duration-200"
          onClick={() => setIsAssigneeModalOpen(false)}
        >
          <div 
            className="bg-surface border border-border rounded-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[88vh] shadow-2xl animate-in zoom-in-95 duration-200 text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-surface border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-theme-btn-primary/15 flex items-center justify-center text-theme-icon">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Manage Task Ownership & Executors</h3>
                  <p className="text-xs text-muted">Assign the Primary Owner and collaborating Executors for this task.</p>
                </div>
              </div>
              <AppButton 
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsAssigneeModalOpen(false)} 
                className="rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </AppButton>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-border bg-surface px-6 pt-3 gap-2">
              <AppButton
                type="button"
                variant="ghost"
                onClick={() => setAssigneeModalTab('primary')}
                className={`theme-tab-standard rounded-t-xl border-b-2 ${ assigneeModalTab === 'primary' ? 'border-theme-btn-primary text-theme-btn-primary font-bold bg-theme-btn-primary/10' : 'border-transparent text-muted hover:text-foreground' }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Primary Assignee</span>
                {selectedPrimaryAssignee && (
                  <span className="w-2 h-2 rounded-full bg-theme-btn-primary" />
                )}
              </AppButton>
              <AppButton
                type="button"
                variant="ghost"
                onClick={() => setAssigneeModalTab('executors')}
                className={`theme-tab-standard rounded-t-xl border-b-2 ${ assigneeModalTab === 'executors' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10' : 'border-transparent text-muted hover:text-foreground' }`}
              >
                <Users className="w-4 h-4" />
                <span>Executors</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full font-bold">
                  {selectedExecutors.length}
                </span>
              </AppButton>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-border bg-surface">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search workspace members by name or email..."
                  value={stakeholderSearch}
                  onChange={(e) => setStakeholderSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-9 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-theme-btn-primary transition-all placeholder:text-muted"
                />
                {stakeholderSearch && (
                  <AppButton 
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setStakeholderSearch("")}
                    className="absolute right-2.5 top-2.5 text-muted hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </AppButton>
                )}
              </div>
            </div>

            {/* User Selection List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[380px] scrollbar-thin">
              {(() => {
                const filteredStakeholders = stakeholders.filter(s => {
                  if (!stakeholderSearch) return true;
                  const term = stakeholderSearch.toLowerCase();
                  return (
                    s.full_name?.toLowerCase().includes(term) ||
                    s.email?.toLowerCase().includes(term) ||
                    s.department?.toLowerCase().includes(term)
                  );
                });

                if (filteredStakeholders.length === 0) {
                  return (
                    <div className="p-8 text-center text-xs text-muted">
                      {stakeholders.length === 0 ? "Loading workspace members..." : "No matching members found."}
                    </div>
                  );
                }

                if (assigneeModalTab === 'primary') {
                  return (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-muted px-1 pb-1">
                        Choose the single primary lead responsible for this task:
                      </div>
                      {filteredStakeholders.map(s => {
                        const isSelected = selectedPrimaryAssignee === s.id;
                        return (
                          <div
                            key={s.id}
                            onClick={async () => {
                              if (checkingDependencyId) return;
                              if (isSelected) {
                                if (task?.id) {
                                  setCheckingDependencyId(s.id);
                                  try {
                                    const { checkTaskUserDependencies } = await import("@/lib/actions/dependencies");
                                    const deps = await checkTaskUserDependencies(task.id, [s.id]);
                                    const result = deps[s.id];
                                    if (result && !result.isSafe) {
                                      setDependencyModal({ userId: s.id, userName: s.full_name, result });
                                      return;
                                    }
                                  } catch (e) {
                                    console.error(e);
                                  } finally {
                                    setCheckingDependencyId(null);
                                  }
                                }
                                setSelectedPrimaryAssignee("");
                              } else {
                                setSelectedPrimaryAssignee(s.id);
                              }
                            }}
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${ isSelected ? 'border-theme-btn-primary bg-theme-btn-primary/10 dark:bg-theme-btn-primary/15' : 'border-border/60 hover:border-theme-btn-primary/40 hover:bg-surface-hover' } ${checkingDependencyId === s.id ? 'opacity-50 pointer-events-none' : ''}`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {s.profile_photo ? (
                                <img src={s.profile_photo} alt="" className="w-8 h-8 rounded-full object-cover bg-elevated shadow-xs shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-theme-btn-primary/20 text-theme-icon flex items-center justify-center text-xs font-bold shrink-0">
                                  {s.full_name?.substring(0, 2).toUpperCase() || "U"}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-foreground flex items-center gap-2 truncate">
                                  <span>{s.full_name}</span>
                                  {checkingDependencyId === s.id && <Loader2 className="w-3 h-3 animate-spin text-theme-icon" />}
                                  {isSelected && (
                                    <span className="text-[10px] bg-theme-btn-primary text-theme-btn-primary-text px-2 py-0.2 rounded-full font-semibold shrink-0">
                                      Primary
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-muted truncate">{s.email || "Workspace Member"}</div>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                              isSelected ? 'border-theme-btn-primary bg-theme-btn-primary text-theme-btn-primary-text' : 'border-border'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                // Executors Multi-Select Tab
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1 pb-1">
                      <span className="text-[11px] font-semibold text-muted">
                        Select all collaborators who will execute this directive:
                      </span>
                      <div className="flex items-center gap-2">
                        <AppButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedExecutors(stakeholders.map(s => s.id))}
                          className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                        >
                          Select All
                        </AppButton>
                        <span className="text-muted text-xs">•</span>
                        <AppButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedExecutors([])}
                          className="text-[10px] text-muted hover:text-foreground font-bold hover:underline"
                        >
                          Clear All
                        </AppButton>
                      </div>
                    </div>
                    {filteredStakeholders.map(s => {
                      const isSelected = selectedExecutors.includes(s.id);
                      return (
                        <div
                          key={s.id}
                          onClick={async () => {
                            if (checkingDependencyId) return;
                            if (isSelected) {
                              if (task?.id) {
                                setCheckingDependencyId(s.id);
                                try {
                                  const { checkTaskUserDependencies } = await import("@/lib/actions/dependencies");
                                  const deps = await checkTaskUserDependencies(task.id, [s.id]);
                                  const result = deps[s.id];
                                  if (result && !result.isSafe) {
                                    setDependencyModal({ userId: s.id, userName: s.full_name, result });
                                    return;
                                  }
                                } catch (e) {
                                  console.error(e);
                                } finally {
                                  setCheckingDependencyId(null);
                                }
                              }
                              setSelectedExecutors(selectedExecutors.filter(id => id !== s.id));
                            } else {
                              setSelectedExecutors([...selectedExecutors, s.id]);
                            }
                          }}
                          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${ isSelected ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15' : 'border-border/60 hover:border-emerald-400/40 hover:bg-surface-hover' } ${checkingDependencyId === s.id ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {s.profile_photo ? (
                              <img src={s.profile_photo} alt="" className="w-8 h-8 rounded-full object-cover bg-elevated shadow-xs shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                                {s.full_name?.substring(0, 2).toUpperCase() || "U"}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-foreground flex items-center gap-2 truncate">
                                <span>{s.full_name}</span>
                                {checkingDependencyId === s.id && <Loader2 className="w-3 h-3 animate-spin text-theme-icon" />}
                                {s.id === selectedPrimaryAssignee && (
                                  <span className="text-[10px] bg-theme-btn-primary/15 text-theme-icon border border-theme-btn-primary/30 px-1.5 py-0.2 rounded-full font-semibold shrink-0">
                                    Primary Owner
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted truncate">{s.email || "Workspace Member"}</div>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                            isSelected ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-border'
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-surface border-t border-border flex items-center justify-between">
              <div className="text-xs text-muted">
                <span className="font-semibold text-foreground">
                  {selectedPrimaryAssignee ? (stakeholders.find(s => s.id === selectedPrimaryAssignee)?.full_name || "Primary Selected") : "No Primary"}
                </span>
                {" • "}
                <span>{selectedExecutors.length} executor(s)</span>
              </div>
              <div className="flex items-center gap-2">
                <AppButton 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsAssigneeModalOpen(false)}
                >
                  Cancel
                </AppButton>
                <AppButton 
                  variant="primary" 
                  size="sm" 
                  onClick={handleStageAssignees}
                  className="bg-theme-btn-primary hover:opacity-90"
                >
                  Stage Assignment
                </AppButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dependency Check Modal */}
      {dependencyModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background border border-border rounded-xl  max-w-md w-full overflow-hidden">
            <div className={`p-4 border-b ${dependencyModal.result.type === 'executive' ? 'bg-danger/10 border-danger/20' : 'bg-warning/10 border-warning/20'}`}>
              <div className="flex items-center gap-3">
                {dependencyModal.result.type === 'executive' ? (
                  <ShieldAlert className="w-5 h-5 text-danger" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-warning" />
                )}
                <h3 className="font-bold text-sm">Action Requires Attention</h3>
              </div>
            </div>
            
            <div className="p-5">
              <p className="text-sm text-foreground leading-relaxed mb-4">
                <strong>{dependencyModal.userName}</strong> has active dependencies in this task:
              </p>
              
              <ul className="text-xs text-muted mb-5 space-y-1 bg-surface p-3 rounded-lg border border-border/50 max-h-40 overflow-y-auto">
                {dependencyModal.result.blockingItems.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-theme-icon mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              
              <div className="p-3 bg-surface-hover rounded-lg border border-border/50 text-xs text-foreground font-medium">
                {dependencyModal.result.message}
              </div>
            </div>
            
            <div className="p-4 border-t border-border flex justify-end gap-3 bg-surface/30">
              <AppButton 
                variant="outline" 
                onClick={() => setDependencyModal(null)}
              >
                {dependencyModal.result.type === 'executive' ? 'Close' : 'No, Go Back'}
              </AppButton>
              {dependencyModal.result.type === 'watcher' && (
                <AppButton 
                  variant="primary" 
                  className="bg-danger hover:opacity-90 border-none"
                  onClick={() => {
                    // Safe to remove watcher
                    if (assigneeModalTab === 'primary') {
                      setSelectedPrimaryAssignee("");
                    } else {
                      setSelectedExecutors(selectedExecutors.filter(id => id !== dependencyModal.userId));
                    }
                    setDependencyModal(null);
                  }}
                >
                  Yes, Remove User
                </AppButton>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </ExperienceProvider>
  );
}


// HMR Force Reload: 1785172251227
