"use client";

import React, { useState, useEffect, useRef, useCallback, Profiler } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Send, Smile, Paperclip, MessageSquare, Wifi, WifiOff, Loader2, Users, Zap } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRenderLog } from "@/hooks/use-render-log";
import { onRenderCallback } from "@/utils/performance/profiler-utils";
import { fetchTicketMacros } from "@/lib/actions/tickets";

export default function TicketRealtimeChat({ ticketId }: { ticketId: string }) {
  useRenderLog("TicketRealtimeChat", { ticketId });
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

  // Macros state
  const [macros, setMacros] = useState<any[]>([]);
  const [showMacros, setShowMacros] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      const { data: ticketData } = await supabase.from('tickets').select('workspace_id, department_id').eq('id', ticketId).single();
      if (ticketData?.workspace_id && isMounted) {
        const { data: members } = await supabase.from('workspace_members').select('user_id').eq('workspace_id', ticketData.workspace_id);
        
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

        // Fetch Macros
        const departmentId = ticketData?.department_id; // actually we just need any department macros. The fetchTicketMacros handles optional.
        const macrosData = await fetchTicketMacros();
        if (isMounted) setMacros(macrosData || []);
      }
    }
    initData();

    // 1. Fetch historical messages
    async function fetchMessages() {
      setLoading(true);
      const { data, error: fetchErr } = await supabase
        .from("ticket_chat_messages")
        .select("*, user:user_master(id, full_name, profile_photo)")
        .eq("ticket_id", ticketId)
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
      .channel(`ticket_chat_${ticketId}`, {
        config: { broadcast: { self: true } }
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_chat_messages",
          filter: `ticket_id=eq.${ticketId}`,
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
  }, [ticketId]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error: delErr } = await supabase.from('ticket_chat_messages').delete().eq('id', messageId);
      if (delErr) throw delErr;
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err: any) {
      console.error("Failed to delete message:", err);
      setError("Failed to delete message.");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newMessage.trim();
    if ((!trimmed && selectedFiles.length === 0) || sending) return;

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
      let uploadedAttachments: any[] = [];
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
          const filePath = `${ticketId}/${fileName}`;
          
          const { error: uploadError, data: uploadData } = await supabase.storage
            .from('ticket_attachments')
            .upload(filePath, file, { contentType: file.type });
            
          if (uploadError || !uploadData) {
            throw new Error(`Failed to upload ${file.name}: ${uploadError?.message || 'Unknown error'}`);
          }

          // Create database record to enable secure proxy access
          const { data: dbData } = await supabase.from('ticket_attachments').insert([{
             ticket_id: ticketId,
             file_name: file.name,
             file_url: `storage:ticket_attachments:${filePath}`,
             file_type: file.type,
             size: file.size,
             uploaded_by: userId
          }]).select().single();

          const fileUrl = dbData?.id ? `/api/proxy-attachment/${dbData.id}` : supabase.storage.from('ticket_attachments').getPublicUrl(filePath).data.publicUrl;

          uploadedAttachments.push({
            id: dbData?.id,
            name: file.name,
            url: fileUrl,
            size: file.size,
            type: file.type
          });
        }
      }
      setSelectedFiles([]);

      let finalMessage = trimmed;
      if (uploadedAttachments.length > 0) {
        finalMessage += "|||ATTACHMENTS|||" + JSON.stringify(uploadedAttachments);
      }
      const { data, error: insertErr } = await supabase
        .from("ticket_chat_messages")
        .insert([{ ticket_id: ticketId, user_id: userId, message: finalMessage }])
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Handle @mentions via API route
      if ((finalMentionedIds.length > 0 || finalIsAll) && data?.id) {
        fetch("/api/mentions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            ticketId, 
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
    <Profiler id={`TicketRealtimeChat-${ticketId}`} onRender={onRenderCallback}>
    <AppCard className={`flex flex-col h-full overflow-hidden border-smooth bg-white shadow-sm`}>

      {/* Header */}
      <div className={`p-4 border-b flex items-center justify-between gap-2 ${"border-border"}`}>
        <div className="flex items-center gap-2">
          <MessageSquare className={`h-4 w-4 text-accent`} />
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
        <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-[0.8rem] shrink-0 font-medium flex items-center justify-between animate-in slide-in-from-top-1">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs text-amber-400/60 hover:text-amber-400 font-bold px-1">
            Dismiss
          </button>
        </div>
      )}

      {/* Message Stream */}
      <div 
        ref={scrollContainerRef}
        className="p-4 space-y-4 flex-1 overflow-y-auto"
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
                      <span className={`text-xs font-bold text-foreground`}>
                        {m.user?.full_name || "..."}
                      </span>
                      <span className="text-[0.7rem] text-gray-500">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}
                  {isSender && (
                    <div className="px-1 flex items-center gap-2">
                      {Date.now() - new Date(m.created_at).getTime() < 5 * 60 * 1000 && (
                        <button 
                          onClick={() => handleDeleteMessage(m.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete message"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                        </button>
                      )}
                      <span className="text-[0.7rem] text-gray-500">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}
                  
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    isSender 
                      ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-tr-sm border border-accent/30"
                      : isMention
                        ? ("bg-accent/10 border border-indigo-100 text-accent-secondary rounded-tl-sm")
                        : ("bg-gray-100 text-foreground rounded-tl-sm")
                  }`}>
                    {(() => {
                      const parts = m.message.split("|||ATTACHMENTS|||");
                      let text = parts[0];
                      let attachments: any[] = [];
                      if (parts.length > 1) {
                        try { attachments = JSON.parse(parts[1]); } catch(e) {}
                      }
                      return (
                        <div className="flex flex-col gap-2">
                          {text && <div>{text}</div>}
                          {attachments.length > 0 && (
                            <div className="flex flex-col gap-1.5 mt-1 border-t border-white/20 pt-2">
                              {attachments.map((att, i) => (
                                att.type?.startsWith('image/') ? (
                                  <div key={i} className="mt-1 relative group rounded-lg overflow-hidden border border-black/10 dark:border-white/10">
                                    <img src={att.url} alt={att.name} className="max-w-full max-h-48 object-contain bg-black/5 dark:bg-white/5 transition-transform duration-300 group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-opacity">
                                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 p-2 hover:bg-white/10 rounded-lg text-white transition-colors" title="View Full Image">
                                        <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm shadow-lg">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                        </div>
                                        <span className="text-[10px] font-semibold uppercase tracking-wider">View</span>
                                      </a>
                                      <a href={att.url} download={att.name} className="flex flex-col items-center gap-1 p-2 hover:bg-white/10 rounded-lg text-white transition-colors" title="Download Image">
                                        <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm shadow-lg">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                                        </div>
                                        <span className="text-[10px] font-semibold uppercase tracking-wider">Download</span>
                                      </a>
                                    </div>
                                  </div>
                                ) : (
                                <div key={i} className={`flex items-center justify-between p-2 rounded border ${isSender ? 'bg-black/10 border-black/10' : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10'}`}>
                                  <div className="flex items-center gap-2 overflow-hidden mr-3">
                                    <Paperclip className="h-4 w-4 shrink-0 opacity-70" />
                                    <span className="truncate text-[11px] font-medium" title={att.name}>{att.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <a href={att.name.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i) ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(att.url.startsWith('http') ? att.url : `https://chandakgroup.tech${att.url}`)}` : att.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded transition-colors ${isSender ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 text-foreground'}`} title="View Document">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                      <span>VIEW</span>
                                    </a>
                                    <a href={att.url} download={att.name} className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded transition-colors ${isSender ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 text-foreground'}`} title="Download Document">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                                      <span>DOWNLOAD</span>
                                    </a>
                                  </div>
                                </div>
                                )
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Chat Input Area */}
      <div className={`p-3 border-t shrink-0 relative border-border bg-gray-50/50`}>
        
        {/* Mentions Dropdown */}
        {showMentions && (
          <div className={`absolute bottom-full mb-2 left-4 right-16 rounded-xl shadow-xl border overflow-hidden flex flex-col z-50 animate-in slide-in-from-bottom-2 ${
            "bg-surface border-border"
          }`}>
            <div className="max-h-48 overflow-y-auto py-1">
              {/* @All Option */}
              {("all".includes(mentionFilter)) && (
                <button
                  type="button"
                  onClick={() => insertMention('ALL')}
                  className={`w-full text-left px-4 py-2 text-xs flex items-center gap-2 transition-colors ${
                    "hover:bg-accent/10 text-accent font-bold"
                  }`}
                >
                  <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center">
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
                      "hover:bg-elevated text-muted"
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

        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-50 dark:bg-white/5 rounded-lg">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center gap-1 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 px-2 py-1 rounded text-xs">
                <span className="truncate max-w-[120px]">{file.name}</span>
                <button type="button" onClick={() => removeFile(idx)} className="text-gray-400 hover:text-red-500 ml-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Macros Dropdown */}
        {showMacros && macros.length > 0 && (
          <div className={`absolute bottom-full mb-2 left-16 w-64 rounded-xl shadow-xl border overflow-hidden flex flex-col z-50 animate-in slide-in-from-bottom-2 ${
            "bg-surface border-border"
          }`}>
            <div className="bg-gray-100 dark:bg-black/20 p-2 border-b border-gray-200 dark:border-white/10 text-xs font-bold uppercase text-gray-500">
              Quick Responses (Macros)
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
              {macros.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setNewMessage(prev => prev + (prev ? " " : "") + m.content);
                    setShowMacros(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-xs flex flex-col gap-1 transition-colors ${
                    "hover:bg-accent/10 text-muted"
                  }`}
                >
                  <span className="font-bold text-accent">{m.title}</span>
                  <span className="truncate opacity-70">{m.content}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          onSubmit={handleSend}
          className={`flex items-center gap-2 p-1.5 rounded-xl border focus-within:ring-2 focus-within:ring-accent transition-all ${
            "bg-surface border-border"
          }`}
        >
          <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-accent transition-colors shrink-0" tabIndex={-1}>
            <Paperclip className="h-4 w-4" />
          </button>
          
          <input
            type="text"
            className="flex-1 min-w-0 bg-transparent border-0 border-transparent shadow-none text-sm focus:outline-none focus:ring-0 focus:border-transparent placeholder-gray-500 dark:text-white px-0 m-0"
            placeholder="Type a message or use @ to mention someone..."
            value={newMessage}
            onChange={handleInputChange}
            disabled={sending}
          />
          
          <button 
            type="button" 
            onClick={() => setShowMacros(!showMacros)}
            className={`p-2 transition-colors shrink-0 ${showMacros ? 'text-accent' : 'text-gray-400 hover:text-accent'}`} 
            tabIndex={-1}
            title="Use Canned Response"
          >
            <Zap className="h-4 w-4" />
          </button>
          
          <button type="button" className="p-2 text-gray-400 hover:text-amber-500 transition-colors shrink-0" tabIndex={-1}>
            <Smile className="h-4 w-4" />
          </button>
          
          <AppButton
            type="submit"
            variant="primary"
            size="sm"
            className="h-8 w-8 p-0 rounded-lg shrink-0 flex items-center justify-center bg-accent hover:bg-accent-secondary"
            disabled={sending || (!newMessage.trim() && selectedFiles.length === 0)}
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </AppButton>
        </form>
      </div>
    </AppCard>
    </Profiler>
  );
}
