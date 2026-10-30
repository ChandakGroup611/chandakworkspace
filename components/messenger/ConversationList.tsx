"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  MessageSquarePlus,
  Users,
  Pin,
  RefreshCw,
  Clock,
  Sparkles,
  Building,
  Check,
  CheckCheck,
} from "lucide-react";
import {
  MessengerConversation,
  WorkspaceUser,
  togglePinConversation,
} from "@/lib/actions/messenger";

interface ConversationListProps {
  conversations: MessengerConversation[];
  activeConversationId: string | null;
  currentUserId?: string;
  onSelectConversation: (conversation: MessengerConversation) => void;
  onOpenNewChat: () => void;
  onOpenNewGroup: () => void;
  onRefresh: () => void;
  loading?: boolean;
}

export function ConversationList({
  conversations,
  activeConversationId,
  currentUserId,
  onSelectConversation,
  onOpenNewChat,
  onOpenNewGroup,
  onRefresh,
  loading = false,
}: ConversationListProps) {
  const [filter, setFilter] = useState<"all" | "unread" | "direct" | "group">("all");
  const [search, setSearch] = useState("");

  const filteredConversations = useMemo(() => {
    let list = [...conversations];

    // Filter by tab
    if (filter === "unread") {
      list = list.filter((c) => c.unread_count > 0);
    } else if (filter === "direct") {
      list = list.filter((c) => c.type === "direct");
    } else if (filter === "group") {
      list = list.filter((c) => c.type === "group");
    }

    // Filter by search query
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => {
        const titleMatch = (c.title || "").toLowerCase().includes(q);
        const otherNameMatch = (c.other_user?.full_name || "").toLowerCase().includes(q);
        const deptMatch = (c.other_user?.department_name || "").toLowerCase().includes(q);
        const previewMatch = (c.last_message_preview || "").toLowerCase().includes(q);
        return titleMatch || otherNameMatch || deptMatch || previewMatch;
      });
    }

    return list;
  }, [conversations, filter, search]);

  const getInitials = (name: string) => {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");
  };

  const formatTimestamp = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const handleTogglePin = async (e: React.MouseEvent, convId: string, currentPinned: boolean) => {
    e.stopPropagation();
    await togglePinConversation(convId, !currentPinned);
    onRefresh();
  };

  return (
    <div className="flex flex-col h-full border-r border-border bg-surface select-none">
      {/* Top Header & Actions */}
      <div className="p-3.5 border-b border-border space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
            <h2 className="text-sm font-bold text-foreground">Chandak Messenger</h2>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-md transition-colors"
              title="Refresh conversations"
              aria-label="Refresh conversations"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onOpenNewChat}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-accent text-accent-contrast hover:opacity-90 transition-opacity"
              title="Start a direct chat with any colleague"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              <span>+ Direct</span>
            </button>
            <button
              type="button"
              onClick={onOpenNewGroup}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-border bg-surface hover:bg-surface-hover text-foreground transition-colors"
              title="Create a team / project group"
            >
              <Users className="h-3.5 w-3.5" />
              <span>+ Group</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats, colleagues, or teams..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-elevated text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pt-0.5">
          {(
            [
              { id: "all", label: "All" },
              { id: "unread", label: "Unread" },
              { id: "direct", label: "Direct" },
              { id: "group", label: "Groups" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors whitespace-nowrap ${
                filter === tab.id
                  ? "bg-accent text-accent-contrast font-semibold shadow-xs"
                  : "text-muted hover:text-foreground hover:bg-surface-hover"
              }`}
            >
              {tab.label}
              {tab.id === "unread" && (
                <span className="ml-1 opacity-80">
                  ({conversations.filter((c) => c.unread_count > 0).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/40">
        {filteredConversations.length === 0 ? (
          <div className="py-12 px-4 text-center text-muted">
            <p className="text-xs font-medium text-foreground">No conversations found</p>
            <p className="text-[11px] text-muted mt-1">
              {search
                ? `No results for "${search}". Try searching another name.`
                : filter === "unread"
                ? "No unread messages! You are all caught up."
                : "Start a new conversation with your colleagues above."}
            </p>
          </div>
        ) : (
          filteredConversations.map((c) => {
            const isActive = c.id === activeConversationId;
            const isDirect = c.type === "direct";
            const otherUser = c.other_user;
            const displayName = isDirect ? otherUser?.full_name || "Direct Chat" : c.title || "Group Chat";
            const deptText = isDirect ? otherUser?.department_name || "Colleague" : `${c.participants.length} members`;

            return (
              <div
                key={c.id}
                onClick={() => onSelectConversation(c)}
                className={`group relative flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-colors ${
                  isActive
                    ? "bg-primary/10 dark:bg-primary/20 border-l-4 border-primary font-semibold shadow-xs"
                    : "hover:bg-surface-hover"
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <span className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {isDirect ? (
                      otherUser?.profile_photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={otherUser.profile_photo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        getInitials(displayName)
                      )
                    ) : (
                      <Users className="h-5 w-5" />
                    )}
                  </span>
                  {isDirect && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-surface" />
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={`text-xs font-semibold truncate ${
                        c.unread_count > 0 ? "text-foreground font-bold" : "text-foreground"
                      }`}
                    >
                      {displayName}
                    </span>
                    <span className="text-[10px] text-muted shrink-0 ml-1">
                      {formatTimestamp(c.last_message_at)}
                    </span>
                  </div>

                  {(() => {
                    const isLastFromMe = c.last_message_sender_id === currentUserId;
                    const otherPart = c.participants?.find((p) => p.user_id !== currentUserId);
                    const isLastSeen =
                      isDirect &&
                      otherPart?.last_read_at &&
                      c.last_message_at &&
                      new Date(otherPart.last_read_at).getTime() >= new Date(c.last_message_at).getTime();

                    return (
                      <div className="flex items-center justify-between gap-1 text-[11.5px]">
                        <span
                          className={`truncate flex items-center gap-1 ${
                            c.unread_count > 0 ? "text-foreground font-semibold" : "text-muted"
                          }`}
                        >
                          {isLastFromMe && (
                            isLastSeen ? (
                              <span title="Seen" className="inline-flex items-center shrink-0">
                                <CheckCheck className="h-3.5 w-3.5 text-sky-400 stroke-[2.5]" />
                              </span>
                            ) : (
                              <span title="Sent" className="inline-flex items-center shrink-0">
                                <Check className="h-3.5 w-3.5 text-muted stroke-[2]" />
                              </span>
                            )
                          )}
                          <span className="truncate">{c.last_message_preview || "No messages"}</span>
                        </span>

                        {/* Unread & Pin Badges */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-1">
                          {c.is_pinned && <Pin className="h-3 w-3 text-accent fill-accent shrink-0" />}
                          {c.unread_count > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold shadow-xs animate-in zoom-in-50 duration-150">
                              {c.unread_count > 99 ? "99+" : c.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Pin toggle hover button */}
                  <button
                    type="button"
                    onClick={(e) => handleTogglePin(e, c.id, !!c.is_pinned)}
                    className="absolute right-2 top-2 p-1 text-muted hover:text-accent rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title={c.is_pinned ? "Unpin chat" : "Pin chat to top"}
                  >
                    <Pin className={`h-3 w-3 ${c.is_pinned ? "fill-accent text-accent" : ""}`} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Status */}
      <div className="px-3.5 py-2 border-t border-border bg-surface text-[11px] text-muted flex items-center justify-between">
        <span>{conversations.length} conversation{conversations.length === 1 ? "" : "s"}</span>
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
        </span>
      </div>
    </div>
  );
}

