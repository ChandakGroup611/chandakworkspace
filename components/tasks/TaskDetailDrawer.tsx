"use client";

import React, { useState, useRef, useEffect } from 'react';
import { RealtimeChat } from '../collaboration/RealtimeChat';
import { EnterpriseDrawerShell } from "@/components/ui/enterprise/EnterpriseDrawerShell";
import { CheckSquare, MessageSquare, ListTodo, Edit2, Check, X } from 'lucide-react';
import { AppButton } from "@/components/ui/AppButton";
import SafeHtml from "@/components/ui/SafeHtml";
import { updateTask } from '@/lib/actions/tasks';
import { useRouter } from 'next/navigation';

import { EditableTaskTitle } from './EditableTaskTitle';
export function TaskDetailDrawer({ task, onClose }: { task: any, onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"details" | "collaboration">("details");

  if (!task) return null;

  return (
    <EnterpriseDrawerShell
      title={<EditableTaskTitle task={task} />}
      subtitle={task.workspace?.workspace_name}
      onClose={onClose}
      size="lg"
    >
      <div className="grid grid-cols-3 gap-6">
            
            {/* Main Content */}
            <div className="col-span-2 space-y-6">
              
              {/* Tabs */}
              <div className="flex gap-3 mb-2">
                <AppButton
                  variant={activeTab === "details" ? "primary" : "ghost"}
                  onClick={() => setActiveTab("details")}
                  className={`px-5 py-2 text-sm font-bold tracking-wide transition-all flex items-center gap-2 ${
                    activeTab === "details"
                      ? "shadow-theme-btn-primary/20 shadow-md scale-[1.02]"
                      : "text-muted hover:text-foreground border border-transparent hover:border-border/60"
                  }`}
                >
                  <ListTodo className="w-4 h-4" />
                  Execution Details
                </AppButton>
                <AppButton
                  variant={activeTab === "collaboration" ? "primary" : "ghost"}
                  onClick={() => setActiveTab("collaboration")}
                  className={`px-5 py-2 text-sm font-bold tracking-wide transition-all flex items-center gap-2 ${
                    activeTab === "collaboration"
                      ? "shadow-theme-btn-primary/20 shadow-md scale-[1.02]"
                      : "text-muted hover:text-foreground border border-transparent hover:border-border/60"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Collaboration Chat
                </AppButton>
              </div>

              {activeTab === "details" && (
                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
                  <section>
                    <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-2">Description</h3>
                    <div className="text-muted text-sm leading-relaxed">
                      <SafeHtml html={task.description || "No description provided."} />
                    </div>
                  </section>

                  {/* Checklists Placeholder */}
                  <section className="bg-surface/20 rounded-xl p-4 border border-white/5">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Checklist</h3>
                    <div className="text-xs text-muted">No checklist items yet.</div>
                  </section>
                </div>
              )}

              {activeTab === "collaboration" && (
                <div className="animate-in fade-in zoom-in-95 duration-200">
                  {/* Realtime Chat Engine - Lazy Loaded when tab active */}
                  <section className="h-[500px] flex flex-col border border-white/10 rounded-xl overflow-hidden">
                    <div className="bg-surface/50 p-3 border-b border-white/5">
                      <h3 className="text-sm font-semibold text-foreground">Collaboration & Audit</h3>
                    </div>
                    <div className="flex-1 bg-surface/20">
                      <RealtimeChat recordId={task.id} moduleType="TASK" />
                    </div>
                  </section>
                </div>
              )}

            </div>

            {/* Sidebar Metadata */}
            <div className="col-span-1 space-y-3">
              <div className="flex flex-col p-3 rounded-lg bg-surface/50 dark:bg-surface/10 border border-border/60 dark:border-white/10 shadow-sm transition-colors">
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1">Status</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: task.status?.status_color || 'gray' }}></div>
                  <span className="text-sm font-semibold text-theme-heading truncate">{task.status?.status_name || 'Unknown'}</span>
                </div>
              </div>
              <div className="flex flex-col p-3 rounded-lg bg-surface/50 dark:bg-surface/10 border border-border/60 dark:border-white/10 shadow-sm transition-colors">
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1">Priority</span>
                <span className="text-sm font-semibold text-theme-heading truncate">{task.priority?.priority_name || 'None'}</span>
              </div>
              <div className="flex flex-col p-3 rounded-lg bg-surface/50 dark:bg-surface/10 border border-border/60 dark:border-white/10 shadow-sm transition-colors">
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1">Task Owner</span>
                {task.assignee ? (
                  <div className="flex items-center gap-2 text-sm font-semibold text-theme-heading">
                    <div className="w-6 h-6 rounded-full bg-theme-btn-primary/20 flex items-center justify-center text-[10px] font-bold text-theme-icon border border-theme-btn-primary/50 shrink-0">
                      {task.assignee.full_name?.charAt(0)}
                    </div>
                    <span className="truncate">{task.assignee.full_name}</span>
                  </div>
                ) : <span className="text-sm font-semibold text-muted italic">Unassigned</span>}
              </div>
              <div className="flex flex-col p-3 rounded-lg bg-surface/50 dark:bg-surface/10 border border-border/60 dark:border-white/10 shadow-sm transition-colors">
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1">SLA Target</span>
                <span className="text-sm font-semibold text-theme-heading truncate">{task.priority?.max_sla_hours ? `${task.priority.max_sla_hours} Hours` : 'N/A'}</span>
              </div>

              {/* Custom Fields Placeholder */}
              <div className="bg-surface/40 rounded-xl p-4 border border-white/5">
                <h3 className="text-xs font-bold text-muted uppercase tracking-wider flex justify-between">
                  Custom Fields
                  <AppButton size="sm" variant="ghost" className="h-6 w-6 p-0 text-theme-icon hover:text-theme-btn-primary bg-theme-btn-primary/10">+</AppButton>
                </h3>
                <div className="mt-4 space-y-3">
                  {Object.entries(task.custom_fields || {}).map(([key, val]: any) => (
                    <div key={key}>
                      <label className="text-sm text-muted uppercase">{key}</label>
                      <p className="text-sm text-muted">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

      </div>
    </EnterpriseDrawerShell>
  );
}
