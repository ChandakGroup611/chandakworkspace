// TODO(ui-v2): migrate to tokens
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
  User, Calendar, Tag, Flag, Hourglass, CalendarDays, CalendarCheck, ShieldCheck, ShieldAlert, Users, X, Search, Check, UserCheck,
  AlertTriangle, RefreshCw, GitFork
} from "lucide-react";
import Link from "next/link";
import {
  getTaskDetails, createTask, updateTask, deleteTask, transitionTaskStatus, resolveTask,
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
import ChandakLoader from "@/components/ui/ChandakLoader";
import { sanitizeErrorMessage, isReloadRequiredError } from "@/lib/utils";

const getSafeExternalUrl = (url: string | undefined | null) => {
  if (!url) return '#';
  const str = String(url).trim();
  if (/^(https?|file|ftp|smb|mailto|tel):/i.test(str)) return str;
  return `https://${str}`;
};

const TaskRealtimeChat = dynamic(() => import("@/components/tasks/TaskRealtimeChat"), {
  ssr: false,
  loading: () => <div className="p-6 text-center theme-data-value text-muted animate-pulse">Loading realtime chat…</div>
});

const TaskActivityTimeline = dynamic(() => import("@/components/tasks/TaskActivityTimeline"), {
  ssr: false,
  loading: () => <div className="p-6 text-center theme-data-value text-muted animate-pulse">Loading audit timeline…</div>
});

const TaskCreationWizard = dynamic(() => import("@/components/tasks/TaskCreationWizard"), {
  ssr: false,
  loading: () => <ChandakLoader />
});

const TaskTimeLogs = dynamic(() => import("@/components/tasks/TaskTimeLogs"), {
  ssr: false,
  loading: () => <div className="p-6 text-center theme-data-value text-muted animate-pulse">Loading time logs…</div>
});
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });
import 'react-quill-new/dist/quill.snow.css';
import { confirmAction } from "@/components/ui/feedback/confirm";
import { formatDateTime, formatDate, PriorityIndicator } from "@/components/ui/data";

const RichTextEditor = ({ value, onChange, readOnly = false, placeholder = "" }: { value: string, onChange: (val: string) => void, readOnly?: boolean, placeholder?: string }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="p-4 rounded-xl animate-pulse theme-card-structural h-36 text-xs font-semibold text-muted flex items-center justify-center">Loading editor…</div>;
  }

  return (
    <div className="quill-wrapper rounded-xl theme-card-structural text-foreground overflow-hidden shadow-sm">
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
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
          ]
        }}
      />
    </div>
  );
};

export default function TaskExecutionController({
  taskId,
  onUpdate,
  initialTask,
  initialStatuses,
  initialDepartments,
  initialPriorities,
  readOnly = false
}: {
  taskId: string;
  onUpdate?: () => void;
  initialTask?: any;
  initialStatuses?: any[];
  initialDepartments?: any[];
  initialPriorities?: any[];
  readOnly?: boolean;
}) {
  const { isLight: isLightMode } = useTheme();

  const router = useRouter();
  const { hasPermission, roleCode, userId } = usePermissions();
  const canDelete = !readOnly && hasPermission("TASKS_DELETE");
  const [task, setTask] = useState<any>(initialTask || null);
  const [statuses, setStatuses] = useState<any[]>(initialStatuses || []);
  const [departments, setDepartments] = useState<any[]>(initialDepartments || []);
  const [prioritiesList, setPrioritiesList] = useState<any[]>(initialPriorities || []);
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);
  const [loading, setLoading] = useState(!initialTask);
  const [activeTab, setActiveTab] = useState<"subtasks" | "tags" | "links" | "checklist" | "attachments" | "chat" | "timeline" | "time">(() => {
    return (initialTask?.subtasks && initialTask.subtasks.length > 0) ? "subtasks" : "checklist";
  });

  // Subtask management
  const [subtasks, setSubtasks] = useState<any[]>(initialTask?.subtasks || []);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [updatingSubtaskId, setUpdatingSubtaskId] = useState<string | null>(null);

  useEffect(() => {
    if (task?.subtasks) {
      setSubtasks(task.subtasks);
    }
  }, [task?.subtasks]);

  useEffect(() => {
    if (initialPriorities && initialPriorities.length > 0) {
      setPrioritiesList(initialPriorities);
    } else {
      import("@/lib/actions/workspaces").then(m => m.fetchPriorities()).then(p => {
        if (p && p.length > 0) setPrioritiesList(p);
      }).catch(console.error);
    }
  }, [initialPriorities]);

  const handleSubtaskStatusChange = async (subtaskId: string, newStatusId: string) => {
    setUpdatingSubtaskId(subtaskId);
    try {
      const { updateTaskStatusInline } = await import("@/lib/actions/tasks");
      const res = await updateTaskStatusInline(subtaskId, newStatusId, "Status updated from parent task details view");
      if (res && res.error) {
        toast.error(res.error);
      } else {
        toast.success("Subtask status updated");
        const targetStatusObj = (initialStatuses || statuses || []).find((s: any) => s.id === newStatusId);
        setSubtasks(prev => prev.map(st => st.id === subtaskId ? {
          ...st,
          status_id: newStatusId,
          status: targetStatusObj ? {
            id: targetStatusObj.id,
            name: targetStatusObj.status_name || targetStatusObj.name,
            code: targetStatusObj.status_code || targetStatusObj.code,
            color: targetStatusObj.status_color || targetStatusObj.color
          } : st.status
        } : st));
        if (onUpdate) onUpdate();
      }
    } catch (err: any) {
      toast.error("Failed to update status: " + (err.message || "Unknown error"));
    } finally {
      setUpdatingSubtaskId(null);
    }
  };

  const handleSubtaskCreated = async (payload: any) => {
    try {
      const targetWorkspaceId = task?.sub_workspace_id || task?.workspace_id;
      const res = await createTask({
        ...payload,
        workspace_id: targetWorkspaceId,
        parent_task_id: task?.id || taskId,
        created_by: currentUid || ""
      });

      if (res && res.error) {
        toast.error(res.error);
        return; // Keep wizard open on failure
      }

      toast.success("Subtask created successfully");
      setIsAddingSubtask(false);

      const fresh = await getTaskDetails(taskId);
      if (fresh && !fresh.error && fresh.subtasks) {
        setSubtasks(fresh.subtasks);
      } else if (res && res.data) {
        setSubtasks(prev => [...prev, res.data]);
      } else if (payload) {
        setSubtasks(prev => [...prev, payload]);
      }
      router.refresh();
      if (onUpdate) onUpdate();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create subtask");
      // Keep wizard open on error
    }
  };

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
  const [pendingWatchers, setPendingWatchers] = useState<string[] | null>(null);

  // Assignee, Executor & Watcher Modal State
  const [isAssigneeModalOpen, setIsAssigneeModalOpen] = useState(false);
  const [assigneeModalTab, setAssigneeModalTab] = useState<'primary' | 'executors' | 'watchers'>('primary');
  const [selectedPrimaryAssignee, setSelectedPrimaryAssignee] = useState<string>("");
  const [selectedExecutors, setSelectedExecutors] = useState<string[]>([]);
  const [selectedWatchers, setSelectedWatchers] = useState<string[]>([]);
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

  const openAssigneeModal = async (tab: 'primary' | 'executors' | 'watchers' = 'primary') => {
    setAssigneeModalTab(tab);
    setSelectedPrimaryAssignee(pendingPrimaryAssignee || task?.assigned_to || "");
    const currentExecutorIds = pendingAssignees || (task?.task_assignees || []).map((e: any) => e.id);
    setSelectedExecutors(currentExecutorIds);
    const currentWatcherIds = (pendingWatchers || (task?.task_watchers || []).map((w: any) => w.id));
    setSelectedWatchers(currentWatcherIds);
    setStakeholderSearch("");
    setIsAssigneeModalOpen(true);

    if (task?.workspace_id) {
      try {
        const { fetchWorkspaceStakeholders } = await import("@/lib/actions/workspaces");
        const res = await fetchWorkspaceStakeholders(task.workspace_id);
        const activeById = new Map<string, any>((res || []).map((u: any) => [u.id, { ...u, is_active: true }]));

        // Include all active workspace members plus any inactive users already assigned to this task (Primary, Executors, Watchers)
        const existingAssignees = [
          task.assignee || task.assigned_to_user,
          ...(task.task_assignees || []),
          ...(task.task_watchers || [])
        ].filter(Boolean);

        const finalMap = new Map<string, any>(activeById);
        for (const ea of existingAssignees) {
          if (!ea?.id || finalMap.has(ea.id)) continue;
          // Inactive / removed user currently on the task: keep visible until explicitly changed
          finalMap.set(ea.id, {
            id: ea.id,
            full_name: ea.full_name || 'Assigned User',
            user_code: ea.user_code || '',
            profile_photo: ea.profile_photo || null,
            workspace_role: 'Assignee',
            is_active: false,
          });
        }
        const finalStakeholders = Array.from(finalMap.values());

        setStakeholders(finalStakeholders);
        // Automatically remove deactivated users from active Watchers selection
        setSelectedWatchers(prev => prev.filter(id => activeById.has(id)));
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
    setPendingWatchers(selectedWatchers);
    setIsAssigneeModalOpen(false);
    triggerToast("Participant changes staged! Provide remarks and save updates.");
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
        } catch (err) { }
      }
    }
    clearMentions();
  }, [taskId]);



  const handleStatusTransition = async (action: "start" | "resolve" | "approve" | "reopen") => {
    setActionLoading(true);
    setError(null);
    try {
      if (action === "start") {
        const inProgressStatus = statuses.find((s: any) => (s.is_active !== false) && !s.is_deleted && ((s.code || s.status_code || '').toUpperCase().includes('INPROGRESS') || (s.code || s.status_code || '').toUpperCase().includes('IN PROGRESS') || (s.name || s.status_name || '').toUpperCase().includes('IN PROGRESS')));
        if (!inProgressStatus) {
          toast.error("No active In Progress status configured.");
          setError("No active In Progress status configured.");
          return;
        }
        const { changeTaskStatus } = await import("@/lib/actions/tasks");
        const res = await changeTaskStatus(taskId, inProgressStatus.id);
        if (res && res.error) {
          toast.error(res.error);
          setError(res.error);
          return;
        }
        toast.success("Task progress started");
        await loadTaskDetails(true);
      } else if (action === "resolve") {
        const { resolveTask } = await import("@/lib/actions/tasks");
        const res = await resolveTask(taskId);
        if (res && res.error) {
          toast.error(res.error);
          setError(res.error);
          return;
        }
        toast.success("Task marked for review");
        await loadTaskDetails(true);
      } else if (action === "approve") {
        const { approveTask } = await import("@/lib/actions/tasks");
        const res = await approveTask(taskId);
        if (res && res.error) {
          toast.error(res.error);
          setError(res.error);
          return;
        }
        toast.success("Task approved & closed");
        await loadTaskDetails(true);
      } else if (action === "reopen") {
        const { reopenTask } = await import("@/lib/actions/tasks");
        const res = await reopenTask(taskId);
        if (res && res.error) {
          toast.error(res.error);
          setError(res.error);
          return;
        }
        toast.success("Task reopened");
        await loadTaskDetails(true);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to transition task status.");
      setError(e.message || "Failed to transition task status.");
    } finally {
      setActionLoading(false);
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
    if (!(await confirmAction("Are you sure you want to delete this attachment? This action cannot be undone."))) return;
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
      <AppCard className="p-12 flex flex-col items-center justify-center">
        <ChandakLoader size="md" title="Hydrating task details…" subtitle="Synchronizing timeline and execution parameters" />
      </AppCard>
    );
  }

  const handleBatchSave = async () => {
    if (!task) return;

    // Remark is optional. The editor can hold empty markup such as <p></p>, so check the plain text.
    const remarkText = (remarksDraft || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim();
    const remarkToSend = remarkText ? remarksDraft.trim() : undefined;

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

      const executorsToUpdate = pendingAssignees !== null ? pendingAssignees : undefined;
      const primaryToUpdate = pendingPrimaryAssignee !== null ? pendingPrimaryAssignee : undefined;
      const watchersToUpdate = pendingWatchers !== null ? pendingWatchers : undefined;

      const hasBatchUpdates = Object.keys(updatePayload).length > 0 ||
        finalStatusId !== undefined ||
        departmentChangeObj !== undefined ||
        newChecklistsPayload.length > 0 ||
        (pendingChecklists && pendingChecklists.length > 0) ||
        (editedChecklists && Object.keys(editedChecklists).length > 0) ||
        !!remarkToSend ||
        attachmentIds.length > 0 ||
        executorsToUpdate !== undefined ||
        primaryToUpdate !== undefined ||
        watchersToUpdate !== undefined;

      if (!hasBatchUpdates) {
        toast.info("There's nothing to save yet.");
        return;
      }

      let res: any = { success: true };
      if (hasBatchUpdates) {
        res = await executeTaskBatchOperation({
          taskId,
          updates: updatePayload,
          statusChanges: finalStatusId,
          departmentChange: departmentChangeObj,
          checklistCreates: newChecklistsPayload.length > 0 ? newChecklistsPayload : pendingChecklists,
          checklistUpdates: editedChecklists,
          remarks: remarkToSend,
          attachmentIds,
          assignees: executorsToUpdate !== undefined ? executorsToUpdate : (primaryToUpdate !== undefined ? (task.task_assignees || []).map((e: any) => e.id) : undefined),
          primaryAssigneeId: primaryToUpdate !== undefined ? primaryToUpdate : (executorsToUpdate !== undefined ? task.assigned_to : undefined),
          watchers: watchersToUpdate,
          workspaceId: task.workspace_id
        });

        if (res?.error) throw new Error("Batch Save Error: " + res.error);
      }
      const t2 = performance.now();

      if (pendingAssignees !== null || pendingPrimaryAssignee !== null) {
        setPendingAssignees(null);
        setPendingPrimaryAssignee(null);
        // Force hydration since assignment changed
        await loadTaskDetails(true);
      }

      if (pendingWatchers !== null) {
        setPendingWatchers(null);
        // Force hydration since watchers changed
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
    if (!(await confirmAction("Delete this task? This action can be restored only by a database administrator."))) return;
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
  const isEffectivelyFrozen = isFrozen ? (pendingStatus ? !targetStatusObj?.is_closed : true) : false;

  const currentUid = userId || task.currentUserId;
  const isSuperAdmin = task.currentUserIsSuperAdmin || hasPermission("SUPER_ADMIN") || roleCode === "SUPER_ADMIN";
  const isTaskAssignee = (currentUid && ((task.assigned_to && task.assigned_to === currentUid) || (task.owner_id && task.owner_id === currentUid))) || task.isTaskAssignee;
  const isExecutor = currentUid ? (task.task_assignees?.some((a: any) => a.id === currentUid) || false) : false;
  const isWatcherOrReviewer = currentUid ? (task.task_watchers?.some((w: any) => w.id === currentUid) || task.task_reviewers?.some((r: any) => r.id === currentUid) || false) : false;
  const isTaskCreator = (currentUid && task.created_by && task.created_by === currentUid) || task.isTaskCreator;
  const isCreatorOnly = isTaskCreator && !isTaskAssignee && !isExecutor && !isSuperAdmin;

  // Reopen/Bypass freeze is strictly for Super Admin or Primary Assignee (Task Owner)
  const canBypassFreeze = isSuperAdmin || isTaskAssignee;
  const effectivelyFrozenForUser = isEffectivelyFrozen && !canBypassFreeze;

  // 1. Assignees & Executors Edit: Strictly Super Admin or Primary Assignee
  const canEditAssignees = !readOnly && !effectivelyFrozenForUser && (isSuperAdmin || isTaskAssignee);

  // 2. Watchers Edit: Strictly Super Admin, Primary Assignee, or Task Creator
  const canEditWatchers = !readOnly && !effectivelyFrozenForUser && (isSuperAdmin || isTaskAssignee || isTaskCreator);

  // 3. Schedule / Dates / Duration Edit: Strictly Super Admin or Primary Assignee
  const canEditDates = !readOnly && !effectivelyFrozenForUser && (isSuperAdmin || isTaskAssignee);

  // Priority Edit: Super Admin, task owner/assignee/creator, not frozen (mirrors server authorization)
  const canEditPriority = !readOnly && !effectivelyFrozenForUser && (
    isSuperAdmin ||
    isTaskAssignee ||
    isTaskCreator ||
    Boolean(task.owner_id && task.owner_id === currentUid)
  );

  // 4. Status / Department / Directive Transitions: Super Admin, Primary Assignee, or Assigned Executors
  const isOwnerOrExecutor = isSuperAdmin || isTaskAssignee || isExecutor;
  const canEditCore = !readOnly && !effectivelyFrozenForUser && isOwnerOrExecutor;
  const canEditAux = canEditCore;

  // 5. Roles: Owner is Primary Assignee / SuperAdmin
  const isOwner = isSuperAdmin || isTaskAssignee;

  // 6. Transfer Task: Strictly Super Admin or Primary Assignee
  const canTransferTask = !readOnly && !effectivelyFrozenForUser && (isSuperAdmin || isTaskAssignee);

  // 7. Delete Task: Super Admin, workspace owner, or task owner (mirrors server deleteTask check)
  const canDeleteTask = !readOnly && !effectivelyFrozenForUser && (isSuperAdmin || isTaskAssignee || Boolean(task.workspace?.workspace_owner_id && task.workspace.workspace_owner_id === currentUid)) && canDelete;

  // Status stage calculations (Decision D1, D2, D3)
  const isClosedTask = Boolean(task.status?.is_closed || task.status?.is_terminal);
  const curCode = (task.status?.code || task.status?.status_code || currentStatusCode || '').toUpperCase();
  const curName = (task.status?.name || task.status?.status_name || '').toUpperCase();

  const isReviewStage = !isClosedTask && (curCode === 'NEED TO CHECK' || curName === 'NEED TO CHECK' || curCode === 'RESOLVED' || curCode === 'ST_RESOLVED' || curName === 'RESOLVED');
  const isInProgressStage = !isClosedTask && !isReviewStage && (curCode.includes('INPROGRESS') || curCode.includes('IN PROGRESS') || curCode === 'ST_IN_PROGRESS' || curName.includes('IN PROGRESS'));
  const isOpenStage = !isClosedTask && !isReviewStage && !isInProgressStage;

  const hasActiveInProgress = statuses.some((s: any) => (s.is_active !== false) && !s.is_deleted && ((s.code || s.status_code || '').toUpperCase().includes('INPROGRESS') || (s.code || s.status_code || '').toUpperCase().includes('IN PROGRESS') || (s.name || s.status_name || '').toUpperCase().includes('IN PROGRESS')));
  const hasActiveResolved = statuses.some((s: any) => (s.is_active !== false) && !s.is_deleted && ((s.code || s.status_code || '').toUpperCase() === 'RESOLVED' || (s.name || s.status_name || '').toUpperCase() === 'RESOLVED'));
  const hasActiveNeedToCheck = statuses.some((s: any) => (s.is_active !== false) && !s.is_deleted && ((s.code || s.status_code || '').toUpperCase() === 'NEED TO CHECK' || (s.name || s.status_name || '').toUpperCase() === 'NEED TO CHECK'));
  const hasActiveReview = hasActiveResolved || hasActiveNeedToCheck;
  const hasActiveClosed = statuses.some((s: any) => (s.is_active !== false) && !s.is_deleted && (s.is_closed || s.is_terminal));

  // 8. Reviewers, Watchers, Executives, Assignee, and Creator (tracking progress) can add remarks
  const canAddRemark = !readOnly && !effectivelyFrozenForUser && (isSuperAdmin || isTaskAssignee || isExecutor || isWatcherOrReviewer || isTaskCreator);
  // Filter inherited workspace members to remove anyone explicitly assigned
  const explicitExecutors = [...(task.task_assignees || [])];

  // Implicitly treat the Primary Assignee as an Executor
  if (task.assignee && !explicitExecutors.some((e: any) => e.id === task.assignee.id)) {
    explicitExecutors.unshift(task.assignee);
  }

  const explicitReviewers = task.task_reviewers || [];
  const explicitWatchers = [...(task.task_watchers || [])];



  return (
    <ExperienceProvider mode="operational">
      <div className="space-y-6">

        {/* High-Contrast Clear Warning / Notice Banner */}
        {error && (
          <div role="alert" className={`p-4 rounded-md border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${isReloadRequiredError(error)
            ? 'bg-warning-soft border-warning-border text-warning-text'
            : 'bg-danger-soft border-danger-border text-danger-text'
            }`}>
            <div className="flex items-start sm:items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden />
              <div>
                <p className="text-[13.5px] font-semibold">
                  {isReloadRequiredError(error) ? 'A new version of the app is available' : 'Something went wrong'}
                </p>
                <p className="text-[13px] mt-0.5 leading-snug">
                  {sanitizeErrorMessage(error)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {isReloadRequiredError(error) && (
                <AppButton
                  variant="primary"
                  size="sm"
                  onClick={() => window.location.reload()}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Reload page
                </AppButton>
              )}
              <AppButton
                variant="secondary"
                size="sm"
                onClick={() => setError(null)}
              >
                Dismiss
              </AppButton>
            </div>
          </div>
        )}

        {/* Title & Core Meta removed to avoid duplication with parent page layout */}


        {/* Extended Metadata Section - Dedicated Card with Background Header */}
        <div>
          <AppCard className="overflow-hidden shadow-xs p-0 mb-4 border border-border">
            <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-3">
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-muted" aria-hidden />
                <h3 className="text-[14px] font-semibold text-heading">Schedule and people</h3>
              </div>

            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-stretch">

                {/* 1. Creator */}
                <div className="flex min-h-[72px] flex-col justify-center gap-1 rounded-md border border-border bg-surface px-3 py-2.5">
                  <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
                    <User className="h-3.5 w-3.5" aria-hidden /> <span>Creator</span>
                  </span>
                  <div className="flex h-8 items-center text-[13.5px] text-foreground truncate">
                    {task.creator?.full_name || task.created_by?.full_name || task.created_by_user?.full_name || "System"}
                  </div>
                </div>

                {/* 2. Created At */}
                <div className="flex min-h-[72px] flex-col justify-center gap-1 rounded-md border border-border bg-surface px-3 py-2.5">
                  <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
                    <Calendar className="h-3.5 w-3.5" aria-hidden /> <span>Created at</span>
                  </span>
                  <div className="flex h-8 items-center text-[13.5px] text-foreground">
                    {task.created_at ? formatDateTime(task.created_at) : "Unknown"}
                  </div>
                </div>

                {/* 3. Last Status */}
                <div className="flex min-h-[72px] flex-col justify-center gap-1 rounded-md border border-border bg-surface px-3 py-2.5">
                  <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
                    <Tag className="h-3.5 w-3.5" aria-hidden /> <span>Last status</span>
                  </span>
                  <div className="flex h-8 items-center text-[13.5px] text-foreground">
                    {task.status?.name || task.status?.status_name || "Open"}
                  </div>
                </div>

                {/* 4. Last Updated */}
                <div className="flex min-h-[72px] flex-col justify-center gap-1 rounded-md border border-border bg-surface px-3 py-2.5">
                  <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
                    <Clock className="h-3.5 w-3.5" aria-hidden /> <span>Last updated</span>
                  </span>
                  <div className="flex h-8 items-center text-[13.5px] text-foreground">
                    {task.updated_at ? formatDateTime(task.updated_at) : (task.created_at ? formatDateTime(task.created_at) : "Unknown")}
                  </div>
                </div>

                {/* 5. Priority */}
                <div className="flex min-h-[72px] flex-col justify-center gap-1 rounded-md border border-border bg-surface px-3 py-2.5">
                  <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
                    <Flag className="h-3.5 w-3.5" aria-hidden /> <span>Priority</span>
                  </span>
                  <div className="flex h-8 items-center">
                    {canEditPriority && prioritiesList.length > 0 ? (
                      <select
                        aria-label="Task Priority"
                        disabled={isUpdatingPriority}
                        value={task.priority_id || task.priority?.id || ""}
                        onChange={async (e) => {
                          const newPrioId = e.target.value;
                          if (!newPrioId || newPrioId === (task.priority_id || task.priority?.id)) return;
                          setIsUpdatingPriority(true);
                          try {
                            const { updateTask } = await import("@/lib/actions/tasks");
                            const res = await updateTask(task.id, { priority_id: newPrioId });
                            if (res && (res as any).error) {
                              toast.error((res as any).error);
                            } else {
                              const matchingPrio = prioritiesList.find(p => p.id === newPrioId);
                              setTask((prev: any) => ({
                                ...prev,
                                priority_id: newPrioId,
                                priority: matchingPrio ? { ...prev.priority, id: matchingPrio.id, name: matchingPrio.name } : prev.priority
                              }));
                              toast.success("Task priority updated successfully.");
                              if (onUpdate) onUpdate();
                            }
                          } catch (err: any) {
                            toast.error(err.message || "Failed to update priority.");
                          } finally {
                            setIsUpdatingPriority(false);
                          }
                        }}
                        className="h-8 w-full rounded-md border border-border bg-surface px-2 text-[13px] font-medium text-foreground outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                      >
                        {prioritiesList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name || p.priority_name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <PriorityIndicator priority={task.priority?.name || null} className="text-[13.5px]" />
                    )}
                  </div>
                </div>

                {/* 6. Duration */}
                <div className="flex min-h-[72px] flex-col justify-center gap-1 rounded-md border border-border bg-surface px-3 py-2.5">
                  <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
                    <Hourglass className="h-3.5 w-3.5" aria-hidden /> <span>Duration</span>
                  </span>
                  <div className="flex h-8 items-center text-[13.5px] text-foreground">
                    {canEditDates ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <input
                          type="number"
                          aria-label="Duration in days" className="h-8 w-16 rounded-md border border-border bg-surface px-2 text-center text-[13px] tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                        /> <span className="text-[12.5px] text-muted">days</span>
                      </div>
                    ) : (
                      <span>
                        {task.start_date && task.end_date ? Math.max(1, Math.round((new Date(task.end_date).getTime() - new Date(task.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1) : 0} <span className="text-[12.5px] text-muted">days</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 7. Start Date */}
                <div className="flex min-h-[72px] flex-col justify-center gap-1 rounded-md border border-border bg-surface px-3 py-2.5">
                  <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden /> <span>Start date</span> <span className="text-danger-text" aria-hidden>*</span>
                  </span>
                  <div className="flex h-8 items-center">
                    {canEditDates ? (
                      <input
                        type="date"
                        className="h-8 w-full rounded-md border border-border bg-surface px-2.5 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                      <span className="text-[13.5px] text-foreground">
                        {task.start_date ? formatDate(task.start_date) : <span className="text-muted">Not set</span>}
                      </span>
                    )}
                  </div>
                </div>

                {/* 8. Due Date */}
                <div className="flex min-h-[72px] flex-col justify-center gap-1 rounded-md border border-border bg-surface px-3 py-2.5">
                  <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
                    <CalendarCheck className="h-3.5 w-3.5" aria-hidden /> <span>Due date</span> <span className="text-danger-text" aria-hidden>*</span>
                  </span>
                  <div className="flex h-8 items-center">
                    {canEditDates ? (
                      <input
                        type="date"
                        className="h-8 w-full rounded-md border border-border bg-surface px-2.5 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                      <span className={`text-[13.5px] ${task.end_date && new Date(task.end_date) < new Date() ? "font-medium text-danger-text" : "text-foreground"}`}>
                        {task.end_date ? formatDate(task.end_date) : <span className="text-muted">Not set</span>}
                      </span>
                    )}
                  </div>
                </div>

                {/* 9. Primary Assignee */}
                <div className="flex min-h-[72px] flex-col justify-center gap-1 rounded-md border border-border bg-surface px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> <span>Primary assignee</span>
                    </span>
                    {canEditAssignees && (
                      <AppButton
                        variant="link"
                        size="sm"
                        onClick={() => openAssigneeModal('primary')}
                        className="text-[12.5px]"
                      >
                        Edit
                      </AppButton>
                    )}
                  </div>
                  <div className="flex h-8 items-center gap-2 overflow-hidden">
                    {pendingPrimaryAssignee ? (
                      (() => {
                        const pUser = stakeholders.find(s => s.id === pendingPrimaryAssignee);
                        return (
                          <div className="flex items-center gap-1.5 text-[13px] font-medium text-warning-text">
                            <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-warning" aria-hidden />
                            <span className="truncate">{pUser?.full_name || "New primary assignee"} · not saved yet</span>
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
                              <img src={a.profile_photo} alt="" className="h-6 w-6 rounded-full bg-sunken object-cover" />
                            ) : (
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-[11px] font-medium text-accent-soft-text">
                                {a.full_name?.substring(0, 2).toUpperCase() || "U"}
                              </div>
                            )}
                            <span className="truncate text-[13.5px] text-foreground">{a.full_name}</span>
                          </>
                        );
                      })()
                    ) : (
                      <span className="text-muted">Unassigned</span>
                    )}
                  </div>
                </div>

                {/* 10. Executors */}
                <div className="flex min-h-[72px] flex-col justify-center gap-1 rounded-md border border-border bg-surface px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
                      <Users className="h-3.5 w-3.5" aria-hidden /> <span>Executors</span>
                      <span className="rounded-full bg-sunken px-1.5 text-[11px] font-medium tabular-nums text-subtle">
                        {pendingAssignees ? pendingAssignees.length : explicitExecutors.length}
                      </span>
                    </span>
                    {canEditAssignees && (
                      <AppButton
                        variant="link"
                        size="sm"
                        onClick={() => openAssigneeModal('executors')}
                        className="text-[12.5px]"
                      >
                        Edit
                      </AppButton>
                    )}
                  </div>

                  <div className="flex h-8 items-center overflow-hidden text-[13.5px] text-foreground">
                    {pendingAssignees ? (
                      <div className="flex items-center gap-1.5 text-[13px] font-medium text-warning-text">
                        <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-warning" aria-hidden />
                        <span className="truncate">{pendingAssignees.length} {pendingAssignees.length === 1 ? "executor" : "executors"} · not saved yet</span>
                      </div>
                    ) : (
                      <span className="block w-full truncate">
                        {explicitExecutors.length > 0 ? explicitExecutors.map((p: any) => p.full_name).join(', ') : <span className="text-muted">None</span>}
                      </span>
                    )}
                  </div>
                </div>

                {/* 11. Watchers (Team) */}
                <div className="flex min-h-[72px] flex-col justify-center gap-1 rounded-md border border-border bg-surface px-3 py-2.5 sm:col-span-2 lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
                      <Eye className="h-3.5 w-3.5" aria-hidden /> <span>Watchers</span>
                      <span className="rounded-full bg-sunken px-1.5 text-[11px] font-medium tabular-nums text-subtle">
                        {pendingWatchers ? pendingWatchers.length : explicitWatchers.length}
                      </span>
                    </span>
                    {canEditWatchers && (
                      <AppButton
                        variant="link"
                        size="sm"
                        onClick={() => openAssigneeModal('watchers')}
                        className="text-[12.5px]"
                      >
                        Edit
                      </AppButton>
                    )}
                  </div>
                  <div className="flex h-8 items-center overflow-hidden text-[13.5px] text-foreground">
                    {pendingWatchers ? (
                      <div className="flex items-center gap-1.5 text-[13px] font-medium text-warning-text">
                        <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-warning" aria-hidden />
                        <span className="truncate">{pendingWatchers.length} {pendingWatchers.length === 1 ? "watcher" : "watchers"} · not saved yet</span>
                      </div>
                    ) : (
                      <span className="block w-full truncate">
                        {explicitWatchers.length > 0 ? explicitWatchers.map((p: any) => p.full_name).join(', ') : <span className="text-muted">None</span>}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </AppCard>
        </div>


        {/* 4. Remarks and Updates Group - Dedicated Card with Background-Colored Header */}
        <div>
          <AppCard className="overflow-hidden shadow-xs p-0 mb-4 border border-border">
            <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-3">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="h-4 w-4 text-muted" aria-hidden />
                <h3 className="text-[14px] font-semibold text-heading">Status and remarks</h3>
              </div>
            </div>

            <div className="p-5 space-y-6">
              {/* Interactive Lifecycle State Transition Panel (MOVED TO TOP) */}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label htmlFor="tec-status" className="text-[13px] font-medium text-subtle">Status</label>
                  <select
                    id="tec-status"
                    value={pendingStatus || currentStatusCode || ""}
                    disabled={readOnly || !canEditCore}
                    onChange={(e) => {
                      const newCode = e.target.value;
                      if (!newCode || newCode === currentStatusCode) {
                        setPendingStatus(null);
                      } else {
                        setPendingStatus(newCode);
                      }
                    }}
                    className={`h-9 w-full rounded-md border border-border bg-surface px-3 text-[13.5px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${(readOnly || !canEditCore) ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <option value="" disabled>Select status</option>
                    {statuses.map(st => (
                      <option key={st.id} value={st.code || st.status_code}>{st.name || st.status_name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="tec-dept" className="text-[13px] font-medium text-subtle">Department</label>
                  <select
                    id="tec-dept"
                    value={pendingDepartment !== null ? pendingDepartment : (task.department_id || "")}
                    disabled={readOnly || !canEditCore}
                    onChange={(e) => {
                      const newDept = e.target.value;
                      if (newDept === (task.department_id || "")) {
                        setPendingDepartment(null);
                      } else {
                        setPendingDepartment(newDept);
                      }
                    }}
                    className={`h-9 w-full rounded-md border border-border bg-surface px-3 text-[13.5px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${(readOnly || !canEditCore) ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <option value="">No department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 w-full">
                  <span className="block w-full text-left text-[13px] font-medium text-subtle sm:text-right">
                    Actions
                  </span>
                  <div className="flex flex-wrap justify-start sm:justify-end gap-2 pt-0.5 w-full">
                    {isOpenStage && canEditCore && hasActiveInProgress && (
                      <AppButton
                        size="sm"
                        variant="primary"
                        leftIcon={<Play className="h-4 w-4" />}
                        disabled={actionLoading}
                        onClick={() => handleStatusTransition("start")}
                      >
                        Start progress
                      </AppButton>
                    )}

                    {isInProgressStage && canEditCore && hasActiveReview && (
                      <AppButton
                        size="sm"
                        variant="primary"
                        leftIcon={<CheckCircle2 className="h-4 w-4" />}
                        disabled={actionLoading}
                        onClick={() => handleStatusTransition("resolve")}
                      >
                        {hasActiveResolved ? "Mark as resolved" : "Mark for review"}
                      </AppButton>
                    )}

                    {isReviewStage && !readOnly && isOwner && (
                      <>
                        {hasActiveClosed && (
                          <AppButton
                            size="sm"
                            variant="primary"
                            leftIcon={<CheckCircle2 className="h-4 w-4" />}
                            disabled={actionLoading}
                            onClick={() => handleStatusTransition("approve")}
                          >
                            Approve & close
                          </AppButton>
                        )}
                        <AppButton
                          size="sm"
                          variant="secondary"
                          leftIcon={<RotateCcw className="h-4 w-4" />}
                          disabled={actionLoading}
                          onClick={() => handleStatusTransition("reopen")}
                        >
                          Reject & reopen
                        </AppButton>
                      </>
                    )}

                    {!readOnly && isClosedTask && isOwner && (
                      <AppButton
                        size="sm"
                        variant="outline"
                        leftIcon={<RotateCcw className="h-4 w-4" />}
                        disabled={actionLoading}
                        onClick={() => handleStatusTransition("reopen")}
                      >
                        Reopen task
                      </AppButton>
                    )}
                    {canDeleteTask && (
                      <AppButton
                        variant="outline"
                        size="sm"
                        className="border-danger-border text-danger-text hover:bg-danger-soft"
                        onClick={handleDeleteTask}
                        disabled={deleteLoading || actionLoading}
                        leftIcon={<Trash2 className="h-4 w-4" />}
                      >
                        Delete task
                      </AppButton>
                    )}

                    {canTransferTask && (
                      <AppButton
                        variant="secondary"
                        size="sm"
                        onClick={handleOpenTransfer}
                        disabled={actionLoading}
                        leftIcon={<FolderPlus className="h-4 w-4" />}
                      >
                        Transfer task
                      </AppButton>
                    )}
                  </div>

                  {/* Transfer Modal / Inline Panel */}
                  {isTransferModalOpen && (
                    <div className="mt-4 w-full rounded-md border border-border bg-sunken p-5 text-left">
                      <h4 className="mb-4 flex items-center gap-2 border-b border-border pb-2 text-[14px] font-semibold text-heading">
                        <FolderPlus className="h-4 w-4 text-muted" aria-hidden /> Transfer task to another workspace
                      </h4>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label htmlFor="tec-transfer-ws" className="mb-1.5 block text-[13px] font-medium text-subtle">Destination workspace <span className="text-danger-text" aria-hidden>*</span></label>
                            <select
                              id="tec-transfer-ws"
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
                              className="h-9 w-full rounded-md border border-border bg-surface px-3 text-[13.5px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                              <option value="">Select a workspace</option>
                              {flattenedWorkspaces.map(w => (
                                <option
                                  key={w.id}
                                  value={w.id}
                                  disabled={w.id === (task.sub_workspace_id || task.workspace_id)}
                                >
                                  {w.pathName} {w.id === (task.sub_workspace_id || task.workspace_id) ? "(current)" : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {checkingScope && (
                          <div role="status" className="flex items-center gap-2 p-2 text-[13px] text-muted">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> Checking who has access to that workspace…
                          </div>
                        )}

                        {!checkingScope && droppedUsers.length > 0 && (
                          <div className="space-y-3 rounded-md border border-warning-border bg-warning-soft p-3">
                            <div className="text-[13px] leading-relaxed text-warning-text">
                              <span className="mb-0.5 flex items-center gap-1 font-semibold"><XCircle className="w-3.5 h-3.5" aria-hidden /> Some people will lose access</span>
                              These people don&apos;t have access to the destination workspace and will be removed from this task:
                              <strong className="block mt-1">{droppedUsers.map(u => u.full_name).join(", ")}</strong>
                            </div>

                            {isOwnerDropped && (
                              <div className="rounded-md border border-border bg-surface p-3">
                                <label htmlFor="tec-new-owner" className="mb-1.5 block text-[13px] font-medium text-subtle">New primary owner <span className="text-danger-text" aria-hidden>*</span></label>
                                <select
                                  id="tec-new-owner"
                                  value={newAssigneeId}
                                  onChange={e => setNewAssigneeId(e.target.value)}
                                  className="h-9 w-full rounded-md border border-border bg-surface px-3 text-[13.5px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                  <option value="">Select a person</option>
                                  {targetStakeholders.map(s => (
                                    <option key={s.id} value={s.id}>{s.full_name}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {true && (
                              <div className="rounded-md border border-border bg-surface p-3 mt-2">
                                <span className="mb-1.5 block text-[13px] font-medium text-subtle">Add executors (optional)</span>
                                <div className="max-h-32 overflow-y-auto space-y-1 scrollbar-thin">
                                  {targetStakeholders.map(s => (
                                    <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[13px] text-foreground hover:bg-surface-hover">
                                      <input
                                        type="checkbox"
                                        checked={newExecutors.includes(s.id)}
                                        onChange={e => {
                                          if (e.target.checked) setNewExecutors([...newExecutors, s.id]);
                                          else setNewExecutors(newExecutors.filter(id => id !== s.id));
                                        }}
                                        className="h-3.5 w-3.5 rounded accent-primary"
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
                          <label htmlFor="tec-transfer-remarks" className="mb-1.5 block text-[13px] font-medium text-subtle">Reason for transfer <span className="text-danger-text" aria-hidden>*</span></label>
                          <textarea
                            id="tec-transfer-remarks"
                            value={transferRemarks}
                            onChange={e => setTransferRemarks(e.target.value)}
                            className="min-h-[72px] w-full rounded-md border border-border bg-surface p-2.5 text-[13.5px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="Why is this task being transferred?"
                          />
                        </div>
                        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
                          <AppButton variant="ghost" size="sm" onClick={() => { setIsTransferModalOpen(false); setSelectedTransferWorkspace(""); setSelectedTransferSubworkspace(""); }}>Cancel</AppButton>
                          <AppButton variant="primary" size="sm" onClick={submitTransfer} disabled={transferLoading || checkingScope} isLoading={transferLoading}>
                            {transferLoading ? "Transferring…" : "Transfer task"}
                          </AppButton>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {pendingStatus && (
                <div role="status" className="flex items-center justify-between gap-3 rounded-md border border-warning-border bg-warning-soft p-3 text-[13px] text-warning-text">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                    <span>
                      Status change to <strong className="font-semibold">{statuses.find(s => (s.code || s.status_code || s.id) === pendingStatus)?.name || statuses.find(s => (s.code || s.status_code || s.id) === pendingStatus)?.status_name || pendingStatus}</strong> isn&apos;t saved yet. Select <strong className="font-semibold">Save changes</strong>.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingStatus(null)}
                    className="shrink-0 whitespace-nowrap rounded-md border border-warning-border bg-surface px-2.5 py-1 text-[12.5px] font-medium text-foreground transition-colors hover:bg-surface-hover"
                  >
                    Undo
                  </button>
                </div>
              )}

              {pendingDepartment && (
                <div role="status" className="flex items-center justify-between gap-3 rounded-md border border-warning-border bg-warning-soft p-3 text-[13px] text-warning-text mt-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                    <span>
                      Department change to <strong className="font-semibold">{departments.find(d => d.id === pendingDepartment)?.name || pendingDepartment}</strong> isn&apos;t saved yet. Select <strong className="font-semibold">Save changes</strong>.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingDepartment(null)}
                    className="shrink-0 whitespace-nowrap rounded-md border border-warning-border bg-surface px-2.5 py-1 text-[12.5px] font-medium text-foreground transition-colors hover:bg-surface-hover"
                  >
                    Undo
                  </button>
                </div>
              )}

              {pendingAssignees && (
                <div role="status" className="flex items-center justify-between gap-3 rounded-md border border-warning-border bg-warning-soft p-3 text-[13px] text-warning-text mt-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                    <span>
                      Executor changes aren&apos;t saved yet. Select <strong className="font-semibold">Save changes</strong>.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingAssignees(null)}
                    className="shrink-0 whitespace-nowrap rounded-md border border-warning-border bg-surface px-2.5 py-1 text-[12.5px] font-medium text-foreground transition-colors hover:bg-surface-hover"
                  >
                    Undo
                  </button>
                </div>
              )}

              {pendingPrimaryAssignee && (
                <div role="status" className="flex items-center justify-between gap-3 rounded-md border border-warning-border bg-warning-soft p-3 text-[13px] text-warning-text mt-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                    <span>
                      The primary assignee change isn&apos;t saved yet. Select <strong className="font-semibold">Save changes</strong>.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingPrimaryAssignee(null)}
                    className="shrink-0 whitespace-nowrap rounded-md border border-warning-border bg-surface px-2.5 py-1 text-[12.5px] font-medium text-foreground transition-colors hover:bg-surface-hover"
                  >
                    Undo
                  </button>
                </div>
              )}

              <div className="space-y-3 rounded-md border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[13px] font-medium text-subtle">
                    Remark <span className="font-normal text-muted">(optional)</span>
                  </span>
                </div>
                <RichTextEditor
                  value={remarksDraft}
                  onChange={setRemarksDraft}
                  readOnly={!canAddRemark}
                  placeholder={!canAddRemark ? "You can't add remarks to this task." : "What changed, and what happens next?"}
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12.5px] text-muted">Last updated {task.updated_at ? formatDateTime(task.updated_at) : "—"}</span>
                  {canAddRemark && (
                    <AppButton
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleBatchSave}
                      disabled={saveRemarksLoading}
                      isLoading={saveRemarksLoading}
                    >
                      {saveRemarksLoading ? "Saving…" : (pendingStatus || pendingDepartment || pendingAssignees || pendingPrimaryAssignee) ? "Save changes" : "Save remark"}
                    </AppButton>
                  )}
                </div>

                {/* Remarks History Queue */}
                <div className="mt-3 rounded-md border border-border bg-sunken p-3 text-foreground">
                  {/* Header with toggle */}
                  <button
                    type="button"
                    onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
                    aria-expanded={!isHistoryCollapsed}
                    className="flex w-full select-none items-center justify-between rounded text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted" aria-hidden />
                      <span className="text-[13px] font-medium text-subtle">Remark history</span>
                      {remarksHistory.length > 0 && (
                        <span className="rounded-full bg-surface px-1.5 text-[11px] font-medium tabular-nums text-subtle">
                          {remarksHistory.length}
                        </span>
                      )}
                    </span>
                    <span className="p-1 text-muted" aria-hidden>
                      {isHistoryCollapsed ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronUp className="h-4 w-4" />
                      )}
                    </span>
                  </button>

                  {/* Collapsible Content */}
                  {!isHistoryCollapsed && (
                    <div className="mt-4 space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                      {remarksHistoryLoading ? (
                        <div className="flex items-center justify-center py-6 gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted" aria-hidden />
                          <span className="text-[13px] text-muted">Loading remarks…</span>
                        </div>
                      ) : remarksHistory.length === 0 ? (
                        <div className="py-6 text-center text-[13px] text-muted">
                          No remarks yet. Remarks you add above will appear here.
                        </div>
                      ) : (
                        <div className="relative space-y-5 border-l border-border pl-4">
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
                                <div className="absolute -left-[21px] top-2 h-2.5 w-2.5 rounded-full border-2 border-sunken bg-border-active" aria-hidden />

                                <div className="flex items-start gap-3">
                                  {/* Avatar */}
                                  {item.user?.profile_photo ? (
                                    <img
                                      src={item.user.profile_photo}
                                      alt={item.user.full_name}
                                      className="h-7 w-7 rounded-full border border-border object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-medium text-accent-soft-text">
                                      {initials}
                                    </div>
                                  )}

                                  {/* Content Block */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1">
                                      <span className="text-[13px] font-medium text-foreground">
                                        {item.user?.full_name || "System"}
                                      </span>
                                      <div className="flex items-center gap-1 text-[12px] text-muted">
                                        <Clock className="h-3 w-3" aria-hidden />
                                        <span>{formatDateTime(item.created_at)}</span>
                                      </div>
                                    </div>

                                    <div className="break-words rounded-md border border-border bg-surface p-2.5 text-[13px] leading-relaxed text-foreground">
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
          <AppCard className="overflow-hidden shadow-xs p-0 mb-4 border border-border">
            <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-3">
              <div className="flex items-center gap-2.5">
                <ActivitySquare className="h-4 w-4 text-muted" aria-hidden />
                <h3 className="text-[14px] font-semibold text-heading">Details and activity</h3>
              </div>
            </div>

            <div className="p-5">
              {/* Tabs */}
              <div role="tablist" aria-label="Task details" className="-mx-5 -mt-5 mb-2 flex flex-nowrap items-center gap-1 overflow-x-auto border-b border-border px-5 hide-scrollbar">
                {[
                  { id: 'subtasks', label: 'Subtasks', icon: GitFork, count: subtasks.length },
                  { id: 'tags', label: 'Tags', icon: Pin },
                  { id: 'links', label: 'Links', icon: LinkIcon },
                  { id: 'checklist', label: 'Checklist', icon: CheckSquare, count: task.checklists !== undefined ? task.checklists.length : (task._meta?.checklistCount || 0) },
                  { id: 'attachments', label: 'Attachments', icon: Paperclip, count: task.attachments !== undefined ? task.attachments.length : (task._meta?.attachmentCount || 0) },
                  { id: 'chat', label: 'Chat', icon: MessageCircle },
                  { id: 'timeline', label: 'Activity', icon: ActivitySquare },
                  { id: 'time', label: 'Time logs', icon: Clock }
                ].map(t => {
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveTab(t.id as any)}
                      className={`-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isActive ? "border-primary text-foreground" : "border-transparent text-muted hover:text-foreground"
                        }`}
                    >
                      <t.icon className="h-3.5 w-3.5" aria-hidden />
                      <span>{t.label}</span>
                      {t.count !== undefined && t.count > 0 && (
                        <span className="rounded-full bg-sunken px-1.5 text-[11px] font-medium tabular-nums text-subtle">
                          {t.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab Contents */}
              <div className="pt-4">
                {/* Subtasks Tab */}
                {activeTab === 'subtasks' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GitFork className="h-4 w-4 text-muted" aria-hidden />
                        <h4 className="text-[13px] font-medium text-subtle">
                          Related Subtasks ({subtasks.length})
                        </h4>
                      </div>
                      {!readOnly && (
                        <AppButton
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsAddingSubtask(true)}
                          className="h-8 gap-1.5 text-xs text-foreground"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add subtask
                        </AppButton>
                      )}
                    </div>

                    {subtasks.length > 0 ? (
                      <div className="rounded-lg border border-border bg-surface overflow-hidden">
                        <div className="divide-y divide-border">
                          {subtasks.map((st: any) => {
                            const statusColor = st.status?.color || '#94a3b8';
                            const isUpdating = updatingSubtaskId === st.id;

                            return (
                              <div
                                key={st.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 hover:bg-sunken/40 transition-colors"
                              >
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-sunken border border-border text-foreground">
                                      {st.task_code || "STK"}
                                    </span>
                                    <Link
                                      href={`/tasks/${st.id}`}
                                      className="text-[13.5px] font-semibold text-foreground hover:text-primary hover:underline transition-colors truncate"
                                      title={st.subject}
                                    >
                                      {st.subject}
                                    </Link>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted flex-wrap">
                                    {st.assignee && (
                                      <span className="flex items-center gap-1.5">
                                        <User className="h-3.5 w-3.5 text-muted" />
                                        <span className="text-foreground font-medium">{st.assignee.full_name}</span>
                                      </span>
                                    )}
                                    {st.end_date && (
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3.5 w-3.5 text-muted" />
                                        <span>Due {st.end_date}</span>
                                      </span>
                                    )}
                                    {st.priority?.name && (
                                      <span className="flex items-center gap-1">
                                        <Flag className="h-3 w-3" style={{ color: st.priority.color || '#94a3b8' }} />
                                        <span>{st.priority.name}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                                  {/* Status quick select / update */}
                                  <div className="relative inline-flex items-center">
                                    <select
                                      aria-label={`Update status for subtask ${st.subject}`}
                                      value={st.status_id || ""}
                                      disabled={readOnly || isUpdating}
                                      onChange={(e) => handleSubtaskStatusChange(st.id, e.target.value)}
                                      className="h-8 rounded-md border border-border bg-surface pl-2.5 pr-7 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer disabled:opacity-60 transition-colors"
                                      style={{ borderLeftWidth: '3px', borderLeftColor: statusColor }}
                                    >
                                      {(initialStatuses || statuses || []).map((s: any) => (
                                        <option key={s.id} value={s.id}>
                                          {s.status_name || s.name}
                                        </option>
                                      ))}
                                    </select>
                                    {isUpdating && (
                                      <Loader2 className="absolute right-2 h-3 w-3 animate-spin text-muted pointer-events-none" />
                                    )}
                                  </div>

                                  <Link
                                    href={`/tasks/${st.id}`}
                                    className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border bg-surface text-muted hover:text-foreground hover:bg-sunken transition-colors"
                                    title="Open subtask"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Link>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border bg-sunken/40 p-8 text-center space-y-2">
                        <GitFork className="h-8 w-8 text-muted mx-auto stroke-1" aria-hidden />
                        <p className="text-[13px] font-medium text-foreground">No subtasks found</p>
                        <p className="text-xs text-muted max-w-sm mx-auto">
                          Break down this task into smaller related subtasks with independent assignees and target due dates.
                        </p>
                        {!readOnly && (
                          <AppButton
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAddingSubtask(true)}
                            className="mt-3 gap-1.5 text-xs text-foreground"
                          >
                            <Plus className="h-3.5 w-3.5" /> Create first subtask
                          </AppButton>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Tags Tab */}
                {activeTab === 'tags' && (
                  <div className="space-y-4">
                    <h4 className="flex items-center gap-1.5 text-[13px] font-medium text-subtle">
                      <Pin className="h-3.5 w-3.5 text-muted" aria-hidden /> Custom fields and tags
                    </h4>
                    {localCustomFields && Object.keys(localCustomFields).length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.entries(localCustomFields).map(([key, val]) => (
                          <div key={key} className="space-y-1 rounded-md border border-border bg-surface p-3">
                            <span className="text-[12.5px] capitalize text-muted">{key.replace(/_/g, ' ')}</span>
                            <div className="text-[13.5px] text-foreground">{val ? String(val) : <span className="text-muted">Not set</span>}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-[13px] text-muted">No custom fields or tags on this task.</div>
                    )}
                  </div>
                )}

                {/* Link URL Tab */}
                {activeTab === 'links' && (
                  <div className="space-y-4">
                    <h4 className="flex items-center gap-1.5 text-[13px] font-medium text-subtle">
                      <LinkIcon className="h-3.5 w-3.5 text-muted" aria-hidden /> Links
                    </h4>
                    {localCustomFields?.link_url ? (
                      <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-surface p-3">
                        <a
                          href={getSafeExternalUrl(localCustomFields.link_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 truncate text-[13px] font-medium text-accent-soft-text hover:underline"
                          title={localCustomFields.link_url}
                        >
                          {localCustomFields.link_url}
                        </a>
                        <a
                          href={getSafeExternalUrl(localCustomFields.link_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-surface-hover"
                        >
                          Open <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                        </a>
                      </div>
                    ) : (
                      <div className="py-6 text-center text-[13px] text-muted">No links on this task.</div>
                    )}
                  </div>
                )}

                {/* Checklist Tab */}
                {activeTab === 'checklist' && (
                  <div className="space-y-4">
                    {!readOnly && canEditAux && (
                      <form onSubmit={handleAddChecklist} className="flex gap-2">
                        <AppInput
                          placeholder="Add a checklist item…"
                          aria-label="New checklist item"
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
                            className="flex items-center justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-surface-hover"
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={item.is_completed}
                                onChange={() => canEditAux && handleToggleChecklist(item.id, item.is_completed)}
                                disabled={readOnly || !canEditAux}
                                className="h-4 w-4 rounded accent-accent"
                              />
                              <span className={`text-[13.5px] ${item.is_completed ? "line-through text-muted" : "text-foreground"}`}>
                                {item.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 text-muted" aria-hidden />
                              <select
                                value={item.assignee_id || ""}
                                onChange={(e) => handleSetChecklistAssignee(item.id, e.target.value)}
                                disabled={readOnly || !canEditAux}
                                aria-label="Checklist item assignee"
                                className="w-32 cursor-pointer rounded border-none bg-transparent text-[12.5px] text-subtle outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                      <div className="py-6 text-center text-[13px] text-muted">No checklist items yet.</div>
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
                          Upload attachment
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
                            <div key={item.id} className="flex items-center justify-between rounded-md border border-border bg-surface p-3">
                              <span className="truncate pr-2 text-[13px] font-medium text-foreground" title={item.file_name}>{item.file_name}</span>
                              {viewUrl && (
                                <div className="flex items-center gap-3 shrink-0">
                                  <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[12.5px] font-medium text-accent-soft-text hover:underline" title="View attachment">
                                    <Eye className="w-3.5 h-3.5" /> View
                                  </a>
                                  <a href={downloadUrl} download={item.file_name || "Attachment"} className="flex items-center gap-1 text-[12.5px] font-medium text-accent-soft-text hover:underline" title="Download attachment">
                                    <Download className="w-3.5 h-3.5" /> Download
                                  </a>
                                  {roleCode === 'SUPER_ADMIN' && !item.is_temp && (
                                    <AppButton
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleDeleteAttachment(item.id);
                                      }}
                                      className="h-auto px-1 text-[12.5px] text-danger-text"
                                      title="Delete attachment"
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
                      <div className="py-6 text-center text-[13px] text-muted">No attachments yet.</div>
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
            className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-[var(--overlay)] animate-in fade-in duration-150"
            role="presentation" onClick={() => setIsAssigneeModalOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="tec-people-title"
              className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-border bg-surface text-foreground shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h3 id="tec-people-title" className="text-[16px] font-semibold text-heading">Manage people</h3>
                  <p className="mt-0.5 text-[13px] text-muted">Changes are saved together with your next remark.</p>
                </div>
                <AppButton aria-label="Close"
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsAssigneeModalOpen(false)}
                  className="text-muted hover:text-foreground"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </AppButton>
              </div>

              {/* Modal Tabs */}
              <div role="tablist" aria-label="People" className="flex gap-1 border-b border-border px-5">
                {canEditAssignees && (
                  <>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={assigneeModalTab === 'primary'}
                      onClick={() => setAssigneeModalTab('primary')}
                      className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors ${assigneeModalTab === 'primary' ? 'border-primary text-foreground' : 'border-transparent text-muted hover:text-foreground'}`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Primary assignee</span>
                      {selectedPrimaryAssignee && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                      )}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={assigneeModalTab === 'executors'}
                      onClick={() => setAssigneeModalTab('executors')}
                      className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors ${assigneeModalTab === 'executors' ? 'border-primary text-foreground' : 'border-transparent text-muted hover:text-foreground'}`}
                    >
                      <Users className="w-4 h-4" />
                      <span>Executors</span>
                      <span className="rounded-full bg-sunken px-1.5 text-[11px] font-medium tabular-nums text-subtle">
                        {selectedExecutors.length}
                      </span>
                    </button>
                  </>
                )}
                {canEditWatchers && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={assigneeModalTab === 'watchers'}
                    onClick={() => setAssigneeModalTab('watchers')}
                    className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors ${assigneeModalTab === 'watchers' ? 'border-primary text-foreground' : 'border-transparent text-muted hover:text-foreground'}`}
                  >
                    <Eye className="w-4 h-4" />
                    <span>Watchers</span>
                    <span className="rounded-full bg-sunken px-1.5 text-[11px] font-medium tabular-nums text-subtle">
                      {selectedWatchers.length}
                    </span>
                  </button>
                )}
              </div>

              {/* Search Input */}
              <div className="border-b border-border p-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" aria-hidden />
                  <input
                    type="text"
                    placeholder="Search by name, email or department…"
                    aria-label="Search workspace members"
                    value={stakeholderSearch}
                    onChange={(e) => setStakeholderSearch(e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-9 text-[13.5px] text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {stakeholderSearch && (
                    <AppButton aria-label="Clear search"
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setStakeholderSearch("")}
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
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
                      <div className="p-8 text-center text-[13px] text-muted">
                        {stakeholders.length === 0 ? "Loading workspace members…" : "No one matches that search."}
                      </div>
                    );
                  }

                  if (assigneeModalTab === 'primary') {
                    return (
                      <div className="space-y-1.5">
                        <div className="px-1 pb-1 text-[12.5px] text-muted">
                          Choose the one person accountable for this task.
                        </div>
                        {filteredStakeholders.filter(s => s.is_active !== false || selectedPrimaryAssignee === s.id).map(s => {
                          const isSelected = selectedPrimaryAssignee === s.id;
                          const isInactive = s.is_active === false;
                          return (
                            <button
                              type="button"
                              key={s.id}
                              aria-pressed={isSelected}
                              disabled={isInactive && !isSelected}
                              onClick={async () => {
                                if (checkingDependencyId || (isInactive && !isSelected)) return;
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
                                  if (!selectedExecutors.includes(s.id)) {
                                    setSelectedExecutors([...selectedExecutors, s.id]);
                                  }
                                  setSelectedWatchers(prev => prev.filter(id => id !== s.id));
                                }
                              }}
                              className={`flex w-full cursor-pointer items-center justify-between rounded-md border p-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isSelected ? 'border-border-active bg-selected' : 'border-border hover:bg-surface-hover'} ${checkingDependencyId === s.id ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {s.profile_photo ? (
                                  <img src={s.profile_photo} alt="" className="h-8 w-8 shrink-0 rounded-full bg-sunken object-cover" />
                                ) : (
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-medium text-accent-soft-text">
                                    {s.full_name?.substring(0, 2).toUpperCase() || "U"}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 truncate text-[13.5px] font-medium text-foreground">
                                    <span>{s.full_name}</span>
                                    {checkingDependencyId === s.id && <Loader2 className="w-3 h-3 animate-spin text-muted" aria-label="Checking" />}
                                    {isSelected && (
                                      <span className="shrink-0 rounded-full bg-accent-soft px-1.5 text-[11px] font-medium text-accent-soft-text">
                                        Primary
                                      </span>
                                    )}
                                    {isInactive && (
                                      <span className="shrink-0 rounded-full bg-danger-soft px-1.5 text-[11px] font-medium text-danger-text">
                                        Inactive User
                                      </span>
                                    )}
                                  </div>
                                  <div className="truncate text-[12.5px] text-muted">{s.email || "Workspace member"}</div>
                                </div>
                              </div>
                              <div aria-hidden className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                                }`}>
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  }

                  if (assigneeModalTab === 'executors') {
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-1 pb-1">
                          <span className="text-[12.5px] text-muted">
                            People who will do the work.
                          </span>
                          <div className="flex items-center gap-2">
                            <AppButton
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const allIds = stakeholders.filter(s => s.is_active !== false).map(s => s.id);
                                setSelectedExecutors(allIds);
                                setSelectedWatchers(prev => prev.filter(id => !allIds.includes(id)));
                              }}
                              className="h-auto px-1 text-[12.5px] text-accent-soft-text"
                            >
                              Select all
                            </AppButton>
                            <span className="text-xs text-muted" aria-hidden>·</span>
                            <AppButton
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newExecs = selectedPrimaryAssignee ? [selectedPrimaryAssignee] : [];
                                setSelectedExecutors(newExecs);
                              }}
                              className="h-auto px-1 text-[12.5px] text-muted hover:text-foreground"
                            >
                              Clear all
                            </AppButton>
                          </div>
                        </div>
                        {filteredStakeholders.filter(s => s.is_active !== false || selectedExecutors.includes(s.id)).map(s => {
                          const isSelected = selectedExecutors.includes(s.id);
                          const isInactive = s.is_active === false;
                          return (
                            <button
                              type="button"
                              key={s.id}
                              aria-pressed={isSelected}
                              disabled={isInactive && !isSelected}
                              onClick={async () => {
                                if (checkingDependencyId || (isInactive && !isSelected)) return;
                                let newExecs: string[];
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
                                  if (s.id === selectedPrimaryAssignee) {
                                    setSelectedPrimaryAssignee("");
                                  }
                                  newExecs = selectedExecutors.filter(id => id !== s.id);
                                } else {
                                  newExecs = [...selectedExecutors, s.id];
                                  setSelectedWatchers(prev => prev.filter(id => id !== s.id));
                                }
                                setSelectedExecutors(newExecs);
                              }}
                              className={`flex w-full cursor-pointer items-center justify-between rounded-md border p-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isSelected ? 'border-border-active bg-selected' : 'border-border hover:bg-surface-hover'} ${checkingDependencyId === s.id ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {s.profile_photo ? (
                                  <img src={s.profile_photo} alt="" className="h-8 w-8 shrink-0 rounded-full bg-sunken object-cover" />
                                ) : (
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-medium text-accent-soft-text">
                                    {s.full_name?.substring(0, 2).toUpperCase() || "U"}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 truncate text-[13.5px] font-medium text-foreground">
                                    <span>{s.full_name}</span>
                                    {checkingDependencyId === s.id && <Loader2 className="w-3 h-3 animate-spin text-muted" aria-label="Checking" />}
                                    {s.id === selectedPrimaryAssignee && (
                                      <span className="shrink-0 rounded-full bg-accent-soft px-1.5 text-[11px] font-medium text-accent-soft-text">
                                        Primary
                                      </span>
                                    )}
                                    {isInactive && (
                                      <span className="shrink-0 rounded-full bg-danger-soft px-1.5 text-[11px] font-medium text-danger-text">
                                        Inactive User
                                      </span>
                                    )}
                                  </div>
                                  <div className="truncate text-[12.5px] text-muted">{s.email || "Workspace member"}</div>
                                </div>
                              </div>
                              <div aria-hidden className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border-2 transition-colors ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                                }`}>
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  }

                  // Watchers Multi-Select Tab: active workspace/subworkspace users not assigned as executors (inactive users excluded from watchers list)
                  const eligibleWatchers = filteredStakeholders.filter(s => s.is_active !== false && !selectedExecutors.includes(s.id));
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1 pb-1">
                        <span className="text-[12.5px] text-muted">
                          People who get updates but don&apos;t do the work.
                        </span>
                        <div className="flex items-center gap-2">
                          <AppButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const allEligibleIds = stakeholders.filter(s => s.is_active !== false && !selectedExecutors.includes(s.id)).map(s => s.id);
                              setSelectedWatchers(allEligibleIds);
                            }}
                            className="h-auto px-1 text-[12.5px] text-accent-soft-text"
                          >
                            Select all
                          </AppButton>
                          <span className="text-xs text-muted" aria-hidden>·</span>
                          <AppButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedWatchers([])}
                            className="h-auto px-1 text-[12.5px] text-muted hover:text-foreground"
                          >
                            Clear all
                          </AppButton>
                        </div>
                      </div>
                      {eligibleWatchers.length === 0 ? (
                        <div className="p-6 text-center text-[13px] text-muted">
                          Everyone in this workspace is already an executor.
                        </div>
                      ) : (
                        eligibleWatchers.map(s => {
                          const isSelected = selectedWatchers.includes(s.id);
                          return (
                            <button
                              type="button"
                              key={s.id}
                              aria-pressed={isSelected}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedWatchers(selectedWatchers.filter(id => id !== s.id));
                                } else {
                                  setSelectedWatchers([...selectedWatchers, s.id]);
                                }
                              }}
                              className={`flex w-full cursor-pointer items-center justify-between rounded-md border p-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isSelected ? 'border-border-active bg-selected' : 'border-border hover:bg-surface-hover'}`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {s.profile_photo ? (
                                  <img src={s.profile_photo} alt="" className="h-8 w-8 shrink-0 rounded-full bg-sunken object-cover" />
                                ) : (
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-medium text-accent-soft-text">
                                    {s.full_name?.substring(0, 2).toUpperCase() || "U"}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 truncate text-[13.5px] font-medium text-foreground">
                                    <span>{s.full_name}</span>
                                    {s.is_active === false && (
                                      <span className="shrink-0 rounded-full bg-danger-soft px-1.5 text-[11px] font-medium text-danger-text">
                                        Inactive User
                                      </span>
                                    )}
                                  </div>
                                  <div className="truncate text-[12.5px] text-muted">{s.email || "Workspace member"}</div>
                                </div>
                              </div>
                              <div aria-hidden className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border-2 transition-colors ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                                }`}>
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between gap-3 border-t border-border bg-sunken px-5 py-3">
                <div className="min-w-0 truncate text-[12.5px] text-muted">
                  <span className="font-medium text-foreground">
                    {selectedPrimaryAssignee ? (stakeholders.find(s => s.id === selectedPrimaryAssignee)?.full_name || "Primary selected") : "No primary assignee"}
                  </span>
                  {" · "}
                  <span>{selectedExecutors.length} {selectedExecutors.length === 1 ? "executor" : "executors"}</span>
                  {" · "}
                  <span>{selectedWatchers.length} {selectedWatchers.length === 1 ? "watcher" : "watchers"}</span>
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
                  >
                    Apply
                  </AppButton>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dependency Check Modal */}
        {dependencyModal && (
          <div className="fixed inset-0 z-[calc(var(--z-modal)+1)] flex items-center justify-center bg-[var(--overlay)] p-4 animate-in fade-in duration-150">
            <div role="alertdialog" aria-modal="true" aria-labelledby="tec-dep-title" className="w-full max-w-md overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
              <div className={`border-b p-4 ${dependencyModal.result.type === 'executive' ? 'border-danger-border bg-danger-soft text-danger-text' : 'border-warning-border bg-warning-soft text-warning-text'}`}>
                <div className="flex items-center gap-3">
                  {dependencyModal.result.type === 'executive' ? (
                    <ShieldAlert className="w-5 h-5" aria-hidden />
                  ) : (
                    <ShieldCheck className="w-5 h-5" aria-hidden />
                  )}
                  <h3 id="tec-dep-title" className="text-[14px] font-semibold">{dependencyModal.result.type === 'executive' ? "This person can't be removed yet" : "Remove this person?"}</h3>
                </div>
              </div>

              <div className="p-5">
                <p className="mb-3 text-[13.5px] leading-relaxed text-foreground">
                  <strong className="font-semibold">{dependencyModal.userName}</strong> still has open work on this task:
                </p>

                <ul className="mb-4 max-h-40 space-y-1 overflow-y-auto rounded-md border border-border bg-sunken p-3 text-[13px] text-subtle">
                  {dependencyModal.result.blockingItems.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-0.5 text-muted" aria-hidden>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="text-[13px] text-muted">
                  {dependencyModal.result.message}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border bg-sunken px-4 py-3">
                <AppButton
                  variant={dependencyModal.result.type === 'executive' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setDependencyModal(null)}
                >
                  {dependencyModal.result.type === 'executive' ? 'OK' : 'Keep'}
                </AppButton>
                {dependencyModal.result.type === 'watcher' && (
                  <AppButton
                    variant="destructive"
                    size="sm"
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
                    Remove
                  </AppButton>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Floating Action Bar for Pending Changes */}
        {(pendingStatus || pendingDepartment || pendingAssignees || pendingPrimaryAssignee || (remarksDraft && remarksDraft.trim().length > 0)) && canAddRemark && (
          <div className="fixed bottom-20 left-4 right-4 z-[var(--z-sticky)] flex items-center justify-between gap-3 rounded-lg border border-border bg-elevated p-3 text-foreground shadow-lg sm:hidden">
            <div className="flex flex-col min-w-0 flex-1">
              <span className="truncate text-[12px] font-medium text-warning-text">
                Unsaved changes
              </span>
              <span className="truncate text-[13px] text-foreground">
                {pendingStatus ? `Status: ${statuses.find(s => (s.code || s.status_code || s.id) === pendingStatus)?.name || pendingStatus}` : (pendingDepartment ? 'Department change' : (pendingAssignees ? 'Executor change' : 'Unsaved remark'))}
              </span>
            </div>
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              onClick={handleBatchSave}
              disabled={saveRemarksLoading}
              className="shrink-0"
            >
              {saveRemarksLoading ? <Loader2 className="w-4 h-4 animate-spin" aria-label="Saving" /> : "Save"}
            </AppButton>
          </div>
        )}
        {/* Subtask Creation Wizard */}
        {isAddingSubtask && (
          <TaskCreationWizard
            workspaceId={task?.sub_workspace_id || task?.workspace_id || ""}
            initialParentTaskId={task?.id || taskId}
            onClose={() => setIsAddingSubtask(false)}
            onSuccess={handleSubtaskCreated}
          />
        )}
      </div>
    </ExperienceProvider>
  );
}

