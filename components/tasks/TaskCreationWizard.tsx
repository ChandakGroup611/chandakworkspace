"use client";

import React, { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Plus, X, Activity } from "lucide-react";
import { fetchCustomFields, createCustomField, fetchUsers } from "@/lib/actions/tasks";
import { fetchPriorities, fetchTasksByWorkspace } from "@/lib/actions/workspaces";
import WorkloadAnalyzer from "@/components/dashboard/WorkloadAnalyzer";

export default function TaskCreationWizard({ workspaceId, onClose, onSuccess }: { workspaceId: string, onClose: () => void, onSuccess: (data: any) => void }) {
  const { theme } = useTheme();
  const isLightMode = theme === "executive-light";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");

  const [showWorkload, setShowWorkload] = useState(false);

  const [priorityId, setPriorityId] = useState("");
  const [priorities, setPriorities] = useState<any[]>([]);
  const [parentTaskId, setParentTaskId] = useState("");
  const [workspaceTasks, setWorkspaceTasks] = useState<any[]>([]);

  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [attachments, setAttachments] = useState<any[]>([]);
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentSizeKb, setAttachmentSizeKb] = useState("");

  useEffect(() => {
    async function initData() {
      const [fields, userList, priorityList, existingTasks] = await Promise.all([
        fetchCustomFields(),
        fetchUsers(),
        fetchPriorities(),
        fetchTasksByWorkspace(workspaceId)
      ]);
      setCustomFields(fields);
      setUsers(userList);
      setPriorities(priorityList);
      setWorkspaceTasks(existingTasks);
    }
    initData();
  }, [workspaceId]);

  const handleAddField = async () => {
    if (!newFieldName) return;
    try {
      const field = await createCustomField(newFieldName, newFieldType);
      setCustomFields([...customFields, field]);
      setIsAddingField(false);
      setNewFieldName("");
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const explicitAssigneeIds = Array.from(new Set([
      ...assigneeIds,
      ...(assigneeId ? [assigneeId] : [])
    ].filter(Boolean)));

    onSuccess({
      title,
      description,
      start_date: startDate || null,
      end_date: endDate || null,
      assignee_id: assigneeId || null,
      assignee_ids: explicitAssigneeIds,
      priority_id: priorityId || null,
      parent_task_id: parentTaskId || null,
      custom_fields: fieldValues,
      checklist_items: checklistItems,
      attachments: attachments.map(att => ({
        file_name: att.file_name,
        file_url: att.file_url,
        file_type: att.file_type,
        size: att.size
      }))
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in-50">
      <AppCard className={`w-full max-w-2xl shadow-2xl border-t-4 ${isLightMode ? "border-t-purple-600 border-x-0 border-b-0 bg-white" : "border-t-purple-500 border-white/10 bg-[#0f111a]"}`}>
        
        <div className="p-6 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
          <h3 className={`text-lg font-bold ${isLightMode ? "text-gray-900" : "text-white"}`}>Initialize Enterprise Task</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto scrollbar-thin">
          
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Task Title *</label>
              <AppInput placeholder="e.g. Audit API Endpoints" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Task Code</label>
              <AppInput disabled placeholder="[Auto-Generated]" value="[Auto-Generated]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Start Date</label>
              <AppInput type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Target Due Date</label>
              <AppInput type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex justify-between items-center">
              <span>Primary Assignee</span>
              <button 
                type="button" 
                onClick={() => setShowWorkload(true)}
                className="text-purple-500 hover:text-purple-600 flex items-center gap-1"
              >
                <Activity className="h-3 w-3" /> Check Workload Capacity
              </button>
            </label>
            <select
              className={`w-full p-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
                isLightMode ? "bg-white border-gray-300 text-gray-900" : "bg-black/50 border-white/10 text-white"
              }`}
              value={assigneeId}
              onChange={e => setAssigneeId(e.target.value)}
            >
              <option value="">-- Select primary assignee --</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.user_code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Task Priority</label>
              <select
                className={`w-full p-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
                  isLightMode ? "bg-white border-gray-300 text-gray-900" : "bg-black/50 border-white/10 text-white"
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
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Assigned Corporate Team Members</label>
              <select
                multiple
                size={5}
                className={`w-full p-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
                  isLightMode ? "bg-white border-gray-300 text-gray-900" : "bg-black/50 border-white/10 text-white"
                }`}
                value={assigneeIds}
                onChange={e => setAssigneeIds(Array.from(e.target.selectedOptions, option => option.value))}
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.user_code})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-gray-500">Hold Ctrl/Cmd to select multiple users.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Parent Task Dependency (Hierarchy)</label>
            <select
              className={`w-full p-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
                isLightMode ? "bg-white border-gray-300 text-gray-900" : "bg-black/50 border-white/10 text-white"
              }`}
              value={parentTaskId}
              onChange={e => setParentTaskId(e.target.value)}
            >
              <option value="">-- None (Independent Task) --</option>
              {workspaceTasks.map(t => (
                <option key={t.id} value={t.id}>
                  {t.code} - {t.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Execution Notes</label>
            <textarea 
              className={`w-full h-24 p-3 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
                isLightMode ? "bg-white border-gray-300 text-gray-900" : "bg-black/50 border-white/10 text-white"
              }`}
              placeholder="Detailed execution instructions..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Dynamic Custom Fields Section */}
          <div className="pt-4 border-t border-gray-200 dark:border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? "text-gray-700" : "text-gray-300"}`}>Custom Properties</h4>
              <button 
                type="button" 
                onClick={() => setIsAddingField(!isAddingField)}
                className="p-1 rounded bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {isAddingField && (
              <div className={`p-4 rounded-xl border flex items-end gap-3 ${isLightMode ? "bg-gray-50 border-gray-200" : "bg-white/[0.02] border-white/10"}`}>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-gray-500">Field Name</label>
                  <AppInput placeholder="e.g. Jira Ticket URL" value={newFieldName} onChange={e => setNewFieldName(e.target.value)} />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-gray-500">Type</label>
                  <select 
                    className={`w-full p-2.5 rounded-xl text-sm border focus:outline-none ${isLightMode ? "bg-white border-gray-300" : "bg-black/50 border-white/10 text-white"}`}
                    value={newFieldType}
                    onChange={e => setNewFieldType(e.target.value)}
                  >
                    <option value="text">Text Input</option>
                    <option value="number">Numeric</option>
                    <option value="date">Date</option>
                  </select>
                </div>
                <AppButton type="button" variant="primary" onClick={handleAddField}>Save Field</AppButton>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {customFields.map(f => (
                <div key={f.field_key} className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{f.field_label}</label>
                  <AppInput 
                    type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text'}
                    value={fieldValues[f.field_key] || ""} 
                    onChange={e => setFieldValues({...fieldValues, [f.field_key]: e.target.value})} 
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-white/5 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? "text-gray-700" : "text-gray-300"}`}>Checklist</h4>
                <p className="text-[10px] text-gray-500">Add checklist items to the task.</p>
              </div>

              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-7 space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Checklist Item</label>
                  <AppInput value={newChecklistItem} onChange={e => setNewChecklistItem(e.target.value)} placeholder="e.g. Review deployment runbook" />
                </div>
                <div className="col-span-3 space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Type</label>
                  <div className="text-sm text-gray-500 p-2.5 rounded-xl bg-white/5 border border-white/10">Manual</div>
                </div>
                <div className="col-span-2">
                  <AppButton type="button" variant="primary" onClick={() => {
                    if (!newChecklistItem.trim()) return;
                    setChecklistItems([...checklistItems, newChecklistItem.trim()]);
                    setNewChecklistItem("");
                  }}>Add</AppButton>
                </div>
              </div>

              <div className="space-y-2">
                {checklistItems.map((item, index) => (
                  <div key={`${item}-${index}`} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/10 bg-white/5">
                    <span className="text-sm text-gray-200 truncate">{item}</span>
                    <button
                      type="button"
                      onClick={() => setChecklistItems(checklistItems.filter((_, i) => i !== index))}
                      className="text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {checklistItems.length === 0 && (
                  <div className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-gray-500">No checklist items added yet.</div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? "text-gray-700" : "text-gray-300"}`}>Attachments</h4>
                <p className="text-[10px] text-gray-500">Link files or docs for the task.</p>
              </div>

              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-4 space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">File Name</label>
                  <AppInput value={attachmentName} onChange={e => setAttachmentName(e.target.value)} placeholder="deployment_plan.pdf" />
                </div>
                <div className="col-span-5 space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">URL</label>
                  <AppInput type="url" value={attachmentUrl} onChange={e => setAttachmentUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Size (KB)</label>
                  <AppInput type="number" value={attachmentSizeKb} onChange={e => setAttachmentSizeKb(e.target.value)} placeholder="0" />
                </div>
                <div className="col-span-1">
                  <AppButton type="button" variant="primary" onClick={() => {
                    if (!attachmentName.trim() || !attachmentUrl.trim()) return;
                    const fileType = attachmentName.split('.').pop()?.trim().toLowerCase() || "unknown";
                    setAttachments([...attachments, {
                      file_name: attachmentName.trim(),
                      file_url: attachmentUrl.trim(),
                      file_type: fileType,
                      size: attachmentSizeKb ? Math.max(0, Math.round(Number(attachmentSizeKb) * 1024)) : 0
                    }] );
                    setAttachmentName("");
                    setAttachmentUrl("");
                    setAttachmentSizeKb("");
                  }}>Add</AppButton>
                </div>
              </div>

              <div className="space-y-2">
                {attachments.map((item, index) => (
                  <div key={`${item.file_url}-${index}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl border border-white/10 bg-white/5">
                    <div className="space-y-1 overflow-hidden">
                      <p className="text-sm font-semibold text-gray-100 truncate">{item.file_name}</p>
                      <p className="text-xs text-gray-400 truncate">{item.file_url}</p>
                      <p className="text-[11px] text-gray-500">{item.size ? `${(item.size / 1024).toFixed(1)} KB` : "Size not provided"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                      className="text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {attachments.length === 0 && (
                  <div className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-gray-500">No attachments added yet.</div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <AppButton variant="ghost" type="button" onClick={onClose}>Cancel</AppButton>
            <AppButton variant="primary" type="submit" className="bg-purple-600 hover:bg-purple-700">Deploy Directive</AppButton>
          </div>
        </form>

        {showWorkload && (
          <WorkloadAnalyzer userId={assigneeId} onClose={() => setShowWorkload(false)} />
        )}
      </AppCard>
    </div>
  );
}
