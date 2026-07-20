"use client";

import React, { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { useTheme } from "@/components/theme/ThemeProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { Plus, X, Trash2, LayoutTemplate } from "lucide-react";
import { fetchTaskTemplates, createTaskTemplate, deleteTaskTemplate } from "@/lib/actions/workspaces";

export default function TemplateManager({ workspaceId, onClose }: { workspaceId: string, onClose: () => void }) {
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);
  const { hasPermission, roleCode } = usePermissions();
  const canDelete = roleCode === "SUPER_ADMIN" || hasPermission("TASKS_DELETE");

  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // New template state
  const [isCreating, setIsCreating] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const data = await fetchTaskTemplates(workspaceId);
      setTemplates(data);
      setIsLoading(false);
    }
    load();
  }, [workspaceId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName || !subject) return;
    try {
      setIsSubmitting(true);
      const newTmpl = await createTaskTemplate(workspaceId, {
        template_name: templateName,
        subject,
        description
      });
      setTemplates([...templates, newTmpl]);
      setIsCreating(false);
      setTemplateName("");
      setSubject("");
      setDescription("");
    } catch (e) {
      console.error(e);
      alert("Failed to create template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template forever?")) return;
    try {
      await deleteTaskTemplate(id);
      setTemplates(templates.filter(t => t.id !== id));
    } catch (e) {
      console.error(e);
      alert("Failed to delete template");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <AppCard className="w-full max-w-2xl mt-10 mb-10 overflow-hidden flex flex-col max-h-[90vh]">
        <div className={`p-4 border-b flex justify-between items-center bg-elevated border-border`}>
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-accent" />
            <h2 className="font-bold text-lg">Task Templates Manager</h2>
          </div>
          <AppButton variant="primary" onClick={onClose} className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
            <X className="h-5 w-5" />
          </AppButton>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {!isCreating && (
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Standardize your team's workflow by creating reusable task blueprints.</p>
              <AppButton onClick={() => setIsCreating(true)} variant="primary" className="bg-accent hover:bg-accent-secondary">
                <Plus className="h-4 w-4 mr-1" /> New Template
              </AppButton>
            </div>
          )}

          {isCreating && (
            <form onSubmit={handleCreate} className={`p-4 rounded-xl border space-y-4 bg-accent/10/50 border-indigo-100`}>
              <h3 className="font-semibold text-sm">Create New Template</h3>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Template Name</label>
                <AppInput required value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g. Monthly Server Patching" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Default Task Title</label>
                <AppInput required value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. [MAINTENANCE] Patch Production Servers" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Default Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Steps to execute..."
                  className={`w-full min-h-[80px] p-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-colors resize-y ${
                    "bg-surface border-border text-foreground"
                  }`}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <AppButton type="button" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</AppButton>
                <AppButton type="submit" variant="primary" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Template"}</AppButton>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading templates...</div>
            ) : templates.length === 0 && !isCreating ? (
              <div className="p-8 text-center border border-dashed rounded-xl border-gray-300 dark:border-gray-700 text-gray-500 text-sm">
                No templates found in this workspace. Create one above!
              </div>
            ) : (
              templates.map(t => (
                <div key={t.id} className={`p-4 rounded-xl border flex justify-between items-center ${"bg-surface border-border"}`}>
                  <div>
                    <h4 className="font-bold text-sm">{t.template_name}</h4>
                    <p className="text-xs text-gray-500 truncate max-w-md mt-0.5">{t.subject}</p>
                  </div>
                  {canDelete && (
                    <AppButton variant="secondary" onClick={() => handleDelete(t.id)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </AppButton>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </AppCard>
    </div>
  );
}
