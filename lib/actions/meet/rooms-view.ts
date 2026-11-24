"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";

/** Rooms page (redesign): every active room with what's on today and whether it's free now. Read-only. */

export interface RoomToday {
  id: string;
  name: string;
  location: string;
  capacity: number;
  hasTeams: boolean;
  projector: boolean;
  whiteboard: boolean;
  freeNow: boolean;
  busyUntil: string | null;
  nextStart: string | null;
  nextTitle: string | null;
  bookings: { start: string; end: string; title: string; mine: boolean; status: string }[];
}

const IST = "Asia/Kolkata";
const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export async function getRoomsToday(minSeats?: number, teamsOnly?: boolean): Promise<RoomToday[]> {
  const auth = await requireMeet("MEET_VIEW");
  try {
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const from = `${day}T00:00:00+05:30`;
    const to = `${day}T23:59:59+05:30`;

    let q = supabaseAdmin.from("meet_rooms").select("*").eq("is_active", true).order("name");
    if (minSeats) q = q.gte("capacity", minSeats);
    const [{ data: rooms }, { data: bookings }] = await Promise.all([
      q,
      supabaseAdmin
        .from("meet_room_bookings")
        .select("room_id, start_at, end_at, status, booked_by, session:meet_sessions(meeting:meet_meetings(title, is_confidential))")
        .in("status", ["confirmed", "pending", "checked_in", "tentative"])
        .lt("start_at", to)
        .gt("end_at", from)
        .order("start_at", { ascending: true }),
    ]);

    const now = new Date().toISOString();
    return (rooms || [])
      .map((r: any) => {
        const fac = r.facilities || {};
        const list = (bookings || [])
          .filter((b: any) => b.room_id === r.id)
          .map((b: any) => {
            const m = one(one(b.session)?.meeting);
            const hide = m?.is_confidential && b.booked_by !== auth.userId;
            return {
              start: b.start_at,
              end: b.end_at,
              title: hide ? "Booked" : m?.title || "Booked",
              mine: b.booked_by === auth.userId,
              status: b.status,
            };
          });
        const current = list.find((b) => b.start <= now && b.end > now);
        const next = list.find((b) => b.start > now);
        return {
          id: r.id,
          name: r.name,
          location: r.location || "",
          capacity: Number(r.capacity) || 0,
          hasTeams: !!(fac.video_conferencing || r.m365_email),
          projector: !!fac.projector,
          whiteboard: !!fac.whiteboard,
          freeNow: !current,
          busyUntil: current?.end || null,
          nextStart: next?.start || null,
          nextTitle: next?.title || null,
          bookings: list,
        };
      })
      .filter((r) => !teamsOnly || r.hasTeams);
  } catch (err) {
    console.error("[getRoomsToday]", err);
    return [];
  }
}
