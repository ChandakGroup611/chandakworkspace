"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

// =========================================================================
// usePresence — Real-time online/offline detection hook
//
// A user is considered "online" if their `last_active_at` timestamp in
// `user_master` is within the last PRESENCE_TIMEOUT_MS (2 minutes).
//
// This hook:
// 1. Fetches initial presence data for the given user IDs
// 2. Subscribes to Supabase Realtime changes on user_master
// 3. Re-evaluates staleness every STALE_CHECK_INTERVAL_MS (30 seconds)
// =========================================================================

const PRESENCE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes — 2 missed heartbeats = offline
const STALE_CHECK_INTERVAL_MS = 30_000; // Re-evaluate every 30 seconds

export interface PresenceInfo {
  isOnline: boolean;
  lastSeen: Date | null;
}

export function usePresence(userIds: string[]): Map<string, PresenceInfo> {
  const supabase = useMemo(() => createClient(), []);
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceInfo>>(new Map());
  const userIdsRef = useRef<string[]>(userIds);

  // Keep the ref in sync for callbacks
  useEffect(() => {
    userIdsRef.current = userIds;
  }, [userIds]);

  // Determine if a user is online based on their last_active_at
  const isUserOnline = useCallback((lastActiveAt: string | null): boolean => {
    if (!lastActiveAt) return false;
    const lastActive = new Date(lastActiveAt).getTime();
    
    // Read the server time offset calculated by ClientSessionManager
    let offset = 0;
    try {
      const storedOffset = localStorage.getItem("adios_time_offset");
      if (storedOffset) offset = parseInt(storedOffset, 10);
    } catch {}
    
    const adjustedNow = Date.now() - offset;
    
    // We use Math.abs to handle edge cases where time drift causes negative differences
    return Math.abs(adjustedNow - lastActive) < PRESENCE_TIMEOUT_MS;
  }, []);

  // Build the presence map from raw data
  const buildPresenceMap = useCallback(
    (users: { id: string; last_active_at: string | null }[]) => {
      const map = new Map<string, PresenceInfo>();
      for (const user of users) {
        map.set(user.id, {
          isOnline: isUserOnline(user.last_active_at),
          lastSeen: user.last_active_at ? new Date(user.last_active_at) : null,
        });
      }
      return map;
    },
    [isUserOnline]
  );

  // Fetch initial presence data
  useEffect(() => {
    if (userIds.length === 0) {
      setPresenceMap(new Map());
      return;
    }

    let cancelled = false;

    const fetchPresence = async () => {
      try {
        const validUserIds = userIds.filter(id => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id));
        
        if (validUserIds.length === 0) {
          if (!cancelled) setPresenceMap(new Map());
          return;
        }

        const { data, error } = await supabase
          .from("user_master")
          .select("id, last_active_at")
          .in("id", validUserIds);

        if (error) {
          console.error("[usePresence] Failed to fetch presence:", error.message);
          return;
        }

        if (!cancelled && data) {
          setPresenceMap(buildPresenceMap(data));
        }
      } catch (err) {
        console.error("[usePresence] Fetch error:", err);
      }
    };

    fetchPresence();

    return () => {
      cancelled = true;
    };
  }, [userIds.join(","), supabase, buildPresenceMap]);

  // Subscribe to real-time changes on user_master.last_active_at
  useEffect(() => {
    if (userIds.length === 0) return;

    const channel = supabase
      .channel("presence_tracking")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_master",
          filter: userIds.length === 1
            ? `id=eq.${userIds[0]}`
            : undefined, // Supabase doesn't support IN filters on realtime yet
        },
        (payload) => {
          const updatedUser = payload.new as { id: string; last_active_at: string | null };

          // Only process if this user is in our tracked list
          if (!userIdsRef.current.includes(updatedUser.id)) return;

          setPresenceMap((prev) => {
            const next = new Map(prev);
            next.set(updatedUser.id, {
              isOnline: isUserOnline(updatedUser.last_active_at),
              lastSeen: updatedUser.last_active_at
                ? new Date(updatedUser.last_active_at)
                : null,
            });
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userIds.join(","), supabase, isUserOnline]);

  // Periodic staleness check — re-evaluate online/offline every 30 seconds
  // This handles the case where no Realtime update arrives but the user's
  // last_active_at is now stale enough to flip them to offline
  useEffect(() => {
    if (userIds.length === 0) return;

    const interval = setInterval(() => {
      setPresenceMap((prev) => {
        const next = new Map(prev);
        let changed = false;

        for (const [userId, info] of next) {
          const nowOnline = info.lastSeen
            ? Date.now() - info.lastSeen.getTime() < PRESENCE_TIMEOUT_MS
            : false;

          if (nowOnline !== info.isOnline) {
            next.set(userId, { ...info, isOnline: nowOnline });
            changed = true;
          }
        }

        return changed ? next : prev;
      });
    }, STALE_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [userIds.join(",")]);

  return presenceMap;
}
