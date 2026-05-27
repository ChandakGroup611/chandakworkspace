"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Activity, Clock, User, ShieldCheck, MessageSquare, AlertTriangle } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

interface TicketActivityStreamProps {
  ticket: any;
}

export function TicketActivityStream({ ticket }: TicketActivityStreamProps) {
  const supabase = createClient();
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze"].includes(theme);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    if (!ticket?.dbId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ticket_activity_stream")
        .select("*")
        .eq("ticket_id", ticket.dbId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (err) {
      console.error("Activity stream fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();

    const channel = supabase
      .channel(`ticket_activity_${ticket.dbId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_activity_stream",
          filter: `ticket_id=eq.${ticket.dbId}`,
        },
        (payload) => {
          setActivities(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticket.dbId]);

  if (loading && activities.length === 0) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className={`h-10 w-10 rounded-full shrink-0 ${isLightMode ? "bg-gray-100" : "bg-white/5"}`} />
            <div className="flex-1 space-y-2 py-2">
              <div className={`h-3 rounded w-1/4 ${isLightMode ? "bg-gray-100" : "bg-white/5"}`} />
              <div className={`h-4 rounded w-3/4 ${isLightMode ? "bg-gray-100" : "bg-white/5"}`} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`relative space-y-8 before:absolute before:left-5 before:top-2 before:bottom-0 before:w-px ${
      isLightMode ? "before:bg-gray-100" : "before:bg-white/5"
    }`}>
      {activities.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm text-gray-500">No activities recorded for this instance.</p>
        </div>
      ) : (
        activities.map((activity) => {
          const Icon = activity.event_type === "COMMENT" ? MessageSquare : 
                       activity.event_type === "STATE_CHANGE" ? ShieldCheck :
                       activity.event_type === "SLA_ESCALATION" ? AlertTriangle : Activity;

          return (
            <div key={activity.id} className="relative flex gap-6 group">
              <div className={`z-10 h-10 w-10 rounded-full flex items-center justify-center shrink-0 border transition-transform duration-300 group-hover:scale-110 ${
                activity.event_type === "SLA_ESCALATION" 
                  ? (isLightMode ? "bg-red-50 border-red-100 text-red-600" : "bg-red-500/10 border-red-500/20 text-red-400") 
                  : (isLightMode ? "bg-white border-gray-100 text-indigo-600 shadow-sm" : "bg-[#0f172a] border-white/5 text-indigo-400")
              }`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 pb-8">
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span className={`text-xs font-bold tracking-wide ${isLightMode ? "text-gray-900" : "text-white"}`}>{activity.actor}</span>
                  <span className="text-xs text-gray-500 font-medium">
                    {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className={`text-sm leading-relaxed ${isLightMode ? "text-gray-600" : "text-gray-400"}`}>
                  {activity.action}
                </p>
                {activity.event_type === "STATE_CHANGE" && (
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-mono line-through">
                      {activity.before_values?.name || "None"}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      isLightMode ? "bg-emerald-50 text-emerald-700" : "bg-emerald-500/10 text-emerald-400"
                    }`}>
                      {activity.after_values?.name || "Unknown"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
