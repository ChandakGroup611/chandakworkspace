import React from "react";
import Link from "next/link";
import type { MyBrief } from "@/lib/actions/meet/my-brief";

const IST = "Asia/Kolkata";
const d = (x: string | null) => (x ? new Date(`${String(x).slice(0, 10)}T12:00:00+05:30`).toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short" }) : "no date");

/** Your own items for this meeting, to have in front of you while it runs. */
export default function MyBriefPanel({ brief }: { brief: MyBrief }) {
  const overdue = brief.points.filter((p) => p.overdue).length + brief.tasks.filter((t) => t.overdue).length;
  return (
    <section className="theme-card-structural space-y-4 p-5" aria-labelledby="brief-h">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="brief-h" className="text-[16px] font-semibold text-heading">Your brief for this meeting</h2>
        <div className="flex flex-wrap gap-2 text-[12.5px] font-semibold">
          <span className="rounded-full bg-sunken px-2.5 py-0.5 text-subtle">{brief.points.length} open point{brief.points.length === 1 ? "" : "s"}</span>
          <span className="rounded-full bg-sunken px-2.5 py-0.5 text-subtle">{brief.tasks.length} open task{brief.tasks.length === 1 ? "" : "s"}</span>
          {overdue > 0 && <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-danger-text">{overdue} overdue</span>}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-1.5 text-[13.5px] font-semibold text-foreground">Points you own</h3>
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
          <h3 className="mb-1.5 text-[13.5px] font-semibold text-foreground">Your tasks</h3>
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
      {(brief.lastDecisions.length > 0 || brief.lastMinutes) && (
        <div className="border-t border-border pt-3">
          <h3 className="mb-1.5 text-[13.5px] font-semibold text-foreground">From last time</h3>
          {brief.lastDecisions.map((x) => (
            <p key={x.id} className="text-[13.5px] text-foreground"><Link href={`/meet/decisions/${x.id}`} target="_blank" className="hover:underline">• {x.text}</Link></p>
          ))}
          {brief.lastMinutes && (
            <Link href={`/meet/sessions/${brief.lastMinutes.sessionId}/review`} target="_blank" className="mt-1 inline-block text-[13px] font-semibold text-primary hover:underline">
              Read the last minutes ({new Date(brief.lastMinutes.date).toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short" })})
            </Link>
          )}
        </div>
      )}
      <p className="text-[12px] text-muted">Links open in a new tab so you stay in the meeting.</p>
    </section>
  );
}
