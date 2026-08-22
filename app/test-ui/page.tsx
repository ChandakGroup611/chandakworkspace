"use client";

import React from 'react';
import { Folder, FileText, CheckCircle2, ChevronDown, ChevronRight, Minus } from 'lucide-react';

const hierarchyData = [
  { id: 1, name: "GLOBAL INITIATIVES", type: "folder", iconColor: "#00ff88", owner: "https://i.pravatar.cc/150?u=12", typeText: "", status: "", deadline: "Dec 15, 2023", progress: 95, progressColor: "#00ff88", tasks: "95/120 Tasks", level: 0, expanded: true, hasChildren: true },
  { id: 2, name: "Product Development", type: "folder", iconColor: "#00f0ff", owner: "https://i.pravatar.cc/150?u=24", typeText: "", status: "", deadline: "Dec 15, 2023", progress: 75, progressColor: "#00f0ff", tasks: "45/60 Tasks", level: 1, expanded: true, hasChildren: true },
  { id: 3, name: "Project Alpha", type: "document", iconColor: "#ffaa00", owner: "https://i.pravatar.cc/150?u=35", typeText: "Task", status: "In Progress", statusColor: "#ffaa00", deadline: "", progress: 55, progressColor: "#ffaa00", tasks: "55%", level: 2, expanded: false },
  { id: 4, name: "Platform Revamp", type: "folder", iconColor: "#5555ff", owner: "https://i.pravatar.cc/150?u=46", typeText: "Folder", status: "", deadline: "Jan 20, 2024", progress: 70, progressColor: "#5555ff", tasks: "20/28 Tasks", level: 2, expanded: false, hasChildren: true },
  { id: 5, name: "Market Analysis", type: "document", iconColor: "#aa00ff", owner: "https://i.pravatar.cc/150?u=57", typeText: "Task", status: "On Hold", statusColor: "#aa00ff", deadline: "", progress: 30, progressColor: "#aa00ff", tasks: "30%", level: 2, expanded: false },
  { id: 6, name: "Marketing Campaigns", type: "folder", iconColor: "#ffee00", owner: "https://i.pravatar.cc/150?u=68", typeText: "", status: "", deadline: "Jan 20, 2024", progress: 71, progressColor: "#ffee00", tasks: "32/45 Tasks", level: 1, expanded: false, hasChildren: true },
  { id: 7, name: "Client Onboarding", type: "folder", iconColor: "#ff00a0", owner: "https://i.pravatar.cc/150?u=79", typeText: "", status: "", deadline: "Jan 20, 2024", progress: 72, progressColor: "#ff00a0", tasks: "18/25 Tasks", level: 1, expanded: true, hasChildren: true },
  { id: 8, name: "Client ABC", type: "check", iconColor: "#00ff88", owner: "https://i.pravatar.cc/150?u=80", typeText: "Task", status: "Completed ✓", statusColor: "#00ff88", deadline: "", progress: 100, progressColor: "#00ff88", tasks: "100%", level: 2, expanded: false },
  { id: 9, name: "Internal Wiki", type: "document", iconColor: "#00f0ff", owner: "", typeText: "Document", status: "Active", statusColor: "#00f0ff", deadline: "Jan 20, 2024", progress: 0, progressColor: "transparent", tasks: "", level: 1, expanded: false }
];

const CircularGauge = ({ percentage, color, label }: { percentage: number, color: string, label: string }) => {
  const radius = 35;
  const circumference = Math.PI * radius; 
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[80px] h-[45px] overflow-hidden">
        <svg viewBox="0 0 100 50" className="w-full h-full drop-shadow-md" style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}>
          <path d="M 15 45 A 35 35 0 0 1 85 45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" strokeLinecap="round" />
          <path 
            d="M 15 45 A 35 35 0 0 1 85 45" 
            fill="none" 
            stroke={color} 
            strokeWidth="6" 
            strokeLinecap="round" 
            strokeDasharray={circumference} 
            strokeDashoffset={offset} 
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute bottom-1 w-full text-center text-sm font-bold" style={{ color, textShadow: `0 0 8px ${color}80` }}>
          {percentage}%
        </div>
      </div>
      <div className="text-[10px] text-muted mt-2 text-center max-w-[70px] leading-[1.1] uppercase font-medium">
        {label}
      </div>
    </div>
  );
};

const HierarchyRow = ({ data }: { data: any }) => {
  return (
    <div className="grid grid-cols-[3.5fr_1fr_1fr_1fr_1fr_1.5fr] gap-4 items-center py-3.5 border-b border-border hover:bg-white/[0.02] transition-colors relative group">
      <div className="flex items-center gap-3" style={{ paddingLeft: `${data.level * 28}px` }}>
        <div className="w-4 flex justify-center text-muted">
          {data.hasChildren || data.level === 0 ? (
            data.expanded ? <Minus size={14} className="opacity-80" /> : <ChevronRight size={14} className="opacity-80" />
          ) : null}
        </div>
        <div className="flex justify-center items-center" style={{ filter: `drop-shadow(0 0 5px ${data.iconColor}80)` }}>
          {data.type === 'folder' && <Folder color={data.iconColor} size={18} />}
          {data.type === 'document' && <FileText color={data.iconColor} size={18} />}
          {data.type === 'check' && <CheckCircle2 color={data.iconColor} size={18} />}
        </div>
        <span className={data.level === 0 ? "text-gray-100 font-semibold tracking-wide text-sm" : "text-gray-300 text-sm"}>
          {data.name}
        </span>
      </div>
      
      <div>
        {data.owner && (
          <img src={data.owner} className="w-7 h-7 rounded-full border border-white/20 object-cover" alt="Owner" />
        )}
      </div>

      <div className="flex items-center gap-2">
        {data.typeText && <span className="text-muted text-xs">{data.typeText}</span>}
        {data.status && (
          <span 
            className="px-2.5 py-0.5 rounded-full text-[10px] font-medium border"
            style={{
              color: data.statusColor,
              borderColor: `${data.statusColor}50`,
              backgroundColor: `${data.statusColor}15`,
              boxShadow: `0 0 10px ${data.statusColor}20`
            }}
          >
            {data.status}
          </span>
        )}
      </div>

      <div className="text-muted text-xs font-medium">
        {data.deadline}
      </div>

      <div className="flex items-center">
        {data.progress > 0 && (
          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full"
              style={{ 
                width: `${data.progress}%`, 
                backgroundColor: data.progressColor, 
                boxShadow: `0 0 8px ${data.progressColor}` 
              }}
            />
          </div>
        )}
      </div>

      <div>
        {data.tasks && (
          <span 
            className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold border"
            style={{
              color: data.progressColor,
              borderColor: `${data.progressColor}50`,
              backgroundColor: `${data.progressColor}15`,
              boxShadow: `0 0 12px ${data.progressColor}30`,
              textShadow: `0 0 8px ${data.progressColor}80`
            }}
          >
            [{data.tasks}]
          </span>
        )}
      </div>
    </div>
  );
};

export default function WorkspaceTestingUI() {
  return (
    <div className="min-h-screen relative bg-[#0a0d14] overflow-hidden font-sans text-gray-200">
      {/* Cyberpunk Grid Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.07]" 
             style={{
               backgroundImage: `linear-gradient(to right, #00f0ff 1px, transparent 1px), linear-gradient(to bottom, #00f0ff 1px, transparent 1px)`,
               backgroundSize: '40px 40px',
               transform: 'perspective(600px) rotateX(60deg) scale(2.5) translateY(-20%)',
             }}>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d14] via-transparent to-[#0a0d14] opacity-80"></div>
        <div className="absolute inset-0 bg-surface border border-border/50 text-foreground from-[#0a0d14] via-[#0a0d14]/50 to-[#0a0d14] opacity-80"></div>
        
        {/* Glow Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00f0ff] opacity-10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ff00a0] opacity-10 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-10 pt-14">
        {/* Header Section */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-white mb-6 tracking-wide drop-shadow-md">Project Dashboard</h1>
            <div className="flex gap-8 text-sm text-muted font-medium">
              <div className="relative text-white pb-2 cursor-pointer">
                Overview
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#00f0ff] shadow-[0_0_8px_#00f0ff]"></div>
              </div>
              <div className="pb-2 cursor-pointer hover:text-gray-200 transition-colors">Tasks</div>
              <div className="pb-2 cursor-pointer hover:text-gray-200 transition-colors">Team</div>
              <div className="pb-2 cursor-pointer hover:text-gray-200 transition-colors">Reporting</div>
            </div>
          </div>
          
          {/* Gauges Card */}
          <div className="flex items-center gap-6 px-7 py-5 rounded-2xl border border-border bg-[#121620]/60 shadow-2xl">
            <CircularGauge percentage={95} color="#00f0ff" label="Total Projects Active" />
            <CircularGauge percentage={20} color="#ff00a0" label="Total Tasks Overdue" />
            <CircularGauge percentage={35} color="#00ff88" label="Team Availability" />
          </div>
        </div>

        {/* Hierarchy Table */}
        <div className="bg-[#121620]/70 rounded-2xl border border-border p-6 shadow-2xl">
          <div className="text-[11px] tracking-[0.2em] text-muted mb-6 uppercase font-semibold">Project Hierarchy</div>
          
          <div className="w-full">
            <div className="grid grid-cols-[3.5fr_1fr_1fr_1fr_1fr_1.5fr] gap-4 text-muted pb-3 border-b border-border mb-2 font-medium text-xs">
              <div>Name</div>
              <div>Owner</div>
              <div>Status</div>
              <div>Deadline</div>
              <div>Progress</div>
              <div>Tasks</div>
            </div>
            
            <div className="flex flex-col">
              {hierarchyData.map((row) => (
                <HierarchyRow key={row.id} data={row} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
