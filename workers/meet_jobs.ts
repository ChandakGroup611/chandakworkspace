import { supabaseAdmin } from "@/lib/supabase/service_role";
import { todayIST } from "@/lib/utils/date-utils";

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
  reminders1h: number;
  reminders24h: number;
  roomsReleased: number;
  slaOpened: number;
  slaClosed: number;
  updateRequests: number;
  minutesReminders: number;
  errors: string[];
}

export async function runMeetJobs(now = new Date()): Promise<MeetJobsResult> {
  const result: MeetJobsResult = {
    reminders1h: 0,
    reminders24h: 0,
    roomsReleased: 0,
    slaOpened: 0,
    slaClosed: 0,
    updateRequests: 0,
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

  // 1h first, so a session created at short notice gets only the 1h reminder.
  await step("reminders-1h", async () => {
    result.reminders1h = await sendSessionReminders(now, 60, "reminder_1h_sent_at", null);
  });
  await step("reminders-24h", async () => {
    result.reminders24h = await sendSessionReminders(now, 24 * 60, "reminder_24h_sent_at", 60);
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
  await step("minutes-reminders", async () => {
    result.minutesReminders = await sendMinutesReminders(now);
  });

  return result;
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

    const emails: any[] = [];
    for (const o of byOwner.values()) {
      emails.push({
        to_email: o.email,
        subject: `Update needed before ${meeting.title}`,
        body_text: [
          `Dear ${o.name},`,
          "",
          `${meeting.title} is on ${fmtIST(s.scheduled_start)} IST. Please send a one-line update on ${o.points.length === 1 ? "your open point" : `your ${o.points.length} open points`} so the meeting can start from where things stand:`,
          "",
          ...o.points.slice(0, 20).map((p: any) => `• ${p.code} ${p.title}${p.due_date ? ` (due ${p.due_date})` : ""}\n  ${SITE_URL}/meet/points/${p.id}#send-update`),
          o.points.length > 20 ? `…and ${o.points.length - 20} more in ${SITE_URL}/meet/my-work` : null,
          "",
          "Chandak Meet",
        ]
          .filter((l) => l !== null)
          .join("\n"),
        status: "pending",
        retry_count: 0,
      });
    }
    if (emails.length) {
      const { error: qErr } = await supabaseAdmin.from("email_queue").insert(emails);
      if (qErr) throw qErr;
      sent += emails.length;
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
       meeting:meet_meetings(title, is_deleted, organizer:user_master!meet_meetings_organizer_id_fkey(id, email, full_name))`
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

    const people: { email: string; name: string }[] = [];
    const org: any = one(meeting.organizer);
    if (org?.email) people.push({ email: org.email, name: org.full_name || "Colleague" });
    if ((s as any).minute_taker_id && (s as any).minute_taker_id !== org?.id) {
      const { data: mt } = await supabaseAdmin.from("user_master").select("email, full_name").eq("id", (s as any).minute_taker_id).maybeSingle();
      if (mt?.email) people.push({ email: mt.email, name: mt.full_name || "Colleague" });
    }
    if (!people.length) continue;

    const { error: qErr } = await supabaseAdmin.from("email_queue").insert(
      people.map((p) => ({
        to_email: p.email,
        subject: `Minutes not sent yet: ${meeting.title}`,
        body_text: [
          `Dear ${p.name},`,
          "",
          `The minutes for ${meeting.title} (${s.code}) are drafted but haven't been sent. Review and send them here:`,
          `${SITE_URL}/meet/sessions/${s.id}/review`,
          "",
          "Chandak Meet",
        ].join("\n"),
        status: "pending",
        retry_count: 0,
      }))
    );
    if (qErr) throw qErr;
    sent += people.length;
  }
  return sent;
}

/** Remind attendees of sessions starting within `leadMin` minutes (but after `minLeadMin`, if set). */
async function sendSessionReminders(
  now: Date,
  leadMin: number,
  column: "reminder_1h_sent_at" | "reminder_24h_sent_at",
  minLeadMin: number | null
): Promise<number> {
  const from = new Date(now.getTime() + (minLeadMin ?? 0) * 60000).toISOString();
  const to = new Date(now.getTime() + leadMin * 60000).toISOString();

  const { data: due, error } = await supabaseAdmin
    .from("meet_sessions")
    .select("id")
    .eq("status", "scheduled")
    .eq("is_deleted", false)
    .is(column, null)
    .gt("scheduled_start", from)
    .lte("scheduled_start", to);
  if (error) throw error;
  if (!due || due.length === 0) return 0;

  // Claim atomically: only rows still unstamped are returned, so overlapping runs cannot double-send.
  const stamp: Record<string, string> = { [column]: now.toISOString() };
  if (column === "reminder_1h_sent_at") stamp.reminder_24h_sent_at = now.toISOString();
  const { data: claimed, error: claimErr } = await supabaseAdmin
    .from("meet_sessions")
    .update(stamp)
    .in(
      "id",
      due.map((s) => s.id)
    )
    .is(column, null)
    .select(
      `id, code, scheduled_start, scheduled_end,
       meeting:meet_meetings(title, video_link, is_deleted),
       room:meet_rooms(name, location),
       attendees:meet_session_attendees(invite_status, user:user_master!meet_session_attendees_user_id_fkey(email, full_name))`
    );
  if (claimErr) throw claimErr;

  const emails: any[] = [];
  for (const s of claimed || []) {
    const meeting: any = one(s.meeting as any);
    if (!meeting || meeting.is_deleted) continue;
    const room: any = one(s.room as any);
    const when = leadMin <= 60 ? "in about 1 hour" : "tomorrow";
    const where = [room?.name, room?.location].filter(Boolean).join(", ");

    for (const a of (s.attendees as any[]) || []) {
      if (a.invite_status === "declined") continue;
      const u: any = one(a.user);
      if (!u?.email) continue;
      emails.push({
        to_email: u.email,
        subject: `Reminder: ${meeting.title} starts ${when}`,
        body_text: [
          `Dear ${u.full_name || "Colleague"},`,
          "",
          `${meeting.title} (${s.code}) starts ${when}.`,
          `Time: ${fmtIST(s.scheduled_start)} IST`,
          where ? `Room: ${where}` : null,
          meeting.video_link ? `Join online: ${meeting.video_link}` : null,
          "",
          `Agenda and points: ${SITE_URL}/meet/sessions/${s.id}`,
          "",
          "Chandak Meet",
        ]
          .filter((l) => l !== null)
          .join("\n"),
        status: "pending",
        retry_count: 0,
      });
    }
  }

  if (emails.length > 0) {
    const { error: qErr } = await supabaseAdmin.from("email_queue").insert(emails);
    if (qErr) throw qErr;
  }
  return emails.length;
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

  // Notify only for records this run actually created
  const chairIds = Array.from(new Set(fresh.map(escalateTo).filter(Boolean))) as string[];
  const { data: chairs } = chairIds.length
    ? await supabaseAdmin.from("user_master").select("id, email, full_name").in("id", chairIds)
    : { data: [] as any[] };
  const chairMap = new Map((chairs || []).map((c: any) => [c.id, c]));

  const emails: any[] = [];
  for (const i of fresh) {
    if (!created.has(`${i.type}:${i.id}`)) continue;
    const label = i.type === "task" ? "Task" : "Point";
    const link = i.type === "task" ? `${SITE_URL}/meet/my-work` : `${SITE_URL}/meet/meetings/${i.meeting?.id}`;
    const lines = (name: string, intro: string) =>
      [
        `Dear ${name},`,
        "",
        intro,
        `${label}: ${i.code} — ${i.title}`,
        i.meeting?.title ? `Meeting: ${i.meeting.title}` : null,
        `Due: ${i.due}`,
        "",
        link,
        "",
        "Chandak Meet",
      ]
        .filter((l) => l !== null)
        .join("\n");

    if (i.owner?.email) {
      emails.push({
        to_email: i.owner.email,
        subject: `Overdue: ${label} ${i.code} — ${i.title}`,
        body_text: lines(i.owner.full_name || "Colleague", `This ${label.toLowerCase()} assigned to you is past its due date.`),
        status: "pending",
        retry_count: 0,
      });
    }
    const chair: any = chairMap.get(escalateTo(i) || "");
    if (chair?.email && chair.email !== i.owner?.email) {
      emails.push({
        to_email: chair.email,
        subject: `Escalation: ${label} ${i.code} is overdue`,
        body_text: lines(
          chair.full_name || "Chair",
          `${i.owner?.full_name || "The owner"} has an overdue ${label.toLowerCase()} in your meeting.`
        ),
        status: "pending",
        retry_count: 0,
      });
    }
  }
  if (emails.length > 0) {
    const { error: qErr } = await supabaseAdmin.from("email_queue").insert(emails);
    if (qErr) throw qErr;
  }

  return { opened: created.size, closed: toClose.length };
}
