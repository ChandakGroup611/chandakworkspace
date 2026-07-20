"use client";

import React, { useState, useMemo } from "react";
import { 
  DndContext, 
  DragOverlay,
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent, 
  DragStartEvent 
} from '@dnd-kit/core';
import { 
  SortableContext, 
  arrayMove, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AppCard } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { Paperclip, MessageSquare, Clock, AlignLeft } from "lucide-react";

interface TaskBoardViewProps {
  tasks: any[];
  statuses: any[];
  onStatusChange: (taskId: string, newStatusId: string) => Promise<void>;
  onTaskClick: (task: any) => void;
}

export default function TaskBoardView({ tasks, statuses, onStatusChange, onTaskClick }: TaskBoardViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Group tasks by status ID
  const columns = useMemo(() => {
    const cols = statuses.map(s => ({
      ...s,
      tasks: tasks.filter(t => t.status_id === s.id)
    }));
    // Add "Unassigned Status" column if there are tasks without a status
    const unassignedTasks = tasks.filter(t => !t.status_id);
    if (unassignedTasks.length > 0) {
      cols.push({
        id: "unassigned",
        name: "No Status",
        tasks: unassignedTasks
      });
    }
    return cols;
  }, [tasks, statuses]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    
    if (!over) return;
    
    const activeTaskId = active.id as string;
    const overId = over.id as string;
    
    // Find what status column we dropped into
    // It could be dropped over a task (overId is task id) or a column (overId is column id)
    
    let newStatusId = "";
    
    // Check if overId is a status column
    if (columns.find(c => c.id === overId)) {
      newStatusId = overId;
    } else {
      // Find the task we dropped over
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        newStatusId = overTask.status_id;
      }
    }

    if (newStatusId && newStatusId !== "unassigned") {
      const activeTask = tasks.find(t => t.id === activeTaskId);
      if (activeTask && activeTask.status_id !== newStatusId) {
        await onStatusChange(activeTaskId, newStatusId);
      }
    }
  };

  const activeTask = useMemo(() => tasks.find(t => t.id === activeId), [activeId, tasks]);

  return (
    <div className="flex h-full w-full overflow-x-auto overflow-y-hidden pb-4 space-x-4">
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCorners} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {columns.map(col => (
          <BoardColumn 
            key={col.id} 
            column={col} 
            onTaskClick={onTaskClick}
          />
        ))}

        <DragOverlay>
          {activeTask ? (
            <div className="rotate-3 opacity-90 cursor-grabbing">
              <TaskCard task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function BoardColumn({ column, onTaskClick }: { column: any, onTaskClick: (task: any) => void }) {
  const { setNodeRef } = useSortable({
    id: column.id,
    data: {
      type: "Column",
      column,
    }
  });

  return (
    <div className="flex flex-col w-[320px] min-w-[320px] bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/5 h-full max-h-full">
      <div className="p-3 border-b border-gray-200 dark:border-white/5 flex items-center justify-between bg-white dark:bg-[#0B0F19] rounded-t-xl shrink-0">
        <div className="flex items-center gap-2">
          {column.color && (
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: column.color }} />
          )}
          <h3 className="font-bold text-sm text-foreground">{column.name}</h3>
        </div>
        <AppBadge variant="neutral" className="text-[10px]">{column.tasks.length}</AppBadge>
      </div>
      
      <div 
        ref={setNodeRef}
        className="flex-1 p-3 overflow-y-auto space-y-3 flex flex-col min-h-[150px]"
      >
        <SortableContext 
          items={column.tasks.map((t: any) => t.id)} 
          strategy={verticalListSortingStrategy}
        >
          {column.tasks.map((task: any) => (
            <SortableTaskCard 
              key={task.id} 
              task={task} 
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>
        
        {column.tasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-white/10 rounded-lg">
            <span className="text-xs font-medium text-gray-400">Drop tasks here</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SortableTaskCard({ task, onClick }: { task: any, onClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id,
    data: {
      type: "Task",
      task,
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-30 border-2 border-accent border-dashed rounded-xl h-[120px] bg-accent/5"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Only trigger click if we aren't dragging
        if (!isDragging) {
           onClick();
        }
      }}
      className="cursor-grab active:cursor-grabbing"
    >
      <TaskCard task={task} />
    </div>
  );
}

function TaskCard({ task }: { task: any }) {
  const isOverdue = task.end_date && new Date(task.end_date) < new Date() && !task.status?.is_closed;
  
  return (
    <AppCard className="hover:shadow-md hover:border-accent/40 transition-all group overflow-hidden">
      {task.priority?.priority_color && (
        <div className="h-1 w-full" style={{ backgroundColor: task.priority.priority_color }} />
      )}
      <div className="p-3">
        <div className="flex justify-between items-start mb-2 gap-2">
          <div className="font-mono text-[10px] font-bold text-gray-500">
            {task.code}
          </div>
          {task.department && (
            <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded truncate max-w-[80px]" title={task.department.name}>
              {task.department.name}
            </span>
          )}
        </div>
        
        <h4 className="font-bold text-[13px] text-foreground leading-snug mb-3 line-clamp-2" title={task.title}>
          {task.title}
        </h4>
        
        {task.progress_percentage !== undefined && task.progress_percentage > 0 && (
          <div className="mb-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${task.progress_percentage}%` }}></div>
            </div>
            <span className="text-[10px] font-bold text-gray-500">{task.progress_percentage}%</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            {task.assignee ? (
              <div className="flex items-center gap-1.5">
                {(() => {
                  const a = Array.isArray(task.assignee) ? task.assignee[0] : task.assignee;
                  if (!a) return null;
                  return a.profile_photo ? (
                    <img src={a.profile_photo} alt="" className="w-5 h-5 rounded-full object-cover ring-1 ring-gray-200" title={a.full_name} />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[9px] font-bold ring-1 ring-accent/20" title={a.full_name}>
                      {a.full_name?.substring(0, 2).toUpperCase() || "U"}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-[9px] text-gray-400" title="Unassigned">?</div>
            )}
            
            {task.end_date && (
              <div className={`flex items-center gap-1 text-[10px] font-semibold ${isOverdue ? 'text-red-500 bg-red-50 px-1.5 py-0.5 rounded' : 'text-gray-500'}`}>
                <Clock className="w-3 h-3" />
                {new Date(task.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-gray-400">
            {task.description && <div title="Has Description"><AlignLeft className="w-3.5 h-3.5" /></div>}
            {task.attachmentCount > 0 && (
              <div className="flex items-center gap-0.5 text-[10px] font-medium" title={`${task.attachmentCount} Attachment(s)`}>
                <Paperclip className="w-3.5 h-3.5" />
                {task.attachmentCount}
              </div>
            )}
            {task.commentCount > 0 && (
              <div className="flex items-center gap-0.5 text-[10px] font-medium" title={`${task.commentCount} Comment(s)`}>
                <MessageSquare className="w-3.5 h-3.5" />
                {task.commentCount}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppCard>
  );
}
