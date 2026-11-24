import React from "react";
import Link from "next/link";
import type { MeetSessionRow } from "@/lib/utils/meet-session-map";

/**
 * Shared look and wording for a meeting occurrence across the redesigned Chandak Meet screens:
 * one status label + colour, one main action, the same row layout. Server-component safe.
 */

export const IST = "Asia/Kolkata";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-[14px] font-semibold transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";
export const btnSecondary =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md border border-border bg-surface text-foreground text-[14px] font-semibold transition-colors hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit" });
}

export function dateOf(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { timeZone: IST, weekday: "short", day: "numeric", month: "short" });
}

export function istDayOf(iso: string | Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

/** "Today", "Tomorrow", "Yesterday" or "Mon, 30 Nov" */
export function relativeDay(iso: string) {
  const day = istDayOf(iso);
  const today = istDayOf(new Date());
  const diff = Math.round((new Date(`${day}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return dateOf(iso);
}

export function durationLabel(s: Pick<MeetSessionRow, "scheduled_start" | "scheduled_end">) {
  if (!s.scheduled_end) return "";
  const m = Math.round((new Date(s.scheduled_end).getTime() - new Date(s.scheduled_start).getTime()) / 60000);
  if (m <= 0) return "";
  return m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`;
}

export function recurrenceLabel(r: string | null | undefined) {
  switch (r) {
    case "daily": return "Repeats daily";
    case "weekly": return "Repeats weekly";
    case "biweekly": return "Repeats every 2 weeks";
    case "monthly": return "Repeats monthly";
    case "custom": return "Repeats";
    default: return "One-off";
  }
}

export type Tone = "live" | "soon" | "scheduled" | "minutes" | "done" | "cancelled";

export function statusOf(s: Pick<MeetSessionRow, "status" | "scheduled_start">): { label: string; tone: Tone } {
  const mins = Math.round((new Date(s.scheduled_start).getTime() - Date.now()) / 60000);
  switch (s.status) {
    case "in_progress": return { label: "Live now", tone: "live" };
    // A meeting only counts as finished once its minutes are sent
    case "completed":
    case "mom_draft": return { label: "Ended · minutes pending", tone: "minutes" };
    case "mom_pending_approval": return { label: "Minutes waiting for approval", tone: "minutes" };
    case "published":
    case "mom_published": return { label: "Minutes sent", tone: "done" };
    case "cancelled": return { label: "Cancelled", tone: "cancelled" };
    default:
      if (mins <= 0 && mins > -60) return { label: "Starting now", tone: "live" };
      if (mins > 0 && mins <= 60) return { label: `Starts in ${mins} min`, tone: "soon" };
      if (mins <= -60) return { label: "Not started", tone: "minutes" };
      return { label: "Scheduled", tone: "scheduled" };
  }
}

export const toneClass: Record<Tone, string> = {
  live: "bg-success-soft text-success-text",
  soon: "bg-success-soft text-success-text",
  scheduled: "bg-info-soft text-info-text",
  minutes: "bg-warning-soft text-warning-text",
  done: "bg-sunken text-subtle",
  cancelled: "bg-sunken text-muted",
};

export const toneBar: Record<Tone, string> = {
  live: "bg-success",
  soon: "bg-primary",
  scheduled: "bg-primary",
  minutes: "bg-warning",
  done: "bg-border",
  cancelled: "bg-border",
};

export function StatusChip({ s, className = "" }: { s: Pick<MeetSessionRow, "status" | "scheduled_start">; className?: string }) {
  const st = statusOf(s);
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${toneClass[st.tone]} ${className}`}>{st.label}</span>;
}

/** The one main action for a meeting occurrence. */
export function actionFor(s: MeetSessionRow): { label: string; href: string; external?: boolean; primary: boolean } {
  const tone = statusOf(s).tone;
  if (tone === "cancelled") return { label: "View", href: `/meet/sessions/${s.id}`, primary: false };
  // Time has passed but the meeting was never started: open it to start, reschedule or cancel
  if (s.status === "scheduled" && new Date(s.scheduled_start).getTime() < Date.now() - 60 * 60000) {
    return { label: "Start or reschedule", href: `/meet/sessions/${s.id}`, primary: false };
  }
  if (tone === "minutes" || tone === "done") {
    return { label: tone === "done" ? "View minutes" : "Review minutes", href: `/meet/sessions/${s.id}/review`, primary: tone === "minutes" };
  }
  if (tone === "live" || tone === "soon") {
    // Everyone goes through the join screen: camera/mic check, Teams link, attendance, admit.
    if (s.i_am_organizer && !s.video_link) return { label: "Start", href: `/meet/live/${s.id}`, primary: true };
    return { label: "Join", href: `/meet/join/${s.id}`, primary: true };
  }
  // Later today or another day: Join is still offered, so it's always clear where to join.
  // The join page shows the start time, the Teams link and (for the organiser) Start.
  return { label: "Join", href: `/meet/join/${s.id}`, primary: false };
}

export function whereOf(s: Pick<MeetSessionRow, "video_link" | "room_name" | "mode">) {
  const parts: string[] = [];
  if (s.video_link) parts.push("Teams");
  if (s.room_name) parts.push(s.room_name);
  if (!parts.length) parts.push(s.mode === "in_person" ? "In person" : "Online");
  return parts.join(" + ");
}

export function ActionLink({ s, className = "" }: { s: MeetSessionRow; className?: string }) {
  const a = actionFor(s);
  const cls = `${a.primary ? btnPrimary : btnSecondary} h-9 text-[13px] ${className}`;
  return a.external ? (
    <a href={a.href} target="_blank" rel="noopener noreferrer" className={cls}>{a.label}</a>
  ) : (
    <Link href={a.href} className={cls}>{a.label}</Link>
  );
}

/** Timeline row used on Home ("Today and tomorrow"). */
export function SessionTimeRow({ s }: { s: MeetSessionRow }) {
  const st = statusOf(s);
  return (
    <li className="flex items-center gap-4 border-t border-border px-5 py-3.5">
      <div className="w-[72px] shrink-0">
        <div className="text-[14px] font-semibold text-foreground">{timeOf(s.scheduled_start)}</div>
        <div className="text-[12.5px] text-muted">{durationLabel(s)}</div>
      </div>
      <span aria-hidden className={`w-[3px] self-stretch rounded-full ${toneBar[st.tone]}`} />
      <div className="min-w-0 flex-1">
        <Link href={s.meeting_id ? `/meet/meetings/${s.meeting_id}` : `/meet/sessions/${s.id}`} className="block truncate text-[14.5px] font-semibold text-heading hover:underline">
          {s.meeting_title}
        </Link>
        <div className="truncate text-[13px] text-muted">
          {whereOf(s)}
          {s.invited ? ` · ${s.invited} people` : ""}
        </div>
      </div>
      <StatusChip s={s} className="hidden shrink-0 sm:inline-flex" />
      <ActionLink s={s} className="shrink-0" />
    </li>
  );
}
