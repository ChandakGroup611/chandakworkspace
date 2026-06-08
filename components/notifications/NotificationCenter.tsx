"use client";

import React, { useState, useEffect } from "react";
import { Bell, X, ExternalLink, CheckCircle } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { fetchUnreadNotifications, markNotificationAsRead } from "@/lib/actions/notifications";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function NotificationCenter() {
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance"].includes(theme);
  const supabase = createClient();
  const router = useRouter();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function loadNotifications() {
      const data = await fetchUnreadNotifications();
      setNotifications(data);
      setUnreadCount(data.length);
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
            // Could also trigger browser Notification API here
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
      await markNotificationAsRead(id);
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

  const handleMarkAllRead = async () => {
    for (const n of notifications) {
      await markNotificationAsRead(n.id);
    }
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <div className="relative z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-all ${
          isOpen 
            ? (isLightMode ? "bg-indigo-50 text-indigo-600" : "bg-indigo-500/20 text-indigo-400") 
            : (isLightMode ? "text-gray-500 hover:bg-gray-100" : "text-gray-400 hover:bg-white/10")
        }`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-[#070913]" />
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={`absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl border z-50 overflow-hidden transform origin-top-right animate-in fade-in zoom-in-95 duration-200 ${
            isLightMode ? "bg-white border-gray-200" : "bg-[#0f111a] border-white/10"
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${isLightMode ? "border-gray-100 bg-gray-50/50" : "border-white/5 bg-black/20"}`}>
              <div className="flex items-center gap-2">
                <h3 className={`font-bold ${"text-foreground"}`}>Notifications</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  unreadCount > 0 ? "bg-rose-500/10 text-rose-500" : "bg-gray-500/10 text-gray-500"
                }`}>
                  {unreadCount} New
                </span>
              </div>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs text-indigo-500 hover:text-indigo-600 font-semibold flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  onClick={() => handleRead(n.id, n.link)}
                  className={`p-4 border-b cursor-pointer transition-colors group ${
                    isLightMode 
                      ? "border-gray-100 hover:bg-indigo-50/50" 
                      : "border-white/5 hover:bg-indigo-500/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h4 className={`text-xs font-bold ${"text-foreground"}`}>{n.title}</h4>
                      <p className="text-[0.8rem] text-gray-500 leading-snug line-clamp-2">{n.message}</p>
                      <span className="text-[0.7rem] text-gray-400 font-mono mt-2 block">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                    {n.link && (
                      <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover:text-indigo-500 shrink-0 mt-0.5" />
                    )}
                  </div>
                </div>
              ))}
              
              {notifications.length === 0 && (
                <div className="p-8 text-center flex flex-col items-center justify-center opacity-60">
                  <Bell className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-xs font-medium text-gray-500">You're all caught up!</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
