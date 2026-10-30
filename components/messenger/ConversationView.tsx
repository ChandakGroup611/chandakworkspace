"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Users,
  Search,
  MoreVertical,
  Info,
  Check,
  CheckCheck,
  Reply,
  Copy,
  Trash2,
  FileText,
  FileSpreadsheet,
  Download,
  Eye,
  Play,
  Pause,
  Volume2,
  Image as ImageIcon,
  Loader2,
  Smile,
} from "lucide-react";
import {
  MessengerConversation,
  MessengerMessage,
  MessengerAttachment,
  WorkspaceUser,
  fetchMessengerMessages,
  sendMessengerMessage,
  markConversationAsRead,
  deleteMessengerMessage,
  toggleMessageReaction,
  SendMessagePayload,
} from "@/lib/actions/messenger";
import { MessageComposer } from "./MessageComposer";
import { AttachmentPreviewModal } from "./AttachmentPreviewModal";
import { GroupInfoModal } from "./GroupInfoModal";
import { createClient } from "@/utils/supabase/client";

interface ConversationViewProps {
  conversation: MessengerConversation;
  currentUserId: string;
  allUsers: WorkspaceUser[];
  onBack?: () => void;
  onConversationUpdated: () => void;
}

export function ConversationView({
  conversation,
  currentUserId,
  allUsers,
  onBack,
  onConversationUpdated,
}: ConversationViewProps) {
  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<{
    id: string;
    content: string;
    sender_name: string;
    message_type: string;
  } | null>(null);

  // Modals & Tools
  const [previewAttachment, setPreviewAttachment] = useState<MessengerAttachment | null>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [copyToast, setCopyToast] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Scroll to bottom helper
  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  // Fetch initial messages & mark read
  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      const data = await fetchMessengerMessages(conversation.id, 80);
      if (isMounted) {
        setMessages(data);
        setLoading(false);
        setTimeout(() => scrollToBottom(false), 50);
        markConversationAsRead(conversation.id).then(() => onConversationUpdated());
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [conversation.id, scrollToBottom, onConversationUpdated]);

  // Realtime subscription for incoming messages
  useEffect(() => {
    const channel = supabase
      .channel(`messenger_conv_${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messenger_messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        async (payload) => {
          const newMsgId = payload.new.id;
          // Fetch full message with sender join
          const recent = await fetchMessengerMessages(conversation.id, 10);
          const found = recent.find((m) => m.id === newMsgId);
          if (found) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === found.id)) return prev;
              return [...prev, found];
            });
            setTimeout(() => scrollToBottom(true), 50);
            markConversationAsRead(conversation.id);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messenger_messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === payload.new.id
                ? {
                    ...m,
                    content: payload.new.content,
                    is_deleted: payload.new.is_deleted,
                    is_edited: payload.new.is_edited,
                  }
                : m
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id, supabase, scrollToBottom]);

  // Handle Send Message
  const handleSendMessage = async (payload: SendMessagePayload): Promise<boolean> => {
    const res = await sendMessengerMessage(payload);
    if (res.success && res.message) {
      setMessages((prev) => [...prev, res.message!]);
      setTimeout(() => scrollToBottom(true), 50);
      onConversationUpdated();
      return true;
    }
    return false;
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    const res = await deleteMessengerMessage(messageId);
    if (res.success) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, is_deleted: true, content: "This message was deleted", attachments: [] }
            : m
        )
      );
    }
  };

  // Toggle reaction
  const handleToggleReaction = async (messageId: string, reaction: string) => {
    await toggleMessageReaction(messageId, reaction);
    const updated = await fetchMessengerMessages(conversation.id, 40);
    setMessages(updated);
  };

  // Copy text helper
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  };

  // Conversation title & subtitle
  const isDirect = conversation.type === "direct";
  const otherUser = conversation.other_user;
  const title = isDirect ? otherUser?.full_name || "Direct Chat" : conversation.title || "Group Chat";
  const subtitle = isDirect
    ? [otherUser?.department_name, otherUser?.designation_name].filter(Boolean).join(" • ") || "Workspace Colleague"
    : `${conversation.participants.length} members`;

  const getInitials = (name: string) => {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");
  };

  // Filter messages if search query exists
  const displayedMessages = searchQuery.trim()
    ? messages.filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : messages;

  return (
    <div className="flex flex-col h-full bg-surface/30 relative">
      {/* Toast Notification */}
      {copyToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
          Message copied to clipboard!
        </div>
      )}

      {/* Conversation Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface shrink-0 z-10 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="md:hidden p-1.5 -ml-1 text-muted hover:text-foreground hover:bg-surface-hover rounded-md transition-colors"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}

          <div
            className="relative cursor-pointer shrink-0"
            onClick={() => !isDirect && setShowGroupInfo(true)}
          >
            <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-sm font-semibold text-accent-soft-text">
              {isDirect ? (
                otherUser?.profile_photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={otherUser.profile_photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  getInitials(title)
                )
              ) : (
                <Users className="h-5 w-5" />
              )}
            </span>
            {isDirect && (
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-surface" />
            )}
          </div>

          <div
            className="min-w-0 cursor-pointer"
            onClick={() => !isDirect && setShowGroupInfo(true)}
          >
            <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
            <p className="text-xs text-muted truncate">{subtitle}</p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-lg transition-colors ${
              showSearch ? "bg-surface-hover text-accent" : "text-muted hover:text-foreground hover:bg-surface-hover"
            }`}
            title="Search in conversation"
            aria-label="Search messages"
          >
            <Search className="h-4 w-4" />
          </button>

          {!isDirect && (
            <button
              type="button"
              onClick={() => setShowGroupInfo(true)}
              className="p-2 text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors"
              title="Group information"
              aria-label="Group info"
            >
              <Info className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* In-Chat Search Bar */}
      {showSearch && (
        <div className="px-4 py-2 border-b border-border bg-surface/90 flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-muted shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search words in this chat..."
            className="w-full text-xs bg-transparent text-foreground placeholder:text-muted focus:outline-none"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs text-muted hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted text-xs gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
            <span>Loading conversation...</span>
          </div>
        ) : displayedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted">
            <div className="h-12 w-12 rounded-full bg-surface flex items-center justify-center mb-2">
              <Users className="h-6 w-6 text-muted/50" />
            </div>
            <p className="text-sm font-medium text-foreground">No messages yet</p>
            <p className="text-xs text-muted mt-1 max-w-xs">
              Say hello and start collaborating with your Chandak Workspace colleagues!
            </p>
          </div>
        ) : (
          displayedMessages.map((msg, idx) => {
            const isMe = msg.sender_id === currentUserId;
            const isSystem = msg.message_type === "system";

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-surface border border-border text-muted shadow-xs">
                    {msg.content}
                  </span>
                </div>
              );
            }

            const senderName = isMe ? "You" : msg.sender?.full_name || "Colleague";
            const timeStr = new Date(msg.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={msg.id}
                className={`group flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
              >
                {/* Sender Avatar for others in group */}
                {!isMe && !isDirect && (
                  <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-[11px] font-semibold text-accent-soft-text shrink-0 mb-1">
                    {msg.sender?.profile_photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={msg.sender.profile_photo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      getInitials(msg.sender?.full_name || "C")
                    )}
                  </span>
                )}

                {/* Message Bubble Container */}
                <div className={`relative max-w-[85%] md:max-w-[70%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  {/* Sender Name in Group */}
                  {!isMe && !isDirect && (
                    <span className="text-[11px] font-semibold text-muted ml-1 mb-1">
                      {msg.sender?.full_name}
                      {msg.sender?.department_name && (
                        <span className="font-normal text-muted/80"> • {msg.sender.department_name}</span>
                      )}
                    </span>
                  )}

                  {/* Quoted Reply Snippet */}
                  {msg.reply_to && (
                    <div
                      className={`text-xs px-3 py-1.5 mb-1 rounded-lg border-l-2 border-accent text-left ${
                        isMe ? "bg-accent-soft/20 text-foreground" : "bg-surface text-foreground"
                      }`}
                    >
                      <p className="font-semibold text-[11px] text-accent truncate">
                        {msg.reply_to.sender_name}
                      </p>
                      <p className="text-[11px] text-muted truncate">
                        {msg.reply_to.content || "Attachment"}
                      </p>
                    </div>
                  )}

                  {/* Bubble Content */}
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-sm shadow-xs break-words ${
                      isMe
                        ? "bg-accent text-accent-contrast rounded-br-xs"
                        : "bg-elevated border border-border text-foreground rounded-bl-xs"
                    }`}
                  >
                    {msg.is_deleted ? (
                      <span className="italic opacity-70 text-xs">This message was deleted</span>
                    ) : (
                      <>
                        {/* Text Content */}
                        {msg.content && (
                          <div className="whitespace-pre-wrap leading-relaxed select-text">
                            {renderContentWithMentions(msg.content, isMe)}
                          </div>
                        )}

                        {/* Attachments Section (Dual View & Download Compliance) */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className={`space-y-2 ${msg.content ? "mt-2 pt-2 border-t border-white/10 dark:border-border" : ""}`}>
                            {msg.attachments.map((att, aIdx) => {
                              const isImg =
                                att.type.startsWith("image/") ||
                                /\.(png|jpe?g|webp|gif|svg)$/i.test(att.name);
                              const isVoice =
                                msg.message_type === "voice" ||
                                att.type.startsWith("audio/") ||
                                /\.(webm|ogg|mp3|wav)$/i.test(att.name);

                              if (isVoice) {
                                return (
                                  <VoicePlayer
                                    key={aIdx}
                                    url={att.url}
                                    isSender={isMe}
                                  />
                                );
                              }

                              if (isImg) {
                                return (
                                  <div key={aIdx} className="overflow-hidden rounded-lg border border-border/50 bg-black/10">
                                    <div
                                      onClick={() => setPreviewAttachment(att)}
                                      className="cursor-pointer overflow-hidden relative group/img"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={att.url}
                                        alt={att.name}
                                        className="max-h-60 w-auto object-cover rounded-t-lg transition-transform hover:scale-105 duration-200"
                                      />
                                    </div>
                                    <div className="flex items-center justify-between p-1.5 bg-black/20 text-xs">
                                      <span className="text-[11px] truncate pr-2 opacity-80" title={att.name}>
                                        {att.name}
                                      </span>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => setPreviewAttachment(att)}
                                          className="p-1 hover:bg-white/20 rounded transition-colors text-current"
                                          title="View preview"
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                        </button>
                                        <a
                                          href={`${att.url}${att.url.includes("?") ? "&" : "?"}download=1`}
                                          download={att.name}
                                          className="p-1 hover:bg-white/20 rounded transition-colors text-current"
                                          title="Download image"
                                        >
                                          <Download className="h-3.5 w-3.5" />
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              // Standard Document Card
                              return (
                                <div
                                  key={aIdx}
                                  className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                                    isMe
                                      ? "bg-white/10 border-white/20 text-white"
                                      : "bg-surface border-border text-foreground"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0 mr-2">
                                    <FileText className="h-4 w-4 shrink-0 opacity-80" />
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium truncate" title={att.name}>
                                        {att.name}
                                      </p>
                                      <p className="text-[10px] opacity-70">
                                        {(att.size / 1024).toFixed(0)} KB
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewAttachment(att)}
                                      className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors ${
                                        isMe ? "hover:bg-white/20" : "hover:bg-surface-hover"
                                      }`}
                                      title="View in modal"
                                    >
                                      View
                                    </button>
                                    <a
                                      href={`${att.url}${att.url.includes("?") ? "&" : "?"}download=1`}
                                      download={att.name}
                                      className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors ${
                                        isMe ? "hover:bg-white/20" : "hover:bg-surface-hover"
                                      }`}
                                      title="Download file"
                                    >
                                      Download
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}

                    {/* Timestamp & Read Receipts */}
                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-70 select-none">
                      <span>{timeStr}</span>
                      {isMe && !msg.is_deleted && (
                        <CheckCheck className="h-3 w-3 text-current" />
                      )}
                    </div>
                  </div>

                  {/* Reaction Badges */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {msg.reactions.map((r) => (
                        <span
                          key={r.id}
                          onClick={() => handleToggleReaction(msg.id, r.reaction)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-surface border border-border shadow-xs cursor-pointer hover:scale-110 transition-transform"
                          title={`Reacted by ${r.user_name || "Colleague"}`}
                        >
                          <span>{r.reaction}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action Bar on Message Hover */}
                  {!msg.is_deleted && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1 bg-surface border border-border rounded-md px-1.5 py-0.5 shadow-sm">
                      {/* Quick Reacts */}
                      <button
                        type="button"
                        onClick={() => handleToggleReaction(msg.id, "👍")}
                        className="hover:scale-125 transition-transform text-xs"
                        title="React 👍"
                      >
                        👍
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleReaction(msg.id, "❤️")}
                        className="hover:scale-125 transition-transform text-xs"
                        title="React ❤️"
                      >
                        ❤️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleReaction(msg.id, "✅")}
                        className="hover:scale-125 transition-transform text-xs"
                        title="React ✅"
                      >
                        ✅
                      </button>

                      <div className="h-3 w-px bg-border mx-0.5" />

                      <button
                        type="button"
                        onClick={() =>
                          setReplyTo({
                            id: msg.id,
                            content: msg.content,
                            sender_name: senderName,
                            message_type: msg.message_type,
                          })
                        }
                        className="p-1 text-muted hover:text-foreground rounded transition-colors"
                        title="Reply"
                      >
                        <Reply className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyText(msg.content)}
                        className="p-1 text-muted hover:text-foreground rounded transition-colors"
                        title="Copy text"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      {isMe && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="p-1 text-muted hover:text-danger rounded transition-colors"
                          title="Delete message"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Message Composer Area */}
      <MessageComposer
        conversationId={conversation.id}
        users={allUsers}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onSendMessage={handleSendMessage}
        onViewAttachment={(att) => setPreviewAttachment(att)}
      />

      {/* Modals */}
      <AttachmentPreviewModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />

      {showGroupInfo && (
        <GroupInfoModal
          conversation={conversation}
          currentUserId={currentUserId}
          allUsers={allUsers}
          onClose={() => setShowGroupInfo(false)}
          onMembersUpdated={() => onConversationUpdated()}
          onLeftGroup={() => {
            setShowGroupInfo(false);
            if (onBack) onBack();
            onConversationUpdated();
          }}
        />
      )}
    </div>
  );
}

/** Render message text highlighting @mentions */
function renderContentWithMentions(content: string, isSender: boolean) {
  const parts = content.split(/(@[a-zA-Z0-9_\s]+?\b)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      return (
        <span
          key={i}
          className={`font-semibold underline decoration-dotted px-1 py-0.2 rounded ${
            isSender
              ? "bg-white/20 text-white"
              : "bg-accent-soft text-accent-soft-text"
          }`}
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

/** Audio Player Component for Voice Notes */
function VoicePlayer({ url, isSender }: { url: string; isSender: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg ${
        isSender ? "bg-white/10 text-white" : "bg-surface border border-border text-foreground"
      }`}
    >
      <audio
        ref={audioRef}
        src={url}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
      <button
        type="button"
        onClick={togglePlay}
        className="h-7 w-7 rounded-full bg-accent text-accent-contrast flex items-center justify-center shrink-0 hover:opacity-90"
      >
        {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
      </button>

      <div className="flex items-center gap-1.5 flex-1 min-w-[120px]">
        <Volume2 className="h-3.5 w-3.5 opacity-70 shrink-0" />
        <div className="h-1.5 flex-1 bg-current opacity-30 rounded-full overflow-hidden" />
      </div>
      <span className="text-[11px] font-mono opacity-80 shrink-0">Voice Note</span>
    </div>
  );
}

