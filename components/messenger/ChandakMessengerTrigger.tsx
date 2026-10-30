"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { MessageSquareText, X, Reply } from "lucide-react";
import { useProfile } from "@/hooks/usePermissions";
import {
  getMessengerTotalUnreadCount,
  fetchSenderInfoForNotification,
} from "@/lib/actions/messenger";
import { ChandakMessengerDrawer } from "./ChandakMessengerDrawer";
import { createClient } from "@/utils/supabase/client";

interface FloatingNotification {
  id: string;
  conversationId: string;
  senderName: string;
  senderPhoto: string | null;
  content: string;
}

/**
 * Synthesizes a crisp, elegant audio notification chime using Web Audio API.
 * Zero external sound asset dependencies.
 */
function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now); // E5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.08);
    osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.16); // E6

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.2);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.45);
  } catch {
    // Ignore audio policy restrictions
  }
}

export function ChandakMessengerTrigger() {
  const { data: profile } = useProfile();
  const currentUserId = profile?.id;
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [activeNotification, setActiveNotification] = useState<FloatingNotification | null>(null);
  const supabase = createClient();
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

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

  // Realtime subscription for incoming messages, unread badge, and floating notifications
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
        async (payload) => {
          const newMsg = payload.new;

          // If message is sent by current user, refresh unread badge and skip notification
          if (newMsg.sender_id === currentUserId) {
            refreshUnread();
            return;
          }

          // Verify if current user is participant of this conversation
          const { data: myPart } = await supabase
            .from("messenger_participants")
            .select("id")
            .eq("conversation_id", newMsg.conversation_id)
            .eq("user_id", currentUserId)
            .maybeSingle();

          if (!myPart) return;

          // 1. Play audio chime
          playNotificationChime();

          // 2. Increment badge count immediately
          setUnreadCount((prev) => prev + 1);

          // 3. Trigger floating in-app notification if drawer is closed
          if (!isOpenRef.current) {
            const sender = await fetchSenderInfoForNotification(newMsg.sender_id);
            const preview =
              newMsg.content?.trim() ||
              (Array.isArray(newMsg.attachments) && newMsg.attachments.length > 0
                ? `Sent ${newMsg.attachments.length} attachment(s)`
                : "New message");

            setActiveNotification({
              id: newMsg.id,
              conversationId: newMsg.conversation_id,
              senderName: sender.full_name,
              senderPhoto: sender.profile_photo,
              content: preview,
            });

            // Browser native desktop notification if granted
            if (
              typeof window !== "undefined" &&
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              try {
                new Notification(sender.full_name, {
                  body: preview,
                  icon: sender.profile_photo || "/favicon.ico",
                });
              } catch {
                // Ignore notification errors
              }
            }
          }

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

  // Auto-dismiss floating notification after 6 seconds
  useEffect(() => {
    if (!activeNotification) return;
    const timer = setTimeout(() => {
      setActiveNotification(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeNotification]);

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
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface hover:bg-surface-hover text-foreground transition-colors group"
      >
        <MessageSquareText className="h-4 w-4 text-muted group-hover:text-accent transition-colors" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-contrast shadow-sm animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Floating In-App Notification Toast */}
      {activeNotification && !isOpen && (
        <div className="fixed top-16 right-4 z-[var(--z-modal,9999)] w-88 max-w-[calc(100vw-2rem)] bg-elevated border border-border rounded-xl shadow-2xl p-3 flex items-start gap-3 animate-in slide-in-from-top-3 fade-in duration-200">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-sm font-semibold text-accent-soft-text">
            {activeNotification.senderPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeNotification.senderPhoto}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              activeNotification.senderName[0]?.toUpperCase() ?? "C"
            )}
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground truncate">
                {activeNotification.senderName}
              </span>
              <span className="text-[10px] text-muted">Just now</span>
            </div>
            <p className="text-xs text-muted truncate mt-0.5">{activeNotification.content}</p>

            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedConversationId(activeNotification.conversationId);
                  setIsOpen(true);
                  setActiveNotification(null);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded bg-accent text-accent-contrast hover:opacity-90 transition-opacity"
              >
                <Reply className="h-3 w-3" />
                <span>Reply</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveNotification(null)}
                className="px-2 py-1 text-[11px] text-muted hover:text-foreground transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveNotification(null)}
            className="text-muted hover:text-foreground p-1 rounded-md transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

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


