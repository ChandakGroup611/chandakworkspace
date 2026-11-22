"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { 
  Activity, 
  Clock, 
  User, 
  ShieldCheck, 
  MessageSquare, 
  AlertTriangle, 
  Calendar, 
  UserCheck, 
  Flame, 
  PlusCircle,
  Edit,
  ArrowRight,
  Loader2
} from "lucide-react";
import { formatDateTime } from "@/components/ui/data";

interface TicketActivityStreamProps {
  ticket: any;
}

interface ActivityItem {
  id: string;
  source: "stream" | "audit" | "comment";
  actor_name: string;
  event_type: string;
  action: string;
  diffs: Array<{ field: string; old_value: any; new_value: any }>;
  remark?: string;
  created_at: string;
  old_status?: string;
  new_status?: string;
  initial_details?: Record<string, any>;
}

const IGNORED_DIFF_KEYS = new Set([
  'id', 'created_at', 'updated_at', 'search_vector', 'fts', 'ticket_id',
  'is_deleted', 'metadata', 'embedding', 'actor_name', 'diffs', 'remark'
]);

const FRIENDLY_FIELD_NAMES: Record<string, string> = {
  title: "Title",
  description: "Description",
  status_id: "Status",
  status: "Status",
  priority: "Priority",
  assigned_to: "Assignee",
  assignee: "Assignee",
  assignee_id: "Assignee",
  department_id: "Department",
  category_id: "Category",
  due_date: "Due Date",
  resolution_notes: "Resolution Notes",
  code: "Ticket Code",
  estimated_hours: "Estimated Hours",
  parent_id: "Parent Ticket"
};

export function TicketActivityStream({ ticket }: TicketActivityStreamProps) {
  const supabase = createClient();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const extractDiffsFromAudit = useCallback((log: any): { 
    diffs: Array<{ field: string; old_value: any; new_value: any }>;
    remark?: string;
    old_status?: string;
    new_status?: string;
    initial_details?: Record<string, any>;
  } => {
    let diffs: Array<{ field: string; old_value: any; new_value: any }> = [];
    let remark: string | undefined = log.after_values?.remark || undefined;
    let old_status: string | undefined = undefined;
    let new_status: string | undefined = undefined;
    let initial_details: Record<string, any> | undefined = undefined;

    // Check if diffs array exists directly
    if (Array.isArray(log.after_values?.diffs)) {
      diffs = log.after_values.diffs;
      return { diffs, remark, old_status, new_status, initial_details };
    }
    if (Array.isArray(log.before_values?.diffs)) {
      diffs = log.before_values.diffs;
      return { diffs, remark, old_status, new_status, initial_details };
    }

    // Status change operation
    if (log.operation === 'STATUS_CHANGE' || log.before_values?.status_name || log.after_values?.status_name) {
      old_status = log.before_values?.status_name || log.before_values?.name || log.before_values?.status;
      new_status = log.after_values?.status_name || log.after_values?.name || log.after_values?.status;
      if (old_status || new_status) {
        diffs.push({
          field: "Status",
          old_value: old_status || "Unknown",
          new_value: new_status || "Unknown"
        });
      }
      return { diffs, remark, old_status, new_status, initial_details };
    }

    // Creation event
    if (log.operation === 'CREATE') {
      const snap = log.after_values || {};
      initial_details = {
        code: snap.code || ticket?.code,
        title: snap.title || ticket?.title,
        priority: snap.priority || ticket?.priority,
        status: snap.status_name || snap.status || "New"
      };
      return { diffs, remark, old_status, new_status, initial_details };
    }

    // Snapshot comparison for DB trigger logs
    if (log.before_values && log.after_values && typeof log.before_values === 'object' && typeof log.after_values === 'object') {
      const allKeys = Array.from(new Set([...Object.keys(log.before_values), ...Object.keys(log.after_values)]));
      for (const key of allKeys) {
        if (IGNORED_DIFF_KEYS.has(key)) continue;
        const bVal = log.before_values[key];
        const aVal = log.after_values[key];
        if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
          diffs.push({
            field: FRIENDLY_FIELD_NAMES[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            old_value: bVal === null || bVal === undefined ? "None" : String(bVal),
            new_value: aVal === null || aVal === undefined ? "None" : String(aVal)
          });
        }
      }
    }

    return { diffs, remark, old_status, new_status, initial_details };
  }, [ticket]);

  const fetchActivities = useCallback(async () => {
    const ticketId = ticket?.dbId || ticket?.id;
    if (!ticketId) return;
    setLoading(true);

    try {
      const [streamRes, auditRes, commentsRes] = await Promise.all([
        supabase
          .from("ticket_activity_stream")
          .select("*")
          .eq("ticket_id", ticketId)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("ticket_audit_logs")
          .select(`
            id,
            operation,
            before_values,
            after_values,
            created_at,
            actor_id,
            actor:user_master!actor_id(full_name, email)
          `)
          .eq("ticket_id", ticketId)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("ticket_comments")
          .select(`
            id,
            content,
            created_at,
            author_id,
            author:user_master(full_name, email)
          `)
          .eq("ticket_id", ticketId)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(100)
      ]);

      const streamRows = streamRes.data || [];
      const auditRows = auditRes.data || [];
      const commentRows = commentsRes.data || [];

      // Collect user IDs needing full_name resolution
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const actorIdsToFetch: string[] = [];
      streamRows.forEach((r: any) => {
        if (r.actor && UUID_REGEX.test(r.actor)) actorIdsToFetch.push(r.actor);
      });
      auditRows.forEach((r: any) => {
        if (r.actor_id && UUID_REGEX.test(r.actor_id) && !r.actor?.full_name) actorIdsToFetch.push(r.actor_id);
      });

      let userMap: Record<string, string> = {};
      const uniqueActorIds = Array.from(new Set(actorIdsToFetch));
      if (uniqueActorIds.length > 0) {
        const { data: users } = await supabase
          .from("user_master")
          .select("id, full_name")
          .in("id", uniqueActorIds);
        if (users) {
          userMap = Object.fromEntries(users.map((u: any) => [u.id, u.full_name]));
        }
      }

      const normalizedList: ActivityItem[] = [];

      // 1. Process ticket_activity_stream
      streamRows.forEach((row: any) => {
        const diffs = row.before_values?.diffs || row.after_values?.diffs || [];
        const remark = row.after_values?.remark;
        const old_status = row.before_values?.name || row.before_values?.status_name;
        const new_status = row.after_values?.name || row.after_values?.status_name;

        normalizedList.push({
          id: `stream-${row.id}`,
          source: "stream",
          actor_name: userMap[row.actor] || row.before_values?.actor_name || row.after_values?.actor_name || "Team Member",
          event_type: row.event_type || "UPDATE",
          action: row.action || "updated the ticket",
          diffs,
          remark,
          created_at: row.created_at,
          old_status,
          new_status
        });
      });

      // 2. Process ticket_audit_logs (deduplicate against stream if timestamps match within 2.5s)
      auditRows.forEach((row: any) => {
        const rowTime = new Date(row.created_at).getTime();
        const isDuplicate = normalizedList.some(item => {
          const itemTime = new Date(item.created_at).getTime();
          return Math.abs(itemTime - rowTime) < 2500 && (item.event_type === row.operation || item.source === "stream");
        });

        if (isDuplicate) return;

        const { diffs, remark, old_status, new_status, initial_details } = extractDiffsFromAudit(row);
        let action = "updated the ticket";
        if (row.operation === 'CREATE') {
          action = "created the ticket";
        } else if (row.operation === 'STATUS_CHANGE') {
          action = old_status && new_status 
            ? `changed status from "${old_status}" to "${new_status}"`
            : "updated ticket status";
        } else if (row.operation === 'PRIORITY_CHANGE') {
          action = "updated priority";
        } else if (row.operation === 'ASSIGNMENT') {
          action = "updated ticket assignment";
        } else if (row.operation === 'DUE_DATE_CHANGE') {
          action = "updated ticket due date";
        } else if (diffs.length > 0) {
          action = `updated ${diffs.map(d => d.field).join(", ")}`;
        }

        const actorName = (row.actor as any)?.full_name || userMap[row.actor_id] || "System Administrator";

        normalizedList.push({
          id: `audit-${row.id}`,
          source: "audit",
          actor_name: actorName,
          event_type: row.operation || "UPDATE",
          action,
          diffs,
          remark,
          created_at: row.created_at,
          old_status,
          new_status,
          initial_details
        });
      });

      // 3. Process ticket_comments
      commentRows.forEach((row: any) => {
        const rowTime = new Date(row.created_at).getTime();
        const hasRemarkAlready = normalizedList.some(item => {
          const itemTime = new Date(item.created_at).getTime();
          return Math.abs(itemTime - rowTime) < 2500 && item.remark === row.content;
        });

        if (hasRemarkAlready) return;

        const actorName = (row.author as any)?.full_name || userMap[row.author_id] || "Team Member";

        normalizedList.push({
          id: `comment-${row.id}`,
          source: "comment",
          actor_name: actorName,
          event_type: "COMMENT",
          action: "added an update comment / remarks",
          diffs: [],
          remark: row.content,
          created_at: row.created_at
        });
      });

      // Sort chronological descending
      normalizedList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setActivities(normalizedList);
    } catch (err) {
      console.error("Ticket activity fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [ticket, extractDiffsFromAudit, supabase]);

  useEffect(() => {
    fetchActivities();

    const ticketId = ticket?.dbId || ticket?.id;
    if (!ticketId) return;

    const channel = supabase
      .channel(`ticket_activity_live_${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_activity_stream",
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          fetchActivities();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_audit_logs",
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          fetchActivities();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_comments",
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticket?.dbId, ticket?.id, fetchActivities, supabase]);

  const getEventBadge = (activity: ActivityItem) => {
    const et = (activity.event_type || "").toUpperCase();
    if (et === "STATE_CHANGE" || et === "STATUS_CHANGE") {
      return { 
        icon: ShieldCheck, 
        color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", 
        label: "STATUS CHANGE" 
      };
    }
    if (et === "PRIORITY_CHANGE" || activity.diffs.some(d => d.field.toLowerCase().includes("priority"))) {
      return { 
        icon: Flame, 
        color: "text-rose-500 bg-rose-500/10 border-rose-500/20", 
        label: "PRIORITY" 
      };
    }
    if (et === "ASSIGNMENT" || activity.diffs.some(d => d.field.toLowerCase().includes("assignee"))) {
      return { 
        icon: UserCheck, 
        color: "text-primary bg-primary/10 border-primary/20", 
        label: "ASSIGNMENT" 
      };
    }
    if (et === "DUE_DATE_CHANGE" || activity.diffs.some(d => d.field.toLowerCase().includes("due date"))) {
      return { 
        icon: Calendar, 
        color: "text-purple-500 bg-purple-500/10 border-purple-500/20", 
        label: "DUE DATE" 
      };
    }
    if (et === "COMMENT") {
      return { 
        icon: MessageSquare, 
        color: "text-sky-500 bg-sky-500/10 border-sky-500/20", 
        label: "REMARK" 
      };
    }
    if (et === "CREATE") {
      return { 
        icon: PlusCircle, 
        color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", 
        label: "CREATE" 
      };
    }
    return { 
      icon: Edit, 
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20", 
      label: "UPDATE" 
    };
  };

  if (loading && activities.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted" aria-hidden />
        <span className="text-[13px] text-muted">Loading activity timeline…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-border pb-2.5">
        <Clock className="h-4 w-4 text-theme-icon" />
        <h3 className="text-sm font-semibold tracking-tight text-foreground">Activity timeline</h3>
      </div>

      {activities.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-[13px] text-muted">
          No activity recorded for this ticket yet.
        </div>
      ) : (
        <div className="relative space-y-4 before:absolute before:bottom-2 before:left-4 before:top-2 before:w-px before:bg-border">
          {activities.map((activity) => {
            const badge = getEventBadge(activity);
            const Icon = badge.icon;
            const diffs = activity.diffs;
            const remark = activity.remark;

            return (
              <div key={activity.id} className="relative flex items-start gap-3 pl-1">
                {/* Timeline node icon */}
                <div className={`z-10 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border shadow-xs ${badge.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>

                {/* Structured card */}
                <div className="flex-1 rounded-lg border border-border bg-surface p-3 shadow-xs transition-colors hover:border-border-active">
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-theme-icon">
                        {activity.actor_name}
                      </span>
                      <span className="text-xs text-foreground/90 font-medium">
                        {activity.action}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    <span className="font-mono text-[11.5px] text-muted">
                      {formatDateTime(activity.created_at)}
                    </span>
                  </div>

                  {/* Status Transition Block */}
                  {(activity.event_type === "STATE_CHANGE" || activity.event_type === "STATUS_CHANGE" || (activity.old_status && activity.new_status)) && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold uppercase text-[11px] text-muted">STATUS:</span>
                      <span className="rounded border border-border/60 bg-sunken px-2 py-0.5 font-mono text-muted line-through">
                        {activity.old_status || "Previous"}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted shrink-0" />
                      <span className="rounded border border-success-border bg-success-soft px-2 py-0.5 font-semibold text-success-text">
                        {activity.new_status || "Current"}
                      </span>
                    </div>
                  )}

                  {/* Field-level diffs comparison table */}
                  {diffs.length > 0 && !(activity.event_type === "STATUS_CHANGE" && diffs.length === 1 && diffs[0].field === "Status") && (
                    <div className="mt-2.5 space-y-1.5 font-mono">
                      {diffs.map((d: any, idx: number) => (
                        <div key={idx} className="flex flex-wrap items-center gap-2 rounded border border-border/50 bg-sunken/60 px-2.5 py-1 text-xs">
                          <span className="w-28 shrink-0 font-bold uppercase text-[11px] text-muted">{d.field}:</span>
                          <span className="max-w-[180px] truncate text-danger/80 line-through opacity-80" title={String(d.old_value)}>
                            {String(d.old_value || "None")}
                          </span>
                          <ArrowRight className="h-3 w-3 shrink-0 text-muted" />
                          <span className="max-w-[200px] truncate font-semibold text-success-text" title={String(d.new_value)}>
                            {String(d.new_value || "None")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Initial Details for CREATE event */}
                  {activity.initial_details && (
                    <div className="mt-2.5 rounded border border-border/50 bg-sunken/40 p-2 font-mono text-xs space-y-1">
                      <div className="flex gap-2">
                        <span className="w-24 font-bold uppercase text-[11px] text-muted">CODE:</span>
                        <span className="text-foreground">{activity.initial_details.code || "-"}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="w-24 font-bold uppercase text-[11px] text-muted">TITLE:</span>
                        <span className="text-foreground">{activity.initial_details.title || "-"}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="w-24 font-bold uppercase text-[11px] text-muted">PRIORITY:</span>
                        <span className="font-semibold text-accent-soft-text">{activity.initial_details.priority || "Normal"}</span>
                      </div>
                    </div>
                  )}

                  {/* Remarks / Comments block */}
                  {remark && (
                    <div className="mt-2.5 flex items-start gap-2 rounded-md border border-border/80 bg-surface p-2.5 text-xs text-foreground/90 shadow-xs">
                      <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-theme-icon" />
                      <div className="flex-1">
                        <span className="mb-0.5 block text-[10.5px] font-bold uppercase tracking-wider text-muted">Remark / Note</span>
                        <span className="italic leading-relaxed">&ldquo;{remark}&rdquo;</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
