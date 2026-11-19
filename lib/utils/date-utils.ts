/**
 * Asia/Kolkata Timezone & Date Normalization Engine
 * Master Programme WP4 (Item 4.2)
 * Guarantees consistent date-only slices, due-date evaluations, and Indian Standard Time calculations.
 */

export const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Returns today's date formatted as YYYY-MM-DD in Asia/Kolkata timezone.
 */
export function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Formats any Date, timestamp, or date string into YYYY-MM-DD in Asia/Kolkata timezone.
 * Returns null if input is null, undefined, or invalid.
 */
export function toISTDateString(dateInput: Date | string | number | null | undefined): string | null {
  if (!dateInput) return null;

  try {
    let d: Date;
    if (typeof dateInput === "string") {
      // If it's already a clean YYYY-MM-DD string, validate and return directly
      const cleanMatch = dateInput.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (cleanMatch) {
        return dateInput.trim();
      }
      d = new Date(dateInput);
    } else if (typeof dateInput === "number") {
      d = new Date(dateInput);
    } else {
      d = dateInput;
    }

    if (isNaN(d.getTime())) return null;

    return new Intl.DateTimeFormat("en-CA", {
      timeZone: IST_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return null;
  }
}

/**
 * Returns current timestamp formatted as ISO string with Asia/Kolkata representation.
 */
export function nowISTDate(): Date {
  // Returns current wall-clock date object
  return new Date();
}

/**
 * Determines whether a given due date is overdue compared to current date in Asia/Kolkata.
 * If status represents a terminal or closed entity, it is NEVER overdue.
 */
export function isOverdue(
  dueDate: string | Date | null | undefined,
  statusOrIsClosed?: any
): boolean {
  if (!dueDate) return false;

  // Check if status indicates closed
  if (statusOrIsClosed !== undefined && statusOrIsClosed !== null) {
    if (typeof statusOrIsClosed === "boolean") {
      if (statusOrIsClosed) return false;
    } else if (typeof statusOrIsClosed === "object") {
      if (statusOrIsClosed.is_closed === true || statusOrIsClosed.is_terminal === true) {
        return false;
      }
      const sName = (statusOrIsClosed.status_name || statusOrIsClosed.name || statusOrIsClosed.status_code || "").toLowerCase();
      if (sName.includes("close") || sName.includes("resolve") || sName.includes("complete") || sName.includes("cancel")) {
        return false;
      }
    } else if (typeof statusOrIsClosed === "string") {
      const s = statusOrIsClosed.toLowerCase();
      if (s.includes("close") || s.includes("resolve") || s.includes("complete") || s.includes("cancel") || s === "approved" || s === "ready to put to use") {
        return false;
      }
    }
  }

  const istDueDateStr = toISTDateString(dueDate);
  if (!istDueDateStr) return false;

  const istTodayStr = todayIST();
  return istDueDateStr < istTodayStr;
}

/**
 * Checks if a given Date or YYYY-MM-DD string is a Sunday or statutory holiday.
 * Mon-Sat (1-6) are working days; Sun (0) is weekend.
 */
export function isWorkingDayIST(
  dateInput: Date | string,
  holidays: Set<string> = new Set()
): boolean {
  const dateStr = typeof dateInput === "string" ? dateInput : toISTDateString(dateInput);
  if (!dateStr) return false;

  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayOfWeek = dateObj.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  if (dayOfWeek === 0) return false; // Sunday is off
  if (holidays.has(dateStr)) return false; // Statutory holiday

  return true;
}

/**
 * Counts working days between two dates inclusive in Asia/Kolkata (Item 4.3 / Decision D9).
 * Working days are Mon-Sat (6 days), skipping Sundays and holidays in sla_holidays.
 */
export function countWorkingDaysIST(
  startDateInput: string | Date,
  endDateInput: string | Date,
  holidays: Set<string> = new Set()
): number {
  const startStr = toISTDateString(startDateInput);
  const endStr = toISTDateString(endDateInput);
  if (!startStr || !endStr) return 0;
  if (startStr > endStr) return 0;

  let count = 0;
  const [sy, sm, sd] = startStr.split("-").map(Number);
  const [ey, em, ed] = endStr.split("-").map(Number);

  const curr = new Date(Date.UTC(sy, sm - 1, sd, 12, 0, 0));
  const end = new Date(Date.UTC(ey, em - 1, ed, 12, 0, 0));

  while (curr <= end) {
    const dayOfWeek = curr.getUTCDay();
    const currStr = curr.toISOString().split("T")[0];
    if (dayOfWeek !== 0 && !holidays.has(currStr)) {
      count++;
    }
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  return count;
}

