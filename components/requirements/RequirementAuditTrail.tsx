"use client";

import React, { useEffect, useState } from 'react';
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from '@/components/ui/AppCard';
import { useTheme } from '@/components/theme/ThemeProvider';
import { Activity, Clock, CheckCircle2, AlertCircle, PlayCircle, Send, ArrowRight, Tag } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatDateTime } from "@/components/ui/data";

export function RequirementAuditTrail({ requirementId }: { requirementId: string }) {
  const { isLight: isLightMode } = useTheme();
  const supabase = createClient();
  
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      // activity_events.performed_by has no foreign key to user_master, so names are looked up separately.
      const { data } = await supabase
        .from('activity_events')
        .select('*')
        .eq('module_type', 'REQUIREMENT')
        .eq('record_id', requirementId)
        .order('performed_at', { ascending: false });

      const ids = Array.from(new Set((data || []).map((e: any) => e.performed_by).filter(Boolean)));
      const { data: people } = ids.length
        ? await supabase.from('user_master').select('id, full_name, designation_id').in('id', ids)
        : { data: [] as any[] };
      const byId = new Map((people || []).map((p: any) => [p.id, p]));
      setEvents((data || []).map((e: any) => ({ ...e, user_master: byId.get(e.performed_by) || null })));
      setLoading(false);
    }
    fetchEvents();
  }, [requirementId, supabase]);

  if (loading) {
    return <div className="animate-pulse h-32 bg-surface dark:bg-surface rounded-xl"></div>;
  }

  const getEventIcon = (type: string) => {
    if (type.includes('APPROVAL')) return <CheckCircle2 className="w-4 h-4 text-success-text" />;
    if (type.includes('ESCALATION')) return <AlertCircle className="w-4 h-4 text-danger-text" />;
    if (type.includes('INITIATED') || type.includes('CREATED')) return <PlayCircle className="w-4 h-4 text-theme-icon" />;
    if (type === 'FIELD_CHANGED') return <Tag className="w-4 h-4 text-accent-soft-text" />;
    return <Activity className="w-4 h-4 text-theme-icon" />;
  };

  return (
    <AppCard className={`h-full theme-card-structural`}>
      <AppCardHeader className={`border-b bg-elevated border-border`}>
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 text-theme-icon`} />
          <AppCardTitle className={"text-foreground"}>Governance audit trail</AppCardTitle>
        </div>
      </AppCardHeader>
      
      <AppCardContent className="p-0">
        <div className="max-h-[400px] overflow-y-auto p-4 custom-scrollbar">
          {events.length === 0 ? (
            <div className={`text-center py-8 text-sm text-muted`}>
              No activity recorded yet.
            </div>
          ) : (
            <div className="relative border-l border-theme-btn-primary/20 ml-3 space-y-6 pb-4">
              {events.map((ev) => {
                const isFieldChange = ev.event_type === 'FIELD_CHANGED' || (ev.new_value?.field_name && ev.event_type !== 'STATUS_CHANGE');
                const isStatusChange = ev.event_type === 'STATUS_CHANGE';
                const fieldName = ev.new_value?.field_name || ev.old_value?.field_name;
                const oldVal = ev.old_value?.old_val ?? ev.old_value?.old_status_name;
                const newVal = ev.new_value?.new_val ?? ev.new_value?.status_name ?? ev.new_value?.approval_status;
                const actorName = ev.user_master?.full_name || 'System';

                return (
                  <div key={ev.id} className="relative pl-6 group">
                    {/* Timeline Dot */}
                    <div className={`absolute -left-[9px] top-1 rounded-full border-2 theme-card-structural border-border p-0.5 transition-transform`}>
                      {getEventIcon(ev.event_type)}
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-foreground">
                            {isFieldChange
                              ? `${fieldName || 'Field'} changed`
                              : isStatusChange
                              ? 'Status updated'
                              : ev.event_type.replace(/_/g, ' ')}
                          </h4>
                          {fieldName && !isStatusChange && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-accent-soft text-accent-soft-text">
                              {fieldName}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-muted whitespace-nowrap">
                          {formatDateTime(ev.performed_at || ev.created_at)}
                        </span>
                      </div>

                      {/* Field or status value transition */}
                      {(isFieldChange || isStatusChange) && (oldVal !== undefined || newVal !== undefined) ? (
                        <div className="text-xs text-muted flex items-center gap-1.5 flex-wrap my-0.5">
                          {oldVal !== undefined && (
                            <span className="line-through text-muted opacity-80">{String(oldVal || 'None')}</span>
                          )}
                          <ArrowRight className="h-3 w-3 text-muted inline shrink-0" />
                          <span className="font-semibold text-foreground">{String(newVal || 'None')}</span>
                        </div>
                      ) : null}

                      {/* Remarks or fallback message */}
                      {ev.new_value?.message && !isFieldChange && (
                        <p className="text-xs text-muted">
                          {ev.new_value.message}
                        </p>
                      )}

                      {ev.new_value?.remark && (
                        <p className="text-xs italic text-subtle bg-surface/60 rounded px-2 py-1 border border-border/50">
                          &ldquo;{ev.new_value.remark}&rdquo;
                        </p>
                      )}

                      <span className="text-[11px] text-muted">
                        By {actorName}
                      </span>

                      {ev.new_value?.level && (
                        <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold w-fit bg-accent-soft text-theme-icon">
                          Level {ev.new_value.level}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AppCardContent>
    </AppCard>
  );
}

