"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, ExternalLink, Play, RefreshCw, ShieldAlert } from "lucide-react";
import {
  fetchDesignNotificationsAction,
  markDesignNotificationsReadAction,
  runSlaAndTaskSweepAction,
  type DesignNotificationItem,
  type SlaEscalationRuleView,
} from "@/lib/actions/design-operations";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/feedback/States";

export function DesignNotificationCenterView() {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [notifications, setNotifications] = useState<DesignNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [escalationRules, setEscalationRules] = useState<SlaEscalationRuleView[]>([]);
  const [canRunSweep, setCanRunSweep] = useState(false);
  const [sweepMsg, setSweepMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchDesignNotificationsAction(filter);
    if (!res.success) {
      setError(res.error || "Failed to load notifications");
    } else {
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
      setEscalationRules(res.escalationRules);
      setCanRunSweep(res.canRunSweep);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleMarkAllRead = async () => {
    await markDesignNotificationsReadAction();
    await loadData();
  };

  const handleMarkOneRead = async (item: DesignNotificationItem) => {
    await markDesignNotificationsReadAction([{ id: item.id, source: item.source }]);
    await loadData();
  };

  const handleRunSweep = async () => {
    setSweepMsg(null);
    const res = await runSlaAndTaskSweepAction();
    if (!res.success) {
      setError(res.error || "Sweep failed");
      return;
    }
    setSweepMsg(`Sweep complete: ${res.slaUpdated} SLA status(es) updated, ${res.tasksGenerated} scheduled task(s) generated.`);
    await loadData();
  };

  const displayList = useMemo(() => notifications, [notifications]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-3 py-2 min-h-11 rounded-md text-sm font-medium border ${
              filter === "ALL" ? "bg-theme-btn-primary text-theme-btn-primary-text border-transparent" : "border-border bg-surface"
            }`}
          >
            All Notifications
          </button>
          <button
            type="button"
            onClick={() => setFilter("UNREAD")}
            className={`px-3 py-2 min-h-11 rounded-md text-sm font-medium border ${
              filter === "UNREAD" ? "bg-theme-btn-primary text-theme-btn-primary-text border-transparent" : "border-border bg-surface"
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canRunSweep && (
            <button
              type="button"
              onClick={() => void handleRunSweep()}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-11 rounded-md border border-border bg-surface text-sm hover:bg-elevated"
            >
              <Play className="w-4 h-4" />
              Run SLA & Task Sweep
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-11 rounded-md border border-border bg-surface text-sm hover:bg-elevated disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" />
            Mark All Read
          </button>
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-11 rounded-md border border-border bg-surface text-sm hover:bg-elevated"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}
      {sweepMsg && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          {sweepMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AppCard className="lg:col-span-2">
          <AppCardHeader>
            <AppCardTitle className="text-base">Design & Drawing Notification Stream</AppCardTitle>
          </AppCardHeader>
          <AppCardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Loading notifications...</p>
            ) : displayList.length === 0 ? (
              <EmptyState kind="empty" title="No notifications" description="Drawing approvals, transmittals, and SLA alerts appear here." />
            ) : (
              <div className="divide-y divide-border">
                {displayList.map((n) => (
                  <div
                    key={`${n.source}-${n.id}`}
                    className={`py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      !n.isRead ? "bg-elevated/40 -mx-2 px-2 rounded" : ""
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-sky-500" />}
                        <span className="text-sm font-medium">{n.title}</span>
                        <span className="text-[11px] rounded border border-border px-1.5 py-0.5 text-muted-foreground">
                          {n.eventType}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{n.message}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={() => void handleMarkOneRead(n)}
                          className="px-2.5 py-1.5 min-h-9 rounded border border-border text-xs hover:bg-elevated"
                        >
                          Mark read
                        </button>
                      )}
                      {n.linkUrl && (
                        <Link
                          href={n.linkUrl}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-9 rounded bg-theme-btn-primary text-theme-btn-primary-text text-xs font-medium"
                        >
                          Open
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AppCardContent>
        </AppCard>

        <AppCard>
          <AppCardHeader>
            <AppCardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              SLA Escalation Contacts
            </AppCardTitle>
          </AppCardHeader>
          <AppCardContent>
            {escalationRules.length === 0 ? (
              <p className="text-xs text-muted-foreground">No SLA escalation contacts configured yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {escalationRules.map((r) => (
                  <div key={r.id} className="py-2.5 text-xs space-y-0.5">
                    <div className="font-medium">{r.escalateToName}</div>
                    <div className="text-muted-foreground">{r.escalateToEmail}</div>
                    <div className="text-muted-foreground">
                      {r.projectName} · {r.departmentName} · {r.thresholdHours}h threshold
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AppCardContent>
        </AppCard>
      </div>
    </div>
  );
}
