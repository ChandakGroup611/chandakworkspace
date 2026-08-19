"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Check, X } from 'lucide-react';
import { AppButton } from "@/components/ui/AppButton";
import { updateTask } from '@/lib/actions/tasks';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

export function EditableTaskTitle({ task, asHeading = false }: { task: any, asHeading?: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.subject || task.title || "");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (!title.trim() || title === (task.subject || task.title)) {
      setIsEditing(false);
      setTitle(task.subject || task.title);
      return;
    }
    
    setIsSaving(true);
    const result = await updateTask(task.id, { subject: title });
    setIsSaving(false);
    
    if (result && result.error) {
      toast.error("Failed to update title: " + result.error);
      setTitle(task.subject || task.title);
    } else {
      router.refresh();
      if (task.subject !== undefined) task.subject = title;
      if (task.title !== undefined) task.title = title;
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 font-normal w-full max-w-xl mt-1">
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') {
              setIsEditing(false);
              setTitle(task.subject || task.title);
            }
          }}
          disabled={isSaving}
          className={`flex-1 bg-surface border border-border rounded px-3 py-1 ${asHeading ? 'text-2xl' : 'text-xl'} font-extrabold text-foreground focus:outline-none focus:ring-2 focus:ring-theme-btn-primary w-full transition-all shadow-sm`}
        />
        <AppButton size="sm" variant="primary" onClick={handleSave} disabled={isSaving} className="h-8 w-8 p-0 shrink-0 shadow-sm">
          <Check className="h-4 w-4" />
        </AppButton>
        <AppButton size="sm" variant="ghost" onClick={() => { setIsEditing(false); setTitle(task.subject || task.title); }} disabled={isSaving} className="h-8 w-8 p-0 shrink-0 text-muted hover:text-foreground">
          <X className="h-4 w-4" />
        </AppButton>
      </div>
    );
  }

  const TitleWrapper = asHeading ? 'h1' : 'span';
  const titleClasses = asHeading 
    ? "text-2xl font-bold text-theme-heading break-words whitespace-normal flex-1" 
    : "truncate text-theme-heading flex-1";

  return (
    <div className="group flex items-start gap-2 relative w-full">
      <TitleWrapper className={titleClasses}>{title}</TitleWrapper>
      <AppButton 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsEditing(true);
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-surface/50 rounded-lg text-muted hover:text-foreground shrink-0 cursor-pointer"
        title="Edit Task Title"
      >
        <Edit2 className="h-4 w-4" />
      </AppButton>
    </div>
  );
}
