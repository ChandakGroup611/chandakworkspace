"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { 
  Bell, 
  CheckCircle2, 
  Trash2, 
  ExternalLink, 
  ShieldAlert, 
  X,
  Layers,
  Sparkles
} from "lucide-react";
import { EnterpriseDrawerShell } from "@/components/ui/enterprise/EnterpriseDrawerShell";
import { useProfile, usePermissions } from "@/hooks/usePermissions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteQueueNotification, clearAllQueueNotifications } from "@/lib/actions/notifications";
import { AppButton } from "@/components/ui/AppButton";

export interface NotificationItem {
  id: string;
  entity_type: string;
  entity_id: string;
  module: string;
  action_type: string;
  actor: string;
  target_user_id: string;
  payload: Record<string, any>;
  redirect_url: string;
  priority_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  is_read: boolean;
  created_at: string;
  actor_name?: string;
}

export default function RealtimeNotificationsDrawer() {
  const router = useRouter();
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "UNREAD" | "CRITICAL">("UNREAD");
  const [toasts, setToasts] = useState<NotificationItem[]>([]);
  
  const { data: profile } = useProfile();
  const { roleCode } = usePermissions();
  const currentUserId = profile?.id;
  const queryClient = useQueryClient();

  const [localNotifications, setLocalNotifications] = useState<NotificationItem[]>([]);

  const { data: fetchedNotifications, isLoading: loading } = useQuery({
    queryKey: ['notifications', currentUserId],
    enabled: !!currentUserId,
    queryFn: async () => {
      let query = supabase
        .from("notification_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);

      if (profile?.created_at) {
        query = query.gte("created_at", profile.created_at);
      }

      if (roleCode === "SUPER_ADMIN") {
        query = query.or(`target_user_id.eq.${currentUserId},target_user_id.eq.GLOBAL_OPS`);
      } else {
        query = query.eq("target_user_id", currentUserId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const rawData = data || [];
      if (rawData.length === 0) return [];

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
          return rawData.map((n: any) => ({
            ...n,
            actor_name: userMap[n.actor] || n.actor
          }));
        }
      }

      return rawData;
    },
    staleTime: 60000,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync fetched data to local state
  useEffect(() => {
    if (fetchedNotifications) {
      setLocalNotifications(fetchedNotifications);
    }
  }, [fetchedNotifications]);

  // Realtime subscription active for the badge count
  useEffect(() => {
    if (mounted && currentUserId) {
      const channelId = `global_notification_buffer_${currentUserId}_${Date.now()}`;
      const channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notification_queue" },
          (payload: any) => {
            const newItem = payload.new as NotificationItem;
            
            const isGlobal = newItem.target_user_id === 'GLOBAL_OPS';
            if (newItem.target_user_id === currentUserId || (isGlobal && roleCode === 'SUPER_ADMIN')) {
              setLocalNotifications(prev => [newItem, ...prev]);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [mounted, currentUserId, roleCode]);

  const handleConsumeNotification = async (item: NotificationItem) => {
    setLocalNotifications(prev => prev.filter(n => n.id !== item.id));
    queryClient.setQueryData(['notifications', currentUserId], (old: any) => old?.filter((n: any) => n.id !== item.id));

    try {
      await deleteQueueNotification(item.id);

      await supabase.from("notification_history").insert([{
        original_notification_id: item.id.length === 36 ? item.id : "00000000-0000-0000-0000-000000000001",
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        action_type: item.action_type,
        actor: item.actor,
        target_user_id: item.target_user_id
      }]);
    } catch (e) {}

    if (item.redirect_url && mounted) {
      router.push(item.redirect_url);
      setIsOpen(false);
    } else if (item.redirect_url) {
      window.location.href = item.redirect_url;
    }
  };

  const handleDismissNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setLocalNotifications(prev => prev.filter(n => n.id !== id));
    queryClient.setQueryData(['notifications', currentUserId], (old: any) => old?.filter((n: any) => n.id !== id));
    try {
      await deleteQueueNotification(id);
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    setLocalNotifications(prev => prev.filter(n => n.is_read));
    queryClient.setQueryData(['notifications', currentUserId], (old: any) => old?.filter((n: any) => n.is_read));
    try {
      await clearAllQueueNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = localNotifications.filter(n => !n.is_read).length;
  const criticalCount = localNotifications.filter(n => n.priority_level === "CRITICAL" && !n.is_read).length;

  const filteredItems = localNotifications.filter(n => {
    if (activeFilter === "UNREAD") return !n.is_read;
    if (activeFilter === "CRITICAL") return n.priority_level === "CRITICAL";
    return true;
  });

  return (
    <>
      <button 
        type="button"
        aria-label="Toggle notifications stream"
        onClick={() => setIsOpen(!isOpen)}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-hover hover:text-foreground"
      >
        <Bell className={`h-4 w-4 ${unreadCount > 0 ? "text-warning" : ""}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-warning px-1 text-[11px] font-semibold text-primary-foreground shadow-xs ring-2 ring-surface font-mono leading-none z-10">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Mobile Toast Notification Overlay */}
      {mounted && createPortal(
        <div className="fixed top-6 right-6 z-[var(--z-toast)] flex flex-col gap-3 w-full max-w-sm px-4 pointer-events-none">
          {toasts.map(toast => {
            const isCritical = toast.priority_level === "CRITICAL";
            const displayMessage = toast.payload?.message || "Operational mutation execution.";
            
            return (
              <div
                key={toast.id}
                className="pointer-events-auto flex items-start gap-3 rounded-xl p-3.5 bg-elevated border border-border text-foreground shadow-md transition-colors hover:bg-surface-hover group animate-in slide-in-from-right-12 duration-200"
              >
                <button
                  type="button"
                  onClick={() => handleConsumeNotification(toast)}
                  className="flex-1 flex items-start gap-3 text-left bg-transparent border-0 p-0 cursor-pointer min-w-0"
                >
                  <div className="shrink-0 mt-0.5">
                    <div className={`p-2 rounded-lg ${
                      isCritical 
                        ? "bg-danger-soft text-danger border border-danger-border" 
                        : "bg-warning-soft text-warning border border-warning-border"
                    }`}>
                      {isCritical ? <ShieldAlert className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-mono font-medium ${isCritical ? 'text-danger' : 'text-warning'}`}>
                        {toast.entity_id}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold leading-none">
                      {toast.action_type.replace(/_/g, ' ')}
                    </h4>
                    <p className="text-xs text-muted leading-relaxed line-clamp-2">
                      {displayMessage}
                    </p>
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border mt-1 text-muted">
                      <span>Actor: <strong className="font-medium text-foreground">{toast.actor_name || toast.actor}</strong></span>
                      <span className={`${isCritical ? 'text-danger' : 'text-warning'} font-medium group-hover:underline`}>View details &rarr;</span>
                    </div>
                  </div>
                </button>

                <div className="shrink-0">
                  <AppButton 
                    variant="ghost"
                    size="icon"
                    aria-label="Dismiss toast"
                    onClick={(e) => {
                      e.stopPropagation();
                      setToasts(prev => prev.filter(t => t.id !== toast.id));
                    }}
                    className="h-5 w-5 p-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </AppButton>
                </div>
              </div>
            );
          })}
        </div>,
        document.body
      )}

      {isOpen && (
        <EnterpriseDrawerShell
          title={
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent-soft text-primary shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-heading">Activity</span>
            </div>
          }
          subtitle="Live database mutations"
          onClose={() => setIsOpen(false)}
          size="sm"
          footer={
            <div className="w-full p-2 text-xs text-muted flex items-center justify-between gap-2">
              <span>Auto-redirect anchors bound instantly</span>
              <ExternalLink className="h-3 w-3 text-muted" />
            </div>
          }
        >
          <div className="flex flex-col h-full space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="p-1 rounded-lg flex items-center gap-1 bg-sunken border border-border">
                <AppButton
                  size="sm"
                  variant={activeFilter === "UNREAD" ? "primary" : "ghost"}
                  onClick={() => setActiveFilter("UNREAD")}
                  className="h-7 text-xs font-medium px-2.5"
                >
                  Unread ({unreadCount})
                </AppButton>
                <AppButton
                  size="sm"
                  variant={activeFilter === "CRITICAL" ? "primary" : "ghost"}
                  onClick={() => setActiveFilter("CRITICAL")}
                  className="h-7 text-xs font-medium px-2.5"
                >
                  Escalations ({criticalCount})
                </AppButton>
                <AppButton
                  size="sm"
                  variant={activeFilter === "ALL" ? "primary" : "ghost"}
                  onClick={() => setActiveFilter("ALL")}
                  className="h-7 text-xs font-medium px-2.5"
                >
                  All ({localNotifications.length})
                </AppButton>
              </div>
              
              {unreadCount > 0 && (
                <AppButton
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-7 text-xs font-medium"
                >
                  Clear badges
                </AppButton>
              )}
            </div>

            <div className="flex-1 space-y-2 pb-4 overflow-y-auto">
              {loading ? (
                <div className="space-y-2 py-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-14 rounded-lg animate-pulse border bg-surface border-border" />
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 space-y-1.5 text-muted">
                  <CheckCircle2 className="h-5 w-5 mx-auto text-success" />
                  <span className="text-xs font-medium block">Zero pending items</span>
                </div>
              ) : (
                filteredItems.map(item => {
                  const isCritical = item.priority_level === "CRITICAL";
                  const displayMessage = item.payload?.message || "Operational mutation execution.";

                  return (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-lg border text-left transition-colors relative group flex gap-2.5 ${
                        !item.is_read 
                          ? isCritical 
                            ? "bg-danger-soft border-danger-border" 
                            : "bg-warning-soft border-warning-border"
                          : "bg-surface border-border hover:bg-surface-hover"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleConsumeNotification(item)}
                        className="flex-1 flex gap-2.5 text-left bg-transparent border-0 p-0 cursor-pointer min-w-0"
                      >
                        <div className="shrink-0 mt-0.5">
                          <div className={`p-1.5 rounded-md ${
                            isCritical ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"
                          }`}>
                            {isCritical ? <ShieldAlert className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted truncate">
                            <span className="font-semibold text-foreground">{item.entity_id}</span>
                            <span>&bull;</span>
                            <span className={isCritical ? 'text-danger' : 'text-warning'}>{item.module}</span>
                          </div>
                          <p className={`text-xs leading-relaxed break-words ${!item.is_read ? "text-foreground font-medium" : "text-muted"}`}>
                            {displayMessage}
                          </p>
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border mt-1 text-muted">
                            <span>Actor: <strong className="font-medium text-foreground">{item.actor_name || item.actor}</strong></span>
                            <span>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </button>

                      <div className="shrink-0 flex items-start pt-0.5">
                        <AppButton 
                          variant="ghost" 
                          size="icon"
                          aria-label="Delete notification"
                          onClick={(e) => handleDismissNotification(e, item.id)} 
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-muted hover:text-danger rounded"
                        >
                          <Trash2 className="h-3 w-3" />
                        </AppButton>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </EnterpriseDrawerShell>
      )}
    </>
  );
}
