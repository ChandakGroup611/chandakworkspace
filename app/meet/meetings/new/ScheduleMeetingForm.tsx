"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { ChevronLeft, X, Plus, Search, Loader2, CheckCircle2, AlertTriangle, Video, DoorOpen, Trash2 } from "lucide-react";
import { createMeeting, updateMeeting } from "@/lib/actions/meet/meetings";
import { rescheduleSession } from "@/lib/actions/meet/sessions";
import { bookRoomForSession } from "@/lib/actions/meet/rooms";
import { getScheduleAssist, type ScheduleAssist } from "@/lib/actions/meet/schedule-assist";
import type { MeetingType, MeetingRoom, MeetingTemplate } from "@/types/meet";

/**
 * Schedule a meeting (Chandak Meet redesign): one page in five numbered parts —
 * What, When, Who, Where, Agenda — with a live invite preview and checks on the right.
 * Free/busy comes from people's other Chandak Meet meetings; rooms show whether they're
 * free for the chosen slot and get booked when the meeting is scheduled.
 */

interface Props {
  masters: {
    types: MeetingType[];
    categories: any[];
    rooms: MeetingRoom[];
    templates: MeetingTemplate[];
    departments: any[];
    users: any[];
    projects?: any[];
  };
  currentUserId: string;
  /** Edit mode: the saved series, and its next scheduled session (date, time and room changes apply to it). */
  meeting?: any;
  nextSession?: { id: string; scheduled_start: string; scheduled_end: string | null; room_id: string | null } | null;
}

type Mode = "in_person" | "online" | "hybrid";
type Recurrence = "none" | "daily" | "weekly" | "biweekly" | "monthly";

const IST = "Asia/Kolkata";
const DAY_START = 8; // 8 AM
const DAY_END = 21; // 9 PM

const input =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-[14px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const label = "mb-1.5 block text-[13px] font-semibold text-foreground";

const initials = (name: string) =>
  String(name || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function todayIST() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function nextHalfHour() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: IST }));
  let h = now.getHours();
  let m = now.getMinutes() < 30 ? 30 : 0;
  if (m === 0) h += 1;
  if (h >= DAY_END) return "10:00";
  if (h < DAY_START) return "10:00";
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function istDate(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

function istTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: IST, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

function weekdayName(date: string) {
  return new Date(`${date}T12:00:00+05:30`).toLocaleDateString("en-IN", { timeZone: IST, weekday: "long" });
}

function prettyDate(date: string) {
  return new Date(`${date}T12:00:00+05:30`).toLocaleDateString("en-IN", { timeZone: IST, weekday: "short", day: "numeric", month: "short" });
}

function fmtTime(hhmm: string, addMin = 0) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + addMin;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

/** minutes from midnight IST for an ISO timestamp */
function istMinutes(iso: string) {
  const d = new Date(new Date(iso).toLocaleString("en-US", { timeZone: IST }));
  return d.getHours() * 60 + d.getMinutes();
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`sec-${n}`} className="rounded-xl border border-border bg-surface p-5">
      <h2 id={`sec-${n}`} className="mb-4 flex items-center gap-2.5 text-[16px] font-semibold text-heading">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-[13px] font-bold text-accent-soft-text">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function ScheduleMeetingForm({ masters, currentUserId, meeting, nextSession }: Props) {
  const isEdit = !!meeting;
  const m0: any = meeting || {};
  const router = useRouter();
  const users = masters.users || [];
  const userById = useMemo(() => new Map<string, any>(users.map((u: any) => [u.id, u] as [string, any])), [users]);
  const me = userById.get(currentUserId) ? currentUserId : users[0]?.id || "";

  // 1. What
  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState<string>(m0.title || "");
  const [description, setDescription] = useState<string>(m0.description || "");
  const [meetingTypeId, setMeetingTypeId] = useState<string>(m0.meeting_type_id || masters.types[0]?.id || "");
  const [projectId, setProjectId] = useState<string>((m0 as any).meet_project_id || "");
  const [departmentId, setDepartmentId] = useState<string>(m0.department_id || "");

  // 2. When
  const [date, setDate] = useState<string>(nextSession ? istDate(nextSession.scheduled_start) : todayIST());
  const [time, setTime] = useState<string>(nextSession ? istTime(nextSession.scheduled_start) : m0.default_start_time ? String(m0.default_start_time).slice(0, 5) : nextHalfHour());
  const [duration, setDuration] = useState<number>(Number(m0.default_duration_minutes) || 60);
  const [recurrence, setRecurrence] = useState<Recurrence>((m0.recurrence as Recurrence) || "none");

  // 3. Who
  const [organizerId, setOrganizerId] = useState<string>(m0.organizer_id || me);
  const [chairId, setChairId] = useState<string>(isEdit ? m0.chair_id || "" : me);
  const [minuteTakerId, setMinuteTakerId] = useState<string>(m0.default_minute_taker_id || "");
  const [people, setPeople] = useState<string[]>(() =>
    (m0.members || []).filter((mb: any) => mb.user?.id && ["required", "attendee"].includes(mb.role)).map((mb: any) => mb.user.id as string)
  );
  const [query, setQuery] = useState("");

  // 4. Where
  const [mode, setMode] = useState<Mode>((m0.mode as Mode) || "online");
  const [roomId, setRoomId] = useState<string>(nextSession?.room_id || m0.room_id || "");
  const [ownLink, setOwnLink] = useState<string>(m0.video_link && !/teams\.microsoft\.com\/l\/(meeting\/new|call\/)/i.test(m0.video_link) ? m0.video_link : "");
  const [showOwnLink, setShowOwnLink] = useState<boolean>(!!(m0.video_link && !/teams\.microsoft\.com\/l\/(meeting\/new|call\/)/i.test(m0.video_link)));

  // 5. Agenda
  const [agenda, setAgenda] = useState<{ title: string; min: number }[]>([
    { title: "Open points from last time", min: 15 },
    { title: "Updates", min: 30 },
    { title: "Decisions and next steps", min: 15 },
  ]);

  // More options
  const [preUpdate, setPreUpdate] = useState<boolean>(m0.pre_update_enabled ?? true);
  const [allowAddPoints, setAllowAddPoints] = useState<boolean>(m0.allow_attendees_add_points ?? true);
  const [momApproval, setMomApproval] = useState<boolean>(m0.requires_mom_approval ?? false);
  const [confidential, setConfidential] = useState<boolean>(m0.is_confidential ?? false);
  const [showMore, setShowMore] = useState(false);

  const [assist, setAssist] = useState<ScheduleAssist | null>(null);
  const [assistLoading, setAssistLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const everyone = useMemo(
    () => Array.from(new Set([organizerId, chairId, minuteTakerId, ...people].filter(Boolean))),
    [organizerId, chairId, minuteTakerId, people]
  );

  // Who's busy and which rooms are free — refreshed when the slot or people change
  useEffect(() => {
    if (!date || !time) return;
    let cancelled = false;
    setAssistLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await getScheduleAssist({ date, startTime: time, durationMinutes: duration, userIds: everyone, excludeSessionId: nextSession?.id });
        if (!cancelled) setAssist(r);
      } catch {
        if (!cancelled) setAssist(null);
      } finally {
        if (!cancelled) setAssistLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [date, time, duration, everyone]);

  const slotStart = useMemo(() => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }, [time]);
  const slotEnd = slotStart + duration;

  const clashes = useMemo(() => {
    if (!assist) return [] as { id: string; name: string; with: string }[];
    return everyone
      .map((id) => {
        const hit = (assist.busy[id] || []).find((b) => istMinutes(b.start) < slotEnd && istMinutes(b.end) > slotStart);
        return hit ? { id, name: userById.get(id)?.full_name || "Someone", with: hit.title } : null;
      })
      .filter(Boolean) as { id: string; name: string; with: string }[];
  }, [assist, everyone, slotStart, slotEnd, userById]);

  // First slot of the same length (on the half hour) where nobody listed is busy
  const suggestion = useMemo(() => {
    if (!assist || clashes.length === 0) return null;
    const all = everyone.flatMap((id) => assist.busy[id] || []).map((b) => [istMinutes(b.start), istMinutes(b.end)]);
    for (let s = DAY_START * 60; s + duration <= DAY_END * 60; s += 30) {
      if (date === todayIST()) {
        const now = istMinutes(new Date().toISOString());
        if (s < now) continue;
      }
      if (!all.some(([a, b]) => a < s + duration && b > s)) return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    }
    return null;
  }, [assist, clashes, everyone, duration, date]);

  const roomInfo = assist?.rooms.find((r) => r.id === roomId) || null;
  const needRoom = mode !== "online";
  const needTeams = mode !== "in_person";
  const plannedMin = agenda.reduce((s, a) => s + (Number(a.min) || 0), 0);

  const pickTemplate = (id: string) => {
    setTemplateId(id);
    const tpl = masters.templates.find((t) => t.id === id);
    if (!tpl) return;
    setTitle(tpl.name.replace(/\s*Template$/i, ""));
    setDescription(tpl.description || "");
    if (tpl.meeting_type_id) setMeetingTypeId(tpl.meeting_type_id);
    if (tpl.default_duration) setDuration(tpl.default_duration);
    if (Array.isArray(tpl.agenda_items) && tpl.agenda_items.length) {
      setAgenda(tpl.agenda_items.map((a) => ({ title: a.title, min: a.planned_minutes || 10 })));
    }
  };

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return users
      .filter((u: any) => !everyone.includes(u.id))
      .filter((u: any) => `${u.full_name} ${u.email || ""} ${u.user_code || ""}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, users, everyone]);

  const addPerson = (id: string) => {
    setPeople((p) => (p.includes(id) ? p : [...p, id]));
    setQuery("");
  };

  const checks: { ok: boolean; text: string }[] = [];
  if (!title.trim()) checks.push({ ok: false, text: "Add a title" });
  if (assist) {
    checks.push(
      clashes.length === 0
        ? { ok: true, text: everyone.length > 1 ? "Everyone is free (in Chandak Meet)" : "You're free (in Chandak Meet)" }
        : { ok: false, text: `${clashes.map((c) => c.name.split(" ")[0]).join(", ")} ${clashes.length === 1 ? "has" : "have"} another meeting then` }
    );
  }
  if (needRoom) {
    if (!roomId) checks.push({ ok: false, text: "No room picked" });
    else if (roomInfo) checks.push(roomInfo.free ? { ok: true, text: `${roomInfo.name} is free` } : { ok: false, text: `${roomInfo.name} is booked then` });
  }
  if (plannedMin > duration) checks.push({ ok: false, text: `Agenda is ${plannedMin - duration} min longer than the meeting` });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.warn("Add a title for the meeting");
      return;
    }
    if (!organizerId) {
      toast.warn("Pick an organiser");
      return;
    }
    if (needRoom && roomInfo && !roomInfo.free) {
      toast.warn(`${roomInfo.name} is booked at that time. Pick another room or time.`);
      return;
    }
    setSubmitting(true);
    if (isEdit) {
      try {
        const res = await updateMeeting({
          meetingId: m0.id,
          title: title.trim(),
          description: description.trim(),
          projectId,
          meetingTypeId,
          departmentId,
          organizerId,
          chairId,
          minuteTakerId,
          mode,
          roomId: needRoom ? roomId : "",
          videoProvider: needTeams ? "teams" : "none",
          videoLink: needTeams ? ownLink.trim() : "",
          defaultStartTime: `${time}:00`,
          defaultDurationMinutes: duration,
          recurrence,
          allowAttendeesAddPoints: allowAddPoints,
          isConfidential: confidential,
          requiresMomApproval: momApproval,
          preUpdateEnabled: preUpdate,
          attendeeUserIds: people,
        });
        if (!res.success) {
          toast.error(res.error || "Couldn't save the changes");
          return;
        }
        // Date, time and room changes apply to the next scheduled session (and its Outlook event)
        if (nextSession) {
          const newStart = new Date(`${date}T${time}:00+05:30`).toISOString();
          const oldMin = nextSession.scheduled_end ? Math.round((new Date(nextSession.scheduled_end).getTime() - new Date(nextSession.scheduled_start).getTime()) / 60000) : duration;
          if (newStart !== new Date(nextSession.scheduled_start).toISOString() || oldMin !== duration) {
            const rr = await rescheduleSession({ sessionId: nextSession.id, scheduledStart: newStart, durationMinutes: duration, reason: "Changed on the edit page" });
            if (!rr.success) toast.warn(`Saved, but the next meeting's time wasn't changed: ${rr.error || "not allowed"}`);
          }
          if (needRoom && roomId && roomId !== nextSession.room_id) {
            const endIso = new Date(new Date(newStart).getTime() + duration * 60000).toISOString();
            const b = await bookRoomForSession(nextSession.id, roomId, newStart, endIso).catch(() => null);
            if (b && !b.success) toast.warn(`Saved, but the room wasn't booked: ${b.error || "it's taken"}`);
          }
        }
        toast.success("Changes saved");
        router.push(`/meet/meetings/${m0.id}`);
        router.refresh();
      } catch (err: any) {
        toast.error(err?.message || "Couldn't save the changes");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    try {
      const startTime = `${time}:00`;
      const res = await createMeeting({
        title: title.trim(),
        description: description.trim() || undefined,
        project_id: projectId || undefined,
        meeting_type_id: meetingTypeId,
        department_id: departmentId || undefined,
        template_id: templateId || undefined,
        organizer_id: organizerId,
        chair_id: chairId || undefined,
        default_minute_taker_id: minuteTakerId || undefined,
        mode,
        room_id: needRoom && roomId ? roomId : undefined,
        video_provider: needTeams ? "teams" : "none",
        video_link: needTeams && ownLink.trim() ? ownLink.trim() : undefined,
        start_date: date,
        default_start_time: startTime,
        default_duration_minutes: duration,
        recurrence,
        allow_attendees_add_points: allowAddPoints,
        is_confidential: confidential,
        requires_mom_approval: momApproval,
        pre_update_enabled: preUpdate,
        members: everyone.filter((id) => id !== organizerId).map((id) => ({ user_id: id, role: "required" })),
        agenda_items: agenda.filter((a) => a.title.trim()).map((a) => ({ title: a.title.trim(), planned_minutes: Number(a.min) || 10 })),
      });
      if (!res.success || !res.meetingId) {
        toast.error(res.error || "Couldn't schedule the meeting");
        return;
      }
      // Book the room for the first meeting so it shows as taken on the Rooms page and door display
      if (needRoom && roomId && res.sessionId) {
        const startIso = new Date(`${date}T${startTime}+05:30`).toISOString();
        const endIso = new Date(new Date(startIso).getTime() + duration * 60000).toISOString();
        const b = await bookRoomForSession(res.sessionId, roomId, startIso, endIso).catch(() => null);
        if (b && !b.success) toast.warn(`Meeting scheduled, but the room wasn't booked: ${b.error || "it's taken"}`);
      }
      toast.success("Meeting scheduled and invites sent");
      router.push(`/meet/meetings/${res.meetingId}`);
    } catch (err: any) {
      toast.error(err?.message || "Couldn't schedule the meeting");
    } finally {
      setSubmitting(false);
    }
  };

  const recurrenceLabel: Record<Recurrence, string> = {
    none: "Does not repeat",
    daily: "Every day",
    weekly: `Every ${weekdayName(date)}`,
    biweekly: `Every 2 weeks on ${weekdayName(date)}`,
    monthly: "Every month",
  };

  const timelineRows = everyone.slice(0, 8);
  const span = (DAY_END - DAY_START) * 60;
  const pct = (min: number) => `${Math.min(Math.max(((min - DAY_START * 60) / span) * 100, 0), 100)}%`;

  return (
    <form onSubmit={submit} className="space-y-5 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <Link href="/meet/meetings" className="inline-flex items-center gap-1 text-[13.5px] font-medium text-muted hover:text-foreground">
            <ChevronLeft className="h-4 w-4" aria-hidden /> Meetings
          </Link>
          <h1 className="mt-1 text-[24px] font-bold tracking-[-0.01em] text-heading">{isEdit ? `Edit · ${m0.title}` : "Schedule a meeting"}</h1>
          {isEdit && <p className="mt-1 text-[13.5px] text-subtle">Changes apply to future meetings in this series{nextSession ? "; date, time and room change the next one" : ""}.</p>}
        </div>
        <div className="flex gap-2">
          <Link href={isEdit ? `/meet/meetings/${m0.id}` : "/meet/meetings"} className="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-[14px] font-semibold text-foreground hover:bg-surface-hover">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-[14px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {submitting ? (isEdit ? "Saving…" : "Scheduling…") : isEdit ? "Save changes" : "Schedule and send invites"}
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {/* 1. What */}
          <Section n={1} title="What">
            {!isEdit && masters.templates.length > 0 && (
              <div className="mb-4">
                <span className={label}>Start from</span>
                <div className="flex flex-wrap gap-2">
                  {[{ id: "", name: "Blank" }, ...masters.templates].map((t: any) => (
                    <button
                      key={t.id || "blank"}
                      type="button"
                      onClick={() => (t.id ? pickTemplate(t.id) : setTemplateId(""))}
                      aria-pressed={templateId === t.id}
                      className={`inline-flex h-9 items-center rounded-full border px-4 text-[13.5px] font-semibold ${
                        templateId === t.id ? "border-primary bg-accent-soft text-accent-soft-text" : "border-border bg-surface text-subtle hover:bg-surface-hover"
                      }`}
                    >
                      {t.name.replace(/\s*Template$/i, "")}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className={label}>Title</label>
                <input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Weekly sales review" className={input} />
              </div>
              <div>
                <label htmlFor="desc" className={label}>
                  Description <span className="font-normal text-muted">(optional)</span>
                </label>
                <textarea id="desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this meeting for?" className={input} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="type" className={label}>Type</label>
                  <select id="type" value={meetingTypeId} onChange={(e) => setMeetingTypeId(e.target.value)} className={input}>
                    {masters.types.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="proj" className={label}>Project <span className="font-normal text-muted">(optional)</span></label>
                  <select id="proj" value={projectId} onChange={(e) => setProjectId(e.target.value)} className={input}>
                    <option value="">None</option>
                    {(masters.projects || []).map((p: any) => (
                      <option key={p.id} value={p.id}>{p.code ? `${p.code} · ` : ""}{p.name}</option>
                    ))}
                  </select>
                  {(masters.projects || []).length === 0 && (
                    <p className="mt-1 text-[12px] text-muted">No Meet projects yet. An admin can add them in Settings › Projects.</p>
                  )}
                </div>
                <div>
                  <label htmlFor="dept" className={label}>Department <span className="font-normal text-muted">(optional)</span></label>
                  <select id="dept" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={input}>
                    <option value="">All departments</option>
                    {masters.departments.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </Section>

          {/* 2. When */}
          <Section n={2} title="When">
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <label htmlFor="date" className={label}>Date</label>
                <input id="date" type="date" required value={date} min={todayIST()} onChange={(e) => setDate(e.target.value)} className={input} />
              </div>
              <div>
                <label htmlFor="time" className={label}>Start</label>
                <input id="time" type="time" required step={300} value={time} onChange={(e) => setTime(e.target.value.slice(0, 5))} className={input} />
              </div>
              <div>
                <label htmlFor="dur" className={label}>Duration</label>
                <select id="dur" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={input}>
                  {[15, 30, 45, 60, 90, 120, 180].map((d) => (
                    <option key={d} value={d}>{d < 60 ? `${d} min` : d === 60 ? "1 hour" : d === 90 ? "90 min" : `${d / 60} hours`}</option>
                  ))}
                  {![15, 30, 45, 60, 90, 120, 180].includes(duration) && <option value={duration}>{duration} min</option>}
                </select>
              </div>
              <div>
                <label htmlFor="rep" className={label}>Repeats</label>
                <select id="rep" value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)} className={input}>
                  {(Object.keys(recurrenceLabel) as Recurrence[]).map((r) => (
                    <option key={r} value={r}>{recurrenceLabel[r]}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Free / busy */}
            <div className="mt-5 rounded-lg border border-border bg-background p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[13.5px] font-semibold text-foreground">Who is free on {prettyDate(date)}</h3>
                <span className="flex items-center gap-3 text-[12px] text-muted">
                  <span className="inline-flex items-center gap-1"><span className="h-2.5 w-4 rounded-sm bg-danger/40" /> Busy</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2.5 w-4 rounded-sm border-2 border-primary bg-primary/15" /> Your slot</span>
                </span>
              </div>
              <div className="space-y-1.5">
                {timelineRows.map((id) => {
                  const u: any = userById.get(id);
                  const blocks = assist?.busy[id] || [];
                  return (
                    <div key={id} className="flex items-center gap-3">
                      <span className="w-[120px] shrink-0 truncate text-[12.5px] text-subtle" title={u?.full_name}>{u?.full_name || "Someone"}</span>
                      <div className="relative h-6 flex-1 overflow-hidden rounded bg-sunken">
                        {blocks.map((b, i) => {
                          const s = istMinutes(b.start);
                          const e2 = istMinutes(b.end);
                          return (
                            <span
                              key={i}
                              title={`${b.title} · ${fmtTime(`${Math.floor(s / 60)}:${s % 60}`)}`}
                              className="absolute inset-y-0 bg-danger/40"
                              style={{ left: pct(s), width: `calc(${pct(e2)} - ${pct(s)})` }}
                            />
                          );
                        })}
                        <span
                          className="absolute inset-y-0 rounded-sm border-2 border-primary bg-primary/15"
                          style={{ left: pct(slotStart), width: `calc(${pct(slotEnd)} - ${pct(slotStart)})` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {everyone.length > timelineRows.length && (
                  <p className="pl-[132px] text-[12px] text-muted">+{everyone.length - timelineRows.length} more people</p>
                )}
                <div className="flex gap-3">
                  <span className="w-[120px] shrink-0" />
                  <div className="relative h-4 flex-1 text-[11.5px] text-muted" aria-hidden>
                    {[9, 12, 15, 18].map((h) => (
                      <span key={h} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: pct(h * 60) }}>
                        {fmtTime(`${h}:00`).replace(":00", "")}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-[13.5px]" role="status">
                {assistLoading && !assist ? (
                  <span className="text-muted">Checking calendars…</span>
                ) : clashes.length === 0 ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-success-text">
                    <CheckCircle2 className="h-4 w-4" aria-hidden /> {everyone.length > 1 ? "Everyone is free" : "You're free"} at {fmtTime(time)}.
                  </span>
                ) : (
                  <span className="flex flex-wrap items-center gap-2 text-warning-text">
                    <AlertTriangle className="h-4 w-4" aria-hidden />
                    {clashes.map((c) => `${c.name} (${c.with})`).join(", ")} {clashes.length === 1 ? "is" : "are"} busy then.
                    {suggestion && (
                      <button type="button" onClick={() => setTime(suggestion)} className="font-semibold text-primary underline-offset-2 hover:underline">
                        Everyone is free at {fmtTime(suggestion)} — use that
                      </button>
                    )}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[12px] text-muted">Based on meetings in Chandak Meet. Personal Outlook events aren&apos;t shown.</p>
            </div>
          </Section>

          {/* 3. Who */}
          <Section n={3} title="Who">
            <label htmlFor="people" className={label}>Add people</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                id="people"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (matches[0]) addPerson(matches[0].id);
                  }
                }}
                placeholder="Type a name or email"
                autoComplete="off"
                className={`${input} pl-9`}
              />
              {matches.length > 0 && (
                <ul role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-surface py-1 shadow-lg">
                  {matches.map((u: any) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        onClick={() => addPerson(u.id)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-hover"
                      >
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-bold text-accent-soft-text">{initials(u.full_name)}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13.5px] font-semibold text-foreground">{u.full_name}</span>
                          <span className="block truncate text-[12px] text-muted">{u.email || u.user_code}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <ul className="mt-3 flex flex-wrap gap-2">
              {everyone.map((id) => {
                const u: any = userById.get(id);
                const tag = id === organizerId ? "Organiser" : id === chairId ? "Chair" : id === minuteTakerId ? "Minutes" : null;
                const removable = people.includes(id) && !tag;
                return (
                  <li key={id} className="inline-flex items-center gap-2 rounded-full border border-border bg-background py-1 pl-1 pr-3">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-[11px] font-bold text-accent-soft-text">{initials(u?.full_name)}</span>
                    <span className="text-[13.5px] font-medium text-foreground">{u?.full_name || "Someone"}</span>
                    {tag && <span className="text-[12px] text-muted">{tag}</span>}
                    {removable && (
                      <button type="button" onClick={() => setPeople((p) => p.filter((x) => x !== id))} aria-label={`Remove ${u?.full_name}`} className="text-muted hover:text-danger-text">
                        <X className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="org" className={label}>Organiser</label>
                <select id="org" value={organizerId} onChange={(e) => setOrganizerId(e.target.value)} className={input}>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="chair" className={label}>Chairperson</label>
                <select id="chair" value={chairId} onChange={(e) => setChairId(e.target.value)} className={input}>
                  <option value="">No chair</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="mt" className={label}>Takes the minutes</label>
                <select id="mt" value={minuteTakerId} onChange={(e) => setMinuteTakerId(e.target.value)} className={input}>
                  <option value="">The organiser</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
            </div>
          </Section>

          {/* 4. Where */}
          <Section n={4} title="Where">
            <div role="radiogroup" aria-label="Where the meeting happens" className="mb-4 inline-flex rounded-lg border border-border bg-background p-1">
              {([
                { id: "online", label: "Teams" },
                { id: "in_person", label: "In the office" },
                { id: "hybrid", label: "Both" },
              ] as { id: Mode; label: string }[]).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={mode === m.id}
                  onClick={() => setMode(m.id)}
                  className={`h-9 rounded-md px-4 text-[13.5px] font-semibold ${mode === m.id ? "bg-surface text-foreground shadow-sm" : "text-subtle hover:text-foreground"}`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {needTeams && (
              <div className="mb-4 flex items-start gap-3 rounded-lg bg-accent-soft p-3.5 text-[13.5px] text-accent-soft-text">
                <Video className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  A Microsoft Teams link is created when you schedule. You don&apos;t need to paste or generate it.
                  {!showOwnLink ? (
                    <button type="button" onClick={() => setShowOwnLink(true)} className="ml-1 font-semibold underline-offset-2 hover:underline">
                      Use my own link instead
                    </button>
                  ) : (
                    <input
                      type="url"
                      value={ownLink}
                      onChange={(e) => setOwnLink(e.target.value)}
                      placeholder="https://teams.microsoft.com/…"
                      aria-label="Your own meeting link"
                      className={`${input} mt-2`}
                    />
                  )}
                </div>
              </div>
            )}

            {(
              <div>
                <span className={label}>
                  Meeting room {!needRoom && <span className="font-normal text-muted">(optional: pick one if some people will sit together in the office)</span>}
                </span>
                {(assist?.rooms || masters.rooms.map((r) => ({ id: r.id, name: r.name, capacity: r.capacity, hasTeams: false, free: true, busyWith: null }))).length === 0 ? (
                  <p className="text-[13.5px] text-subtle">
                    No rooms have been added yet. An admin can add them in{" "}
                    <Link href="/meet/admin?section=rooms" className="font-semibold text-primary hover:underline">Settings › Rooms and door screens</Link>.
                  </p>
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {(assist?.rooms || masters.rooms.map((r) => ({ id: r.id, name: r.name, capacity: r.capacity, hasTeams: false, free: true, busyWith: null }))).map((r) => {
                      const tooSmall = r.capacity > 0 && r.capacity < everyone.length;
                      return (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setRoomId(roomId === r.id ? "" : r.id);
                              // Picking a room for a Teams meeting makes it Teams + room
                              if (roomId !== r.id && mode === "online") setMode("hybrid");
                            }}
                            disabled={!r.free}
                            aria-pressed={roomId === r.id}
                            className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left disabled:cursor-not-allowed disabled:opacity-60 ${
                              roomId === r.id ? "border-primary bg-accent-soft" : "border-border bg-background hover:bg-surface-hover"
                            }`}
                          >
                            <DoorOpen className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13.5px] font-semibold text-foreground">{r.name}</span>
                              <span className="block truncate text-[12.5px] text-muted">
                                {r.capacity} seats{r.hasTeams ? " · Teams" : ""}
                                {tooSmall ? " · too small" : ""}
                              </span>
                            </span>
                            <span className={`shrink-0 text-[12px] font-semibold ${r.free ? "text-success-text" : "text-danger-text"}`}>
                              {r.free ? "Free" : "Booked"}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </Section>

          {isEdit ? (
            <Section n={5} title="Agenda">
              <p className="text-[13.5px] text-subtle">
                Each meeting keeps its own agenda.{" "}
                {nextSession ? (
                  <Link href={`/meet/sessions/${nextSession.id}`} className="font-semibold text-primary hover:underline">Edit the next meeting&apos;s agenda</Link>
                ) : (
                  "Open a meeting to change its agenda."
                )}
              </p>
            </Section>
          ) : (
            <>
          {/* 5. Agenda */}
            <Section n={5} title="Agenda">
              <p className={`mb-3 text-[13px] ${plannedMin > duration ? "text-warning-text" : "text-muted"}`}>
                {plannedMin} of {duration} min planned
              </p>
              <ol className="space-y-2">
                {agenda.map((a, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-center text-[13px] font-semibold text-muted">{i + 1}</span>
                    <input
                      value={a.title}
                      onChange={(e) => setAgenda((list) => list.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                      aria-label={`Agenda item ${i + 1}`}
                      placeholder="What to discuss"
                      className={`${input} flex-1`}
                    />
                    <input
                      type="number"
                      min={1}
                      max={600}
                      value={a.min}
                      onChange={(e) => setAgenda((list) => list.map((x, j) => (j === i ? { ...x, min: Number(e.target.value) || 0 } : x)))}
                      aria-label={`Minutes for item ${i + 1}`}
                      className={`${input} w-20 text-right`}
                    />
                    <span className="text-[13px] text-muted">min</span>
                    <button
                      type="button"
                      onClick={() => setAgenda((list) => list.filter((_, j) => j !== i))}
                      aria-label={`Remove agenda item ${i + 1}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-surface-hover hover:text-danger-text"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ol>
              <button
                type="button"
                onClick={() => setAgenda((list) => [...list, { title: "", min: 10 }])}
                className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-primary hover:underline"
              >
                <Plus className="h-4 w-4" aria-hidden /> Add agenda item
              </button>
              {recurrence !== "none" && (
                <p className="mt-3 text-[13px] text-muted">From the second meeting on, open points from the last meeting are added at the top automatically.</p>
              )}
            </Section>
            </>
          )}

          {/* More options */}
          <section className="rounded-xl border border-border bg-surface">
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              aria-expanded={showMore}
              className="flex w-full items-center justify-between p-5 text-left text-[15px] font-semibold text-heading"
            >
              More options
              <span className="text-[13px] font-normal text-muted">{showMore ? "Hide" : "Show"}</span>
            </button>
            {showMore && (
              <div className="space-y-3 border-t border-border p-5">
                {[
                  { v: preUpdate, set: setPreUpdate, t: "Ask point owners for an update 24 hours before" },
                  { v: allowAddPoints, set: setAllowAddPoints, t: "Anyone invited can raise points during the meeting" },
                  { v: momApproval, set: setMomApproval, t: "Chairperson approves minutes before they are sent" },
                  { v: confidential, set: setConfidential, t: "Confidential (only invited people can see points and minutes)" },
                ].map((o) => (
                  <label key={o.t} className="flex cursor-pointer items-start gap-3 text-[14px] text-foreground">
                    <input type="checkbox" checked={o.v} onChange={(e) => o.set(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border" />
                    {o.t}
                  </label>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Invite preview + checks */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted">Invite preview</h2>
            <p className="mt-2 text-[17px] font-semibold text-heading">{title.trim() || "Untitled meeting"}</p>
            <ul className="mt-2 space-y-1 text-[13.5px] text-subtle">
              <li>{prettyDate(date)} · {fmtTime(time)} – {fmtTime(time, duration)}</li>
              {recurrence !== "none" && <li>{recurrenceLabel[recurrence]}</li>}
              <li>
                {needTeams ? "Teams" : ""}
                {needTeams && needRoom ? " + " : ""}
                {needRoom ? roomInfo?.name || "room not picked" : ""}
              </li>
              <li>
                {everyone.length} {everyone.length === 1 ? "person" : "people"} · agenda of {agenda.filter((a) => a.title.trim()).length} item{agenda.filter((a) => a.title.trim()).length === 1 ? "" : "s"}
              </li>
            </ul>
            <p className="mt-3 border-t border-border pt-3 text-[12.5px] text-muted">
              Everyone invited gets a notification here. An email goes out too if the “Meeting created” email is switched on in Automations › Emails.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted">Checks</h2>
            <ul className="mt-2 space-y-2">
              {checks.length === 0 && <li className="text-[13.5px] text-muted">Checking…</li>}
              {checks.map((c) => (
                <li key={c.text} className={`flex items-start gap-2 text-[13.5px] ${c.ok ? "text-success-text" : "text-warning-text"}`}>
                  {c.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
                  {c.text}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </form>
  );
}
