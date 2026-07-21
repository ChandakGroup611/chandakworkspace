"use client";

import React, { useEffect, useState } from 'react';
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from '@/components/ui/AppCard';
import { useTheme } from '@/components/theme/ThemeProvider';
import { Activity, Clock, CheckCircle2, AlertCircle, PlayCircle, Send } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export function RequirementAuditTrail({ requirementId }: { requirementId: string }) {
  const { theme } = useTheme();
  const isLightMode = ["light-neumorphic", "glassmorphism", "pure-white"].includes(theme);
  const supabase = createClient();
  
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      const { data } = await supabase
        .from('activity_events')
        .select('*, user_master!performed_by(full_name, designation_id)')
        .eq('module_type', 'REQUIREMENT')
        .eq('record_id', requirementId)
        .order('created_at', { ascending: false });
      
      setEvents(data || []);
      setLoading(false);
    }
    fetchEvents();
  }, [requirementId, supabase]);

  if (loading) {
    return <div className="animate-pulse h-32 bg-gray-100 dark:bg-gray-800 rounded-xl"></div>;
  }

  const getEventIcon = (type: string) => {
    if (type.includes('APPROVAL')) return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (type.includes('ESCALATION')) return <AlertCircle className="w-4 h-4 text-red-500" />;
    if (type.includes('INITIATED') || type.includes('CREATED')) return <PlayCircle className="w-4 h-4 text-accent" />;
    return <Activity className="w-4 h-4 text-accent" />;
  };

  return (
    <AppCard className={`h-full theme-card-structural`}>
      <AppCardHeader className={`border-b bg-elevated border-border`}>
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 text-accent`} />
          <AppCardTitle className={"text-foreground"}>Governance Audit Trail</AppCardTitle>
        </div>
      </AppCardHeader>
      
      <AppCardContent className="p-0">
        <div className="max-h-[400px] overflow-y-auto p-4 custom-scrollbar">
          {events.length === 0 ? (
            <div className={`text-center py-8 text-sm text-muted`}>
              No activity recorded yet.
            </div>
          ) : (
            <div className="relative border-l border-accent/20 ml-3 space-y-6 pb-4">
              {events.map((ev, idx) => (
                <div key={ev.id} className="relative pl-6 group">
                  {/* Timeline Dot */}
                  <div className={`absolute -left-[9px] top-1 rounded-full border-2 ${ "theme-card-structural border-indigo-100" } p-0.5 group-hover:scale-110 transition-transform`}>
                    {getEventIcon(ev.event_type)}
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-start">
                      <h4 className={`text-sm font-bold text-foreground`}>
                        {ev.event_type.replace(/_/g, ' ')}
                      </h4>
                      <span className={`text-[10px] font-medium text-muted`}>
                        {new Date(ev.created_at).toLocaleString()}
                      </span>
                    </div>

                    <p className={`text-xs text-muted`}>
                      {ev.new_value?.message || ev.new_value?.remarks || `Action performed by ${ev.user_master?.full_name || 'System'}`}
                    </p>

                    {ev.new_value?.level && (
                      <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold w-fit ${
                        "bg-accent/10 text-accent"
                      }`}>
                        Level {ev.new_value.level}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AppCardContent>
    </AppCard>
  );
}

