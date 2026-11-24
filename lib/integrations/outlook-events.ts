import { supabaseAdmin } from "@/lib/supabase/service_role";

/**
 * Chandak Meet ⇄ Outlook / Teams (Microsoft Graph, app-only).
 *
 * Each Chandak Meet session becomes one event in the organiser's Outlook calendar with Teams on
 * and the room (if any) added as a resource. Microsoft creates the real Teams link; the room
 * mailbox accepts or declines on its own; attendees see it in Outlook and Teams.
 *
 * Where things are kept (no new columns):
 *  - the Outlook event id: meet_activity_log (entity "session", action "outlook_event", new_value = id)
 *    and, when there is a room, meet_room_bookings.external_event_id / ical_uid / teams_join_url
 *  - the Teams join link: meet_sessions.video_link
 *  - the room's answer: meet_room_bookings.status pending → confirmed / declined
 *
 * Needs AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET on the server and the application
 * permission Calendars.ReadWrite with admin consent. Without them every function returns
 * { skipped: "not_configured" } and Chandak Meet works as before. Nothing here ever blocks saving.
 */

const GRAPH = "https://graph.microsoft.com/v1.0";
const IST_ZONE = "India Standard Time";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://chandakgroup.tech";
const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export type OutlookResult = { ok: boolean; skipped?: string; error?: string; eventId?: string; joinUrl?: string };

let cached: { token: string; exp: number } | null = null;

async function appToken(): Promise<string | null> {
  const tenant = process.env.AZURE_TENANT_ID || process.env.MICROSOFT_TENANT_ID;
  const client = process.env.AZURE_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID;
  const secret = process.env.AZURE_CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET;
  if (!tenant || !client || !secret) return null;
  if (cached && cached.exp > Date.now() + 60000) return cached.token;
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: client, client_secret: secret, grant_type: "client_credentials", scope: "https://graph.microsoft.com/.default" }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Microsoft sign-in failed (${res.status})`);
  const j = await res.json();
  cached = { token: j.access_token, exp: Date.now() + (Number(j.expires_in) || 3000) * 1000 };
  return cached.token;
}

export function outlookConfigured(): boolean {
  return !!(
    (process.env.AZURE_TENANT_ID || process.env.MICROSOFT_TENANT_ID) &&
    (process.env.AZURE_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID) &&
    (process.env.AZURE_CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET)
  );
}

async function graph(token: string, method: string, path: string, body?: any): Promise<{ status: number; data: any }> {
  const res = await fetch(`${GRAPH}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: `outlook.timezone="${IST_ZONE}"` },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  let data: any = null;
  try {
    data = res.status === 204 || res.status === 202 ? null : await res.json();
  } catch {}
  return { status: res.status, data };
}

/** "2026-11-30T15:00:00" in IST for Graph's dateTime + timeZone pair. */
function istLocal(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const g = (t: string) => parts.find((p) => p.type === t)?.value || "00";
  const hh = g("hour") === "24" ? "00" : g("hour");
  return `${g("year")}-${g("month")}-${g("day")}T${hh}:${g("minute")}:${g("second")}`;
}

const esc = (s: string) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Plain Teams links (not a real meeting) can be replaced by the real one. */
const isPlainTeamsLink = (url?: string | null) => !url || /teams\.microsoft\.com\/l\/(meeting\/new|call\/)/i.test(url);

/**
 * Whether attendees get Microsoft's own calendar invite (puts the meeting in their Outlook and
 * Teams calendars). On unless MEET_OUTLOOK_INVITES=false; with it off the Outlook event holds only
 * the organiser and the room, and attendees get just the admin's "Meeting created" email.
 */
async function sendOutlookInvites(): Promise<boolean> {
  return String(process.env.MEET_OUTLOOK_INVITES || "true").toLowerCase() !== "false";
}

async function loadSession(sessionId: string) {
  const { data } = await supabaseAdmin
    .from("meet_sessions")
    .select(
      `id, code, status, scheduled_start, scheduled_end, video_link, room_id, meeting_id,
       meeting:meet_meetings(id, title, code, description, video_link, mode, organizer:user_master!meet_meetings_organizer_id_fkey(id, email, full_name)),
       room:meet_rooms(id, name, location, m365_email)`
    )
    .eq("id", sessionId)
    .maybeSingle();
  return data as any;
}

export async function getStoredEventId(sessionId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("meet_activity_log")
    .select("new_value")
    .eq("entity_type", "session")
    .eq("entity_id", sessionId)
    .eq("action", "outlook_event")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data as any)?.new_value as string) || null;
}

async function buildEvent(s: any, invites: boolean) {
  const m = one(s.meeting);
  const room = one(s.room);
  const [{ data: att }, { data: agenda }] = await Promise.all([
    supabaseAdmin
      .from("meet_session_attendees")
      .select("role, invite_status, guest_email, guest_name, user:user_master!meet_session_attendees_user_id_fkey(email, full_name)")
      .eq("session_id", s.id),
    supabaseAdmin.from("meet_agenda_items").select("title, planned_minutes, sort_order").eq("session_id", s.id).order("sort_order", { ascending: true }),
  ]);
  const organiserEmail = String(one(m?.organizer)?.email || "").toLowerCase();
  const people = new Map<string, string>();
  if (invites) {
    for (const a of att || []) {
      if ((a as any).role === "requested" || (a as any).role === "denied") continue;
      const u = one((a as any).user);
      const email = String(u?.email || (a as any).guest_email || "").trim().toLowerCase();
      if (email && email !== organiserEmail && /@/.test(email)) people.set(email, u?.full_name || (a as any).guest_name || email);
    }
  }
  const attendees: any[] = Array.from(people.entries()).map(([address, name]) => ({ emailAddress: { address, name }, type: "required" }));
  const roomEmail = room?.m365_email ? String(room.m365_email).trim() : "";
  if (roomEmail) attendees.push({ emailAddress: { address: roomEmail, name: room.name }, type: "resource" });

  const wantsTeams = (m?.mode || "online") !== "in_person";
  const ownLink = !isPlainTeamsLink(s.video_link || m?.video_link) ? s.video_link || m?.video_link : null;
  const agendaHtml = (agenda || []).length
    ? `<p><b>Agenda</b></p><ol>${(agenda || []).map((a: any) => `<li>${esc(a.title)}${a.planned_minutes ? ` (${a.planned_minutes} min)` : ""}</li>`).join("")}</ol>`
    : "";
  const end = s.scheduled_end || new Date(new Date(s.scheduled_start).getTime() + 3600000).toISOString();

  return {
    organiserEmail,
    roomEmail,
    body: {
      subject: m?.title || "Meeting",
      body: {
        contentType: "HTML",
        content: `${m?.description ? `<p>${esc(m.description)}</p>` : ""}${agendaHtml}${ownLink ? `<p>Join: <a href="${esc(ownLink)}">${esc(ownLink)}</a></p>` : ""}<p>Points, notes and minutes: <a href="${SITE_URL}/meet/join/${s.id}">open in Chandak Meet</a> (${esc(s.code || m?.code || "")})</p>`,
      },
      start: { dateTime: istLocal(s.scheduled_start), timeZone: IST_ZONE },
      end: { dateTime: istLocal(end), timeZone: IST_ZONE },
      location: room ? { displayName: [room.name, room.location].filter(Boolean).join(", "), ...(roomEmail ? { locationEmailAddress: roomEmail } : {}) } : undefined,
      attendees,
      isOnlineMeeting: wantsTeams && !ownLink,
      ...(wantsTeams && !ownLink ? { onlineMeetingProvider: "teamsForBusiness" } : {}),
      allowNewTimeProposals: false,
      responseRequested: true,
    },
  };
}

async function saveResult(s: any, ev: any, roomEmail: string) {
  const joinUrl: string | null = ev?.onlineMeeting?.joinUrl || null;
  const now = new Date().toISOString();
  if (joinUrl && isPlainTeamsLink(s.video_link)) {
    await supabaseAdmin.from("meet_sessions").update({ video_link: joinUrl, updated_at: now }).eq("id", s.id);
  }
  if (s.room_id) {
    const patch = {
      external_event_id: ev.id,
      ical_uid: ev.iCalUId || null,
      teams_join_url: joinUrl || s.video_link || null,
      status: roomEmail ? "pending" : "confirmed",
      last_synced_at: now,
      sync_error: null,
      updated_at: now,
    };
    const { data: b } = await supabaseAdmin.from("meet_room_bookings").select("id").eq("session_id", s.id).maybeSingle();
    if (b) await supabaseAdmin.from("meet_room_bookings").update(patch).eq("id", (b as any).id);
    else
      await supabaseAdmin.from("meet_room_bookings").insert({
        session_id: s.id,
        room_id: s.room_id,
        start_at: s.scheduled_start,
        end_at: s.scheduled_end || new Date(new Date(s.scheduled_start).getTime() + 3600000).toISOString(),
        booked_by: one(one(s.meeting)?.organizer)?.id || null,
        ...patch,
      });
  }
  return joinUrl;
}

async function noteError(sessionId: string, roomId: string | null, message: string) {
  await supabaseAdmin.from("meet_activity_log").insert({
    entity_type: "session",
    entity_id: sessionId,
    action: "outlook_sync_failed",
    new_value: message.slice(0, 500),
    channel: "system",
  });
  if (roomId) await supabaseAdmin.from("meet_room_bookings").update({ sync_error: message.slice(0, 500), updated_at: new Date().toISOString() }).eq("session_id", sessionId);
}

/** Creates the Outlook / Teams event for a session (once), or updates it if it already exists. */
export async function syncSessionEvent(sessionId: string): Promise<OutlookResult> {
  if (!outlookConfigured()) return { ok: false, skipped: "not_configured" };
  const s = await loadSession(sessionId);
  if (!s) return { ok: false, error: "Session not found" };
  if (s.status === "cancelled") return cancelSessionEvent(sessionId);
  try {
    const token = await appToken();
    if (!token) return { ok: false, skipped: "not_configured" };
    const built = await buildEvent(s, await sendOutlookInvites());
    if (!built.organiserEmail) return { ok: false, error: "The organiser has no email address" };
    const mailbox = encodeURIComponent(built.organiserEmail);

    const existing = await getStoredEventId(sessionId);
    if (existing) {
      const r = await graph(token, "PATCH", `/users/${mailbox}/events/${encodeURIComponent(existing)}`, built.body);
      if (r.status >= 200 && r.status < 300) {
        const joinUrl = await saveResult(s, r.data || { id: existing }, built.roomEmail);
        return { ok: true, eventId: existing, joinUrl: joinUrl || undefined };
      }
      if (r.status !== 404) {
        const msg = r.data?.error?.message || `Outlook update failed (${r.status})`;
        await noteError(sessionId, s.room_id, msg);
        return { ok: false, error: msg };
      }
      // Deleted in Outlook: create a fresh one below
    }

    const r = await graph(token, "POST", `/users/${mailbox}/events`, { ...built.body, transactionId: sessionId });
    if (r.status < 200 || r.status >= 300) {
      const msg =
        r.status === 403
          ? "Microsoft 365 refused: the app needs the Calendars.ReadWrite permission and access to this mailbox"
          : r.data?.error?.message || `Outlook create failed (${r.status})`;
      await noteError(sessionId, s.room_id, msg);
      return { ok: false, error: msg };
    }
    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "session",
      entity_id: sessionId,
      action: "outlook_event",
      new_value: r.data.id,
      channel: "system",
    });
    const joinUrl = await saveResult(s, r.data, built.roomEmail);
    return { ok: true, eventId: r.data.id, joinUrl: joinUrl || undefined };
  } catch (err: any) {
    const msg = err?.message || "Outlook sync failed";
    await noteError(sessionId, s.room_id, msg);
    return { ok: false, error: msg };
  }
}

/** Cancels the Outlook event (attendees are told by Outlook; the room is freed). */
export async function cancelSessionEvent(sessionId: string, comment?: string): Promise<OutlookResult> {
  if (!outlookConfigured()) return { ok: false, skipped: "not_configured" };
  const eventId = await getStoredEventId(sessionId);
  if (!eventId) return { ok: true, skipped: "no_event" };
  try {
    const s = await loadSession(sessionId);
    const email = one(one(s?.meeting)?.organizer)?.email;
    const token = await appToken();
    if (!token || !email) return { ok: false, skipped: "not_configured" };
    const r = await graph(token, "POST", `/users/${encodeURIComponent(email)}/events/${encodeURIComponent(eventId)}/cancel`, {
      comment: comment || "This meeting has been cancelled in Chandak Meet.",
    });
    if (r.status >= 300 && r.status !== 404) return { ok: false, error: r.data?.error?.message || `Outlook cancel failed (${r.status})` };
    await supabaseAdmin
      .from("meet_room_bookings")
      .update({ status: "cancelled", last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("session_id", sessionId);
    return { ok: true, eventId };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Outlook cancel failed" };
  }
}

/** Reads the room's answer for one booking: accepted → confirmed, declined → declined. */
export async function readRoomResponse(sessionId: string): Promise<"accepted" | "declined" | "pending" | null> {
  if (!outlookConfigured()) return null;
  const s = await loadSession(sessionId);
  const room = one(s?.room);
  const email = one(one(s?.meeting)?.organizer)?.email;
  const eventId = await getStoredEventId(sessionId);
  if (!s || !room?.m365_email || !email || !eventId) return null;
  const token = await appToken();
  if (!token) return null;
  const r = await graph(token, "GET", `/users/${encodeURIComponent(email)}/events/${encodeURIComponent(eventId)}?$select=attendees`);
  if (r.status !== 200) return null;
  const a = (r.data?.attendees || []).find((x: any) => String(x?.emailAddress?.address || "").toLowerCase() === String(room.m365_email).toLowerCase());
  const resp = String(a?.status?.response || "").toLowerCase();
  if (resp === "accepted" || resp === "tentativelyaccepted") return "accepted";
  if (resp === "declined") return "declined";
  return "pending";
}
