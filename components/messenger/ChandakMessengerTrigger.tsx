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
  const supabase = createClient();

  // Refresh unread count
  const refreshUnread = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const count = await getMessengerTotalUnreadCount();
      setUnreadCount(count);
    } catch {
      // Ignore background errors
    }
  }, [currentUserId]);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  // Realtime subscription for unread message count
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

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open Chandak Messenger (Ctrl+M)"
        title="Chandak Messenger (Ctrl+M)"
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface hover:bg-surface-hover text-foreground transition-colors group"
      >
        <MessageSquareText className="h-4 w-4 text-muted group-hover:text-accent transition-colors" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-contrast shadow-sm animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {currentUserId && (
        <ChandakMessengerDrawer
          isOpen={isOpen}
          onClose={() => {
            setIsOpen(false);
            refreshUnread();
          }}
          currentUserId={currentUserId}
        />
      )}
    </>
  );
}

export default ChandakMessengerTrigger;

