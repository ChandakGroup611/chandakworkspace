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
  AlertTriangle, 
  ShieldAlert, 
  MessageSquare, 
  Calendar, 
  Clock, 
  User, 
  X,
  Layers,
  Sparkles,
  Mail
} from "lucide-react";
import { AppBadge } from "@/components/ui/AppBadge";
import { useTheme } from "@/components/theme/ThemeProvider";
import { EnterpriseDrawerShell } from "@/components/ui/enterprise/EnterpriseDrawerShell";
import { useProfile } from "@/hooks/usePermissions";
import { useQuery } from "@tanstack/react-query";
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
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance"].includes(theme);
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "UNREAD" | "CRITICAL">("UNREAD");
  const [toasts, setToasts] = useState<NotificationItem[]>([]);
  
  const { data: profile } = useProfile();
  const currentUserId = profile?.id;

  // Track state locally for optimistic updates and read toggles
  const [localNotifications, setLocalNotifications] = useState<NotificationItem[]>([]);

  const { data: fetchedNotifications, isLoading: loading } = useQuery({
    queryKey: ['notifications', currentUserId],
    enabled: !!currentUserId,
    queryFn: async () => {
      console.count("Notification Fetch Count");
      const { data, error } = await supabase
        .from("notification_queue")
        .select("*")
        .or(`target_user_id.eq.${currentUserId},target_user_id.eq.GLOBAL_OPS`)
        .order("created_at", { ascending: false })
        .limit(40);

      if (error) throw error;
      
      const rawData = data || [];
      if (rawData.length === 0) return [];

      const actorIds = [...new Set(rawData.map((n: any) => n.actor).filter(Boolean))];
      if (actorIds.length > 0) {
        const { data: userData } = await supabase
          .from("user_master")
          .select("id, full_name")
          .in("id", actorIds);
          
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
            
            // Verify target user is this logged in user
            if (newItem.target_user_id === currentUserId || newItem.target_user_id === 'GLOBAL_OPS') {
              setLocalNotifications(prev => [newItem, ...prev]);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [mounted, currentUserId]);

  const handleConsumeNotification = async (item: NotificationItem) => {
    setLocalNotifications(prev => prev.filter(n => n.id !== item.id));

    try {
      await supabase
        .from("notification_queue")
        .delete()
        .eq("id", item.id);

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
    try {
      await supabase.from("notification_queue").delete().eq("id", id);
    } catch (_) {}
  };

  const markAllAsRead = async () => {
    setLocalNotifications(prev => prev.filter(n => n.is_read));
    try {
      await supabase.from("notification_queue").delete().eq("is_read", false);
    } catch (_) {}
  };

  const unreadCount = localNotifications.filter(n => !n.is_read).length;
  const criticalCount = localNotifications.filter(n => n.priority_level === "CRITICAL" && !n.is_read).length;

  const filteredItems = localNotifications.filter(n => {
    if (activeFilter === "UNREAD") return !n.is_read;
    if (activeFilter === "CRITICAL") return n.priority_level === "CRITICAL";
    return true;
  });

  const stickyCriticalAlerts = localNotifications.filter(n => n.priority_level === "CRITICAL" && !n.is_read);

  return (
    <>
      <AppButton 
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative !h-10 !w-10 rounded-xl bg-surface border-border text-muted hover:bg-muted hover:text-foreground"
      >
        <Bell className={`h-4 w-4 ${unreadCount > 0 ? "text-blue-400 animate-bounce" : ""}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[0.7rem] font-bold text-white shadow-md ring-2 ring-[#0A0D14] animate-pulse font-mono">
            {unreadCount}
          </span>
        )}
      </AppButton>

      {/* Mobile Toast Notification Overlay - Displays for 2 seconds on new mutations */}
      {mounted && createPortal(
        <div className="fixed top-6 right-6 z-[999999] flex flex-col gap-3 w-full max-w-sm px-4 pointer-events-none">
          {toasts.map(toast => {
          const isCritical = toast.priority_level === "CRITICAL";
          const displayMessage = toast.payload?.message || "Operational mutation execution.";
          
          return (
            <div
              key={toast.id}
              onClick={() => handleConsumeNotification(toast)}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl p-4 shadow-2xl border backdrop-blur-xl transform transition-all duration-300 cursor-pointer hover:scale-[1.02] active:scale-95 group ${
                isLightMode 
                  ? "bg-white/95 border-gray-200/80 text-gray-900 shadow-indigo-500/10 animate-in slide-in-from-right-12 duration-300" 
                  : "bg-[#0b0e17]/95 border-white/10 text-white shadow-black/50 animate-in slide-in-from-right-12 duration-300"
              }`}
            >
              <div className="shrink-0 mt-0.5">
                <div className={`p-2 rounded-xl ${
                  isCritical 
                    ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" 
                    : "bg-cyan-500/10 text-cyan-500 border border-cyan-500/20"
                }`}>
                  {isCritical ? <ShieldAlert className="h-4 w-4 animate-pulse" /> : <Bell className="h-4 w-4" />}
                </div>
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[0.7rem] font-mono font-bold uppercase tracking-wider text-cyan-500">
                    {toast.entity_id}
                  </span>
                  <AppButton 
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setToasts(prev => prev.filter(t => t.id !== toast.id));
                    }}
                    className="!h-5 !w-5"
                  >
                    <X className="h-3.5 w-3.5" />
                  </AppButton>
                </div>
                <h4 className="text-[0.8rem] font-bold uppercase tracking-wider leading-none">
                  {toast.action_type.toUpperCase().replace('_', ' ')}
                </h4>
                <p className="text-[0.8rem] text-gray-400 leading-snug line-clamp-2">
                  {displayMessage}
                </p>
                <div className="flex items-center justify-between text-[0.65rem] pt-1 border-t border-white/5 mt-1 text-gray-500">
                  <span>Actor: <strong>{toast.actor_name || toast.actor}</strong></span>
                  <span className="text-cyan-500 font-bold group-hover:underline">View details →</span>
                </div>
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
              <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className={`text-lg font-bold tracking-wider ${"text-foreground"}`}>Enterprise Stream</span>
            </div>
          }
          subtitle="Live Database Mutations"
          onClose={() => setIsOpen(false)}
          size="sm"
          footer={
            <div className={`w-full p-2 text-xs text-gray-500 flex items-center justify-between gap-2`}>
              <span>Auto-redirect anchors bound instantly</span>
              <ExternalLink className="h-3 w-3 text-cyan-500" />
            </div>
          }
        >
          <div className="flex flex-col h-full space-y-4">
            <div className="flex items-center justify-between">
              <div className={`p-1.5 rounded-xl flex items-center gap-1 ${isLightMode ? "bg-gray-100" : "bg-white/5"}`}>
                <AppButton
                  size="sm"
                  variant={activeFilter === "UNREAD" ? "primary" : "ghost"}
                  onClick={() => setActiveFilter("UNREAD")}
                  className={activeFilter !== "UNREAD" ? "text-muted-foreground" : ""}
                >
                  Unread ({unreadCount})
                </AppButton>
                <AppButton
                  size="sm"
                  variant={activeFilter === "CRITICAL" ? "destructive" : "ghost"}
                  onClick={() => setActiveFilter("CRITICAL")}
                  className={activeFilter !== "CRITICAL" ? "text-muted-foreground" : ""}
                >
                  Escalations ({criticalCount})
                </AppButton>
                <AppButton
                  size="sm"
                  variant={activeFilter === "ALL" ? "secondary" : "ghost"}
                  onClick={() => setActiveFilter("ALL")}
                  className={activeFilter !== "ALL" ? "text-muted-foreground" : ""}
                >
                  All ({localNotifications.length})
                </AppButton>
              </div>
              
              {unreadCount > 0 && (
                <AppButton
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                >
                  Clear Badges
                </AppButton>
              )}
            </div>



            <div className="flex-1 space-y-2 pb-4">
              {loading ? (
                <div className="space-y-2 py-8">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`h-14 rounded-xl animate-pulse border ${isLightMode ? "bg-gray-100 border-gray-200" : "bg-white/5 border-white/5"}`} />
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 space-y-1.5 text-gray-500">
                  <CheckCircle2 className="h-6 w-6 mx-auto text-emerald-500/40" />
                  <span className="text-xs font-semibold block">Zero Pending Items</span>
                </div>
              ) : (
                filteredItems.map(item => {
                  const isCritical = item.priority_level === "CRITICAL";
                  let displayMessage = item.payload?.message || "Operational mutation execution.";

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleConsumeNotification(item)}
                      className={`p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer relative group flex gap-2.5 ${
                        !item.is_read 
                          ? isCritical 
                            ? isLightMode ? "bg-rose-50/80 border-rose-200" : "bg-gradient-to-r from-rose-950/40 to-transparent border-rose-500/50" 
                            : isLightMode ? "bg-cyan-50/50 border-cyan-200" : "bg-gradient-to-r from-cyan-950/20 to-transparent border-cyan-500/30"
                          : isLightMode ? "bg-white border-gray-100 opacity-60" : "bg-white/[0.005] border-white/5 opacity-70"
                      }`}
                    >
                      <div className="shrink-0 mt-0.5">
                        <div className={`p-1.5 rounded-lg ${isCritical ? "bg-rose-500/20 text-rose-500 border border-rose-500/30" : "bg-cyan-500/10 text-cyan-500"}`}>
                          {isCritical ? <ShieldAlert className="h-3 w-3" /> : <Layers className="h-3 w-3" />}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[0.7rem] font-mono font-bold uppercase tracking-wider truncate flex items-center gap-1">
                            <span className={"text-foreground"}>{item.entity_id}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-cyan-600 dark:text-cyan-400/90">{item.module}</span>
                          </span>
                          <AppButton 
                            variant="ghost" 
                            size="icon-sm"
                            onClick={(e) => handleDismissNotification(e, item.id)} 
                            className="opacity-0 group-hover:opacity-100 !h-6 !w-6 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </AppButton>
                        </div>
                        <p className={`text-[0.8rem] leading-snug break-words ${!item.is_read ? (isLightMode ? "text-gray-900 font-medium" : "text-gray-100 font-medium") : "text-gray-500"}`}>
                          {displayMessage}
                        </p>
                        <div className={`flex items-center justify-between text-[0.65rem] pt-1 border-t mt-1 ${isLightMode ? "border-gray-100 text-gray-400" : "border-white/5 text-gray-500"}`}>
                          <span>Actor: <strong className={"text-muted"}>{item.actor_name || item.actor}</strong></span>
                          <span>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
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
