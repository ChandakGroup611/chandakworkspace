"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { Send, Lock, Globe, Smile, Paperclip, MoreHorizontal } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { useTheme } from "@/components/theme/ThemeProvider";

interface TicketChatProps {
  ticket: any;
}

export function TicketChat({ ticket }: TicketChatProps) {
  const supabase = createClient();
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze"].includes(theme);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    if (!ticket?.dbId) return;
    try {
      const { data, error } = await supabase
        .from("ticket_chats")
        .select("*")
        .eq("ticket_id", ticket.dbId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error("Chat fetch error:", err);
    }
  };

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`ticket_chat_${ticket.dbId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_chats",
          filter: `ticket_id=eq.${ticket.dbId}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticket.dbId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase.from("ticket_chats").insert([{
        ticket_id: ticket.dbId,
        author: user.email?.split("@")[0] || "System User",
        content: newMessage.trim(),
        is_private: isPrivate
      }]);

      if (error) throw error;
      setNewMessage("");
    } catch (err) {
      console.error("Message send failed:", err);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-6 min-h-0"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
            <MessageSquare className={`h-10 w-10 mb-4 ${isLightMode ? "text-gray-400" : "text-gray-700"}`} />
            <p className={`text-sm font-medium ${isLightMode ? "text-gray-500" : "text-gray-400"}`}>No collaboration history yet.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 group animate-in fade-in slide-in-from-bottom-1`}>
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 uppercase text-xs font-bold border ${
                isLightMode ? "bg-gray-100 border-gray-200 text-gray-500" : "bg-white/5 border-white/10 text-gray-500"
              }`}>
                {msg.author.slice(0, 2)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold tracking-wide ${isLightMode ? "text-gray-900" : "text-white"}`}>{msg.author}</span>
                  {msg.is_private ? (
                    <span className={`flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                      isLightMode ? "text-amber-700 bg-amber-50" : "text-amber-500 bg-amber-500/10"
                    }`}>
                      <Lock className="h-2.5 w-2.5" /> Private
                    </span>
                  ) : (
                    <span className={`flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                      isLightMode ? "text-emerald-700 bg-emerald-50" : "text-emerald-500 bg-emerald-500/10"
                    }`}>
                      <Globe className="h-2.5 w-2.5" /> Public
                    </span>
                  )}
                  <span className="text-[0.7rem] text-gray-500 font-medium ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed border ${
                  msg.is_private 
                    ? (isLightMode ? "bg-amber-50/50 border-amber-100 text-gray-700" : "bg-amber-500/5 border-amber-500/10 text-amber-100/70") 
                    : (isLightMode ? "bg-gray-50/50 border-gray-100 text-gray-700" : "bg-white/[0.03] border-white/5 text-gray-300")
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div className={`pt-4 border-t ${isLightMode ? "border-gray-100" : "border-white/5"}`}>
        <form onSubmit={handleSendMessage} className="space-y-4">
          <div className="flex items-center gap-4 px-2">
            <button 
              type="button"
              onClick={() => setIsPrivate(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                isPrivate 
                  ? (isLightMode ? "bg-amber-100 text-amber-700 ring-1 ring-amber-200" : "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50") 
                  : (isLightMode ? "bg-gray-100 text-gray-500 hover:text-gray-700" : "bg-white/5 text-gray-500 hover:text-gray-400")
              }`}
            >
              <Lock className="h-3 w-3" /> Internal Chat
            </button>
            <button 
              type="button"
              onClick={() => setIsPrivate(false)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                !isPrivate 
                  ? (isLightMode ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" : "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50") 
                  : (isLightMode ? "bg-gray-100 text-gray-500 hover:text-gray-700" : "bg-white/5 text-gray-500 hover:text-gray-400")
              }`}
            >
              <Globe className="h-3 w-3" /> Public Reply
            </button>
          </div>

          <div className="relative">
            <textarea 
              className={`w-full h-24 p-4 pr-12 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none transition-all ${
                isLightMode 
                  ? "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400" 
                  : "bg-white/[0.02] border-white/10 text-white placeholder:text-gray-600"
              }`}
              placeholder={isPrivate ? "Type a private internal message..." : "Type a reply to the customer..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <div className="absolute right-4 bottom-4 flex items-center gap-3">
              <button type="button" className="p-2 text-gray-500 hover:text-indigo-600 transition-colors">
                <Paperclip className="h-4 w-4" />
              </button>
              <button type="submit" className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Icon wrapper for empty state
function MessageSquare(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
