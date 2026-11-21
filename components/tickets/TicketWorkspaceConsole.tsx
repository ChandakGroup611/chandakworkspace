"use client";
import { toast } from 'react-toastify';
import React, { useState, useEffect } from "react";
import { 
  Clock, Users, Save, Paperclip, CheckCircle2, Video, MessageSquare, ChevronDown, ChevronUp, Loader2, Network, AlertTriangle,
  User, Calendar, Timer, ActivitySquare, Link as LinkIcon, CheckSquare, MessageCircle, Gauge, Zap
} from "lucide-react";
import { AppCard } from "@/components/ui/AppCard";
import TicketRealtimeChat from "@/components/tickets/TicketRealtimeChat";
import DOMPurify from 'dompurify';
import { usePermissions } from "@/hooks/usePermissions";
import { fetchAssignees } from "@/lib/actions/users";
import { updateTicketDetails, fetchTicketRelations, linkTicket, searchTickets, fetchTicketComments, addTicketRemark, fetchTicketAuditLogs } from "@/lib/actions/tickets";
import { EnterpriseUploader } from "@/components/ui/EnterpriseUploader";
import { AppButton } from "@/components/ui/AppButton";
import { formatDate, formatDateTime } from "@/components/ui/data";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export function TicketWorkspaceConsole({
  ticket,
  onUpdate,
  departments,
  priorities,
  states,
  categories,
  subcategories,
  issueTypes,
  currentUserId,
  readOnly = false
}: any) {
  const { hasPermission, roleCode } = usePermissions();

  const [assigneesList, setAssigneesList] = useState<any[]>([]);

  // Pending Changes & Remarks
  const [pendingChanges, setPendingChanges] = useState<any>({});
  const [updateRemark, setUpdateRemark] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRemarkModalOpen, setIsRemarkModalOpen] = useState(false);
  const [remarksHistory, setRemarksHistory] = useState<any[]>([]);
  const [loadingRemarksHistory, setLoadingRemarksHistory] = useState(true);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

  // Relations State
  const [relations, setRelations] = useState<any[]>([]);
  const [newRelationCode, setNewRelationCode] = useState("");
  const [newRelationType, setNewRelationType] = useState<'DUPLICATE' | 'RELATED' | 'BLOCKS' | 'BLOCKED_BY'>('RELATED');
  const [isLinking, setIsLinking] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const autocompleteRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // SLA State
  const [slaTimeRemaining, setSlaTimeRemaining] = useState("");
  const [slaStatus, setSlaStatus] = useState<"MET" | "BREACHED" | "ACTIVE">("ACTIVE");
  const [slaPercent, setSlaPercent] = useState(100);

  // Additional Enterprise States
  const [subTasks, setSubTasks] = useState<{ id: string; text: string; completed: boolean; assignee_id?: string }[]>(ticket?.custom_fields?.sub_tasks || []);
  const [newSubTask, setNewSubTask] = useState("");
  const [timeLogged, setTimeLogged] = useState<number>(ticket?.custom_fields?.time_logged_minutes || 0);
  const [newTimeLog, setNewTimeLog] = useState("");
  const [isLoggingTime, setIsLoggingTime] = useState(false);

  const isAssignee = !!currentUserId && (currentUserId === ticket?.assignee_id || currentUserId === ticket?.assignee?.id || currentUserId === ticket?.assigned_to);
  const isCreator = !!currentUserId && (currentUserId === ticket?.creator_id || currentUserId === ticket?.created_by);
  const [activeTab, setActiveTab] = useState<'checklist' | 'links' | 'attachments' | 'chat' | 'activity' | 'time'>('checklist');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);

  const canEditFields = !readOnly && (roleCode === "SUPER_ADMIN" || hasPermission("TICKETS_UPDATE") || hasPermission("TICKETS_MANAGE") || hasPermission("TICKETS_EDIT") || isAssignee || isCreator || !ticket?.assignee_id);
  const isClassificationLocked = !canEditFields;

  const defaultDeptId = ticket?.department_id || ticket?.custom_fields?.department_id || "";
  const defaultIssueTypeId = ticket?.issue_type_id || ticket?.custom_fields?.issue_type_id || "";
  const defaultCategoryId = ticket?.category_id || ticket?.custom_fields?.category_id || "";
  const defaultSubCategoryId = ticket?.sub_category_id || ticket?.subcategory_id || ticket?.custom_fields?.sub_category_id || ticket?.custom_fields?.subcategory_id || "";

  useEffect(() => {
    async function loadInitialData() {
      if (!ticket?.dbId) return;
      const activeAssignees = await fetchAssignees();
      setAssigneesList(activeAssignees);
      try {
        const comments = await fetchTicketComments(ticket.dbId);
        setRemarksHistory(comments);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingRemarksHistory(false);
      }
      // Existing links were only shown after adding a new one; load them with the ticket.
      try {
        setRelations((await fetchTicketRelations(ticket.dbId)) || []);
      } catch (err) {
        console.error(err);
      }
    }
    loadInitialData();
  }, [ticket]);

  useEffect(() => {
    // Only search if actively typing or if empty (to show recent tickets)
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchTickets(newRelationCode);
        setSearchResults(results);
        if (newRelationCode.trim().length === 0 && showSuggestions) {
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [newRelationCode, showSuggestions]);

  useEffect(() => {
    if (!ticket?.created_at) return;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      const statusCode = ticket.statusObj?.code || "";
      if (statusCode === "ST_RESOLVED" || statusCode === "ST_CLOSED") {
        setSlaStatus("MET");
        setSlaTimeRemaining("SLA MET");
        setSlaPercent(100);
        return;
      }
      let slaHours = 24; 
      const prioCode = ticket.priorityObj?.code;
      if (prioCode === "PR_CRITICAL") slaHours = 4;
      else if (prioCode === "PR_HIGH") slaHours = 8;
      else if (prioCode === "PR_MEDIUM") slaHours = 24;
      else slaHours = 48;

      const createdTime = new Date(ticket.created_at).getTime();
      const targetTime = createdTime + (slaHours * 60 * 60 * 1000);
      const currentTime = Date.now();
      const diffMs = targetTime - currentTime;

      if (diffMs <= 0) {
        setSlaStatus("BREACHED");
        setSlaTimeRemaining("SLA BREACHED");
        setSlaPercent(0);
      } else {
        setSlaStatus("ACTIVE");
        const totalDuration = slaHours * 60 * 60 * 1000;
        const percent = Math.max(0, Math.min(100, (diffMs / totalDuration) * 100));
        setSlaPercent(percent);

        const diffHrs = Math.floor(diffMs / (60 * 60 * 1000));
        const diffMins = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
        if (diffHrs > 0) {
          setSlaTimeRemaining(`${diffHrs}h ${diffMins}m remaining`);
        } else {
          setSlaTimeRemaining(`${diffMins}m remaining`);
        }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [ticket, ticket?.priorityObj]);

  const executeFieldUpdate = async (fields: any) => {
    if (!ticket?.dbId) return;
    if (!canEditFields) {
      toast.error("Permission Denied: Only the Assignee can modify ticket attributes.");
      return;
    }
    try {
      await updateTicketDetails(ticket.dbId, fields);
      onUpdate();
    } catch (err: any) {
      toast.error(`Update failed: ${err.message}`);
    }
  };

  const handleFieldUpdate = (fields: any) => {
    setPendingChanges((prev: any) => ({ ...prev, ...fields }));
  };

  const cancelChanges = () => {
    setPendingChanges({});
    setUpdateRemark("");
    setIsRemarkModalOpen(false);
  };

  const commitChanges = async () => {
    const hasFieldChanges = Object.keys(pendingChanges).length > 0;
    if (!hasFieldChanges && !updateRemark.trim()) {
      setIsRemarkModalOpen(false);
      return;
    }
    setIsSaving(true);
    try {
      if (hasFieldChanges) {
        // Remark is optional: send it only when one was written.
        const updateData = { ...pendingChanges, ...(updateRemark.trim() ? { remark: updateRemark.trim() } : {}) };
        const res: any = await updateTicketDetails(ticket.dbId, updateData);
        if (res && res.success === false) {
          toast.error(`Commit failed: ${res.error || "Failed to update ticket"}`);
          return;
        }
      } else if (updateRemark.trim()) {
        const res: any = await addTicketRemark(ticket.dbId, updateRemark.trim());
        if (res && res.success === false) {
          toast.error(`Commit failed: ${res.error || "Failed to add remark"}`);
          return;
        }
      }
      setPendingChanges({});
      setUpdateRemark("");
      setIsRemarkModalOpen(false);
      onUpdate();
      toast.success("Ticket updated successfully.");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("unexpected response") || msg.includes("Failed to fetch")) {
        toast.error("Connection interrupted or portal refreshed. Please reload the page to apply changes.");
      } else {
        toast.error(`Commit failed: ${msg || "Failed to update"}`);
      }
    } finally {
      setIsSaving(false);
    }
  };
  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTimeLog) return;
    setIsLoggingTime(true);
    const addedTime = parseInt(newTimeLog);
    const totalTime = timeLogged + addedTime;
    const newCustomFields = { ...ticket.custom_fields, time_logged_minutes: totalTime };
    await executeFieldUpdate({ custom_fields: newCustomFields });
    setTimeLogged(totalTime);
    setNewTimeLog("");
    setIsLoggingTime(false);
  };

  const handleAddSubTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubTask.trim()) return;
    const newTask = { id: crypto.randomUUID(), text: newSubTask, completed: false };
    const updatedTasks = [...subTasks, newTask];
    const newCustomFields = { ...ticket.custom_fields, sub_tasks: updatedTasks };
    await executeFieldUpdate({ custom_fields: newCustomFields });
    setSubTasks(updatedTasks);
    setNewSubTask("");
  };

  const toggleSubTask = async (id: string) => {
    const updatedTasks = subTasks.map(st => st.id === id ? { ...st, completed: !st.completed } : st);
    const newCustomFields = { ...ticket.custom_fields, sub_tasks: updatedTasks };
    await executeFieldUpdate({ custom_fields: newCustomFields });
    setSubTasks(updatedTasks);
  };

  const setSubTaskAssignee = async (id: string, assignee_id: string) => {
    const updatedTasks = subTasks.map(st => st.id === id ? { ...st, assignee_id } : st);
    const newCustomFields = { ...ticket.custom_fields, sub_tasks: updatedTasks };
    await executeFieldUpdate({ custom_fields: newCustomFields });
    setSubTasks(updatedTasks);
  };

  useEffect(() => {
    if (activeTab !== 'activity' || !ticket?.dbId) return;
    let cancelled = false;
    setLoadingAudits(true);
    fetchTicketAuditLogs(ticket.dbId, 200, 0)
      .then((data: any) => { if (!cancelled) setAuditLogs(data || []); })
      .catch((err: any) => console.error(err))
      .finally(() => { if (!cancelled) setLoadingAudits(false); });
    return () => { cancelled = true; };
  }, [activeTab, ticket?.dbId, ticket?.updated_at]);

  const getPriorityColor = () => {
    const code = ticket.priorityObj?.code;
    if (code === "PR_CRITICAL") return "bg-danger/10 text-danger border-danger-border";
    if (code === "PR_HIGH") return "bg-warning-soft text-warning-text border-warning-border";
    if (code === "PR_MEDIUM") return "bg-warning/10 text-warning border-warning-border";
    return "bg-accent-soft text-theme-icon border-theme-btn-primary/20";
  };

  const hasPending = Object.keys(pendingChanges).length > 0;
  const currentCategoryId = pendingChanges.category_id !== undefined ? pendingChanges.category_id : defaultCategoryId;
  const tileCls = "flex min-h-[72px] flex-col justify-center gap-1 rounded-md border border-border bg-surface px-3 py-2.5";
  const tileLabel = "flex items-center gap-1.5 text-[12.5px] text-muted";
  const tileValue = "flex h-8 items-center text-[13.5px] text-foreground truncate";
  const fieldCls = "h-8 w-full rounded-md border border-border bg-surface px-2 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60";
  const selectCls = "h-9 w-full rounded-md border border-border bg-surface px-3 text-[13.5px] text-foreground outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60";
  const dateValue = pendingChanges.due_date !== undefined
    ? (pendingChanges.due_date ? new Date(pendingChanges.due_date).toISOString().split('T')[0] : "")
    : (ticket.due_date ? new Date(ticket.due_date).toISOString().split('T')[0] : "");

  const CardHeader = ({ icon: Icon, title, right }: { icon: any; title: string; right?: React.ReactNode }) => (
    <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-3">
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-muted" aria-hidden />
        <h3 className="text-[14px] font-semibold text-heading">{title}</h3>
      </div>
      {right}
    </div>
  );

  const tabs = [
    { id: 'checklist', label: 'Checklist', icon: CheckSquare, count: subTasks.length },
    { id: 'links', label: 'Links', icon: LinkIcon, count: relations.length },
    { id: 'attachments', label: 'Attachments', icon: Paperclip },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'activity', label: 'Activity', icon: ActivitySquare },
    { id: 'time', label: 'Time logs', icon: Clock },
  ] as const;

  return (
    <div className="space-y-5">

      {/* 1. Schedule and people — same card and tile layout as the Task page */}
      <AppCard className="overflow-hidden border border-border p-0 shadow-xs">
        <CardHeader icon={Clock} title="Schedule and people" />
        <div className="p-5">
          <div className="grid grid-cols-1 items-stretch gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <div className={tileCls}>
              <span className={tileLabel}><User className="h-3.5 w-3.5" aria-hidden /> Raised by</span>
              <div className={tileValue}>{ticket.creator?.full_name || "System"}</div>
            </div>
            <div className={tileCls}>
              <span className={tileLabel}><Calendar className="h-3.5 w-3.5" aria-hidden /> Raised on</span>
              <div className={tileValue}>{ticket.created_at ? formatDateTime(ticket.created_at) : "—"}</div>
            </div>
            <div className={tileCls}>
              <label htmlFor="tk-assignee" className={tileLabel}><Users className="h-3.5 w-3.5" aria-hidden /> Executive (assignee)</label>
              <select
                id="tk-assignee"
                value={pendingChanges.assignee_id !== undefined ? pendingChanges.assignee_id : (ticket.assignee_id || "")}
                onChange={(e) => {
                  const val = e.target.value;
                  const updates: any = { assignee_id: val };
                  if (val) {
                    const assignedState = states.find((s: any) => s.status_code === 'ST_ASSIGNED' || s.code === 'ST_ASSIGNED' || s.name?.toUpperCase() === 'ASSIGNED');
                    if (assignedState) updates.status_id = assignedState.id;
                  }
                  handleFieldUpdate(updates);
                }}
                disabled={!canEditFields}
                className={fieldCls}
              >
                <option value="">Unassigned</option>
                {assigneesList.map(a => (
                  <option key={a.id} value={a.id}>{a.full_name}</option>
                ))}
              </select>
            </div>
            <div className={tileCls}>
              <label htmlFor="tk-due" className={tileLabel}><Calendar className="h-3.5 w-3.5" aria-hidden /> Due date</label>
              {canEditFields ? (
                <input
                  id="tk-due"
                  type="date"
                  min={ticket?.createdAt ? new Date(ticket.createdAt).toISOString().split('T')[0] : undefined}
                  value={dateValue}
                  onChange={(e) => handleFieldUpdate({ due_date: e.target.value })}
                  className={fieldCls}
                />
              ) : (
                <div className={tileValue}>{ticket.due_date ? formatDate(ticket.due_date) : "Not set"}</div>
              )}
            </div>
            <div className={tileCls}>
              <span className={tileLabel}><Timer className="h-3.5 w-3.5" aria-hidden /> SLA</span>
              <div className={`${tileValue} font-medium ${slaStatus === "BREACHED" ? "text-danger-text" : slaStatus === "MET" ? "text-success" : ""}`}>
                {slaTimeRemaining || "Calculating…"}
              </div>
            </div>
            <div className={tileCls}>
              <span className={tileLabel}><Clock className="h-3.5 w-3.5" aria-hidden /> Time logged</span>
              <div className={`${tileValue} tabular-nums`}>{Math.floor(timeLogged / 60)}h {timeLogged % 60}m</div>
            </div>
            <div className={tileCls}>
              <span className={tileLabel}><Gauge className="h-3.5 w-3.5" aria-hidden /> Impact</span>
              <div className={tileValue}>{ticket.custom_fields?.impact || "Moderate"}</div>
            </div>
            <div className={tileCls}>
              <span className={tileLabel}><Zap className="h-3.5 w-3.5" aria-hidden /> Urgency</span>
              <div className={tileValue}>{ticket.custom_fields?.urgency || "Moderate"}</div>
            </div>
          </div>
        </div>
      </AppCard>

      {/* 2. Classification */}
      <AppCard className="overflow-hidden border border-border p-0 shadow-xs">
        <CardHeader icon={Network} title="Classification" />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label htmlFor="tk-dept" className="text-[13px] font-medium text-subtle">Department</label>
            <select id="tk-dept" value={pendingChanges.department_id !== undefined ? pendingChanges.department_id : defaultDeptId} onChange={(e) => handleFieldUpdate({ department_id: e.target.value })} disabled={isClassificationLocked} className={selectCls}>
              <option value="">Select department</option>
              {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="tk-itype" className="text-[13px] font-medium text-subtle">Issue type</label>
            <select id="tk-itype" value={pendingChanges.issue_type_id !== undefined ? pendingChanges.issue_type_id : defaultIssueTypeId} onChange={(e) => handleFieldUpdate({ issue_type_id: e.target.value })} disabled={isClassificationLocked} className={selectCls}>
              <option value="">Select issue type</option>
              {issueTypes?.map((it: any) => <option key={it.id} value={it.id}>{it.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="tk-cat" className="text-[13px] font-medium text-subtle">Category</label>
            <select id="tk-cat" value={currentCategoryId} onChange={(e) => handleFieldUpdate({ category_id: e.target.value, sub_category_id: null })} disabled={isClassificationLocked} className={selectCls}>
              <option value="">Select category</option>
              {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="tk-subcat" className="text-[13px] font-medium text-subtle">Subcategory</label>
            <select id="tk-subcat" value={pendingChanges.sub_category_id !== undefined ? (pendingChanges.sub_category_id || "") : defaultSubCategoryId} onChange={(e) => handleFieldUpdate({ sub_category_id: e.target.value })} disabled={isClassificationLocked || !currentCategoryId} className={selectCls}>
              <option value="">Select subcategory</option>
              {subcategories?.filter((sc: any) => sc.category_id === currentCategoryId).map((sc: any) => (
                <option key={sc.id} value={sc.id}>{sc.name}</option>
              ))}
            </select>
          </div>
        </div>
      </AppCard>

      {/* 3. Status and remarks */}
      <AppCard className="overflow-hidden border border-border p-0 shadow-xs">
        <CardHeader
          icon={MessageSquare}
          title="Status and remarks"
          right={canEditFields ? (
            <div className="flex gap-2">
              <AppButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const inProgressStatus = states.find((s: any) => s.name?.includes("Progress") || s.name?.toUpperCase().includes("PROGRESS") || s.name?.includes("Doing"));
                  if (inProgressStatus) {
                    handleFieldUpdate({ status_id: inProgressStatus.id, assignee_id: currentUserId });
                    setUpdateRemark("Acknowledged and actively investigating.");
                    setIsRemarkModalOpen(true);
                  } else {
                    toast.info("No 'In progress' status is set up for this scope in Masters.");
                  }
                }}
              >
                Acknowledge
              </AppButton>
              <AppButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const resolvedStatus = states.find((s: any) => s.name?.toUpperCase().includes("RESOLV") || s.code === "ST_RESOLVED");
                  if (resolvedStatus) {
                    handleFieldUpdate({ status_id: resolvedStatus.id });
                    setUpdateRemark("Issue has been resolved successfully.");
                    setIsRemarkModalOpen(true);
                  } else {
                    toast.info("No 'Resolved' status is set up for this scope in Masters.");
                  }
                }}
              >
                Mark resolved
              </AppButton>
            </div>
          ) : undefined}
        />
        <div className="space-y-5 p-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="tk-status" className="text-[13px] font-medium text-subtle">Status <span className="text-danger">*</span></label>
              <select
                id="tk-status"
                value={pendingChanges.status_id !== undefined ? pendingChanges.status_id : (ticket.status_id || "")}
                onChange={(e) => {
                  handleFieldUpdate({ status_id: e.target.value });
                  setIsRemarkModalOpen(true);
                }}
                disabled={!canEditFields}
                className={selectCls}
              >
                <option value="" disabled>Select status</option>
                {states.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="tk-priority" className="text-[13px] font-medium text-subtle">Priority</label>
              {priorities.length > 0 ? (
                <select
                  id="tk-priority"
                  value={pendingChanges.priority_id !== undefined ? pendingChanges.priority_id : (ticket.priority_id || ticket.priorityObj?.id || "")}
                  onChange={(e) => { if (e.target.value) handleFieldUpdate({ priority_id: e.target.value }); }}
                  disabled={!canEditFields}
                  className={selectCls}
                >
                  <option value="" disabled>Select priority</option>
                  {priorities.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name || p.priority_name}</option>
                  ))}
                </select>
              ) : (
                <div className="flex h-9 items-center">
                  <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${getPriorityColor()}`}>{ticket.priorityObj?.name || "Not set"}</span>
                </div>
              )}
            </div>
          </div>

          {hasPending && (
            <div role="status" className="flex items-center justify-between gap-3 rounded-md border border-warning-border bg-warning-soft p-3 text-[13px] text-warning-text">
              <div className="flex min-w-0 items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                <span>You have unsaved changes. Click <strong className="font-semibold">Save changes</strong> to save them (a remark is optional).</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => setIsRemarkModalOpen(true)} className="whitespace-nowrap rounded-md border border-warning-border bg-surface px-2.5 py-1 text-[12.5px] font-medium text-foreground hover:bg-surface-hover">
                  Review & Remark
                </button>
                <button type="button" onClick={cancelChanges} className="whitespace-nowrap rounded-md border border-warning-border px-2.5 py-1 text-[12.5px] font-medium hover:bg-surface">
                  Discard
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="tk-remark" className="text-[13px] font-medium text-subtle">
              Remark <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              id="tk-remark"
              value={updateRemark}
              onChange={e => setUpdateRemark(e.target.value)}
              disabled={!canEditFields}
              className="min-h-[80px] w-full resize-y rounded-md border border-border bg-surface p-3 text-[13.5px] text-foreground outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              placeholder={!canEditFields ? "This ticket is read-only for you." : "Add an update or note for this ticket…"}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[12.5px] text-muted">Last updated: {ticket.updated_at ? formatDateTime(ticket.updated_at) : "Not yet"}</span>
              {canEditFields && (
                <div className="flex gap-2">
                  {hasPending && (
                    <AppButton type="button" variant="ghost" size="sm" onClick={cancelChanges} disabled={isSaving}>Cancel</AppButton>
                  )}
                  <AppButton
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (hasPending && !updateRemark.trim()) {
                        setIsRemarkModalOpen(true);
                      } else {
                        commitChanges();
                      }
                    }}
                    disabled={isSaving || (!hasPending && !updateRemark.trim())}
                    leftIcon={isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  >
                    {isSaving ? "Saving…" : hasPending ? "Save changes" : "Add remark"}
                  </AppButton>
                </div>
              )}
            </div>
          </div>

          {/* Remarks history */}
          <div className="border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
              aria-expanded={!isHistoryCollapsed}
              className="flex w-full items-center justify-between rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-center gap-2 text-[13px] font-medium text-subtle">
                <MessageSquare className="h-4 w-4 text-muted" aria-hidden />
                Remarks history
                {remarksHistory.length > 0 && (
                  <span className="rounded-full bg-sunken px-1.5 text-[11px] font-medium tabular-nums text-subtle">{remarksHistory.length}</span>
                )}
              </span>
              {isHistoryCollapsed ? <ChevronDown className="h-4 w-4 text-muted" aria-hidden /> : <ChevronUp className="h-4 w-4 text-muted" aria-hidden />}
            </button>

            {!isHistoryCollapsed && (
              <div className="mt-4 max-h-[360px] space-y-4 overflow-y-auto pr-1">
                {loadingRemarksHistory ? (
                  <div className="flex items-center justify-center gap-2 py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-muted" aria-hidden />
                    <span className="text-[13px] text-muted">Loading remarks…</span>
                  </div>
                ) : remarksHistory.length === 0 ? (
                  <div className="py-6 text-center text-[13px] text-muted">No remarks yet.</div>
                ) : (
                  remarksHistory.map((item: any) => {
                    const name = item.author?.full_name || item.user?.full_name || "System";
                    const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                    return (
                      <div key={item.id} className="flex items-start gap-3">
                        {item.user?.profile_photo ? (
                          <img src={item.user.profile_photo} alt="" className="h-7 w-7 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent-soft-text">{initials}</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center justify-between gap-x-2">
                            <span className="text-[13px] font-medium text-foreground">{name}</span>
                            <span className="text-[12px] text-muted">{formatDateTime(item.created_at)}</span>
                          </div>
                          <div
                            className="whitespace-pre-wrap break-words rounded-md border border-border bg-sunken p-2.5 text-[13px] leading-relaxed text-foreground"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.content || "") }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </AppCard>

      {/* Remark Popup Modal */}
      <Dialog open={isRemarkModalOpen} onOpenChange={setIsRemarkModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Update Status & Remark</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            {pendingChanges.status_id ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-sunken p-3 text-[13px]">
                <span className="text-muted">Target status:</span>
                <span className="font-semibold text-foreground">
                  {states.find((s: any) => s.id === pendingChanges.status_id)?.name || "Selected status"}
                </span>
                {ticket.statusObj?.name && (
                  <span className="text-[12px] text-muted">
                    (from {ticket.statusObj.name})
                  </span>
                )}
              </div>
            ) : hasPending ? (
              <div className="rounded-md border border-border bg-sunken p-3 text-[13px] text-foreground">
                You have pending ticket attribute changes to save.
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label htmlFor="modal-tk-remark" className="text-[13px] font-medium text-subtle">
                Remark <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                id="modal-tk-remark"
                value={updateRemark}
                onChange={(e) => setUpdateRemark(e.target.value)}
                placeholder="Add an update note or context for this ticket (optional)..."
                className="min-h-[100px] w-full resize-y rounded-md border border-border bg-surface p-3 text-[13.5px] text-foreground outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              <p className="text-[12px] text-muted">
                Remark is optional. Records will be saved in ticket history with or without a note.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <AppButton
              type="button"
              variant="ghost"
              onClick={() => setIsRemarkModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </AppButton>
            <AppButton
              type="button"
              variant="primary"
              onClick={commitChanges}
              disabled={isSaving}
              leftIcon={isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            >
              {isSaving ? "Saving…" : "Save changes"}
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Details and activity — tabbed, like the Task page */}
      <AppCard className="overflow-hidden border border-border p-0 shadow-xs">
        <CardHeader icon={ActivitySquare} title="Details and activity" />
        <div className="p-5">
          <div role="tablist" aria-label="Ticket details" className="hide-scrollbar -mx-5 -mt-5 mb-2 flex flex-nowrap items-center gap-1 overflow-x-auto border-b border-border px-5">
            {tabs.map(t => {
              const isActive = activeTab === t.id;
              const count = (t as any).count as number | undefined;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(t.id)}
                  className={`-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isActive ? "border-primary text-foreground" : "border-transparent text-muted hover:text-foreground"}`}
                >
                  <t.icon className="h-3.5 w-3.5" aria-hidden />
                  <span>{t.label}</span>
                  {count !== undefined && count > 0 && (
                    <span className="rounded-full bg-sunken px-1.5 text-[11px] font-medium tabular-nums text-subtle">{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-4">
            {/* Checklist */}
            {activeTab === 'checklist' && (
              <div className="space-y-3">
                {subTasks.length > 0 ? (
                  <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                    {subTasks.map((st) => (
                      <div key={st.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <label className="flex min-w-0 items-center gap-3">
                          <input
                            type="checkbox"
                            checked={st.completed}
                            onChange={() => toggleSubTask(st.id)}
                            disabled={!canEditFields}
                            className="h-4 w-4 rounded border-border"
                          />
                          <span className={`truncate text-[13.5px] ${st.completed ? 'text-muted line-through' : 'text-foreground'}`}>{st.text}</span>
                        </label>
                        <select
                          aria-label={`Assignee for ${st.text}`}
                          value={st.assignee_id || ""}
                          onChange={(e) => setSubTaskAssignee(st.id, e.target.value)}
                          disabled={!canEditFields}
                          className="h-8 w-40 shrink-0 rounded-md border border-border bg-surface px-2 text-[12.5px] text-foreground disabled:opacity-60"
                        >
                          <option value="">Unassigned</option>
                          {assigneesList.map(a => (
                            <option key={a.id} value={a.id}>{a.full_name}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-[13px] text-muted">No checklist items yet.</div>
                )}
                {canEditFields && (
                  <form onSubmit={handleAddSubTask} className="flex items-center gap-2">
                    <input
                      type="text"
                      aria-label="New checklist item"
                      value={newSubTask}
                      onChange={(e) => setNewSubTask(e.target.value)}
                      placeholder="Add a checklist item…"
                      className="h-9 flex-1 rounded-md border border-border bg-surface px-3 text-[13.5px] text-foreground outline-none focus:ring-2 focus:ring-ring"
                    />
                    <AppButton type="submit" variant="primary" size="sm" disabled={!newSubTask.trim()}>Add</AppButton>
                  </form>
                )}
              </div>
            )}

            {/* Links (related tickets) */}
            {activeTab === 'links' && (
              <div className="space-y-4">
                {relations.length > 0 ? (
                  <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                    {relations.map((rel: any) => { const rt = rel.relatedTicket || rel.target_ticket; return (
                      <div key={rel.id} className="flex items-center gap-3 px-3 py-2.5 text-[13px]">
                        <span className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold ${rel.relation_type === 'DUPLICATE' ? 'bg-warning-soft text-warning-text' : rel.relation_type === 'BLOCKS' ? 'bg-danger-soft text-danger-text' : 'bg-accent-soft text-accent-soft-text'}`}>
                          {rel.relation_type}
                        </span>
                        {rt?.id ? (
                          <a href={`/tickets/${rt.id}`} className="truncate font-medium text-foreground hover:underline">
                            {rt.code} — {rt.title}
                          </a>
                        ) : (
                          <span className="truncate text-muted">Linked ticket not available</span>
                        )}
                      </div>
                    ); })}
                  </div>
                ) : (
                  <div className="py-4 text-center text-[13px] text-muted">No linked tickets.</div>
                )}

                {canEditFields && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      aria-label="Link type"
                      value={newRelationType}
                      onChange={(e) => setNewRelationType(e.target.value as any)}
                      className="h-9 rounded-md border border-border bg-surface px-3 text-[13px] text-foreground sm:w-40"
                    >
                      <option value="RELATED">Relates to</option>
                      <option value="BLOCKS">Blocks</option>
                      <option value="DUPLICATE">Duplicate of</option>
                    </select>
                    <div className="relative flex-1" ref={autocompleteRef}>
                      <input
                        type="text"
                        aria-label="Search ticket to link"
                        value={newRelationCode}
                        onChange={(e) => { setNewRelationCode(e.target.value); setShowSuggestions(true); }}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder="Search by ticket code or subject…"
                        className="h-9 w-full rounded-md border border-border bg-surface px-3 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-ring"
                      />
                      {(isSearching || isLinking) && (
                        <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted" aria-hidden />
                      )}
                      {showSuggestions && searchResults.length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[250px] overflow-y-auto rounded-md border border-border bg-elevated shadow-lg">
                          {searchResults.filter((t: any) => t.id !== ticket.dbId).map((t: any) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={async () => {
                                setIsLinking(true);
                                try {
                                  await linkTicket(ticket.dbId, t.code, newRelationType);
                                  setRelations(await fetchTicketRelations(ticket.dbId));
                                  setNewRelationCode("");
                                  setShowSuggestions(false);
                                } catch (err: any) {
                                  toast.error("Couldn't link the ticket: " + err.message);
                                } finally {
                                  setIsLinking(false);
                                }
                              }}
                              className="block w-full border-b border-border p-3 text-left last:border-b-0 hover:bg-surface-hover"
                            >
                              <div className="mb-1 flex items-center justify-between">
                                <span className="font-mono text-[12px] font-medium text-accent-soft-text">{t.code}</span>
                                <span className="text-[11.5px] text-muted">{formatDate(t.created_at)}</span>
                              </div>
                              <div className="truncate text-[13px] text-foreground">{t.title}</div>
                            </button>
                          ))}
                        </div>
                      )}
                      {showSuggestions && searchResults.length === 0 && newRelationCode.trim().length > 0 && !isSearching && (
                        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-border bg-elevated p-3 text-center text-[13px] text-muted shadow-lg">
                          No tickets match "{newRelationCode}"
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Attachments */}
            {activeTab === 'attachments' && (
              <EnterpriseUploader
                moduleType="ticket"
                recordId={ticket.dbId || ticket.id || ticket.code}
                isLightMode={false}
                onUploadComplete={() => {}}
              />
            )}

            {/* Chat */}
            {activeTab === 'chat' && (
              <div className="flex h-[520px] min-h-0 flex-col">
                <TicketRealtimeChat ticketId={ticket.dbId} />
              </div>
            )}

            {/* Activity (audit) */}
            {activeTab === 'activity' && (
              <div className="space-y-3">
                {loadingAudits ? (
                  <div className="flex items-center justify-center gap-2 py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-muted" aria-hidden />
                    <span className="text-[13px] text-muted">Loading activity…</span>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="py-6 text-center text-[13px] text-muted">No activity recorded yet.</div>
                ) : (
                  <ol className="relative space-y-4 border-l border-border pl-4">
                    {auditLogs.map((log: any) => (
                      <li key={log.id} className="relative">
                        <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-primary" aria-hidden />
                        <div className="flex flex-wrap items-center justify-between gap-x-2 text-[13px]">
                          <span className="font-medium text-foreground">{log.actor?.full_name || "System"} updated the ticket</span>
                          <span className="text-[12px] text-muted">{formatDateTime(log.created_at)}</span>
                        </div>
                        {Array.isArray(log.changed_fields) && log.changed_fields.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {log.changed_fields.map((field: string) => (
                              <span key={field} className="rounded bg-sunken px-1.5 py-0.5 font-mono text-[11.5px] text-subtle">{field}</span>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            {/* Time logs */}
            {activeTab === 'time' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-md border border-border bg-sunken px-4 py-3">
                  <span className="flex items-center gap-1.5 text-[13px] text-muted"><Clock className="h-4 w-4" aria-hidden /> Total time logged</span>
                  <span className="text-[15px] font-semibold tabular-nums text-foreground">{Math.floor(timeLogged / 60)}h {timeLogged % 60}m</span>
                </div>
                {canEditFields && (
                  <form onSubmit={handleLogTime} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1.5">
                      <label htmlFor="tk-timelog" className="text-[13px] font-medium text-subtle">Log time (minutes)</label>
                      <input
                        id="tk-timelog"
                        type="number"
                        min="1"
                        value={newTimeLog}
                        onChange={(e) => setNewTimeLog(e.target.value)}
                        placeholder="e.g. 30"
                        className="h-9 w-full rounded-md border border-border bg-surface px-3 text-[13.5px] text-foreground outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <AppButton type="submit" variant="primary" size="sm" className="h-9" disabled={!newTimeLog || isLoggingTime}>
                      {isLoggingTime ? "Logging…" : "Log time"}
                    </AppButton>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </AppCard>
    </div>
  );
}
