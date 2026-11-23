import React from "react";
import Link from "next/link";
import type { MeetingOverview } from "@/lib/actions/meet/overview";
import { relativeDay, timeOf, istDayOf } from "@/components/meet/session-ui";

/**
 * Meeting page "Dashboard" tab (redesign, modelled on the Zoho project dashboard):
 * readiness for the focus meeting, point status, overdue items, team status, recent digest, agenda.
 */

function Bar({ value, total, tone = "primary" }: { value: number; total: number; tone?: "primary" | "success" | "warning" }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  const color = tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-primary";
  return (
    <div className="h-2 rounded-full bg-sunken" role="img" aria-label={`${value} of ${total}`}>
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function MeetingDashboard({ overview, points }: { overview: MeetingOverview; points: any[] }) {
  const today = istDayOf(new Date());
  const weekEnd = (() => {
    const d = new Date(`${today}T12:00:00+05:30`);
    d.setDate(d.getDate() + 7);
    return istDayOf(d);
  })();

  const live = points.filter((p) => !p.is_deleted);
  const counts = {
    closed: live.filter((p) => p.status === "closed").length,
    in_progress: live.filter((p) => p.status === "in_progress").length,
    open: live.filter((p) => p.status === "open" || p.status === "reopened").length,
    on_hold: live.filter((p) => p.status === "on_hold").length,
  };
  const total = counts.closed + counts.in_progress + counts.open + counts.on_hold;
  const stillOpen = total - counts.closed;
  const pct = (n: number) => (total ? (n / total) * 100 : 0);
  const a = pct(counts.closed), b = a + pct(counts.in_progress), c = b + pct(counts.open);
  const donut = total
    ? `conic-gradient(var(--color-muted) 0 ${a}%, var(--color-primary) ${a}% ${b}%, var(--color-warning) ${b}% ${c}%, var(--color-border) ${c}% 100%)`
    : "var(--color-sunken)";

  const isOpen = (p: any) => p.status !== "closed" && p.status !== "dropped";
  const overdue = live
    .filter((p) => isOpen(p) && p.due_date && String(p.due_date).slice(0, 10) < today)
    .sort((x, y) => String(x.due_date).localeCompare(String(y.due_date)));
  const lateDays = (due: string) => Math.max(0, Math.round((new Date(`${today}T00:00:00Z`).getTime() - new Date(`${String(due).slice(0, 10)}T00:00:00Z`).getTime()) / 86400000));

  const team = new Map<string, { name: string; overdue: number; week: number; open: number }>();
  live.filter(isOpen).forEach((p) => {
    const key = p.owner?.id || "none";
    const row = team.get(key) || { name: p.owner?.full_name || "Unassigned", overdue: 0, week: 0, open: 0 };
    row.open += 1;
    const due = p.due_date ? String(p.due_date).slice(0, 10) : null;
    if (due && due < today) row.overdue += 1;
    else if (due && due <= weekEnd) row.week += 1;
    team.set(key, row);
  });
  const teamRows = Array.from(team.values()).sort((x, y) => y.overdue - x.overdue || y.open - x.open).slice(0, 8);

  const f = overview.focus;
  const maxDigest = Math.max(1, ...overview.digest.flatMap((d) => [d.raised, d.closed, d.open]));

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Readiness */}
      <section className="theme-card-structural space-y-4 p-5 lg:col-span-2" aria-labelledby="md-ready">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="md-ready" className="text-[15px] font-semibold text-heading">
            {f ? `Ready for ${relativeDay(f.scheduled_start).toLowerCase() === "today" ? "today" : relativeDay(f.scheduled_start)}, ${timeOf(f.scheduled_start)}?` : "No meeting scheduled yet"}
          </h2>
          {f && (
            <Link href={`/meet/sessions/${f.id}`} className="text-[13.5px] font-medium text-primary hover:underline">
              Open agenda and updates
            </Link>
          )}
        </div>
        {f ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <span className="text-[13px] text-subtle">Accepted the invite</span>
              <Bar value={f.accepted} total={f.invited} />
              <span className="text-[13px] font-semibold text-foreground">{f.invited ? `${f.accepted} of ${f.invited}` : "No invitations sent"}</span>
            </div>
            <div className="space-y-1.5">
              <span className="text-[13px] text-subtle">Sent updates on open points</span>
              <Bar value={overview.updates.sent} total={overview.updates.expected} />
              <span className="text-[13px] font-semibold text-foreground">
                {overview.updates.expected ? `${overview.updates.sent} of ${overview.updates.expected} owners` : "No carried points"}
              </span>
            </div>
            <div className="space-y-1.5">
              <span className="text-[13px] text-subtle">Agenda</span>
              <Bar value={overview.agenda.length ? 1 : 0} total={1} tone="success" />
              <span className="text-[13px] font-semibold text-foreground">
                {overview.agenda.length ? `${overview.agenda.length} items · ${overview.plannedMinutes} min planned` : "No agenda yet"}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[13.5px] text-muted">Schedule the next meeting from the Meetings tab.</p>
        )}
      </section>

      {/* Point status */}
      <section className="theme-card-structural space-y-4 p-5" aria-labelledby="md-status">
        <div>
          <h2 id="md-status" className="text-[15px] font-semibold text-heading">Point status</h2>
          <p className="text-[12.5px] text-muted">Total: {total} points</p>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <div role="img" aria-label={`${counts.closed} closed, ${counts.in_progress} in progress, ${counts.open} open, ${counts.on_hold} on hold`} className="flex h-[140px] w-[140px] items-center justify-center rounded-full" style={{ background: donut }}>
            <div className="flex h-[88px] w-[88px] flex-col items-center justify-center rounded-full bg-surface">
              <span className="text-[22px] font-bold text-heading">{stillOpen}</span>
              <span className="text-[11.5px] text-muted">still open</span>
            </div>
          </div>
          <ul className="space-y-2 text-[13.5px]">
            <li className="flex items-center gap-2"><span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--color-muted)" }} />Closed <strong className="ml-1 text-foreground">{counts.closed}</strong></li>
            <li className="flex items-center gap-2"><span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-primary" />In progress <strong className="ml-1 text-foreground">{counts.in_progress}</strong></li>
            <li className="flex items-center gap-2"><span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-warning" />Open <strong className="ml-1 text-foreground">{counts.open}</strong></li>
            <li className="flex items-center gap-2"><span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-border" />On hold <strong className="ml-1 text-foreground">{counts.on_hold}</strong></li>
          </ul>
        </div>
      </section>

      {/* Overdue items */}
      <section className="theme-card-structural p-5" aria-labelledby="md-overdue">
        <h2 id="md-overdue" className="mb-2 text-[15px] font-semibold text-heading">Overdue items</h2>
        {overdue.length === 0 ? (
          <p className="py-6 text-center text-[13.5px] text-muted">Nothing overdue. Good going.</p>
        ) : (
          <ul>
            {overdue.slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 border-b border-border py-2.5 last:border-b-0">
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium text-foreground">{p.title}</span>
                  <span className="text-[12.5px] text-muted">
                    {p.code} · {p.owner?.full_name || "Unassigned"}
                    {p.carry_forward_count >= 3 ? ` · carried ${p.carry_forward_count} times` : ""}
                  </span>
                </span>
                <span className="whitespace-nowrap text-[13px] font-semibold text-danger-text">late by {lateDays(p.due_date)} days</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Team status */}
      <section className="theme-card-structural p-5" aria-labelledby="md-team">
        <h2 id="md-team" className="mb-2 text-[15px] font-semibold text-heading">Team status</h2>
        {teamRows.length === 0 ? (
          <p className="py-6 text-center text-[13.5px] text-muted">No open points.</p>
        ) : (
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr className="text-[12.5px] text-subtle">
                <th scope="col" className="py-1.5 text-left font-semibold">Person</th>
                <th scope="col" className="py-1.5 text-right font-semibold">Overdue</th>
                <th scope="col" className="py-1.5 text-right font-semibold">Due in 7 days</th>
                <th scope="col" className="py-1.5 text-right font-semibold">Open</th>
              </tr>
            </thead>
            <tbody>
              {teamRows.map((r) => (
                <tr key={r.name} className="border-t border-border">
                  <td className="py-2 text-foreground">{r.name}</td>
                  <td className={`py-2 text-right ${r.overdue ? "font-semibold text-danger-text" : "text-subtle"}`}>{r.overdue}</td>
                  <td className="py-2 text-right text-subtle">{r.week}</td>
                  <td className="py-2 text-right text-subtle">{r.open}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Digest */}
      <section className="theme-card-structural space-y-3 p-5" aria-labelledby="md-digest">
        <div>
          <h2 id="md-digest" className="text-[15px] font-semibold text-heading">Recent meetings</h2>
          <p className="text-[12.5px] text-muted">Points raised, closed and still open at the end of each meeting</p>
        </div>
        {overview.digest.length === 0 ? (
          <p className="py-6 text-center text-[13.5px] text-muted">No meetings held yet.</p>
        ) : (
          <>
            <div className="flex h-[130px] items-end gap-4 border-b border-border px-1" role="img" aria-label={overview.digest.map((d) => `${d.label}: ${d.raised} raised, ${d.closed} closed, ${d.open} still open`).join("; ")}>
              {overview.digest.map((d) => (
                <div key={d.label} className="flex h-full flex-1 items-end gap-[3px]">
                  <span className="flex-1 rounded-t-sm bg-primary" style={{ height: `${(d.raised / maxDigest) * 100}%` }} />
                  <span className="flex-1 rounded-t-sm bg-success" style={{ height: `${(d.closed / maxDigest) * 100}%` }} />
                  <span className="flex-1 rounded-t-sm bg-warning" style={{ height: `${(d.open / maxDigest) * 100}%` }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between gap-4 px-1 text-[12px] text-muted">
              {overview.digest.map((d) => <span key={d.label} className="flex-1 text-center">{d.label}</span>)}
            </div>
            <div className="flex flex-wrap gap-4 text-[12.5px] text-subtle">
              <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-primary" />Raised</span>
              <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-success" />Closed</span>
              <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-warning" />Still open</span>
            </div>
          </>
        )}
      </section>

      {/* Agenda */}
      <section className="theme-card-structural p-5" aria-labelledby="md-agenda">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="md-agenda" className="text-[15px] font-semibold text-heading">{f ? `Agenda · ${relativeDay(f.scheduled_start)}` : "Agenda"}</h2>
          {f && <Link href={`/meet/sessions/${f.id}`} className="text-[13.5px] font-medium text-primary hover:underline">Edit agenda</Link>}
        </div>
        {overview.agenda.length === 0 ? (
          <p className="py-6 text-center text-[13.5px] text-muted">No agenda items yet.</p>
        ) : (
          <ol>
            {overview.agenda.map((a, i) => (
              <li key={a.id} className="flex gap-3 border-b border-border py-2.5 text-[14px] last:border-b-0">
                <span className="w-4 text-muted">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {a.title}
                  {a.presenter ? <span className="text-[12.5px] text-muted"> · {a.presenter}</span> : null}
                </span>
                <span className="whitespace-nowrap text-[13px] text-subtle">{a.minutes} min</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
