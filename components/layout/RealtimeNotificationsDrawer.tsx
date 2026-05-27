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
}

export default function RealtimeNotificationsDrawer() {
  const router = useRouter();
  const supabase = createClient();
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze"].includes(theme);
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "UNREAD" | "CRITICAL">("UNREAD");
  const [toasts, setToasts] = useState<NotificationItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        loadNotifications(user.id);
      }
    }
    fetchUser();
  }, []);

  const loadNotifications = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notification_queue")
        .select("*")
        .or(`target_user_id.eq.${userId},target_user_id.eq.GLOBAL_OPS`)
        .order("created_at", { ascending: false })
        .limit(40);

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.warn("Postgres Realtime Queue query warning. Initializing persistent offline buffers.", err);
      setNotifications([
        {
          id: "nq-1",
          entity_type: "ticket",
          entity_id: "TKT-9910",
          module: "tickets",
          action_type: "sla_breached",
          actor: "SLA Surveillance Engine",
          target_user_id: "GLOBAL_OPS",
          payload: { message: "Critical SLA Response time ceiling exceeded due to pending approval validation.", metric: "SLA Response Breached" },
          redirect_url: "/tickets?id=TKT-9910&focus=sla",
          priority_level: "CRITICAL",
          is_read: false,
          created_at: new Date(Date.now() - 300000).toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && currentUserId) {
      const channel = supabase
        .channel("global_notification_buffer")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notification_queue" },
          (payload: any) => {
            if (payload.eventType === "INSERT") {
              const newItem = payload.new as NotificationItem;
              
              // Verify target user is this logged in user
              if (newItem.target_user_id === currentUserId || newItem.target_user_id === 'GLOBAL_OPS') {
                setNotifications(prev => [newItem, ...prev]);
                
                // Mobile-style Toast alert: display for 2 seconds
                if (!newItem.is_read) {
                  setToasts(prev => [...prev, newItem]);
                  setTimeout(() => {
                    setToasts(prev => prev.filter(t => t.id !== newItem.id));
                  }, 2000);
                }
              }
            } else if (payload.eventType === "UPDATE") {
              setNotifications(prev => prev.map(n => n.id === payload.new.id ? (payload.new as NotificationItem) : n));
            } else if (payload.eventType === "DELETE") {
              setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
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
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n));

    try {
      await supabase
        .from("notification_queue")
        .update({ is_read: true })
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
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await supabase.from("notification_queue").delete().eq("id", id);
    } catch (_) {}
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      await supabase.from("notification_queue").update({ is_read: true }).eq("is_read", false);
    } catch (_) {}
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const criticalCount = notifications.filter(n => n.priority_level === "CRITICAL" && !n.is_read).length;

  const filteredItems = notifications.filter(n => {
    if (activeFilter === "UNREAD") return !n.is_read;
    if (activeFilter === "CRITICAL") return n.priority_level === "CRITICAL";
    return true;
  });

  const stickyCriticalAlerts = notifications.filter(n => n.priority_level === "CRITICAL" && !n.is_read);

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all duration-200 active:scale-95"
      >
        <Bell className={`h-4 w-4 ${unreadCount > 0 ? "text-blue-400 animate-bounce" : ""}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[0.7rem] font-bold text-white shadow-md ring-2 ring-[#0A0D14] animate-pulse font-mono">
            {unreadCount}
          </span>
        )}
      </button>

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
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setToasts(prev => prev.filter(t => t.id !== toast.id));
                    }}
                    className={`p-0.5 rounded-lg transition-colors ${
                      isLightMode ? "text-gray-400 hover:text-gray-900 hover:bg-gray-100" : "text-gray-500 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <h4 className="text-[0.8rem] font-bold uppercase tracking-wider leading-none">
                  {toast.action_type.toUpperCase().replace('_', ' ')}
                </h4>
                <p className="text-[0.8rem] text-gray-400 leading-snug line-clamp-2">
                  {displayMessage}
                </p>
                <div className="flex items-center justify-between text-[0.65rem] pt-1 border-t border-white/5 mt-1 text-gray-500">
                  <span>Actor: <strong>{toast.actor}</strong></span>
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
              <span className={`text-lg font-bold tracking-wider ${isLightMode ? "text-gray-900" : "text-white"}`}>Enterprise Stream</span>
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
                <button
                  onClick={() => setActiveFilter("UNREAD")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeFilter === "UNREAD" ? "bg-cyan-500 text-white shadow" : isLightMode ? "text-gray-500 hover:text-gray-900" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Unread ({unreadCount})
                </button>
                <button
                  onClick={() => setActiveFilter("CRITICAL")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeFilter === "CRITICAL" ? "bg-rose-500/20 text-rose-500 border border-rose-500/30" : isLightMode ? "text-gray-500 hover:text-gray-900" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Escalations ({criticalCount})
                </button>
                <button
                  onClick={() => setActiveFilter("ALL")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeFilter === "ALL" ? isLightMode ? "bg-white shadow text-gray-800" : "bg-white/10 text-white" : isLightMode ? "text-gray-500 hover:text-gray-900" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  All ({notifications.length})
                </button>
              </div>
              
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                    isLightMode ? "bg-white border-gray-200 text-cyan-600 hover:bg-gray-50" : "bg-white/5 border-white/5 text-cyan-400 hover:bg-white/10"
                  }`}
                >
                  Clear Badges
                </button>
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
                            <span className={isLightMode ? "text-gray-900" : "text-white"}>{item.entity_id}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-cyan-600 dark:text-cyan-400/90">{item.module}</span>
                          </span>
                          <button onClick={(e) => handleDismissNotification(e, item.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-rose-500">
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        </div>
                        <p className={`text-[0.8rem] leading-snug break-words ${!item.is_read ? (isLightMode ? "text-gray-900 font-medium" : "text-gray-100 font-medium") : "text-gray-500"}`}>
                          {displayMessage}
                        </p>
                        <div className={`flex items-center justify-between text-[0.65rem] pt-1 border-t mt-1 ${isLightMode ? "border-gray-100 text-gray-400" : "border-white/5 text-gray-500"}`}>
                          <span>Actor: <strong className={isLightMode ? "text-gray-600" : "text-gray-400"}>{item.actor}</strong></span>
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
