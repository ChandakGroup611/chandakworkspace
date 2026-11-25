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
import { getMeetHomeData, type MeetHomeNeed } from "@/lib/actions/meet/home";
import { getInvitesWaitingForMe } from "@/lib/actions/meet/rsvp";
import MeetNowButton from "@/components/meet/MeetNowButton";
import InviteReplyButtons from "@/components/meet/InviteReplyButtons";
import {
  IST,
  btnPrimary,
  btnSecondary,
  timeOf,
  recurrenceLabel,
  statusOf,
  actionFor,
  toneClass,
  whereOf,
  SessionTimeRow,
} from "@/components/meet/session-ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Home · Chandak Meet",
  description: "Your meetings today, what needs you, and how the week is going",
};

const needIcon: Record<MeetHomeNeed["kind"], { icon: React.ElementType; cls: string }> = {
  still_running: { icon: AlertCircle, cls: "bg-danger-soft text-danger-text" },
  approve_minutes: { icon: FileText, cls: "bg-warning-soft text-warning-text" },
  write_minutes: { icon: FileText, cls: "bg-warning-soft text-warning-text" },
  overdue_task: { icon: AlertCircle, cls: "bg-danger-soft text-danger-text" },
  overdue_point: { icon: AlertCircle, cls: "bg-danger-soft text-danger-text" },
};

export default async function MeetHomePage() {
  const [d, invites] = await Promise.all([getMeetHomeData(), getInvitesWaitingForMe().catch(() => [])]);
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
          <h1 className="mt-0.5 text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] text-heading">
            {greet}{d.userFirstName ? `, ${d.userFirstName}` : ""}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <form action="/meet/join" className="flex items-center gap-2">
            <label htmlFor="home-join-code" className="sr-only">Meeting ID</label>
            <input
              id="home-join-code"
              name="code"
              placeholder="Meeting ID"
              className="h-10 w-[140px] rounded-md border border-border bg-surface px-3 text-[14px] uppercase text-foreground placeholder:normal-case placeholder:text-muted focus:border-primary focus:outline-none"
            />
            <button type="submit" className={btnSecondary}>Join</button>
          </form>
          <Link href="/meet/meetings" className={btnSecondary}>
            <Calendar className="h-4 w-4" aria-hidden /> All meetings
          </Link>
          <MeetNowButton />
          <Link href="/meet/meetings/new" className={btnPrimary}>
            <Plus className="h-4 w-4" aria-hidden /> Schedule meeting
          </Link>
        </div>
      </div>

      <form action="/meet/ask" role="search" className="flex gap-2">
        <label htmlFor="home-ask" className="sr-only">Ask about your meetings</label>
        <input
          id="home-ask"
          name="q"
          placeholder="Ask Meet: what did we decide about…, open points on…"
          className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface px-4 text-[14.5px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button type="submit" className={btnSecondary}>Ask</button>
      </form>

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
                    {whereOf(next)}
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
              <ul>{d.today.map((s) => <SessionTimeRow key={s.id} s={s} />)}</ul>
            )}
            <div className="border-t border-border bg-sunken px-5 py-2 text-[12px] font-semibold text-muted">Tomorrow</div>
            {d.tomorrow.length === 0 ? (
              <p className="border-t border-border px-5 py-4 text-[13.5px] text-muted">No meetings tomorrow.</p>
            ) : (
              <ul>{d.tomorrow.map((s) => <SessionTimeRow key={s.id} s={s} />)}</ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          {/* Invites waiting for a reply */}
          {invites.length > 0 && (
            <section aria-labelledby="inv-h" className="theme-card-structural p-4">
              <h2 id="inv-h" className="mb-1 px-1 text-[16px] font-semibold text-heading">Waiting for your reply</h2>
              <p className="mb-2 px-1 text-[12.5px] text-muted">Say if you'll attend. If you can't, give a reason so the organiser knows.</p>
              <ul className="space-y-1">
                {invites.map((i) => (
                  <li key={i.session_id} className="space-y-1.5 rounded-md p-2.5 hover:bg-surface-hover">
                    <Link href={`/meet/meetings/${i.meeting_id}`} className="block">
                      <span className="block text-[14px] font-semibold text-foreground hover:underline">{i.title}</span>
                      <span className="block text-[13px] text-muted">
                        {new Date(i.start).toLocaleString("en-IN", { timeZone: IST, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                        {i.organiser ? ` · from ${i.organiser}` : ""}
                      </span>
                    </Link>
                    <InviteReplyButtons sessionId={i.session_id} reply="invited" />
                  </li>
                ))}
              </ul>
            </section>
          )}

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
              <Link href="/meet/points?show=mine" className="text-primary hover:underline">My points</Link>
              <Link href="/meet/tasks?show=mine" className="text-primary hover:underline">My tasks</Link>
              <Link href="/meet/minutes" className="text-primary hover:underline">Minutes</Link>
              <Link href="/meet/reports" className="text-primary hover:underline">Reports</Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
