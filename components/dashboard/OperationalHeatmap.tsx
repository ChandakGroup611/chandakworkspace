"use client";

import React, { useState } from "react";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/AppCard";
import { Activity, Flame, Info } from "lucide-react";

interface HeatmapDay {
  day: string;
  hours: { hour: string; intensity: number; volume: number }[];
}

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hoursOfDay = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"];

// Generate predictable simulated heatmap data showcasing varying operational activity deterministically to satisfy static SSR hydration parity
const simulatedData: HeatmapDay[] = daysOfWeek.map((day, dIdx) => ({
  day,
  hours: hoursOfDay.map((hour, hIdx) => {
    // Determine activity intensity mapped predictably from hours and weekdays
    const isPeak = (dIdx < 5) && (hIdx >= 1 && hIdx <= 3);
    const volume = isPeak 
      ? 15 + ((dIdx * 5 + hIdx * 7) % 25) 
      : 2 + ((dIdx * 3 + hIdx * 11) % 10);
    const intensity = Math.min(100, Math.floor((volume / 40) * 100));
    return { hour, intensity, volume };
  }),
}));

export default function OperationalHeatmap() {
  const [hoveredCell, setHoveredCell] = useState<{ day: string; hour: string; volume: number } | null>(null);

  // Return specific mapped background alpha classes dependent on intensity values
  const getCellBg = (intensity: number) => {
    if (intensity > 75) return "bg-rose-500 shadow-md shadow-rose-500/20";
    if (intensity > 50) return "bg-amber-500";
    if (intensity > 25) return "bg-blue-500/80";
    return "bg-white/5 hover:bg-white/10";
  };

  return (
    <AppCard className="flex flex-col h-full">
      <AppCardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-rose-400" />
          <AppCardTitle>Operational Heatmap Matrix</AppCardTitle>
        </div>
        <span className="text-[10px] text-gray-500 font-medium">Ingress vs SLA Resolution</span>
      </AppCardHeader>

      <AppCardContent className="flex-1 flex flex-col justify-between space-y-4 pt-2">
        {/* Heatmap Grid Architecture */}
        <div className="flex-1 flex flex-col justify-between space-y-2">
          {simulatedData.map((dItem) => (
            <div key={dItem.day} className="flex items-center gap-2">
              <span className="w-8 text-[11px] font-semibold text-gray-400 select-none">
                {dItem.day}
              </span>
              <div className="flex-1 grid grid-cols-6 gap-1.5">
                {dItem.hours.map((hItem) => (
                  <div
                    key={hItem.hour}
                    onMouseEnter={() => setHoveredCell({ day: dItem.day, hour: hItem.hour, volume: hItem.volume })}
                    onMouseLeave={() => setHoveredCell(null)}
                    className={`h-7 rounded-md transition-all duration-200 cursor-pointer border border-white/5 hover:scale-105 ${getCellBg(hItem.intensity)}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Dynamic Context Tooltip Frame */}
        <div className="h-8 flex items-center justify-between px-3 rounded-lg bg-black/20 border border-white/5 text-[11px]">
          {hoveredCell ? (
            <div className="flex items-center gap-2 text-gray-300 font-medium animate-in fade-in duration-150">
              <Activity className="h-3 w-3 text-blue-400" />
              <span>
                <strong className="text-white">{hoveredCell.day} @ {hoveredCell.hour}</strong> — Measured ingress volume: <strong className="text-white">{hoveredCell.volume} tickets</strong>
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
            <span className="text-[9px] text-gray-600 mr-1 select-none">Scale:</span>
            <div className="w-2 h-2 rounded bg-white/5" />
            <div className="w-2 h-2 rounded bg-blue-500/80" />
            <div className="w-2 h-2 rounded bg-amber-500" />
            <div className="w-2 h-2 rounded bg-rose-500" />
          </div>
        </div>
      </AppCardContent>
    </AppCard>
  );
}
