"use client";
import { toast } from 'react-toastify';
import React, { useState, useEffect } from "react";
import { fetchSprints, fetchTasksByWorkspace, updateTaskProgress } from "@/lib/actions/workspaces";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppBadge } from "@/components/ui/AppBadge";
import { Plus, GripVertical, Calendar, Edit2, Check, X, Filter } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { createClient } from "@/utils/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { PriorityIndicator, formatDate } from "@/components/ui/data";

const COLUMN = "flex w-80 flex-shrink-0 flex-col rounded-[10px] border border-border bg-sunken";
const CARD = "theme-card-structural flex gap-2 p-3 shadow-sm";
const DROP_HINT = "rounded-md border border-border bg-surface/60 p-4 text-center text-[12.5px] text-muted";
const FIELD = "h-9 w-full px-3 text-[13.5px]";
const LABEL = "text-[13px] font-medium text-subtle";

export function SprintBoard({ workspaceId, currentUser, onNewSprint }: { workspaceId: string, currentUser?: any, onNewSprint?: () => void }) {
  const { isLight: isLightMode } = useTheme();
  const { hasPermission, roleCode, userId } = usePermissions();
  const isSuperAdmin = roleCode === "SUPER_ADMIN";
  const effectiveUserId = userId || currentUser?.id;
  const canManageSprints = isSuperAdmin || hasPermission("WORKSPACES_MANAGE") || currentUser?.isWorkspaceOwner;

  const [sprints, setSprints] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isCreatingSprint, setIsCreatingSprint] = useState(false);
  const [newSprintName, setNewSprintName] = useState("");
  const [newSprintStart, setNewSprintStart] = useState("");
  const [newSprintEnd, setNewSprintEnd] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'ALL' | 'ASSIGNED' | 'TEAM' | 'CREATED' | 'OVERDUE'>('ALL');

  const [editingSprintId, setEditingSprintId] = useState<string | null>(null);
  const [editSprintName, setEditSprintName] = useState("");
  const [editSprintStart, setEditSprintStart] = useState("");
  const [editSprintEnd, setEditSprintEnd] = useState("");
  const [isUpdatingSprint, setIsUpdatingSprint] = useState(false);

  const canMoveTask = (t: any) => {
    if (isSuperAdmin || canManageSprints) return true;
    if (!effectiveUserId) return false;
    return t.owner_id === effectiveUserId || t.assigned_to === effectiveUserId || t.assignees?.some((a: any) => a.user_id === effectiveUserId);
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [sprintData, taskData] = await Promise.all([
        fetchSprints(workspaceId),
        fetchTasksByWorkspace(workspaceId)
      ]);
      setSprints(sprintData);
      setTasks(taskData);
      setLoading(false);
    }
    load();
  }, [workspaceId]);

  const handleDrop = async (e: React.DragEvent, targetSprintId: string | null) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;

    const taskToMove = tasks.find(t => t.id === taskId);
    if (!taskToMove || !canMoveTask(taskToMove)) {
      toast.error("You can't move this task. Only its owner or a workspace manager can.");
      return;
    }

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, sprint_id: targetSprintId } : t));

    // Persist
    const supabase = createClient();
    await supabase.from("tasks").update({ sprint_id: targetSprintId }).eq("id", taskId);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    const taskToMove = tasks.find(t => t.id === taskId);
    if (!taskToMove || !canMoveTask(taskToMove)) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSprintName) return;
    try {
      setIsSubmitting(true);
      const { createSprint } = await import("@/lib/actions/workspaces");
      const newSprint = await createSprint(workspaceId, {
        name: newSprintName,
        start_date: newSprintStart || null,
        end_date: newSprintEnd || null
      });
      setSprints([...sprints, newSprint]);
      setIsCreatingSprint(false);
      setNewSprintName("");
      setNewSprintStart("");
      setNewSprintEnd("");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't create the sprint. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSprint = async (id: string) => {
    if (!editSprintName) return;
    try {
      setIsUpdatingSprint(true);
      const { updateSprint } = await import("@/lib/actions/workspaces");
      const updated = await updateSprint(id, {
        name: editSprintName,
        start_date: editSprintStart || null,
        end_date: editSprintEnd || null,
        status: sprints.find(s => s.id === id)?.status
      });
      setSprints(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
      setEditingSprintId(null);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't update the sprint. Try again.");
    } finally {
      setIsUpdatingSprint(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-[13.5px] text-muted" role="status">Loading sprints…</div>;

  const activeSprints = sprints.filter(s => s.status !== 'CLOSED');

  const filteredTasks = tasks.filter(t => {
    if (taskFilter === 'ALL') return true;
    if (taskFilter === 'ASSIGNED') return t.owner_id === currentUser?.id;
    if (taskFilter === 'TEAM') return t.assignees?.some((a: any) => a.user_id === currentUser?.id);
    if (taskFilter === 'CREATED') return t.created_by === currentUser?.id;
    if (taskFilter === 'OVERDUE') return t.end_date && new Date(t.end_date) < new Date();
    return true;
  });
  
  return (
    <div className="flex h-full flex-col space-y-4 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold text-heading">
          <Calendar className="h-4 w-4 text-muted" aria-hidden />
          Sprint planning
        </h3>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="sprint-task-filter">Show tasks</label>
          <select
            id="sprint-task-filter"
            value={taskFilter}
            onChange={(e) => setTaskFilter(e.target.value as any)}
            className="h-9 px-3 text-[13.5px]"
          >
            <option value="ALL">All tasks</option>
            <option value="ASSIGNED">Assigned to me</option>
            <option value="TEAM">I'm on the team</option>
            <option value="CREATED">Created by me</option>
            <option value="OVERDUE">Overdue</option>
          </select>
          {canManageSprints && (
            <AppButton variant="secondary" onClick={() => setIsCreatingSprint(true)} leftIcon={<Plus className="h-4 w-4" />}>
              New sprint
            </AppButton>
          )}
        </div>
      </div>

      {canManageSprints && isCreatingSprint && (
        <form onSubmit={handleCreateSprint} className="theme-card-structural flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label htmlFor="new-sprint-name" className={LABEL}>Name <span className="text-danger-text" aria-hidden>*</span></label>
            <input id="new-sprint-name" required type="text" value={newSprintName} onChange={e => setNewSprintName(e.target.value)} placeholder="e.g. Sprint 1 – Platform core" className={FIELD} />
          </div>
          <div className="space-y-1.5 sm:w-40">
            <label htmlFor="new-sprint-start" className={LABEL}>Start date</label>
            {/* ui-audit-ignore-next-line html-date-input */}
            <input id="new-sprint-start" type="date" value={newSprintStart} onChange={e => setNewSprintStart(e.target.value)} className={FIELD} />
          </div>
          <div className="space-y-1.5 sm:w-40">
            <label htmlFor="new-sprint-end" className={LABEL}>End date</label>
            {/* ui-audit-ignore-next-line html-date-input */}
            <input id="new-sprint-end" type="date" value={newSprintEnd} onChange={e => setNewSprintEnd(e.target.value)} className={FIELD} />
          </div>
          <div className="flex gap-2">
            <AppButton type="button" variant="ghost" onClick={() => setIsCreatingSprint(false)}>Cancel</AppButton>
            <AppButton type="submit" variant="primary" disabled={isSubmitting} isLoading={isSubmitting}>{isSubmitting ? "Creating…" : "Create sprint"}</AppButton>
          </div>
        </form>
      )}

      <div className="flex flex-1 gap-3 overflow-x-auto pb-2">
        
        {/* Backlog */}
        <div
          className={COLUMN}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, null)}
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <span className="text-[13.5px] font-semibold text-heading">Backlog</span>
            <span className="rounded bg-surface px-1.5 text-[12px] text-subtle tabular">{filteredTasks.filter(t => !t.sprint_id).length}</span>
          </div>
          <div className="p-2 space-y-2 overflow-y-auto flex-1">
            {filteredTasks.filter(t => !t.sprint_id).map(t => {
              const draggable = canMoveTask(t);
              return (
                <div 
                  key={t.id} 
                  draggable={draggable} 
                  onDragStart={(e) => handleDragStart(e, t.id)}
                  className={`${CARD} ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                >
                  {draggable && <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-label="Drag to move" />}
                  <div className="min-w-0 flex-1">
                    <div className="whitespace-normal break-words text-[13.5px] font-medium leading-snug text-foreground" title={t.title || t.subject}>{t.title || t.subject}</div>
                    <div className="mt-1.5"><PriorityIndicator priority={t.priority?.priority_name || null} className="text-[12.5px] text-subtle" /></div>
                  </div>
                </div>
              );
            })}
            {filteredTasks.filter(t => !t.sprint_id).length === 0 && (
              <div className={DROP_HINT}>Backlog is empty. Drag tasks here to take them out of a sprint.</div>
            )}
          </div>
        </div>

        {/* Active Sprints */}
        {activeSprints.map(sprint => (
          <div 
            key={sprint.id}
            className={COLUMN}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, sprint.id)}
          >
            <div className="group relative border-b border-border px-3 py-2.5">
              {canManageSprints && editingSprintId === sprint.id ? (
                <div className="space-y-2">
                  <input 
                    type="text" 
                    value={editSprintName} 
                    onChange={e => setEditSprintName(e.target.value)} 
                    aria-label="Sprint name"
                    className="h-8 w-full px-2 text-[13.5px] font-medium"
                    placeholder="Sprint name"
                  />
                  <div className="flex gap-2">
                    <input 
                      type="date" 
                      value={editSprintStart} 
                      onChange={e => setEditSprintStart(e.target.value)} 
                      className="h-8 w-full px-2 text-[12.5px]"
                    />
                    <input 
                      type="date" 
                      value={editSprintEnd} 
                      onChange={e => setEditSprintEnd(e.target.value)} 
                      className="h-8 w-full px-2 text-[12.5px]"
                    />
                  </div>
                  <div className="flex justify-end gap-1">
                    <AppButton variant="ghost" size="icon-sm" onClick={() => setEditingSprintId(null)} aria-label="Cancel editing" title="Cancel"><X className="h-4 w-4" /></AppButton>
                    <AppButton variant="secondary" size="icon-sm" onClick={() => handleUpdateSprint(sprint.id)} disabled={isUpdatingSprint} aria-label="Save sprint" title="Save"><Check className="h-4 w-4" /></AppButton>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <div className="text-[13.5px] font-semibold text-heading">{sprint.name}</div>
                    {canManageSprints && (
                      <AppButton variant="secondary" 
                        onClick={() => {
                          setEditingSprintId(sprint.id);
                          setEditSprintName(sprint.name);
                          setEditSprintStart(sprint.start_date?.substring(0, 10) || "");
                          setEditSprintEnd(sprint.end_date?.substring(0, 10) || "");
                        }} 
                        size="icon-sm"
                        className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
                        title="Edit sprint"
                        aria-label={`Edit ${sprint.name}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </AppButton>
                    )}
                  </div>
                  <div className="mt-0.5 text-[12px] text-muted tabular">
                    {formatDate(sprint.start_date, "No start date")} – {formatDate(sprint.end_date, "no end date")}
                  </div>
                </>
              )}
            </div>
            <div className="p-2 space-y-2 overflow-y-auto flex-1">
              {filteredTasks.filter(t => t.sprint_id === sprint.id).map(t => {
                const draggable = canMoveTask(t);
                return (
                  <div 
                    key={t.id} 
                    draggable={draggable} 
                    onDragStart={(e) => handleDragStart(e, t.id)}
                    className={`${CARD} ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                  >
                    {draggable && <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-label="Drag to move" />}
                    <div className="min-w-0 flex-1">
                      <div className="whitespace-normal break-words text-[13.5px] font-medium leading-snug text-foreground" title={t.title || t.subject}>{t.title || t.subject}</div>
                      <div className="mt-1.5"><PriorityIndicator priority={t.priority?.priority_name || null} className="text-[12.5px] text-subtle" /></div>
                    </div>
                  </div>
                );
              })}
              {filteredTasks.filter(t => t.sprint_id === sprint.id).length === 0 && (
                <div className={DROP_HINT}>Drag tasks here to plan them into this sprint</div>
              )}
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}
