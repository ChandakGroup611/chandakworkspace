import React from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Video,
  Plus,
  MapPin,
  Users,
  RotateCcw,
  FileText,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { getMeetHomeData, type MeetHomeSession, type MeetHomeNeed } from "@/lib/actions/meet/home";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Home · Chandak Meet",
  description: "Your meetings today, what needs you, and how the week is going",
};

const IST = "Asia/Kolkata";

const btnPrimary =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-[14px] font-semibold transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const btnSecondary =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md border border-border bg-surface text-foreground text-[14px] font-semibold transition-colors hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit" });
}

function minutesBetween(a?: string | null, b?: string | null) {
  if (!a || !b) return null;
  const m = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
  return m > 0 ? m : null;
}

function durationLabel(s: MeetHomeSession) {
  const m = minutesBetween(s.scheduled_start, s.scheduled_end);
  if (!m) return "";
  return m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`;
}

function recurrenceLabel(r: string | null) {
  switch (r) {
    case "daily": return "Repeats daily";
    case "weekly": return "Repeats weekly";
    case "biweekly": return "Repeats every 2 weeks";
    case "monthly": return "Repeats monthly";
    case "custom": return "Repeats";
    default: return "One-off";
  }
}

/** One status label + colour per session, the same everywhere on this page. */
function statusOf(s: MeetHomeSession): { label: string; tone: "live" | "soon" | "scheduled" | "minutes" | "done" } {
  const now = Date.now();
  const start = new Date(s.scheduled_start).getTime();
  switch (s.status) {
    case "in_progress": return { label: "Live now", tone: "live" };
    case "completed":
    case "mom_draft": return { label: "Needs minutes", tone: "minutes" };
    case "mom_pending_approval": return { label: "Minutes waiting for approval", tone: "minutes" };
    case "mom_published": return { label: "Minutes sent", tone: "done" };
    default: {
      const mins = Math.round((start - now) / 60000);
      if (mins <= 0 && mins > -60) return { label: "Starting now", tone: "live" };
      if (mins > 0 && mins <= 60) return { label: `Starts in ${mins} min`, tone: "soon" };
      return { label: "Scheduled", tone: "scheduled" };
    }
  }
}

const toneClass: Record<string, string> = {
  live: "bg-success-soft text-success-text",
  soon: "bg-success-soft text-success-text",
  scheduled: "bg-info-soft text-info-text",
  minutes: "bg-warning-soft text-warning-text",
  done: "bg-sunken text-subtle",
};
const toneBar: Record<string, string> = {
  live: "bg-success",
  soon: "bg-primary",
  scheduled: "bg-primary",
  minutes: "bg-warning",
  done: "bg-border",
};

/** The one main action for a meeting row. */
function actionFor(s: MeetHomeSession): { label: string; href: string; external?: boolean; primary: boolean } {
  const tone = statusOf(s).tone;
  if (tone === "minutes" || tone === "done") {
    return { label: tone === "done" ? "View minutes" : "Review minutes", href: `/meet/sessions/${s.id}`, primary: tone === "minutes" };
  }
  if (tone === "live" || tone === "soon") {
    if (s.video_link) return { label: "Join", href: s.video_link, external: true, primary: true };
    return { label: s.i_am_organizer ? "Start" : "Open", href: s.i_am_organizer ? `/meet/live/${s.id}` : `/meet/sessions/${s.id}`, primary: true };
  }
  return { label: "Prepare", href: `/meet/sessions/${s.id}`, primary: false };
}

function where(s: MeetHomeSession) {
  const parts: string[] = [];
  if (s.video_link) parts.push("Teams");
  if (s.room_name) parts.push(s.room_name);
  if (!parts.length) parts.push(s.mode === "in_person" ? "In person" : "Online");
  return parts.join(" + ");
}

function ActionLink({ s, className }: { s: MeetHomeSession; className?: string }) {
  const a = actionFor(s);
  const cls = `${a.primary ? btnPrimary : btnSecondary} h-9 text-[13px] ${className || ""}`;
  return a.external ? (
    <a href={a.href} target="_blank" rel="noopener noreferrer" className={cls}>
      {a.label}
    </a>
  ) : (
    <Link href={a.href} className={cls}>
      {a.label}
    </Link>
  );
}

function SessionRow({ s }: { s: MeetHomeSession }) {
  const st = statusOf(s);
  return (
    <li className="flex items-center gap-4 border-t border-border px-5 py-3.5">
      <div className="w-[72px] shrink-0">
        <div className="text-[14px] font-semibold text-foreground">{timeOf(s.scheduled_start)}</div>
        <div className="text-[12.5px] text-muted">{durationLabel(s)}</div>
      </div>
      <span aria-hidden className={`w-[3px] self-stretch rounded-full ${toneBar[st.tone]}`} />
      <div className="min-w-0 flex-1">
        <Link href={`/meet/sessions/${s.id}`} className="block truncate text-[14.5px] font-semibold text-heading hover:underline">
          {s.meeting_title}
        </Link>
        <div className="truncate text-[13px] text-muted">
          {where(s)}
          {s.invited ? ` · ${s.invited} people` : ""}
        </div>
      </div>
      <span className={`hidden shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold sm:inline ${toneClass[st.tone]}`}>{st.label}</span>
      <ActionLink s={s} className="shrink-0" />
    </li>
  );
}

const needIcon: Record<MeetHomeNeed["kind"], { icon: React.ElementType; cls: string }> = {
  approve_minutes: { icon: FileText, cls: "bg-warning-soft text-warning-text" },
  write_minutes: { icon: FileText, cls: "bg-warning-soft text-warning-text" },
  overdue_task: { icon: AlertCircle, cls: "bg-danger-soft text-danger-text" },
  overdue_point: { icon: AlertCircle, cls: "bg-danger-soft text-danger-text" },
};

export default async function MeetHomePage() {
  const d = await getMeetHomeData();
  const hour = Number(new Intl.DateTimeFormat("en-IN", { timeZone: IST, hour: "numeric", hour12: false }).format(new Date()));
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const next = d.next;
  const nextStatus = next ? statusOf(next) : null;
  const nextAction = next ? actionFor(next) : null;

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-[13.5px] text-muted">{d.todayLabel}</p>
          <h1 className="mt-0.5 text-[24px] font-bold tracking-[-0.01em] text-heading">
            {greet}{d.userFirstName ? `, ${d.userFirstName}` : ""}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/meet/meetings" className={btnSecondary}>
            <Calendar className="h-4 w-4" aria-hidden /> All meetings
          </Link>
          <Link href="/meet/meetings/new" className={btnPrimary}>
            <Plus className="h-4 w-4" aria-hidden /> Schedule meeting
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Next meeting */}
          {next && nextStatus && nextAction ? (
            <section aria-labelledby="next-h" className="theme-card-structural flex flex-wrap items-center gap-5 border-primary/30 p-6">
              <div className="min-w-0 flex-[1_1_320px] space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${toneClass[nextStatus.tone]}`}>
                    {nextStatus.tone === "scheduled"
                      ? `Next: ${new Date(next.scheduled_start).toLocaleDateString("en-IN", { timeZone: IST, weekday: "short", day: "numeric", month: "short" })}`
                      : nextStatus.label}
                  </span>
                  <span className="text-[12.5px] text-muted">{recurrenceLabel(next.recurrence)}</span>
                  {next.meeting_code && <span className="font-mono text-[12px] text-muted">{next.meeting_code}</span>}
                </div>
                <h2 id="next-h" className="text-[21px] font-bold text-heading">{next.meeting_title}</h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13.5px] text-subtle">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4" aria-hidden />
                    {timeOf(next.scheduled_start)}
                    {next.scheduled_end ? ` – ${timeOf(next.scheduled_end)}` : ""}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    {next.video_link ? <Video className="h-4 w-4" aria-hidden /> : <MapPin className="h-4 w-4" aria-hidden />}
                    {where(next)}
                  </span>
                  {next.carried_points > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <RotateCcw className="h-4 w-4" aria-hidden />
                      {next.carried_points} point{next.carried_points === 1 ? "" : "s"} carried from last time
                    </span>
                  )}
                  {next.invited > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-4 w-4" aria-hidden />
                      {next.accepted} of {next.invited} accepted
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                {nextAction.external ? (
                  <a href={nextAction.href} target="_blank" rel="noopener noreferrer" className={`${btnPrimary} h-11 px-6 text-[15px]`}>
                    <Video className="h-[18px] w-[18px]" aria-hidden /> Join meeting
                  </a>
                ) : (
                  <Link href={nextAction.href} className={`${btnPrimary} h-11 px-6 text-[15px]`}>
                    <Video className="h-[18px] w-[18px]" aria-hidden /> {nextAction.label === "Prepare" ? "Prepare" : `${nextAction.label} meeting`}
                  </Link>
                )}
                <Link href={`/meet/sessions/${next.id}`} className={btnSecondary}>
                  Open agenda
                </Link>
              </div>
            </section>
          ) : (
            <section className="theme-card-structural p-8 text-center">
              <Calendar className="mx-auto mb-2 h-8 w-8 text-muted" aria-hidden />
              <p className="text-[14px] font-medium text-foreground">No meetings coming up</p>
              <p className="mt-0.5 text-[13px] text-muted">Meetings you organise or are invited to will show here.</p>
              <div className="mt-4">
                <Link href="/meet/meetings/new" className={btnPrimary}>
                  <Plus className="h-4 w-4" aria-hidden /> Schedule meeting
                </Link>
              </div>
            </section>
          )}

          {/* Today and tomorrow */}
          <section aria-labelledby="today-h" className="theme-card-structural overflow-hidden p-0">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 id="today-h" className="text-[16px] font-semibold text-heading">Today and tomorrow</h2>
              <Link href="/meet/calendar" className="inline-flex items-center gap-1 text-[13.5px] font-medium text-primary hover:underline">
                Calendar <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
            {d.today.length === 0 ? (
              <p className="border-t border-border px-5 py-4 text-[13.5px] text-muted">No meetings today.</p>
            ) : (
              <ul>{d.today.map((s) => <SessionRow key={s.id} s={s} />)}</ul>
            )}
            <div className="border-t border-border bg-sunken px-5 py-2 text-[12px] font-semibold text-muted">Tomorrow</div>
            {d.tomorrow.length === 0 ? (
              <p className="border-t border-border px-5 py-4 text-[13.5px] text-muted">No meetings tomorrow.</p>
            ) : (
              <ul>{d.tomorrow.map((s) => <SessionRow key={s.id} s={s} />)}</ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          {/* Needs you */}
          <section aria-labelledby="needs-h" className="theme-card-structural p-4">
            <h2 id="needs-h" className="mb-2 px-1 text-[16px] font-semibold text-heading">Needs you</h2>
            {d.needs.length === 0 ? (
              <div className="py-6 text-center">
                <CheckCircle2 className="mx-auto mb-1.5 h-7 w-7 text-success-text" aria-hidden />
                <p className="text-[13.5px] font-medium text-foreground">You're all caught up</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {d.needs.map((n, i) => {
                  const { icon: Icon, cls } = needIcon[n.kind];
                  return (
                    <li key={i}>
                      <Link href={n.href} className="flex gap-3 rounded-md p-2.5 transition-colors hover:bg-surface-hover">
                        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${cls}`}>
                          <Icon className="h-[18px] w-[18px]" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[14px] font-semibold text-foreground">{n.title}</span>
                          <span className="block truncate text-[13px] text-muted">{n.detail}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* This week */}
          <section aria-labelledby="week-h" className="theme-card-structural space-y-3.5 p-4">
            <h2 id="week-h" className="px-1 text-[16px] font-semibold text-heading">Your week</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-sunken p-3">
                <div className="text-[22px] font-bold text-heading">{d.week.meetings}</div>
                <div className="text-[12.5px] text-subtle">Meetings</div>
              </div>
              <div className="rounded-lg bg-sunken p-3">
                <div className="text-[22px] font-bold text-heading">{d.week.openPoints}</div>
                <div className="text-[12.5px] text-subtle">Open points you own</div>
              </div>
              <div className="rounded-lg bg-sunken p-3">
                <div className={`text-[22px] font-bold ${d.week.overdue ? "text-danger-text" : "text-heading"}`}>{d.week.overdue}</div>
                <div className="text-[12.5px] text-subtle">Overdue items</div>
              </div>
              <div className="rounded-lg bg-sunken p-3">
                <div className="text-[22px] font-bold text-success-text">{d.week.onTimePercent === null ? "—" : `${d.week.onTimePercent}%`}</div>
                <div className="text-[12.5px] text-subtle">Done on time</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-[13.5px] font-medium">
              <Link href="/meet/my-work" className="text-primary hover:underline">My points &amp; tasks</Link>
              <Link href="/meet/reports" className="text-primary hover:underline">Reports</Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
