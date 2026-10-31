"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, CheckSquare, Calendar, User, Folder, AlertCircle, Loader2 } from "lucide-react";
import {
  MessengerMessage,
  WorkspaceUser,
  fetchTaskOptionsForMessenger,
  createTaskFromChatMessage,
} from "@/lib/actions/messenger";

interface CreateTaskFromMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: MessengerMessage | null;
  conversationId: string;
  allUsers: WorkspaceUser[];
  onTaskCreated?: (task: any) => void;
}

export function CreateTaskFromMessageModal({
  isOpen,
  onClose,
  message,
  conversationId,
  allUsers,
  onTaskCreated,
}: CreateTaskFromMessageModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priorityId, setPriorityId] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [priorities, setPriorities] = useState<{ id: string; name: string; color?: string }[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize form state when message changes
  useEffect(() => {
    if (message && isOpen) {
      const rawContent = (message.content || "").trim();
      const firstLine = rawContent.split("\n")[0] || "";
      setTitle(firstLine.slice(0, 140));
      setDescription(rawContent.length > 140 ? rawContent : "");
      setError(null);
    }
  }, [message, isOpen]);

  // Load workspaces and priorities
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setLoadingOptions(true);
    fetchTaskOptionsForMessenger()
      .then((opts) => {
        if (!active) return;
        setWorkspaces(opts.workspaces || []);
        setPriorities(opts.priorities || []);
        if (opts.workspaces?.length > 0 && !workspaceId) {
          setWorkspaceId(opts.workspaces[0].id);
        }
        if (opts.priorities?.length > 0 && !priorityId) {
          // Default to Normal or second priority if available
          const normalPrio = opts.priorities.find((p) => /normal|medium/i.test(p.name)) || opts.priorities[0];
          setPriorityId(normalPrio.id);
        }
      })
      .catch((err) => console.warn("Failed to load task options:", err))
      .finally(() => {
        if (active) setLoadingOptions(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message) return;
    if (!title.trim()) {
      setError("Task title is required");
      return;
    }
    if (!workspaceId) {
      setError("Please select a workspace");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await createTaskFromChatMessage({
        conversationId,
        messageId: message.id,
        title: title.trim(),
        description: description.trim() || undefined,
        workspaceId,
        assigneeId: assigneeId || undefined,
        priorityId: priorityId || undefined,
        dueDate: dueDate || undefined,
      });

      if (!res.success) {
        setError(res.error || "Failed to create task");
      } else {
        onTaskCreated?.(res.task);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !message || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[var(--z-modal,99999)] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-elevated p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
            <CheckSquare className="h-4 w-4 text-emerald-500" />
            <span>Convert Message to Task</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted hover:text-foreground rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-danger/10 p-2.5 text-xs text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Task Title <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Follow up on HVAC quotation"
              required
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Workspace */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1">
              <Folder className="h-3.5 w-3.5 text-muted" />
              <span>Workspace</span> <span className="text-danger">*</span>
            </label>
            <select
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              required
              disabled={loadingOptions || workspaces.length === 0}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {loadingOptions ? (
                <option value="">Loading workspaces...</option>
              ) : workspaces.length === 0 ? (
                <option value="">No workspaces found</option>
              ) : (
                workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Grid: Assignee & Priority */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-muted" />
                <span>Assignee</span>
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Unassigned</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Priority
              </label>
              <select
                value={priorityId}
                onChange={(e) => setPriorityId(e.target.value)}
                disabled={loadingOptions || priorities.length === 0}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {loadingOptions ? (
                  <option value="">Loading...</option>
                ) : (
                  priorities.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-muted" />
              <span>Due Date</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Optional Details */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Additional Notes
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Context or notes from the conversation..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-accent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-medium text-xs hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span>Create Task</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}

