"use client";

import React, { useState, useEffect } from "react";
import { 
  Clock, Users, Save, Paperclip, CheckCircle2, Video, MessageSquare, ChevronDown, ChevronUp, Loader2, Network
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { fetchAssignees } from "@/lib/actions/users";
import { updateTicketDetails, fetchTicketRelations, linkTicket, searchTickets, fetchTicketComments } from "@/lib/actions/tickets";
import { EnterpriseUploader } from "@/components/ui/EnterpriseUploader";
import { AppButton } from "@/components/ui/AppButton";

export function TicketWorkspaceConsole({
  ticket,
  onUpdate,
  departments,
  priorities,
  states,
  categories,
  subcategories,
  issueTypes,
  currentUserId
}: any) {
  const { hasPermission, roleCode } = usePermissions();

  const [assigneesList, setAssigneesList] = useState<any[]>([]);

  // Pending Changes & Remarks
  const [pendingChanges, setPendingChanges] = useState<any>({});
  const [updateRemark, setUpdateRemark] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [remarksHistory, setRemarksHistory] = useState<any[]>([]);
  const [loadingRemarksHistory, setLoadingRemarksHistory] = useState(true);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(true);

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
  const [subTasks, setSubTasks] = useState<{ id: string; text: string; completed: boolean }[]>(ticket?.custom_fields?.sub_tasks || []);
  const [newSubTask, setNewSubTask] = useState("");
  const [timeLogged, setTimeLogged] = useState<number>(ticket?.custom_fields?.time_logged_minutes || 0);
  const [newTimeLog, setNewTimeLog] = useState("");
  const [isLoggingTime, setIsLoggingTime] = useState(false);

  const canEditFields = roleCode === "SUPER_ADMIN" || hasPermission("TICKETS_UPDATE") || !ticket?.assignee_id;
  const isClassificationLocked = !!ticket?.assignee_id && roleCode !== "SUPER_ADMIN" && !hasPermission("TICKETS_UPDATE");

  const defaultDeptId = ticket?.department_id || ticket?.custom_fields?.department_id || "";
  const defaultIssueTypeId = ticket?.issue_type_id || ticket?.custom_fields?.issue_type_id || "";
  const defaultCategoryId = ticket?.category_id || ticket?.custom_fields?.category_id || "";
  const defaultSubCategoryId = ticket?.sub_category_id || ticket?.subcategory_id || ticket?.custom_fields?.sub_category_id || ticket?.custom_fields?.subcategory_id || "";

  useEffect(() => {
    async function loadInitialData() {
      if (!ticket?.dbId) return;
      const activeAssignees = await fetchAssignees();
      setAssigneesList(activeAssignees);
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
    }, 1000);
    return () => clearInterval(interval);
  }, [ticket, ticket?.priorityObj]);

  const executeFieldUpdate = async (fields: any) => {
    if (!ticket?.dbId) return;
    if (!canEditFields) {
      alert("Permission Denied: Only the Assignee can modify ticket attributes.");
      return;
    }
    try {
      await updateTicketDetails(ticket.dbId, fields);
      onUpdate();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const handleFieldUpdate = (fields: any) => {
    setPendingChanges((prev: any) => ({ ...prev, ...fields }));
  };

  const cancelChanges = () => {
    setPendingChanges({});
    setUpdateRemark("");
  };

  const commitChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) return;
    if (!updateRemark.trim()) {
      alert("A remark is mandatory when updating ticket details.");
      return;
    }
    setIsSaving(true);
    try {
      const updateData = { ...pendingChanges, remark: updateRemark };
      await updateTicketDetails(ticket.dbId, updateData);
      setPendingChanges({});
      setUpdateRemark("");
      onUpdate();
    } catch (err: any) {
      alert(`Commit failed: ${err.message}`);
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

  const getPriorityColor = () => {
    const code = ticket.priorityObj?.code;
    if (code === "PR_CRITICAL") return "bg-red-500/10 text-red-500 border-red-500/20";
    if (code === "PR_HIGH") return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    if (code === "PR_MEDIUM") return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  };

  return (
    <div className="flex flex-col h-full overflow-hidden transition-all duration-500">
      
      {/* ── EXECUTION CONTROLLER LAYOUT (Identical to Task details structure) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          
          {/* Checklists / Subtasks */}
          <div className="rounded-3xl border border-border bg-surface shadow-sm overflow-hidden flex flex-col">
            <div className="bg-background border-b border-border p-4">
               <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                 <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Checklist & Objectives
               </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                {subTasks.map((st) => (
                  <div key={st.id} className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      checked={st.completed}
                      onChange={() => toggleSubTask(st.id)}
                      disabled={!canEditFields}
                      className="w-4 h-4 rounded border-border text-purple-600 focus:ring-purple-500"
                    />
                    <span className={`text-xs font-medium ${st.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {st.text}
                    </span>
                  </div>
                ))}
              </div>
              
              {canEditFields && (
                <form onSubmit={handleAddSubTask} className="flex items-center gap-2 mt-4 pt-2">
                  <input 
                    type="text"
                    value={newSubTask}
                    onChange={(e) => setNewSubTask(e.target.value)}
                    placeholder="Add a new sub-task..."
                    className="flex-1 border rounded-lg px-3 py-2 text-xs bg-background border-border text-foreground focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                  />
                  <AppButton type="submit" variant="primary" disabled={!newSubTask.trim()}>
                    Add
                  </AppButton>
                </form>
              )}
            </div>
          </div>

          {/* TICKET RELATIONSHIPS */}
          <div className="rounded-3xl border border-border bg-surface shadow-sm flex flex-col relative z-50">
            <div className="bg-background border-b border-border p-4 rounded-t-3xl">
               <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                 <Paperclip className="w-4 h-4 text-pink-500" /> Ticket Relationships
               </h3>
            </div>
            <div className="p-6">
              {/* Existing Relations List */}
              {relations.length > 0 && (
                <div className="space-y-2 mb-6">
                  {relations.map((rel: any) => (
                    <div key={rel.id} className="flex items-center justify-between p-3 border rounded-lg bg-background text-xs">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                          rel.relation_type === 'DUPLICATE' ? 'bg-amber-500/10 text-amber-500' :
                          rel.relation_type === 'BLOCKS' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                          {rel.relation_type}
                        </span>
                        <span className="font-medium text-foreground">{rel.relatedTicket?.code} - {rel.relatedTicket?.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add Relation Form */}
              {canEditFields && (
                <div className="border border-border bg-background rounded-lg p-4">
                  <div className="flex gap-2">
                    <select 
                      value={newRelationType}
                      onChange={(e) => setNewRelationType(e.target.value as any)}
                      className="border rounded-lg px-3 py-2 text-xs bg-background border-border text-foreground outline-none w-32 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
                    >
                      <option value="RELATED">Relates to</option>
                      <option value="BLOCKS">Blocks</option>
                      <option value="DUPLICATE">Duplicate of</option>
                    </select>
                    
                    <div className="flex-1 relative" ref={autocompleteRef}>
                      <input 
                        type="text"
                        value={newRelationCode}
                        onChange={(e) => {
                          setNewRelationCode(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder="Search by ticket code or subject..."
                        className="w-full border rounded-lg px-3 py-2 text-xs bg-background border-border text-foreground focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all"
                      />
                      {isSearching && (
                        <div className="absolute right-3 top-2.5">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      
                      {/* Autocomplete Dropdown */}
                      {showSuggestions && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-xl z-50 max-h-[250px] overflow-y-auto">
                          {searchResults.map((t) => (
                            <div 
                              key={t.id} 
                              onClick={async () => {
                                setIsLinking(true);
                                try {
                                  await linkTicket(ticket.dbId, t.code, newRelationType);
                                  const updatedRelations = await fetchTicketRelations(ticket.dbId);
                                  setRelations(updatedRelations);
                                  setNewRelationCode("");
                                  setShowSuggestions(false);
                                } catch (err: any) {
                                  alert("Failed to link: " + err.message);
                                } finally {
                                  setIsLinking(false);
                                }
                              }}
                              className="p-3 border-b border-border hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-pink-500">{t.code}</span>
                                <span className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
                              </div>
                              <div className="text-xs text-foreground truncate">{t.title}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {showSuggestions && searchResults.length === 0 && newRelationCode.trim().length > 0 && !isSearching && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-xl z-50 p-3 text-center text-xs text-muted-foreground">
                          No tickets found matching "{newRelationCode}"
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TIMELINE & META (Shifted Down) */}
          <div className="rounded-3xl border border-border bg-surface shadow-sm overflow-hidden flex flex-col">
            <div className="bg-background border-b border-border p-4 flex items-center justify-between">
               <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                 <Clock className="w-4 h-4 text-purple-500" /> Timeline & Meta
               </h3>
               <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${getPriorityColor()}`}>
                 {ticket.priorityObj?.name || "STANDARD"}
               </span>
            </div>
            
            <div className="p-6 grid grid-cols-2 gap-4">
               <div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Target Due Date</div>
                  <div className="text-xs font-semibold text-foreground flex items-center">
                    {canEditFields ? (
                      <input 
                        type="date" 
                        min={ticket?.createdAt ? new Date(ticket.createdAt).toISOString().split('T')[0] : undefined}
                        value={pendingChanges.due_date !== undefined 
                          ? (pendingChanges.due_date ? new Date(pendingChanges.due_date).toISOString().split('T')[0] : "") 
                          : (ticket.due_date ? new Date(ticket.due_date).toISOString().split('T')[0] : "")}
                        onChange={(e) => handleFieldUpdate({ due_date: e.target.value })}
                        className="bg-transparent border-b border-border/50 text-foreground outline-none focus:border-purple-500 py-0.5 w-full cursor-pointer"
                      />
                    ) : (
                      ticket.due_date ? new Date(ticket.due_date).toLocaleDateString() : "Not Set"
                    )}
                  </div>
               </div>
               <div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">SLA Status</div>
                  <div className={`text-xs font-semibold ${slaStatus === "BREACHED" ? "text-red-500" : slaStatus === "MET" ? "text-green-500" : "text-purple-500"}`}>
                    {slaTimeRemaining}
                  </div>
               </div>
               <div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Impact</div>
                  <div className="text-xs font-semibold text-foreground">
                    {ticket.custom_fields?.impact || "Moderate"}
                  </div>
               </div>
               <div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Urgency</div>
                  <div className="text-xs font-semibold text-foreground">
                    {ticket.custom_fields?.urgency || "Moderate"}
                  </div>
               </div>
            </div>
            
            <div className="bg-background/50 border-t border-border p-4 flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Total Time Logged
              </span>
              <span className="text-sm font-black text-purple-600 dark:text-purple-400">
                {Math.floor(timeLogged / 60)}h {timeLogged % 60}m
              </span>
            </div>
          </div>
        </div>
        
        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          
          {/* EXECUTION TEAM & ROUTING (Moved to Top) */}
          <div className="rounded-3xl border border-border bg-surface shadow-sm overflow-hidden flex flex-col">
            <div className="bg-background border-b border-border p-4 flex items-center justify-between">
               <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                 <Users className="w-4 h-4 text-blue-500" /> Execution Team & Routing
               </h3>
            </div>
            <div className="p-6 space-y-6">
               <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1.5">Current Assignee</label>
                <select 
                  value={pendingChanges.assignee_id !== undefined ? pendingChanges.assignee_id : (ticket.assignee_id || "")}
                  onChange={(e) => {
                    const val = e.target.value;
                    const updates: any = { assignee_id: val };
                    if (val) {
                      const assignedState = states.find((s: any) => s.status_code === 'ST_ASSIGNED' || s.name?.toUpperCase() === 'ASSIGNED');
                      if (assignedState) {
                        updates.status_id = assignedState.id;
                      }
                    }
                    handleFieldUpdate(updates);
                  }}
                  disabled={!canEditFields}
                  className="w-full border rounded-lg p-3 text-xs font-medium outline-none disabled:opacity-60 transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-background border-border text-foreground"
                >
                  <option value="">Unassigned</option>
                  {assigneesList.map(a => (
                    <option key={a.id} value={a.id}>{a.full_name}</option>
                  ))}
                </select>
               </div>
               
               <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1.5">Workflow Status</label>
                <select 
                  value={ticket.status_id}
                  onChange={(e) => handleFieldUpdate({ status_id: e.target.value })}
                  disabled={!canEditFields}
                  className="w-full border rounded-lg p-3 text-xs font-medium outline-none disabled:opacity-60 transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-background border-border text-foreground"
                >
                  {states.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
               </div>
               
               {canEditFields && (
                <div className="pt-2">
                 <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1.5">Log Time (Minutes)</label>
                 <form onSubmit={handleLogTime} className="flex items-center gap-2">
                    <input 
                      type="number"
                      min="1"
                      value={newTimeLog}
                      onChange={(e) => setNewTimeLog(e.target.value)}
                      placeholder="e.g. 30"
                      className="w-full border rounded-lg px-3 py-2 text-xs bg-background border-border text-foreground focus:border-blue-500 outline-none"
                    />
                    <AppButton type="submit" variant="outline" size="sm" disabled={!newTimeLog || isLoggingTime}>
                      {isLoggingTime ? "..." : "Log"}
                    </AppButton>
                 </form>
                </div>
               )}
            </div>
          </div>

          {/* CLASSIFICATION BLOCK (Shifted Down) */}
          <div className="rounded-3xl border border-border bg-surface shadow-sm overflow-hidden flex flex-col">
            <div className="bg-background border-b border-border p-4 flex items-center justify-between">
               <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                 <Network className="w-4 h-4 text-emerald-500" /> Classification
               </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1.5">Department</label>
                  <select 
                    value={pendingChanges.department_id !== undefined ? pendingChanges.department_id : defaultDeptId}
                    onChange={(e) => handleFieldUpdate({ department_id: e.target.value })}
                    disabled={isClassificationLocked}
                    className="w-full border rounded-lg p-2.5 text-xs font-medium outline-none disabled:opacity-60 transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-background border-border text-foreground"
                  >
                    <option value="">Select Department</option>
                    {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1.5">Issue Type</label>
                  <select 
                    value={pendingChanges.issue_type_id !== undefined ? pendingChanges.issue_type_id : defaultIssueTypeId}
                    onChange={(e) => handleFieldUpdate({ issue_type_id: e.target.value })}
                    disabled={isClassificationLocked}
                    className="w-full border rounded-lg p-2.5 text-xs font-medium outline-none disabled:opacity-60 transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-background border-border text-foreground"
                  >
                    <option value="">Select Issue Type</option>
                    {issueTypes?.map((it: any) => <option key={it.id} value={it.id}>{it.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1.5">Category</label>
                  <select 
                    value={pendingChanges.category_id !== undefined ? pendingChanges.category_id : defaultCategoryId}
                    onChange={(e) => handleFieldUpdate({ category_id: e.target.value, sub_category_id: null })}
                    disabled={isClassificationLocked}
                    className="w-full border rounded-lg p-2.5 text-xs font-medium outline-none disabled:opacity-60 transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-background border-border text-foreground"
                  >
                    <option value="">Select Category</option>
                    {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1.5">Subcategory</label>
                  <select 
                    value={pendingChanges.sub_category_id !== undefined ? pendingChanges.sub_category_id : defaultSubCategoryId}
                    onChange={(e) => handleFieldUpdate({ sub_category_id: e.target.value })}
                    disabled={isClassificationLocked || !(pendingChanges.category_id !== undefined ? pendingChanges.category_id : defaultCategoryId)}
                    className="w-full border rounded-lg p-2.5 text-xs font-medium outline-none disabled:opacity-60 transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-background border-border text-foreground"
                  >
                    <option value="">Select Subcategory</option>
                    {subcategories?.filter((sc: any) => sc.category_id === (pendingChanges.category_id !== undefined ? pendingChanges.category_id : defaultCategoryId)).map((sc: any) => (
                      <option key={sc.id} value={sc.id}>{sc.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* LOWER SECTION: Remarks and Attachments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full mt-6">

        {/* LEFT: ATTACHMENTS */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-surface shadow-sm overflow-hidden flex flex-col">
            <div className="bg-background border-b border-border p-4">
               <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                 <Paperclip className="w-4 h-4 text-amber-500" /> References & Artifacts
               </h3>
            </div>
            <div className="p-4">
              <EnterpriseUploader 
                moduleType="ticket" 
                recordId={ticket.dbId} 
                isLightMode={false} 
                onUploadComplete={() => {}}
              />
            </div>
          </div>
        </div>

        {/* RIGHT: TICKET REMARKS */}
        <div className="space-y-3">
        {(Object.keys(pendingChanges).length > 0) && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs rounded-xl flex items-center justify-between animate-in slide-in-from-top-1 mb-4">
            <span>Ticket updates are pending. Write a mandatory remark below and click <strong>"Commit Updates & Save Remark"</strong> to save.</span>
            <button onClick={cancelChanges} className="text-xs text-amber-500/60 hover:text-amber-500 font-bold px-2 underline hover:no-underline">Cancel Change</button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Ticket Remarks <span className="text-red-500">*</span></label>
          
          {/* Quick Actions */}
          {canEditFields && (
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => {
                  const inProgressStatus = states.find((s: any) => s.name.includes("Progress") || s.name.includes("Doing"));
                  if (inProgressStatus) {
                    handleFieldUpdate({ status_id: inProgressStatus.id, assignee_id: currentUserId });
                    setUpdateRemark("Acknowledged and actively investigating.");
                  }
                }}
                className="text-[10px] font-bold px-2 py-1 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors border border-blue-500/20"
              >
                Acknowledge
              </button>
              <button 
                type="button"
                onClick={() => {
                  const resolvedStatus = states.find((s: any) => s.name.includes("Resolv") || s.code === "ST_RESOLVED");
                  if (resolvedStatus) {
                    handleFieldUpdate({ status_id: resolvedStatus.id });
                    setUpdateRemark("Issue has been resolved successfully.");
                  }
                }}
                className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
              >
                Mark Resolved
              </button>
            </div>
          )}
        </div>
        <textarea
          value={updateRemark}
          onChange={e => setUpdateRemark(e.target.value)}
          disabled={!canEditFields}
          className={`w-full min-h-[64px] p-2 rounded-md text-[13px] border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors bg-background border-border text-foreground ${!canEditFields ? 'opacity-50 cursor-not-allowed' : ''}`}
          placeholder={!canEditFields ? "Ticket is frozen/read-only." : "Add update notes or operational remarks..."}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-gray-500">Last updated: {ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : "Not yet"}</span>
          {canEditFields && (
            <AppButton type="button" variant="primary" size="sm" onClick={commitChanges} disabled={isSaving || (Object.keys(pendingChanges).length > 0 && !updateRemark.trim())}>
              {isSaving ? "Saving..." : (Object.keys(pendingChanges).length > 0) ? "Commit Updates & Save Remark" : "Save Remarks"}
            </AppButton>
          )}
        </div>

        {/* Remarks History Queue */}
        <div className="mt-3 rounded-md border p-3 transition-all duration-150 bg-surface border-border text-foreground">
          {/* Header with toggle */}
          <div 
            onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)} 
            className="flex items-center justify-between cursor-pointer select-none group"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider transition-colors text-muted-foreground group-hover:text-blue-500">
                Remarks History Queue
              </span>
              {remarksHistory.length > 0 && (
                <span className="text-xs py-0.5 px-2 font-extrabold rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  {remarksHistory.length}
                </span>
              )}
            </div>
            
            <button 
              type="button"
              className="p-1 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground"
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
              {loadingRemarksHistory ? (
                <div className="flex items-center justify-center py-6 gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                  <span className="text-xs text-muted-foreground">Loading history queue...</span>
                </div>
              ) : remarksHistory.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground italic">
                  No remark history entries. Create a new remark above to start the queue.
                </div>
              ) : (
                <div className="relative pl-4 border-l border-purple-500/20 space-y-5">
                  {remarksHistory.map((item: any) => {
                    const initials = (item.author?.full_name || item.user?.full_name || "Unknown")
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);
                    
                    return (
                      <div key={item.id} className="relative group/item">
                        {/* Timeline Node Point */}
                        <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-purple-500 border-2 border-background group-hover/item:scale-125 transition-transform" />
                        
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
                              <span className="text-xs font-bold transition-colors text-foreground group-hover/item:text-purple-500">
                                {item.author?.full_name || item.user?.full_name || "System Actor"}
                              </span>
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                                <Clock className="h-3 w-3" />
                                <span>{new Date(item.created_at).toLocaleString()}</span>
                              </div>
                            </div>
                            
                            <div 
                              className="text-xs rounded-lg p-2.5 leading-relaxed break-words whitespace-pre-wrap border bg-background/50 border-border text-foreground"
                              dangerouslySetInnerHTML={{
                                __html: (item.content || "")
                                  .replace(/[&<>'"]/g, (tag: string) => (({'&': '&amp;','<': '&lt;','>': '&gt;',"'": '&#39;','"': '&quot;'} as any)[tag] || tag))
                                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                              }}
                            />
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

    </div>
  );
}