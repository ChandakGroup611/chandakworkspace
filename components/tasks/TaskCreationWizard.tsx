"use client";

import React, { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Plus, X, Activity, Paperclip, LayoutTemplate, CalendarDays, Users, LayoutList, AlignLeft, Search } from "lucide-react";
import { fetchCustomFields, createCustomField, getDepartments } from "@/lib/actions/tasks";
import { fetchPriorities, fetchTasksByWorkspace, fetchStatusesByScope } from "@/lib/actions/workspaces";
import { EnterpriseWizardShell } from "@/components/ui/enterprise/EnterpriseWizardShell";
import WorkloadAnalyzer from "@/components/dashboard/WorkloadAnalyzer";
import TemplateManager from "@/components/tasks/TemplateManager";

export default function TaskCreationWizard({ workspaceId, initialParentTaskId, initialTaskName, initialAttachments, onClose, onSuccess }: { workspaceId: string, initialParentTaskId?: string, initialTaskName?: string, initialAttachments?: any[], onClose: () => void, onSuccess: (data: any) => void }) {
  const { theme } = useTheme();
  const isLightMode = ["light-neumorphic", "glassmorphism", "pure-white"].includes(theme);

  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [title, setTitle] = useState(initialTaskName || "");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");

  const localTodayString = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];



  const [priorityId, setPriorityId] = useState("");
  const [priorities, setPriorities] = useState<any[]>([]);
  const [statusId, setStatusId] = useState("");
  const [statuses, setStatuses] = useState<any[]>([]);
    const [parentTaskId, setParentTaskId] = useState(initialParentTaskId || "");
  const [workspaceTasks, setWorkspaceTasks] = useState<any[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [assigneeSearchTerm, setAssigneeSearchTerm] = useState("");
  const [watchers, setWatchers] = useState<string[]>([]);
  const [watcherSearchTerm, setWatcherSearchTerm] = useState("");
  const [stakeholders, setStakeholders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [sprintId, setSprintId] = useState("");
  const [sprints, setSprints] = useState<any[]>([]);
  
  
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [attachments, setAttachments] = useState<any[]>(initialAttachments || []);
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentSizeKb, setAttachmentSizeKb] = useState("");

  useEffect(() => {
    async function initData() {
      const m = await import("@/lib/actions/workspaces");
      const { getDepartments } = await import("@/lib/actions/tasks");
      const [fields, priorityList, existingTasks, statusList, workspaceStakeholders, sprintList, templateList, deptList] = await Promise.all([
        fetchCustomFields(workspaceId),
        fetchPriorities('e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3'),
        fetchTasksByWorkspace(workspaceId),
        fetchStatusesByScope('TASK', 'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3'),
        m.fetchWorkspaceStakeholders(workspaceId),
        m.fetchSprints(workspaceId),
        m.fetchTaskTemplates(workspaceId),
        getDepartments()
      ]);
      setCustomFields(fields);
      setPriorities(priorityList);
      if (priorityList.length > 0) {
        // Find default priority from master (if configured) or fallback to the first available
        const defaultPrio = priorityList.find((p: any) => p.is_default === true) || priorityList[0];
        setPriorityId(defaultPrio.id);
      }
      setWorkspaceTasks(existingTasks);
      setStatuses(statusList);
      setDepartments(deptList || []);
      setStakeholders(workspaceStakeholders);
      setSprints(sprintList.filter((s: any) => s.status !== 'CLOSED'));
      setDepartments(deptList || []);
    }
    initData();
  }, [workspaceId]);

  useEffect(() => {
    if (assignees.length > 0) {
      // Auto-select all non-assignees as watchers whenever assignees change
      const remainingIds = stakeholders.map(s => s.id).filter(id => !assignees.includes(id));
      setWatchers(remainingIds);
    } else {
      setWatchers([]);
    }
  }, [assignees, stakeholders]);

  // Auto-assignment of Watchers logic is handled at submission time.

  const handleAddField = async () => {
    if (!newFieldName) return;
    try {
      const field = await createCustomField(workspaceId, newFieldName, newFieldType);
      setCustomFields([...customFields, field]);
      setIsAddingField(false);
      setNewFieldName("");
    } catch (e: any) {
      console.error("[TaskCreationWizard] Error:", e);
      alert("Database Error on Custom Field Creation: " + (e.message || e.details || JSON.stringify(e)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!description.trim()) {
      alert("Execution Notes (Remark) is mandatory.");
      return;
    }

    if (!startDate || !endDate) {
      alert("Start Date and Target Due Date are mandatory.");
      return;
    }

    if (startDate && startDate < localTodayString) {
      alert("Start Date cannot be less than the creation date (today).");
      return;
    }

    if (startDate && endDate && endDate < startDate) {
      alert("Target Due Date cannot be earlier than the start date.");
      return;
    }

    if (assignees.length === 0) {
      alert("You must explicitly select at least one Assignee for this task.");
      return;
    }

    if (!priorityId) {
      alert("You must select a Priority for this task.");
      return;
    }
    
    // Prepare multi-assignee execution team
    const participants: any[] = [];
    assignees.forEach(id => participants.push({ user_id: id, participation_role: 'EXECUTOR' }));
    
    // Add explicitly selected watchers
    watchers.forEach(id => {
      if (!assignees.includes(id)) { // Prevent duplicates if selected in both
        participants.push({ user_id: id, participation_role: 'WATCHER' });
      }
    });

    try {
      setIsLoading(true);
      await onSuccess({
        title,
        description,
        status_id: statusId,
        priority_id: priorityId,
        department_id: departmentId || null,
        start_date: startDate,
        end_date: endDate,
        parent_task_id: parentTaskId || null,
        sprint_id: sprintId || null,
        assigned_to: assignees[0] || null,
        participants,
        custom_fields: { ...fieldValues, tags, link_url: linkUrl || null },
        checklist_items: checklistItems,
        attachments: attachments.map(att => ({
          file_name: att.file_name,
          file_url: att.file_url,
          file_type: att.file_type,
          size: att.size
        }))
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <EnterpriseWizardShell
      title={initialParentTaskId ? "Initialize Sub-Task" : "Initialize Enterprise Task"}
      subtitle="Configure task details, assignments, and requirements."
      onClose={onClose}
      size="lg"
      headerAccent="purple"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <AppButton variant="ghost" type="button" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="primary" onClick={handleSubmit} className="bg-accent hover:bg-accent-secondary" disabled={isLoading}>
            {isLoading ? "Deploying..." : "Deploy Directive"}
          </AppButton>
        </div>
      }
    >

        <div className="space-y-2">
          
          {/* Section 1: Core Details */}
          <div className={`w-full p-4 rounded-xl mb-2 theme-card-structural flex flex-col gap-2`}>
            <div className="flex items-center gap-2 mb-1.5 justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg bg-accent/10 text-accent`}>
                  <LayoutTemplate className="h-4 w-4" />
                </div>
                <h3 className={`text-sm font-bold tracking-wide ${"text-foreground"}`}>Core Details</h3>
              </div>

            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Task Title *</label>
                <AppInput placeholder="e.g. Audit API Endpoints" value={title} onChange={e => setTitle(e.target.value)} required className={"bg-surface"} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Task Code</label>
                <AppInput disabled placeholder="[Auto-Generated]" value="[Auto-Generated]" className={"bg-elevated"} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Parent Task Link</label>
                <select
                  className={`w-full p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${ "theme-card-structural text-foreground" }`}
                  value={parentTaskId}
                  onChange={e => setParentTaskId(e.target.value)}
                  disabled={!!initialParentTaskId}
                >
                  <option value="">-- No Parent (Independent) --</option>
                  {workspaceTasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title || t.subject}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assign to Sprint</label>
                <select
                  className={`w-full p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-colors cursor-pointer ${ "theme-card-structural text-foreground" }`}
                  value={sprintId}
                  onChange={e => setSprintId(e.target.value)}
                >
                  <option value="">-- Backlog (No Sprint) --</option>
                  {sprints.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <AlignLeft className="h-3 w-3" /> Execution Notes (Rich Text) <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed execution instructions, context, or constraints..."
                className={`w-full min-h-[120px] p-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-colors resize-y ${
                  "bg-[#f8fafc] border-[#e2e8f0] text-foreground"
                }`}
              />
            </div>
            </div>
            

          </div>

          {/* Section 2: Timeline & Priority */}
          <div className={`w-full p-4 rounded-xl mb-2 theme-card-structural flex flex-col gap-2`}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`p-1.5 rounded-lg bg-accent/10 text-accent`}>
                <CalendarDays className="h-4 w-4" />
              </div>
              <h3 className={`text-sm font-bold tracking-wide ${"text-foreground"}`}>Timeline & Classification</h3>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date <span className="text-red-500">*</span></label>
                <AppInput 
                  type="date" 
                  min={localTodayString} 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                  className={"bg-surface"} 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Due Date <span className="text-red-500">*</span></label>
                <AppInput 
                  type="date" 
                  min={startDate || localTodayString} 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                  className={"bg-surface"} 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">External Link (Optional)</label>
                <AppInput placeholder="https://..." value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className={"bg-surface"} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Task Priority</label>
                <select
                  className={`w-full p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-colors cursor-pointer ${ "theme-card-structural text-foreground" }`}
                  value={priorityId}
                  onChange={e => setPriorityId(e.target.value)}
                >
                  <option value="">-- Select Priority --</option>
                  {priorities.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Department</label>
                <select
                  className={`w-full p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-colors cursor-pointer ${ "theme-card-structural text-foreground" }`}
                  value={departmentId}
                  onChange={e => setDepartmentId(e.target.value)}
                >
                  <option value="">-- No Department --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Task Status</label>
                <select
                  className={`w-full p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-colors cursor-pointer ${ "theme-card-structural text-foreground" }`}
                  value={statusId}
                  onChange={e => setStatusId(e.target.value)}
                >
                  <option value="">-- Default Status --</option>
                  {statuses.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* Section 3: Assignment & Execution */}
          <div className={`w-full p-4 rounded-xl mb-1 theme-card-structural flex flex-col gap-2`}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`p-1.5 rounded-lg bg-emerald-100 text-emerald-600`}>
                <Users className="h-4 w-4" />
              </div>
              <h3 className={`text-sm font-bold tracking-wide ${"text-foreground"}`}>Assignment & Execution</h3>
            </div>
            
            <div className="space-y-1.5 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assignees (Task Owners) *</label>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors theme-card-structural focus-within:border-emerald-500`}>
                    <Search className="h-3 w-3 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search users..." 
                      className={`bg-transparent text-[11px] focus:outline-none w-32 text-foreground placeholder:text-gray-400`}
                      value={assigneeSearchTerm}
                      onChange={e => setAssigneeSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <AppButton variant="secondary" type="button" onClick={() => {
                  if (assignees.length === stakeholders.length && stakeholders.length > 0) setAssignees([]);
                  else setAssignees(stakeholders.map(s => s.id));
                }} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider">
                  {assignees.length === stakeholders.length && stakeholders.length > 0 ? "Clear All" : "Select All"}
                </AppButton>
              </div>
              <div className={`p-2 rounded-xl max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent theme-card-structural`}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                  {stakeholders.filter(s => s.full_name?.toLowerCase().includes(assigneeSearchTerm.toLowerCase())).map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-black/5 dark:hover:bg-surface/5 p-2 rounded-md transition-colors">
                      <input type="checkbox" className="accent-emerald-500 h-4 w-4" checked={assignees.includes(s.id)} onChange={e => {
                        if (e.target.checked) setAssignees([...assignees, s.id]);
                        else setAssignees(assignees.filter(id => id !== s.id));
                      }} />
                      <span className="truncate font-medium">{s.full_name}</span>
                    </label>
                  ))}
                  {stakeholders.length === 0 && <span className="text-xs text-gray-500 p-2">No users available in this workspace.</span>}
                </div>
              </div>
            </div>
            
            <div className="space-y-1.5 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Watchers (Observers)</label>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors theme-card-structural focus-within:border-emerald-500`}>
                    <Search className="h-3 w-3 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search users..." 
                      className={`bg-transparent text-[11px] focus:outline-none w-32 text-foreground placeholder:text-gray-400`}
                      value={watcherSearchTerm}
                      onChange={e => setWatcherSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <AppButton variant="secondary" type="button" onClick={() => {
                  if (watchers.length === stakeholders.length && stakeholders.length > 0) setWatchers([]);
                  else setWatchers(stakeholders.map(s => s.id));
                }} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider">
                  {watchers.length === stakeholders.length && stakeholders.length > 0 ? "Clear All" : "Select All"}
                </AppButton>
              </div>
              <div className={`p-2 rounded-xl max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent theme-card-structural`}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                  {stakeholders
                    .filter(s => !assignees.includes(s.id))
                    .filter(s => s.full_name?.toLowerCase().includes(watcherSearchTerm.toLowerCase()))
                    .map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-black/5 dark:hover:bg-surface/5 p-2 rounded-md transition-colors">
                      <input type="checkbox" className="accent-emerald-500 h-4 w-4" checked={watchers.includes(s.id)} onChange={e => {
                        if (e.target.checked) setWatchers([...watchers, s.id]);
                        else setWatchers(watchers.filter(id => id !== s.id));
                      }} />
                      <span className="truncate font-medium">{s.full_name}</span>
                    </label>
                  ))}
                  {stakeholders.length === 0 && <span className="text-xs text-gray-500 p-2">No users available in this workspace.</span>}
                </div>
              </div>
            </div>


            
            {/* Tags & Labels moved to 2x2 grid */}
          </div>

          {/* 2x2 Grid for Tags, Checklist, Attachments, Extended Properties */}
          <div className={`w-full p-3 rounded-xl mb-1 theme-card-structural`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 w-full">
              {/* Top Left: Tags & Labels */}
              <div className="w-full flex flex-col gap-2">
                <div className="flex items-center h-7">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    Tags & Labels
                  </label>
                </div>
                <div className="flex gap-2 items-center">
                  <AppInput 
                    value={newTag} 
                    onChange={e => setNewTag(e.target.value)} 
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newTag.trim() && !tags.includes(newTag.trim())) {
                          setTags([...tags, newTag.trim()]);
                          setNewTag("");
                        }
                      }
                    }}
                    placeholder="Type a tag (e.g. Bug, Frontend)..." 
                    className={`h-10 flex-1 ${"bg-surface"}`}
                  />
                  <AppButton type="button" variant="primary" className="h-10 px-4 shrink-0 bg-accent hover:bg-accent-secondary text-white border-0" onClick={() => {
                    if (newTag.trim() && !tags.includes(newTag.trim())) {
                      setTags([...tags, newTag.trim()]);
                      setNewTag("");
                    }
                  }}>Add Tag</AppButton>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, idx) => (
                    <span key={idx} className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-accent/10 text-accent`}>
                      {tag}
                      <AppButton variant="secondary" type="button" onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-rose-500"><X className="h-3 w-3" /></AppButton>
                    </span>
                  ))}
                </div>
              </div>

              {/* Top Right: Checklist */}
              <div className="w-full flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg bg-accent/10 text-accent`}>
                      <LayoutList className="h-4 w-4" />
                    </div>
                    <h3 className={`text-sm font-bold tracking-wide ${"text-foreground"}`}>Checklist</h3>
                  </div>
                  <span className="text-[10px] font-medium text-gray-500 bg-gray-100 dark:bg-surface/5 px-2 py-0.5 rounded-full">{checklistItems.length} items</span>
                </div>
                
                <div className="flex gap-2 items-start">
                  <div className="flex-1">
                    <AppInput 
                      value={newChecklistItem} 
                      onChange={e => setNewChecklistItem(e.target.value)} 
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (!newChecklistItem.trim()) return;
                          setChecklistItems([...checklistItems, newChecklistItem.trim()]);
                          setNewChecklistItem("");
                        }
                      }}
                      placeholder="Type an actionable step..." 
                      className={`h-10 ${"bg-surface"}`}
                    />
                  </div>
                  <AppButton type="button" variant="primary" className="h-10 px-4 shrink-0 bg-accent hover:bg-accent-secondary text-white border-0" onClick={() => {
                    if (!newChecklistItem.trim()) return;
                    setChecklistItems([...checklistItems, newChecklistItem.trim()]);
                    setNewChecklistItem("");
                  }}>Add</AppButton>
                </div>

                <div className="space-y-2">
                  {checklistItems.map((item, index) => (
                    <div key={`${item}-${index}`} className={`group flex items-center justify-between gap-3 p-3 rounded-xl transition-all theme-card-structural hover:border-accent/30 shadow-[var(--shadow-ambient)]`}>
                      <div className="flex items-center gap-3 overflow-hidden flex-1">
                        <div className={`shrink-0 h-4 w-4 rounded border flex items-center justify-center border-border bg-gray-50`} />
                        <span className={`text-sm truncate ${"text-foreground"}`}>{item}</span>
                      </div>
                      <AppButton variant="secondary"
                        type="button"
                        onClick={() => setChecklistItems(checklistItems.filter((_, i) => i !== index))}
                        className="shrink-0 p-1.5 rounded-md opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-500/10 transition-all"
                      >
                        <X className="h-3.5 w-3.5" />
                      </AppButton>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Left: Attachments */}
              <div className="w-full flex flex-col gap-2">
                <div className="flex items-center justify-between w-full">
                  <h4 className={`text-[11px] font-bold uppercase tracking-wider ${"text-foreground"}`}>Attachments</h4>
                  
                  <div>
                    <input 
                      type="file" 
                      id="task-attachment" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const mockUrl = URL.createObjectURL(file);
                        const fileType = file.name.split('.').pop()?.trim().toLowerCase() || "unknown";
                        setAttachments([...attachments, {
                          file_name: file.name,
                          file_url: mockUrl,
                          file_type: fileType,
                          size: file.size
                        }]);
                        e.target.value = "";
                      }}
                    />
                    <label 
                      htmlFor="task-attachment"
                      className={`flex items-center justify-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border border-dashed cursor-pointer transition-all ${
                        "bg-gray-50/50 border-border text-muted hover:bg-gray-50 hover:border-accent hover:text-accent"
                      }`}
                    >
                      <Paperclip className="h-3 w-3" />
                      <span>Attach Files</span>
                    </label>
                  </div>

                  <span className="text-[10px] font-medium text-gray-500 bg-gray-100 dark:bg-surface/5 px-2 py-0.5 rounded-full">{attachments.length} files</span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {attachments.map((item, index) => (
                    <div key={`${item.file_url}-${index}`} className={`group flex items-center justify-between gap-3 p-3 rounded-xl transition-all theme-card-structural hover:border-accent/30 shadow-[var(--shadow-ambient)]`}>
                      <div className="flex items-center gap-3 overflow-hidden flex-1">
                        <div className={`shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold bg-accent/10 text-accent`}>
                          {item.file_type.substring(0,3).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={`text-xs font-semibold truncate ${"text-foreground"}`}>{item.file_name}</span>
                          <span className="text-[10px] text-gray-500">{item.size ? `${(item.size / 1024).toFixed(1)} KB` : "Unknown size"}</span>
                        </div>
                      </div>
                      <AppButton variant="secondary"
                        type="button"
                        onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                        className="shrink-0 p-1.5 rounded-md opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-500/10 transition-all"
                      >
                        <X className="h-3.5 w-3.5" />
                      </AppButton>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Right: Extended Properties */}
              <div className="w-full flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg bg-amber-100 text-amber-600`}>
                      <Activity className="h-4 w-4" />
                    </div>
                    <h3 className={`text-sm font-bold tracking-wide ${"text-foreground"}`}>Extended Properties</h3>
                  </div>
                  <AppButton variant="secondary" 
                    type="button" 
                    onClick={() => setIsAddingField(!isAddingField)}
                    className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-700 hover:bg-amber-200`}
                  >
                    <Plus className="h-3 w-3" /> New Field
                  </AppButton>
                </div>

                {isAddingField && (
                  <div className={`p-3 rounded-lg border flex flex-col sm:flex-row items-end gap-3 bg-amber-50/50 border-amber-200`}>
                    <div className="w-full sm:flex-1 space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Field Name</label>
                      <AppInput 
                        placeholder="e.g. Jira Ticket URL" 
                        value={newFieldName} 
                        onChange={e => setNewFieldName(e.target.value)} 
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddField();
                          }
                        }}
                        className={`h-10 ${"bg-surface"}`}
                      />
                    </div>
                    <div className="w-full sm:flex-1 space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Data Type</label>
                      <select 
                        className={`w-full h-10 px-3 rounded-xl text-sm focus:outline-none cursor-pointer theme-card-structural`}
                        value={newFieldType}
                        onChange={e => setNewFieldType(e.target.value)}
                      >
                        <option value="text">Text Input</option>
                        <option value="number">Numeric</option>
                        <option value="date">Date</option>
                      </select>
                    </div>
                    <AppButton type="button" variant="primary" onClick={handleAddField} className="w-full sm:w-auto h-10 bg-amber-600 hover:bg-amber-700 text-white border-0">Save Field</AppButton>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3">
                  {customFields.map(f => (
                    <div key={f.field_key} className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{f.field_name}</label>
                      <AppInput 
                        type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text'}
                        value={fieldValues[f.field_key] || ""} 
                        onChange={e => setFieldValues({...fieldValues, [f.field_key]: e.target.value})} 
                        className={"bg-surface"}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </div>

        


    </EnterpriseWizardShell>
  );
}

