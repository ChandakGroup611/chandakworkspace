"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";
import { sendMeetEmail } from "@/lib/utils/meet-email";

/**
 * Replies to a meeting invite: Accept, Maybe, or Can't attend (a reason is required).
 * The reply lives on the attendee row (meet_session_attendees.invite_status); the reason and
 * any stand-in are kept in meet_invitations.note / delegate_user_id.
 */

export type RsvpReply = "accepted" | "tentative" | "declined";
const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const IST = "Asia/Kolkata";
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: IST, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export interface RsvpPerson {
  user_id: string | null;
  name: string;
  role: string;
  reply: string; // invited | accepted | tentative | declined
  reason: string | null;
  replied_at: string | null;
  stand_in: string | null;
}

export async function getSessionReplies(sessionId: string): Promise<{ people: RsvpPerson[]; mine: { reply: string; reason: string | null } | null; counts: Record<string, number> }> {
  const auth = await requireMeet("MEET_VIEW", { sessionId });
  const [attRes, invRes] = await Promise.all([
    supabaseAdmin
      .from("meet_session_attendees")
      .select("user_id, guest_name, role, invite_status, user:user_master(full_name)")
      .eq("session_id", sessionId)
      .not("role", "in", '("requested","denied")'),
    supabaseAdmin
      .from("meet_invitations")
      .select("user_id, response, note, responded_at, delegate:user_master!meet_invitations_delegate_user_id_fkey(full_name)")
      .eq("session_id", sessionId),
  ]);
  const inv = new Map<string, any>();
  for (const i of (invRes.data || []) as any[]) inv.set(i.user_id, i);
  const people: RsvpPerson[] = ((attRes.data || []) as any[]).map((a) => {
    const i = a.user_id ? inv.get(a.user_id) : null;
    return {
      user_id: a.user_id || null,
      name: one(a.user)?.full_name || a.guest_name || "Guest",
      role: a.role,
      reply: a.invite_status || "invited",
      reason: i?.note || null,
      replied_at: i?.responded_at || null,
      stand_in: one(i?.delegate)?.full_name || null,
    };
  });
  const order: Record<string, number> = { declined: 0, tentative: 1, invited: 2, accepted: 3 };
  people.sort((a, b) => (order[a.reply] ?? 9) - (order[b.reply] ?? 9) || a.name.localeCompare(b.name));
  const counts: Record<string, number> = { accepted: 0, tentative: 0, declined: 0, invited: 0 };
  for (const p of people) counts[p.reply] = (counts[p.reply] || 0) + 1;
  const me = people.find((p) => p.user_id === auth.userId);
  return { people, mine: me ? { reply: me.reply, reason: me.reason } : null, counts };
}

export async function replyToInvite(input: { sessionId: string; reply: RsvpReply; reason?: string; standInId?: string }): Promise<{ success: boolean; error?: string }> {
  const auth = await requireMeet("MEET_VIEW", { sessionId: input.sessionId });
  const userId = auth.userId;
  const reason = String(input.reason || "").trim().slice(0, 500);
  if (!["accepted", "tentative", "declined"].includes(input.reply)) return { success: false, error: "Pick a reply." };
  if (input.reply === "declined" && reason.length < 3) return { success: false, error: "Please give a reason for not attending." };

  const { data: s } = await supabaseAdmin
    .from("meet_sessions")
    .select("id, code, status, scheduled_start, meeting_id, meeting:meet_meetings(id, title)")
    .eq("id", input.sessionId)
    .maybeSingle();
  if (!s) return { success: false, error: "Meeting not found." };
  if (s.status !== "scheduled" && s.status !== "in_progress") return { success: false, error: "This meeting is over or cancelled, so replies are closed." };

  const { data: att } = await supabaseAdmin.from("meet_session_attendees").select("id").eq("session_id", input.sessionId).eq("user_id", userId).maybeSingle();
  if (!att) return { success: false, error: "You aren't on the invite list for this meeting." };

  const now = new Date().toISOString();
  const patch: any = { invite_status: input.reply };
  if (input.reply === "declined") patch.attendance = "excused";
  await supabaseAdmin.from("meet_session_attendees").update(patch).eq("id", att.id);
  await supabaseAdmin.from("meet_invitations").upsert(
    {
      session_id: input.sessionId,
      user_id: userId,
      response: input.reply,
      responded_at: now,
      note: reason || null,
      delegate_user_id: input.reply === "declined" && input.standInId ? input.standInId : null,
      channel: "app",
      updated_at: now,
    },
    { onConflict: "session_id,user_id" }
  );

  if (input.reply === "declined" && input.standInId && input.standInId !== userId) {
    const { data: has } = await supabaseAdmin.from("meet_session_attendees").select("id").eq("session_id", input.sessionId).eq("user_id", input.standInId).maybeSingle();
    if (!has) {
      await supabaseAdmin.from("meet_session_attendees").insert({ session_id: input.sessionId, user_id: input.standInId, role: "required", invite_status: "invited", attendance: "absent" });
    }
  }

  await supabaseAdmin.from("meet_activity_log").insert({
    entity_type: "session",
    entity_id: input.sessionId,
    action: "rsvp_replied",
    field: "invite_status",
    new_value: `${input.reply}${reason ? ` · ${reason}` : ""}`,
    user_id: userId,
    channel: "web",
  });

  if (input.reply === "declined") {
    const { data: me } = await supabaseAdmin.from("user_master").select("full_name").eq("id", userId).maybeSingle();
    await sendMeetEmail("Invite declined", {
      entityId: input.sessionId,
      sessionId: input.sessionId,
      meetingId: s.meeting_id,
      actorId: userId,
      link: `/meet/meetings/${s.meeting_id}?tab=members`,
      data: {
        person_name: me?.full_name || "Someone",
        reason,
        meeting_title: one((s as any).meeting)?.title || "",
        start_time: when(s.scheduled_start),
        session_code: s.code || "",
      },
    });
  }

  revalidatePath("/meet");
  revalidatePath("/meet/meetings");
  revalidatePath(`/meet/meetings/${s.meeting_id}`);
  revalidatePath(`/meet/sessions/${input.sessionId}`);
  return { success: true };
}

/** Meetings coming up that I haven't replied to yet (for Home). */
export async function getInvitesWaitingForMe(): Promise<{ session_id: string; meeting_id: string; title: string; start: string; organiser: string | null }[]> {
  const auth = await requireMeet("MEET_VIEW");
  const { data } = await supabaseAdmin
    .from("meet_session_attendees")
    .select("session_id, invite_status, session:meet_sessions!inner(id, scheduled_start, status, is_deleted, meeting:meet_meetings(id, title, organizer_id, organizer:user_master!meet_meetings_organizer_id_fkey(full_name)))")
    .eq("user_id", auth.userId)
    .eq("invite_status", "invited")
    .limit(100);
  const now = Date.now();
  return ((data || []) as any[])
    .map((r) => ({ r, s: one(r.session), m: one(one(r.session)?.meeting) }))
    .filter(({ s, m }) => s && !s.is_deleted && s.status === "scheduled" && new Date(s.scheduled_start).getTime() > now && m && m.organizer_id !== auth.userId)
    .sort((a, b) => String(a.s.scheduled_start).localeCompare(String(b.s.scheduled_start)))
    .slice(0, 10)
    .map(({ s, m }) => ({ session_id: s.id, meeting_id: m.id, title: m.title, start: s.scheduled_start, organiser: one(m.organizer)?.full_name || null }));
}
