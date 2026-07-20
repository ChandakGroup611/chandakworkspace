"use client";

import React, { useState, useEffect } from "react";
import { AppButton } from '@/components/ui/AppButton';
import { Save, Loader2, Play, Plus, Trash2, Code2, Eye, LayoutTemplate } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { previewEmailTemplate } from "@/lib/actions/email-config";

const MODULES = ["Task", "Workspace", "Ticket", "Requirement", "Approval"];
const EVENTS = ["Created", "Updated", "Assigned", "Reassigned", "Status Changed", "Delayed", "Completed", "Closed"];
const MERGE_TAGS = ["{{ticket_no}}", "{{ticket_title}}", "{{task_name}}", "{{workspace_name}}", "{{assigned_user}}", "{{creator_name}}", "{{status}}", "{{priority}}", "{{due_date}}", "{{link}}"];

export default function TemplateDesigner() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<{type: "success" | "error", text: string} | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, "code" | "preview">>({});
  const [previewContent, setPreviewContent] = useState<Record<string, string>>({});
  
  const supabase = createClient();

  const triggerToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setTemplates(data || []);
      
      const tabs: any = {};
      (data || []).forEach(t => tabs[t.id] = "code");
      setActiveTab(tabs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTemplate = () => {
    const newId = "temp_" + Date.now();
    setTemplates([
      {
        id: newId,
        module: "Task",
        event: "Assigned",
        template_name: "Default Task Assignment",
        subject: "New Task Assigned: {{task_name}}",
        html_body: `<div style="font-family: sans-serif; padding: 20px;">\n  <h2>You have a new task</h2>\n  <p><strong>Task:</strong> {{task_name}}</p>\n  <p><strong>Status:</strong> {{status}}</p>\n  <p><strong>Assigned By:</strong> {{creator_name}}</p>\n  <br/>\n  <a href="{{link}}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Task</a>\n</div>`,
        is_active: true,
        is_new: true
      },
      ...templates
    ]);
    setActiveTab(prev => ({ ...prev, [newId]: "code" }));
  };

  const updateLocal = (id: string, field: string, value: any) => {
    setTemplates(templates.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleSave = async (template: any) => {
    try {
      const payload = {
        module: template.module,
        event: template.event,
        template_name: template.template_name,
        subject: template.subject,
        html_body: template.html_body,
        is_active: template.is_active
      };

      if (template.is_new) {
        const { error } = await supabase.from("email_templates").insert([payload]);
        if (error) throw error;
        triggerToast("Template created successfully");
      } else {
        const { error } = await supabase.from("email_templates").update(payload).eq("id", template.id);
        if (error) throw error;
        triggerToast("Template updated successfully");
      }
      fetchTemplates();
    } catch (err: any) {
      triggerToast(err.message || "Failed to save template", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (id.startsWith("temp_")) {
      setTemplates(templates.filter(t => t.id !== id));
      return;
    }
    if (!confirm("Delete this template?")) return;
    try {
      const { error } = await supabase.from("email_templates").delete().eq("id", id);
      if (error) throw error;
      triggerToast("Template deleted");
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

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-[#0A0D14] border border-white/10 p-4 rounded-xl shadow-lg">
        <div>
          <h2 className="text-lg font-bold text-foreground">Dynamic Template Designer</h2>
          <p className="text-xs text-gray-400">Construct HTML payloads with runtime merge tag hydration.</p>
        </div>
        <AppButton
          onClick={handleAddTemplate}
          className="flex items-center gap-2 bg-accent hover:bg-accent text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-purple-500/20 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Template
        </AppButton>
      </div>

      <div className="space-y-8">
        {templates.map((tpl) => (
          <div key={tpl.id} className="bg-[#121620] border border-white/5 rounded-xl overflow-hidden shadow-xl flex flex-col">
            {/* Header Configuration */}
            <div className="p-6 border-b border-white/5 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Template Name</label>
                <input 
                  type="text" 
                  value={tpl.template_name}
                  onChange={(e) => updateLocal(tpl.id, "template_name", e.target.value)}
                  className="w-full bg-[#0A0D14] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Trigger Module</label>
                <select 
                  value={tpl.module}
                  onChange={(e) => updateLocal(tpl.id, "module", e.target.value)}
                  className="w-full bg-[#0A0D14] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none"
                >
                  {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Trigger Event</label>
                <select 
                  value={tpl.event}
                  onChange={(e) => updateLocal(tpl.id, "event", e.target.value)}
                  className="w-full bg-[#0A0D14] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none"
                >
                  {EVENTS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="md:col-span-3 space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Email Subject Line</label>
                <input 
                  type="text" 
                  value={tpl.subject}
                  onChange={(e) => updateLocal(tpl.id, "subject", e.target.value)}
                  className="w-full bg-[#0A0D14] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-accent font-mono"
                  placeholder="e.g. Action Required: {{task_name}}"
                />
              </div>
            </div>

            {/* Merge Tags Helper */}
            <div className="px-6 py-3 border-b border-white/5 bg-[#0A0D14] flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-gray-500 mr-2">AVAILABLE TAGS:</span>
              {MERGE_TAGS.map(tag => (
                <AppButton 
                  key={tag} 
                  onClick={() => {
                    const el = document.getElementById(`editor_${tpl.id}`) as HTMLTextAreaElement;
                    if (el) {
                      const start = el.selectionStart;
                      const end = el.selectionEnd;
                      const newBody = tpl.html_body.substring(0, start) + tag + tpl.html_body.substring(end);
                      updateLocal(tpl.id, "html_body", newBody);
                    }
                  }}
                  className="px-2 py-1 bg-white/5 hover:bg-accent/20 text-purple-300 text-xs font-mono rounded transition-colors"
                >
                  {tag}
                </AppButton>
              ))}
            </div>

            {/* Editor vs Preview Tab */}
            <div className="flex border-b border-white/5 bg-[#0A0D14]">
              <AppButton 
                onClick={() => handleTabSwitch(tpl.id, "code")}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab[tpl.id] === 'code' ? 'border-accent text-accent bg-white/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                <Code2 className="w-4 h-4" /> HTML Source
              </AppButton>
              <AppButton 
                onClick={() => handleTabSwitch(tpl.id, "preview")}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab[tpl.id] === 'preview' ? 'border-accent text-accent bg-white/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                <Eye className="w-4 h-4" /> Live Preview (Dynamic)
              </AppButton>
            </div>

            {/* Content Area */}
            {activeTab[tpl.id] === 'code' ? (
              <textarea
                id={`editor_${tpl.id}`}
                value={tpl.html_body}
                onChange={(e) => updateLocal(tpl.id, "html_body", e.target.value)}
                className="w-full h-64 bg-[#05070D] text-emerald-400 font-mono text-sm p-6 focus:outline-none focus:ring-inset focus:ring-2 focus:ring-accent/20 resize-y"
                spellCheck={false}
              />
            ) : (
              <div 
                className="w-full h-64 bg-white text-black p-6 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: previewContent[tpl.id] || "Loading preview..." }}
              />
            )}

            {/* Footer Actions */}
            <div className="bg-[#0A0D14] px-6 py-3 border-t border-white/5 flex justify-between items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${tpl.is_active ? 'bg-accent' : 'bg-gray-600'}`}>
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${tpl.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={tpl.is_active} 
                  onChange={(e) => updateLocal(tpl.id, "is_active", e.target.checked)}
                />
                <span className="text-xs font-bold text-gray-400 uppercase">Template Active</span>
              </label>

              <div className="flex items-center gap-3">
                <AppButton onClick={() => handleDelete(tpl.id)} className="text-gray-500 hover:text-rose-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </AppButton>
                <AppButton 
                  onClick={() => handleSave(tpl)}
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-1.5 rounded text-sm font-bold transition-colors border border-white/10"
                >
                  <Save className="w-4 h-4" /> Save
                </AppButton>
              </div>
            </div>

          </div>
        ))}

        {templates.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
            <LayoutTemplate className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-400">No Templates Designed</h3>
            <p className="text-sm text-gray-500 mt-1">Create HTML email payloads to attach to routing rules.</p>
          </div>
        )}
      </div>

      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-5 duration-300 ${toastMsg.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'} text-white`}>
          <span className="text-xs font-semibold">{toastMsg.text}</span>
        </div>
      )}
    </div>
  );
}
