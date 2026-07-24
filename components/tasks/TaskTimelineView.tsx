"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";

interface TaskTimelineViewProps {
  tasks: any[];
  onTaskClick: (task: any) => void;
}

export default function TaskTimelineView({ tasks, onTaskClick }: TaskTimelineViewProps) {
  // Filter tasks that have both start_date and end_date
  const timelineTasks = useMemo(() => {
    return tasks.filter(t => t.start_date && t.end_date).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }, [tasks]);

  const [dateRange, setDateRange] = useState({ start: new Date(), end: new Date() });

  useEffect(() => {
    if (timelineTasks.length > 0) {
      let minDate = new Date(timelineTasks[0].start_date);
      let maxDate = new Date(timelineTasks[0].end_date);

      timelineTasks.forEach(t => {
        const start = new Date(t.start_date);
        const end = new Date(t.end_date);
        if (start < minDate) minDate = start;
        if (end > maxDate) maxDate = end;
      });

      // Add padding
      setDateRange({
        start: addDays(minDate, -7),
        end: addDays(maxDate, 14)
      });
    } else {
      setDateRange({
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date())
      });
    }
  }, [timelineTasks]);

  const days = useMemo(() => {
    try {
      return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    } catch {
      return [];
    }
  }, [dateRange]);

  const totalDays = days.length;
  const dayWidth = 40; // px per day

  if (timelineTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full border-2 border-dashed border-border rounded-xl">
        <p className="text-gray-500 font-medium">No tasks with start and end dates available for timeline.</p>
      </div>
    );
  }

  return (
    <AppCard className="flex flex-col h-full overflow-hidden bg-surface dark:bg-[#0B0F19]">
      <div className="flex-1 overflow-auto relative">
        <div style={{ width: `${250 + totalDays * dayWidth}px` }} className="min-h-full">
          {/* Header Row */}
          <div className="flex sticky top-0 z-20 bg-gray-50 dark:bg-surface/[0.02] border-b border-border">
            <div className="w-[250px] shrink-0 sticky left-0 z-30 bg-gray-50 dark:bg-[#0B0F19] border-r border-border p-3 font-bold text-xs uppercase text-gray-500">
              Task Name
            </div>
            <div className="flex flex-1">
              {days.map((day: Date, i: number) => (
                <div key={i} className={`shrink-0 border-r border-border/50 p-2 text-center text-xs ${isSameDay(day, new Date()) ? 'bg-accent/10 text-accent font-bold' : 'text-gray-500'}`} style={{ width: dayWidth }}>
                  <div>{format(day, 'MMM')}</div>
                  <div className="font-bold text-foreground">{format(day, 'dd')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Rows */}
          <div className="relative">
            {/* Grid lines background */}
            <div className="absolute inset-0 flex ml-[250px] pointer-events-none">
              {days.map((day: Date, i: number) => (
                <div key={i} className={`shrink-0 border-r border-border/50 h-full ${isSameDay(day, new Date()) ? 'bg-accent/5' : ''}`} style={{ width: dayWidth }} />
              ))}
            </div>

            {timelineTasks.map(task => {
              const start = new Date(task.start_date);
              const end = new Date(task.end_date);
              
              const startOffset = Math.max(0, differenceInDays(start, dateRange.start));
              const duration = Math.max(1, differenceInDays(end, start) + 1);
              
              const left = 250 + (startOffset * dayWidth);
              const width = duration * dayWidth;
              
              const isOverdue = end < new Date() && !task.status?.is_closed;

              return (
                <div key={task.id} className="flex relative border-b border-border/30 hover:bg-gray-50/50 dark:hover:bg-surface/[0.02] transition-colors group">
                  {/* Fixed left column */}
                  <div className="w-[250px] shrink-0 sticky left-0 z-10 bg-surface dark:bg-[#0B0F19] border-r border-border p-3 flex flex-col justify-center gap-1 cursor-pointer group-hover:bg-gray-50/80 dark:group-hover:bg-surface/[0.02]" onClick={() => onTaskClick(task)}>
                    <div className="font-bold text-xs text-foreground truncate">{task.title}</div>
                    <div className="text-[10px] text-gray-500 flex justify-between">
                      <span className="truncate">{task.code}</span>
                      <span>{task.status?.name}</span>
                    </div>
                  </div>
                  
                  {/* Timeline area row */}
                  <div className="flex-1 h-14 relative cursor-pointer" onClick={() => onTaskClick(task)}>
                    <div 
                      className={`absolute top-1/2 -translate-y-1/2 h-8 rounded-md shadow-sm border overflow-hidden flex items-center px-2 transition-transform hover:scale-[1.01] ${isOverdue ? 'bg-red-100 border-red-300 text-red-800' : 'bg-accent/20 border-accent/30 text-accent-secondary dark:text-accent'}`}
                      style={{ left: `${left}px`, width: `${width}px` }}
                      title={`${task.title} (${format(start, 'MMM dd')} - ${format(end, 'MMM dd')})`}
                    >
                      {task.progress_percentage !== undefined && (
                        <div 
                          className="absolute left-0 top-0 bottom-0 bg-black/10 mix-blend-multiply" 
                          style={{ width: `${task.progress_percentage}%` }}
                        />
                      )}
                      <span className="relative z-10 text-[10px] font-bold whitespace-nowrap overflow-hidden text-ellipsis w-full">
                        {task.progress_percentage !== undefined ? `${task.progress_percentage}%` : task.title}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppCard>
  );
}
