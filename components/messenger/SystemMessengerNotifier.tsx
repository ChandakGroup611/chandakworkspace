"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useProfile } from "@/hooks/usePermissions";
import { createClient } from "@/utils/supabase/client";
import { fetchSenderInfoForNotification } from "@/lib/actions/messenger";
import { X, Reply, MessageSquare } from "lucide-react";

interface FloatingToast {
  id: string;
  conversationId: string;
  senderName: string;
  senderPhoto: string | null;
  content: string;
}

/**
 * Synthesizes a high-fidelity, crisp two-tone audio chime using Web Audio API.
 * Operates across all browsers with zero external sound file dependencies.
 */
function playSystemNotificationChime() {
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
    gain.gain.linearRampToValueAtTime(0.28, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.2);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.45);
  } catch {
    // Web audio policy restriction fallback
  }
}

export function SystemMessengerNotifier() {
  const { data: profile } = useProfile();
  const [activeToast, setActiveToast] = useState<FloatingToast | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const activeConversationIdRef = useRef<string | null>(null);
  const originalTitleRef = useRef<string>("");
  const titleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  // Remember authenticated user in localStorage for background / logged-out notifications
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (profile?.id) {
      localStorage.setItem("chandak_messenger_user_id", profile.id);
      if (profile.full_name) {
        localStorage.setItem("chandak_messenger_user_name", profile.full_name);
      }
    }
  }, [profile?.id, profile?.full_name]);

  // Request browser notification permission and register service worker for native device alerts
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const requestPerm = () => {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    };

    window.addEventListener("click", requestPerm, { once: true });
    window.addEventListener("keydown", requestPerm, { once: true });

    return () => {
      window.removeEventListener("click", requestPerm);
      window.removeEventListener("keydown", requestPerm);
    };
  }, []);

  // Listen for drawer open/close and active conversation state
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleDrawerState = (e: CustomEvent) => {
      setIsDrawerOpen(!!e.detail?.isOpen);
      activeConversationIdRef.current = e.detail?.activeConversationId || null;
    };

    window.addEventListener("chandak:messenger-drawer-state" as any, handleDrawerState);
    return () => {
      window.removeEventListener("chandak:messenger-drawer-state" as any, handleDrawerState);
    };
  }, []);

  // Reset title when window gains focus
  useEffect(() => {
    if (typeof window === "undefined") return;
    originalTitleRef.current = document.title;

    const handleFocus = () => {
      if (titleIntervalRef.current) {
        clearInterval(titleIntervalRef.current);
        titleIntervalRef.current = null;
        document.title = originalTitleRef.current;
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      if (titleIntervalRef.current) clearInterval(titleIntervalRef.current);
    };
  }, []);

  // Flash title helper
  const flashTitle = useCallback((senderName: string) => {
    if (typeof window === "undefined") return;
    if (document.hasFocus()) return;

    if (!titleIntervalRef.current) {
      originalTitleRef.current = document.title;
      let toggle = false;
      titleIntervalRef.current = setInterval(() => {
        document.title = toggle
          ? `(1) New message from ${senderName}`
          : originalTitleRef.current;
        toggle = !toggle;
      }, 1500);
    }
  }, []);

  // Global Realtime listener on messenger_messages
  useEffect(() => {
    if (typeof window === "undefined") return;

    const getEffectiveUserId = (): string | null => {
      return profile?.id || localStorage.getItem("chandak_messenger_user_id") || null;
    };

    const channel = supabase
      .channel("chandak_global_messenger_notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messenger_messages",
        },
        async (payload) => {
          const newMsg = payload.new;
          const effectiveUserId = getEffectiveUserId();

          if (!effectiveUserId) return;
          // Ignore messages sent by oneself
          if (newMsg.sender_id === effectiveUserId) return;

          // Check if effective user is a participant of this conversation
          const { data: myPart } = await supabase
            .from("messenger_participants")
            .select("id, is_muted")
            .eq("conversation_id", newMsg.conversation_id)
            .eq("user_id", effectiveUserId)
            .maybeSingle();

          if (!myPart || myPart.is_muted) return;

          // Notify all trigger buttons and open drawers to sync unread counts
          window.dispatchEvent(
            new CustomEvent("chandak:messenger-unread-change", {
              detail: { conversationId: newMsg.conversation_id },
            })
          );

          // If the user is currently viewing this exact conversation in the drawer,
          // do not play sound or show system notifications (the conversation view handles it)
          if (
            isDrawerOpen &&
            activeConversationIdRef.current === newMsg.conversation_id
          ) {
            return;
          }

          // 1. Play audio chime
          playSystemNotificationChime();

          // 2. Fetch sender info
          const sender = await fetchSenderInfoForNotification(newMsg.sender_id);
          const preview =
            newMsg.content?.trim() ||
            (Array.isArray(newMsg.attachments) && newMsg.attachments.length > 0
              ? `Sent ${newMsg.attachments.length} attachment(s)`
              : "New message");

          // 3. Flash document title
          flashTitle(sender.full_name);

          // 4. Native OS / Desktop / Device Notification (fires even when browser is minimized or in background)
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
                const reg = await navigator.serviceWorker.ready;
                await reg.showNotification(sender.full_name, {
                  body: preview,
                  icon: sender.profile_photo || "/chandak-40-icon.png",
                  badge: "/chandak-40-icon.png",
                  tag: `msg-${newMsg.id}`,
                  data: {
                    url: `/#messenger:${newMsg.conversation_id}`,
                    conversationId: newMsg.conversation_id,
                  },
                });
              } else {
                const notif = new Notification(sender.full_name, {
                  body: preview,
                  icon: sender.profile_photo || "/chandak-40-icon.png",
                  badge: "/chandak-40-icon.png",
                  tag: `msg-${newMsg.id}`,
                });

                notif.onclick = () => {
                  window.focus();
                  window.dispatchEvent(
                    new CustomEvent("open-chandak-messenger", {
                      detail: { conversationId: newMsg.conversation_id },
                    })
                  );
                  notif.close();
                };
              }
            } catch {
              // Ignore native notification errors
            }
          }

          // 5. Floating in-app notification toast (if drawer is not currently displaying this chat)
          setActiveToast({
            id: newMsg.id,
            conversationId: newMsg.conversation_id,
            senderName: sender.full_name,
            senderPhoto: sender.profile_photo,
            content: preview,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, isDrawerOpen, supabase, flashTitle]);

  // Auto-dismiss floating toast after 6 seconds
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  const handleOpenConversation = (conversationId: string) => {
    setActiveToast(null);
    window.dispatchEvent(
      new CustomEvent("open-chandak-messenger", {
        detail: { conversationId },
      })
    );
  };

  if (!activeToast) return null;

  return (
    <div className="fixed top-16 right-4 z-[var(--z-modal,9999)] w-88 max-w-[calc(100vw-2rem)] bg-elevated border border-border rounded-xl shadow-2xl p-3 flex items-start gap-3 animate-in slide-in-from-top-3 fade-in duration-200">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {activeToast.senderPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeToast.senderPhoto}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          activeToast.senderName.charAt(0).toUpperCase()
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between mb-0.5">
          <h4 className="text-xs font-bold text-foreground truncate">
            {activeToast.senderName}
          </h4>
          <button
            type="button"
            onClick={() => setActiveToast(null)}
            className="p-1 -mr-1 text-muted hover:text-foreground rounded transition-colors"
            title="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <p className="text-xs text-muted line-clamp-2 mb-2">
          {activeToast.content}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenConversation(activeToast.conversationId)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-primary text-primary-contrast text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <Reply className="h-3 w-3" />
            <span>Reply</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveToast(null)}
            className="px-2 py-1 text-xs text-muted hover:text-foreground transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export default SystemMessengerNotifier;
