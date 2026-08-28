"use client";

import React, { useState, useEffect } from "react";
import { AppTable } from "@/components/ui/AppTable";
import { AppButton } from '@/components/ui/AppButton';
import DOMPurify from 'dompurify';
import { Save, Loader2, Play, Plus, Trash2, Code2, Eye, LayoutTemplate, ArrowLeft, Edit2 } from "lucide-react";
import { saveSettingsEntity, deleteSettingsEntity, getTemplates, saveTemplateAndRules } from "@/lib/actions/settings";
import { previewEmailTemplate } from "@/lib/actions/email-config";

const RECIPIENT_OPTIONS = [
  "Creator",
  "Assigned User",
  "Executors",
  "Watchers",
  "Workspace Owner",
  "Department Admin",
  "Specific Approver",
  "Requester"
];

const MODULES = [
  "Task", 
  "Workspace", 
  "Ticket", 
  "Requirement", 
  "Approval",
  "AMC (Contracts)",
  "SLA Management",
  "IAM (Users/Roles)",
  "Knowledge Base",
  "Learning (Courses)",
  "System/Compliance",
  "Masters (Vendors/Companies)"
];

const EVENTS = [
  // General Lifecycle
  "Created", 
  "Updated", 
  "Deleted/Archived",
  "Transferred",
  
  // Assignment & Team
  "Assigned (Primary)", 
  "Reassigned",
  "Executors Changed",
  "Watchers Changed",
  
  // Status & Progress
  "Status Changed", 
  "Priority Changed",
  "Due Date Changed",
  "Delayed", 
  "Completed", 
  "Closed",
  "Reopened",
  
  // Collaboration
  "Comment Added",
  "Attachment Added",
  "Mentioned",
  "Checklist Updated",
  
  // Approvals & Governance
  "Approval Requested",
  "Approved",
  "Rejected",
  "Amended",
  
  // SLA Specific
  "SLA Warning",
  "SLA Breached",
  
  // AMC Specific
  "Payment Received",
  "Payment Overdue",
  "Contract Expiring",
  "Contract Renewed",
  
  // IAM / Identity Specific
  "User Onboarded",
  "Role Changed",
  "Password Reset Requested",
  
  // Learning / Knowledge
  "Course Assigned",
  "Course Completed",
  "Article Published"
];
const MERGE_TAGS = ["{{ticket_no}}", "{{ticket_title}}", "{{task_name}}", "{{workspace_name}}", "{{assigned_user}}", "{{creator_name}}", "{{status}}", "{{priority}}", "{{due_date}}", "{{link}}"];

export default function TemplateDesigner() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<{type: "success" | "error", text: string} | null>(null);
  
  // New Master-Detail state
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, "code" | "preview">>({});
  const [previewContent, setPreviewContent] = useState<Record<string, string>>({});

  const triggerToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await getTemplates();
      if (!res.success) throw new Error(res.error);
      setTemplates(res.data || []);
      
      const tabs: any = {};
      (res.data || []).forEach((t: any) => tabs[t.id] = "code");
      setActiveTab(tabs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTemplate = () => {
    const newId = "temp_" + Date.now();
    setTemplates(prev => [
      {
        id: newId,
        module: "Task",
        event: "Assigned",
        template_name: "Default Task Assignment",
        subject: "New Task Assigned: {{task_name}}",
        html_body: `<div style="font-family: sans-serif; padding: 20px;">\n  <h2>You have a new task</h2>\n  <p><strong>Task:</strong> {{task_name}}</p>\n  <p><strong>Status:</strong> {{status}}</p>\n  <p><strong>Assigned By:</strong> {{creator_name}}</p>\n  <br/>\n  <a href="{{link}}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Task</a>\n</div>`,
        is_active: true,
        is_new: true,
        recipient_types: []
      },
      ...prev
    ]);
    setActiveTab(prevTab => ({ ...prevTab, [newId]: "code" }));
    setEditingTemplateId(newId); // Instantly open editor
  };

  const updateLocal = (id: string, field: string, value: any) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleSave = async (template: any) => {
    try {
      const payload = {
        module: template.module,
        event: template.event,
        template_name: template.template_name,
        subject: template.subject,
        html_body: template.html_body,
        is_active: template.is_active,
        recipient_types: template.recipient_types || []
      };

      if (template.is_new) {
        const res = await saveTemplateAndRules(payload);
        if (!res.success) throw new Error(res.error);
        triggerToast("Template created successfully");
      } else {
        const res = await saveTemplateAndRules(payload, template.id);
        if (!res.success) throw new Error(res.error);
        triggerToast("Template updated successfully");
      }
      
      // Go back to list upon successful save
      setEditingTemplateId(null);
      await fetchTemplates();
    } catch (err: any) {
      triggerToast(err.message || "Failed to save template", "error");
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (id.startsWith("temp_")) {
      setTemplates(prev => prev.filter(t => t.id !== id));
      if (editingTemplateId === id) setEditingTemplateId(null);
      return;
    }
    if (!confirm("Delete this template?")) return;
    try {
      const res = await deleteSettingsEntity("email_templates", id, true, "/settings/communication/templates");
      if (!res.success) throw new Error(res.error);
      triggerToast("Template deleted");
      if (editingTemplateId === id) setEditingTemplateId(null);
      fetchTemplates();
    } catch (err: any) {
      triggerToast(err.message, "error");
    }
  };

  const handleTabSwitch = async (id: string, tab: "code" | "preview") => {
    setActiveTab(p => ({ ...p, [id]: tab }));
    if (tab === "preview") {
      const tpl = templates.find(t => t.id === id);
      if (tpl) {
        setPreviewContent(p => ({ ...p, [id]: "Loading preview with real data..." }));
        try {
          const html = await previewEmailTemplate(tpl.module, tpl.html_body);
          setPreviewContent(p => ({ ...p, [id]: html }));
        } catch (e) {
          setPreviewContent(p => ({ ...p, [id]: "Failed to render preview." }));
        }
      }
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-theme-icon" /></div>;

  // Active Template for Editor View
  const tpl = editingTemplateId ? templates.find(t => t.id === editingTemplateId) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Dynamic Header */}
      <div className="flex justify-between items-center bg-background border border-border p-4 rounded-xl shadow-lg">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            {editingTemplateId ? "Edit Template" : "Dynamic Template Designer"}
          </h2>
          <p className="text-xs text-muted">
            {editingTemplateId ? "Modify HTML and configuration." : "Construct HTML payloads with runtime merge tag hydration."}
          </p>
        </div>
        
        {editingTemplateId ? (
          <AppButton
            onClick={() => {
              // If it's a new unsaved template and we back out, we should probably remove it
              if (tpl?.is_new) {
                setTemplates(prev => prev.filter(t => t.id !== editingTemplateId));
              }
              setEditingTemplateId(null);
            }}
            className="flex items-center gap-2 theme-card-structural hover:/80 text-foreground px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back to List
          </AppButton>
        ) : (
          <AppButton
            onClick={handleAddTemplate}
            className="flex items-center gap-2 bg-theme-btn-primary hover:opacity-90/90 text-theme-btn-primary-text px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-theme-btn-primary/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Template
          </AppButton>
        )}
      </div>

      {/* View Router */}
      <div className="space-y-8">
        
        {/* LIST VIEW */}
        {!editingTemplateId && (
          <div className="theme-card-structural rounded-xl overflow-hidden ">
            {templates.length === 0 ? (
              <div className="text-center py-12">
                <LayoutTemplate className="w-12 h-12 text-subtle mx-auto mb-4" />
                <h3 className="text-lg font-bold text-muted">No Templates Designed</h3>
                <p className="text-sm text-muted mt-1">Click 'Add Template' to create your first email payload.</p>
              </div>
            ) : (
              <AppTable className="w-full text-left text-sm">
                <thead className="bg-background border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-bold text-muted uppercase tracking-wider">Template Name</th>
                    <th className="px-6 py-4 font-bold text-muted uppercase tracking-wider">Module</th>
                    <th className="px-6 py-4 font-bold text-muted uppercase tracking-wider">Event</th>
                    <th className="px-6 py-4 font-bold text-muted uppercase tracking-wider text-center">Status</th>
                    <th className="px-6 py-4 font-bold text-muted uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {templates.map((item) => (
                    <tr 
                      key={item.id} 
                      className="hover:bg-background/50 transition-colors cursor-pointer group"
                      onClick={() => setEditingTemplateId(item.id)}
                    >
                      <td className="px-6 py-4 font-medium text-foreground">{item.template_name}</td>
                      <td className="px-6 py-4 text-muted">{item.module}</td>
                      <td className="px-6 py-4 text-muted">{item.event}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${item.is_active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <AppButton 
                            onClick={(e) => { e.stopPropagation(); setEditingTemplateId(item.id); }}
                            className="p-2 text-muted hover:text-theme-icon bg-background rounded-md border border-border shadow-sm"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </AppButton>
                          <AppButton 
                            onClick={(e) => handleDelete(item.id, e)} 
                            className="p-2 text-muted hover:text-danger bg-background rounded-md border border-border shadow-sm"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </AppButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </AppTable>
            )}
          </div>
        )}

        {/* EDITOR VIEW */}
        {editingTemplateId && tpl && (
          <div className="theme-card-structural rounded-xl overflow-hidden  flex flex-col animate-in slide-in-from-right-4 duration-300">
            {/* Header Configuration */}
            <div className="p-6 border-b grid grid-cols-1 md:grid-cols-3 gap-6 theme-card-structural">
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted uppercase">Template Name</label>
                <input 
                  type="text" 
                  value={tpl.template_name || ''}
                  onChange={(e) => updateLocal(tpl.id, "template_name", e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-theme-btn-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted uppercase">Trigger Module</label>
                <select 
                  value={tpl.module || ''}
                  onChange={(e) => updateLocal(tpl.id, "module", e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-theme-btn-primary"
                >
                  {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted uppercase">Trigger Event</label>
                <select 
                  value={tpl.event || ''}
                  onChange={(e) => updateLocal(tpl.id, "event", e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-theme-btn-primary"
                >
                  {EVENTS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="md:col-span-3 space-y-2">
                <label className="text-sm font-bold text-muted uppercase">Email Subject Line</label>
                <input 
                  type="text" 
                  value={tpl.subject || ''}
                  onChange={(e) => updateLocal(tpl.id, "subject", e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-theme-btn-primary font-mono"
                  placeholder="e.g. Action Required: {{task_name}}"
                />
              </div>

              {/* Target Recipients Checkboxes */}
              <div className="md:col-span-3 space-y-2 mt-2">
                <label className="text-sm font-bold text-muted uppercase">Target Recipients (Dynamic)</label>
                <div className="flex flex-wrap gap-3">
                  {RECIPIENT_OPTIONS.map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-border rounded-md bg-background hover:border-theme-btn-primary transition-colors select-none">
                      <input 
                        type="checkbox"
                        checked={tpl.recipient_types?.includes(opt) || false}
                        onChange={(e) => {
                          const current = tpl.recipient_types || [];
                          if (e.target.checked) {
                            updateLocal(tpl.id, "recipient_types", [...current, opt]);
                          } else {
                            updateLocal(tpl.id, "recipient_types", current.filter((r: string) => r !== opt));
                          }
                        }}
                        className="accent-theme-btn-primary w-4 h-4"
                      />
                      <span className="text-sm font-medium text-foreground">{opt}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted">Select which dynamic roles should receive this email when the event triggers.</p>
              </div>
            </div>

            {/* Merge Tags Helper */}
            <div className="px-6 py-3 border-b border-border bg-background flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-muted mr-2">AVAILABLE TAGS:</span>
              {MERGE_TAGS.map(tag => (
                <AppButton 
                  key={tag} 
                  onClick={() => {
                    const el = document.getElementById(`editor_${tpl.id}`) as HTMLTextAreaElement;
                    if (el) {
                      const start = el.selectionStart;
                      const end = el.selectionEnd;
                      const bodyStr = tpl.html_body || '';
                      const newBody = bodyStr.substring(0, start) + tag + bodyStr.substring(end);
                      updateLocal(tpl.id, "html_body", newBody);
                    }
                  }}
                  className="px-2 py-1 bg-theme-btn-primary text-theme-btn-primary-text hover:opacity-90/90 text-xs font-mono rounded transition-colors shadow-sm"
                >
                  {tag}
                </AppButton>
              ))}
            </div>

            {/* Editor vs Preview Tab */}
            <div className="flex border-b border-border bg-background">
              <AppButton 
                onClick={() => handleTabSwitch(tpl.id, "code")}
                className={`theme-tab-standard border-b-2 ${activeTab[tpl.id] === 'code' ? 'border-theme-btn-primary text-theme-icon theme-card-structural ' : 'border-transparent text-muted hover:text-foreground'}`}
              >
                <Code2 className="w-4 h-4" /> HTML Source
              </AppButton>
              <AppButton 
                onClick={() => handleTabSwitch(tpl.id, "preview")}
                className={`theme-tab-standard border-b-2 ${activeTab[tpl.id] === 'preview' ? 'border-theme-btn-primary text-theme-icon theme-card-structural ' : 'border-transparent text-muted hover:text-foreground'}`}
              >
                <Eye className="w-4 h-4" /> Live Preview (Dynamic)
              </AppButton>
            </div>

            {/* Content Area */}
            {activeTab[tpl.id] === 'code' ? (
              <textarea
                id={`editor_${tpl.id}`}
                value={tpl.html_body || ''}
                onChange={(e) => updateLocal(tpl.id, "html_body", e.target.value)}
                className="w-full h-64 bg-background text-success dark:text-success font-mono text-sm p-6 focus:outline-none focus:ring-inset focus:ring-2 focus:ring-theme-btn-primary/20 resize-y"
                spellCheck={false}
              />
            ) : (
              <div 
                className="w-full h-64 bg-surface text-foreground p-6 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewContent[tpl.id] || "Loading preview...") }}
              />
            )}

            {/* Footer Actions */}
            <div className="bg-background px-6 py-3 border-t border-border flex justify-between items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${tpl.is_active ? 'bg-theme-btn-primary' : 'bg-gray-400 dark:bg-gray-600'}`}>
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${tpl.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={tpl.is_active} 
                  onChange={(e) => updateLocal(tpl.id, "is_active", e.target.checked)}
                />
                <span className="text-xs font-bold text-muted uppercase">Template Active</span>
              </label>

              <div className="flex items-center gap-3">
                <AppButton onClick={(e) => handleDelete(tpl.id, e)} className="text-muted hover:text-danger transition-colors mr-2">
                  <Trash2 className="w-4 h-4" />
                </AppButton>
                <AppButton 
                  onClick={() => {
                    if (tpl?.is_new) {
                      setTemplates(prev => prev.filter(t => t.id !== editingTemplateId));
                    }
                    setEditingTemplateId(null);
                  }}
                  className="bg-transparent hover:bg-surface text-muted px-4 py-1.5 rounded text-sm font-bold transition-colors"
                >
                  Cancel
                </AppButton>
                <AppButton 
                  onClick={() => handleSave(tpl)}
                  className="flex items-center gap-2 bg-theme-btn-primary hover:opacity-90/90 text-theme-btn-primary-text px-6 py-1.5 rounded text-sm font-bold transition-colors shadow-lg shadow-theme-btn-primary/20"
                >
                  <Save className="w-4 h-4" /> Save Template
                </AppButton>
              </div>
            </div>
          </div>
        )}

      </div>

      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3  animate-in slide-in-from-bottom-5 duration-300 ${toastMsg.type === 'error' ? 'bg-danger' : 'bg-success'} text-white`}>
          <span className="text-xs font-semibold">{toastMsg.text}</span>
        </div>
      )}
    </div>
  );
}
