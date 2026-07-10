"use client";

import React from 'react';
import { AppButton } from "@/components/ui/AppButton";
import { ArrowRight, Plus, Activity } from "lucide-react";

export function WorkspaceGrid({ workspaces }: { workspaces: any[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {workspaces.map(ws => (
        <div key={ws.id} className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:shadow-xl transition-all group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-semibold text-lg text-foreground group-hover:text-accent transition-colors">{ws.workspace_name}</h3>
              <p className="text-xs text-gray-400 mt-1">{ws.workspace_code}</p>
            </div>
            {ws.status && (
              <span 
                className="px-2 py-1 rounded-lg text-xs font-bold tracking-widest uppercase"
                style={{ backgroundColor: `${ws.status.status_color}20`, color: ws.status.status_color }}
              >
                {ws.status.status_name}
              </span>
            )}
          </div>
          
          <p className="text-sm text-gray-500 line-clamp-2 mb-6">
            {ws.description || 'No description provided.'}
          </p>

          <div className="flex justify-between items-center text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <span>Members:</span>
              <span className="text-gray-300 font-medium">{ws.members?.length || 0}</span>
            </div>
            <AppButton variant="ghost" size="sm" className="h-auto p-0 text-accent hover:text-indigo-300 font-medium text-xs">
              Enter Workspace <ArrowRight className="h-3 w-3 ml-1" />
            </AppButton>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WorkspaceConsole({ workspace, tasks }: { workspace: any, tasks: any[] }) {
  // A heavy enterprise execution context dashboard
  return (
    <div className="flex flex-col h-full bg-[#0a0a0b] text-gray-200">
      <header className="p-6 border-b border-white/5 flex justify-between items-center bg-gray-900/20">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{workspace.workspace_name}</h1>
          <p className="text-sm text-gray-500 mt-1">Workspace operations and execution center</p>
        </div>
        <div className="flex gap-4">
          <AppButton variant="secondary" className="px-4 py-2 rounded-xl text-sm font-medium transition-colors" leftIcon={<Activity className="h-4 w-4" />}>
            Check Availability
          </AppButton>
          <AppButton variant="primary" className="px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-secondary transition-colors shadow-lg shadow-indigo-500/20" leftIcon={<Plus className="h-4 w-4" />}>
            New Task
          </AppButton>
        </div>
      </header>
      
      <div className="flex-1 overflow-auto">
        {/* Placeholder for TaskBoard or TaskTimeline */}
        <div className="p-6">
          <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-6 mb-6 flex justify-around">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">{tasks.length}</p>
              <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Total Tasks</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-500">{tasks.filter(t => !t.status?.is_closed).length}</p>
              <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Active</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-500">0</p>
              <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">SLA Breached</p>
            </div>
          </div>
          
          <h2 className="text-lg font-semibold mb-4 text-foreground">Active Tasks Kanban</h2>
          {/* <TaskBoard initialTasks={tasks} statuses={[]} /> */}
        </div>
      </div>
    </div>
  );
}
