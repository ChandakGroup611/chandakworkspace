"use client";

import React, { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Plus, X, Activity, Paperclip, LayoutTemplate, CalendarDays, Users, LayoutList, AlignLeft } from "lucide-react";
import { fetchCustomFields, createCustomField } from "@/lib/actions/tasks";
import { fetchPriorities, fetchTasksByWorkspace, fetchStatusesByScope } from "@/lib/actions/workspaces";
import { EnterpriseWizardShell } from "@/components/ui/enterprise/EnterpriseWizardShell";
import WorkloadAnalyzer from "@/components/dashboard/WorkloadAnalyzer";
import TemplateManager from "@/components/tasks/TemplateManager";

export default function TaskCreationWizard({ workspaceId, initialParentTaskId, initialTaskName, onClose, onSuccess }: { workspaceId: string, initialParentTaskId?: string, initialTaskName?: string, onClose: () => void, onSuccess: (data: any) => void }) {
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance"].includes(theme);

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
  const [stakeholders, setStakeholders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [sprintId, setSprintId] = useState("");
  const [sprints, setSprints] = useState<any[]>([]);
  
  const [templateId, setTemplateId] = useState("");
  const [templates, setTemplates] = useState<any[]>([]);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);

  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [attachments, setAttachments] = useState<any[]>([]);
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentSizeKb, setAttachmentSizeKb] = useState("");

  useEffect(() => {
    async function initData() {
      // Use dynamic import for fetchWorkspaceStakeholders to avoid circular dependency in UI
      const m = await import("@/lib/actions/workspaces");
      const [fields, priorityList, existingTasks, statusList, workspaceStakeholders, sprintList, templateList] = await Promise.all([
        fetchCustomFields(workspaceId),
        fetchPriorities('e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3'),
        fetchTasksByWorkspace(workspaceId),
        fetchStatusesByScope('TASK', 'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3'),
        m.fetchWorkspaceStakeholders(workspaceId),
        m.fetchSprints(workspaceId),
        m.fetchTaskTemplates(workspaceId)
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
      setStakeholders(workspaceStakeholders);
      setSprints(sprintList.filter((s: any) => s.status !== 'CLOSED'));
      setTemplates(templateList);
    }
    initData();
  }, [workspaceId]);

  // Handle Template Selection
  useEffect(() => {
    if (templateId && templates.length > 0) {
      const tmpl = templates.find(t => t.id === templateId);
      if (tmpl) {
        setTitle(tmpl.subject || "");
        setDescription(tmpl.description || "");
        if (tmpl.default_priority_id) setPriorityId(tmpl.default_priority_id);
        if (tmpl.default_tags && Array.isArray(tmpl.default_tags)) setTags(tmpl.default_tags);
      }
    }
  }, [templateId, templates]);

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
    
    // Auto-assign remaining workspace members as Watchers (Team)
    stakeholders.forEach(s => {
      if (!assignees.includes(s.id)) {
        participants.push({ user_id: s.id, participation_role: 'WATCHER' });
      }
    });

    try {
      setIsLoading(true);
      await onSuccess({
        title,
        description,
        status_id: statusId,
        priority_id: priorityId,
        start_date: startDate,
        end_date: endDate,
        parent_task_id: parentTaskId || null,
        sprint_id: sprintId || null,
        template_id: templateId || null,
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
          <AppButton variant="primary" onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700" disabled={isLoading}>
            {isLoading ? "Deploying..." : "Deploy Directive"}
          </AppButton>
        </div>
      }
    >
        {isTemplateManagerOpen && (
          <TemplateManager 
            workspaceId={workspaceId} 
            onClose={() => {
              setIsTemplateManagerOpen(false);
              // Refresh templates
              import("@/lib/actions/workspaces").then(m => {
                m.fetchTaskTemplates(workspaceId).then(setTemplates);
              });
            }} 
          />
        )}
        <div className="space-y-6">
          
          {/* Section 1: Core Details */}
          <div className={`p-5 rounded-2xl border ${"bg-surface border-border shadow-[var(--shadow-ambient)]"}`}>
            <div className="flex items-center gap-2 mb-4 justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${isLightMode ? "bg-purple-100 text-purple-600" : "bg-purple-500/20 text-purple-400"}`}>
                  <LayoutTemplate className="h-4 w-4" />
                </div>
                <h3 className={`text-sm font-bold tracking-wide ${"text-foreground"}`}>Core Details</h3>
              </div>
              
              <div className="flex items-center gap-2">
                <select
                  className={`p-1.5 rounded-lg text-xs border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer ${
                    isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-black/30 border-white/10 text-white"
                  }`}
                  value={templateId}
                  onChange={e => setTemplateId(e.target.value)}
                >
                  <option value="">-- Apply a Task Template --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.template_name}</option>
                  ))}
                </select>
                <AppButton variant="ghost" className="p-1.5 h-auto text-xs" onClick={() => setIsTemplateManagerOpen(true)}>
                  Manage Templates
                </AppButton>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Task Title *</label>
                <AppInput placeholder="e.g. Audit API Endpoints" value={title} onChange={e => setTitle(e.target.value)} required className={"bg-surface"} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Task Code</label>
                <AppInput disabled placeholder="[Auto-Generated]" value="[Auto-Generated]" className={isLightMode ? "bg-gray-50" : "bg-white/5"} />
              </div>
            </div>
            
            <div className="mt-5 space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">External Link (Optional)</label>
              <AppInput placeholder="https://..." value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className={"bg-surface"} />
            </div>
          </div>

          {/* Section 2: Timeline & Priority */}
          <div className={`p-5 rounded-2xl border ${"bg-surface border-border shadow-[var(--shadow-ambient)]"}`}>
            <div className="flex items-center gap-2 mb-4">
              <div className={`p-1.5 rounded-lg ${isLightMode ? "bg-indigo-100 text-indigo-600" : "bg-indigo-500/20 text-indigo-400"}`}>
                <CalendarDays className="h-4 w-4" />
              </div>
              <h3 className={`text-sm font-bold tracking-wide ${"text-foreground"}`}>Timeline & Classification</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-5 mb-5">
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
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Task Priority</label>
                <select
                  className={`w-full p-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer ${
                    isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-black/30 border-white/10 text-white"
                  }`}
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
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Task Status</label>
                <select
                  className={`w-full p-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer ${
                    isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-black/30 border-white/10 text-white"
                  }`}
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
            <div className="grid grid-cols-2 gap-5 mt-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Parent Task Link</label>
                <select
                  className={`w-full p-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-black/30 border-white/10 text-white"
                  }`}
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
                  className={`w-full p-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer ${
                    isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-black/30 border-white/10 text-white"
                  }`}
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
          </div>

          {/* Section 3: Assignment & Execution */}
          <div className={`p-5 rounded-2xl border ${"bg-surface border-border shadow-[var(--shadow-ambient)]"}`}>
            <div className="flex items-center gap-2 mb-4">
              <div className={`p-1.5 rounded-lg ${isLightMode ? "bg-emerald-100 text-emerald-600" : "bg-emerald-500/20 text-emerald-400"}`}>
                <Users className="h-4 w-4" />
              </div>
              <h3 className={`text-sm font-bold tracking-wide ${"text-foreground"}`}>Assignment & Execution</h3>
            </div>
            
            <div className="space-y-1.5 mb-5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assignees (Task Owners) *</label>
                <button type="button" onClick={() => {
                  if (assignees.length === stakeholders.length && stakeholders.length > 0) setAssignees([]);
                  else setAssignees(stakeholders.map(s => s.id));
                }} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider">
                  {assignees.length === stakeholders.length && stakeholders.length > 0 ? "Clear All" : "Select All"}
                </button>
              </div>
              <div className={`p-2 rounded-xl border max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent ${isLightMode ? "bg-white border-gray-200" : "bg-black/30 border-white/10"}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {stakeholders.map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-2 rounded-md transition-colors">
                      <input type="checkbox" className="accent-emerald-500 h-4 w-4" checked={assignees.includes(s.id)} onChange={e => {
                        if (e.target.checked) setAssignees([...assignees, s.id]);
                        else setAssignees(assignees.filter(id => id !== s.id));
                      }} />
                      <span className="truncate font-medium">{s.full_name} <span className="text-gray-400 font-normal ml-1">({s.workspace_role})</span></span>
                    </label>
                  ))}
                  {stakeholders.length === 0 && <span className="text-xs text-gray-500 p-2">No users available in this workspace.</span>}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <AlignLeft className="h-3 w-3" /> Execution Notes (Rich Text) <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed execution instructions, context, or constraints..."
                className={`w-full min-h-[120px] p-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors resize-y ${
                  isLightMode 
                    ? "bg-[#f8fafc] border-[#e2e8f0] text-gray-900" 
                    : "bg-white/[0.05] border-white/10 text-white placeholder-gray-500"
                }`}
              />
            </div>
            
            <div className="space-y-1.5 mt-5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                Tags & Labels
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag, idx) => (
                  <span key={idx} className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${isLightMode ? "bg-purple-100 text-purple-700" : "bg-purple-500/20 text-purple-400"}`}>
                    {tag}
                    <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-rose-500"><X className="h-3 w-3" /></button>
                  </span>
                ))}
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
                  placeholder="Type a tag (e.g. Bug, Frontend) and press Enter..." 
                  className={`h-9 flex-1 ${"bg-surface"}`}
                />
                <AppButton type="button" variant="primary" className="h-9 px-3 shrink-0 bg-purple-600 hover:bg-purple-700 text-white border-0" onClick={() => {
                  if (newTag.trim() && !tags.includes(newTag.trim())) {
                    setTags([...tags, newTag.trim()]);
                    setNewTag("");
                  }
                }}>Add Tag</AppButton>
              </div>
            </div>
          </div>

          {/* Section 4: Tasks & Assets */}
          <div className={`p-5 rounded-2xl border ${"bg-surface border-border shadow-[var(--shadow-ambient)]"}`}>
            <div className="flex items-center gap-2 mb-6">
              <div className={`p-1.5 rounded-lg ${isLightMode ? "bg-blue-100 text-blue-600" : "bg-blue-500/20 text-blue-400"}`}>
                <LayoutList className="h-4 w-4" />
              </div>
              <h3 className={`text-sm font-bold tracking-wide ${"text-foreground"}`}>Tasks & Assets</h3>
            </div>

            {/* Checklist */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className={`text-[11px] font-bold uppercase tracking-wider ${"text-foreground"}`}>Action Items</h4>
                <span className="text-[10px] font-medium text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">{checklistItems.length} items</span>
              </div>
              
              <div className="flex gap-2 items-start mb-3">
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
                    placeholder="Type an actionable step and press Enter..." 
                    className={`h-10 ${"bg-surface"}`}
                  />
                </div>
                <AppButton type="button" variant="primary" className="h-10 px-4 shrink-0 bg-blue-600 hover:bg-blue-700 text-white border-0" onClick={() => {
                  if (!newChecklistItem.trim()) return;
                  setChecklistItems([...checklistItems, newChecklistItem.trim()]);
                  setNewChecklistItem("");
                }}>Add</AppButton>
              </div>

              <div className="space-y-2">
                {checklistItems.map((item, index) => (
                  <div key={`${item}-${index}`} className={`group flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${isLightMode ? "border-gray-200 bg-white hover:border-blue-300 shadow-sm" : "border-white/10 bg-black/20 hover:border-blue-500/50"}`}>
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                      <div className={`shrink-0 h-4 w-4 rounded border flex items-center justify-center ${isLightMode ? "border-gray-300 bg-gray-50" : "border-gray-600 bg-black/40"}`} />
                      <span className={`text-sm truncate ${"text-foreground"}`}>{item}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setChecklistItems(checklistItems.filter((_, i) => i !== index))}
                      className="shrink-0 p-1.5 rounded-md opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-500/10 transition-all"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {checklistItems.length === 0 && (
                  <div className={`rounded-xl border border-dashed p-6 text-[11px] font-medium text-center flex flex-col items-center justify-center gap-2 ${isLightMode ? "border-gray-300 text-gray-500 bg-gray-50" : "border-white/10 text-gray-500"}`}>
                    <LayoutList className="h-6 w-6 text-gray-400 opacity-50" />
                    <span>No action items defined. Break down the work into smaller steps.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Attachments */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className={`text-[11px] font-bold uppercase tracking-wider ${"text-foreground"}`}>Attachments</h4>
                <span className="text-[10px] font-medium text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">{attachments.length} files</span>
              </div>
              
              <div className="mb-3">
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
                  className={`flex items-center justify-center gap-2 w-full py-4 rounded-xl text-sm font-bold border border-dashed cursor-pointer transition-all ${
                    isLightMode 
                      ? "bg-gray-50/50 border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-blue-400 hover:text-blue-600" 
                      : "bg-black/20 border-white/10 text-gray-400 hover:bg-black/40 hover:border-blue-500/50 hover:text-blue-400"
                  }`}
                >
                  <Paperclip className="h-4 w-4" />
                  <span>Click to Browse & Attach Files</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachments.map((item, index) => (
                  <div key={`${item.file_url}-${index}`} className={`group flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${isLightMode ? "border-gray-200 bg-white hover:border-blue-300 shadow-sm" : "border-white/10 bg-black/20 hover:border-blue-500/50"}`}>
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                      <div className={`shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${isLightMode ? "bg-blue-100 text-blue-700" : "bg-blue-500/20 text-blue-400"}`}>
                        {item.file_type.substring(0,3).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={`text-xs font-semibold truncate ${"text-foreground"}`}>{item.file_name}</span>
                        <span className="text-[10px] text-gray-500">{item.size ? `${(item.size / 1024).toFixed(1)} KB` : "Unknown size"}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                      className="shrink-0 p-1.5 rounded-md opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-500/10 transition-all"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 5: Extended Properties */}
          <div className={`p-5 rounded-2xl border ${"bg-surface border-border shadow-[var(--shadow-ambient)]"}`}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${isLightMode ? "bg-amber-100 text-amber-600" : "bg-amber-500/20 text-amber-400"}`}>
                  <Activity className="h-4 w-4" />
                </div>
                <h3 className={`text-sm font-bold tracking-wide ${"text-foreground"}`}>Extended Properties</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsAddingField(!isAddingField)}
                className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${isLightMode ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"}`}
              >
                <Plus className="h-3 w-3" /> New Field
              </button>
            </div>

            {isAddingField && (
              <div className={`p-4 rounded-xl border mb-5 flex flex-col sm:flex-row items-end gap-3 ${isLightMode ? "bg-amber-50/50 border-amber-200" : "bg-amber-500/[0.05] border-amber-500/20"}`}>
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
                    className={`w-full h-10 px-3 rounded-xl text-sm border focus:outline-none cursor-pointer ${isLightMode ? "bg-white border-gray-200" : "bg-black/30 border-white/10 text-white"}`}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
              {customFields.length === 0 && !isAddingField && (
                <div className="col-span-1 sm:col-span-2 py-4 text-center text-[11px] font-medium text-gray-500">
                  No extended properties configured for this task.
                </div>
              )}
            </div>
          </div>

        </div>


    </EnterpriseWizardShell>
  );
}
