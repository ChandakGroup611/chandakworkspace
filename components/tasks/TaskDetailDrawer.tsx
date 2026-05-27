"use client";

import React from 'react';
import { RealtimeChat } from '../collaboration/RealtimeChat';
import { EnterpriseDrawerShell } from "@/components/ui/enterprise/EnterpriseDrawerShell";

export function TaskDetailDrawer({ task, onClose }: { task: any, onClose: () => void }) {
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
            <div className="col-span-2 space-y-8">
              <section>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</h3>
                <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                  {task.description || "No description provided."}
                </div>
              </section>

              {/* Checklists Placeholder */}
              <section className="bg-gray-900/20 rounded-xl p-4 border border-white/5">
                <h3 className="text-sm font-semibold text-white mb-3">Checklist</h3>
                <div className="text-xs text-gray-500">No checklist items yet.</div>
              </section>
              
              {/* Realtime Chat Engine */}
              <section className="h-[400px] flex flex-col border border-white/10 rounded-xl overflow-hidden">
                <div className="bg-gray-900/50 p-3 border-b border-white/5">
                  <h3 className="text-sm font-semibold text-white">Collaboration & Audit</h3>
                </div>
                <div className="flex-1 bg-black/20">
                  <RealtimeChat recordId={task.id} moduleType="TASK" />
                </div>
              </section>
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
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Assignees</label>
                  <div className="mt-2 space-y-2">
                    {task.assignees?.map((a: any) => (
                      <div key={a.user.id} className="flex items-center gap-2 text-sm text-gray-300">
                        <div className="w-6 h-6 rounded-full bg-indigo-900 flex items-center justify-center text-xs font-bold text-indigo-200">
                          {a.user.full_name?.charAt(0)}
                        </div>
                        {a.user.full_name}
                      </div>
                    )) || <span className="text-xs text-gray-500">Unassigned</span>}
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
                  <button className="text-indigo-400 hover:text-indigo-300">+</button>
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
