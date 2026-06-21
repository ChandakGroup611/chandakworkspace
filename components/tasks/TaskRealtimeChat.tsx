"use client";

import React, { useState, useEffect, useRef, useCallback, Profiler } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Send, Smile, Paperclip, MessageSquare, Wifi, WifiOff, Loader2, Users } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRenderLog } from "@/hooks/use-render-log";
import { onRenderCallback } from "@/utils/performance/profiler-utils";

export default function TaskRealtimeChat({ taskId }: { taskId: string }) {
  useRenderLog("TaskRealtimeChat", { taskId });
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);
  // Create client once with useRef so it's stable across renders
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null); // null = connecting
  
  // Mentions state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [stakeholders, setStakeholders] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [isAllMentioned, setIsAllMentioned] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initData() {
      // Fetch current user for styling
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user && isMounted) {
        setCurrentUserId(userData.user.id);
      }

      // Fetch workspace stakeholders for mentions
      const { data: taskData } = await supabase.from('tasks').select('workspace_id').eq('id', taskId).single();
      if (taskData?.workspace_id && isMounted) {
        const { data: members } = await supabase.from('workspace_members').select('user_id').eq('workspace_id', taskData.workspace_id);
        
        // Also fetch SUPER_ADMIN users so they can be mentioned globally
        const { data: superAdminRole } = await supabase.from('role_master').select('id').eq('role_code', 'SUPER_ADMIN').single();
        const { data: superAdmins } = superAdminRole ? await supabase.from('user_master').select('id').eq('role_id', superAdminRole.id) : { data: [] };

        const memberUids = members ? members.map(m => m.user_id) : [];
        const adminUids = superAdmins ? superAdmins.map(a => a.id) : [];
        const uids = Array.from(new Set([...memberUids, ...adminUids]));

        if (uids.length > 0) {
          const { data: users } = await supabase.from('user_master').select('id, full_name, profile_photo').in('id', uids);
          if (isMounted) setStakeholders(users || []);
        }
      }
    }
    initData();

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewMessage(val);

    const match = val.match(/@(\w*)$/);
    if (match) {
      setShowMentions(true);
      setMentionFilter(match[1].toLowerCase());
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (user: any | 'ALL') => {
    // Replace the last @... with the full name
    const parts = newMessage.split(/@(\w*)$/);
    if (parts.length > 1) {
      const base = parts[0];
      if (user === 'ALL') {
        setNewMessage(base + "@All ");
        setIsAllMentioned(true);
      } else {
        setNewMessage(base + `@${user.full_name} `);
        if (!mentionedUserIds.includes(user.id)) {
          setMentionedUserIds(prev => [...prev, user.id]);
        }
      }
    }
    setShowMentions(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newMessage.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);
    const userId = currentUserId;

    // Auto-detect mentions if user typed them manually without clicking dropdown
    let finalMentionedIds = [...mentionedUserIds];
    let finalIsAll = isAllMentioned;

    if (trimmed.includes('@')) {
      if (trimmed.toLowerCase().includes('@all')) {
        finalIsAll = true;
      }
      const words = trimmed.split(/\s+/);
      const mentionWords = words.filter(w => w.startsWith('@')).map(w => w.substring(1).toLowerCase());
      
      mentionWords.forEach(mw => {
        if (!mw) return;
        stakeholders.forEach(u => {
           if (u.id !== currentUserId && u.full_name && u.full_name.toLowerCase().includes(mw)) {
              if (!finalMentionedIds.includes(u.id)) {
                 finalMentionedIds.push(u.id);
              }
           }
        });
      });
      
      // Also check exact match for full names with spaces
      stakeholders.forEach(u => {
        if (u.id !== currentUserId && u.full_name && trimmed.toLowerCase().includes(`@${u.full_name.toLowerCase()}`)) {
          if (!finalMentionedIds.includes(u.id)) {
            finalMentionedIds.push(u.id);
          }
        }
      });
    }

    setNewMessage(""); // Optimistic clear
    setShowMentions(false);

    try {
      const { data, error: insertErr } = await supabase
        .from("task_chat_messages")
        .insert([{ task_id: taskId, user_id: userId, message: trimmed }])
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Handle @mentions via API route
      if ((finalMentionedIds.length > 0 || finalIsAll) && data?.id) {
        fetch("/api/mentions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            taskId, 
            messageId: data.id,
            mentionedUserIds: finalMentionedIds,
            isAll: finalIsAll,
            senderId: userId
          }),
        }).catch((e) => console.error("Mentions dispatch failed:", e));
      }
      setMentionedUserIds([]);
      setIsAllMentioned(false);
    } catch (err: any) {
      console.error("Failed to send message:", err);
      setNewMessage(trimmed); // Restore
      setError(err.message || "Failed to send message.");
      setTimeout(() => setError(null), 6000);
    } finally {
      setSending(false);
    }
  };

  return (
    <Profiler id={`TaskRealtimeChat-${taskId}`} onRender={onRenderCallback}>
    <AppCard className={`flex flex-col border-smooth ${isLightMode ? "bg-white shadow-sm" : "bg-elevated"}`}>

      {/* Header */}
      <div className={`p-4 border-b flex items-center justify-between gap-2 ${"border-border"}`}>
        <div className="flex items-center gap-2">
          <MessageSquare className={`h-4 w-4 ${isLightMode ? "text-blue-600" : "text-blue-400"}`} />
          <h3 className={`text-sm font-bold ${"text-foreground"}`}>
            Realtime Collaboration
          </h3>
        </div>
        {/* Connection Status Indicator */}
        <div className="flex items-center gap-1.5">
          {connected === null && (
            <span className="flex items-center gap-1 text-xs text-amber-400 font-bold animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" /> Connecting...
            </span>
          )}
          {connected === true && (
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
              <Wifi className="h-3 w-3" /> Live
            </span>
          )}
          {connected === false && (
            <span className="flex items-center gap-1 text-xs text-rose-400 font-bold">
              <WifiOff className="h-3 w-3" /> Disconnected
            </span>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-[0.8rem] font-medium flex items-center justify-between animate-in slide-in-from-top-1">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs text-amber-400/60 hover:text-amber-400 font-bold px-1">
            Dismiss
          </button>
        </div>
      )}

      {/* Message Stream */}
      <div 
        ref={scrollContainerRef}
        className="p-4 space-y-4 min-h-[200px] max-h-[380px] overflow-y-auto"
      >
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
            const isSender = m.user_id === currentUserId;

            return (
              <div key={m.id || idx} className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 ${isSender ? "flex-row-reverse" : ""}`}>
                {!isSender && (
                  <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-sm overflow-hidden">
                    {m.user?.profile_photo ? (
                      <img src={m.user.profile_photo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                )}
                
                <div className={`flex flex-col space-y-1 max-w-[85%] ${isSender ? "items-end" : "items-start"}`}>
                  {!isSender && (
                    <div className="flex items-center gap-2 px-1">
                      <span className={`text-xs font-bold ${isLightMode ? "text-gray-900" : "text-gray-300"}`}>
                        {m.user?.full_name || "..."}
                      </span>
                      <span className="text-[0.7rem] text-gray-500">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}
                  {isSender && (
                    <div className="px-1">
                      <span className="text-[0.7rem] text-gray-500">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}
                  
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    isSender 
                      ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-tr-sm border border-indigo-500/30"
                      : isMention
                        ? (isLightMode ? "bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-tl-sm" : "bg-indigo-900/30 border border-indigo-500/20 text-indigo-100 rounded-tl-sm")
                        : (isLightMode ? "bg-gray-100 text-gray-800 rounded-tl-sm" : "bg-[#1f2233] text-gray-200 rounded-tl-sm")
                  }`}>
                    {m.message}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Chat Input Area */}
      <div className={`p-3 border-t relative ${isLightMode ? "border-gray-200 bg-gray-50/50" : "border-white/5 bg-black/20"}`}>
        
        {/* Mentions Dropdown */}
        {showMentions && (
          <div className={`absolute bottom-full mb-2 left-4 right-16 rounded-xl shadow-xl border overflow-hidden flex flex-col z-50 animate-in slide-in-from-bottom-2 ${
            isLightMode ? "bg-white border-gray-200" : "bg-[#1f2233] border-white/10"
          }`}>
            <div className="max-h-48 overflow-y-auto py-1">
              {/* @All Option */}
              {("all".includes(mentionFilter)) && (
                <button
                  type="button"
                  onClick={() => insertMention('ALL')}
                  className={`w-full text-left px-4 py-2 text-xs flex items-center gap-2 transition-colors ${
                    isLightMode ? "hover:bg-indigo-50 text-indigo-700 font-bold" : "hover:bg-indigo-500/20 text-indigo-400 font-bold"
                  }`}
                >
                  <div className="h-6 w-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <Users className="h-3 w-3" />
                  </div>
                  Notify Everyone (@All)
                </button>
              )}
              
              {/* Stakeholders */}
              {stakeholders
                .filter(u => u.id !== currentUserId && u.full_name?.toLowerCase().includes(mentionFilter))
                .map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => insertMention(u)}
                    className={`w-full text-left px-4 py-2 text-xs flex items-center gap-2 transition-colors ${
                      isLightMode ? "hover:bg-gray-50 text-gray-700" : "hover:bg-white/5 text-gray-300"
                    }`}
                  >
                    <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-[0.65rem] overflow-hidden">
                      {u.profile_photo ? <img src={u.profile_photo} alt="" className="h-full w-full object-cover" /> : u.full_name.substring(0, 2).toUpperCase()}
                    </div>
                    {u.full_name}
                  </button>
                ))
              }
              
              {stakeholders.filter(u => u.id !== currentUserId && u.full_name?.toLowerCase().includes(mentionFilter)).length === 0 && !("all".includes(mentionFilter)) && (
                <div className="px-4 py-3 text-xs text-gray-500 text-center">No team members found</div>
              )}
            </div>
          </div>
        )}

        <form
          onSubmit={handleSend}
          className={`flex items-center gap-2 p-2 rounded-xl border focus-within:ring-2 focus-within:ring-blue-500 transition-all ${
            isLightMode ? "bg-white border-gray-300" : "bg-[#0a0c16] border-white/10"
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
            onChange={handleInputChange}
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
    </Profiler>
  );
}
