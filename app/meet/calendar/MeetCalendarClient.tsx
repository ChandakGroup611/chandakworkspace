"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Video, DoorOpen, Plus } from "lucide-react";

/**
 * Chandak Meet calendar (redesign): Month, Week and List views, "Only mine" filter,
 * a day panel with join / open links. All times in IST.
 */

export interface CalSession {
  id: string;
  code: string | null;
  start: string;
  end: string | null;
  status: string;
  title: string;
  meetingId: string | null;
  meetingCode: string | null;
  type: string | null;
  color: string | null;
  room: string | null;
  online: boolean;
  mine: boolean;
}

type View = "month" | "week" | "list";
const IST = "Asia/Kolkata";
const DAY_START = 8;
const DAY_END = 21;
const HOUR_PX = 48;

const dayKey = (d: Date | string) => new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit" });
const minutesIST = (iso: string) => {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: IST, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(iso));
  return Number(p.find((x) => x.type === "hour")?.value || 0) * 60 + Number(p.find((x) => x.type === "minute")?.value || 0);
};
/** A Date at noon IST for a YYYY-MM-DD key, safe for adding days. */
const fromKey = (k: string) => new Date(`${k}T12:00:00+05:30`);
const addDays = (k: string, n: number) => dayKey(new Date(fromKey(k).getTime() + n * 86400000));
const weekdayIdx = (k: string) => (fromKey(k).getUTCDay() + 6) % 7; // Monday = 0

const STATUS: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Scheduled", cls: "bg-accent-soft text-accent-soft-text" },
  in_progress: { label: "Live", cls: "bg-success-soft text-success-text" },
  completed: { label: "Ended", cls: "bg-sunken text-subtle" },
  mom_draft: { label: "Minutes draft", cls: "bg-warning-soft text-warning-text" },
  mom_published: { label: "Minutes sent", cls: "bg-sunken text-subtle" },
  cancelled: { label: "Cancelled", cls: "bg-danger-soft text-danger-text" },
};

function chipStyle(s: CalSession) {
  return s.status === "cancelled" ? undefined : s.color ? { backgroundColor: s.color } : undefined;
}

export default function MeetCalendarClient({ sessions }: { sessions: CalSession[] }) {
  const today = dayKey(new Date());
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(today);
  const [selected, setSelected] = useState(today);
  const [onlyMine, setOnlyMine] = useState(true);

  const list = useMemo(() => sessions.filter((s) => !onlyMine || s.mine), [sessions, onlyMine]);
  const byDay = useMemo(() => {
    const m = new Map<string, CalSession[]>();
    for (const s of list) {
      const k = dayKey(s.start);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(s);
    }
    return m;
  }, [list]);

  // Month grid (Monday first)
  const monthStart = `${cursor.slice(0, 7)}-01`;
  const gridStart = addDays(monthStart, -weekdayIdx(monthStart));
  const monthDays = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const weekStart = addDays(cursor, -weekdayIdx(cursor));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const title =
    view === "week"
      ? `${fromKey(weekDays[0]).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${fromKey(weekDays[6]).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
      : fromKey(cursor).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const move = (dir: -1 | 1) => {
    if (view === "week") setCursor(addDays(cursor, 7 * dir));
    else {
      const d = fromKey(monthStart);
      const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + dir, 15));
      setCursor(dayKey(next));
    }
  };

  const daySessions = (byDay.get(selected) || []).slice().sort((a, b) => a.start.localeCompare(b.start));
  const upcoming = list.filter((s) => dayKey(s.start) >= today).slice(0, 60);

  const btn = "inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-3 text-[13.5px] font-semibold text-foreground hover:bg-surface-hover";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => move(-1)} aria-label="Previous" className={`${btn} w-9 px-0`}>
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" onClick={() => { setCursor(today); setSelected(today); }} className={btn}>Today</button>
        <button type="button" onClick={() => move(1)} aria-label="Next" className={`${btn} w-9 px-0`}>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
        <h2 className="ml-1 text-[17px] font-semibold text-heading">{view === "list" ? "Coming up" : title}</h2>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-[13.5px] font-medium text-foreground">
            <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} className="h-4 w-4 rounded border-border" />
            Only my meetings
          </label>
          <div role="tablist" aria-label="View" className="inline-flex rounded-lg border border-border bg-background p-1">
            {(["month", "week", "list"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`h-8 rounded-md px-3 text-[13px] font-semibold capitalize ${view === v ? "bg-surface text-foreground shadow-sm" : "text-subtle hover:text-foreground"}`}
              >
                {v}
              </button>
            ))}
          </div>
          <Link href="/meet/meetings/new" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13.5px] font-semibold text-primary-foreground hover:bg-primary-hover">
            <Plus className="h-4 w-4" aria-hidden /> Schedule
          </Link>
        </div>
      </div>

      {view === "list" ? (
        <section className="overflow-hidden rounded-xl border border-border bg-surface">
          {upcoming.length === 0 ? (
            <p className="p-8 text-center text-[14px] text-muted">Nothing coming up.</p>
          ) : (
            <ul>
              {upcoming.map((s, i) => {
                const k = dayKey(s.start);
                const showDay = i === 0 || dayKey(upcoming[i - 1].start) !== k;
                return (
                  <React.Fragment key={s.id}>
                    {showDay && (
                      <li className="border-b border-border bg-sunken px-4 py-2 text-[12.5px] font-semibold text-subtle">
                        {k === today ? "Today" : fromKey(k).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                      </li>
                    )}
                    <li className="border-b border-border last:border-0"><SessionRow s={s} /></li>
                  </React.Fragment>
                );
              })}
            </ul>
          )}
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          {view === "month" ? (
            <section aria-label="Month" className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="grid grid-cols-7 border-b border-border bg-sunken text-center text-[12px] font-semibold text-muted">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} className="py-2">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {monthDays.map((k) => {
                  const inMonth = k.slice(0, 7) === cursor.slice(0, 7);
                  const items = byDay.get(k) || [];
                  const isSel = k === selected;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setSelected(k)}
                      aria-pressed={isSel}
                      aria-label={`${fromKey(k).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}, ${items.length} meeting${items.length === 1 ? "" : "s"}`}
                      className={`flex min-h-[96px] flex-col gap-1 border-b border-r border-border p-1.5 text-left align-top hover:bg-surface-hover ${inMonth ? "" : "bg-sunken/50 text-muted"} ${isSel ? "ring-2 ring-inset ring-primary" : ""}`}
                    >
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[12.5px] font-semibold ${k === today ? "bg-primary text-primary-foreground" : ""}`}>
                        {Number(k.slice(8))}
                      </span>
                      {items.slice(0, 3).map((s) => (
                        <span
                          key={s.id}
                          style={chipStyle(s)}
                          className={`block truncate rounded px-1.5 py-0.5 text-[11.5px] font-medium ${s.color && s.status !== "cancelled" ? "text-white" : s.status === "cancelled" ? "bg-danger-soft text-danger-text line-through" : "bg-accent-soft text-accent-soft-text"}`}
                        >
                          {time(s.start)} {s.title}
                        </span>
                      ))}
                      {items.length > 3 && <span className="px-1 text-[11.5px] text-muted">+{items.length - 3} more</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : (
            <section aria-label="Week" className="overflow-x-auto rounded-xl border border-border bg-surface">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-border bg-sunken text-[12px] font-semibold text-muted">
                  <div />
                  {weekDays.map((k) => (
                    <button key={k} type="button" onClick={() => setSelected(k)} className={`py-2 text-center ${k === today ? "text-primary" : ""} ${k === selected ? "underline underline-offset-4" : ""}`}>
                      {fromKey(k).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })}
                    </button>
                  ))}
                </div>
                <div className="relative grid grid-cols-[56px_repeat(7,minmax(0,1fr))]" style={{ height: (DAY_END - DAY_START) * HOUR_PX }}>
                  <div className="relative">
                    {Array.from({ length: DAY_END - DAY_START }, (_, i) => (
                      <span key={i} className="absolute right-2 -translate-y-1/2 text-[11px] text-muted" style={{ top: i * HOUR_PX }}>
                        {i === 0 ? "" : `${((DAY_START + i + 11) % 12) + 1} ${DAY_START + i >= 12 ? "pm" : "am"}`}
                      </span>
                    ))}
                  </div>
                  {weekDays.map((k) => (
                    <div key={k} className={`relative border-l border-border ${k === today ? "bg-accent-soft/30" : ""}`}>
                      {Array.from({ length: DAY_END - DAY_START }, (_, i) => (
                        <div key={i} className="absolute inset-x-0 border-t border-border/60" style={{ top: i * HOUR_PX }} />
                      ))}
                      {(byDay.get(k) || []).map((s) => {
                        const st = Math.max(minutesIST(s.start), DAY_START * 60);
                        const en = Math.min(s.end ? minutesIST(s.end) : st + 60, DAY_END * 60);
                        if (en <= DAY_START * 60 || st >= DAY_END * 60) return null;
                        return (
                          <Link
                            key={s.id}
                            href={`/meet/sessions/${s.id}`}
                            style={{ top: ((st - DAY_START * 60) / 60) * HOUR_PX + 1, height: Math.max(22, ((en - st) / 60) * HOUR_PX - 2), ...(chipStyle(s) || {}) }}
                            className={`absolute inset-x-1 overflow-hidden rounded-md px-1.5 py-1 text-[11.5px] leading-tight ${s.color && s.status !== "cancelled" ? "text-white" : s.status === "cancelled" ? "bg-danger-soft text-danger-text line-through" : "bg-accent-soft text-accent-soft-text"}`}
                          >
                            <span className="block truncate font-semibold">{s.title}</span>
                            <span className="block truncate opacity-90">{time(s.start)}{s.room ? ` · ${s.room}` : ""}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Day panel */}
          <aside aria-labelledby="day-h" className="rounded-xl border border-border bg-surface lg:self-start">
            <h2 id="day-h" className="border-b border-border px-4 py-3 text-[15px] font-semibold text-heading">
              {selected === today ? "Today" : fromKey(selected).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </h2>
            {daySessions.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13.5px] text-muted">No meetings{onlyMine ? " for you" : ""} on this day.</p>
            ) : (
              <ul>
                {daySessions.map((s) => (
                  <li key={s.id} className="border-b border-border last:border-0"><SessionRow s={s} compact /></li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function SessionRow({ s, compact }: { s: CalSession; compact?: boolean }) {
  const st = STATUS[s.status] || { label: s.status, cls: "bg-sunken text-subtle" };
  const joinable = s.status === "scheduled" || s.status === "in_progress";
  return (
    <div className={`flex flex-wrap items-center gap-3 px-4 py-3 ${compact ? "" : "sm:flex-nowrap"}`}>
      <span className="w-20 shrink-0 text-[13px] font-semibold tabular-nums text-foreground">
        {time(s.start)}
        {s.end && <span className="block text-[12px] font-normal text-muted">{time(s.end)}</span>}
      </span>
      <span className="min-w-0 flex-1">
        <Link href={`/meet/sessions/${s.id}`} className="block truncate text-[14px] font-semibold text-foreground hover:text-primary">{s.title}</Link>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-muted">
          {s.meetingCode && <span>{s.meetingCode}</span>}
          {s.room && (
            <span className="inline-flex items-center gap-1"><DoorOpen className="h-3.5 w-3.5" aria-hidden /> {s.room}</span>
          )}
          {s.online && (
            <span className="inline-flex items-center gap-1"><Video className="h-3.5 w-3.5" aria-hidden /> Teams</span>
          )}
        </span>
      </span>
      <span className={`inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[12px] font-semibold ${st.cls}`}>{st.label}</span>
      {joinable ? (
        <Link href={`/meet/join/${s.id}`} className="inline-flex h-8 shrink-0 items-center rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover">Join</Link>
      ) : s.status === "mom_draft" || s.status === "completed" ? (
        <Link href={`/meet/sessions/${s.id}/review`} className="inline-flex h-8 shrink-0 items-center rounded-lg border border-border px-3 text-[13px] font-semibold text-foreground hover:bg-surface-hover">Minutes</Link>
      ) : null}
    </div>
  );
}
