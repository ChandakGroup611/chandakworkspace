"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MessageSquareText } from "lucide-react";
import { useProfile } from "@/hooks/usePermissions";
import { getMessengerTotalUnreadCount } from "@/lib/actions/messenger";
import { ChandakMessengerDrawer } from "./ChandakMessengerDrawer";
import { createClient } from "@/utils/supabase/client";

export function ChandakMessengerTrigger() {
  const { data: profile } = useProfile();
  const currentUserId = profile?.id;
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const supabase = createClient();

  // Refresh unread count
  const refreshUnread = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const count = await getMessengerTotalUnreadCount(currentUserId);
      setUnreadCount(count);
    } catch {
      // Ignore background errors
    }
  }, [currentUserId]);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  // Listen for custom events (system notifications, external triggers)
  useEffect(() => {
    const handleOpen = (e: any) => {
      if (e.detail?.conversationId) {
        setSelectedConversationId(e.detail.conversationId);
      }
      setIsOpen(true);
    };

    const handleUnreadSync = () => {
      refreshUnread();
    };

    window.addEventListener("open-chandak-messenger" as any, handleOpen);
    window.addEventListener("chandak:messenger-unread-change" as any, handleUnreadSync);

    return () => {
      window.removeEventListener("open-chandak-messenger" as any, handleOpen);
      window.removeEventListener("chandak:messenger-unread-change" as any, handleUnreadSync);
    };
  }, [refreshUnread]);

  // Broadcast drawer state changes so SystemMessengerNotifier knows if drawer is open
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("chandak:messenger-drawer-state", {
        detail: {
          isOpen,
          activeConversationId: selectedConversationId,
        },
      })
    );
  }, [isOpen, selectedConversationId]);

  // Realtime subscription for incoming messages and participant updates
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel("messenger_trigger_badge")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messenger_messages",
        },
        () => {
          refreshUnread();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messenger_participants",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          refreshUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, supabase, refreshUnread]);

  // Global keyboard shortcut: Ctrl+M / Cmd+M
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "m") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleOpenMessenger = () => {
    setIsOpen(true);
    // Request desktop notification permission on user click gesture if not decided
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission().catch(() => {});
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpenMessenger}
        aria-label="Open Chandak Messenger (Ctrl+M)"
        title="Chandak Messenger (Ctrl+M)"
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface hover:bg-surface-hover text-foreground transition-colors group cursor-pointer"
      >
        <MessageSquareText className="h-4 w-4 text-muted group-hover:text-primary transition-colors" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {currentUserId && (
        <ChandakMessengerDrawer
          isOpen={isOpen}
          onClose={() => {
            setIsOpen(false);
            setSelectedConversationId(null);
            refreshUnread();
          }}
          currentUserId={currentUserId}
          initialConversationId={selectedConversationId}
          onClearInitialConversation={() => setSelectedConversationId(null)}
          onUnreadChange={refreshUnread}
        />
      )}
    </>
  );
}

export default ChandakMessengerTrigger;
