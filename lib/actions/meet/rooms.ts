"use server";

import { syncSessionEvent } from "@/lib/integrations/outlook-events";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getCachedUser } from "@/lib/auth/cached-user";
import { requireMeet } from "@/lib/permissions/meet";
import { revalidatePath } from "next/cache";
import type { MeetingRoom, MeetRoomBooking } from "@/types/meet";

/**
 * Check if a specific room is available for a time window (R-1)
 */
export async function checkRoomAvailability(
  roomId: string,
  startAt: string,
  endAt: string,
  excludeSessionId?: string
): Promise<{ isAvailable: boolean; conflictingBooking?: MeetRoomBooking | null }> {
  try {
    let query = supabaseAdmin
      .from("meet_room_bookings")
      .select(`
        *,
        booked_by_user:user_master!meet_room_bookings_booked_by_fkey(id, full_name, email),
        session:meet_sessions(code, meeting:meet_meetings(title))
      `)
      .eq("room_id", roomId)
      .in("status", ["confirmed", "checked_in", "pending"])
      .lt("start_at", endAt)
      .gt("end_at", startAt);

    if (excludeSessionId) {
      query = query.neq("session_id", excludeSessionId);
    }

    const { data: conflict } = await query.maybeSingle();
    return {
      isAvailable: !conflict,
      conflictingBooking: (conflict as MeetRoomBooking) || null,
    };
  } catch (err: any) {
    console.error("Error checking room availability:", err);
    return { isAvailable: false, conflictingBooking: null };
  }
}

export async function getRoomsWithLiveAvailability(
  startAt: string,
  endAt: string,
  minCapacity?: number,
  needsVC?: boolean
): Promise<{
  rooms: (MeetingRoom & {
    isAvailable: boolean;
    conflictingBooking?: MeetRoomBooking | null;
  })[];
  suggestedRoom?: MeetingRoom | null;
}> {
  try {
    let query = supabaseAdmin
      .from("meet_rooms")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (minCapacity) {
      query = query.gte("capacity", minCapacity);
    }

    const { data: rooms, error } = await query;
    if (error) {
      console.error("Error fetching rooms:", error);
      return { rooms: [], suggestedRoom: null };
    }

    // Query active bookings overlapping this range
    const { data: bookings } = await supabaseAdmin
      .from("meet_room_bookings")
      .select(`
        *,
        booked_by_user:user_master!meet_room_bookings_booked_by_fkey(id, full_name, email),
        session:meet_sessions(
          code,
          meeting:meet_meetings(title, organizer:user_master!meet_meetings_organizer_id_fkey(full_name))
        )
      `)
      .in("status", ["confirmed", "pending", "checked_in", "tentative"])
      .lt("start_at", endAt)
      .gt("end_at", startAt);

    const bookingMap = new Map<string, MeetRoomBooking>();
    (bookings || []).forEach((b: any) => {
      bookingMap.set(b.room_id, b as MeetRoomBooking);
    });

    const evaluated = (rooms || []).map((r: any) => {
      const conflict = bookingMap.get(r.id) || null;
      return {
        ...r,
        isAvailable: !conflict,
        conflictingBooking: conflict,
      };
    });

    // Find suggested alternative if desired room busy
    const available = evaluated.filter((r) => r.isAvailable);
    const suggestedRoom = available.length > 0 ? available[0] : null;

    return { rooms: evaluated, suggestedRoom };
  } catch (err: any) {
    console.error("Error evaluating room availability:", err);
    return { rooms: [], suggestedRoom: null };
  }
}

export async function bookRoomForSession(
  sessionId: string,
  roomId: string,
  startAt: string,
  endAt: string
): Promise<{ success: boolean; booking?: MeetRoomBooking; error?: string }> {
  try {
    const { userId } = await requireMeet("MEET_UPDATE", { sessionId });

    // 1. Conflict check
    const { data: clash } = await supabaseAdmin
      .from("meet_room_bookings")
      .select("id")
      .eq("room_id", roomId)
      .in("status", ["confirmed", "checked_in", "pending"])
      .lt("start_at", endAt)
      .gt("end_at", startAt)
      .neq("session_id", sessionId)
      .limit(1)
      .maybeSingle();

    if (clash) {
      return { success: false, error: "Room is already booked for this time window." };
    }

    const { data: sessionData } = await supabaseAdmin
      .from("meet_sessions")
      .select("video_link, meeting:meet_meetings(title)")
      .eq("id", sessionId)
      .maybeSingle();

    const joinUrl = sessionData?.video_link || `https://chandakgroup.tech/meet/live/${sessionId}`;

    // 2. Insert or update booking (one booking row per meeting date; no unique index to upsert on)
    const row = {
      session_id: sessionId,
      room_id: roomId,
      start_at: startAt,
      end_at: endAt,
      status: "confirmed",
      booked_by: userId,
      teams_join_url: joinUrl,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data: existing } = await supabaseAdmin
      .from("meet_room_bookings")
      .select("id")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: booking, error } = existing
      ? await supabaseAdmin.from("meet_room_bookings").update(row).eq("id", existing.id).select().single()
      : await supabaseAdmin.from("meet_room_bookings").insert(row).select().single();

    if (error) throw error;

    // Update room_id on session
    await supabaseAdmin
      .from("meet_sessions")
      .update({ room_id: roomId })
      .eq("id", sessionId);

    // Add the room to the Outlook / Teams event (no-op until Microsoft 365 is connected)
    await syncSessionEvent(sessionId).catch(() => null);

    revalidatePath(`/meet/sessions/${sessionId}`);
    return { success: true, booking: booking as MeetRoomBooking };
  } catch (err: any) {
    console.error("Error booking room:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Check-in to a room booking (R-4)
 */
export async function checkInRoomBooking(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireMeet("MEET_SESSION_RUN");
    const nowIso = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from("meet_room_bookings")
      .update({
        status: "checked_in",
        checked_in_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", bookingId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Error checking in room booking:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Auto-release no-show room bookings after threshold (R-4)
 */
export async function releaseNoShowBookings(
  roomId?: string
): Promise<{ success: boolean; releasedCount: number }> {
  try {
    const { user } = await getCachedUser();
    if (!user) return { success: false, releasedCount: 0 };

    const now = new Date();
    // Default 10 min grace period
    const cutoff = new Date(now.getTime() - 10 * 60000).toISOString();

    let query = supabaseAdmin
      .from("meet_room_bookings")
      .select("id, room_id")
      .eq("status", "confirmed")
      .lte("start_at", cutoff);

    if (roomId) {
      query = query.eq("room_id", roomId);
    }

    const { data: noShows, error: fetchErr } = await query;
    if (fetchErr || !noShows || noShows.length === 0) {
      return { success: true, releasedCount: 0 };
    }

    const ids = noShows.map((b) => b.id);
    const { error: updErr } = await supabaseAdmin
      .from("meet_room_bookings")
      .update({
        status: "released",
        released_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .in("id", ids);

    if (updErr) throw updErr;
    return { success: true, releasedCount: ids.length };
  } catch (err: any) {
    console.error("Error releasing no-show bookings:", err);
    return { success: false, releasedCount: 0 };
  }
}

export async function releaseRoomBooking(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireMeet("MEET_UPDATE");
    const { error } = await supabaseAdmin
      .from("meet_room_bookings")
      .update({
        status: "released",
        released_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Error releasing room booking:", err);
    return { success: false, error: err.message };
  }
}


// Tablet Kiosk Display Data (F6)
export async function getRoomDisplayData(roomId: string): Promise<{
  room: MeetingRoom | null;
  status: "available" | "in_use" | "starting_soon";
  currentBooking: (MeetRoomBooking & {
    title: string;
    organizerName: string;
    organizerPhoto?: string | null;
    isPrivate: boolean;
  }) | null;
  nextBookings: {
    title: string;
    organizerName: string;
    startAt: string;
    endAt: string;
  }[];
  todayTimeline: {
    startAt: string;
    endAt: string;
    isBusy: boolean;
    title: string;
  }[];
}> {
  try {
    const now = new Date();
    const nowIso = now.toISOString();

    // India Standard Time (UTC+05:30) calculations
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffsetMs);
    const y = istNow.getUTCFullYear();
    const m = istNow.getUTCMonth();
    const d = istNow.getUTCDate();

    const todayStart = new Date(Date.UTC(y, m, d, 0, 0, 0) - istOffsetMs).toISOString();
    const todayEnd = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - istOffsetMs).toISOString();

    const [roomRes, bookingsRes] = await Promise.all([
      supabaseAdmin.from("meet_rooms").select("*").eq("id", roomId).single(),
      supabaseAdmin
        .from("meet_room_bookings")
        .select(`
          *,
          booked_by_user:user_master!meet_room_bookings_booked_by_fkey(id, full_name, profile_photo),
          session:meet_sessions(
            id, code,
            meeting:meet_meetings(
              title,
              meeting_type:meet_meeting_types(is_board_mode),
              organizer:user_master!meet_meetings_organizer_id_fkey(id, full_name, profile_photo)
            )
          )
        `)
        .eq("room_id", roomId)
        .in("status", ["confirmed", "checked_in", "pending"])
        .gte("end_at", todayStart)
        .lte("start_at", todayEnd)
        .order("start_at", { ascending: true }),
    ]);

    const room = roomRes.data as MeetingRoom | null;
    const allBookings = bookingsRes.data || [];

    // Current booking
    let currentRaw: any = null;
    let nextBookingsRaw: any[] = [];

    for (const b of allBookings) {
      const bStart = new Date(b.start_at).getTime();
      const bEnd = new Date(b.end_at).getTime();
      const currentMs = now.getTime();

      if (bStart <= currentMs && currentMs <= bEnd) {
        currentRaw = b;
      } else if (bStart > currentMs) {
        nextBookingsRaw.push(b);
      }
    }

    let status: "available" | "in_use" | "starting_soon" = "available";
    if (currentRaw) {
      status = "in_use";
    } else if (nextBookingsRaw.length > 0) {
      const diffMin = Math.floor((new Date(nextBookingsRaw[0].start_at).getTime() - now.getTime()) / 60000);
      if (diffMin <= 15) {
        status = "starting_soon";
      }
    }

    let currentBooking = null;
    if (currentRaw) {
      const isPrivate = !room?.show_subject || currentRaw.session?.meeting?.meeting_type?.is_board_mode;
      currentBooking = {
        ...currentRaw,
        title: isPrivate ? "Private Meeting" : (currentRaw.session?.meeting?.title || "Meeting Session"),
        organizerName: currentRaw.session?.meeting?.organizer?.full_name || currentRaw.booked_by_user?.full_name || "Organizer",
        organizerPhoto: currentRaw.session?.meeting?.organizer?.profile_photo || currentRaw.booked_by_user?.profile_photo || null,
        isPrivate,
      };
    }

    const nextBookings = nextBookingsRaw.slice(0, 4).map((b) => ({
      title: !room?.show_subject ? "Reserved" : (b.session?.meeting?.title || "Meeting"),
      organizerName: b.session?.meeting?.organizer?.full_name || b.booked_by_user?.full_name || "Staff",
      startAt: b.start_at,
      endAt: b.end_at,
    }));

    const todayTimeline = allBookings.map((b) => ({
      startAt: b.start_at,
      endAt: b.end_at,
      isBusy: true,
      title: !room?.show_subject ? "Reserved" : (b.session?.meeting?.title || "Meeting"),
    }));

    return {
      room,
      status,
      currentBooking,
      nextBookings,
      todayTimeline,
    };
  } catch (err: any) {
    console.error("Error fetching room display data:", err);
    return {
      room: null,
      status: "available",
      currentBooking: null,
      nextBookings: [],
      todayTimeline: [],
    };
  }
}

export async function bookNowFromDisplay(
  roomId: string,
  durationMinutes: number
): Promise<{ success: boolean; message: string }> {
  try {
    const { user } = await getCachedUser();
    const userId = user?.id || null;

    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + durationMinutes * 60000);

    // Conflict check
    const { data: clash } = await supabaseAdmin
      .from("meet_room_bookings")
      .select("id")
      .eq("room_id", roomId)
      .in("status", ["confirmed", "checked_in", "pending"])
      .lt("start_at", endAt.toISOString())
      .gt("end_at", startAt.toISOString())
      .maybeSingle();

    if (clash) {
      return { success: false, message: "Room is not free for this duration." };
    }

    const { error } = await supabaseAdmin.from("meet_room_bookings").insert({
      room_id: roomId,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: "checked_in",
      checked_in_at: startAt.toISOString(),
      booked_by: userId,
      last_synced_at: startAt.toISOString(),
    });

    if (error) throw error;
    revalidatePath(`/rooms/${roomId}/display`);
    return { success: true, message: `Room reserved for ${durationMinutes} minutes.` };
  } catch (err: any) {
    console.error("Error booking room from display:", err);
    return { success: false, message: err.message };
  }
}

export async function endEarlyFromDisplay(
  roomId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const { user } = await getCachedUser();
    if (!user) return { success: false, message: "Unauthorized: Sign-in required." };

    const nowIso = new Date().toISOString();

    // S6: End ONLY the current in-progress booking (do NOT wipe out future bookings for the room!)
    const { data: currentBooking } = await supabaseAdmin
      .from("meet_room_bookings")
      .select("id")
      .eq("room_id", roomId)
      .in("status", ["confirmed", "checked_in"])
      .lte("start_at", nowIso)
      .gte("end_at", nowIso)
      .maybeSingle();

    if (!currentBooking) {
      return { success: false, message: "No active meeting in progress to end." };
    }

    const { error } = await supabaseAdmin
      .from("meet_room_bookings")
      .update({
        status: "ended",
        end_at: nowIso,
        released_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", currentBooking.id);

    if (error) throw error;

    revalidatePath(`/rooms/${roomId}/display`);
    return { success: true };
  } catch (err: any) {
    console.error("Error ending room booking early:", err);
    return { success: false, message: err.message };
  }
}

export async function extendFromDisplay(
  roomId: string,
  extraMinutes: number
): Promise<{ success: boolean; message: string }> {
  try {
    const { user } = await getCachedUser();
    if (!user) return { success: false, message: "Unauthorized: Sign-in required." };

    const { data: current } = await supabaseAdmin
      .from("meet_room_bookings")
      .select("*")
      .eq("room_id", roomId)
      .in("status", ["confirmed", "checked_in"])
      .order("start_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!current) return { success: false, message: "No active meeting to extend." };

    const newEnd = new Date(new Date(current.end_at).getTime() + extraMinutes * 60000);

    // Conflict check next booking
    const { data: clash } = await supabaseAdmin
      .from("meet_room_bookings")
      .select("id")
      .eq("room_id", roomId)
      .in("status", ["confirmed", "checked_in", "pending"])
      .neq("id", current.id)
      .lt("start_at", newEnd.toISOString())
      .gt("end_at", current.end_at)
      .maybeSingle();

    if (clash) {
      return { success: false, message: "Cannot extend: subsequent booking starts immediately." };
    }

    await supabaseAdmin
      .from("meet_room_bookings")
      .update({
        end_at: newEnd.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", current.id);

    revalidatePath(`/rooms/${roomId}/display`);
    return { success: true, message: `Meeting extended by ${extraMinutes} minutes.` };
  } catch (err: any) {
    console.error("Error extending room booking:", err);
    return { success: false, message: err.message };
  }
}
