import React from "react";
import Link from "next/link";
import type { MyBrief } from "@/lib/actions/meet/my-brief";

const IST = "Asia/Kolkata";
const d = (x: string | null) => (x ? new Date(`${String(x).slice(0, 10)}T12:00:00+05:30`).toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short" }) : "no date");

/**
 * Your own one-page memory of this meeting: what you owe (points, tasks), what was said last time
 * (summary, decisions still in force), so you don't have to open other pages during the meeting.
 * `compact` is the narrow version for the meeting room's side panel.
 */
export default function MyBriefPanel({ brief, compact = false }: { brief: MyBrief; compact?: boolean }) {
  const overdue = brief.points.filter((p) => p.overdue).length + brief.tasks.filter((t) => t.overdue).length;
  const h3 = "mb-1.5 text-[13.5px] font-semibold text-foreground";
  return (
    <section className={compact ? "space-y-4" : "theme-card-structural space-y-4 p-5"} aria-labelledby="brief-h">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="brief-h" className={compact ? "text-[12px] font-semibold uppercase tracking-wide text-muted" : "text-[16px] font-semibold text-heading"}>
          Your brief for this meeting
        </h2>
      </div>

      {/* Pills */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { n: brief.points.length, label: "your open points" },
          { n: brief.tasks.length, label: "your open tasks" },
          { n: overdue, label: "overdue", danger: overdue > 0 },
        ].map((x) => (
          <div key={x.label} className={`rounded-lg border p-2 text-center ${x.danger ? "border-danger-border bg-danger-soft" : "border-border bg-sunken"}`}>
            <p className={`text-[18px] font-bold ${x.danger ? "text-danger-text" : "text-heading"}`}>{x.n}</p>
            <p className={`text-[11.5px] ${x.danger ? "text-danger-text" : "text-muted"}`}>{x.label}</p>
          </div>
        ))}
      </div>
      <p className="text-[12.5px] text-subtle">
        {brief.meetingOpenPoints} point{brief.meetingOpenPoints === 1 ? "" : "s"} still open in this meeting (everyone's) · {brief.activeDecisions.length} decision
        {brief.activeDecisions.length === 1 ? "" : "s"} in force
      </p>

      {/* Last time */}
      <div>
        <h3 className={h3}>Last meeting</h3>
        {brief.lastMinutes ? (
          <>
            {brief.lastSummary ? (
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">{brief.lastSummary}</p>
            ) : (
              <p className="text-[13px] text-muted">No summary was written.</p>
            )}
            <Link href={`/meet/sessions/${brief.lastMinutes.sessionId}/review`} target="_blank" className="mt-1 inline-block text-[13px] font-semibold text-primary hover:underline">
              Read the full minutes ({new Date(brief.lastMinutes.date).toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short" })})
            </Link>
          </>
        ) : (
          <p className="text-[13px] text-muted">This is the first meeting of this series.</p>
        )}
      </div>

      <div className={compact ? "space-y-4" : "grid gap-4 md:grid-cols-2"}>
        <div>
          <h3 className={h3}>Points you own</h3>
          {brief.points.length === 0 ? <p className="text-[13px] text-muted">None open.</p> : (
            <ul className="space-y-1.5">
              {brief.points.map((p) => (
                <li key={p.id} className="text-[13.5px]">
                  <Link href={`/meet/points/${p.id}`} target="_blank" className="font-medium text-foreground hover:underline"><span className="text-primary">{p.code}</span> {p.title}</Link>
                  <span className={`block text-[12px] ${p.overdue ? "font-semibold text-danger-text" : "text-muted"}`}>
                    {String(p.status).replace(/_/g, " ")} · due {d(p.due)}{p.carried ? ` · carried ${p.carried}×` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className={h3}>Your tasks</h3>
          {brief.tasks.length === 0 ? <p className="text-[13px] text-muted">None open.</p> : (
            <ul className="space-y-1.5">
              {brief.tasks.map((t) => (
                <li key={t.id} className="text-[13.5px]">
                  <Link href={`/meet/tasks/${t.id}`} target="_blank" className="font-medium text-foreground hover:underline"><span className="text-primary">{t.code}</span> {t.title}</Link>
                  <span className={`block text-[12px] ${t.overdue ? "font-semibold text-danger-text" : "text-muted"}`}>{String(t.status).replace(/_/g, " ")} · due {d(t.due)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <h3 className={h3}>Decisions in force</h3>
        {brief.activeDecisions.length === 0 ? (
          <p className="text-[13px] text-muted">None yet.</p>
        ) : (
          <ul className="space-y-1">
            {brief.activeDecisions.map((x) => (
              <li key={x.id} className="text-[13.5px] text-foreground">
                <Link href={`/meet/decisions/${x.id}`} target="_blank" className="hover:underline"><span className="font-mono text-[12px] text-muted">{x.code}</span> {x.text}</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-[12px] text-muted">Links open in a new tab so you stay in the meeting.</p>
    </section>
  );
}
