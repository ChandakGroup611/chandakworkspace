"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Activity, Clock, User, ShieldCheck, MessageSquare, AlertTriangle, Calendar, UserCheck, Flame, Tag, ArrowRight } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { AppBadge } from "@/components/ui/AppBadge";

interface TicketActivityStreamProps {
  ticket: any;
}

export function TicketActivityStream({ ticket }: TicketActivityStreamProps) {
  const supabase = createClient();
  const { isLight: isLightMode } = useTheme();
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
      
      const rawData = data || [];
      if (rawData.length === 0) {
        setActivities([]);
        return;
      }
      
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const rawActorIds = [...new Set(rawData.map((n: any) => n.actor).filter(Boolean))];
      const validActorUuids = rawActorIds.filter((id) => typeof id === "string" && UUID_REGEX.test(id));

      if (validActorUuids.length > 0) {
        const { data: userData } = await supabase
          .from("user_master")
          .select("id, full_name")
          .in("id", validActorUuids);
          
        if (userData) {
          const userMap = Object.fromEntries(userData.map((u: any) => [u.id, u.full_name]));
          const mappedData = rawData.map((n: any) => ({
            ...n,
            actor_name: userMap[n.actor] || n.before_values?.actor_name || n.after_values?.actor_name || n.actor
          }));
          setActivities(mappedData);
          return;
        }
      }
      
      setActivities(rawData.map((n: any) => ({
        ...n,
        actor_name: n.before_values?.actor_name || n.after_values?.actor_name || n.actor
      })));
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
            <div className="h-10 w-10 rounded-full shrink-0 bg-elevated" />
            <div className="flex-1 space-y-2 py-2">
              <div className="h-3 rounded w-1/4 bg-elevated" />
              <div className="h-4 rounded w-3/4 bg-elevated" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const getEventBadge = (activity: any) => {
    const et = activity.event_type;
    if (et === "STATE_CHANGE") {
      return { icon: ShieldCheck, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", label: "Status Change" };
    }
    if (et === "PRIORITY_CHANGE") {
      return { icon: Flame, color: "text-rose-500 bg-rose-500/10 border-rose-500/20", label: "Priority" };
    }
    if (et === "ASSIGNMENT") {
      return { icon: UserCheck, color: "text-primary bg-primary/10 border-primary/20", label: "Reassignment" };
    }
    if (et === "DUE_DATE_CHANGE") {
      return { icon: Calendar, color: "text-purple-500 bg-purple-500/10 border-purple-500/20", label: "Due Date" };
    }
    if (et === "COMMENT") {
      return { icon: MessageSquare, color: "text-sky-500 bg-sky-500/10 border-sky-500/20", label: "Remark" };
    }
    if (et === "SLA_ESCALATION") {
      return { icon: AlertTriangle, color: "text-amber-500 bg-amber-500/10 border-amber-500/20", label: "SLA Alert" };
    }
    return { icon: Activity, color: "text-muted bg-surface border-border", label: "Update" };
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata"
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="relative space-y-6 before:absolute before:left-5 before:top-2 before:bottom-0 before:w-px before:bg-border">
      {activities.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-muted">No activities recorded for this ticket.</p>
        </div>
      ) : (
        activities.map((activity) => {
          const badge = getEventBadge(activity);
          const Icon = badge.icon;
          const diffs: any[] = activity.before_values?.diffs || activity.after_values?.diffs || [];
          const remark = activity.after_values?.remark;

          return (
            <div key={activity.id} className="relative flex gap-4 group">
              <div className={`z-10 h-10 w-10 rounded-full flex items-center justify-center shrink-0 border shadow-xs ${badge.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 rounded-lg border border-border bg-surface p-3.5 shadow-xs transition-colors hover:border-border-active">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{activity.actor_name || activity.actor || "Team Member"}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted font-mono">
                    {formatTimestamp(activity.created_at)}
                  </span>
                </div>

                {/* Status Transition Display */}
                {activity.event_type === "STATE_CHANGE" && (
                  <div className="mt-2.5 flex items-center gap-2 text-xs">
                    <span className="font-medium text-subtle">Status:</span>
                    <span className="text-muted font-mono line-through bg-sunken px-2 py-0.5 rounded">
                      {activity.before_values?.name || activity.before_values?.status_name || "None"}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted shrink-0" />
                    <span className="font-semibold text-success-text bg-success-soft border border-success-border px-2 py-0.5 rounded">
                      {activity.after_values?.name || activity.after_values?.status_name || "Unknown"}
                    </span>
                  </div>
                )}

                {/* Field-level diffs comparison table */}
                {diffs.length > 0 && (
                  <div className="mt-2.5 space-y-1.5">
                    {diffs.map((d: any, idx: number) => (
                      <div key={idx} className="flex flex-wrap items-center gap-2 text-xs py-1 px-2 rounded bg-sunken/60 border border-border/50">
                        <span className="font-semibold text-foreground/80 w-24 shrink-0">{d.field}:</span>
                        <span className="text-muted font-mono line-through truncate max-w-[140px] sm:max-w-[200px]" title={d.old_value}>
                          {d.old_value || "None"}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted shrink-0" />
                        <span className="font-semibold text-primary truncate max-w-[160px] sm:max-w-[220px]" title={d.new_value}>
                          {d.new_value || "None"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action summary fallback if no diffs array */}
                {activity.event_type !== "STATE_CHANGE" && diffs.length === 0 && (
                  <p className="text-xs text-foreground/90 mt-2 leading-relaxed">
                    {activity.action}
                  </p>
                )}

                {/* Remarks display if present */}
                {remark && (
                  <div className="mt-2 pt-2 border-t border-border/40 text-xs text-subtle flex items-start gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-muted shrink-0 mt-0.5" />
                    <span className="italic">&ldquo;{remark}&rdquo;</span>
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

