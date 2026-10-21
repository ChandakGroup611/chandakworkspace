"use client";
import { toast } from 'react-toastify';

import React, { useState, useTransition } from 'react';
import { RealtimeChat } from '../collaboration/RealtimeChat';
import { handleRequirementUAT } from '@/lib/actions/requirements';
import { EnterpriseDrawerShell } from "@/components/ui/enterprise/EnterpriseDrawerShell";
import { ListTodo, MessageSquare, Paperclip, Eye, Download, FileText } from 'lucide-react';
import { AppButton } from "@/components/ui/AppButton";
import { AppBadge } from "@/components/ui/AppBadge";
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
        toast.error("Authentication error: please log in again.");
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
          <span className="theme-label font-mono font-bold text-foreground">{requirement.requirement_code || 'REQ-0000'}</span>
          <AppBadge 
            variant={requirement.status?.status_color ? "custom" : "neutral"} 
            customColor={requirement.status?.status_color || null}
            isOutline={true}
            className="text-xs"
          >
            {requirement.status?.status_name || 'UNKNOWN'}
          </AppBadge>
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
              type="button"
              variant={activeTab === "details" ? "primary" : "ghost"}
              onClick={() => setActiveTab("details")}
            >
              <ListTodo className="w-4 h-4 mr-2" />
              Execution details
            </AppButton>
            <AppButton
              type="button"
              variant={activeTab === "collaboration" ? "primary" : "ghost"}
              onClick={() => setActiveTab("collaboration")}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Collaboration chat
            </AppButton>
          </div>

          {activeTab === "details" && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
              <section className="bg-surface rounded-2xl p-6 border border-border">
                <h3 className="theme-label text-theme-icon mb-3">Business justification</h3>
                <div className="theme-data-value text-muted leading-relaxed">
                  <SafeHtml html={requirement.business_justification} />
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="theme-label text-foreground mb-1">Functional scope</h3>
                <div className="theme-data-value text-muted leading-relaxed bg-surface rounded-xl p-4 border border-border mb-4">
                  {requirement.functional_scope || requirement.custom_fields?.functional_scope || 'Functional breakdown of the requirement.'}
                </div>
                <h3 className="theme-label text-foreground">Technical description & scope</h3>
                <div className="theme-data-value text-muted leading-relaxed bg-surface rounded-xl p-4 border border-border">
                  <SafeHtml html={requirement.description} />
                </div>
              </section>

              {/* UAT Block (Conditionally visible based on status and permissions) */}
              {requirement.status?.status_name === 'UAT' && (
                <section className="bg-warning-soft rounded-2xl p-6 border border-warning/30">
                  <h3 className="theme-label text-warning mb-2">User acceptance testing (UAT)</h3>
                  
                  
                  {canPerformUAT ? (
                    <>
                      <textarea 
                        className="w-full bg-surface border border-border rounded-xl p-3 text-sm text-foreground mb-4 focus:outline-none focus:border-theme-btn-primary resize-none"
                        placeholder="Enter UAT feedback or remarks…"
                        rows={3}
                        value={uatComment}
                        onChange={e => setUatComment(e.target.value)}
                      />
                      <div className="flex gap-3">
                        <AppButton 
                          type="button"
                          variant="primary"
                          onClick={() => handleUAT('PASS')}
                          disabled={isPending}
                          className="bg-success hover:bg-success text-primary-foreground font-semibold border-none"
                        >
                          Approve & close
                        </AppButton>
                        <AppButton 
                          type="button"
                          onClick={() => handleUAT('FAIL')}
                          disabled={isPending}
                          variant="destructive"
                        >
                          Fail & reopen
                        </AppButton>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 rounded-xl bg-warning-soft border border-warning/30 text-xs text-warning-text">
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
              <section className="h-[500px] flex flex-col border border-border rounded-2xl overflow-hidden">
                <div className="bg-surface p-4 border-b border-border">
                  <h3 className="theme-label text-foreground">Execution collaboration</h3>
                </div>
                <div className="flex-1 bg-surface">
                  <RealtimeChat recordId={requirement.id} moduleType="REQUIREMENT" />
                </div>
              </section>
            </div>
          )}

        </div>

        {/* Sidebar Metadata */}
        <div className="col-span-1 space-y-3">
          <div className="flex flex-col p-3 rounded-lg bg-surface border border-border shadow-sm">
            <span className="theme-label text-muted mb-1">Business analyst</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-accent-soft flex items-center justify-center text-[11px] font-bold text-theme-icon border border-theme-btn-primary/50">
                {requirement.analyst?.full_name?.charAt(0) || '?'}
              </div>
              <span className="theme-data-value text-sm font-semibold text-foreground truncate">{requirement.analyst?.full_name || 'Unassigned'}</span>
            </div>
          </div>
          <div className="flex flex-col p-3 rounded-lg bg-surface border border-border shadow-sm">
            <span className="theme-label text-muted mb-1">Department</span>
            <span className="theme-data-value text-sm font-semibold text-foreground truncate">{requirement.department?.name || 'Enterprise Global'}</span>
          </div>
          <div className="flex flex-col p-3 rounded-lg bg-surface border border-border shadow-sm">
            <span className="theme-label text-muted mb-1">Priority SLA</span>
            <span className="theme-data-value text-sm font-semibold text-foreground truncate">{requirement.priority?.priority_name || 'Standard'}</span>
          </div>
          <div className="flex flex-col p-3 rounded-lg bg-surface border border-border shadow-sm">
            <span className="theme-label text-muted mb-1">Estimations</span>
            <div className="space-y-1 theme-data-value text-sm font-semibold text-foreground mt-1">
              <div className="flex justify-between"><span>Hours:</span> <span>{requirement.estimated_hours || 0}</span></div>
              <div className="flex justify-between"><span>Cost:</span> <span>₹{Number(requirement.estimated_cost || 0).toLocaleString('en-IN')}</span></div>
            </div>
          </div>

          {/* Attachments */}
          <div className="bg-surface rounded-xl p-4 border border-border">
            <h3 className="theme-label flex justify-between items-center mb-3">
              <span className="flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" />
                Attachments ({attachments.length})
              </span>
            </h3>
            <div className="space-y-2">
              {attachments.length > 0 ? (
                attachments.map((att: any, idx: number) => {
                  const fileName = att.file_name || att.name || `Attachment_${idx + 1}`;
                  const fileId = att.id || att.file_name || att.storage_path;
                  const viewUrl = fileId ? `/api/proxy-attachment/${encodeURIComponent(fileId)}` : (att.file_url || att.url || '#');
                  const downloadUrl = fileId ? `/api/proxy-attachment/${encodeURIComponent(fileId)}?download=1` : (att.file_url || att.url || '#');

                  return (
                    <div
                      key={att.id || idx}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-surface/50 hover:bg-surface transition-colors gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="truncate">
                          <p className="text-xs font-semibold text-foreground truncate" title={fileName}>
                            {fileName}
                          </p>
                          {att.file_size ? (
                            <p className="text-[11px] text-muted-foreground">
                              {(att.file_size / 1024).toFixed(1)} KB
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <AppButton
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(viewUrl, '_blank', 'noopener,noreferrer')}
                          className="h-6 text-xs px-2 text-theme-icon border-border gap-1 font-semibold"
                          title="View document"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View</span>
                        </AppButton>
                        <AppButton
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = downloadUrl;
                            a.download = fileName;
                            a.target = '_blank';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground border-border gap-1 font-semibold"
                          title="Download document"
                        >
                          <Download className="h-3 w-3" />
                          <span>Download</span>
                        </AppButton>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-muted-foreground italic p-1">No attachments uploaded</div>
              )}
            </div>
          </div>
          
        </div>

      </div>
    </EnterpriseDrawerShell>
  );
}
