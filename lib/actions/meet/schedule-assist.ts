"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";

/**
 * Scheduling help for the Schedule page (redesign): who is already busy in other Chandak Meet
 * meetings on the chosen day, and which rooms are free for the chosen slot. Read-only.
 * Busy times come from Chandak Meet sessions only (not personal Outlook calendars).
 */

const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export interface BusyBlock {
  start: string;
  end: string;
  title: string;
}

export interface ScheduleAssist {
  busy: Record<string, BusyBlock[]>;
  rooms: { id: string; name: string; capacity: number; hasTeams: boolean; free: boolean; busyWith: string | null }[];
}

export async function getScheduleAssist(input: {
  date: string; // YYYY-MM-DD (IST)
  startTime: string; // HH:MM or HH:MM:SS
  durationMinutes: number;
  userIds: string[];
  /** editing: ignore this session's own booking and attendance */
  excludeSessionId?: string;
}): Promise<ScheduleAssist> {
  const auth = await requireMeet("MEET_VIEW");
  const empty: ScheduleAssist = { busy: {}, rooms: [] };
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return empty;
    const time = /^\d{2}:\d{2}/.test(input.startTime) ? input.startTime.slice(0, 5) : "10:00";
    const dur = Math.min(Math.max(Number(input.durationMinutes) || 60, 5), 600);
    const slotStart = new Date(`${input.date}T${time}:00+05:30`).toISOString();
    const slotEnd = new Date(new Date(slotStart).getTime() + dur * 60000).toISOString();
    const dayFrom = new Date(`${input.date}T00:00:00+05:30`).toISOString();
    const dayTo = new Date(`${input.date}T23:59:59+05:30`).toISOString();
    const ids = Array.from(new Set((input.userIds || []).filter(Boolean))).slice(0, 60);

    const [{ data: sessions }, { data: rooms }, { data: bookings }] = await Promise.all([
      supabaseAdmin
        .from("meet_sessions")
        .select("id, scheduled_start, scheduled_end, meeting:meet_meetings(title, organizer_id, chair_id, is_confidential)")
        .eq("is_deleted", false)
        .neq("status", "cancelled")
        .gte("scheduled_start", dayFrom)
        .lte("scheduled_start", dayTo),
      supabaseAdmin.from("meet_rooms").select("id, name, capacity, facilities, m365_email").eq("is_active", true).order("name"),
      supabaseAdmin
        .from("meet_room_bookings")
        .select("room_id, session_id, session:meet_sessions(meeting:meet_meetings(title, is_confidential))")
        .in("status", ["confirmed", "pending", "checked_in", "tentative"])
        .lt("start_at", slotEnd)
        .gt("end_at", slotStart),
    ]);

    const busy: Record<string, BusyBlock[]> = {};
    const list = (sessions || []).filter((x: any) => x.id !== input.excludeSessionId);
    if (ids.length && list.length) {
      const { data: att } = await supabaseAdmin
        .from("meet_session_attendees")
        .select("session_id, user_id, role")
        .in("session_id", list.map((s: any) => s.id))
        .in("user_id", ids);
      const bySession = new Map(list.map((s: any) => [s.id, s]));
      const add = (uid: string, s: any) => {
        const m = one(s.meeting);
        const block = {
          start: s.scheduled_start,
          end: s.scheduled_end || new Date(new Date(s.scheduled_start).getTime() + 3600000).toISOString(),
          title: m?.is_confidential && uid !== auth.userId ? "Busy" : m?.title || "Meeting",
        };
        (busy[uid] ||= []);
        if (!busy[uid].some((b) => b.start === block.start && b.end === block.end)) busy[uid].push(block);
      };
      for (const a of att || []) {
        if (a.role === "requested" || a.role === "denied" || !a.user_id) continue;
        const s = bySession.get(a.session_id);
        if (s) add(a.user_id, s);
      }
      for (const s of list as any[]) {
        const m = one(s.meeting);
        for (const uid of [m?.organizer_id, m?.chair_id]) if (uid && ids.includes(uid)) add(uid, s);
      }
      Object.values(busy).forEach((arr) => arr.sort((a, b) => a.start.localeCompare(b.start)));
    }

    const taken = new Map<string, string>();
    for (const b of (bookings || []).filter((x: any) => x.session_id !== input.excludeSessionId)) {
      const m = one(one((b as any).session)?.meeting);
      taken.set((b as any).room_id, m?.is_confidential ? "Booked" : m?.title || "Booked");
    }

    return {
      busy,
      rooms: (rooms || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        capacity: Number(r.capacity) || 0,
        hasTeams: !!(r.facilities?.video_conferencing || r.m365_email),
        free: !taken.has(r.id),
        busyWith: taken.get(r.id) || null,
      })),
    };
  } catch (err) {
    console.error("[getScheduleAssist]", err);
    return empty;
  }
}
