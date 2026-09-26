"use client";
import { toast } from 'react-toastify';

import React, { useState, useTransition } from 'react';
import { RealtimeChat } from '../collaboration/RealtimeChat';
import { handleRequirementUAT } from '@/lib/actions/requirements';
import { EnterpriseDrawerShell } from "@/components/ui/enterprise/EnterpriseDrawerShell";
import { ListTodo, MessageSquare, Paperclip } from 'lucide-react';
import { AppButton } from "@/components/ui/AppButton";
import SafeHtml from "@/components/ui/SafeHtml";
import { usePermissions } from "@/hooks/usePermissions";

export function RequirementDetailDrawer({ requirement, onClose }: { requirement: any, onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [uatComment, setUatComment] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "collaboration">("details");
  const { userId, hasPermission, roleCode } = usePermissions();

  if (!requirement) return null;

  const isSuperAdmin = roleCode === "SUPER_ADMIN" || (hasPermission && hasPermission("SUPER_ADMIN"));
  const isAnalystOrRequester = userId ? (requirement.analyst_id === userId || requirement.requester_id === userId || requirement.created_by === userId) : false;
  const canPerformUAT = isSuperAdmin || isAnalystOrRequester || (hasPermission && (hasPermission("REQUIREMENTS_UPDATE") || hasPermission("REQUIREMENTS_MANAGE")));

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

  const attachments = Array.isArray(requirement.attachments) 
    ? requirement.attachments 
    : (Array.isArray(requirement.custom_fields?.attachments) ? requirement.custom_fields.attachments : []);

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
        {/* Main Content */}
        <div className="col-span-1 md:col-span-2 space-y-6">

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
              <section className="theme-card-structural /20 rounded-2xl p-6 border-white/5">
                <h3 className="theme-label text-theme-icon mb-3">Business Justification</h3>
                <div className="theme-data-value text-muted leading-relaxed">
                  <SafeHtml html={requirement.business_justification} />
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="theme-label text-foreground mb-1">Functional Scope</h3>
                <div className="theme-data-value text-muted leading-relaxed theme-card-structural /20 rounded-xl p-4 border-white/5 mb-4">
                  {requirement.functional_scope || requirement.custom_fields?.functional_scope || 'Functional breakdown of the requirement.'}
                </div>
                <h3 className="theme-label text-foreground">Technical Description & Scope</h3>
                <div className="theme-data-value text-muted leading-relaxed theme-card-structural /20 rounded-xl p-4 border-white/5">
                  <SafeHtml html={requirement.description} />
                </div>
              </section>

              {/* UAT Block (Conditionally visible based on status and permissions) */}
              {requirement.status?.status_name === 'UAT' && (
                <section className="bg-amber-900/20 rounded-2xl p-6 border border-amber-500/20">
                  <h3 className="theme-label text-amber-500 mb-2">User Acceptance Testing (UAT)</h3>
                  
                  
                  {canPerformUAT ? (
                    <>
                      <textarea 
                        className="w-full theme-card-structural /40 border-white/10 rounded-xl p-3 text-sm text-foreground mb-4 focus:outline-none focus:border-amber-500 theme-input-structural resize-none"
                        placeholder="Enter UAT feedback or remarks..."
                        rows={3}
                        value={uatComment}
                        onChange={e => setUatComment(e.target.value)}
                      />
                      <div className="flex gap-3">
                        <AppButton 
                          onClick={() => handleUAT('PASS')}
                          disabled={isPending}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
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
                    </>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
                      UAT sign-off is pending review by the assigned Business Analyst or Requester.
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
          
          {activeTab === "collaboration" && (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              {/* Realtime Chat Engine */}
              <section className="h-[500px] flex flex-col border border-white/10 rounded-2xl overflow-hidden ">
                <div className="theme-card-structural p-4 border-b border-white/5">
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
          <div className="flex flex-col p-3 rounded-lg theme-card-structural dark:/10 /60 dark:border-white/10 shadow-sm transition-colors">
            <span className="theme-label text-muted mb-1">Business Analyst</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-theme-btn-primary/20 flex items-center justify-center text-[10px] font-bold text-theme-icon border border-theme-btn-primary/50">
                {requirement.analyst?.full_name?.charAt(0) || '?'}
              </div>
              <span className="theme-data-value text-sm font-semibold text-foreground truncate">{requirement.analyst?.full_name || 'Unassigned'}</span>
            </div>
          </div>
          <div className="flex flex-col p-3 rounded-lg theme-card-structural dark:/10 /60 dark:border-white/10 shadow-sm transition-colors">
            <span className="theme-label text-muted mb-1">Department</span>
            <span className="theme-data-value text-sm font-semibold text-foreground truncate">{requirement.department?.name || 'Enterprise Global'}</span>
          </div>
          <div className="flex flex-col p-3 rounded-lg theme-card-structural dark:/10 /60 dark:border-white/10 shadow-sm transition-colors">
            <span className="theme-label text-muted mb-1">Priority SLA</span>
            <span className="theme-data-value text-sm font-semibold text-foreground truncate">{requirement.priority?.priority_name || 'Standard'}</span>
          </div>
          <div className="flex flex-col p-3 rounded-lg theme-card-structural dark:/10 /60 dark:border-white/10 shadow-sm transition-colors">
            <span className="theme-label text-muted mb-1">Estimations</span>
            <div className="space-y-1 theme-data-value text-sm font-semibold text-foreground mt-1">
              <div className="flex justify-between"><span>Hours:</span> <span>{requirement.estimated_hours || 0}</span></div>
              <div className="flex justify-between"><span>Cost:</span> <span>₹{Number(requirement.estimated_cost || 0).toLocaleString('en-IN')}</span></div>
            </div>
          </div>

          {/* Attachments */}
          <div className="theme-card-structural /40 rounded-2xl p-5 border-white/5">
            <h3 className="theme-label text-muted flex justify-between items-center mb-3">
              <span className="flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" />
                Attachments ({attachments.length})
              </span>
            </h3>
            <div className="space-y-2">
              {attachments.length > 0 ? (
                attachments.map((att: any, idx: number) => (
                  <a
                    key={att.id || idx}
                    href={att.file_url || att.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="theme-data-value text-xs text-muted hover:text-foreground flex items-center gap-2 theme-card-structural /40 p-2 rounded-lg border-white/5 transition-colors"
                  >
                    📄 <span className="truncate">{att.file_name || att.name || `Attachment ${idx + 1}`}</span>
                  </a>
                ))
              ) : (
                <div className="text-xs text-muted italic p-1">No attachments uploaded</div>
              )}
            </div>
          </div>
          
        </div>

      </div>
    </EnterpriseDrawerShell>
  );
}
