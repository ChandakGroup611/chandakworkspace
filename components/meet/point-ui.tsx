import React from "react";

/** Point status / priority look shared by the points table and the point page (redesign). */

export const POINT_STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-warning-soft text-warning-text" },
  reopened: { label: "Reopened", cls: "bg-warning-soft text-warning-text" },
  in_progress: { label: "In progress", cls: "bg-primary text-primary-foreground" },
  on_hold: { label: "On hold", cls: "bg-sunken text-subtle" },
  closed: { label: "Closed", cls: "bg-success-soft text-success-text" },
  dropped: { label: "Dropped", cls: "bg-sunken text-muted" },
};

export function pointStatus(s: string) {
  return POINT_STATUS[s] || { label: s.replace(/_/g, " "), cls: "bg-sunken text-subtle" };
}

export function PriorityText({ p }: { p: string }) {
  const cls = p === "critical" || p === "high" ? "font-semibold text-danger-text" : "text-subtle";
  return <span className={cls}>{p ? p.charAt(0).toUpperCase() + p.slice(1) : "—"}</span>;
}

const IST = "Asia/Kolkata";
export const todayIST = () => new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export function shortDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(`${String(d).slice(0, 10)}T12:00:00+05:30`).toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short" });
}

/** "late by 9 days" (red) or "4 days left" (green) like Zoho. */
export function DueHint({ due, status }: { due: string | null | undefined; status: string }) {
  if (!due || status === "closed" || status === "dropped") return null;
  const today = todayIST();
  const d = Math.round((new Date(`${String(due).slice(0, 10)}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400000);
  if (d < 0) return <span className="text-[12.5px] font-semibold text-danger-text">late by {-d} day{d === -1 ? "" : "s"}</span>;
  if (d === 0) return <span className="text-[12.5px] font-semibold text-warning-text">due today</span>;
  return <span className="text-[12.5px] font-semibold text-success-text">{d} day{d === 1 ? "" : "s"} left</span>;
}
