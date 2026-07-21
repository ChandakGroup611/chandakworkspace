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
  const isLightMode = ["light-neumorphic", "glassmorphism", "pure-white"].includes(theme);
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
            <MessageSquare className={`h-10 w-10 mb-4 text-gray-400`} />
            <p className={`text-sm font-medium ${"text-muted"}`}>No collaboration history yet.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 group animate-in fade-in slide-in-from-bottom-1`}>
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 uppercase text-xs font-bold border ${
                "bg-elevated border-border text-muted"
              }`}>
                {msg.author.slice(0, 2)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold tracking-wide ${"text-foreground"}`}>{msg.author}</span>
                  {msg.is_private ? (
                    <span className={`flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                      "text-amber-700 bg-amber-50"
                    }`}>
                      <Lock className="h-2.5 w-2.5" /> Private
                    </span>
                  ) : (
                    <span className={`flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                      "text-emerald-700 bg-emerald-50"
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
                    ? ("bg-amber-50/50 border-amber-100 text-muted") 
                    : ("bg-elevated/50 border-border text-muted")
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div className={`pt-4 border-t ${"border-border"}`}>
        <form onSubmit={handleSendMessage} className="space-y-4">
          <div className="flex items-center gap-4 px-2">
            <AppButton 
              type="button"
              variant={isPrivate ? "outline" : "ghost"}
              onClick={() => setIsPrivate(true)}
              className={`h-8 px-3 text-[10px] font-bold uppercase tracking-widest ${
                isPrivate 
                  ? ("bg-amber-100 text-amber-700 border-amber-200") 
                  : ""
              }`}
              leftIcon={<Lock className="h-3 w-3" />}
            >
              Internal Chat
            </AppButton>
            <AppButton 
              type="button"
              variant={!isPrivate ? "outline" : "ghost"}
              onClick={() => setIsPrivate(false)}
              className={`h-8 px-3 text-[10px] font-bold uppercase tracking-widest ${
                !isPrivate 
                  ? ("bg-emerald-100 text-emerald-700 border-emerald-200") 
                  : ""
              }`}
              leftIcon={<Globe className="h-3 w-3" />}
            >
              Public Reply
            </AppButton>
          </div>

          <div className="relative">
            <textarea 
              className={`w-full h-24 p-4 pr-12 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none transition-all ${
                "bg-white border-border text-foreground placeholder:text-gray-400"
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
              <AppButton type="button" variant="ghost" size="sm" className="p-2 h-auto text-muted-foreground hover:text-accent">
                <Paperclip className="h-4 w-4" />
              </AppButton>
              <AppButton type="submit" variant="primary" size="sm" className="h-8 w-8 p-0 flex items-center justify-center rounded-xl bg-accent hover:bg-accent shadow-lg shadow-indigo-500/20">
                <Send className="h-4 w-4" />
              </AppButton>
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

