import { supabaseAdmin } from "@/lib/supabase/service_role";
import { todayIST } from "@/lib/utils/date-utils";
import { sendMeetEmail } from "@/lib/utils/meet-email";
import { outlookConfigured, syncSessionEvent, readRoomResponse } from "@/lib/integrations/outlook-events";
import { teamsConnectionStatus, pullTeamsAttendance, pullTeamsTranscript } from "@/lib/integrations/teams-artifacts";
import { readMeetSwitches } from "@/lib/utils/meet-switches";
import { REMINDER_EVENTS, parseReminderTrigger, reminderTrigger } from "@/lib/utils/meet-email-config";

/**
 * Chandak Meet scheduled jobs. Invoked by /api/cron/meet-jobs (CRON_SECRET), every 5–15 min.
 * Every step is idempotent: re-running never sends a reminder twice or opens a second SLA record.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://chandakgroup.tech";
const NO_SHOW_GRACE_MIN = 10;

const fmtIST = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

const one = <T,>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : v ?? undefined);

export interface MeetJobsResult {
  reminders: number;
  roomsReleased: number;
  slaOpened: number;
  slaClosed: number;
  updateRequests: number;
  outlookCreated: number;
  teamsPulled: number;
  roomAnswers: number;
  minutesReminders: number;
  errors: string[];
}

export async function runMeetJobs(now = new Date()): Promise<MeetJobsResult> {
  const result: MeetJobsResult = {
    reminders: 0,
    roomsReleased: 0,
    slaOpened: 0,
    slaClosed: 0,
    updateRequests: 0,
    outlookCreated: 0,
    teamsPulled: 0,
    roomAnswers: 0,
    minutesReminders: 0,
    errors: [],
  };

  const step = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e: any) {
      console.error(`[Meet Jobs] ${name} failed:`, e);
      result.errors.push(`${name}: ${e?.message || e}`);
    }
  };

  await step("reminders", async () => {
    result.reminders = await sendConfiguredReminders(now);
  });
  await step("room-no-show", async () => {
    result.roomsReleased = await releaseNoShowRooms(now);
  });
  await step("sla-overdue", async () => {
    const r = await syncOverdueSla(now);
    result.slaOpened = r.opened;
    result.slaClosed = r.closed;
  });

  await step("owner-update-requests", async () => {
    result.updateRequests = await sendOwnerUpdateRequests(now);
  });
  await step("outlook-sync", async () => {
    const r = await syncOutlook(now);
    result.outlookCreated = r.created;
    result.roomAnswers = r.answers;
  });
  await step("teams-auto-pull", async () => {
    result.teamsPulled = await autoPullTeams(now);
  });
  await step("minutes-reminders", async () => {
    result.minutesReminders = await sendMinutesReminders(now);
  });

  return result;
}

/**
 * Outlook / Teams (no-op until Microsoft 365 is connected):
 *  1. sessions in the next 30 days that aren't in Outlook yet get their event (at most 10 a run,
 *     and not again within 6 hours of a failure);
 *  2. rooms that haven't answered are checked; a decline marks the booking and emails the
 *     organiser through the admin's "Room declined" template.
 */
async function syncOutlook(now: Date): Promise<{ created: number; answers: number }> {
  if (!outlookConfigured()) return { created: 0, answers: 0 };
  let created = 0;
  let answers = 0;

  const { data: upcoming } = await supabaseAdmin
    .from("meet_sessions")
    .select("id")
    .eq("status", "scheduled")
    .eq("is_deleted", false)
    .gt("scheduled_start", now.toISOString())
    .lte("scheduled_start", new Date(now.getTime() + 30 * 24 * 3600000).toISOString())
    .order("scheduled_start", { ascending: true })
    .limit(200);
  const ids = (upcoming || []).map((s: any) => s.id);
  if (ids.length) {
    const since = new Date(now.getTime() - 6 * 3600000).toISOString();
    const { data: logs } = await supabaseAdmin
      .from("meet_activity_log")
      .select("entity_id, action, created_at")
      .eq("entity_type", "session")
      .in("entity_id", ids)
      .in("action", ["outlook_event", "outlook_sync_failed"]);
    const done = new Set((logs || []).filter((l: any) => l.action === "outlook_event").map((l: any) => l.entity_id));
    const recentFail = new Set((logs || []).filter((l: any) => l.action === "outlook_sync_failed" && l.created_at > since).map((l: any) => l.entity_id));
    for (const id of ids.filter((i: string) => !done.has(i) && !recentFail.has(i)).slice(0, 10)) {
      const r = await syncSessionEvent(id);
      if (r.ok) created++;
    }
  }

  const { data: pending } = await supabaseAdmin
    .from("meet_room_bookings")
    .select("id, session_id, start_at, room:meet_rooms(name), session:meet_sessions(meeting:meet_meetings(title))")
    .eq("status", "pending")
    .not("external_event_id", "is", null)
    .gt("end_at", now.toISOString())
    .limit(50);
  for (const b of pending || []) {
    const resp = await readRoomResponse((b as any).session_id);
    if (resp === "accepted" || resp === "declined") {
      await supabaseAdmin
        .from("meet_room_bookings")
        .update({ status: resp === "accepted" ? "confirmed" : "declined", last_synced_at: now.toISOString(), updated_at: now.toISOString() })
        .eq("id", (b as any).id);
      answers++;
      if (resp === "declined") {
        const room: any = one((b as any).room);
        await sendMeetEmail("Room declined", {
          entityId: (b as any).session_id,
          sessionId: (b as any).session_id,
          link: `/meet/sessions/${(b as any).session_id}`,
          data: {
            room: room?.name || "",
            meeting_title: one(one((b as any).session)?.meeting)?.title || "",
            start_time: `${fmtIST((b as any).start_at)} IST`,
            link: `${SITE_URL}/meet/sessions/${(b as any).session_id}`,
          },
        });
      }
    }
  }
  return { created, answers };
}

/**
 * Optional (Automations switches, off by default): after a Teams meeting ends, pull attendance and
 * transcript action lines. Tried each round from 20 minutes after the end for 24 hours, until it
 * works once; skipped entirely while the Microsoft permissions are missing.
 */
async function autoPullTeams(now: Date): Promise<number> {
  const sw = await readMeetSwitches();
  if (!sw.teams_auto_attendance && !sw.teams_auto_transcript) return 0;
  const conn = await teamsConnectionStatus();
  if (!conn.signedIn) return 0;
  const { data: sessions } = await supabaseAdmin
    .from("meet_sessions")
    .select("id, video_link, scheduled_end, actual_end, status")
    .in("status", ["completed", "mom_draft"])
    .eq("is_deleted", false)
    .lte("scheduled_end", new Date(now.getTime() - 20 * 60000).toISOString())
    .gte("scheduled_end", new Date(now.getTime() - 24 * 3600000).toISOString())
    .limit(20);
  let n = 0;
  for (const s of sessions || []) {
    if (!/teams\.microsoft\.com\/l\/meetup-join/i.test(String((s as any).video_link || ""))) continue;
    const { data: logs } = await supabaseAdmin
      .from("meet_activity_log")
      .select("action")
      .eq("entity_type", "session")
      .eq("entity_id", s.id)
      .in("action", ["teams_attendance_imported", "teams_transcript_imported"]);
    const done = new Set((logs || []).map((l: any) => l.action));
    if (sw.teams_auto_attendance && !done.has("teams_attendance_imported")) {
      const r = await pullTeamsAttendance(s.id, null);
      if (r.success) n++;
    }
    if (sw.teams_auto_transcript && !done.has("teams_transcript_imported")) {
      const r = await pullTeamsTranscript(s.id, null);
      if (r.success) n++;
    }
  }
  return n;
}

/**
 * Claims a one-time job for a session by writing an activity-log row first. Returns false if
 * that job was already done for the session, so a re-run never sends twice.
 */
async function claimSessionJob(sessionId: string, action: string): Promise<boolean> {
  const { data: done } = await supabaseAdmin
    .from("meet_activity_log")
    .select("id")
    .eq("entity_type", "session")
    .eq("entity_id", sessionId)
    .eq("action", action)
    .limit(1)
    .maybeSingle();
  if (done) return false;
  const { error } = await supabaseAdmin.from("meet_activity_log").insert({
    entity_type: "session",
    entity_id: sessionId,
    action,
    channel: "system",
  });
  return !error;
}

/**
 * About a day before a meeting (when the series asks for it), email each owner of an open point
 * a link to send a short update, so the meeting starts from fresh status instead of a round-robin.
 */
async function sendOwnerUpdateRequests(now: Date): Promise<number> {
  const from = new Date(now.getTime() + 20 * 3600000).toISOString();
  const to = new Date(now.getTime() + 26 * 3600000).toISOString();
  const { data: sessions, error } = await supabaseAdmin
    .from("meet_sessions")
    .select("id, code, scheduled_start, meeting_id, meeting:meet_meetings(title, pre_update_enabled, is_deleted)")
    .eq("status", "scheduled")
    .eq("is_deleted", false)
    .gt("scheduled_start", from)
    .lte("scheduled_start", to);
  if (error) throw error;

  let sent = 0;
  for (const s of sessions || []) {
    const meeting: any = one(s.meeting as any);
    if (!meeting || meeting.is_deleted || meeting.pre_update_enabled === false) continue;

    const { data: points } = await supabaseAdmin
      .from("meet_points")
      .select("id, code, title, due_date, owner:user_master!meet_points_owner_id_fkey(id, email, full_name)")
      .eq("meeting_id", s.meeting_id)
      .eq("is_deleted", false)
      .not("status", "in", '("closed","dropped")')
      .limit(300);
    if (!points || points.length === 0) continue;
    if (!(await claimSessionJob(s.id, "owner_update_requests_sent"))) continue;

    const { data: already } = await supabaseAdmin.from("meet_pre_updates").select("user_id, point_id").eq("session_id", s.id);
    const have = new Set((already || []).map((r: any) => `${r.user_id}:${r.point_id}`));

    const byOwner = new Map<string, { email: string; name: string; points: any[] }>();
    for (const p of points as any[]) {
      const o: any = one(p.owner);
      if (!o?.email || have.has(`${o.id}:${p.id}`)) continue;
      if (!byOwner.has(o.id)) byOwner.set(o.id, { email: o.email, name: o.full_name || "Colleague", points: [] });
      byOwner.get(o.id)!.points.push(p);
    }

    for (const [ownerId, o] of byOwner.entries()) {
      await sendMeetEmail("Update requested", {
        entityId: s.id,
        sessionId: s.id,
        recipients: { "Point owner": [ownerId] },
        link: `/meet/tasks?show=mine`,
        data: {
          meeting_title: meeting.title,
          session_code: s.code,
          start_time: `${fmtIST(s.scheduled_start)} IST`,
          points_list: o.points
            .slice(0, 20)
            .map((p: any) => `${p.code} ${p.title}${p.due_date ? ` (due ${p.due_date})` : ""}: ${SITE_URL}/meet/points/${p.id}#send-update`)
            .join("\n"),
          link: `${SITE_URL}/meet/tasks?show=mine`,
        },
      });
      sent++;
    }
  }
  return sent;
}

/**
 * Three hours after a meeting ends, if the minutes still haven't gone out, remind the organiser
 * and the minute taker once, with a link straight to the review screen.
 */
async function sendMinutesReminders(now: Date): Promise<number> {
  const olderThan = new Date(now.getTime() - 3 * 3600000).toISOString();
  const notBefore = new Date(now.getTime() - 3 * 24 * 3600000).toISOString();
  const { data: sessions, error } = await supabaseAdmin
    .from("meet_sessions")
    .select(
      `id, code, actual_end, scheduled_end, minute_taker_id,
       meeting:meet_meetings(title, is_deleted, organizer_id, organizer:user_master!meet_meetings_organizer_id_fkey(id, email, full_name))`
    )
    .in("status", ["completed", "mom_draft"])
    .eq("is_deleted", false)
    .lte("scheduled_end", olderThan)
    .gte("scheduled_end", notBefore);
  if (error) throw error;

  let sent = 0;
  for (const s of sessions || []) {
    const ended = (s as any).actual_end || (s as any).scheduled_end;
    if (ended && ended > olderThan) continue;
    const meeting: any = one((s as any).meeting);
    if (!meeting || meeting.is_deleted) continue;
    if (!(await claimSessionJob(s.id, "minutes_reminder_sent"))) continue;

    await sendMeetEmail("Minutes not sent", {
      entityId: s.id,
      sessionId: s.id,
      link: `/meet/sessions/${s.id}/review`,
      data: { meeting_title: meeting.title, session_code: s.code, link: `${SITE_URL}/meet/sessions/${s.id}/review` },
    });
    sent++;
  }
  return sent;
}

/**
 * Reminders the admin set up: each active Meet rule for "Reminder 1/2/3" carries its timing
 * ("BEFORE:<minutes>"). A reminder goes out once per meeting, in the hour after its time comes,
 * and only while the meeting is still ahead (a meeting booked at short notice skips the ones
 * whose time had already passed).
 */
async function sendConfiguredReminders(now: Date): Promise<number> {
  const { data: rules, error } = await supabaseAdmin
    .from("notification_rules")
    .select("event, status_trigger, is_active")
    .ilike("module", "meet")
    .eq("is_active", true)
    .in("event", REMINDER_EVENTS as string[]);
  if (error) throw error;

  let sent = 0;
  for (const rule of rules || []) {
    const minutes = parseReminderTrigger((rule as any).status_trigger);
    if (!minutes) continue;
    const latest = new Date(now.getTime() + minutes * 60000);
    const earliest = new Date(Math.max(now.getTime(), latest.getTime() - 60 * 60000));
    const { data: sessions, error: sErr } = await supabaseAdmin
      .from("meet_sessions")
      .select("id, code, scheduled_start, video_link, meeting:meet_meetings(title, code, video_link, is_deleted), room:meet_rooms(name, location)")
      .eq("status", "scheduled")
      .eq("is_deleted", false)
      .gt("scheduled_start", earliest.toISOString())
      .lte("scheduled_start", latest.toISOString());
    if (sErr) throw sErr;

    for (const s of sessions || []) {
      const meeting: any = one((s as any).meeting);
      if (!meeting || meeting.is_deleted) continue;
      if (!(await claimSessionJob(s.id, `reminder:${(rule as any).event}:${minutes}`))) continue;
      const room: any = one((s as any).room);
      await sendMeetEmail((rule as any).event, {
        entityId: s.id,
        sessionId: s.id,
        trigger: reminderTrigger(minutes),
        link: `/meet/join/${s.id}`,
        data: {
          meeting_title: meeting.title,
          meeting_code: meeting.code,
          session_code: (s as any).code,
          start_time: `${fmtIST((s as any).scheduled_start)} IST`,
          room: [room?.name, room?.location].filter(Boolean).join(", "),
          join_link: (s as any).video_link || meeting.video_link || "",
          link: `${SITE_URL}/meet/join/${s.id}`,
        },
      });
      sent++;
    }
  }
  return sent;
}

/** Release confirmed room bookings nobody checked in to within the grace period. */
async function releaseNoShowRooms(now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - NO_SHOW_GRACE_MIN * 60000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("meet_room_bookings")
    .update({ status: "released", released_at: now.toISOString(), updated_at: now.toISOString() })
    .eq("status", "confirmed")
    .lte("start_at", cutoff)
    .gt("end_at", now.toISOString())
    .select("id");
  if (error) throw error;
  return data?.length || 0;
}

/**
 * Open a breached SLA record (and notify owner + chair) for each overdue open task/point,
 * and close records whose item is now done.
 */
async function syncOverdueSla(now: Date): Promise<{ opened: number; closed: number }> {
  const today = todayIST();

  const [tasksRes, pointsRes, openRes] = await Promise.all([
    supabaseAdmin
      .from("meet_tasks")
      .select(
        `id, code, title, due_date, revised_due_date, status, owner_id,
         owner:user_master!meet_tasks_owner_id_fkey(email, full_name),
         point:meet_points(meeting:meet_meetings(id, title, chair_id, organizer_id, is_deleted))`
      )
      .eq("is_deleted", false)
      .not("status", "in", '("completed","cancelled")'),
    supabaseAdmin
      .from("meet_points")
      .select(
        `id, code, title, due_date, status, owner_id,
         owner:user_master!meet_points_owner_id_fkey(email, full_name),
         meeting:meet_meetings(id, title, chair_id, organizer_id, is_deleted)`
      )
      .eq("is_deleted", false)
      .not("status", "in", '("closed","dropped")')
      .lt("due_date", today),
    supabaseAdmin
      .from("meet_sla_instances")
      .select("id, item_type, item_id")
      .in("item_type", ["task", "point"])
      .neq("state", "met"),
  ]);
  if (tasksRes.error) throw tasksRes.error;
  if (pointsRes.error) throw pointsRes.error;
  if (openRes.error) throw openRes.error;

  type Item = {
    type: "task" | "point";
    id: string;
    code: string;
    title: string;
    due: string;
    ownerId?: string | null;
    owner?: { email?: string; full_name?: string };
    meeting?: { id: string; title: string; chair_id?: string; organizer_id?: string; is_deleted?: boolean };
  };

  const overdue: Item[] = [];
  for (const t of (tasksRes.data || []) as any[]) {
    const due = t.revised_due_date || t.due_date;
    if (!due || due >= today) continue;
    overdue.push({
      type: "task",
      id: t.id,
      code: t.code,
      title: t.title,
      due,
      ownerId: t.owner_id || null,
      owner: one(t.owner),
      meeting: one(one<any>(t.point)?.meeting),
    });
  }
  for (const p of (pointsRes.data || []) as any[]) {
    overdue.push({
      type: "point",
      id: p.id,
      code: p.code,
      title: p.title,
      due: p.due_date,
      ownerId: p.owner_id || null,
      owner: one(p.owner),
      meeting: one(p.meeting),
    });
  }

  const openKey = new Set((openRes.data || []).map((i: any) => `${i.item_type}:${i.item_id}`));
  const overdueKey = new Set(overdue.map((i) => `${i.type}:${i.id}`));

  // Close SLA records for items no longer overdue (done, re-dated, or deleted)
  const toClose = (openRes.data || []).filter((i: any) => !overdueKey.has(`${i.item_type}:${i.item_id}`)).map((i: any) => i.id);
  if (toClose.length > 0) {
    const { error } = await supabaseAdmin
      .from("meet_sla_instances")
      .update({ state: "met", updated_at: now.toISOString() })
      .in("id", toClose);
    if (error) throw error;
  }

  const fresh = overdue.filter((i) => !openKey.has(`${i.type}:${i.id}`) && !i.meeting?.is_deleted);
  if (fresh.length === 0) return { opened: 0, closed: toClose.length };

  const escalateTo = (i: Item) => i.meeting?.chair_id || i.meeting?.organizer_id || null;

  // Per-row insert: the partial unique index rejects a second open record (23505) if runs overlap.
  const created = new Set<string>();
  for (const i of fresh) {
    const { error: insErr } = await supabaseAdmin.from("meet_sla_instances").insert({
      item_type: i.type,
      item_id: i.id,
      start_at: now.toISOString(),
      due_at: new Date(`${i.due}T23:59:59+05:30`).toISOString(),
      state: "breached",
      current_level: 1,
      escalated_to_id: escalateTo(i),
      escalated_at: now.toISOString(),
    });
    if (!insErr) created.add(`${i.type}:${i.id}`);
    else if (insErr.code !== "23505") throw insErr;
  }

  // Notify only for records this run actually created (through the admin's "Overdue" template)
  for (const i of fresh) {
    if (!created.has(`${i.type}:${i.id}`)) continue;
    await sendMeetEmail("Overdue", {
      entityId: i.id,
      meetingId: i.meeting?.id,
      recipients: {
        [i.type === "task" ? "Task owner" : "Point owner"]: [i.ownerId],
      } as any,
      link: i.type === "task" ? `/meet/tasks/${i.id}` : `/meet/points/${i.id}`,
      data: {
        meeting_title: i.meeting?.title || "",
        [i.type === "task" ? "task_code" : "point_code"]: i.code,
        [i.type === "task" ? "task_title" : "point_title"]: i.title,
        due_date: i.due,
        link: i.type === "task" ? `${SITE_URL}/meet/tasks/${i.id}` : `${SITE_URL}/meet/points/${i.id}`,
      },
    });
  }

  return { opened: created.size, closed: toClose.length };
}
