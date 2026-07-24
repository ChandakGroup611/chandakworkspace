"use client";

import React, { useState } from "react";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/AppCard";
import { Activity, Flame, Info } from "lucide-react";

interface HourData {
  hour: string;
  intensity: number;
  volume: number;
  tasksCreated: number;
  tasksResolved: number;
  workspacesCreated: number;
  workspacesResolved: number;
  ticketsCreated: number;
  ticketsResolved: number;
}

interface HeatmapDay {
  day: string;
  hours: HourData[];
}

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hoursOfDay = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"];

export default function OperationalHeatmap({ activities = [] }: { activities?: any[] }) {
  const [hoveredCell, setHoveredCell] = useState<{ day: string; hour: string; volume: number; data?: HourData } | null>(null);

  const heatmapData = React.useMemo(() => {
    // 1. Initialize matrix
    const matrix: HeatmapDay[] = daysOfWeek.map((day) => ({
      day,
      hours: hoursOfDay.map((hour) => ({ 
        hour, intensity: 0, volume: 0,
        tasksCreated: 0, tasksResolved: 0,
        workspacesCreated: 0, workspacesResolved: 0,
        ticketsCreated: 0, ticketsResolved: 0
      }))
    }));

    if (!activities || activities.length === 0) return matrix;

    // 2. Aggregate activities
    let maxVolume = 0;
    activities.forEach(act => {
      if (!act.rawTimestamp) return;
      const date = new Date(act.rawTimestamp);
      
      // Get day of week (0 = Sunday, 1 = Monday, etc.) using UTC
      let dayIndex = date.getUTCDay() - 1;
      if (dayIndex === -1) dayIndex = 6; // Sunday is last

      const hour = date.getUTCHours();
      // Snap to our 2-hour blocks: 08:00, 10:00, 12:00, 14:00, 16:00, 18:00
      let hourIndex = 0;
      if (hour >= 18) hourIndex = 5;
      else if (hour >= 16) hourIndex = 4;
      else if (hour >= 14) hourIndex = 3;
      else if (hour >= 12) hourIndex = 2;
      else if (hour >= 10) hourIndex = 1;
      else hourIndex = 0; // Anything before 10 goes to 08:00 block

      const cell = matrix[dayIndex].hours[hourIndex];
      cell.volume += 1;
      
      const isResolved = act.status === 'resolved';
      if (act.module === 'tasks') {
         cell.tasksCreated += 1;
         if (isResolved) cell.tasksResolved += 1;
      } else if (act.module === 'tickets') {
         cell.ticketsCreated += 1;
         if (isResolved) cell.ticketsResolved += 1;
      } else if (act.module === 'requirements') {
         cell.workspacesCreated += 1;
         if (isResolved) cell.workspacesResolved += 1;
      }

      if (cell.volume > maxVolume) {
        maxVolume = cell.volume;
      }
    });

    // 3. Calculate intensity (0-100) relative to maxVolume, minimum 1 if volume > 0 for visibility
    matrix.forEach(day => {
      day.hours.forEach(hr => {
        if (hr.volume > 0) {
           hr.intensity = Math.max(30, Math.floor((hr.volume / (maxVolume || 1)) * 100));
        } else {
           hr.intensity = 0;
        }
      });
    });

    return matrix;
  }, [activities]);

  // Return specific mapped background alpha classes dependent on intensity values
  const getCellBg = (intensity: number) => {
    if (intensity > 75) return "bg-rose-500 shadow-md shadow-rose-500/20";
    if (intensity > 50) return "bg-amber-500";
    if (intensity > 25) return "bg-accent/80";
    return "bg-surface/5 hover:bg-surface/10";
  };

  return (
    <AppCard className="flex flex-col h-full">
      <AppCardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-rose-400" />
          <AppCardTitle>Operational Heatmap Matrix</AppCardTitle>
        </div>
        <span className="text-xs text-accent font-bold">Ingress vs SLA Resolution</span>
      </AppCardHeader>

      <AppCardContent className="flex-1 flex flex-col justify-between space-y-4 pt-2">
        {/* Heatmap Grid Architecture */}
        <div className="flex-1 flex flex-col justify-between space-y-2">
          {heatmapData.map((dItem) => (
            <div key={dItem.day} className="flex items-center gap-2">
              <span className="w-8 text-[0.8rem] font-bold text-accent select-none">
                {dItem.day}
              </span>
              <div className="flex-1 grid grid-cols-6 gap-1.5">
                {dItem.hours.map((hItem) => (
                  <div
                    key={hItem.hour}
                    onMouseEnter={() => setHoveredCell({ day: dItem.day, hour: hItem.hour, volume: hItem.volume, data: hItem })}
                    onMouseLeave={() => setHoveredCell(null)}
                    className={`h-7 rounded-md transition-all duration-200 cursor-pointer border border-white/5 hover:scale-105 ${getCellBg(hItem.intensity)}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Dynamic Context Tooltip Frame */}
        <div className="h-8 flex items-center justify-between px-3 rounded-lg bg-black/20 border border-white/5 text-[0.8rem] overflow-x-auto whitespace-nowrap hide-scrollbar">
          {hoveredCell ? (
            <div className="flex items-center gap-2.5 text-gray-300 font-medium animate-in fade-in duration-150">
              <Activity className="h-3 w-3 text-accent shrink-0" />
              <span><strong className="text-foreground">{hoveredCell.day} @ {hoveredCell.hour}</strong></span>
              <span className="text-gray-600">|</span>
              <span className="text-xs">
                Tasks: <strong className="text-foreground">{hoveredCell.data?.tasksCreated || 0}</strong> crt / <strong className="text-emerald-400">{hoveredCell.data?.tasksResolved || 0}</strong> res
              </span>
              <span className="text-gray-600">|</span>
              <span className="text-xs">
                Workspaces: <strong className="text-foreground">{hoveredCell.data?.workspacesCreated || 0}</strong> crt / <strong className="text-emerald-400">{hoveredCell.data?.workspacesResolved || 0}</strong> res
              </span>
              <span className="text-gray-600">|</span>
              <span className="text-xs">
                Tickets: <strong className="text-foreground">{hoveredCell.data?.ticketsCreated || 0}</strong> crt / <strong className="text-emerald-400">{hoveredCell.data?.ticketsResolved || 0}</strong> res
              </span>
            </div>
          ) : (
            <span className="text-gray-500 italic flex items-center gap-1.5">
              <Info className="h-3 w-3 text-gray-600" />
              <span>Hover cells to inspect timeline ingress matrices</span>
            </span>
          )}

          {/* Legend scale indicators */}
          <div className="flex items-center gap-1">
            <span className="text-[0.7rem] text-gray-600 mr-1 select-none">Scale:</span>
            <div className="w-2 h-2 rounded bg-surface/5" />
            <div className="w-2 h-2 rounded bg-accent/80" />
            <div className="w-2 h-2 rounded bg-amber-500" />
            <div className="w-2 h-2 rounded bg-rose-500" />
          </div>
        </div>
      </AppCardContent>
    </AppCard>
  );
}

