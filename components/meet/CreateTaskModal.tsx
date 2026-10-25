"use client";

import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X, Trash2, Calendar, Clock, CheckSquare } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { createTask } from "@/lib/actions/meet/tasks";
import { toast } from "react-toastify";
import type { PointPriority } from "@/types/meet";

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pointId: string;
  pointCode: string;
  sessionId?: string;
  users?: { id: string; full_name: string }[];
  onTaskCreated?: (task: any) => void;
}

export function CreateTaskModal({
  open,
  onOpenChange,
  pointId,
  pointCode,
  sessionId,
  users = [],
  onTaskCreated,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [priority, setPriority] = useState<PointPriority>("medium");
  const [tatDays, setTatDays] = useState(3);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [checklistInput, setChecklistInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddChecklistItem = () => {
    if (!checklistInput.trim()) return;
    setChecklist([...checklist, checklistInput.trim()]);
    setChecklistInput("");
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.warn("Please enter a task title");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createTask({
        point_id: pointId,
        session_id: sessionId,
        title: title.trim(),
        description: description.trim() || undefined,
        owner_id: ownerId || undefined,
        priority,
        tat_days: tatDays,
        checklist,
      });

      if (res.success && res.task) {
        toast.success(`Action item ${res.task.code} created`);
        setTitle("");
        setDescription("");
        setChecklist([]);
        onTaskCreated?.(res.task);
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to create task");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs animate-in fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-6 shadow-xl animate-in fade-in-0 zoom-in-95">
          <div className="flex items-start justify-between border-b border-border pb-3">
            <div>
              <Dialog.Title className="text-[17px] font-semibold text-heading">
                Create Action Item
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-[12.5px] text-muted">
                Under Point {pointCode} · Action item with TAT in working days
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="rounded p-1 text-muted hover:bg-sunken hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="my-4 space-y-3.5">
            <div>
              <label className="block text-[12.5px] font-medium text-foreground mb-1">
                Task Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Obtain stamped SBI bank clearance letter"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12.5px] font-medium text-foreground mb-1">
                  Assignee / Owner
                </label>
                <select
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12.5px] font-medium text-foreground mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PointPriority)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12.5px] font-medium text-foreground mb-1">
                  TAT (Working Days)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={tatDays}
                    onChange={(e) => setTatDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-primary focus:outline-none"
                  />
                  <span className="text-[12px] text-muted">days</span>
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-medium text-muted mb-1">
                  Working Calendar Rule
                </label>
                <p className="rounded-md bg-sunken px-2.5 py-2 text-[11.5px] text-subtle">
                  Mon-Sat (Excl. Sun & statutory holidays)
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[12.5px] font-medium text-foreground mb-1">
                Description & Instructions (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Specific guidance, link to document, or deliverable requirement..."
                className="w-full rounded-md border border-border bg-background p-2.5 text-[13px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
              />
            </div>

            {/* Checklist */}
            <div>
              <label className="block text-[12.5px] font-medium text-foreground mb-1">
                Sub-tasks Checklist
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={checklistInput}
                  onChange={(e) => setChecklistInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddChecklistItem();
                    }
                  }}
                  placeholder="Add item and press Enter..."
                  className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-[12.5px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddChecklistItem}
                  className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium hover:bg-sunken"
                >
                  Add
                </button>
              </div>

              {checklist.length > 0 && (
                <ul className="space-y-1.5 max-h-28 overflow-y-auto rounded-md border border-border bg-sunken/40 p-2">
                  {checklist.map((item, i) => (
                    <li key={i} className="flex items-center justify-between text-[12px] text-foreground">
                      <span className="flex items-center gap-1.5">
                        <CheckSquare className="h-3.5 w-3.5 text-muted" />
                        {item}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveChecklistItem(i)}
                        className="text-muted hover:text-danger-text"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-border pt-4">
              <AppButton
                type="button"
                variant="outline"
                size="md"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </AppButton>
              <AppButton
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
              >
                {isSubmitting ? "Creating…" : "Create Task"}
              </AppButton>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
