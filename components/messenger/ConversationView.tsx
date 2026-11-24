"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Video,
  CheckSquare,
  ExternalLink,
  FolderOpen,
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
  Pencil,
  Ban,
  ChevronDown,
} from "lucide-react";
import {
  MessengerConversation,
  startInstantCallFromChat,
  MessengerMessage,
  MessengerParticipant,
  MessengerAttachment,
  WorkspaceUser,
  fetchMessengerMessages,
  sendMessengerMessage,
  markConversationAsRead,
  deleteMessengerMessage,
  editMessengerMessage,
  toggleMessageReaction,
  SendMessagePayload,
} from "@/lib/actions/messenger";
import { MessageComposer } from "./MessageComposer";
import { AttachmentPreviewModal } from "./AttachmentPreviewModal";
import { GroupInfoModal } from "./GroupInfoModal";
import { CreateTaskFromMessageModal } from "./CreateTaskFromMessageModal";
import { MediaGalleryDrawer } from "./MediaGalleryDrawer";
import { createClient } from "@/utils/supabase/client";
import { sanitizeTeamsUrl } from "@/lib/integrations/microsoft-teams";

interface ConversationViewProps {
  conversation: MessengerConversation;
  currentUserId: string;
  allUsers: WorkspaceUser[];
  onBack?: () => void;
  onConversationUpdated: () => void;
}


function TaskCardMessage({ content, isMe }: { content: string; isMe: boolean }) {
  try {
    const data = JSON.parse(content);
    return (
      <div
        className={`rounded-xl p-3 text-xs space-y-2 max-w-[280px] sm:max-w-xs ${
          isMe
            ? "bg-white/10 text-white border border-white/20"
            : "bg-surface text-foreground border border-emerald-500/30"
        }`}
      >
        <div className="flex items-center justify-between gap-1.5 border-b border-current/15 pb-1.5">
          <div className="flex items-center gap-1.5 font-bold text-emerald-400">
            <CheckSquare className="h-4 w-4 shrink-0" />
            <span>Task Created · {data.taskCode}</span>
          </div>
          {data.workspaceName && (
            <span className="text-[10px] opacity-75 truncate max-w-[100px]">
              {data.workspaceName}
            </span>
          )}
        </div>
        <p className="font-semibold text-[13px] leading-snug">{data.title}</p>
        <div className="flex flex-col gap-0.5 text-[11px] opacity-85">
          <span>
            Assignee: <strong>{data.assigneeName || "Unassigned"}</strong>
          </span>
          {data.dueDate && (
            <span>
              Due Date: <strong>{data.dueDate}</strong>
            </span>
          )}
        </div>
        <div className="pt-1">
          <a
            href={`/tasks/${data.taskId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 text-white font-medium text-[11px] hover:bg-emerald-700 transition-colors shadow-xs"
          >
            <span>Open Task</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    );
  } catch {
    return <div className="text-xs whitespace-pre-wrap">{content}</div>;
  }
}

function MeetingInviteMessage({ content, isMe }: { content: string; isMe: boolean }) {
  try {
    const data = JSON.parse(content);
    return (
      <div
        className={`rounded-xl p-3 text-xs space-y-2 max-w-[280px] sm:max-w-xs ${
          isMe
            ? "bg-white/10 text-white border border-white/20"
            : "bg-surface text-foreground border border-sky-500/30"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-current/15 pb-1.5 font-bold text-sky-400">
          <Video className="h-4 w-4 shrink-0" />
          <span>Chandak Meet Invitation</span>
        </div>
        <p className="font-medium text-[12.5px]">
          <strong>{data.startedByName}</strong> started an instant video meeting.
        </p>
        <div className="pt-1 flex flex-wrap gap-2">
          {data.teamsUrl && (
            <a
              href={sanitizeTeamsUrl(data.teamsUrl) || data.teamsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4B53BC] text-white font-semibold text-xs hover:bg-[#3C4296] transition-colors shadow-xs"
              title="Join via Microsoft Teams (Desktop / Web / Mobile)"
            >
              <Video className="h-3.5 w-3.5" />
              <span>Join Teams Meeting</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <a
            href={data.meetUrl || "/meet/live"}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white font-semibold text-xs hover:bg-sky-700 transition-colors shadow-xs"
          >
            <Video className="h-3.5 w-3.5" />
            <span>Join In-Portal Room</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    );
  } catch {
    return <div className="text-xs whitespace-pre-wrap">{content}</div>;
  }
}

export function ConversationView({
  conversation,
  currentUserId,
  allUsers,
  onBack,
  onConversationUpdated,
}: ConversationViewProps) {
  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [participants, setParticipants] = useState<MessengerParticipant[]>(
    conversation.participants || []
  );
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<{
    id: string;
    content: string;
    sender_name: string;
    message_type: string;
  } | null>(null);
  const [editingMessage, setEditingMessage] = useState<{
    id: string;
    content: string;
  } | null>(null);
  const [openMenuMessageId, setOpenMenuMessageId] = useState<string | null>(null);

  // Close message context menu on click outside or escape
  useEffect(() => {
    const handleOutsideClick = () => setOpenMenuMessageId(null);
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenuMessageId(null);
    };
    window.addEventListener("click", handleOutsideClick);
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("click", handleOutsideClick);
      window.removeEventListener("keydown", handleEsc);
    };
  }, []);

  // Modals & Tools
  const [previewAttachment, setPreviewAttachment] = useState<MessengerAttachment | null>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [copyToast, setCopyToast] = useState(false);
  const [taskModalMessage, setTaskModalMessage] = useState<MessengerMessage | null>(null);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [startingCall, setStartingCall] = useState(false);

  const handleStartCall = async () => {
    setStartingCall(true);
    try {
      const res = await startInstantCallFromChat(conversation.id);
      if (res.success && res.meetUrl) {
        window.open(res.meetUrl, "_blank");
      }
    } catch (err) {
      console.error("Failed to start call:", err);
    } finally {
      setStartingCall(false);
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Keep participants in sync with conversation updates
  useEffect(() => {
    if (conversation.participants) {
      setParticipants(conversation.participants);
    }
  }, [conversation.participants]);

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
          const newMsgId = payload.new?.id;
          if (!newMsgId) return;

          // Fetch full recent messages with sender join
          const recent = await fetchMessengerMessages(conversation.id, 20);
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newOnes = recent.filter((m) => !existingIds.has(m.id));
            if (newOnes.length === 0) return prev;
            return [...prev, ...newOnes];
          });
          setTimeout(() => scrollToBottom(true), 50);
          markConversationAsRead(conversation.id).then(() => onConversationUpdated());
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
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messenger_participants",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const updatedUserId = payload.new.user_id;
          const updatedLastRead = payload.new.last_read_at;
          setParticipants((prev) =>
            prev.map((p) =>
              p.user_id === updatedUserId
                ? { ...p, last_read_at: updatedLastRead }
                : p
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messenger_reactions",
        },
        async () => {
          const recent = await fetchMessengerMessages(conversation.id, 60);
          setMessages(recent);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id, supabase, scrollToBottom, onConversationUpdated]);

  // Dynamic WhatsApp-style Read Receipts Calculation
  const getReadReceipt = useCallback(
    (msg: MessengerMessage) => {
      // 1. Direct Conversation
      if (conversation.type === "direct") {
        const other = participants.find((p) => p.user_id !== currentUserId);
        const isSeen =
          other?.last_read_at &&
          new Date(other.last_read_at).getTime() >= new Date(msg.created_at).getTime();

        if (isSeen) {
          return {
            status: "seen",
            label: `Read by ${other?.user?.full_name || "colleague"}`,
            icon: <CheckCheck className="h-3.5 w-3.5 text-sky-300 stroke-[3]" />,
          };
        }
        return {
          status: "sent",
          label: "Sent",
          icon: <Check className="h-3.5 w-3.5 text-blue-200 stroke-[2.5]" />,
        };
      }

      // 2. Group Conversation
      const others = participants.filter((p) => p.user_id !== currentUserId);
      const readMembers = others.filter(
        (p) =>
          p.last_read_at &&
          new Date(p.last_read_at).getTime() >= new Date(msg.created_at).getTime()
      );

      if (others.length > 0 && readMembers.length === others.length) {
        return {
          status: "seen",
          label: `Read by all members (${readMembers.length})`,
          icon: <CheckCheck className="h-3.5 w-3.5 text-sky-300 stroke-[3]" />,
        };
      }
      if (readMembers.length > 0) {
        return {
          status: "delivered",
          label: `Read by ${readMembers.length} of ${others.length} members`,
          icon: <CheckCheck className="h-3.5 w-3.5 text-blue-200 stroke-[2.5]" />,
        };
      }
      return {
        status: "sent",
        label: "Sent",
        icon: <Check className="h-3.5 w-3.5 text-blue-200 stroke-[2.5]" />,
      };
    },
    [conversation.type, participants, currentUserId]
  );

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

  // Delete message (WhatsApp style - Delete for everyone)
  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("Delete this message for everyone?")) return;
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

  // Edit message (WhatsApp style - within 4 hours)
  const handleSaveEdit = async (messageId: string, newContent: string): Promise<boolean> => {
    const res = await editMessengerMessage(messageId, newContent);
    if (res.success && res.message) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, content: newContent, is_edited: true, updated_at: new Date().toISOString() }
            : m
        )
      );
      setEditingMessage(null);
      return true;
    } else {
      alert(res.error || "Failed to edit message");
      return false;
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
    <div className="flex flex-col h-full bg-canvas/60 dark:bg-canvas relative">
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
                    {/* Instant Video Call */}
          <button
            type="button"
            onClick={handleStartCall}
            disabled={startingCall}
            className="p-2 text-muted hover:text-emerald-500 hover:bg-surface-hover rounded-lg transition-colors"
            title="Start Video Meeting (Chandak Meet)"
            aria-label="Start Video Call"
          >
            {startingCall ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
            ) : (
              <Video className="h-4 w-4" />
            )}
          </button>

          {/* Media & Docs Gallery */}
          <button
            type="button"
            onClick={() => setShowMediaGallery(!showMediaGallery)}
            className={`p-2 rounded-lg transition-colors ${
              showMediaGallery
                ? "bg-surface-hover text-accent font-semibold"
                : "text-muted hover:text-foreground hover:bg-surface-hover"
            }`}
            title="Shared files and media"
            aria-label="Media gallery"
          >
            <FolderOpen className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-lg transition-colors ${showSearch ? "bg-surface-hover text-accent" : "text-muted hover:text-foreground hover:bg-surface-hover"
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
            const createdAtTime = new Date(msg.created_at).getTime();
            const isEditable = isMe && !msg.is_deleted && (Date.now() - createdAtTime <= 4 * 60 * 60 * 1000);

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
                      className={`text-xs px-3 py-1.5 mb-1.5 rounded-lg border-l-2 text-left ${isMe
                        ? "bg-blue-700/80 border-white text-white"
                        : "bg-surface-hover border-primary text-foreground"
                        }`}
                    >
                      <p className={`font-semibold text-[11px] truncate ${isMe ? "text-blue-100" : "text-primary"}`}>
                        {msg.reply_to.sender_name}
                      </p>
                      <p className={`text-[11px] truncate ${isMe ? "text-white/80" : "text-muted"}`}>
                        {msg.reply_to.content || "Attachment"}
                      </p>
                    </div>
                  )}

                  {/* Bubble Content */}
                  <div
                    onDoubleClick={() => {
                      if (isEditable) {
                        setReplyTo(null);
                        setEditingMessage({ id: msg.id, content: msg.content });
                      }
                    }}
                    title={isEditable ? "Double-click to edit message" : undefined}
                    className={`relative group/bubble rounded-2xl px-4 py-2.5 text-[13.5px] shadow-xs break-words leading-relaxed select-text ${isMe
                      ? "bg-blue-600 dark:bg-blue-600 text-white rounded-br-xs shadow-sm"
                      : "bg-surface dark:bg-elevated border border-border text-foreground rounded-bl-xs"
                      }`}
                  >
                    {/* WhatsApp-style Dropdown Chevron */}
                    {!msg.is_deleted && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuMessageId(openMenuMessageId === msg.id ? null : msg.id);
                        }}
                        className={`opacity-0 group-hover/bubble:opacity-100 focus:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/20 text-current absolute top-1.5 ${isMe ? "left-1.5" : "right-1.5"} z-10 cursor-pointer`}
                        title="Message options"
                        aria-label="Message options"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {/* WhatsApp-style Dropdown Menu */}
                    {openMenuMessageId === msg.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute z-30 ${isMe ? "right-0" : "left-0"} top-8 min-w-[170px] rounded-lg border border-border bg-elevated py-1 shadow-xl text-xs text-foreground animate-in fade-in zoom-in-95`}
                      >
                        {isEditable && (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuMessageId(null);
                              setReplyTo(null);
                              setEditingMessage({ id: msg.id, content: msg.content });
                            }}
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-hover font-medium text-foreground cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>Edit message</span>
                          </button>
                        )}
                        {isMe && (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuMessageId(null);
                              handleDeleteMessage(msg.id);
                            }}
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-danger hover:bg-danger/10 font-medium cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 shrink-0" />
                            <span>Delete for everyone</span>
                          </button>
                        )}
                                                {/* Convert to Task */}
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuMessageId(null);
                            setTaskModalMessage(msg);
                          }}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-hover text-foreground font-medium cursor-pointer"
                        >
                          <CheckSquare className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span>Create task</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuMessageId(null);
                            setReplyTo({
                              id: msg.id,
                              content: msg.content,
                              sender_name: senderName,
                              message_type: msg.message_type,
                            });
                          }}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-hover text-foreground cursor-pointer"
                        >
                          <Reply className="h-3.5 w-3.5 text-muted shrink-0" />
                          <span>Reply</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuMessageId(null);
                            handleCopyText(msg.content);
                          }}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-hover text-foreground cursor-pointer"
                        >
                          <Copy className="h-3.5 w-3.5 text-muted shrink-0" />
                          <span>Copy text</span>
                        </button>
                      </div>
                    )}
                    {msg.is_deleted ? (
                      <div className="flex items-center gap-1.5 italic text-xs py-0.5 select-none opacity-80">
                        <Ban className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <span>This message was deleted</span>
                      </div>
                    ) : (
                      <>
                        {/* Text or Card Content */}
                        {msg.message_type === "task_card" ? (
                          <TaskCardMessage content={msg.content} isMe={isMe} />
                        ) : msg.message_type === "meeting_invite" ? (
                          <MeetingInviteMessage content={msg.content} isMe={isMe} />
                        ) : (
                          msg.content && (
                            <div className="whitespace-pre-wrap leading-relaxed select-text">
                              {renderContentWithMentions(msg.content, isMe)}
                            </div>
                          )
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
                                  className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${isMe
                                    ? "bg-blue-700/60 border-blue-400/30 text-white"
                                    : "bg-surface-hover border-border text-foreground"
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
                                      className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors ${isMe ? "hover:bg-white/20" : "hover:bg-surface-hover"
                                        }`}
                                      title="View in modal"
                                    >
                                      View
                                    </button>
                                    <a
                                      href={`${att.url}${att.url.includes("?") ? "&" : "?"}download=1`}
                                      download={att.name}
                                      className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors ${isMe ? "hover:bg-white/20" : "hover:bg-surface-hover"
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
                    <div className={`flex items-center justify-end gap-1 mt-1.5 text-[10.5px] select-none ${isMe ? "text-blue-100 font-medium" : "text-muted font-medium"
                      }`}>
                      <span>{timeStr}</span>
                      {msg.is_edited && !msg.is_deleted && (
                        <span className="text-[10px] italic opacity-85 ml-0.5" title="Edited message">(edited)</span>
                      )}
                      {isMe && !msg.is_deleted && (
                        (() => {
                          const receipt = getReadReceipt(msg);
                          return (
                            <span title={receipt.label} className="inline-flex items-center ml-0.5">
                              {receipt.icon}
                            </span>
                          );
                        })()
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

                  {/* Action Bar on Message Hover & Mobile Tap */}
                  {!msg.is_deleted && (
                    <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1 bg-surface border border-border rounded-md px-1.5 py-0.5 shadow-sm">
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
                      {/* WhatsApp Style Edit: Available within 4 hours */}
                      {isEditable && (
                        <button
                          type="button"
                          onClick={() => {
                            setReplyTo(null);
                            setEditingMessage({ id: msg.id, content: msg.content });
                          }}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-muted hover:text-primary rounded hover:bg-surface-hover transition-colors font-medium text-[11px] cursor-pointer"
                          title="Edit message (available up to 4 hours)"
                        >
                          <Pencil className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                      )}
                      {isMe && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="p-1 text-muted hover:text-danger rounded transition-colors"
                          title="Delete for everyone"
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
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
        onSaveEdit={handleSaveEdit}
        onSendMessage={handleSendMessage}
        onViewAttachment={(att) => setPreviewAttachment(att)}
      />

      {/* Modals & Drawers */}
      <AttachmentPreviewModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />

      <CreateTaskFromMessageModal
        isOpen={!!taskModalMessage}
        onClose={() => setTaskModalMessage(null)}
        message={taskModalMessage}
        conversationId={conversation.id}
        allUsers={allUsers}
        onTaskCreated={() => {
          setTaskModalMessage(null);
          onConversationUpdated();
        }}
      />

      <MediaGalleryDrawer
        isOpen={showMediaGallery}
        onClose={() => setShowMediaGallery(false)}
        messages={messages}
        onViewAttachment={(att) => setPreviewAttachment(att)}
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
          className={`font-semibold underline decoration-dotted px-1 py-0.2 rounded ${isSender
            ? "bg-blue-800/80 text-white"
            : "bg-primary/10 text-primary"
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
      className={`flex items-center gap-2 p-2 rounded-lg ${isSender ? "bg-blue-700/60 text-white" : "bg-surface-hover border border-border text-foreground"
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
        className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 hover:opacity-90 shadow-xs ${isSender ? "bg-white text-blue-600" : "bg-primary text-primary-foreground"
          }`}
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

