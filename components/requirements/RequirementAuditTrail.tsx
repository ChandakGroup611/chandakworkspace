"use client";

import React, { useEffect, useState } from 'react';
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from '@/components/ui/AppCard';
import { useTheme } from '@/components/theme/ThemeProvider';
import { Activity, Clock, CheckCircle2, AlertCircle, PlayCircle, Send } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export function RequirementAuditTrail({ requirementId }: { requirementId: string }) {
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);
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
    if (type.includes('INITIATED') || type.includes('CREATED')) return <PlayCircle className="w-4 h-4 text-blue-500" />;
    return <Activity className="w-4 h-4 text-indigo-500" />;
  };

  return (
    <AppCard className={`h-full ${isLightMode ? "bg-white border-gray-200" : "bg-[#0a0a0b] border-white/5"}`}>
      <AppCardHeader className={`border-b ${isLightMode ? "bg-gray-50 border-gray-200" : "bg-white/[0.02] border-white/5"}`}>
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${isLightMode ? "text-indigo-600" : "text-indigo-400"}`} />
          <AppCardTitle className={isLightMode ? "text-gray-900" : "text-white"}>Governance Audit Trail</AppCardTitle>
        </div>
      </AppCardHeader>
      
      <AppCardContent className="p-0">
        <div className="max-h-[400px] overflow-y-auto p-4 custom-scrollbar">
          {events.length === 0 ? (
            <div className={`text-center py-8 text-sm ${isLightMode ? "text-gray-500" : "text-gray-400"}`}>
              No activity recorded yet.
            </div>
          ) : (
            <div className="relative border-l border-indigo-500/20 ml-3 space-y-6 pb-4">
              {events.map((ev, idx) => (
                <div key={ev.id} className="relative pl-6 group">
                  {/* Timeline Dot */}
                  <div className={`absolute -left-[9px] top-1 rounded-full border-2 ${
                    isLightMode ? "bg-white border-indigo-100" : "bg-gray-900 border-indigo-900/50"
                  } p-0.5 group-hover:scale-110 transition-transform`}>
                    {getEventIcon(ev.event_type)}
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-start">
                      <h4 className={`text-sm font-bold ${isLightMode ? "text-gray-900" : "text-gray-100"}`}>
                        {ev.event_type.replace(/_/g, ' ')}
                      </h4>
                      <span className={`text-[10px] font-medium ${isLightMode ? "text-gray-500" : "text-gray-500"}`}>
                        {new Date(ev.created_at).toLocaleString()}
                      </span>
                    </div>

                    <p className={`text-xs ${isLightMode ? "text-gray-600" : "text-gray-400"}`}>
                      {ev.new_value?.message || ev.new_value?.remarks || `Action performed by ${ev.user_master?.full_name || 'System'}`}
                    </p>

                    {ev.new_value?.level && (
                      <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold w-fit ${
                        isLightMode ? "bg-indigo-50 text-indigo-700" : "bg-indigo-500/10 text-indigo-400"
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
