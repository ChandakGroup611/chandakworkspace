"use client";

import React, { useState } from 'react';
import { RealtimeChat } from '../collaboration/RealtimeChat';
import { EnterpriseDrawerShell } from "@/components/ui/enterprise/EnterpriseDrawerShell";
import { CheckSquare, MessageSquare, ListTodo } from 'lucide-react';
import { AppButton } from "@/components/ui/AppButton";

export function TaskDetailDrawer({ task, onClose }: { task: any, onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"details" | "collaboration">("details");

  if (!task) return null;

  return (
    <EnterpriseDrawerShell
      title={task.subject}
      subtitle={task.workspace?.workspace_name}
      onClose={onClose}
      size="lg"
    >
      <div className="grid grid-cols-3 gap-6">
            
            {/* Main Content */}
            <div className="col-span-2 space-y-6">
              
              {/* Tabs */}
              <div className="flex border-b border-white/10">
                <AppButton
                  onClick={() => setActiveTab("details")}
                  className={`px-4 py-3 text-sm font-bold tracking-wide transition-all border-b-2 -mb-px flex items-center gap-2 ${
                    activeTab === "details"
                      ? "border-accent text-accent"
                      : "border-transparent text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <ListTodo className="w-4 h-4" />
                  Execution Details
                </AppButton>
                <AppButton
                  onClick={() => setActiveTab("collaboration")}
                  className={`px-4 py-3 text-sm font-bold tracking-wide transition-all border-b-2 -mb-px flex items-center gap-2 ${
                    activeTab === "collaboration"
                      ? "border-accent text-accent"
                      : "border-transparent text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Collaboration Chat
                </AppButton>
              </div>

              {activeTab === "details" && (
                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
                  <section>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</h3>
                    <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                      {task.description || "No description provided."}
                    </div>
                  </section>

                  {/* Checklists Placeholder */}
                  <section className="bg-gray-900/20 rounded-xl p-4 border border-white/5">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Checklist</h3>
                    <div className="text-xs text-gray-500">No checklist items yet.</div>
                  </section>
                </div>
              )}

              {activeTab === "collaboration" && (
                <div className="animate-in fade-in zoom-in-95 duration-200">
                  {/* Realtime Chat Engine - Lazy Loaded when tab active */}
                  <section className="h-[500px] flex flex-col border border-white/10 rounded-xl overflow-hidden">
                    <div className="bg-gray-900/50 p-3 border-b border-white/5">
                      <h3 className="text-sm font-semibold text-foreground">Collaboration & Audit</h3>
                    </div>
                    <div className="flex-1 bg-black/20">
                      <RealtimeChat recordId={task.id} moduleType="TASK" />
                    </div>
                  </section>
                </div>
              )}

            </div>

            {/* Sidebar Metadata */}
            <div className="col-span-1 space-y-6">
              <div className="bg-gray-900/40 rounded-xl p-4 border border-white/5 space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Status</label>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.status?.status_color || 'gray' }}></div>
                    <span className="text-sm text-gray-200">{task.status?.status_name || 'Unknown'}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Priority</label>
                  <p className="text-sm text-gray-200 mt-1">{task.priority?.priority_name || 'None'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Task Owner</label>
                  <div className="mt-2 space-y-2">
                    {task.assignee ? (
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <div className="w-6 h-6 rounded-full bg-indigo-900 flex items-center justify-center text-xs font-bold text-indigo-200">
                          {task.assignee.full_name?.charAt(0)}
                        </div>
                        {task.assignee.full_name}
                      </div>
                    ) : <span className="text-xs text-gray-500">Unassigned</span>}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">SLA Target</label>
                  <p className="text-sm text-gray-200 mt-1">{task.priority?.max_sla_hours ? `${task.priority.max_sla_hours} Hours` : 'N/A'}</p>
                </div>
              </div>

              {/* Custom Fields Placeholder */}
              <div className="bg-gray-900/40 rounded-xl p-4 border border-white/5">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex justify-between">
                  Custom Fields
                  <AppButton size="sm" variant="ghost" className="h-6 w-6 p-0 text-accent hover:text-indigo-300 bg-accent/10">+</AppButton>
                </h3>
                <div className="mt-4 space-y-3">
                  {Object.entries(task.custom_fields || {}).map(([key, val]: any) => (
                    <div key={key}>
                      <label className="text-xs text-gray-500 uppercase">{key}</label>
                      <p className="text-sm text-gray-300">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

      </div>
    </EnterpriseDrawerShell>
  );
}
