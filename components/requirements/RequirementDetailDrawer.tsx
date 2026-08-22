"use client";
import { toast } from 'react-toastify';

import React, { useState, useTransition } from 'react';
import { RealtimeChat } from '../collaboration/RealtimeChat';
import { handleRequirementUAT } from '@/lib/actions/requirements';
import { EnterpriseDrawerShell } from "@/components/ui/enterprise/EnterpriseDrawerShell";
import { ListTodo, MessageSquare } from 'lucide-react';
import { AppButton } from "@/components/ui/AppButton";
import SafeHtml from "@/components/ui/SafeHtml";

export function RequirementDetailDrawer({ requirement, onClose }: { requirement: any, onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [uatComment, setUatComment] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "collaboration">("details");

  if (!requirement) return null;

  const handleUAT = (result: 'PASS' | 'FAIL') => {
    startTransition(async () => {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Authentication error: Please log in again.");
        return;
      }
      try {
        await handleRequirementUAT(requirement.id, result, uatComment, user.id);
        setUatComment("");
      } catch (err: any) {
        toast.error(err.message || "Failed to submit UAT.");
      }
    });
  };

  return (
    <EnterpriseDrawerShell
      title={requirement.title}
      subtitle={
        <div className="flex items-center gap-3 mt-2">
          <span className="theme-label text-muted">{requirement.requirement_code || 'REQ-0000'}</span>
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
            <div className="col-span-2 space-y-6">

              {/* Tabs */}
              <div className="flex gap-3 mb-2">
                <AppButton
                  variant={activeTab === "details" ? "primary" : "ghost"}
                  onClick={() => setActiveTab("details")}
                  className={`theme-tab-standard tracking-wide ${
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
                  className={`theme-tab-standard tracking-wide ${
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
                  <section className="bg-surface/20 rounded-2xl p-6 border border-white/5">
                    <h3 className="theme-label text-theme-icon mb-3">Business Justification</h3>
                    <div className="theme-data-value text-muted leading-relaxed">
                      <SafeHtml html={requirement.business_justification} />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="theme-label text-foreground mb-1">Functional Scope</h3>
          <div className="theme-data-value text-muted leading-relaxed bg-surface/20 rounded-xl p-4 border border-white/5 mb-4">
            {requirement.functional_scope || requirement.custom_fields?.functional_scope || 'Functional breakdown of the requirement.'}
          </div>
          <h3 className="theme-label text-foreground">Technical Description & Scope</h3>
                    <div className="theme-data-value text-muted leading-relaxed bg-surface/20 rounded-xl p-4 border border-white/5">
                      <SafeHtml html={requirement.description} />
                    </div>
                  </section>

                  {/* Implementation Progress */}
                  <section className="bg-surface/40 rounded-2xl p-6 border border-white/5">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="theme-label text-foreground">Implementation Progress</h3>
                      <span className="text-2xl font-bold text-theme-icon">{requirement.completion_percentage}%</span>
                    </div>
                    <div className="h-2 w-full bg-surface rounded-full overflow-hidden mb-6">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-700" 
                        style={{ width: `${requirement.completion_percentage}%` }}
                      />
                    </div>
                    
                    <h4 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Linked Execution Tasks</h4>
                    <div className="space-y-2">
                      {/* Mock Tasks. In real usage, fetch requirement_tasks via component or pass down */}
                      <div className="flex justify-between items-center bg-surface/40 p-3 rounded-xl border border-white/5">
                        <span className="theme-data-value text-muted">Database Schema Migration</span>
                        <span className="text-xs font-bold text-green-400 uppercase">Completed</span>
                      </div>
                      <div className="flex justify-between items-center bg-surface/40 p-3 rounded-xl border border-white/5">
                        <span className="theme-data-value text-muted">API Layer Implementation</span>
                        <span className="text-xs font-bold text-amber-400 uppercase">In Progress</span>
                      </div>
                    </div>
                  </section>

                  {/* UAT Block (Conditionally visible based on status) */}
                  {requirement.status?.status_name === 'UAT' && (
                    <section className="bg-amber-900/20 rounded-2xl p-6 border border-amber-500/20">
                      <h3 className="theme-label text-amber-500 mb-2">User Acceptance Testing (UAT)</h3>
                      <p className="text-xs text-muted mb-4">Implementation complete. Please verify the requirement meets the business justification.</p>
                      <textarea 
                        className="w-full bg-surface/40 border border-white/10 rounded-xl p-3 text-sm text-white mb-4 focus:outline-none focus:border-amber-500 theme-input-structural text-foreground"
                        placeholder="Enter UAT feedback or rejection reasons..."
                        value={uatComment}
                        onChange={e => setUatComment(e.target.value)}
                      />
                      <div className="flex gap-3">
                        <AppButton 
                          onClick={() => handleUAT('PASS')}
                          disabled={isPending}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Approve & Close
                        </AppButton>
                        <AppButton 
                          onClick={() => handleUAT('FAIL')}
                          disabled={isPending}
                          variant="destructive"
                        >
                          Fail & Reopen
                        </AppButton>
                      </div>
                    </section>
                  )}
                </div>
              )}
              
              {activeTab === "collaboration" && (
                <div className="animate-in fade-in zoom-in-95 duration-200">
                  {/* Realtime Chat Engine */}
                  <section className="h-[500px] flex flex-col border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="bg-surface/80 p-4 border-b border-white/5">
                      <h3 className="theme-label text-foreground">Execution Collaboration</h3>
                    </div>
                    <div className="flex-1 bg-surface/20">
                      <RealtimeChat recordId={requirement.id} moduleType="REQUIREMENT" />
                    </div>
                  </section>
                </div>
              )}

            </div>

            {/* Sidebar Metadata */}
            <div className="col-span-1 space-y-3">
              <div className="flex flex-col p-3 rounded-lg bg-surface/50 dark:bg-surface/10 border border-border/60 dark:border-white/10 shadow-sm transition-colors">
                <span className="theme-label text-muted mb-1">Business Analyst</span>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-theme-btn-primary/20 flex items-center justify-center text-[10px] font-bold text-theme-icon border border-theme-btn-primary/50">
                    {requirement.analyst?.full_name?.charAt(0) || '?'}
                  </div>
                  <span className="theme-data-value font-semibold text-theme-heading truncate">{requirement.analyst?.full_name || 'Unassigned'}</span>
                </div>
              </div>
              <div className="flex flex-col p-3 rounded-lg bg-surface/50 dark:bg-surface/10 border border-border/60 dark:border-white/10 shadow-sm transition-colors">
                <span className="theme-label text-muted mb-1">Department</span>
                <span className="theme-data-value font-semibold text-theme-heading truncate">{requirement.department?.name || 'Enterprise Global'}</span>
              </div>
              <div className="flex flex-col p-3 rounded-lg bg-surface/50 dark:bg-surface/10 border border-border/60 dark:border-white/10 shadow-sm transition-colors">
                <span className="theme-label text-muted mb-1">Priority SLA</span>
                <span className="theme-data-value font-semibold text-theme-heading truncate">{requirement.priority?.priority_name || 'Standard'}</span>
              </div>
              <div className="flex flex-col p-3 rounded-lg bg-surface/50 dark:bg-surface/10 border border-border/60 dark:border-white/10 shadow-sm transition-colors">
                <span className="theme-label text-muted mb-1">Estimations</span>
                <div className="space-y-1 theme-data-value font-semibold text-theme-heading mt-1">
                  <div className="flex justify-between"><span>Hours:</span> <span>{requirement.estimated_hours || 0}</span></div>
                  <div className="flex justify-between"><span>Cost:</span> <span>${requirement.estimated_cost?.toLocaleString() || 0}</span></div>
                </div>
              </div>

              {/* Attachments Placeholder */}
              <div className="bg-surface/40 rounded-2xl p-5 border border-white/5">
                <h3 className="theme-label text-muted flex justify-between items-center mb-4">
                  Attachments
                  <AppButton size="sm" variant="ghost" className="text-theme-icon hover:text-indigo-300 p-1 bg-theme-btn-primary/10">+</AppButton>
                </h3>
                <div className="space-y-3">
                  <div className="theme-data-value text-muted flex items-center gap-2 bg-surface/40 p-2 rounded-lg border border-white/5">
                    📄 <span className="truncate">BRD_v1.2.pdf</span>
                  </div>
                  <div className="theme-data-value text-muted flex items-center gap-2 bg-surface/40 p-2 rounded-lg border border-white/5">
                    📊 <span className="truncate">Cost_Analysis.xlsx</span>
                  </div>
                </div>
              </div>
              
            </div>

      </div>
    </EnterpriseDrawerShell>
  );
}
