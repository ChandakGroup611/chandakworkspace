import { supabaseAdmin } from "@/lib/supabase/service_role";
import { isActionLikeText } from "@/lib/utils/meet-notes";

/**
 * Microsoft Teams sync (Chandak Meet redesign, phase 3).
 * After a Teams meeting, pull who attended (attendance report) and the transcript straight from
 * Microsoft Graph. Attendance marks people present / late; transcript lines that sound like an
 * action or a decision go into the meeting notes, where the minutes review offers them as tasks.
 *
 * Needs the Azure app (AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET) to have the
 * application permissions OnlineMeetings.Read.All, OnlineMeetingArtifact.Read.All and
 * OnlineMeetingTranscript.Read.All with admin consent, plus a Teams application access policy.
 * Everything here is read-only towards Microsoft; nothing is changed in Teams.
 */

import { getAzureCredentials } from "@/lib/utils/meet-azure";

const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const GRAPH = "https://graph.microsoft.com/v1.0";
const DECISION_RE = /\b(decided|agreed|approved|finali[sz]ed|resolved that|we keep|will remain|no change|tay hua|final hai)\b/i;

const NEEDED = ["Calendars.ReadWrite", "OnlineMeetings.Read.All", "OnlineMeetingArtifact.Read.All", "OnlineMeetingTranscript.Read.All"];

async function graphToken(): Promise<{ token: string | null; roles: string[]; error?: string }> {
  const creds = await getAzureCredentials();
  if (!creds) return { token: null, roles: [], error: "not_configured" };
  const { tenantId, clientId, clientSecret } = creds;
  try {
    const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
        scope: "https://graph.microsoft.com/.default",
      }),
      cache: "no-store",
    });
    if (!res.ok) return { token: null, roles: [], error: "token_failed" };
    const data = await res.json();
    const token = data.access_token as string;
    let roles: string[] = [];
    try {
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
      roles = Array.isArray(payload.roles) ? payload.roles : [];
    } catch {}
    return { token, roles };
  } catch {
    return { token: null, roles: [], error: "token_failed" };
  }
}

async function graphGet(token: string, path: string, accept = "application/json") {
  const res = await fetch(`${GRAPH}${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: accept }, cache: "no-store" });
  return res;
}

export interface TeamsConnection {
  configured: boolean;
  signedIn: boolean;
  missing: string[];
  message: string;
}

/** Admin view: is the Teams connection ready for attendance and transcripts? */
export async function teamsConnectionStatus(): Promise<TeamsConnection> {
  const t = await graphToken();
  if (t.error === "not_configured")
    return { configured: false, signedIn: false, missing: NEEDED, message: "The Microsoft 365 app isn't set up on the server yet, so Teams links are plain links and nothing can be pulled back from Teams." };
  if (!t.token)
    return { configured: true, signedIn: false, missing: NEEDED, message: "The Microsoft 365 app is set up but couldn't sign in. The client secret may have expired." };
  const missing = NEEDED.filter((r) => !t.roles.includes(r));
  return {
    configured: true,
    signedIn: true,
    missing,
    message: missing.length
      ? "Connected to Microsoft 365. An admin still needs to grant a few permissions before attendance and transcripts can be pulled."
      : "Connected. Attendance and transcripts can be pulled from Teams after each meeting.",
  };
}

async function loadSessionForTeams(sessionId: string) {
  const { data } = await supabaseAdmin
    .from("meet_sessions")
    .select("id, status, scheduled_start, video_link, meeting:meet_meetings(id, video_link, organizer:user_master!meet_meetings_organizer_id_fkey(id, email))")
    .eq("id", sessionId)
    .eq("is_deleted", false)
    .maybeSingle();
  return data as any;
}

/** Finds the Teams online meeting behind a session's join link. */
async function findOnlineMeeting(sessionId: string): Promise<{ token?: string; organizer?: string; meetingId?: string; error?: string }> {
  const s = await loadSessionForTeams(sessionId);
  if (!s) return { error: "Meeting not found." };
  const m = one(s.meeting);
  const link: string = s.video_link || m?.video_link || "";
  const organizer: string | undefined = one(m?.organizer)?.email;
  if (!link) return { error: "This meeting has no Teams link." };
  if (/\/l\/meeting\/new|\/l\/call\//i.test(link))
    return { error: "This meeting's Teams link was a quick link, not a meeting created in Microsoft 365, so Teams has no attendance or transcript for it." };
  if (!organizer) return { error: "The organiser has no email address, so their Teams meeting can't be looked up." };

  const t = await graphToken();
  if (!t.token) return { error: t.error === "not_configured" ? "Teams isn't connected yet (Automations page shows what's needed)." : "Couldn't sign in to Microsoft 365." };

  const filter = encodeURIComponent(`JoinWebUrl eq '${link.replace(/'/g, "''")}'`);
  const res = await graphGet(t.token, `/users/${encodeURIComponent(organizer)}/onlineMeetings?$filter=${filter}`);
  if (res.status === 403) return { error: "Microsoft 365 refused: the app needs permission to read Teams meetings (see Automations page)." };
  if (!res.ok) return { error: `Teams didn't find this meeting (${res.status}).` };
  const data = await res.json();
  const meetingId = data?.value?.[0]?.id;
  if (!meetingId) return { error: "Teams didn't find a meeting with this link." };
  return { token: t.token, organizer, meetingId };
}

/** Pulls the Teams attendance report and marks people present / late. */
/** Pulls the Teams attendance report and marks people present / late. No permission check: callers check. */
export async function pullTeamsAttendance(sessionId: string, actorId: string | null): Promise<{ success: boolean; matched?: number; total?: number; error?: string }> {
  const auth = { userId: actorId };
  try {
    const f = await findOnlineMeeting(sessionId);
    if (f.error || !f.token) return { success: false, error: f.error };
    const base = `/users/${encodeURIComponent(f.organizer!)}/onlineMeetings/${f.meetingId}/attendanceReports`;
    const list = await graphGet(f.token, base);
    if (list.status === 403) return { success: false, error: "Microsoft 365 refused: the app needs the attendance report permission." };
    if (!list.ok) return { success: false, error: `Couldn't read the attendance report (${list.status}).` };
    const reports = ((await list.json())?.value || []).sort((a: any, b: any) => String(b.meetingStartDateTime).localeCompare(String(a.meetingStartDateTime)));
    if (!reports.length) return { success: false, error: "Teams has no attendance report yet. It appears a few minutes after the meeting ends." };

    const rep = await graphGet(f.token, `${base}/${reports[0].id}?$expand=attendanceRecords`);
    if (!rep.ok) return { success: false, error: `Couldn't read the attendance report (${rep.status}).` };
    const records: any[] = (await rep.json())?.attendanceRecords || [];

    const s = await loadSessionForTeams(sessionId);
    const startMs = new Date(s.scheduled_start).getTime();
    const { data: att } = await supabaseAdmin
      .from("meet_session_attendees")
      .select("id, role, guest_email, check_in_at, user:user_master!meet_session_attendees_user_id_fkey(email)")
      .eq("session_id", sessionId);

    let matched = 0;
    for (const a of att || []) {
      if (a.role === "requested" || a.role === "denied") continue;
      const email = String(one((a as any).user)?.email || a.guest_email || "").toLowerCase();
      if (!email) continue;
      const r = records.find((x) => String(x.emailAddress || "").toLowerCase() === email);
      if (!r) continue;
      const joins = (r.attendanceIntervals || []).map((i: any) => new Date(i.joinDateTime).getTime()).filter((n: number) => !isNaN(n));
      const firstJoin = joins.length ? Math.min(...joins) : null;
      const lateMin = firstJoin ? Math.max(0, Math.round((firstJoin - startMs) / 60000)) : 0;
      await supabaseAdmin
        .from("meet_session_attendees")
        .update({
          attendance: lateMin > 5 ? "late" : "present",
          late_minutes: lateMin > 5 ? lateMin : 0,
          check_in_at: a.check_in_at || (firstJoin ? new Date(firstJoin).toISOString() : new Date().toISOString()),
          check_in_method: "teams",
          marked_by: auth.userId,
        })
        .eq("id", a.id);
      matched++;
    }

    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "session",
      entity_id: sessionId,
      action: "teams_attendance_imported",
      new_value: `${matched} of ${records.length}`,
      user_id: auth.userId,
      channel: "web",
    });
    return { success: true, matched, total: records.length };
  } catch (err: any) {
    console.error("[importTeamsAttendance]", err);
    return { success: false, error: err?.message || "Couldn't import attendance." };
  }
}

function parseVtt(vtt: string): { speaker: string; text: string }[] {
  const out: { speaker: string; text: string }[] = [];
  for (const raw of vtt.split(/\r?\n/)) {
    const line = raw.trim();
    const m = line.match(/^<v\s+([^>]+)>(.*?)(<\/v>)?$/i);
    if (m) {
      const text = m[2].replace(/<[^>]+>/g, "").trim();
      if (text) out.push({ speaker: m[1].trim(), text });
    }
  }
  // join consecutive lines from the same speaker
  const merged: { speaker: string; text: string }[] = [];
  for (const l of out) {
    const last = merged[merged.length - 1];
    if (last && last.speaker === l.speaker && last.text.length < 400) last.text += " " + l.text;
    else merged.push({ ...l });
  }
  return merged;
}

/**
 * Pulls the Teams transcript and adds the lines that sound like an action or a decision to the
 * meeting notes (under a "From the Teams transcript" heading). The minutes review then offers
 * them as tasks and decisions to accept or discard.
 */
/** Pulls the Teams transcript into the meeting notes (action / decision lines). No permission check: callers check. */
export async function pullTeamsTranscript(sessionId: string, actorId: string | null): Promise<{ success: boolean; added?: number; lines?: number; error?: string }> {
  const auth = { userId: actorId };
  try {
    const s = await loadSessionForTeams(sessionId);
    if (s?.status === "mom_published" || s?.status === "published") return { success: false, error: "The minutes are already sent, so the notes are locked." };

    const f = await findOnlineMeeting(sessionId);
    if (f.error || !f.token) return { success: false, error: f.error };
    const base = `/users/${encodeURIComponent(f.organizer!)}/onlineMeetings/${f.meetingId}/transcripts`;
    const list = await graphGet(f.token, base);
    if (list.status === 403) return { success: false, error: "Microsoft 365 refused: the app needs the transcript permission." };
    if (!list.ok) return { success: false, error: `Couldn't read transcripts (${list.status}).` };
    const items = ((await list.json())?.value || []).sort((a: any, b: any) => String(b.createdDateTime).localeCompare(String(a.createdDateTime)));
    if (!items.length) return { success: false, error: "No transcript in Teams. Transcription has to be turned on during the meeting." };

    const content = await graphGet(f.token, `${base}/${items[0].id}/content?$format=text/vtt`, "text/vtt");
    if (!content.ok) return { success: false, error: `Couldn't download the transcript (${content.status}).` };
    const lines = parseVtt(await content.text());
    const picked = lines.filter((l) => isActionLikeText(l.text) || DECISION_RE.test(l.text)).slice(0, 60);

    // The session's shared notes (create them if this meeting has none yet)
    let { data: note } = await supabaseAdmin.from("meet_notes").select("id").eq("session_id", sessionId).eq("kind", "session").maybeSingle();
    if (!note) {
      const m = one(s?.meeting);
      const ins = await supabaseAdmin
        .from("meet_notes")
        .insert({ kind: "session", session_id: sessionId, meeting_id: m?.id || null, owner_id: auth.userId || one(one(s?.meeting)?.organizer)?.id || null, title: "Meeting notes", visibility: "meeting", pinned: false })
        .select("id")
        .single();
      note = ins.data;
    }
    if (!note) return { success: false, error: "Couldn't open the meeting notes." };

    // Don't add the same transcript twice
    const { data: existing } = await supabaseAdmin.from("meet_note_blocks").select("text, position").eq("note_id", note.id).is("deleted_at", null);
    const have = new Set((existing || []).map((b: any) => String(b.text)));
    let pos = Math.max(-1, ...(existing || []).map((b: any) => Number(b.position) || 0)) + 1;

    const heading = "From the Teams transcript";
    const rows: any[] = [];
    if (!have.has(heading)) rows.push({ note_id: note.id, position: pos++, type: "heading", text: heading, author_id: auth.userId, done: false, not_action: false });
    for (const l of picked) {
      const text = `${l.speaker}: ${l.text}`.slice(0, 1000);
      if (have.has(text)) continue;
      rows.push({ note_id: note.id, position: pos++, type: "text", text, author_id: auth.userId, done: false, not_action: false });
    }
    const added = rows.filter((r) => r.type !== "heading").length;
    if (rows.length) {
      const { error } = await supabaseAdmin.from("meet_note_blocks").insert(rows);
      if (error) return { success: false, error: error.message };
    }

    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "session",
      entity_id: sessionId,
      action: "teams_transcript_imported",
      new_value: `${added} of ${lines.length} lines`,
      user_id: auth.userId,
      channel: "web",
    });
    return { success: true, added, lines: lines.length };
  } catch (err: any) {
    console.error("[importTeamsTranscript]", err);
    return { success: false, error: err?.message || "Couldn't import the transcript." };
  }
}
