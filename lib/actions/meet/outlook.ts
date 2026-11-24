"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";
import { syncSessionEvent, outlookConfigured, getStoredEventId } from "@/lib/integrations/outlook-events";

/** Puts a session into the organiser's Outlook (Teams meeting + room). Safe to call again. */
export async function syncSessionToOutlook(sessionId: string): Promise<{ success: boolean; skipped?: string; error?: string; joinUrl?: string }> {
  await requireMeet("MEET_UPDATE", { sessionId });
  const r = await syncSessionEvent(sessionId);
  revalidatePath(`/meet/sessions/${sessionId}`);
  return { success: r.ok, skipped: r.skipped, error: r.error, joinUrl: r.joinUrl };
}

export interface OutlookStatus {
  connected: boolean;
  inOutlook: boolean;
  teams: "real" | "plain" | "none" | "own";
  room: { name: string; state: "accepted" | "pending" | "declined" | "meet_only" | "cancelled" } | null;
  error: string | null;
}

/** What the meeting page shows under the title: Teams meeting, in Outlook, room answer. */
export async function getOutlookStatus(sessionId: string): Promise<OutlookStatus | null> {
  await requireMeet("MEET_VIEW", { sessionId });
  const [{ data: s }, eventId, { data: b }, { data: fail }] = await Promise.all([
    supabaseAdmin.from("meet_sessions").select("video_link, room:meet_rooms(name, m365_email)").eq("id", sessionId).maybeSingle(),
    getStoredEventId(sessionId),
    supabaseAdmin.from("meet_room_bookings").select("status, external_event_id, sync_error").eq("session_id", sessionId).maybeSingle(),
    supabaseAdmin
      .from("meet_activity_log")
      .select("new_value, created_at")
      .eq("entity_type", "session")
      .eq("entity_id", sessionId)
      .eq("action", "outlook_sync_failed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!s) return null;
  const link = String((s as any).video_link || "");
  const room: any = Array.isArray((s as any).room) ? (s as any).room[0] : (s as any).room;
  const teams: OutlookStatus["teams"] = !link
    ? "none"
    : /teams\.microsoft\.com\/l\/meetup-join/i.test(link)
    ? "real"
    : /teams\.microsoft\.com\/l\/(meeting\/new|call\/)/i.test(link)
    ? "plain"
    : "own";
  const bs = String((b as any)?.status || "");
  return {
    connected: outlookConfigured(),
    inOutlook: !!eventId,
    teams,
    room: room
      ? {
          name: room.name,
          state: !eventId || !room.m365_email ? "meet_only" : bs === "declined" ? "declined" : bs === "cancelled" ? "cancelled" : bs === "pending" ? "pending" : "accepted",
        }
      : null,
    error: !eventId && fail ? String((fail as any).new_value || "") : null,
  };
}
