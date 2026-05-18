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
  ChevronDown, ChevronUp, MessageSquare, Clock
} from "lucide-react";
import { 
  getTaskDetails, updateTask, deleteTask, transitionTaskStatus, resolveTask, 
  approveResolution, reopenTask, createChecklistItem, 
  createTaskAttachment, fetchTeams, assignTeamToTask,
  getTaskComments, addTaskRemark
} from "@/lib/actions/tasks";
import { toggleChecklistItem } from "@/lib/actions/workspaces";
import { useRouter } from "next/navigation";

export default function TaskExecutionController({ taskId, onUpdate }: { taskId: string; onUpdate?: () => void }) {
  const { theme } = useTheme();
  const isLightMode = theme === "executive-light";

  const router = useRouter();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"checklist" | "attachments" | "teams">("checklist");
  
  // Input fields
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [newChecklistLabel, setNewChecklistLabel] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [teams, setTeams] = useState<any[]>([]);
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);
  const [remarksDraft, setRemarksDraft] = useState("");
  const [saveRemarksLoading, setSaveRemarksLoading] = useState(false);
  const [remarksHistory, setRemarksHistory] = useState<any[]>([]);
  const [remarksHistoryLoading, setRemarksHistoryLoading] = useState(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const loadTaskDetails = async () => {
    setLoading(true);
    setError(null);
    setPendingStatus(null);
    try {
      const details = await getTaskDetails(taskId);
      setTask(details);
      setRemarksDraft("");
      
      setRemarksHistoryLoading(true);
      const comments = await getTaskComments(taskId);
      setRemarksHistory(comments);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to load task details.");
    } finally {
      setRemarksHistoryLoading(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaskDetails();
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

  useEffect(() => {
    async function loadTeams() {
      try {
        const teamList = await fetchTeams();
        setTeams(teamList);
      } catch (e: any) {
        console.error("Failed to load teams catalog:", e);
      }
    }
    loadTeams();
  }, []);

  const handleStatusTransition = (action: "start" | "resolve" | "approve" | "reopen") => {
    if (action === "start") {
      setPendingStatus("ST_IN_PROGRESS");
    } else if (action === "resolve") {
      setPendingStatus("ST_RESOLVED");
    } else if (action === "approve") {
      setPendingStatus("ST_CLOSED");
    } else if (action === "reopen") {
      setPendingStatus("ST_REOPEN");
    }
  };

  const handleToggleChecklist = async (itemId: string, currentStatus: boolean) => {
    setError(null);
    try {
      await toggleChecklistItem(itemId, !currentStatus);
      // Local state update for instant response
      setTask((prev: any) => ({
        ...prev,
        checklists: prev.checklists.map((item: any) => 
          item.id === itemId ? { ...item, is_completed: !currentStatus } : item
        )
      }));
      onUpdate?.();
      router.refresh();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to update checklist item status.");
      setTimeout(() => setError(null), 6000);
    }
  };

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistLabel.trim()) return;
    setError(null);
    try {
      const newItem = await createChecklistItem(taskId, newChecklistLabel.trim());
      setTask((prev: any) => ({
        ...prev,
        checklists: [...(prev.checklists || []), newItem]
      }));
      setNewChecklistLabel("");
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to add checklist item. Verify database RLS policies.");
      setTimeout(() => setError(null), 8000);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Url = event.target?.result as string;
        try {
          const newFile = await createTaskAttachment(taskId, file.name, base64Url, file.size);
          setTask((prev: any) => ({
            ...prev,
            attachments: [...(prev.attachments || []), newFile]
          }));
          router.refresh();
        } catch (err: any) {
          console.error(err);
          setError(err.message || "Failed to attach file. Check RLS policies.");
          setTimeout(() => setError(null), 8000);
        } finally {
          setUploadingFile(false);
        }
      };
      reader.onerror = () => {
        setError("Failed to read file.");
        setUploadingFile(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setError("File upload processing failed.");
      setUploadingFile(false);
    }
  };

  const handleAssignTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) return;
    setError(null);
    try {
      await assignTeamToTask(taskId, selectedTeamId);
      // Reload task details to map structural joint info
      await loadTaskDetails();
      setSelectedTeamId("");
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to enroll team. Verify database RLS policies on task_teams.");
      setTimeout(() => setError(null), 8000);
    }
  };

  if (loading) {
    return (
      <AppCard className="p-8 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Hydrating Task details...</p>
      </AppCard>
    );
  }

  const handleSaveRemarks = async () => {
    if (!task || !remarksDraft.trim()) return;
    setSaveRemarksLoading(true);
    setError(null);
    try {
      if (pendingStatus) {
        // 1. Transition the status
        if (pendingStatus === "ST_IN_PROGRESS") {
          await transitionTaskStatus(taskId, "ST_IN_PROGRESS");
        } else if (pendingStatus === "ST_RESOLVED") {
          await resolveTask(taskId);
        } else if (pendingStatus === "ST_CLOSED") {
          await approveResolution(taskId);
        } else if (pendingStatus === "ST_REOPEN") {
          await reopenTask(taskId);
        } else {
          await transitionTaskStatus(taskId, pendingStatus);
        }
        
        // 2. Save the remark
        const newComment = await addTaskRemark(taskId, remarksDraft);
        setRemarksHistory(prev => [...prev, newComment]);
        setPendingStatus(null);
      } else {
        // Normal save remark
        const newComment = await addTaskRemark(taskId, remarksDraft);
        setRemarksHistory(prev => [...prev, newComment]);
        setTask((prev: any) => ({ ...prev, remarks: remarksDraft }));
      }
      
      setRemarksDraft("");
      await loadTaskDetails();
      onUpdate?.();
      router.refresh();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to save remarks.");
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
      await deleteTask(taskId);
      onUpdate?.();
      router.refresh();
      router.push("/workspaces");
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

  return (
    <AppCard className="p-5 space-y-5 border-t-4 border-t-purple-500">
      
      {/* Sleek Error Notification Banner */}
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center justify-between animate-in slide-in-from-top-1">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-[10px] text-rose-400/60 hover:text-rose-400 font-bold px-2">Dismiss</button>
        </div>
      )}

      {/* Title & Core Meta */}
      <div className="border-b pb-3 border-gray-200 dark:border-white/5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {task.code}
            </span>
            <h3 className={`text-sm font-bold ${isLightMode ? "text-gray-900" : "text-white"}`}>
              {task.title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <AppBadge variant={currentStatusCode === "ST_CLOSED" ? "success" : currentStatusCode === "ST_IN_PROGRESS" ? "info" : "neutral"}>
              {task.status?.name || "Open"}
            </AppBadge>
            <AppButton variant="outline" size="sm" className="text-rose-400 hover:bg-rose-500/10" onClick={handleDeleteTask} disabled={deleteLoading}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </AppButton>
          </div>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">{task.description}</p>
      </div>

      {/* Interactive Lifecycle State Transition Panel */}
      <div className={`p-4 rounded-xl border space-y-4 ${
        isLightMode ? "bg-gray-50 border-gray-200" : "bg-white/[0.01] border-white/5"
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Status Field</label>
            <select
              value={pendingStatus || currentStatusCode}
              onChange={(e) => {
                const newCode = e.target.value;
                if (newCode === currentStatusCode) {
                  setPendingStatus(null);
                } else {
                  setPendingStatus(newCode);
                }
              }}
              className={`w-full p-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-black/50 border-white/10 text-white"
              }`}
            >
              <option value="ST_OPEN">Open</option>
              <option value="ST_IN_PROGRESS">In Progress</option>
              <option value="ST_RESOLVED">Resolved</option>
              <option value="ST_CLOSED">Closed</option>
              <option value="ST_REOPEN">Reopened</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
              Quick Action Operations
            </label>
            <div className="flex flex-wrap gap-2">
              {currentStatusCode === "ST_OPEN" && (
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

              {currentStatusCode === "ST_IN_PROGRESS" && (
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

              {currentStatusCode === "ST_RESOLVED" && (
                <>
                  <AppButton 
                    size="sm" 
                    variant="primary" 
                    className="bg-purple-600 hover:bg-purple-700"
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

              {currentStatusCode === "ST_CLOSED" && (
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
            </div>
          </div>
        </div>

        {pendingStatus && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-xl flex items-center justify-between animate-in slide-in-from-top-1">
            <span>Status change to <strong>{pendingStatus === "ST_IN_PROGRESS" ? "In Progress" : pendingStatus === "ST_RESOLVED" ? "Resolved" : pendingStatus === "ST_CLOSED" ? "Closed" : "Reopened"}</strong> is pending. Write a mandatory remark below and click <strong>"Commit Status & Save Remark"</strong> to save both.</span>
            <button onClick={() => setPendingStatus(null)} className="text-[10px] text-amber-400/60 hover:text-amber-400 font-bold px-2 underline hover:no-underline">Cancel Change</button>
          </div>
        )}
 
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Task Remarks</label>
          <textarea
            value={remarksDraft}
            onChange={e => setRemarksDraft(e.target.value)}
            className={`w-full min-h-[96px] p-3 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
              isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-black/50 border-white/10 text-white"
            }`}
            placeholder="Add update notes or handoff remarks..."
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] text-gray-500">Last updated: {task.updated_at ? new Date(task.updated_at).toLocaleString() : "Not yet"}</span>
            <AppButton type="button" variant="primary" size="sm" onClick={handleSaveRemarks} disabled={saveRemarksLoading}>
              {saveRemarksLoading ? "Saving..." : pendingStatus ? "Commit Status & Save Remark" : "Save Remarks"}
            </AppButton>
          </div>

          {/* Remarks History Queue */}
          <div className={`mt-4 rounded-xl border p-4 transition-all duration-300 ${
            isLightMode ? "bg-gray-50 border-gray-200 text-gray-900" : "bg-white/[0.02] border-white/5 text-white"
          }`}>
            {/* Header with toggle */}
            <div 
              onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)} 
              className="flex items-center justify-between cursor-pointer select-none group"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-purple-500" />
                <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                  isLightMode ? "text-gray-700 group-hover:text-purple-600" : "text-gray-400 group-hover:text-purple-400"
                }`}>
                  Remarks History Queue
                </span>
                {remarksHistory.length > 0 && (
                  <AppBadge className="text-[10px] py-0.5 px-2 font-extrabold rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
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
                      const initials = (item.author?.full_name || "Unknown")
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
                            {item.author?.profile_photo ? (
                              <img 
                                src={item.author.profile_photo} 
                                alt={item.author.full_name} 
                                className="h-7 w-7 rounded-full border border-purple-500/20 object-cover"
                              />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-[10px] font-extrabold text-white border border-purple-500/20 shadow-md">
                                {initials}
                              </div>
                            )}

                            {/* Content Block */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1">
                                <span className={`text-xs font-bold transition-colors ${
                                  isLightMode ? "text-gray-800 group-hover/item:text-purple-600" : "text-gray-200 group-hover/item:text-purple-300"
                                }`}>
                                  {item.author?.full_name || "System Actor"}
                                </span>
                                <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
                                  <Clock className="h-3 w-3" />
                                  <span>{new Date(item.created_at).toLocaleString()}</span>
                                </div>
                              </div>
                              
                              <p className={`text-xs rounded-lg p-2.5 leading-relaxed break-words whitespace-pre-wrap border ${
                                isLightMode ? "bg-gray-100 border-gray-200/50 text-gray-700" : "bg-black/30 border-white/5 text-gray-300"
                              }`}>
                                {item.content}
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
        {(["checklist", "attachments", "teams"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold capitalize transition-all border-b-2 -mb-px flex items-center gap-1.5 ${
              activeTab === tab
                ? "border-purple-500 text-purple-400 font-extrabold"
                : "border-transparent text-gray-500 hover:text-gray-400"
            }`}
          >
            {tab === "checklist" && <CheckSquare className="h-3.5 w-3.5" />}
            {tab === "attachments" && <Paperclip className="h-3.5 w-3.5" />}
            {tab === "teams" && <Users2 className="h-3.5 w-3.5" />}
            <span>{tab}</span>
          </button>
        ))}
      </div>

      {/* Dynamic Tab Body */}
      <div className="min-h-[180px] pr-1">
        
        {/* Checklist Tab */}
        {activeTab === "checklist" && (
          <div className="space-y-4">
            <form onSubmit={handleAddChecklist} className="flex gap-2">
              <AppInput 
                placeholder="New operational checkoff point..." 
                value={newChecklistLabel}
                onChange={e => setNewChecklistLabel(e.target.value)}
                className="h-9 text-xs"
              />
              <AppButton type="submit" variant="primary" size="sm" className="h-9 shrink-0"><Plus className="h-4 w-4"/></AppButton>
            </form>

            <div className="space-y-2">
              {(task.checklists || []).map((item: any) => (
                <div 
                  key={item.id} 
                  onClick={() => handleToggleChecklist(item.id, item.is_completed)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors cursor-pointer ${
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
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Attachments</span>
              <button
                type="button"
                onClick={triggerFileSelect}
                className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-2 text-gray-500 transition hover:bg-purple-50 hover:text-purple-600"
                aria-label="Upload file"
              >
                <Pin className="h-4 w-4" />
              </button>
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange} 
            />

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
                  <span className="text-[10px] text-gray-500 block">Supports any document or image file</span>
                </div>
              )}
            </div>

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
                      <span className="text-[9px] text-gray-500 block">{(item.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  </div>
                  <a 
                    href={item.file_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="p-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
              {(task.attachments || []).length === 0 && (
                <div className="text-center py-8 text-xs text-gray-500">No attachments linked to this directive.</div>
              )}
            </div>
          </div>
        )}

        {/* Teams Assignment Tab */}
        {activeTab === "teams" && (
          <div className="space-y-4">
            <form onSubmit={handleAssignTeam} className="flex gap-2">
              <select 
                className={`w-full p-2.5 h-9 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  isLightMode ? "bg-white border-gray-300 text-gray-900" : "bg-black/50 border-white/10 text-white"
                }`}
                value={selectedTeamId}
                onChange={e => setSelectedTeamId(e.target.value)}
                required
              >
                <option value="" disabled>-- Assign Corporate Team --</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <AppButton type="submit" variant="primary" size="sm" className="h-9 shrink-0">Enroll</AppButton>
            </form>

            <div className="space-y-2">
              {(task.teams || []).map((tJoint: any) => (
                <div 
                  key={tJoint.id || tJoint.team?.id} 
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    isLightMode ? "bg-white border-gray-200" : "bg-white/[0.01] border-white/5"
                  }`}
                >
                  <Users2 className="h-4 w-4 text-purple-400" />
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs font-bold block truncate ${isLightMode ? "text-gray-900" : "text-white"}`}>
                      {tJoint.team?.name}
                    </span>
                    <span className="text-[9px] text-gray-500 block truncate">{tJoint.team?.description || "Corporate Squad"}</span>
                  </div>
                </div>
              ))}
              {(task.teams || []).length === 0 && (
                <div className="text-center py-8 text-xs text-gray-500">No corporate teams assigned.</div>
              )}
            </div>
          </div>
        )}

      </div>
    </AppCard>
  );
}
