"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";
import { bookRoomForSession } from "@/lib/actions/meet/rooms";

/** Room for one meeting date: see which rooms are free at that time, book, change or release. */

const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export interface SessionRoomInfo {
  canEdit: boolean;
  current: { roomId: string; name: string; status: string } | null;
  rooms: { id: string; name: string; location: string | null; capacity: number; free: boolean; busyWith: string | null }[];
  people: number;
}

export async function getSessionRoomInfo(sessionId: string): Promise<SessionRoomInfo | null> {
  const auth = await requireMeet("MEET_VIEW", { sessionId });
  const { data: s } = await supabaseAdmin
    .from("meet_sessions")
    .select("id, status, scheduled_start, scheduled_end, room_id, meeting:meet_meetings(organizer_id, chair_id, default_minute_taker_id, default_duration_minutes)")
    .eq("id", sessionId)
    .maybeSingle();
  if (!s) return null;
  const m = one((s as any).meeting);
  const start = s.scheduled_start;
  const end = s.scheduled_end || new Date(new Date(start).getTime() + (m?.default_duration_minutes || 60) * 60000).toISOString();
  const [roomsRes, bookRes, mineRes, attRes] = await Promise.all([
    supabaseAdmin.from("meet_rooms").select("id, name, location, capacity").eq("is_active", true).order("name"),
    supabaseAdmin
      .from("meet_room_bookings")
      .select("room_id, session_id, session:meet_sessions(meeting:meet_meetings(title))")
      .in("status", ["confirmed", "pending", "checked_in", "tentative"])
      .lt("start_at", end)
      .gt("end_at", start),
    supabaseAdmin.from("meet_room_bookings").select("room_id, status, room:meet_rooms(name)").eq("session_id", sessionId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabaseAdmin.from("meet_session_attendees").select("id", { count: "exact", head: true }).eq("session_id", sessionId),
  ]);
  const busy = new Map<string, string>();
  for (const b of (bookRes.data || []) as any[]) if (b.session_id !== sessionId) busy.set(b.room_id, one(one(b.session)?.meeting)?.title || "another meeting");
  const mine = mineRes.data as any;
  const active = mine && !["cancelled", "released", "declined"].includes(mine.status);
  const isOrg = m?.organizer_id === auth.userId || m?.chair_id === auth.userId || m?.default_minute_taker_id === auth.userId;
  return {
    canEdit: (auth.isSuperAdmin || auth.isMeetAdmin || isOrg) && (s.status === "scheduled" || s.status === "in_progress"),
    current: active ? { roomId: mine.room_id, name: one(mine.room)?.name || "Room", status: mine.status } : null,
    rooms: ((roomsRes.data || []) as any[]).map((r) => ({ id: r.id, name: r.name, location: r.location || null, capacity: Number(r.capacity) || 0, free: !busy.has(r.id), busyWith: busy.get(r.id) || null })),
    people: (attRes as any).count || 0,
  };
}

export async function setSessionRoom(input: { sessionId: string; roomId: string | null }): Promise<{ success: boolean; error?: string }> {
  const info = await getSessionRoomInfo(input.sessionId);
  if (!info) return { success: false, error: "Meeting not found." };
  if (!info.canEdit) return { success: false, error: "Only the organiser, chair or minute taker can change the room." };
  const { data: s } = await supabaseAdmin.from("meet_sessions").select("id, meeting_id, scheduled_start, scheduled_end, meeting:meet_meetings(mode, default_duration_minutes)").eq("id", input.sessionId).maybeSingle();
  if (!s) return { success: false, error: "Meeting not found." };
  const auth = await requireMeet("MEET_VIEW", { sessionId: input.sessionId });

  if (!input.roomId) {
    await supabaseAdmin.from("meet_room_bookings").update({ status: "released", released_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("session_id", s.id);
    await supabaseAdmin.from("meet_sessions").update({ room_id: null, updated_at: new Date().toISOString() }).eq("id", s.id);
    await supabaseAdmin.from("meet_activity_log").insert({ entity_type: "session", entity_id: s.id, action: "room_released", field: "room_id", new_value: "none", user_id: auth.userId, channel: "web" });
    revalidatePath(`/meet/sessions/${s.id}`);
    return { success: true };
  }
  const end = s.scheduled_end || new Date(new Date(s.scheduled_start).getTime() + ((one((s as any).meeting)?.default_duration_minutes) || 60) * 60000).toISOString();
  const r = await bookRoomForSession(s.id, input.roomId, s.scheduled_start, end);
  if (!r.success) return { success: false, error: r.error || "Couldn't book the room." };
  // An online-only meeting that now has a room becomes Teams + room
  if (one((s as any).meeting)?.mode === "online") await supabaseAdmin.from("meet_meetings").update({ mode: "hybrid", updated_at: new Date().toISOString() }).eq("id", s.meeting_id);
  await supabaseAdmin.from("meet_activity_log").insert({ entity_type: "session", entity_id: s.id, action: "room_booked", field: "room_id", new_value: input.roomId, user_id: auth.userId, channel: "web" });
  revalidatePath(`/meet/sessions/${s.id}`);
  revalidatePath(`/meet/meetings/${s.meeting_id}`);
  return { success: true };
}
