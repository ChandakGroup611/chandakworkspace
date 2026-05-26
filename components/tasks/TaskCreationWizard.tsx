"use client";

import React, { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Plus, X, Activity, Paperclip } from "lucide-react";
import { fetchCustomFields, createCustomField } from "@/lib/actions/tasks";
import { fetchPriorities, fetchTasksByWorkspace, fetchStatusesByScope } from "@/lib/actions/workspaces";
import { EnterpriseWizardShell } from "@/components/ui/enterprise/EnterpriseWizardShell";
import WorkloadAnalyzer from "@/components/dashboard/WorkloadAnalyzer";

export default function TaskCreationWizard({ workspaceId, onClose, onSuccess }: { workspaceId: string, onClose: () => void, onSuccess: (data: any) => void }) {
  const { theme } = useTheme();
  const isLightMode = theme === "executive-light";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");



  const [priorityId, setPriorityId] = useState("");
  const [priorities, setPriorities] = useState<any[]>([]);
  const [statusId, setStatusId] = useState("");
  const [statuses, setStatuses] = useState<any[]>([]);
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
      const [fields, priorityList, existingTasks, statusList] = await Promise.all([
        fetchCustomFields(workspaceId),
        fetchPriorities(),
        fetchTasksByWorkspace(workspaceId),
        fetchStatusesByScope('REQUIREMENT')
      ]);
      setCustomFields(fields);
      setPriorities(priorityList);
      setWorkspaceTasks(existingTasks);
      setStatuses(statusList);
    }
    initData();
  }, [workspaceId]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      alert("Due date cannot be earlier than the start date.");
      return;
    }

    onSuccess({
      title,
      description,
      start_date: startDate || null,
      end_date: endDate || null,
      priority_id: priorityId || null,
      status_id: statusId || null,
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
    <EnterpriseWizardShell
      title="Initialize Enterprise Task"
      subtitle="Configure task details, assignments, and requirements."
      onClose={onClose}
      size="lg"
      headerAccent="purple"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <AppButton variant="ghost" type="button" onClick={onClose}>Cancel</AppButton>
          <AppButton variant="primary" onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700">Deploy Directive</AppButton>
        </div>
      }
    >
        <form onSubmit={handleSubmit} className="space-y-5">
          
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
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Task Status</label>
              <select
                className={`w-full p-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
                  isLightMode ? "bg-white border-gray-300 text-gray-900" : "bg-black/50 border-white/10 text-white"
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
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{f.field_name}</label>
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

              <div className="flex items-center gap-4">
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
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border cursor-pointer transition-colors shadow-sm ${
                    isLightMode 
                      ? "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-indigo-600" 
                      : "bg-[#1e293b]/70 border-white/10 text-gray-300 hover:bg-[#1e293b] hover:text-indigo-400"
                  }`}
                >
                  <Paperclip className="h-4 w-4" />
                  <span>Attach File</span>
                </label>
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
        </form>


    </EnterpriseWizardShell>
  );
}
