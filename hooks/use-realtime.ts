"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

// Module-level state to enforce global maximum channel count
const activeChannels = new Map<string, any>();
const MAX_CHANNELS = 10;

interface UseRealtimeOptions {
  channelName: string;
  table: string;
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  enabled?: boolean;
}

export function useRealtime({
  channelName,
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: UseRealtimeOptions) {
  const supabase = createClient();
  const retryCount = useRef(0);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  const calculateBackoff = (attempt: number) => {
    // 1s, 2s, 5s, 10s, 30s max
    if (attempt === 0) return 1000;
    if (attempt === 1) return 2000;
    if (attempt === 2) return 5000;
    if (attempt === 3) return 10000;
    return 30000;
  };

  const connect = useCallback(() => {
    // TEMPORARY PHASE 2 LOAD REDUCTION: Allow only chat and notification realtime
    const lowerChannel = channelName.toLowerCase();
    const isCritical = lowerChannel.includes("chat") || lowerChannel.includes("notification");
    
    if (!isCritical) {
      console.warn(`[Phase 2 Stabilization] Suppressed realtime connection to ${channelName}`);
      return;
    }

    // Feature Flag Kill Switch Check
    if (typeof window !== "undefined" && window.localStorage.getItem("REALTIME_KILL_SWITCH") === "true") {
      console.warn(`[Realtime Kill Switch] Connection to ${channelName} aborted.`);
      return;
    }

    if (activeChannels.size >= MAX_CHANNELS && !activeChannels.has(channelName)) {
      // Auto-clean oldest inactive channel
      const oldestKey = activeChannels.keys().next().value;
      if (oldestKey) {
        console.warn(`[Realtime] Max channels (${MAX_CHANNELS}) reached. Evicting oldest: ${oldestKey}`);
        supabase.removeChannel(activeChannels.get(oldestKey));
        activeChannels.delete(oldestKey);
      }
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: table,
          filter: filter,
        },
        (payload) => onInsert?.(payload)
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: table,
          filter: filter,
        },
        (payload) => onUpdate?.(payload)
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: table,
          filter: filter,
        },
        (payload) => onDelete?.(payload)
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          retryCount.current = 0; // Reset backoff on success
          activeChannels.set(channelName, channel);
        }
        if (status === "CLOSED" || status === "CHANNEL_ERROR" || err) {
          activeChannels.delete(channelName);
          
          // Exponential backoff reconnect
          const delay = calculateBackoff(retryCount.current);
          retryCount.current += 1;
          
          console.warn(`[Realtime] Connection lost to ${channelName}. Reconnecting in ${delay}ms...`);
          
          if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
          reconnectTimer.current = setTimeout(() => {
            // Only attempt reconnect if tab is visible
            if (document.visibilityState === "visible") {
              connect();
            } else {
              // Wait for visibility to change
              const onVisible = () => {
                if (document.visibilityState === "visible") {
                  document.removeEventListener("visibilitychange", onVisible);
                  // Grace delay before reconnecting
                  setTimeout(() => connect(), 2000); 
                }
              };
              document.addEventListener("visibilitychange", onVisible);
            }
          }, delay);
        }
      });

  }, [channelName, table, filter, onInsert, onUpdate, onDelete, supabase]);

  useEffect(() => {
    if (!enabled) return;

    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (activeChannels.has(channelName)) {
        supabase.removeChannel(activeChannels.get(channelName));
        activeChannels.delete(channelName);
      }
    };
  }, [connect, enabled, channelName, supabase]);
}
