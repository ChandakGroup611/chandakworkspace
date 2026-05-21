"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Send, Smile, Paperclip, MessageSquare, Wifi, WifiOff, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function TaskRealtimeChat({ taskId }: { taskId: string }) {
  const { theme } = useTheme();
  const isLightMode = theme === "executive-light";
  // Create client once with useRef so it's stable across renders
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null); // null = connecting
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 1. Fetch historical messages
    async function fetchMessages() {
      setLoading(true);
      const { data, error: fetchErr } = await supabase
        .from("task_chat_messages")
        .select("*, user:user_master(id, full_name, profile_photo)")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });

      if (!isMounted) return;

      if (fetchErr) {
        console.error("Error fetching messages:", fetchErr);
        setError("Failed to load chat history. Check database RLS.");
      } else {
        setMessages(data || []);
      }
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    }

    fetchMessages();

    // 2. Subscribe to realtime WebSocket events
    const channel = supabase
      .channel(`task_chat_${taskId}`, {
        config: { broadcast: { self: true } }
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "task_chat_messages",
          filter: `task_id=eq.${taskId}`,
        },
        async (payload) => {
          if (!isMounted) return;
          // Avoid duplicate if we already added it optimistically
          setMessages((prev) => {
            if (prev.find((m) => m.id === payload.new.id)) return prev;
            // Fetch user details async and update
            supabase
              .from("user_master")
              .select("id, full_name, profile_photo")
              .eq("id", payload.new.user_id)
              .single()
              .then(({ data: user }) => {
                if (!isMounted) return;
                setMessages((prevInner) =>
                  prevInner.map((m) =>
                    m.id === payload.new.id ? { ...m, user } : m
                  )
                );
              });
            return [...prev, { ...payload.new, user: null }];
          });
          setTimeout(scrollToBottom, 80);
        }
      )
      .subscribe((status) => {
        if (!isMounted) return;
        if (status === "SUBSCRIBED") {
          setConnected(true);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnected(false);
          console.warn("[Realtime] Channel status:", status);
        } else {
          setConnected(null); // Connecting/reconnecting
        }
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [taskId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newMessage.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    setNewMessage(""); // Optimistic clear

    try {
      const { data, error: insertErr } = await supabase
        .from("task_chat_messages")
        .insert([{ task_id: taskId, user_id: userId, message: trimmed }])
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Handle @mentions via API route
      if (trimmed.includes("@") && data?.id) {
        fetch("/api/mentions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, taskId, messageId: data.id }),
        }).catch((e) => console.error("Mentions dispatch failed:", e));
      }
    } catch (err: any) {
      console.error("Failed to send message:", err);
      setNewMessage(trimmed); // Restore
      setError(err.message || "Failed to send message. Check database permissions.");
      setTimeout(() => setError(null), 6000);
    } finally {
      setSending(false);
    }
  };

  return (
    <AppCard className={`flex flex-col border ${isLightMode ? "bg-white border-gray-200" : "bg-[#0a0c16] border-white/10"}`}>

      {/* Header */}
      <div className={`p-4 border-b flex items-center justify-between gap-2 ${isLightMode ? "border-gray-200" : "border-white/5"}`}>
        <div className="flex items-center gap-2">
          <MessageSquare className={`h-4 w-4 ${isLightMode ? "text-blue-600" : "text-blue-400"}`} />
          <h3 className={`text-sm font-bold ${isLightMode ? "text-gray-900" : "text-white"}`}>
            Realtime Collaboration
          </h3>
        </div>
        {/* Connection Status Indicator */}
        <div className="flex items-center gap-1.5">
          {connected === null && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" /> Connecting...
            </span>
          )}
          {connected === true && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
              <Wifi className="h-3 w-3" /> Live
            </span>
          )}
          {connected === false && (
            <span className="flex items-center gap-1 text-[10px] text-rose-400 font-bold">
              <WifiOff className="h-3 w-3" /> Disconnected
            </span>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-[11px] font-medium flex items-center justify-between animate-in slide-in-from-top-1">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-[10px] text-amber-400/60 hover:text-amber-400 font-bold px-1">
            Dismiss
          </button>
        </div>
      )}

      {/* Message Stream */}
      <div className="p-4 space-y-4 min-h-[200px] max-h-[380px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-xs font-bold">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2 opacity-50 py-8">
            <MessageSquare className="h-8 w-8" />
            <p className="text-xs font-semibold">No messages yet. Start the conversation.</p>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isMention = m.message?.includes("@");
            const initials = (m.user?.full_name || "?").substring(0, 2).toUpperCase();
            return (
              <div key={m.id || idx} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm overflow-hidden">
                  {m.user?.profile_photo ? (
                    <img src={m.user.profile_photo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="flex flex-col space-y-1 w-full max-w-[85%]">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold ${isLightMode ? "text-gray-900" : "text-white"}`}>
                      {m.user?.full_name || "..."}
                    </span>
                    <span className="text-[9px] text-gray-500">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className={`p-3 rounded-2xl rounded-tl-sm text-xs leading-relaxed ${
                    isMention
                      ? (isLightMode ? "bg-indigo-50 border border-indigo-100 text-indigo-900" : "bg-indigo-500/10 border border-indigo-500/20 text-indigo-100")
                      : (isLightMode ? "bg-gray-100 text-gray-800" : "bg-white/5 text-gray-200")
                  }`}>
                    {m.message}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className={`p-3 border-t ${isLightMode ? "border-gray-200 bg-gray-50/50" : "border-white/5 bg-black/20"}`}>
        <form
          onSubmit={handleSend}
          className={`flex items-center gap-2 p-2 rounded-xl border focus-within:ring-2 focus-within:ring-blue-500 transition-all ${
            isLightMode ? "bg-white border-gray-300" : "bg-black/50 border-white/10"
          }`}
        >
          <button type="button" className="p-2 text-gray-400 hover:text-blue-500 transition-colors" tabIndex={-1}>
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            type="text"
            className="flex-1 bg-transparent border-none text-sm focus:outline-none focus:ring-0 placeholder-gray-500 dark:text-white"
            placeholder="Type a message or use @ to mention someone..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending}
          />
          <button type="button" className="p-2 text-gray-400 hover:text-amber-500 transition-colors" tabIndex={-1}>
            <Smile className="h-4 w-4" />
          </button>
          <AppButton
            type="submit"
            variant="primary"
            size="sm"
            className="h-8 w-8 p-0 rounded-lg shrink-0 flex items-center justify-center bg-blue-600 hover:bg-blue-700"
            disabled={sending || !newMessage.trim()}
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </AppButton>
        </form>
      </div>
    </AppCard>
  );
}
