"use client";

import React, { useState, useTransition } from 'react';
import { RealtimeChat } from '../collaboration/RealtimeChat';
import { handleRequirementUAT } from '@/lib/actions/requirements';
import { EnterpriseDrawerShell } from "@/components/ui/enterprise/EnterpriseDrawerShell";

export function RequirementDetailDrawer({ requirement, onClose }: { requirement: any, onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [uatComment, setUatComment] = useState("");

  if (!requirement) return null;

  const handleUAT = (result: 'PASS' | 'FAIL') => {
    startTransition(async () => {
      // In a real implementation, we fetch the current user's ID
      const userId = 'current-user-uuid'; // Mock
      await handleRequirementUAT(requirement.id, result, uatComment, userId);
      setUatComment("");
    });
  };

  return (
    <EnterpriseDrawerShell
      title={requirement.title}
      subtitle={
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{requirement.requirement_code || 'REQ-0000'}</span>
          <span className="px-2 py-0.5 rounded-md text-xs font-bold" style={{ backgroundColor: `${requirement.status?.status_color}20`, color: requirement.status?.status_color }}>
            {requirement.status?.status_name || 'UNKNOWN'}
          </span>
        </div>
      }
      onClose={onClose}
      size="lg"
    >
      <div className="grid grid-cols-3 gap-8">
            
            {/* Main Content */}
            <div className="col-span-2 space-y-8">
              
              <section className="bg-gray-900/20 rounded-2xl p-6 border border-white/5">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">Business Justification</h3>
                <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                  {requirement.business_justification}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-white">Technical Description & Scope</h3>
                <div className="text-gray-400 text-sm whitespace-pre-wrap leading-relaxed bg-black/20 rounded-xl p-4 border border-white/5">
                  {requirement.description}
                </div>
              </section>

              {/* Implementation Progress */}
              <section className="bg-gray-900/40 rounded-2xl p-6 border border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-white">Implementation Progress</h3>
                  <span className="text-2xl font-bold text-indigo-400">{requirement.completion_percentage}%</span>
                </div>
                <div className="h-2 w-full bg-black rounded-full overflow-hidden mb-6">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-700" 
                    style={{ width: `${requirement.completion_percentage}%` }}
                  />
                </div>
                
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Linked Execution Tasks</h4>
                <div className="space-y-2">
                  {/* Mock Tasks. In real usage, fetch requirement_tasks via component or pass down */}
                  <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                    <span className="text-sm text-gray-300">Database Schema Migration</span>
                    <span className="text-xs font-bold text-green-400 uppercase">Completed</span>
                  </div>
                  <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                    <span className="text-sm text-gray-300">API Layer Implementation</span>
                    <span className="text-xs font-bold text-amber-400 uppercase">In Progress</span>
                  </div>
                </div>
              </section>

              {/* UAT Block (Conditionally visible based on status) */}
              {requirement.status?.status_name === 'UAT' && (
                <section className="bg-amber-900/20 rounded-2xl p-6 border border-amber-500/20">
                  <h3 className="text-sm font-bold text-amber-500 mb-2">User Acceptance Testing (UAT)</h3>
                  <p className="text-xs text-gray-400 mb-4">Implementation complete. Please verify the requirement meets the business justification.</p>
                  <textarea 
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white mb-4 focus:outline-none focus:border-amber-500"
                    placeholder="Enter UAT feedback or rejection reasons..."
                    value={uatComment}
                    onChange={e => setUatComment(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleUAT('PASS')}
                      disabled={isPending}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                      Approve & Close
                    </button>
                    <button 
                      onClick={() => handleUAT('FAIL')}
                      disabled={isPending}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                      Fail & Reopen
                    </button>
                  </div>
                </section>
              )}
              
              {/* Realtime Chat Engine */}
              <section className="h-[500px] flex flex-col border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="bg-gray-900/80 p-4 border-b border-white/5 backdrop-blur-xl">
                  <h3 className="text-sm font-bold text-white">Execution Collaboration</h3>
                </div>
                <div className="flex-1 bg-black/20">
                  <RealtimeChat recordId={requirement.id} moduleType="REQUIREMENT" />
                </div>
              </section>

            </div>

            {/* Sidebar Metadata */}
            <div className="col-span-1 space-y-6">
              
              <div className="bg-gray-900/40 rounded-2xl p-5 border border-white/5 space-y-5">
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-widest">Business Analyst</label>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-900 flex items-center justify-center text-xs font-bold text-indigo-200 border border-indigo-700">
                      {requirement.analyst?.full_name?.charAt(0) || '?'}
                    </div>
                    <span className="text-sm text-gray-200 font-medium">{requirement.analyst?.full_name || 'Unassigned'}</span>
                  </div>
                </div>

                <div className="h-px w-full bg-white/5"></div>

                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-widest">Department</label>
                  <p className="text-sm text-gray-200 mt-1 font-medium">{requirement.department?.name || 'Enterprise Global'}</p>
                </div>
                
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-widest">Priority SLA</label>
                  <p className="text-sm text-gray-200 mt-1 font-medium">{requirement.priority?.priority_name || 'Standard'}</p>
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-widest">Estimations</label>
                  <div className="mt-2 space-y-2 text-sm text-gray-300">
                    <div className="flex justify-between"><span>Hours:</span> <span className="font-bold">{requirement.estimated_hours || 0}</span></div>
                    <div className="flex justify-between"><span>Cost:</span> <span className="font-bold">${requirement.estimated_cost || 0}</span></div>
                  </div>
                </div>
              </div>

              {/* Attachments Placeholder */}
              <div className="bg-gray-900/40 rounded-2xl p-5 border border-white/5">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex justify-between items-center mb-4">
                  Attachments
                  <button className="text-indigo-400 hover:text-indigo-300 p-1 bg-indigo-500/10 rounded-md">+</button>
                </h3>
                <div className="space-y-3">
                  <div className="text-sm text-gray-400 flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-white/5">
                    📄 <span className="truncate">BRD_v1.2.pdf</span>
                  </div>
                  <div className="text-sm text-gray-400 flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-white/5">
                    📊 <span className="truncate">Cost_Analysis.xlsx</span>
                  </div>
                </div>
              </div>
              
            </div>

      </div>
    </EnterpriseDrawerShell>
  );
}
