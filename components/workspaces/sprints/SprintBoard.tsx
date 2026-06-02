"use client";

import React, { useState, useEffect } from "react";
import { fetchSprints, fetchTasksByWorkspace, updateTaskProgress } from "@/lib/actions/workspaces";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { Plus, GripVertical, Calendar } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { createClient } from "@/utils/supabase/client";

export function SprintBoard({ workspaceId, onNewSprint }: { workspaceId: string, onNewSprint?: () => void }) {
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze"].includes(theme);

  const [sprints, setSprints] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isCreatingSprint, setIsCreatingSprint] = useState(false);
  const [newSprintName, setNewSprintName] = useState("");
  const [newSprintStart, setNewSprintStart] = useState("");
  const [newSprintEnd, setNewSprintEnd] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, sprint_id: targetSprintId } : t));

    // Persist
    const supabase = createClient();
    await supabase.from("tasks").update({ sprint_id: targetSprintId }).eq("id", taskId);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
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
      alert("Failed to create sprint");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse">Loading Sprint Board...</div>;

  const activeSprints = sprints.filter(s => s.status !== 'CLOSED');
  
  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-indigo-500" />
          Agile Sprint Planning
        </h3>
        <AppButton variant="primary" size="sm" onClick={() => setIsCreatingSprint(true)}>
          <Plus className="h-3 w-3 mr-1" /> New Sprint
        </AppButton>
      </div>

      {isCreatingSprint && (
        <form onSubmit={handleCreateSprint} className={`p-4 rounded-xl border flex gap-4 items-end ${isLightMode ? "bg-indigo-50/50 border-indigo-100" : "bg-indigo-500/10 border-indigo-500/20"}`}>
          <div className="space-y-1.5 flex-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sprint Name</label>
            <input required type="text" value={newSprintName} onChange={e => setNewSprintName(e.target.value)} placeholder="e.g. Sprint 1 - Platform Core" className={`w-full p-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isLightMode ? "bg-white border-gray-200" : "bg-black/30 border-white/10"}`} />
          </div>
          <div className="space-y-1.5 w-40">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date</label>
            <input type="date" value={newSprintStart} onChange={e => setNewSprintStart(e.target.value)} className={`w-full p-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isLightMode ? "bg-white border-gray-200" : "bg-black/30 border-white/10"}`} />
          </div>
          <div className="space-y-1.5 w-40">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">End Date</label>
            <input type="date" value={newSprintEnd} onChange={e => setNewSprintEnd(e.target.value)} className={`w-full p-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isLightMode ? "bg-white border-gray-200" : "bg-black/30 border-white/10"}`} />
          </div>
          <div className="flex gap-2 h-9">
            <AppButton type="button" variant="ghost" onClick={() => setIsCreatingSprint(false)}>Cancel</AppButton>
            <AppButton type="submit" variant="primary" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create"}</AppButton>
          </div>
        </form>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
        
        {/* Backlog */}
        <div 
          className={`flex-shrink-0 w-80 rounded-xl border flex flex-col ${isLightMode ? "bg-gray-100/50 border-gray-200" : "bg-black/20 border-white/10"}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, null)}
        >
          <div className="p-3 border-b font-bold text-sm">Product Backlog</div>
          <div className="p-2 space-y-2 overflow-y-auto flex-1">
            {tasks.filter(t => !t.sprint_id).map(t => (
              <div 
                key={t.id} 
                draggable 
                onDragStart={(e) => handleDragStart(e, t.id)}
                className={`p-3 rounded-lg border cursor-grab active:cursor-grabbing flex gap-2 ${isLightMode ? "bg-white border-gray-200 shadow-sm" : "bg-white/5 border-white/10"}`}
              >
                <GripVertical className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold">{t.title || t.subject}</div>
                  <div className="text-[10px] text-gray-500 mt-1">{t.priority?.priority_name || 'Standard'}</div>
                </div>
              </div>
            ))}
            {tasks.filter(t => !t.sprint_id).length === 0 && (
              <div className="p-4 text-center text-xs text-gray-500 border border-dashed rounded-lg">Backlog is empty</div>
            )}
          </div>
        </div>

        {/* Active Sprints */}
        {activeSprints.map(sprint => (
          <div 
            key={sprint.id}
            className={`flex-shrink-0 w-80 rounded-xl border flex flex-col ${isLightMode ? "bg-indigo-50/30 border-indigo-100" : "bg-indigo-900/10 border-indigo-500/20"}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, sprint.id)}
          >
            <div className="p-3 border-b border-indigo-500/20">
              <div className="font-bold text-sm text-indigo-600 dark:text-indigo-400">{sprint.name}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                {sprint.start_date ? new Date(sprint.start_date).toLocaleDateString() : '?'} - {sprint.end_date ? new Date(sprint.end_date).toLocaleDateString() : '?'}
              </div>
            </div>
            <div className="p-2 space-y-2 overflow-y-auto flex-1">
              {tasks.filter(t => t.sprint_id === sprint.id).map(t => (
                <div 
                  key={t.id} 
                  draggable 
                  onDragStart={(e) => handleDragStart(e, t.id)}
                  className={`p-3 rounded-lg border cursor-grab active:cursor-grabbing flex gap-2 ${isLightMode ? "bg-white border-gray-200 shadow-sm" : "bg-[#11131f] border-white/10"}`}
                >
                  <GripVertical className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold">{t.title || t.subject}</div>
                    <div className="text-[10px] text-gray-500 mt-1">{t.priority?.priority_name || 'Standard'}</div>
                  </div>
                </div>
              ))}
              {tasks.filter(t => t.sprint_id === sprint.id).length === 0 && (
                <div className="p-4 text-center text-xs text-gray-500 border border-dashed rounded-lg">Drag tasks here</div>
              )}
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}
