"use client";

import React, { useState, useEffect } from "react";
import { Edit2, Save, X, Plus, AlignLeft } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import SafeHtml from "@/components/ui/SafeHtml";
import { updateTask } from "@/lib/actions/tasks";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { usePermissions } from "@/hooks/usePermissions";

interface EditableTaskDescriptionProps {
  task: {
    id: string;
    description?: string | null;
    assigned_to?: string | null;
    owner_id?: string | null;
    task_assignees?: any[];
    [key: string]: any;
  };
  readOnly?: boolean;
  onUpdated?: (newDescription: string) => void;
  className?: string;
}

export function EditableTaskDescription({
  task,
  readOnly = false,
  onUpdated,
  className = ""
}: EditableTaskDescriptionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(task?.description || "");
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const { hasPermission, roleCode, userId } = usePermissions();

  useEffect(() => {
    setDescription(task?.description || "");
  }, [task?.description]);

  const isSuperAdmin = roleCode === "SUPER_ADMIN" || hasPermission("SUPER_ADMIN");
  const isTaskAssignee = userId ? (task?.assigned_to === userId || task?.owner_id === userId) : false;
  const isExecutor = userId ? (task?.task_assignees?.some((a: any) => a.id === userId)) : false;
  const canManage = hasPermission("TASKS_UPDATE") || hasPermission("TASKS_MANAGE");
  const canEdit = !readOnly && (isSuperAdmin || isTaskAssignee || isExecutor || canManage);

  const handleSave = async () => {
    const trimmed = description.trim();
    if (trimmed === (task.description || "").trim()) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateTask(task.id, { description: trimmed });
      if (result && result.error) {
        toast.error("Failed to update description: " + result.error);
      } else {
        toast.success("Description updated successfully");
        if (task) task.description = trimmed;
        if (onUpdated) onUpdated(trimmed);
        router.refresh();
        setIsEditing(false);
      }
    } catch (err: any) {
      toast.error("An error occurred: " + (err.message || "Failed to save"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDescription(task?.description || "");
    setIsEditing(false);
  };

  if (isEditing && canEdit) {
    return (
      <div className={`space-y-3 w-full animate-in fade-in duration-200 ${className}`}>
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-1.5 text-[13px] font-medium text-subtle">
            <AlignLeft className="h-4 w-4 text-muted" aria-hidden /> Edit Description
          </h4>
          <span className="text-[11px] text-muted">Ctrl+Enter to save</span>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              handleSave();
            } else if (e.key === "Escape") {
              e.preventDefault();
              handleCancel();
            }
          }}
          disabled={isSaving}
          rows={6}
          placeholder="Enter a comprehensive description, acceptance criteria, or details for this task/subtask..."
          className="w-full rounded-md border border-border bg-sunken p-3 text-[13.5px] leading-relaxed text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-y font-sans transition-all"
          autoFocus
        />
        <div className="flex items-center gap-2 justify-end">
          <AppButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isSaving}
            className="text-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5 mr-1" /> Cancel
          </AppButton>
          <AppButton
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="gap-1.5 shadow-xs"
          >
            <Save className="h-3.5 w-3.5" /> {isSaving ? "Saving..." : "Save description"}
          </AppButton>
        </div>
      </div>
    );
  }

  const hasDescription = Boolean(task?.description && task.description.trim().length > 0);

  return (
    <div className={`group relative w-full space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-[13px] font-medium text-subtle">
          <AlignLeft className="h-4 w-4 text-muted" aria-hidden /> Description
        </h4>
        {canEdit && (
          <AppButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-7 px-2 text-[12px] text-muted hover:text-foreground opacity-80 group-hover:opacity-100 transition-opacity gap-1"
          >
            <Edit2 className="h-3 w-3" /> {hasDescription ? "Edit" : "Add description"}
          </AppButton>
        )}
      </div>

      {hasDescription ? (
        <SafeHtml
          className="prose prose-sm w-full max-w-full whitespace-pre-wrap rounded-md border border-border bg-sunken p-4 text-[13.5px] leading-relaxed text-foreground dark:prose-invert"
          html={task.description!}
        />
      ) : (
        <div className="rounded-md border border-dashed border-border bg-sunken/40 p-4 text-center">
          <p className="text-[13px] text-muted italic">No description provided for this task.</p>
          {canEdit && (
            <AppButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="mt-2.5 h-8 gap-1.5 text-xs text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Add description
            </AppButton>
          )}
        </div>
      )}
    </div>
  );
}
