"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useProfile } from "@/hooks/usePermissions";
import { createClient } from "@/utils/supabase/client";
import { fetchSenderInfoForNotification } from "@/lib/actions/messenger";
import { X, Reply } from "lucide-react";

interface FloatingToast {
  id: string;
  conversationId: string;
  senderName: string;
  senderPhoto: string | null;
  content: string;
}

// Shared running Web Audio context for zero-latency notification chimes
let sharedAudioCtx: AudioContext | null = null;

function getRunningAudioContext(): AudioContext | null {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Synthesizes a high-fidelity, crisp two-tone audio chime using Web Audio API.
 * Operates across all browsers with zero external sound file dependencies.
 */
function playSystemNotificationChime() {
  try {
    const ctx = getRunningAudioContext();
    if (!ctx) return;
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
    gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
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

// Cross-tab broadcast channel to deduplicate notifications across multiple open tabs
let broadcastBus: BroadcastChannel | null = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    broadcastBus = new BroadcastChannel("chandak_messenger_notif_bus");
  } catch {}
}

export function SystemMessengerNotifier() {
  const { data: profile } = useProfile();
  const [activeToast, setActiveToast] = useState<FloatingToast | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const activeConversationIdRef = useRef<string | null>(null);
  const originalTitleRef = useRef<string>("");
  const titleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  // In-memory caches to guarantee 0ms instant notification without network latency
  const conversationsCacheRef = useRef<Set<string>>(new Set());
  const mutedConversationsCacheRef = useRef<Set<string>>(new Set());
  const senderCacheRef = useRef<Map<string, { full_name: string; profile_photo: string | null }>>(new Map());
  const recentNotifiedIdsRef = useRef<Set<string>>(new Set());

  // Listen to cross-tab broadcast to prevent duplicate audio chimes/popups
  useEffect(() => {
    if (!broadcastBus) return;
    const handleBusMessage = (event: MessageEvent) => {
      if (event.data?.type === "MSG_NOTIFIED" && event.data?.id) {
        recentNotifiedIdsRef.current.add(event.data.id);
        // Clean up old entries after 10 seconds
        setTimeout(() => {
          recentNotifiedIdsRef.current.delete(event.data.id);
        }, 10000);
      }
    };
    broadcastBus.addEventListener("message", handleBusMessage);
    return () => {
      broadcastBus?.removeEventListener("message", handleBusMessage);
    };
  }, []);

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

  // Proactively warm up AudioContext and request browser notification permission
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const warmAudioAndRequestPerm = () => {
      getRunningAudioContext();
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    };

    window.addEventListener("click", warmAudioAndRequestPerm);
    window.addEventListener("keydown", warmAudioAndRequestPerm);
    window.addEventListener("pointerdown", warmAudioAndRequestPerm);

    return () => {
      window.removeEventListener("click", warmAudioAndRequestPerm);
      window.removeEventListener("keydown", warmAudioAndRequestPerm);
      window.removeEventListener("pointerdown", warmAudioAndRequestPerm);
    };
  }, []);

  // Preload and cache user's participant conversations for zero-latency checks
  const getEffectiveUserId = useCallback((): string | null => {
    return profile?.id || (typeof window !== "undefined" ? localStorage.getItem("chandak_messenger_user_id") : null) || null;
  }, [profile?.id]);

  const refreshUserConversations = useCallback(async (userId: string) => {
    try {
      const { data: parts } = await supabase
        .from("messenger_participants")
        .select("conversation_id, is_muted")
        .eq("user_id", userId);

      if (parts) {
        const convSet = new Set<string>();
        const mutedSet = new Set<string>();
        for (const p of parts) {
          convSet.add(p.conversation_id);
          if (p.is_muted) mutedSet.add(p.conversation_id);
        }
        conversationsCacheRef.current = convSet;
        mutedConversationsCacheRef.current = mutedSet;
      }
    } catch (e) {
      console.warn("Failed to cache conversations:", e);
    }
  }, [supabase]);

  useEffect(() => {
    const effectiveUserId = getEffectiveUserId();
    if (effectiveUserId) {
      refreshUserConversations(effectiveUserId);
    }
  }, [getEffectiveUserId, refreshUserConversations]);

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
    if (document.hasFocus() && !document.hidden) return;

    if (!titleIntervalRef.current) {
      originalTitleRef.current = document.title;
      let toggle = false;
      titleIntervalRef.current = setInterval(() => {
        document.title = toggle
          ? `(1) 💬 New message from ${senderName}`
          : originalTitleRef.current;
        toggle = !toggle;
      }, 1200);
    }
  }, []);

  // Helper to dispatch native OS desktop notifications
  const dispatchNativeNotification = useCallback(
    async (senderName: string, preview: string, msgId: string, convId: string, photo: string | null) => {
      if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
        return;
      }

      const notifOptions = {
        body: preview,
        icon: photo || "/chandak-40-icon.png",
        badge: "/chandak-40-icon.png",
        tag: `chandak-msg-${convId}`,
        renotify: true,
        requireInteraction: false,
        silent: false,
        data: {
          url: `/#messenger:${convId}`,
          conversationId: convId,
        },
      };

      let swShown = false;
      if ("serviceWorker" in navigator) {
        try {
          const reg = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 800)),
          ]);
          if (reg && reg.showNotification) {
            await reg.showNotification(senderName, notifOptions as any);
            swShown = true;
          }
        } catch (swErr) {
          console.warn("SW notification error:", swErr);
        }
      }

      if (!swShown) {
        try {
          const notif = new Notification(senderName, notifOptions as any);
          notif.onclick = () => {
            window.focus();
            window.dispatchEvent(
              new CustomEvent("open-chandak-messenger", {
                detail: { conversationId: convId },
              })
            );
            notif.close();
          };
        } catch (winErr) {
          console.warn("Window notification fallback error:", winErr);
        }
      }
    },
    []
  );

  // Global Realtime listener on messenger_messages with resilient self-healing reconnection
  useEffect(() => {
    if (typeof window === "undefined") return;

    let channel: any = null;
    let isConnected = false;
    let isCleanedUp = false;

    const setupChannel = () => {
      if (isCleanedUp) return;

      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
        channel = null;
      }

      channel = supabase
        .channel(`chandak_global_messenger_notifications_${Date.now()}`)
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

            // Multi-tab deduplication: skip if another tab already processed this message
            if (recentNotifiedIdsRef.current.has(newMsg.id)) return;
            recentNotifiedIdsRef.current.add(newMsg.id);
            setTimeout(() => {
              recentNotifiedIdsRef.current.delete(newMsg.id);
            }, 10000);

            try {
              broadcastBus?.postMessage({ type: "MSG_NOTIFIED", id: newMsg.id });
            } catch {}

            // Check if effective user is a participant of this conversation
            let isRecipient = false;
            if (conversationsCacheRef.current.has(newMsg.conversation_id)) {
              if (!mutedConversationsCacheRef.current.has(newMsg.conversation_id)) {
                isRecipient = true;
              }
            } else {
              // Cache miss fallback: query database
              const { data: myPart } = await supabase
                .from("messenger_participants")
                .select("id, is_muted")
                .eq("conversation_id", newMsg.conversation_id)
                .eq("user_id", effectiveUserId)
                .maybeSingle();

              if (myPart) {
                conversationsCacheRef.current.add(newMsg.conversation_id);
                if (myPart.is_muted) {
                  mutedConversationsCacheRef.current.add(newMsg.conversation_id);
                } else {
                  isRecipient = true;
                }
              } else {
                const { data: conv } = await supabase
                  .from("messenger_conversations")
                  .select("direct_user1_id, direct_user2_id")
                  .eq("id", newMsg.conversation_id)
                  .maybeSingle();

                if (conv && (conv.direct_user1_id === effectiveUserId || conv.direct_user2_id === effectiveUserId)) {
                  conversationsCacheRef.current.add(newMsg.conversation_id);
                  isRecipient = true;
                }
              }
            }

            if (!isRecipient) return;

            // Notify all trigger buttons and open drawers to sync unread counts
            window.dispatchEvent(
              new CustomEvent("chandak:messenger-unread-change", {
                detail: { conversationId: newMsg.conversation_id },
              })
            );

            // 1. MUST ALWAYS play audio chime on EVERY incoming message
            playSystemNotificationChime();

            // Resolve sender details (memory cache first for 0ms latency)
            let sender = senderCacheRef.current.get(newMsg.sender_id);
            if (!sender) {
              sender = await fetchSenderInfoForNotification(newMsg.sender_id);
              if (sender?.full_name) {
                senderCacheRef.current.set(newMsg.sender_id, sender);
              }
            }

            const preview =
              newMsg.content?.trim() ||
              (Array.isArray(newMsg.attachments) && newMsg.attachments.length > 0
                ? `Sent ${newMsg.attachments.length} attachment(s)`
                : "New message");

            // Check if the user is looking directly at this conversation on screen right now
            const isChatActivelyFocused =
              isDrawerOpen &&
              activeConversationIdRef.current === newMsg.conversation_id &&
              document.hasFocus() &&
              !document.hidden;

            // If the user is actively typing/looking right at this conversation on screen,
            // the message is rendered right in front of them and the chime played.
            if (isChatActivelyFocused) {
              return;
            }

            // In all other cases (e.g., user is on another browser tab, another app,
            // or chatting in another room, or drawer closed):
            // 2. Flash tab title
            flashTitle(sender.full_name);

            // 3. Dispatch native OS Desktop notification
            await dispatchNativeNotification(
              sender.full_name,
              preview,
              newMsg.id,
              newMsg.conversation_id,
              sender.profile_photo
            );

            // 4. Show floating in-app toast
            setActiveToast({
              id: newMsg.id,
              conversationId: newMsg.conversation_id,
              senderName: sender.full_name,
              senderPhoto: sender.profile_photo,
              content: preview,
            });
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            isConnected = true;
          } else if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            isConnected = false;
            if (!isCleanedUp) {
              setTimeout(() => {
                if (!isCleanedUp && !isConnected) {
                  setupChannel();
                }
              }, 2500);
            }
          }
        });
    };

    setupChannel();

    // Auto-reconnect when tab regains focus or comes back online
    const handleReconnection = () => {
      const effectiveUserId = getEffectiveUserId();
      if (effectiveUserId) {
        refreshUserConversations(effectiveUserId);
      }
      if (!isConnected && !isCleanedUp) {
        setupChannel();
      }
    };

    window.addEventListener("focus", handleReconnection);
    window.addEventListener("online", handleReconnection);
    document.addEventListener("visibilitychange", handleReconnection);

    // R1: Keep-alive heartbeat: checks every 60 seconds (paused when tab is hidden)
    const heartbeatInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (!isConnected && !isCleanedUp) {
        setupChannel();
      }
    }, 60000);

    return () => {
      isCleanedUp = true;
      window.removeEventListener("focus", handleReconnection);
      window.removeEventListener("online", handleReconnection);
      document.removeEventListener("visibilitychange", handleReconnection);
      clearInterval(heartbeatInterval);
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [
    getEffectiveUserId,
    isDrawerOpen,
    supabase,
    flashTitle,
    dispatchNativeNotification,
    refreshUserConversations,
  ]);

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
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/login")) {
      window.location.href = `/#messenger:${conversationId}`;
      return;
    }
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
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
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
