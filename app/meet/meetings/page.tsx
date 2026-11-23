import React from "react";
import Link from "next/link";
import { Plus, Search, Calendar } from "lucide-react";
import { getMeetings } from "@/lib/actions/meet/meetings";
import { getMyMeetingRows } from "@/lib/actions/meet/list";
import { RecordHighlighter, RecordLinkActions } from "@/components/ui/record";
import {
  btnPrimary,
  btnSecondary,
  relativeDay,
  timeOf,
  durationLabel,
  whereOf,
  recurrenceLabel,
  StatusChip,
  ActionLink,
} from "@/components/meet/session-ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Meetings · Chandak Meet",
  description: "Your upcoming and past meetings, and every recurring meeting",
};

type Tab = "upcoming" | "past" | "recurring" | "archived";
const TABS: { id: Tab; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "recurring", label: "All meetings" },
  { id: "archived", label: "Archived" },
];

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; tab?: string; status?: string }>;
}) {
  const sp = await searchParams;
  // Old links used ?status=archived; keep them working.
  const tab: Tab = (TABS.some((t) => t.id === sp.tab) ? sp.tab : sp.status === "archived" ? "archived" : "upcoming") as Tab;
  const search = sp.search?.trim() || "";

  const isSessionTab = tab === "upcoming" || tab === "past";
  const [sessionData, allSeries] = await Promise.all([
    getMyMeetingRows(tab === "past" ? "past" : "upcoming", search),
    isSessionTab ? Promise.resolve([] as any[]) : getMeetings({ search }),
  ]);
  // "All meetings" = active and paused; "Archived" = archived only.
  const series = (allSeries as any[]).filter((m) => (tab === "archived" ? m.status === "archived" : m.status !== "archived"));

  const countFor = (t: Tab) =>
    t === "upcoming" ? sessionData.counts.upcoming : t === "past" ? sessionData.counts.past : t === tab ? series.length : null;

  const href = (t: Tab) => `/meet/meetings?tab=${t}${search ? `&search=${encodeURIComponent(search)}` : ""}`;

  return (
    <div className="space-y-5 pb-6">
      <RecordHighlighter />
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.01em] text-heading">Meetings</h1>
          <p className="mt-0.5 text-[13.5px] text-muted">Meetings you organise or attend. Recurring meetings show each date separately.</p>
        </div>
        <Link href="/meet/meetings/new" className={btnPrimary}>
          <Plus className="h-4 w-4" aria-hidden /> Schedule meeting
        </Link>
      </div>

      <div className="theme-card-structural overflow-hidden p-0">
        <nav aria-label="Meeting lists" className="flex flex-wrap border-b border-border px-4">
          {TABS.map((t) => {
            const on = t.id === tab;
            const c = countFor(t.id);
            return (
              <Link
                key={t.id}
                href={href(t.id)}
                aria-current={on ? "page" : undefined}
                className={`-mb-px mr-5 inline-flex h-11 items-center gap-1.5 border-b-2 text-[14px] transition-colors ${
                  on ? "border-primary font-semibold text-heading" : "border-transparent font-medium text-muted hover:text-foreground"
                }`}
              >
                {t.label}
                {c !== null && <span className="text-[12px] font-medium text-muted">{c}</span>}
              </Link>
            );
          })}
        </nav>

        <form className="flex flex-wrap items-center gap-2 px-4 py-3">
          <input type="hidden" name="tab" value={tab} />
          <label className="relative flex-1 min-w-[220px] max-w-md">
            <span className="sr-only">Search meetings</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              name="search"
              defaultValue={search}
              placeholder="Search by title or meeting code"
              className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-[14px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
            />
          </label>
          <button type="submit" className={`${btnSecondary} h-10`}>Search</button>
          {search && <Link href={href(tab).replace(/&search=.*/, "")} className="text-[13px] font-medium text-primary hover:underline">Clear</Link>}
        </form>

        {isSessionTab ? (
          sessionData.rows.length === 0 ? (
            <div className="border-t border-border p-10 text-center">
              <Calendar className="mx-auto mb-2 h-8 w-8 text-muted" aria-hidden />
              <p className="text-[14px] font-medium text-foreground">
                {search ? "No meetings match your search" : tab === "upcoming" ? "No upcoming meetings" : "No past meetings in the last 4 months"}
              </p>
              {tab === "upcoming" && !search && (
                <div className="mt-4">
                  <Link href="/meet/meetings/new" className={btnPrimary}><Plus className="h-4 w-4" aria-hidden /> Schedule meeting</Link>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full min-w-[860px] border-collapse text-[14px]">
                <thead>
                  <tr className="bg-sunken text-left text-[12.5px] font-semibold text-subtle">
                    <th scope="col" className="px-4 py-2.5">Meeting</th>
                    <th scope="col" className="px-4 py-2.5">When</th>
                    <th scope="col" className="px-4 py-2.5">Where</th>
                    <th scope="col" className="px-4 py-2.5">People</th>
                    <th scope="col" className="px-4 py-2.5">Status</th>
                    <th scope="col" className="px-4 py-2.5"><span className="sr-only">Action</span></th>
                  </tr>
                </thead>
                <tbody>
                  {sessionData.rows.map((s) => (
                    <tr key={s.id} className="border-t border-border align-middle">
                      <td className="px-4 py-3">
                        <Link href={s.meeting_id ? `/meet/meetings/${s.meeting_id}` : `/meet/sessions/${s.id}`} className="font-semibold text-heading hover:underline">
                          {s.meeting_title}
                        </Link>
                        <div className="mt-0.5 text-[12.5px] text-muted">
                          {recurrenceLabel(s.recurrence)}
                          {s.department_name ? ` · ${s.department_name}` : ""}
                          {s.meeting_code ? ` · ${s.meeting_code}` : ""}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="font-medium text-foreground">{relativeDay(s.scheduled_start)}</div>
                        <div className="text-[12.5px] text-muted">{timeOf(s.scheduled_start)}{durationLabel(s) ? ` · ${durationLabel(s)}` : ""}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-subtle">{whereOf(s)}</td>
                      <td className="px-4 py-3 text-subtle">{s.invited || "—"}</td>
                      <td className="px-4 py-3"><StatusChip s={s} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-right"><ActionLink s={s} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : series.length === 0 ? (
          <div className="border-t border-border p-10 text-center">
            <Calendar className="mx-auto mb-2 h-8 w-8 text-muted" aria-hidden />
            <p className="text-[14px] font-medium text-foreground">{search ? "No meetings match your search" : tab === "archived" ? "No archived meetings" : "No meetings yet"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full min-w-[860px] border-collapse text-[14px]">
              <thead>
                <tr className="bg-sunken text-left text-[12.5px] font-semibold text-subtle">
                  <th scope="col" className="px-4 py-2.5">Meeting</th>
                  <th scope="col" className="px-4 py-2.5">Repeats</th>
                  <th scope="col" className="px-4 py-2.5">Organiser</th>
                  <th scope="col" className="px-4 py-2.5">Held</th>
                  <th scope="col" className="px-4 py-2.5">Open points</th>
                  <th scope="col" className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {series.map((m: any) => (
                  <tr key={m.id} data-record-id={m.id} className="border-t border-border align-middle">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[12px] font-semibold text-muted">{m.code}</span>
                        <Link href={`/meet/meetings/${m.id}`} className="font-semibold text-heading hover:underline">{m.title}</Link>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted">
                        <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: m.meeting_type?.color || "#6366f1" }} />
                        {m.meeting_type?.name || "General"}
                        {m.department?.name ? ` · ${m.department.name}` : ""}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-subtle">
                      {recurrenceLabel(m.recurrence)}
                      <div className="text-[12.5px] text-muted">{m.default_duration_minutes} min</div>
                    </td>
                    <td className="px-4 py-3 text-subtle">{m.organizer?.full_name || "Unassigned"}</td>
                    <td className="px-4 py-3 text-subtle">{m.sessions_count || 0}</td>
                    <td className="px-4 py-3">
                      <span className={m.open_points_count ? "font-semibold text-warning-text" : "text-muted"}>{m.open_points_count || 0}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <RecordLinkActions label={m.title} viewHref={`/meet/meetings/${m.id}`} editHref={`/meet/meetings/${m.id}/edit`} />
                        <Link href={`/meet/meetings/${m.id}?tab=sessions`} className={`${btnSecondary} h-8 px-3 text-[12.5px]`}>
                          Schedule next
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
