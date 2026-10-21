/**
 * One date format for every list page.
 * The Workspace Tasks table mixed "16-10-2026" (Created) and "2026-10-31" (Due).
 * Everything now renders as "16 Oct 2026"; machine values stay ISO in <time dateTime>.
 */

/** Accepts Date, ISO "2026-10-31", "2026-10-31T10:00:00Z", Indian "16-10-2026" / "16/10/2026", or epoch ms. */
export function parseDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value !== "string") return null;
  const s = value.trim();
  // dd-mm-yyyy or dd/mm/yyyy (how the API returns created dates)
  const dmy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/.exec(s);
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  // yyyy-mm-dd (date only) → local date, not UTC midnight (avoids off-by-one in IST)
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (ymd) return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

const DATE_FMT = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const DATE_TIME_FMT = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** "16 Oct 2026" — or the fallback ("—") when empty/invalid. */
export function formatDate(value: unknown, fallback = "—") {
  const d = parseDate(value);
  return d ? DATE_FMT.format(d).replace("Sept", "Sep") : fallback;
}
export function formatDateTime(value: unknown, fallback = "—") {
  const d = parseDate(value);
  return d ? DATE_TIME_FMT.format(d).replace("Sept", "Sep").replace(/\b(am|pm)\b/i, (m) => m.toLowerCase()) : fallback;
}
export function toIsoDate(value: unknown) {
  const d = parseDate(value);
  if (!d) return undefined;
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export type DueState = "overdue" | "today" | "soon" | "later" | "none";

/** Whole days from today (negative = past). */
export function daysFromToday(value: unknown, now = new Date()): number | null {
  const d = parseDate(value);
  if (!d) return null;
  return Math.round((startOfDay(d) - startOfDay(now)) / DAY);
}

/** Due-date state. `done` tasks are never overdue. `soonDays` = how close counts as "soon". */
export function dueState(value: unknown, opts: { done?: boolean; soonDays?: number; now?: Date } = {}): DueState {
  if (opts.done) return "none";
  const n = daysFromToday(value, opts.now);
  if (n == null) return "none";
  if (n < 0) return "overdue";
  if (n === 0) return "today";
  if (n <= (opts.soonDays ?? 3)) return "soon";
  return "later";
}

/** Short human hint: "Overdue 3d", "Due today", "In 2d". */
export function dueHint(value: unknown, opts: { done?: boolean; now?: Date } = {}) {
  if (opts.done) return null;
  const n = daysFromToday(value, opts.now);
  if (n == null) return null;
  if (n < 0) return `Overdue ${Math.abs(n)}d`;
  if (n === 0) return "Due today";
  if (n === 1) return "Tomorrow";
  if (n <= 14) return `In ${n}d`;
  return null;
}

export function initials(name?: string | null) {
  return (name || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export const formatCount = (n: number) => new Intl.NumberFormat("en-IN").format(n);
