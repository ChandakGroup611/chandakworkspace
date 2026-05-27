"use client";

import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Task {
  id: string;
  subject: string;
  status_id: string;
}

interface ColumnProps {
  id: string;
  title: string;
  tasks: Task[];
}

function SortableTask({ task }: { task: Task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} 
      className="p-3 mb-2 bg-white/5 border border-white/10 rounded-xl shadow-sm text-sm cursor-grab active:cursor-grabbing hover:bg-white/10 transition-colors">
      {task.subject}
    </div>
  );
}

function Column({ id, title, tasks }: ColumnProps) {
  return (
    <div className="flex-1 min-w-[280px] flex flex-col bg-gray-900/40 rounded-xl p-4 border border-white/5">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex justify-between items-center">
        <span>{title}</span>
        <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs">{tasks.length}</span>
      </h3>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 min-h-[150px]">
          {tasks.map(task => (
            <SortableTask key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function TaskBoard({ initialTasks, statuses }: { initialTasks: Task[], statuses: any[] }) {
  const [tasks, setTasks] = useState(initialTasks);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: any) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTasks((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        // Note: For cross-column dragging in DndKit, multiple SortableContexts and 
        // handleDragOver logic is required. This is a simplified scaffold.
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  return (
    <div className="flex space-x-4 overflow-x-auto p-4 min-h-[500px]">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {statuses.map(status => (
          <Column 
            key={status.id} 
            id={status.id} 
            title={status.status_name} 
            tasks={tasks.filter(t => t.status_id === status.id)} 
          />
        ))}
      </DndContext>
    </div>
  );
}
