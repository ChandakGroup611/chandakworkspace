"use client";
/* eslint-disable no-restricted-syntax */

import React, { useState, useEffect } from "react";
import { Bell, X, ExternalLink } from "lucide-react";
import { fetchUnreadNotifications, deleteNotification } from "@/lib/actions/notifications";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { AppButton } from "@/components/ui/AppButton";
import { formatDateTime } from "@/components/ui/data";

export default function NotificationCenter() {
  const supabase = createClient();
  const router = useRouter();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function loadNotifications() {
      const data = await fetchUnreadNotifications();
      setNotifications(data || []);
      setUnreadCount((data || []).length);
    }
    loadNotifications();

    // Subscribe to new notifications in realtime
    let channel: any;
    async function setupRealtime() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      
      channel = supabase.channel(`notifications_${userData.user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'task_notifications', filter: `user_id=eq.${userData.user.id}` },
          (payload) => {
            setNotifications(prev => [payload.new, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        )
        .subscribe();
    }
    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const handleRead = async (id: string, link: string | null) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      if (link) {
        setIsOpen(false);
        router.push(link);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    for (const n of notifications) {
      await deleteNotification(n.id);
    }
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <div className="relative">
      <AppButton 
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-colors ${
          isOpen 
            ? "bg-accent-soft text-accent-soft-text" 
            : "text-muted hover:bg-surface-hover"
        }`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-danger rounded-full ring-2 ring-surface" />
        )}
      </AppButton>

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Close notifications popover"
            className="fixed inset-0 z-[calc(var(--z-popover)-1)] bg-transparent border-0 cursor-default"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl z-[var(--z-popover)] overflow-hidden bg-elevated border border-border shadow-lg animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 border-b border-border flex items-center justify-between bg-surface">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-heading">Notifications</h3>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  unreadCount > 0 ? "bg-danger-soft text-danger-text" : "bg-sunken text-muted"
                }`}>
                  {unreadCount} new
                </span>
              </div>
              {unreadCount > 0 && (
                <AppButton 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleMarkAllRead} 
                  className="h-6 px-1.5 text-[11px] text-danger hover:bg-danger-soft"
                >
                  Clear all
                </AppButton>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className="p-3 border-b border-border transition-colors hover:bg-surface-hover relative group flex items-start justify-between gap-2"
                >
                  <button
                    type="button"
                    onClick={() => handleRead(n.id, n.link)}
                    className="flex-1 text-left bg-transparent border-0 cursor-pointer p-0 min-w-0"
                  >
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-semibold text-foreground truncate">{n.title}</h4>
                      <p className="text-[11px] text-muted leading-relaxed line-clamp-2">{n.message}</p>
                      <span className="text-[11px] text-muted block tabular-nums mt-1">
                        {formatDateTime(n.created_at)}
                      </span>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    {n.link && (
                      <ExternalLink className="h-3.5 w-3.5 text-muted group-hover:text-primary shrink-0" />
                    )}
                    <AppButton
                      variant="ghost"
                      size="icon"
                      aria-label="Delete notification"
                      onClick={(e) => handleDelete(e, n.id)}
                      className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </AppButton>
                  </div>
                </div>
              ))}
              
              {notifications.length === 0 && (
                <div className="p-8 text-center flex flex-col items-center justify-center">
                  <Bell className="h-6 w-6 text-muted mb-2 opacity-50" />
                  <p className="text-xs font-medium text-muted">You are all caught up</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
