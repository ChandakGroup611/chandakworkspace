"use client";

import React, { useState, useEffect } from "react";
import { 
  Clock, Users, Save, Paperclip, CheckCircle2, Video
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { fetchAssignees } from "@/lib/actions/users";
import { updateTicketDetails } from "@/lib/actions/tickets";
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

  const canEditFields = roleCode === "SUPER_ADMIN" || hasPermission("TICKETS_UPDATE");

  useEffect(() => {
    async function loadInitialData() {
      if (!ticket?.dbId) return;
      const activeAssignees = await fetchAssignees();
      setAssigneesList(activeAssignees);
    }
    loadInitialData();
  }, [ticket]);

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
    executeFieldUpdate(fields);
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
                  <div className="text-xs font-semibold text-foreground">
                    {ticket.due_date ? new Date(ticket.due_date).toLocaleDateString() : "Not Set"}
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
          
        </div>
        
        {/* RIGHT COLUMN */}
        <div className="space-y-6">
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
                  value={ticket.assignee_id || ""}
                  onChange={(e) => handleFieldUpdate({ assignee_id: e.target.value })}
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
                  {states.map(s => (
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
          
          {/* Attachments Section */}
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
      </div>
    </div>
  );
}
