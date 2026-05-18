"use client";

import React, { useState, useEffect, useRef } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Send, Smile, Paperclip, MessageSquare } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function TaskRealtimeChat({ taskId }: { taskId: string }) {
  const { theme } = useTheme();
  const isLightMode = theme === "executive-light";
  const supabase = createClient();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Fetch historical messages
    async function fetchMessages() {
      const { data, error: fetchErr } = await supabase
        .from("task_chat_messages")
        .select("*, user:user_master(full_name, profile_photo)")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
        
      if (fetchErr) {
        console.error("Error fetching messages:", fetchErr);
        setError("Database access restriction: Failed to load collaboration stream. (RLS Policy block)");
      } else if (data) {
        setMessages(data);
      }
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    fetchMessages();

    // 2. Subscribe to realtime WebSocket events
    const channel = supabase.channel(`task_chat_${taskId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_chat_messages', filter: `task_id=eq.${taskId}` },
        async (payload) => {
          // Fetch user details for the new message
          const { data: user } = await supabase.from('user_master').select('full_name, profile_photo').eq('id', payload.new.user_id).single();
          const newMsg = { ...payload.new, user };
          setMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const msg = newMessage;
    setNewMessage(""); // Optimistic clear

    try {
      const { data, error } = await supabase
        .from("task_chat_messages")
        .insert([{
          task_id: taskId,
          user_id: userId,
          message: msg
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      // If mentions exist in message, trigger server action to handle them
      if (msg.includes('@')) {
        try {
          await fetch('/api/mentions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg, taskId, messageId: data.id })
          });
        } catch (e) {
          console.error('Failed to forward mentions to server:', e);
        }
      }
    } catch (err: any) {
      console.error("Failed to send message:", err);
      setNewMessage(msg); // Restore original message to input
      setError(err.message || "Failed to post remark: Verify database RLS permissions.");
      setTimeout(() => setError(null), 6000);
    }
  };

  return (
    <AppCard className={`flex flex-col border ${isLightMode ? "bg-white border-gray-200" : "bg-[#0a0c16] border-white/10"}`}>
      
      <div className={`p-4 border-b flex items-center justify-between gap-2 ${isLightMode ? "border-gray-200" : "border-white/5"}`}>
        <div className="flex items-center gap-2">
          <MessageSquare className={`h-4 w-4 ${isLightMode ? "text-blue-600" : "text-blue-400"}`} />
          <h3 className={`text-sm font-bold ${isLightMode ? "text-gray-900" : "text-white"}`}>Realtime Collaboration</h3>
        </div>
        {error && (
          <span className="text-[10px] text-amber-500 font-bold animate-pulse">RLS Protected</span>
        )}
      </div>

      {/* Sleek Error Notification Overlay */}
      {error && (
        <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-[11px] font-medium flex items-center justify-between animate-in slide-in-from-top-1">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-[10px] text-amber-400/60 hover:text-amber-400 font-bold px-1">Dismiss</button>
        </div>
      )}

      {/* Message Stream */}
      <div className="p-4 space-y-4">
        {messages.map((m, idx) => {
          const isMention = m.message.includes('@');
          return (
            <div key={m.id || idx} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm overflow-hidden">
                {m.user?.profile_photo ? <img src={m.user.profile_photo} alt="" className="h-full w-full object-cover"/> : m.user?.full_name?.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col space-y-1 w-full max-w-[85%]">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold ${isLightMode ? "text-gray-900" : "text-white"}`}>{m.user?.full_name || "Unknown"}</span>
                  <span className="text-[9px] text-gray-500">{new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
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
        })}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2 opacity-50">
            <MessageSquare className="h-8 w-8" />
            <p className="text-xs font-semibold">No messages yet. Start the conversation.</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className={`p-3 border-t ${isLightMode ? "border-gray-200 bg-gray-50/50" : "border-white/5 bg-black/20"}`}>
        <form onSubmit={handleSend} className={`flex items-center gap-2 p-2 rounded-xl border focus-within:ring-2 focus-within:ring-blue-500 transition-all ${
          isLightMode ? "bg-white border-gray-300" : "bg-black/50 border-white/10"
        }`}>
          <button type="button" className="p-2 text-gray-400 hover:text-blue-500 transition-colors"><Paperclip className="h-4 w-4" /></button>
          <input 
            type="text"
            className="flex-1 bg-transparent border-none text-sm focus:outline-none focus:ring-0 placeholder-gray-500 dark:text-white"
            placeholder="Type a message or use @ to mention someone..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
          />
          <button type="button" className="p-2 text-gray-400 hover:text-amber-500 transition-colors"><Smile className="h-4 w-4" /></button>
          <AppButton type="submit" variant="primary" size="sm" className="h-8 w-8 p-0 rounded-lg shrink-0 flex items-center justify-center bg-blue-600 hover:bg-blue-700">
            <Send className="h-3.5 w-3.5" />
          </AppButton>
        </form>
      </div>

    </AppCard>
  );
}
